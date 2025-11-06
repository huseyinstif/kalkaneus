import http from 'http';
import https from 'https';
import { URL } from 'url';

export class KalkaneusEngine {
  constructor() {
    this.isScanning = false;
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        method: options.method || 'GET',
        headers: options.headers || {
          'User-Agent': 'Kalkaneus Scanner',
          'Accept': '*/*',
        },
        timeout: 10000,
        rejectUnauthorized: false,
      };

      const startTime = Date.now();
      const req = client.request(url, requestOptions, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: data,
            responseTime: responseTime,
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  replaceVariables(str, variables) {
    let result = str;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  async executeTemplate(template, baseUrl) {
    if (!template.http || !Array.isArray(template.http)) {
      return { vulnerable: false };
    }

    const urlObj = new URL(baseUrl);
    const variables = {
      'BaseURL': baseUrl,
      'Hostname': urlObj.hostname,
      'Host': urlObj.host,
      'Port': urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
      'Path': urlObj.pathname,
      'Scheme': urlObj.protocol.replace(':', ''),
    };

    for (const httpReq of template.http) {
      const method = httpReq.method || 'GET';
      const paths = Array.isArray(httpReq.path) ? httpReq.path : [httpReq.path || '{{BaseURL}}'];

      for (const pathTemplate of paths) {
        const path = this.replaceVariables(pathTemplate, variables);
        
        // Handle payloads if defined
        const payloads = httpReq.payloads || {};
        const payloadKeys = Object.keys(payloads);
        
        if (payloadKeys.length > 0) {
          // Test with each payload combination
          for (const key of payloadKeys) {
            const payloadList = Array.isArray(payloads[key]) ? payloads[key] : [payloads[key]];
            
            for (const payload of payloadList) {
              // Replace payload variable in path
              let testUrl = path.replace(`{{${key}}}`, payload);
              
              try {
                const response = await this.makeRequest(testUrl, { method });
                const matchResult = this.checkMatchers(httpReq.matchers, response, payload);
                
                if (matchResult.matched) {
                  return {
                    vulnerable: true,
                    payload: payload,
                    evidence: matchResult.evidence,
                    url: testUrl,
                    response: response,
                  };
                }
              } catch (error) {
                // Skip failed requests
              }
            }
          }
        } else {
          // No payloads, just test the path
          
          try {
            const response = await this.makeRequest(path, { method });
            const matchResult = this.checkMatchers(httpReq.matchers, response);
            
            if (matchResult.matched) {
              return {
                vulnerable: true,
                payload: null,
                evidence: matchResult.evidence,
                url: path,
                response: response,
              };
            }
          } catch (error) {
            // Skip failed requests
          }
        }
      }
    }

    return { vulnerable: false };
  }

  checkMatchers(matchers, response, payload = null) {
    if (!matchers || !Array.isArray(matchers)) {
      return { matched: false };
    }

    for (const matcher of matchers) {
      const type = matcher.type || 'word';
      const condition = matcher.condition || 'or';
      
      if (type === 'word') {
        const words = Array.isArray(matcher.words) ? matcher.words : [matcher.words];
        const part = matcher.part || 'body';
        const negative = matcher.negative || false;
        
        let content = '';
        if (part === 'body') {
          content = response.body;
        } else if (part === 'header') {
          content = JSON.stringify(response.headers);
        } else if (part === 'all') {
          content = response.body + JSON.stringify(response.headers);
        }

        let matches = [];
        for (const word of words) {
          const found = content.includes(word);
          matches.push(found);
        }

        const result = condition === 'and' 
          ? matches.every(m => m) 
          : matches.some(m => m);

        const finalResult = negative ? !result : result;

        if (finalResult) {
          return {
            matched: true,
            evidence: `Matched words: ${words.filter((w, i) => matches[i]).join(', ')}`,
          };
        }
      }
      
      else if (type === 'regex') {
        const regexes = Array.isArray(matcher.regex) ? matcher.regex : [matcher.regex];
        const part = matcher.part || 'body';
        
        let content = '';
        if (part === 'body') {
          content = response.body;
        } else if (part === 'header') {
          content = JSON.stringify(response.headers);
        }

        for (const regexStr of regexes) {
          try {
            const regex = new RegExp(regexStr, 'i');
            if (regex.test(content)) {
              return {
                matched: true,
                evidence: `Matched regex: ${regexStr}`,
              };
            }
          } catch (error) {
            // Skip invalid regex
          }
        }
      }
      
      else if (type === 'status') {
        const statuses = Array.isArray(matcher.status) ? matcher.status : [matcher.status];
        if (statuses.includes(response.status)) {
          return {
            matched: true,
            evidence: `Matched status: ${response.status}`,
          };
        }
      }
      
      else if (type === 'dsl') {
        // Simple DSL support for common checks
        const dslExpressions = Array.isArray(matcher.dsl) ? matcher.dsl : [matcher.dsl];
        
        for (const dsl of dslExpressions) {
          try {
            // contains(body, 'text')
            if (dsl.includes('contains(')) {
              const match = dsl.match(/contains\(['"](.+?)['"],\s*['"](.+?)['"]\)/);
              if (match) {
                const [, part, text] = match;
                if (part === 'body' && response.body.includes(text)) {
                  return { matched: true, evidence: `DSL matched: ${dsl}` };
                }
              }
            }
            // status_code == 200
            else if (dsl.includes('status_code')) {
              const match = dsl.match(/status_code\s*==\s*(\d+)/);
              if (match && response.status === parseInt(match[1])) {
                return { matched: true, evidence: `DSL matched: ${dsl}` };
              }
            }
          } catch (error) {
            // Skip DSL errors
          }
        }
      }
    }

    return { matched: false };
  }

  async scanTemplate(template, targetUrl) {
    try {
      return await this.executeTemplate(template, targetUrl);
    } catch (error) {
      return { vulnerable: false, error: error.message };
    }
  }
}
