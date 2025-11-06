import http from 'http';
import https from 'https';
import tls from 'tls';
import net from 'net';
import httpProxy from 'http-proxy';
import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CertificateManager } from './certificateManager.js';
import { InterceptManager } from './interceptManager.js';
import { MatchReplaceEngine } from './matchReplaceEngine.js';
import { IntruderEngine } from './intruderEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProxyManager {
  constructor(dbManager, mainWindow = null) {
    this.proxy = null;
    this.dbManager = dbManager;
    this.mainWindow = mainWindow;
    this.config = {
      port: 8080,
      host: '127.0.0.1',
      interceptEnabled: false,
      setElectronProxy: true,
    };
    this.isRunning = false;
    this.certificateManager = new CertificateManager();
    this.interceptManager = new InterceptManager();
    this.matchReplaceEngine = new MatchReplaceEngine();
    this.matchReplaceRules = []; // Store match & replace rules
    this.intruderEngine = new IntruderEngine(dbManager);
    this.requestCounter = 0;
    this.pendingWebSocketMessages = new Map();
    
    // Performance optimizations
    this.dbWriteQueue = [];
    this.dbWriteTimer = null;
    this.maxBodySize = 5 * 1024 * 1024; // 5MB limit
    this.uiUpdateThrottle = new Map();
  }
  
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  updateMatchReplaceRules(rules) {
    // Convert UI format to engine format
    this.matchReplaceRules = (rules || []).map(rule => {
      const engineRule = {
        enabled: rule.enabled,
        matchType: rule.isRegex ? 'regex' : 'string',
        match: rule.match,
        replace: rule.replace,
        caseSensitive: false
      };

      // Map type to target and type
      if (rule.type === 'Request header') {
        engineRule.type = 'request';
        engineRule.target = 'headers';
        engineRule.headerName = rule.match; // Header name is in match field
      } else if (rule.type === 'Response header') {
        engineRule.type = 'response';
        engineRule.target = 'headers';
        engineRule.headerName = rule.match;
      } else if (rule.type === 'Request body') {
        engineRule.type = 'request';
        engineRule.target = 'body';
      } else if (rule.type === 'Response body') {
        engineRule.type = 'response';
        engineRule.target = 'body';
      } else if (rule.type.includes('Request')) {
        engineRule.type = 'request';
        engineRule.target = 'body'; // Default to body
      } else if (rule.type.includes('Response')) {
        engineRule.type = 'response';
        engineRule.target = 'body';
      }

      return engineRule;
    });
    
    console.log('📝 Match & Replace rules updated:', this.matchReplaceRules.filter(r => r.enabled).length, 'active rules');
  }

  /**
   * Batch write to database for better performance
   */
  queueDbWrite(data) {
    this.dbWriteQueue.push(data);
    
    // Batch write every 100ms or when queue reaches 10 items
    if (this.dbWriteQueue.length >= 10) {
      this.flushDbQueue();
    } else if (!this.dbWriteTimer) {
      this.dbWriteTimer = setTimeout(() => this.flushDbQueue(), 100);
    }
  }

  flushDbQueue() {
    if (this.dbWriteTimer) {
      clearTimeout(this.dbWriteTimer);
      this.dbWriteTimer = null;
    }

    if (this.dbWriteQueue.length === 0) return;

    const batch = [...this.dbWriteQueue];
    this.dbWriteQueue = [];

    // Write in background without blocking
    setImmediate(() => {
      try {
        batch.forEach(data => {
          if (data.type === 'http') {
            this.dbManager.saveRequest(data);
          } else if (data.type === 'http_response') {
            this.dbManager.updateRequestWithResponse(data.requestId, data.responseData);
          } else if (data.type === 'websocket') {
            this.dbManager.addWebSocketConnection(data);
          } else if (data.type === 'ws_message') {
            this.dbManager.addWebSocketMessage(data);
          }
        });
      } catch (error) {
        // Silent error handling for production
      }
    });
  }

  /**
   * Throttle UI updates to prevent flooding
   */
  shouldUpdateUI(key) {
    const now = Date.now();
    const last = this.uiUpdateThrottle.get(key);
    
    if (!last || now - last > 50) { // Max 20 updates per second
      this.uiUpdateThrottle.set(key, now);
      return true;
    }
    return false;
  }

  /**
   * Check if buffer contains binary data
   */
  isBinaryData(buffer, contentType = '') {
    // Check content-type first
    if (contentType) {
      const binaryTypes = [
        'image/', 'video/', 'audio/', 'application/octet-stream',
        'application/pdf', 'application/zip', 'application/x-rar',
        'application/x-7z-compressed', 'application/x-tar',
        'application/x-gzip', 'font/', 'application/vnd.ms-',
        'application/vnd.openxmlformats-officedocument'
      ];
      
      if (binaryTypes.some(type => contentType.toLowerCase().includes(type))) {
        return true;
      }
    }
    
    // Check buffer for null bytes or high percentage of non-printable chars
    if (!buffer || buffer.length === 0) return false;
    
    const sample = buffer.slice(0, Math.min(512, buffer.length));
    let nonPrintable = 0;
    
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Check for null bytes
      if (byte === 0) return true;
      // Count non-printable characters (excluding common whitespace)
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        nonPrintable++;
      }
    }
    
    // If more than 30% non-printable, consider it binary
    return (nonPrintable / sample.length) > 0.3;
  }

  /**
   * Safely convert buffer to string, handling binary data
   */
  bufferToString(buffer, contentType = '') {
    if (!buffer || buffer.length === 0) return '';
    
    // Truncate very large bodies to prevent memory issues
    const isTruncated = buffer.length > this.maxBodySize;
    const workingBuffer = isTruncated ? buffer.slice(0, this.maxBodySize) : buffer;
    
    if (this.isBinaryData(workingBuffer, contentType)) {
      // For binary data, just return metadata
      return `[BINARY_DATA:${buffer.length} bytes]${isTruncated ? ' [TRUNCATED]' : ''}`;
    }
    
    try {
      // Try UTF-8 decoding with replacement character for invalid sequences
      const str = workingBuffer.toString('utf8').replace(/\uFFFD/g, '?');
      return isTruncated ? str + '\n\n[TRUNCATED - Original size: ' + buffer.length + ' bytes]' : str;
    } catch (error) {
      // Fallback to latin1 which never fails
      const str = workingBuffer.toString('latin1');
      return isTruncated ? str + '\n\n[TRUNCATED - Original size: ' + buffer.length + ' bytes]' : str;
    }
  }

  /**
   * Convert string back to buffer, handling binary data markers
   */
  stringToBuffer(str) {
    if (!str) return Buffer.from('');
    
    // Check for binary data marker
    const binaryMatch = str.match(/^\[BINARY_DATA:(\d+)\](.+)$/);
    if (binaryMatch) {
      return Buffer.from(binaryMatch[2], 'base64');
    }
    
    return Buffer.from(str, 'utf8');
  }

  async start(config = {}) {
    if (this.isRunning) {
      throw new Error('Proxy is already running');
    }

    this.config = { ...this.config, ...config };
    
    // Load intercept filters from database
    const savedFilters = this.dbManager.getInterceptFilters();
    savedFilters.excludedHosts.forEach(host => this.interceptManager.addExcludedHost(host));
    savedFilters.excludedUrls.forEach(url => this.interceptManager.addExcludedUrl(url));
    
    // Ensure CA certificate exists
    await this.certificateManager.ensureCertificate();

    // Create HTTP proxy
    this.proxy = httpProxy.createProxyServer({});

    // Setup proxy event handlers
    this.setupProxyHandlers();

    // Create HTTP server
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Handle HTTPS CONNECT method for SSL/TLS interception
    this.server.on('connect', (req, clientSocket, head) => {
      this.handleConnect(req, clientSocket, head);
    });

    // Handle WebSocket upgrade
    this.server.on('upgrade', (req, socket, head) => {
      this.handleWebSocketUpgrade(req, socket, head);
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, (err) => {
        if (err) {
          reject(err);
        } else {
          this.isRunning = true;
          resolve();
        }
      });
    });
  }

  async stop() {
    if (!this.isRunning || !this.server) {
      return;
    }
    
    // Flush any pending DB writes
    this.flushDbQueue();
    
    return new Promise((resolve) => {
      const server = this.server;
      const proxy = this.proxy;
      
      // Immediately mark as not running to prevent new requests
      this.isRunning = false;
      
      // Force close all connections immediately
      server.closeAllConnections?.();
      
      // Set a flag to prevent double resolve
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          this.server = null;
          this.proxy = null;
          resolve();
        }
      };
      
      server.close(cleanup);
      
      // Force cleanup after 500ms if server.close() doesn't callback
      setTimeout(() => {
        if (!resolved) {
          cleanup();
        }
      }, 500);
    });
  }

  setupProxyHandlers() {
    // Handle proxy errors
    this.proxy.on('error', (err, req, res) => {
      if (res && !res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error: ' + err.message);
      }
    });

    // Handle proxy responses
    this.proxy.on('proxyRes', (proxyRes, req, res) => {
      this.handleProxyResponse(proxyRes, req, res);
    });
  }

  async handleConnect(req, clientSocket, head) {
    const { hostname, port } = this.parseConnectRequest(req.url);

    // Handle socket errors silently
    clientSocket.on('error', () => {});

    try {
      // Get server certificate for this hostname
      const serverOptions = await this.certificateManager.generateServerCertificate(hostname);
      
      // Tell client that connection is established
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

      // Wait a bit for the response to be sent
      await new Promise(resolve => setTimeout(resolve, 10));

      // Wrap client socket with TLS (this will decrypt HTTPS traffic from client)
      const tlsSocket = new tls.TLSSocket(clientSocket, {
        isServer: true,
        server: this.server,
        ...serverOptions
      });

      // Handle TLS errors silently
      tlsSocket.on('error', () => {});

      // If there's buffered data from CONNECT, push it
      if (head && head.length > 0) {
        tlsSocket.unshift(head);
      }

      // Use Node's HTTP parser and route through handleRequest for interception
      const httpServer = http.createServer((req, res) => {
        // Reconstruct full URL for HTTPS
        req.url = `https://${hostname}${req.url}`;
        req.headers.host = hostname;
        
        // Route through handleRequest to enable interception
        this.handleRequest(req, res);
      });

      // Handle WebSocket upgrade within HTTPS connection
      httpServer.on('upgrade', (req, socket, head) => {
        req.url = `wss://${hostname}${req.url}`;
        req.headers.host = hostname;
        this.handleWebSocketUpgrade(req, socket, head);
      });

      // Emit connection to HTTP server with TLS socket
      httpServer.emit('connection', tlsSocket);

    } catch (error) {
      try {
        if (!clientSocket.destroyed) {
          clientSocket.end();
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  parseConnectRequest(url) {
    const [hostname, port = '443'] = url.split(':');
    return { hostname, port: parseInt(port) };
  }

  async handleWebSocketUpgrade(req, clientSocket, head) {
    const wsId = `ws_${++this.requestCounter}_${Date.now()}`;
    const targetUrl = new URL(req.url, `http://${req.headers.host}`);

    // Log WebSocket connection
    const wsData = {
      id: wsId,
      url: targetUrl.href,
      host: targetUrl.hostname,
      method: 'WEBSOCKET',
      headers: req.headers,
      timestamp: Date.now(),
      type: 'websocket'
    };

    // Queue WebSocket connection (non-blocking)
    this.queueDbWrite({ ...wsData, type: 'websocket' });
    clientSocket.on('error', () => {});

    try {
      const isSecure = targetUrl.protocol === 'wss:';
      const port = targetUrl.port || (isSecure ? 443 : 80);
      const rawSocket = net.connect(port, targetUrl.hostname);
      
      rawSocket.on('error', (err) => {
        if (!clientSocket.destroyed) clientSocket.destroy();
      });

      rawSocket.on('connect', () => {
        
        const setupWebSocket = (targetSocket) => {
          const upgradeRequest = [
            `GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
            `Host: ${targetUrl.hostname}`,
            ...Object.entries(req.headers)
              .filter(([key]) => key.toLowerCase() !== 'host')
              .map(([key, value]) => `${key}: ${value}`),
            '',
            ''
          ].join('\r\n');

          targetSocket.write(upgradeRequest);
          if (head && head.length > 0) {
            targetSocket.write(head);
          }

          let upgradeComplete = false;
          
          // Simple WebSocket frame parser
          const parseWebSocketFrame = (buffer) => {
            try {
              // Check if we have at least 2 bytes
              if (buffer.length < 2) return null;
              
              const firstByte = buffer[0];
              const secondByte = buffer[1];
              
              const isFinal = (firstByte & 0x80) !== 0;
              const opcode = firstByte & 0x0F;
              const isMasked = (secondByte & 0x80) !== 0;
              let payloadLength = secondByte & 0x7F;
              let offset = 2;
              
              // Extended payload length
              if (payloadLength === 126) {
                if (buffer.length < 4) return null;
                payloadLength = buffer.readUInt16BE(2);
                offset = 4;
              } else if (payloadLength === 127) {
                if (buffer.length < 10) return null;
                payloadLength = buffer.readUInt32BE(6); // Simplified, ignoring first 4 bytes
                offset = 10;
              }
              
              // Masking key
              let maskingKey = null;
              if (isMasked) {
                if (buffer.length < offset + 4) return null;
                maskingKey = buffer.slice(offset, offset + 4);
                offset += 4;
              }
              
              // Payload
              if (buffer.length < offset + payloadLength) return null;
              let payload = buffer.slice(offset, offset + payloadLength);
              
              // Unmask if needed
              if (isMasked && maskingKey) {
                for (let i = 0; i < payload.length; i++) {
                  payload[i] = payload[i] ^ maskingKey[i % 4];
                }
              }
              
              // Opcode: 1 = text, 2 = binary, 8 = close, 9 = ping, 10 = pong
              if (opcode === 1) {
                return payload.toString('utf8');
              } else if (opcode === 2) {
                return `[Binary: ${payload.length} bytes]`;
              } else if (opcode === 8) {
                return '[Connection Close]';
              } else if (opcode === 9) {
                return '[Ping]';
              } else if (opcode === 10) {
                return '[Pong]';
              }
              
              return payload.toString('utf8');
            } catch (e) {
              return buffer.toString('utf8');
            }
          };
          
          targetSocket.on('data', (data) => {
            if (!upgradeComplete) {
              clientSocket.write(data);
              upgradeComplete = true;
            } else {
              const messageId = `${wsId}_msg_${Date.now()}`;
              const parsedData = parseWebSocketFrame(data) || data.toString('utf8');
              const message = {
                id: messageId,
                wsId: wsId,
                direction: 'incoming',
                data: parsedData,
                timestamp: Date.now(),
                type: 'websocket'
              };
              
              // Queue WebSocket message (non-blocking)
              this.queueDbWrite({ ...message, type: 'ws_message' });
              
              // Check if should intercept
              if (this.config.interceptEnabled && this.interceptManager.shouldInterceptRequest(targetUrl.href, targetUrl.hostname)) {
                // Send to intercept queue
                const interceptData = {
                  id: messageId,
                  wsId: wsId,
                  url: targetUrl.href,
                  method: 'WEBSOCKET',
                  direction: 'incoming',
                  data: message.data,
                  timestamp: Date.now(),
                  type: 'websocket'
                };
                
                if (this.mainWindow) {
                  this.mainWindow.webContents.send('intercept:request', interceptData);
                }
                
                // Store for forwarding
                this.pendingWebSocketMessages = this.pendingWebSocketMessages || new Map();
                this.pendingWebSocketMessages.set(messageId, { data, clientSocket });
              } else {
                // Forward immediately
                if (!clientSocket.destroyed) clientSocket.write(data);
              }
            }
          });

          clientSocket.on('data', (data) => {
            const messageId = `${wsId}_msg_${Date.now()}`;
            const parsedData = parseWebSocketFrame(data) || data.toString('utf8');
            const message = {
              id: messageId,
              wsId: wsId,
              direction: 'outgoing',
              data: parsedData,
              timestamp: Date.now(),
              type: 'websocket'
            };
            
            // Queue WebSocket message (non-blocking)
            this.queueDbWrite({ ...message, type: 'ws_message' });
            
            // Check if should intercept
            if (this.config.interceptEnabled && this.interceptManager.shouldInterceptRequest(targetUrl.href, targetUrl.hostname)) {
              // Send to intercept queue
              const interceptData = {
                id: messageId,
                wsId: wsId,
                url: targetUrl.href,
                method: 'WEBSOCKET',
                direction: 'outgoing',
                data: message.data,
                timestamp: Date.now(),
                type: 'websocket'
              };
              
              if (this.mainWindow) {
                this.mainWindow.webContents.send('intercept:request', interceptData);
              }
              
              // Store for forwarding
              this.pendingWebSocketMessages = this.pendingWebSocketMessages || new Map();
              this.pendingWebSocketMessages.set(messageId, { data, targetSocket });
            } else {
              // Forward immediately
              if (!targetSocket.destroyed) targetSocket.write(data);
            }
          });

          clientSocket.on('close', () => {
            if (!targetSocket.destroyed) targetSocket.destroy();
          });
          targetSocket.on('close', () => {
            if (!clientSocket.destroyed) clientSocket.destroy();
          });
        };

        if (isSecure) {
          const tlsSocket = tls.connect({
            socket: rawSocket,
            servername: targetUrl.hostname,
            rejectUnauthorized: false
          });
          tlsSocket.on('error', (err) => {
            if (!clientSocket.destroyed) clientSocket.destroy();
          });
          tlsSocket.on('secureConnect', () => {
            setupWebSocket(tlsSocket);
          });
        } else {
          setupWebSocket(rawSocket);
        }
      });

    } catch (error) {
      if (!clientSocket.destroyed) {
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      }
    }
  }

  async handleRequest(req, res) {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    
    // Store requestId on req object for later use
    req.requestId = requestId;
    
    const requestData = {
      id: requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: null,
      timestamp: Date.now(),
    };

    // Check if request should be excluded (don't log or intercept)
    const host = req.headers.host || '';
    const isExcluded = !this.interceptManager.shouldInterceptRequest(req.url, host);
    
    if (isExcluded) {
      // Just proxy the request without logging
      this.forwardRequestDirectly(req, res);
      return;
    }

    // Collect request body
    const chunks = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      if (chunks.length > 0) {
        const buffer = Buffer.concat(chunks);
        requestData.body = this.bufferToString(buffer, req.headers['content-type']);
      }

      // Apply match & replace rules
      const modifiedRequest = this.matchReplaceEngine.applyRules(requestData, this.matchReplaceRules, 'request');

      // Check if intercept is enabled and if this request should be intercepted
      const shouldIntercept = this.config.interceptEnabled && 
        this.interceptManager.shouldInterceptRequest(modifiedRequest.url, modifiedRequest.headers.host);

      if (shouldIntercept) {
        // Send to intercept queue
        this.interceptManager.addRequest(requestId, modifiedRequest, { req, res });
        
        // Send to renderer with correct event name
        if (this.mainWindow) {
          this.mainWindow.webContents.send('intercept:request', modifiedRequest);
        }

        // Wait for user action
        const action = await this.interceptManager.waitForAction(requestId);
        
        if (action.type === 'drop') {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Request dropped by user');
          return;
        } else if (action.type === 'modify') {
          // Apply modifications
          Object.assign(modifiedRequest, action.modifiedRequest);
        }
      }

      // Update Content-Length if body was modified
      if (modifiedRequest.body) {
        const bodyBuffer = this.stringToBuffer(modifiedRequest.body);
        modifiedRequest.headers['content-length'] = bodyBuffer.length.toString();
      } else if (modifiedRequest.headers['content-length']) {
        delete modifiedRequest.headers['content-length'];
      }

      // Queue database write (non-blocking)
      this.queueDbWrite({ ...modifiedRequest, type: 'http' });

      // Throttle UI updates
      if (this.shouldUpdateUI('proxy:request')) {
        this.sendToRenderer('proxy:request', modifiedRequest);
      }

      // Forward request through proxy
      try {
        if (!this.proxy) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Proxy not initialized');
          return;
        }

        const targetUrl = new URL(req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`);
        
        // Determine if we should use HTTPS or HTTP
        const isHttps = targetUrl.protocol === 'https:';
        const requestModule = isHttps ? https : http;
        
        // Since we consumed the request body, we need to recreate it
        const proxyReq = requestModule.request({
          method: modifiedRequest.method,
          hostname: targetUrl.hostname,
          port: targetUrl.port || (isHttps ? 443 : 80),
          path: targetUrl.pathname + targetUrl.search,
          headers: modifiedRequest.headers,
          rejectUnauthorized: false // Allow self-signed certificates
        }, async (proxyRes) => {
          // Check if response should be intercepted
          const shouldIntercept = this.interceptManager.shouldInterceptResponse(requestId);
          
          if (shouldIntercept && this.config.interceptEnabled) {
            // Intercept response - don't forward to client yet
            await this.handleInterceptedResponse(proxyRes, req, res, requestId);
          } else {
            // Forward response to client immediately
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
            
            // Also handle for logging
            this.handleProxyResponse(proxyRes, req, res);
          }
        });
        
        proxyReq.on('error', (error) => {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway: ' + error.message);
          }
        });
        
        // Write body if exists
        if (modifiedRequest.body) {
          const bodyBuffer = this.stringToBuffer(modifiedRequest.body);
          proxyReq.write(bodyBuffer);
        }
        
        proxyReq.end();
      } catch (error) {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Bad Gateway: ' + error.message);
        }
      }
    });
  }

  async handleInterceptedResponse(proxyRes, req, res, requestId) {
    const chunks = [];
    
    // Collect response data
    proxyRes.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    proxyRes.on('end', async () => {
      let buffer = Buffer.concat(chunks);
      
      // Handle compressed responses
      const encoding = proxyRes.headers['content-encoding'];
      try {
        const zlib = await import('zlib');
        if (encoding === 'gzip') {
          buffer = zlib.gunzipSync(buffer);
        } else if (encoding === 'deflate') {
          buffer = zlib.inflateSync(buffer);
        } else if (encoding === 'br') {
          buffer = zlib.brotliDecompressSync(buffer);
        }
      } catch (error) {
        // Skip decompression errors
      }
      
      const responseData = {
        id: requestId,
        requestId: requestId,
        statusCode: proxyRes.statusCode,
        statusMessage: proxyRes.statusMessage,
        headers: proxyRes.headers,
        body: this.bufferToString(buffer, proxyRes.headers['content-type']),
        timestamp: Date.now(),
        url: req.url,
        method: req.method,
      };
      
      // Add to pending responses
      this.interceptManager.addResponse(requestId, responseData);
      
      // Send to renderer for user to modify
      this.sendToRenderer('proxy:interceptResponse', responseData);
      
      // Wait for user action
      const action = await this.interceptManager.waitForResponseAction(requestId);
      
      if (action.type === 'modify' && action.response) {
        // User modified the response
        const modifiedResponse = action.response;
        
        // Remove content-encoding header since we decompressed
        const headers = { ...modifiedResponse.headers };
        delete headers['content-encoding'];
        delete headers['content-length'];
        
        // Send modified response to client
        const bodyBuffer = this.stringToBuffer(modifiedResponse.body);
        res.writeHead(modifiedResponse.statusCode, headers);
        res.end(bodyBuffer);
      } else {
        // Forward original response
        const headers = { ...proxyRes.headers };
        delete headers['content-encoding'];
        delete headers['content-length'];
        
        res.writeHead(proxyRes.statusCode, headers);
        res.end(buffer);
      }
      
      // Queue database update (non-blocking)
      this.queueDbWrite({ 
        type: 'http_response', 
        requestId, 
        responseData 
      });
    });
  }

  async handleProxyResponse(proxyRes, req, res) {
    const responseData = {
      requestId: req.requestId || 'unknown',
      statusCode: proxyRes.statusCode,
      statusMessage: proxyRes.statusMessage,
      headers: proxyRes.headers,
      body: null,
      timestamp: Date.now(),
    };

    const chunks = [];
    
    // Clone the response stream for logging
    proxyRes.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    proxyRes.on('end', async () => {
      if (chunks.length > 0) {
        let buffer = Buffer.concat(chunks);
        
        // Handle compressed responses
        const encoding = proxyRes.headers['content-encoding'];
        try {
          const zlib = await import('zlib');
          if (encoding === 'gzip') {
            buffer = zlib.gunzipSync(buffer);
          } else if (encoding === 'deflate') {
            buffer = zlib.inflateSync(buffer);
          } else if (encoding === 'br') {
            buffer = zlib.brotliDecompressSync(buffer);
          }
        } catch (error) {
          // Skip decompression errors
        }
        
        responseData.body = this.bufferToString(buffer, proxyRes.headers['content-type']);
      }

      // Apply match & replace rules
      const rules = await this.dbManager.getMatchReplaceRules();
      const modifiedResponse = this.matchReplaceEngine.applyRules(responseData, rules, 'response');

      // Queue database update (non-blocking)
      if (responseData.requestId !== 'unknown') {
        this.queueDbWrite({ 
          type: 'http_response', 
          requestId: responseData.requestId, 
          responseData: modifiedResponse 
        });
      }

      // Throttle UI updates
      if (this.shouldUpdateUI('proxy:response')) {
        this.sendToRenderer('proxy:response', {
          ...responseData,
          url: req.url,
        });
      }
    });
  }

  sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send(channel, data);
    }
  }

  // Intercept actions
  forwardRequest(requestId) {
    // Check if it's a WebSocket message
    if (this.pendingWebSocketMessages && this.pendingWebSocketMessages.has(requestId)) {
      const pending = this.pendingWebSocketMessages.get(requestId);
      const { data, targetSocket, clientSocket } = pending;
      
      // Forward the message
      const socket = targetSocket || clientSocket;
      if (socket && !socket.destroyed) {
        socket.write(data);
      }
      
      this.pendingWebSocketMessages.delete(requestId);
      return { success: true };
    }
    
    // Regular HTTP request
    return this.interceptManager.resolveAction(requestId, { type: 'forward' });
  }

  dropRequest(requestId) {
    // Check if it's a WebSocket message
    if (this.pendingWebSocketMessages && this.pendingWebSocketMessages.has(requestId)) {
      // Just remove from pending, don't forward
      this.pendingWebSocketMessages.delete(requestId);
      return { success: true };
    }
    
    // Regular HTTP request
    return this.interceptManager.resolveAction(requestId, { type: 'drop' });
  }

  modifyAndForward(requestId, modifiedRequest) {
    // Check if it's a WebSocket message
    if (this.pendingWebSocketMessages && this.pendingWebSocketMessages.has(requestId)) {
      const pending = this.pendingWebSocketMessages.get(requestId);
      const { targetSocket, clientSocket } = pending;
      
      // Get modified data
      const modifiedData = modifiedRequest.data || modifiedRequest.body || '';
      
      // Create WebSocket frame from modified text
      const buffer = Buffer.from(modifiedData, 'utf8');
      const frame = this.createWebSocketFrame(buffer, 1); // opcode 1 = text
      
      // Forward the modified message
      const socket = targetSocket || clientSocket;
      if (socket && !socket.destroyed) {
        socket.write(frame);
      }
      
      this.pendingWebSocketMessages.delete(requestId);
      return { success: true };
    }
    
    // Regular HTTP request
    return this.interceptManager.resolveAction(requestId, {
      type: 'modify',
      modifiedRequest,
    });
  }
  
  // Create WebSocket frame (with masking for client→server)
  createWebSocketFrame(payload, opcode = 1, masked = true) {
    const payloadLength = payload.length;
    let headerLength = 2;
    let payloadOffset = 2;
    
    // Calculate header length
    if (payloadLength >= 126 && payloadLength < 65536) {
      headerLength += 2;
      payloadOffset += 2;
    } else if (payloadLength >= 65536) {
      headerLength += 8;
      payloadOffset += 8;
    }
    
    // Add masking key length if masked
    if (masked) {
      headerLength += 4;
      payloadOffset += 4;
    }
    
    const frame = Buffer.allocUnsafe(headerLength + payloadLength);
    
    // First byte: FIN + opcode
    frame[0] = 0x80 | opcode;
    
    // Second byte: MASK + payload length
    let maskBit = masked ? 0x80 : 0x00;
    
    if (payloadLength < 126) {
      frame[1] = maskBit | payloadLength;
    } else if (payloadLength < 65536) {
      frame[1] = maskBit | 126;
      frame.writeUInt16BE(payloadLength, 2);
    } else {
      frame[1] = maskBit | 127;
      frame.writeUInt32BE(0, 2); // High 4 bytes
      frame.writeUInt32BE(payloadLength, 6); // Low 4 bytes
    }
    
    // Add masking key and mask payload if needed
    if (masked) {
      const maskingKey = Buffer.allocUnsafe(4);
      // Generate random masking key
      for (let i = 0; i < 4; i++) {
        maskingKey[i] = Math.floor(Math.random() * 256);
      }
      
      // Write masking key to frame
      const maskOffset = payloadOffset - 4;
      maskingKey.copy(frame, maskOffset);
      
      // Mask and write payload
      for (let i = 0; i < payloadLength; i++) {
        frame[payloadOffset + i] = payload[i] ^ maskingKey[i % 4];
      }
    } else {
      // Copy payload without masking
      payload.copy(frame, payloadOffset);
    }
    
    return frame;
  }

  // Repeater
  async sendRequest(request) {
    // Implementation for sending custom requests
    const https = await import('https');
    const http = await import('http');
    const url = await import('url');
    const zlib = await import('zlib');

    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(request.url);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.path,
        method: request.method,
        headers: request.headers,
      };

      const startTime = Date.now();
      const req = lib.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          const duration = Date.now() - startTime;
          let buffer = Buffer.concat(chunks);
          let body = '';

          // Handle compressed responses
          const encoding = res.headers['content-encoding'];
          
          try {
            if (encoding === 'gzip') {
              buffer = zlib.gunzipSync(buffer);
            } else if (encoding === 'deflate') {
              buffer = zlib.inflateSync(buffer);
            } else if (encoding === 'br') {
              buffer = zlib.brotliDecompressSync(buffer);
            }
            
            // Convert to string safely
            body = this.bufferToString(buffer, res.headers['content-type']);
          } catch (error) {
            body = this.bufferToString(buffer, res.headers['content-type']);
          }

          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body,
            duration,
            timestamp: Date.now(),
          });
        });
      });

      req.on('error', reject);

      if (request.body) {
        const bodyBuffer = this.stringToBuffer(request.body);
        req.write(bodyBuffer);
      }

      req.end();
    });
  }

  // Intruder
  async startIntruder(config) {
    return this.intruderEngine.startAttack(config, (progress) => {
      this.sendToRenderer('intruder:progress', progress);
    });
  }

  stopIntruder(attackId) {
    return this.intruderEngine.stopAttack(attackId);
  }

  // Certificate management
  getCertificateInfo() {
    return this.certificateManager.getInfo();
  }

  exportCertificate(format) {
    return this.certificateManager.export(format);
  }

  async regenerateCertificate() {
    await this.certificateManager.regenerate();
    if (this.isRunning) {
      await this.stop();
      await this.start(this.config);
    }
  }

  // Extensions
  loadExtension(extensionPath) {
    // TODO: Implement extension loading
    console.log('Loading extension:', extensionPath);
  }

  unloadExtension(extensionId) {
    // TODO: Implement extension unloading
    console.log('Unloading extension:', extensionId);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      requestCount: this.requestCounter,
    };
  }

  getConfig() {
    return this.config;
  }

  async updateConfig(newConfig) {
    const wasRunning = this.isRunning;
    
    // Only restart if proxy is running
    if (wasRunning) {
      await this.stop();
      
      // Wait a bit to ensure everything is cleaned up
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      await this.start(this.config);
    }
    
    return { success: true };
  }

  // Response Interception Methods
  markForResponseInterception(requestId) {
    this.interceptManager.markForResponseInterception(requestId);
    return { success: true };
  }

  getPendingResponses() {
    return this.interceptManager.getPendingResponses();
  }

  forwardResponse(requestId) {
    return this.interceptManager.resolveResponseAction(requestId, { type: 'forward' });
  }

  modifyAndForwardResponse(requestId, modifiedResponse) {
    return this.interceptManager.resolveResponseAction(requestId, {
      type: 'modify',
      response: modifiedResponse
    });
  }

  // Intercept Filter Methods
  addExcludedHost(host) {
    this.interceptManager.addExcludedHost(host);
    this.saveFiltersToDatabase();
    return { success: true };
  }

  addExcludedUrl(url) {
    this.interceptManager.addExcludedUrl(url);
    this.saveFiltersToDatabase();
    return { success: true };
  }

  removeExcludedHost(host) {
    this.interceptManager.removeExcludedHost(host);
    this.saveFiltersToDatabase();
    return { success: true };
  }

  removeExcludedUrl(url) {
    this.interceptManager.removeExcludedUrl(url);
    this.saveFiltersToDatabase();
    return { success: true };
  }

  getInterceptFilters() {
    return {
      excludedHosts: this.interceptManager.getExcludedHosts(),
      excludedUrls: this.interceptManager.getExcludedUrls()
    };
  }

  clearInterceptFilters() {
    this.interceptManager.clearExclusions();
    this.saveFiltersToDatabase();
    return { success: true };
  }

  saveFiltersToDatabase() {
    const filters = {
      excludedHosts: this.interceptManager.getExcludedHosts(),
      excludedUrls: this.interceptManager.getExcludedUrls()
    };
    this.dbManager.saveInterceptFilters(filters);
  }

  // Forward request directly without logging (for excluded hosts/URLs)
  forwardRequestDirectly(req, res) {
    const targetUrl = new URL(req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`);
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: req.headers,
      rejectUnauthorized: false
    };

    const protocol = targetUrl.protocol === 'https:' ? https : http;
    const proxyReq = protocol.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      res.writeHead(502);
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
  }

  // Helper: Convert buffer to string
  bufferToString(buffer, contentType) {
    if (!buffer || buffer.length === 0) {
      return '';
    }

    try {
      // Try to decode as UTF-8
      return buffer.toString('utf8');
    } catch (error) {
      // Fallback to binary string
      return buffer.toString('binary');
    }
  }

  // Helper: Convert string to buffer
  stringToBuffer(str) {
    if (!str) {
      return Buffer.alloc(0);
    }
    return Buffer.from(str, 'utf8');
  }
}
