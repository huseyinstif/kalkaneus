// Automatic template loader from scanner-templates folder
// This will dynamically load all YAML templates

export async function loadAllTemplates() {
  // In a real Electron app, we would use fs.readdir to scan the folder
  // For now, we'll simulate by listing all known templates
  
  const templatePaths = [
    // SQL Injection
    'vulnerabilities/sqli/sql-injection-error-based.yaml',
    'vulnerabilities/sqli/sql-injection-union-based.yaml',
    'vulnerabilities/sqli/sql-injection-time-based.yaml',
    'vulnerabilities/sqli/sql-injection-boolean-based.yaml',
    
    // XSS
    'vulnerabilities/xss/xss-reflected.yaml',
    'vulnerabilities/xss/xss-stored.yaml',
    'vulnerabilities/xss/xss-dom-based.yaml',
    
    // File Inclusion
    'vulnerabilities/lfi/lfi-basic.yaml',
    'vulnerabilities/rfi/rfi-basic.yaml',
    
    // Command Injection
    'vulnerabilities/cmdi/command-injection-basic.yaml',
    
    // XXE
    'vulnerabilities/xxe/xxe-basic.yaml',
    
    // SSRF
    'vulnerabilities/ssrf/ssrf-basic.yaml',
    
    // Open Redirect
    'vulnerabilities/open-redirect/open-redirect.yaml',
    
    // CSRF
    'vulnerabilities/csrf/csrf-no-token.yaml',
    
    // IDOR
    'vulnerabilities/idor/idor-basic.yaml',
    
    // Authentication
    'vulnerabilities/auth/default-credentials.yaml',
    'vulnerabilities/auth/weak-password.yaml',
    
    // Injection
    'vulnerabilities/injection/ssti-basic.yaml',
    'vulnerabilities/injection/ldap-injection.yaml',
    'vulnerabilities/injection/xpath-injection.yaml',
    
    // Deserialization
    'vulnerabilities/deserialization/php-deserialization.yaml',
    
    // File Upload
    'vulnerabilities/file-upload/unrestricted-upload.yaml',
    
    // Session
    'vulnerabilities/session/session-fixation.yaml',
    
    // Race Condition
    'vulnerabilities/race-condition/race-condition-basic.yaml',
    
    // Business Logic
    'vulnerabilities/business-logic/price-manipulation.yaml',
    
    // API
    'vulnerabilities/api/graphql-introspection.yaml',
    'vulnerabilities/api/api-key-exposure.yaml',
    
    // Exposures
    'exposures/git-config-exposure.yaml',
    'exposures/phpinfo-exposure.yaml',
    'exposures/backup-files.yaml',
    'exposures/env-file-exposure.yaml',
    'exposures/svn-exposure.yaml',
    'exposures/directory-listing.yaml',
    'exposures/robots-txt.yaml',
    'exposures/sitemap-xml.yaml',
    'exposures/debug-pages.yaml',
    'exposures/server-status.yaml',
    
    // Misconfigurations
    'misconfigurations/cors-misconfiguration.yaml',
    'misconfigurations/missing-security-headers.yaml',
    'misconfigurations/http-methods.yaml',
    'misconfigurations/clickjacking.yaml',
    'misconfigurations/ssl-tls-weak.yaml',
    
    // Technologies
    'technologies/php-detection.yaml',
    'technologies/wordpress-detection.yaml',
    'technologies/apache-detection.yaml',
    'technologies/nginx-detection.yaml',
    'technologies/mysql-detection.yaml',
    
    // CVEs
    'cves/acuart-sqli.yaml',
    'cves/acuart-xss.yaml',
    'cves/acuart-lfi.yaml',
  ];

  const templates = {};
  
  for (const path of templatePaths) {
    try {
      // In production, this would read the actual YAML file
      // For now, we'll load from the template registry
      const template = await loadTemplateFromPath(path);
      if (template) {
        templates[path] = template;
      }
    } catch (error) {
      console.error(`Failed to load template: ${path}`, error);
    }
  }
  
  return templates;
}

async function loadTemplateFromPath(path) {
  // This would normally use fetch() or fs.readFile() to load the YAML
  // and parse it with a YAML parser like js-yaml
  
  // For now, return template metadata based on path
  const pathParts = path.split('/');
  const filename = pathParts[pathParts.length - 1].replace('.yaml', '');
  const category = pathParts[0];
  
  // Load actual YAML content
  let content = null;
  try {
    // In a real app, we would read from file system
    // For now, generate a basic template structure
    const info = getTemplateInfo(filename);
    content = `id: ${filename}

info:
  name: ${info.name}
  author: ${info.author}
  severity: ${info.severity}
  description: ${info.description}
  tags: ${info.tags}

requests:
  - method: GET
    path:
      - "{{BaseURL}}"
    
    matchers:
      - type: word
        words:
          - "vulnerability"
        condition: and`;
  } catch (error) {
    console.error('Error generating template content:', error);
  }
  
  return {
    id: filename,
    path: path,
    category: category,
    info: getTemplateInfo(filename),
    content: content
  };
}

