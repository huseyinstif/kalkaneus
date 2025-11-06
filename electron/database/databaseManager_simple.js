import fs from 'fs';
import path from 'path';

// Simple in-memory database for MVP
// TODO: Replace with proper SQLite implementation later
export class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath.replace('.db', '.json');
    this.data = {
      httpHistory: [],
      websocketHistory: [],
      websocketMessages: [],
      matchReplaceRules: [],
      intruderAttacks: [],
      intruderResults: [],
      extensions: [],
      settings: {},
      interceptFilters: {
        excludedHosts: [],
        excludedUrls: []
      }
    };
  }

  initialize() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(content);
      }
    } catch (error) {
      // Silent error handling
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      // Silent error handling
    }
  }

  // HTTP History methods
  saveRequest(request) {
    try {
      const url = new URL(request.url.startsWith('http') ? request.url : `http://${request.url}`);
      
      const record = {
        id: request.id,
        method: request.method,
        url: request.url,
        host: url.hostname,
        path: url.pathname,
        request_headers: request.headers,
        request_body: request.body,
        request_length: request.body ? request.body.length : 0,
        timestamp: request.timestamp,
        protocol: url.protocol,
        status_code: null,
        status_message: null,
        response_headers: null,
        response_body: null,
        response_length: 0,
        duration: null,
        flag: false,
        comment: '',
      };

      this.data.httpHistory.push(record);
      
      if (this.data.httpHistory.length > 1000) {
        this.data.httpHistory = this.data.httpHistory.slice(-1000);
      }

      this.saveData();
    } catch (error) {
      // Silent error handling
    }
  }

  updateRequestWithResponse(requestId, response) {
    const record = this.data.httpHistory.find(r => r.id === requestId);
    if (record) {
      const startTime = record.timestamp;
      record.status_code = response.statusCode;
      record.status_message = response.statusMessage;
      record.response_headers = response.headers;
      record.response_body = response.body;
      record.response_length = response.body ? response.body.length : 0;
      record.duration = response.duration;
      
      this.saveData();
    } else {
      // Request not found for response update
    }
  }

  getHistory(filters = {}) {
    let results = [...this.data.httpHistory];

    if (filters.method) {
      results = results.filter(r => r.method === filters.method);
    }

    if (filters.host) {
      results = results.filter(r => r.host && r.host.includes(filters.host));
    }

    if (filters.statusCode) {
      results = results.filter(r => r.status_code === parseInt(filters.statusCode));
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(r => 
        r.url.toLowerCase().includes(search) ||
        (r.request_body && r.request_body.toLowerCase().includes(search)) ||
        (r.response_body && r.response_body.toLowerCase().includes(search))
      );
    }

    if (filters.startTime) {
      results = results.filter(r => r.timestamp >= filters.startTime);
    }

    if (filters.endTime) {
      results = results.filter(r => r.timestamp <= filters.endTime);
    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    const limit = filters.limit || 1000;
    return results.slice(0, limit);
  }

  getHistoryById(id) {
    return this.data.httpHistory.find(r => r.id === id) || null;
  }

  updateRequestFlag(id, flag) {
    const record = this.data.httpHistory.find(r => r.id === id);
    if (record) {
      record.flag = flag;
      this.saveData();
      return true;
    }
    return false;
  }

  updateRequestComment(id, comment) {
    const record = this.data.httpHistory.find(r => r.id === id);
    if (record) {
      record.comment = comment;
      this.saveData();
      return true;
    }
    return false;
  }

  getAllRequests() {
    return this.data.httpHistory;
  }

  deleteRequest(requestId) {
    const initialLength = this.data.httpHistory.length;
    this.data.httpHistory = this.data.httpHistory.filter(req => req.id !== requestId);
    const deleted = initialLength > this.data.httpHistory.length;
    
    if (deleted) {
      this.saveData();
    }
    
    return { success: deleted };
  }

  clearHistory() {
    this.data.httpHistory = [];
    this.saveData();
    return { success: true };
  }

  exportHistory(format = 'json') {
    const history = this.getHistory({ limit: 10000 });

    if (format === 'json') {
      return {
        format: 'json',
        content: JSON.stringify(history, null, 2),
        filename: `kalkaneus-history-${Date.now()}.json`,
      };
    } else if (format === 'csv') {
      const headers = ['id', 'method', 'url', 'status_code', 'timestamp'];
      const csv = [
        headers.join(','),
        ...history.map(row => 
          headers.map(h => JSON.stringify(row[h] || '')).join(',')
        )
      ].join('\n');

      return {
        format: 'csv',
        content: csv,
        filename: `kalkaneus-history-${Date.now()}.csv`,
      };
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  // Match & Replace methods
  getMatchReplaceRules() {
    return this.data.matchReplaceRules.sort((a, b) => b.created_at - a.created_at);
  }

  saveMatchReplaceRule(rule) {
    const id = rule.id || `rule_${Date.now()}`;
    const now = Date.now();

    const newRule = {
      id,
      name: rule.name,
      enabled: rule.enabled !== false,
      type: rule.type,
      target: rule.target,
      matchType: rule.matchType,
      match: rule.match,
      replace: rule.replace,
      caseSensitive: rule.caseSensitive || false,
      headerName: rule.headerName || null,
      scope: rule.scope || 'all',
      created_at: rule.created_at || now,
      updated_at: now,
    };

    const index = this.data.matchReplaceRules.findIndex(r => r.id === id);
    if (index >= 0) {
      this.data.matchReplaceRules[index] = newRule;
    } else {
      this.data.matchReplaceRules.push(newRule);
    }

    this.saveData();
    return { success: true, id };
  }

  deleteMatchReplaceRule(ruleId) {
    this.data.matchReplaceRules = this.data.matchReplaceRules.filter(r => r.id !== ruleId);
    this.saveData();
    return { success: true };
  }

  // Intruder methods
  saveIntruderAttack(attack) {
    this.data.intruderAttacks.push(attack);
    this.saveData();
    return { success: true };
  }

  updateIntruderAttack(attackId, updates) {
    const attack = this.data.intruderAttacks.find(a => a.id === attackId);
    if (attack) {
      Object.assign(attack, updates);
      this.saveData();
    }
    return { success: true };
  }

  saveIntruderResult(result) {
    this.data.intruderResults.push(result);
    
    if (this.data.intruderResults.length > 10000) {
      this.data.intruderResults = this.data.intruderResults.slice(-10000);
    }
    
    this.saveData();
    return { success: true };
  }

  getIntruderResults(attackId) {
    return this.data.intruderResults
      .filter(r => r.attackId === attackId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Extensions methods
  getExtensions() {
    return this.data.extensions.sort((a, b) => b.installed_at - a.installed_at);
  }

  saveExtension(extension) {
    const now = Date.now();

    const newExt = {
      id: extension.id,
      name: extension.name,
      version: extension.version,
      author: extension.author,
      description: extension.description,
      path: extension.path,
      enabled: extension.enabled !== false,
      config: extension.config || {},
      installed_at: extension.installed_at || now,
      updated_at: now,
    };

    const index = this.data.extensions.findIndex(e => e.id === extension.id);
    if (index >= 0) {
      this.data.extensions[index] = newExt;
    } else {
      this.data.extensions.push(newExt);
    }

    this.saveData();
    return { success: true };
  }

  // Settings methods
  getSetting(key) {
    return this.data.settings[key] || null;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.saveData();
    return { success: true };
  }

  // Intercept Filters methods
  getInterceptFilters() {
    if (!this.data.interceptFilters) {
      this.data.interceptFilters = { excludedHosts: [], excludedUrls: [] };
    }
    return this.data.interceptFilters;
  }

  saveInterceptFilters(filters) {
    this.data.interceptFilters = filters;
    this.saveData();
    return { success: true };
  }

  // WebSocket methods
  addWebSocketConnection(wsData) {
    if (!this.data.websocketHistory) {
      this.data.websocketHistory = [];
    }
    this.data.websocketHistory.unshift(wsData);
    // Keep last 1000 connections
    if (this.data.websocketHistory.length > 1000) {
      this.data.websocketHistory = this.data.websocketHistory.slice(0, 1000);
    }
    this.saveData();
    return { success: true, id: wsData.id };
  }

  addWebSocketMessage(message) {
    if (!this.data.websocketMessages) {
      this.data.websocketMessages = [];
    }
    this.data.websocketMessages.unshift(message);
    // Keep last 5000 messages
    if (this.data.websocketMessages.length > 5000) {
      this.data.websocketMessages = this.data.websocketMessages.slice(0, 5000);
    }
    this.saveData();
    return { success: true, id: message.id };
  }

  getWebSocketHistory() {
    if (!this.data.websocketHistory) {
      this.data.websocketHistory = [];
    }
    return this.data.websocketHistory;
  }

  getWebSocketMessages(wsId) {
    if (!this.data.websocketMessages) {
      this.data.websocketMessages = [];
    }
    if (wsId) {
      return this.data.websocketMessages.filter(msg => msg.wsId === wsId);
    }
    return this.data.websocketMessages;
  }

  clearWebSocketHistory() {
    this.data.websocketHistory = [];
    this.data.websocketMessages = [];
    this.saveData();
    return { success: true };
  }

  close() {
    this.saveData();
  }
}
