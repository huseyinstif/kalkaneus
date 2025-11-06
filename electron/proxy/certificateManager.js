import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CertificateManager {
  constructor() {
    this.caDir = path.join(app.getPath('userData'), 'ca');
    this.certPath = path.join(this.caDir, 'ca.pem');
    this.keyPath = path.join(this.caDir, 'ca-key.pem');
    this.caCert = null;
    this.caKey = null;
    this.serverCertCache = new Map(); // Cache for generated server certificates
  }

  getCaDir() {
    return this.caDir;
  }

  async ensureCertificate() {
    // Create CA directory if it doesn't exist
    if (!fs.existsSync(this.caDir)) {
      fs.mkdirSync(this.caDir, { recursive: true });
    }

    // Check if certificate already exists
    if (fs.existsSync(this.certPath) && fs.existsSync(this.keyPath)) {
      return;
    }

    // Generate new certificate
    await this.generateCertificate();
  }

  async generateCertificate() {
    // Use node-forge to generate certificate
    const forge = await import('node-forge').then(m => m.default || m);
    const pki = forge.pki;
    
    // Generate key pair
    const keys = pki.rsa.generateKeyPair(2048);
    
    // Create certificate
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
    
    const attrs = [{
      name: 'commonName',
      value: 'Kalkaneus CA'
    }, {
      name: 'countryName',
      value: 'US'
    }, {
      shortName: 'ST',
      value: 'California'
    }, {
      name: 'localityName',
      value: 'San Francisco'
    }, {
      name: 'organizationName',
      value: 'Kalkaneus'
    }, {
      shortName: 'OU',
      value: 'Security'
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    }, {
      name: 'subjectKeyIdentifier'
    }]);
    
    // Self-sign certificate
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Convert to PEM
    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);
    
    // Save to files
    fs.writeFileSync(this.certPath, certPem);
    fs.writeFileSync(this.keyPath, keyPem);
  }

  getInfo() {
    const exists = fs.existsSync(this.certPath) && fs.existsSync(this.keyPath);
    
    if (!exists) {
      return {
        exists: false,
        path: this.caDir,
      };
    }

    const certStats = fs.statSync(this.certPath);
    
    return {
      exists: true,
      path: this.caDir,
      certPath: this.certPath,
      keyPath: this.keyPath,
      createdAt: certStats.birthtime,
      modifiedAt: certStats.mtime,
    };
  }

  export(format = 'pem') {
    if (!fs.existsSync(this.certPath)) {
      throw new Error('Certificate does not exist');
    }

    const cert = fs.readFileSync(this.certPath, 'utf8');

    if (format === 'pem') {
      return {
        format: 'pem',
        content: cert,
        filename: 'kalkaneus-ca.pem',
      };
    } else if (format === 'der') {
      // Convert PEM to DER (base64 decode)
      const base64 = cert
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\s/g, '');
      
      const buffer = Buffer.from(base64, 'base64');
      
      return {
        format: 'der',
        content: buffer,
        filename: 'kalkaneus-ca.der',
      };
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  async regenerate() {
    // Delete existing certificates
    if (fs.existsSync(this.certPath)) {
      fs.unlinkSync(this.certPath);
    }
    if (fs.existsSync(this.keyPath)) {
      fs.unlinkSync(this.keyPath);
    }

    // Clear cache
    this.caCert = null;
    this.caKey = null;
    this.serverCertCache.clear();

    // Generate new certificate
    await this.generateCertificate();
  }

  async loadCACertificate() {
    if (this.caCert && this.caKey) {
      return { cert: this.caCert, key: this.caKey };
    }

    const forge = await import('node-forge').then(m => m.default || m);
    const pki = forge.pki;

    const certPem = fs.readFileSync(this.certPath, 'utf8');
    const keyPem = fs.readFileSync(this.keyPath, 'utf8');

    this.caCert = pki.certificateFromPem(certPem);
    this.caKey = pki.privateKeyFromPem(keyPem);

    return { cert: this.caCert, key: this.caKey };
  }

  async generateServerCertificate(hostname) {
    // Check cache first
    if (this.serverCertCache.has(hostname)) {
      return this.serverCertCache.get(hostname);
    }

    console.log(`Generating server certificate for ${hostname}`);

    const forge = await import('node-forge').then(m => m.default || m);
    const pki = forge.pki;

    // Load CA certificate and key
    const { cert: caCert, key: caKey } = await this.loadCACertificate();

    // Generate key pair for server
    const keys = pki.rsa.generateKeyPair(2048);

    // Create server certificate
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = Math.floor(Math.random() * 1000000).toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    // Set subject (the server we're impersonating)
    cert.setSubject([{
      name: 'commonName',
      value: hostname
    }]);

    // Set issuer (our CA)
    cert.setIssuer(caCert.subject.attributes);

    // Add extensions
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: false
    }, {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 2, // DNS
        value: hostname
      }, {
        type: 2, // DNS
        value: `*.${hostname}` // Wildcard for subdomains
      }]
    }]);

    // Sign with CA private key
    cert.sign(caKey, forge.md.sha256.create());

    // Convert to PEM
    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);

    const serverOptions = {
      key: keyPem,
      cert: certPem
    };

    // Cache it
    this.serverCertCache.set(hostname, serverOptions);

    return serverOptions;
  }
}