function getTemplateInfo(id) {
  // Template metadata registry
  const registry = {
    'sql-injection-error-based': {
      name: 'SQL Injection - Error Based',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects SQL injection vulnerabilities through error messages in database responses',
      tags: 'sqli,injection,database,error-based',
      reference: ['https://owasp.org/www-community/attacks/SQL_Injection']
    },
    'sql-injection-union-based': {
      name: 'SQL Injection - UNION Based',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects SQL injection using UNION-based techniques to extract data',
      tags: 'sqli,union,injection,database',
      reference: ['https://owasp.org/www-community/attacks/SQL_Injection']
    },
    'sql-injection-time-based': {
      name: 'SQL Injection - Time Based Blind',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects blind SQL injection using time delays to infer database responses',
      tags: 'sqli,blind,time-based,injection',
      reference: ['https://owasp.org/www-community/attacks/Blind_SQL_Injection']
    },
    'sql-injection-boolean-based': {
      name: 'SQL Injection - Boolean Based Blind',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects boolean-based blind SQL injection by analyzing response differences',
      tags: 'sqli,blind,boolean,injection',
      reference: ['https://owasp.org/www-community/attacks/Blind_SQL_Injection']
    },
    'xss-reflected': {
      name: 'Cross-Site Scripting (XSS) - Reflected',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects reflected XSS vulnerabilities where user input is immediately reflected in responses',
      tags: 'xss,injection,javascript,reflected',
      reference: ['https://owasp.org/www-community/attacks/xss/']
    },
    'xss-stored': {
      name: 'Cross-Site Scripting (XSS) - Stored',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects stored XSS where malicious scripts are permanently stored on target servers',
      tags: 'xss,stored,persistent,injection',
      reference: ['https://owasp.org/www-community/attacks/xss/']
    },
    'xss-dom-based': {
      name: 'Cross-Site Scripting (XSS) - DOM Based',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects DOM-based XSS where the vulnerability exists in client-side code',
      tags: 'xss,dom,javascript,injection',
      reference: ['https://owasp.org/www-community/attacks/DOM_Based_XSS']
    },
    'lfi-basic': {
      name: 'Local File Inclusion (LFI)',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects local file inclusion vulnerabilities allowing access to server files',
      tags: 'lfi,file-inclusion,path-traversal',
      reference: ['https://owasp.org/www-community/attacks/Path_Traversal']
    },
    'rfi-basic': {
      name: 'Remote File Inclusion (RFI)',
      author: 'Kalkaneus Team',
      severity: 'critical',
      description: 'Detects remote file inclusion allowing execution of remote malicious code',
      tags: 'rfi,file-inclusion,remote,code-execution',
      reference: ['https://owasp.org/www-community/attacks/Code_Injection']
    },
    'command-injection-basic': {
      name: 'OS Command Injection',
      author: 'Kalkaneus Team',
      severity: 'critical',
      description: 'Detects OS command injection vulnerabilities allowing arbitrary command execution',
      tags: 'cmdi,command-injection,rce,os-command',
      reference: ['https://owasp.org/www-community/attacks/Command_Injection']
    },
    'xxe-basic': {
      name: 'XML External Entity (XXE)',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects XXE vulnerabilities in XML parsers allowing file disclosure and SSRF',
      tags: 'xxe,xml,injection',
      reference: ['https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing']
    },
    'ssrf-basic': {
      name: 'Server-Side Request Forgery (SSRF)',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects SSRF vulnerabilities allowing attackers to make requests from the server',
      tags: 'ssrf,injection',
      reference: ['https://owasp.org/www-community/attacks/Server_Side_Request_Forgery']
    },
    'open-redirect': {
      name: 'Open Redirect',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects open redirect vulnerabilities used in phishing attacks',
      tags: 'redirect,open-redirect',
      reference: ['https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html']
    },
    'csrf-no-token': {
      name: 'CSRF - Missing Token',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects forms without CSRF protection tokens',
      tags: 'csrf,token,form',
      reference: ['https://owasp.org/www-community/attacks/csrf']
    },
    'idor-basic': {
      name: 'Insecure Direct Object Reference (IDOR)',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects IDOR vulnerabilities allowing unauthorized access to objects',
      tags: 'idor,authorization,access-control',
      reference: ['https://owasp.org/www-project-web-security-testing-guide/']
    },
    'default-credentials': {
      name: 'Default Credentials',
      author: 'Kalkaneus Team',
      severity: 'critical',
      description: 'Detects systems using default or common credentials',
      tags: 'auth,default-credentials,credentials',
      reference: ['https://cwe.mitre.org/data/definitions/798.html']
    },
    'weak-password-policy': {
      name: 'Weak Password Policy',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects weak password policies allowing simple passwords',
      tags: 'auth,password,weak-password',
      reference: ['https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks']
    },
    'ssti-basic': {
      name: 'Server-Side Template Injection (SSTI)',
      author: 'Kalkaneus Team',
      severity: 'critical',
      description: 'Detects SSTI vulnerabilities allowing code execution through templates',
      tags: 'ssti,injection,template',
      reference: ['https://portswigger.net/research/server-side-template-injection']
    },
    'ldap-injection': {
      name: 'LDAP Injection',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects LDAP injection vulnerabilities in directory services',
      tags: 'ldap,injection',
      reference: ['https://owasp.org/www-community/attacks/LDAP_Injection']
    },
    'xpath-injection': {
      name: 'XPath Injection',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects XPath injection vulnerabilities in XML queries',
      tags: 'xpath,injection,xml',
      reference: ['https://owasp.org/www-community/attacks/XPATH_Injection']
    },
    'php-deserialization': {
      name: 'PHP Object Injection',
      author: 'Kalkaneus Team',
      severity: 'critical',
      description: 'Detects PHP deserialization vulnerabilities leading to RCE',
      tags: 'deserialization,php,rce',
      reference: ['https://owasp.org/www-community/vulnerabilities/PHP_Object_Injection']
    },
    'unrestricted-file-upload': {
      name: 'Unrestricted File Upload',
      author: 'Kalkaneus Team',
      severity: 'critical',
      description: 'Detects unrestricted file upload allowing malicious file execution',
      tags: 'file-upload,rce',
      reference: ['https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload']
    },
    'session-fixation': {
      name: 'Session Fixation',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects session fixation vulnerabilities in authentication',
      tags: 'session,fixation,authentication',
      reference: ['https://owasp.org/www-community/attacks/Session_fixation']
    },
    'race-condition-basic': {
      name: 'Race Condition',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects race condition vulnerabilities in concurrent operations',
      tags: 'race-condition,timing',
      reference: ['https://owasp.org/www-community/vulnerabilities/Race_Conditions']
    },
    'price-manipulation': {
      name: 'Price Manipulation',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects price manipulation vulnerabilities in e-commerce',
      tags: 'business-logic,price,manipulation',
      reference: ['https://owasp.org/www-project-web-security-testing-guide/']
    },
    'graphql-introspection': {
      name: 'GraphQL Introspection Enabled',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects enabled GraphQL introspection exposing API schema',
      tags: 'graphql,api,introspection',
      reference: ['https://graphql.org/learn/introspection/']
    },
    'api-key-exposure': {
      name: 'API Key Exposure',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects exposed API keys in client-side code or responses',
      tags: 'api,api-key,exposure,credentials',
      reference: ['https://owasp.org/www-project-api-security/']
    },
    'git-config-exposure': {
      name: 'Git Config File Exposure',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects exposed .git/config files revealing repository information',
      tags: 'exposure,git,config',
      reference: ['https://github.com/internetwache/GitTools']
    },
    'phpinfo-exposure': {
      name: 'PHPInfo Exposure',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects exposed phpinfo() pages revealing server configuration',
      tags: 'exposure,phpinfo,information-disclosure',
      reference: ['https://www.php.net/manual/en/function.phpinfo.php']
    },
    'backup-files-exposure': {
      name: 'Backup Files Exposure',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects exposed backup files containing sensitive data',
      tags: 'exposure,backup,files',
      reference: ['https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload']
    },
    'env-file-exposure': {
      name: '.env File Exposure',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Detects exposed .env configuration files with credentials',
      tags: 'exposure,env,configuration,credentials',
      reference: ['https://www.npmjs.com/package/dotenv']
    },
    'svn-exposure': {
      name: 'SVN Repository Exposure',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects exposed SVN repositories revealing source code',
      tags: 'exposure,svn,version-control',
      reference: ['https://subversion.apache.org/']
    },
    'directory-listing': {
      name: 'Directory Listing Enabled',
      author: 'Kalkaneus Team',
      severity: 'low',
      description: 'Detects directories with listing enabled exposing files',
      tags: 'exposure,directory-listing,misconfiguration',
      reference: ['https://owasp.org/www-project-web-security-testing-guide/']
    },
    'robots-txt-exposure': {
      name: 'robots.txt Information Disclosure',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects robots.txt file revealing sensitive paths',
      tags: 'exposure,robots,information-disclosure',
      reference: ['https://www.robotstxt.org/']
    },
    'sitemap-xml-exposure': {
      name: 'sitemap.xml Exposure',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects sitemap.xml file revealing site structure',
      tags: 'exposure,sitemap,information-disclosure',
      reference: ['https://www.sitemaps.org/']
    },
    'debug-pages-exposure': {
      name: 'Debug/Test Pages Exposure',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects exposed debug and test pages with sensitive information',
      tags: 'exposure,debug,test-pages',
      reference: ['https://owasp.org/www-project-web-security-testing-guide/']
    },
    'apache-server-status': {
      name: 'Apache Server Status Exposure',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects exposed Apache server-status page',
      tags: 'exposure,apache,server-status',
      reference: ['https://httpd.apache.org/docs/2.4/mod/mod_status.html']
    },
    'cors-misconfiguration': {
      name: 'CORS Misconfiguration',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects CORS misconfigurations allowing unauthorized access',
      tags: 'cors,misconfiguration,security-headers',
      reference: ['https://portswigger.net/web-security/cors']
    },
    'missing-security-headers': {
      name: 'Missing Security Headers',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects missing security headers in HTTP responses',
      tags: 'misconfiguration,security-headers,headers',
      reference: ['https://owasp.org/www-project-secure-headers/']
    },
    'dangerous-http-methods': {
      name: 'Dangerous HTTP Methods Enabled',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects dangerous HTTP methods like PUT, DELETE, TRACE',
      tags: 'misconfiguration,http-methods',
      reference: ['https://owasp.org/www-project-web-security-testing-guide/']
    },
    'clickjacking-no-x-frame-options': {
      name: 'Clickjacking - Missing X-Frame-Options',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects pages vulnerable to clickjacking attacks',
      tags: 'clickjacking,x-frame-options,misconfiguration',
      reference: ['https://owasp.org/www-community/attacks/Clickjacking']
    },
    'weak-ssl-tls': {
      name: 'Weak SSL/TLS Configuration',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Detects weak SSL/TLS configurations and protocols',
      tags: 'ssl,tls,crypto,misconfiguration',
      reference: ['https://owasp.org/www-project-web-security-testing-guide/']
    },
    'php-detection': {
      name: 'PHP Technology Detection',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects PHP technology and version information',
      tags: 'tech,php,detection',
      reference: ['https://www.php.net/']
    },
    'wordpress-detection': {
      name: 'WordPress Detection',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects WordPress CMS installation',
      tags: 'tech,wordpress,cms,detection',
      reference: ['https://wordpress.org/']
    },
    'apache-detection': {
      name: 'Apache Web Server Detection',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects Apache web server and version',
      tags: 'tech,apache,detection,webserver',
      reference: ['https://httpd.apache.org/']
    },
    'nginx-detection': {
      name: 'Nginx Web Server Detection',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects Nginx web server and version',
      tags: 'tech,nginx,detection,webserver',
      reference: ['https://nginx.org/']
    },
    'mysql-detection': {
      name: 'MySQL Database Detection',
      author: 'Kalkaneus Team',
      severity: 'info',
      description: 'Detects MySQL database through error messages',
      tags: 'tech,mysql,database,detection',
      reference: ['https://www.mysql.com/']
    },
    'acuart-sqli': {
      name: 'Acuart (testphp.vulnweb.com) - SQL Injection',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'SQL injection vulnerability in Acuart demo application',
      tags: 'sqli,acuart,testphp',
      reference: ['http://testphp.vulnweb.com/']
    },
    'acuart-xss': {
      name: 'Acuart (testphp.vulnweb.com) - XSS',
      author: 'Kalkaneus Team',
      severity: 'medium',
      description: 'Cross-site scripting vulnerability in Acuart demo application',
      tags: 'xss,acuart,testphp',
      reference: ['http://testphp.vulnweb.com/']
    },
    'acuart-lfi': {
      name: 'Acuart (testphp.vulnweb.com) - LFI',
      author: 'Kalkaneus Team',
      severity: 'high',
      description: 'Local file inclusion vulnerability in Acuart demo application',
      tags: 'lfi,acuart,testphp,file-inclusion',
      reference: ['http://testphp.vulnweb.com/']
    },
  };
  
  return registry[id] || {
    name: id,
    author: 'Unknown',
    severity: 'info',
    description: 'No description available',
    tags: 'unknown',
    reference: []
  };
}

export function getTemplateStats(templates) {
  const values = Object.values(templates);
  return {
    total: values.length,
    critical: values.filter(t => t.info.severity === 'critical').length,
    high: values.filter(t => t.info.severity === 'high').length,
    medium: values.filter(t => t.info.severity === 'medium').length,
    low: values.filter(t => t.info.severity === 'low').length,
    info: values.filter(t => t.info.severity === 'info').length,
  };
}
