import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IntruderEngine {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.activeAttacks = new Map();
    this.attackCounter = 0;
  }

  async startAttack(config, progressCallback) {
    const attackId = `attack_${++this.attackCounter}_${Date.now()}`;
    
    // Validate config
    if (!config.baseRequest) {
      throw new Error('Base request is required');
    }
    if (!config.positions || config.positions.length === 0) {
      throw new Error('At least one position is required');
    }
    if (!config.payloads || config.payloads.length === 0) {
      throw new Error('Payloads are required');
    }

    // Generate attack variations based on attack type
    const variations = this.generateVariations(config);

    const attack = {
      id: attackId,
      config,
      variations,
      results: [],
      status: 'running',
      startTime: Date.now(),
      completedCount: 0,
      totalCount: variations.length,
      workers: [],
    };

    this.activeAttacks.set(attackId, attack);

    // Save attack to database
    this.dbManager.saveIntruderAttack({
      id: attackId,
      config: JSON.stringify(config),
      status: 'running',
      startTime: attack.startTime,
      totalRequests: variations.length,
    });

    // Start workers
    this.startWorkers(attack, progressCallback);

    return {
      attackId,
      totalRequests: variations.length,
    };
  }

  generateVariations(config) {
    const { baseRequest, positions, payloads, attackType } = config;
    const variations = [];

    if (attackType === 'sniper') {
      // Sniper: one position at a time
      for (let i = 0; i < positions.length; i++) {
        for (const payload of payloads) {
          const variation = this.createVariation(baseRequest, positions, i, [payload]);
          variations.push(variation);
        }
      }
    } else if (attackType === 'battering-ram') {
      // Battering ram: same payload in all positions
      for (const payload of payloads) {
        const variation = this.createVariation(
          baseRequest,
          positions,
          -1,
          Array(positions.length).fill(payload)
        );
        variations.push(variation);
      }
    } else if (attackType === 'pitchfork') {
      // Pitchfork: iterate through payloads in parallel
      const maxLength = Math.max(...payloads.map(p => p.length));
      for (let i = 0; i < maxLength; i++) {
        const payloadSet = payloads.map(p => p[i % p.length]);
        const variation = this.createVariation(baseRequest, positions, -1, payloadSet);
        variations.push(variation);
      }
    } else if (attackType === 'cluster-bomb') {
      // Cluster bomb: all combinations
      const combinations = this.generateCombinations(payloads);
      for (const combo of combinations) {
        const variation = this.createVariation(baseRequest, positions, -1, combo);
        variations.push(variation);
      }
    }

    return variations;
  }

  createVariation(baseRequest, positions, activePosition, payloads) {
    let url = baseRequest.url;
    let body = baseRequest.body || '';
    let headers = { ...baseRequest.headers };

    positions.forEach((pos, index) => {
      if (activePosition === -1 || activePosition === index) {
        const payload = payloads[activePosition === -1 ? index : 0];
        
        if (pos.location === 'url') {
          url = url.substring(0, pos.start) + payload + url.substring(pos.end);
        } else if (pos.location === 'body') {
          body = body.substring(0, pos.start) + payload + body.substring(pos.end);
        } else if (pos.location === 'header') {
          headers[pos.headerName] = payload;
        }
      }
    });

    return {
      url,
      method: baseRequest.method,
      headers,
      body,
      payloads: activePosition === -1 ? payloads : [payloads[0]],
    };
  }

  generateCombinations(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(item => [item]);

    const result = [];
    const rest = this.generateCombinations(arrays.slice(1));

    for (const item of arrays[0]) {
      for (const combo of rest) {
        result.push([item, ...combo]);
      }
    }

    return result;
  }

  async startWorkers(attack, progressCallback) {
    const concurrency = attack.config.concurrency || 10;
    const rateLimit = attack.config.rateLimit || 0; // requests per second, 0 = unlimited

    let currentIndex = 0;
    const variations = attack.variations;

    const processNext = async () => {
      if (currentIndex >= variations.length || attack.status === 'stopped') {
        return;
      }

      const variation = variations[currentIndex++];
      
      try {
        const startTime = Date.now();
        const response = await this.sendRequest(variation);
        const duration = Date.now() - startTime;

        const result = {
          attackId: attack.id,
          request: variation,
          response,
          duration,
          timestamp: Date.now(),
        };

        attack.results.push(result);
        attack.completedCount++;

        // Save result to database
        this.dbManager.saveIntruderResult(result);

        // Report progress
        if (progressCallback) {
          progressCallback({
            attackId: attack.id,
            completed: attack.completedCount,
            total: attack.totalCount,
            percentage: (attack.completedCount / attack.totalCount) * 100,
          });
        }

        // Rate limiting
        if (rateLimit > 0) {
          const delay = 1000 / rateLimit;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Process next
        processNext();
      } catch (error) {
        console.error('Error processing variation:', error);
        attack.completedCount++;
        processNext();
      }
    };

    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      processNext();
    }
  }

  async sendRequest(request) {
    const https = await import('https');
    const http = await import('http');
    const url = await import('url');

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
        rejectUnauthorized: false, // Allow self-signed certificates
      };

      const req = lib.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body,
            length: body.length,
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          statusCode: 0,
          statusMessage: 'Error',
          error: error.message,
          body: '',
          length: 0,
        });
      });

      if (request.body) {
        req.write(request.body);
      }

      req.end();
    });
  }

  stopAttack(attackId) {
    const attack = this.activeAttacks.get(attackId);
    
    if (!attack) {
      return { success: false, error: 'Attack not found' };
    }

    attack.status = 'stopped';
    
    // Update database
    this.dbManager.updateIntruderAttack(attackId, {
      status: 'stopped',
      endTime: Date.now(),
    });

    return { success: true };
  }

  getAttack(attackId) {
    return this.activeAttacks.get(attackId);
  }
}
