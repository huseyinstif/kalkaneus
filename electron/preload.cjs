const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Generic event listeners
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return subscription;
  },
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  // Proxy control
  proxy: {
    start: (config) => ipcRenderer.invoke('proxy:start', config),
    stop: () => ipcRenderer.invoke('proxy:stop'),
    getStatus: () => ipcRenderer.invoke('proxy:getStatus'),
    getConfig: () => ipcRenderer.invoke('proxy:getConfig'),
    updateConfig: (config) => ipcRenderer.invoke('proxy:updateConfig', config),
    updateMatchReplaceRules: (rules) => ipcRenderer.invoke('proxy:updateMatchReplaceRules', rules),
    updateSettings: (settings) => ipcRenderer.invoke('proxy:updateSettings', settings),
    openBrowser: (config) => ipcRenderer.invoke('proxy:openBrowser', config),
    onRequest: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('proxy:request', subscription);
      return () => ipcRenderer.removeListener('proxy:request', subscription);
    },
    onResponse: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('proxy:response', subscription);
      return () => ipcRenderer.removeListener('proxy:response', subscription);
    },
    onInterceptRequest: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('intercept:request', subscription);
      return () => ipcRenderer.removeListener('intercept:request', subscription);
    },
    onInterceptResponse: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('intercept:response', subscription);
      return () => ipcRenderer.removeListener('intercept:response', subscription);
    },
  },

  // Intercept control
  intercept: {
    forward: (requestId) => ipcRenderer.invoke('intercept:forward', requestId),
    drop: (requestId) => ipcRenderer.invoke('intercept:drop', requestId),
    modify: (requestId, modifiedRequest) => ipcRenderer.invoke('intercept:modify', requestId, modifiedRequest),
    markForResponseInterception: (requestId) => ipcRenderer.invoke('intercept:markForResponseInterception', requestId),
    getPendingResponses: () => ipcRenderer.invoke('intercept:getPendingResponses'),
    forwardResponse: (requestId) => ipcRenderer.invoke('intercept:forwardResponse', requestId),
    modifyResponse: (requestId, modifiedResponse) => ipcRenderer.invoke('intercept:modifyResponse', requestId, modifiedResponse),
    addExcludedHost: (host) => ipcRenderer.invoke('intercept:addExcludedHost', host),
    addExcludedUrl: (url) => ipcRenderer.invoke('intercept:addExcludedUrl', url),
    removeExcludedHost: (host) => ipcRenderer.invoke('intercept:removeExcludedHost', host),
    removeExcludedUrl: (url) => ipcRenderer.invoke('intercept:removeExcludedUrl', url),
    getFilters: () => ipcRenderer.invoke('intercept:getFilters'),
    clearFilters: () => ipcRenderer.invoke('intercept:clearFilters'),
  },

  // History
  history: {
    getAll: (filters) => ipcRenderer.invoke('history:getAll', filters),
    getById: (id) => ipcRenderer.invoke('history:getById', id),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    clear: () => ipcRenderer.invoke('history:clear'),
    export: (format) => ipcRenderer.invoke('history:export', format),
    updateFlag: (id, flag) => ipcRenderer.invoke('history:updateFlag', id, flag),
    updateComment: (id, comment) => ipcRenderer.invoke('history:updateComment', id, comment),
  },

  // WebSocket
  websocket: {
    getHistory: () => ipcRenderer.invoke('websocket:getHistory'),
    getMessages: (wsId) => ipcRenderer.invoke('websocket:getMessages', wsId),
    clear: () => ipcRenderer.invoke('websocket:clear'),
    onMessage: (callback) => ipcRenderer.on('websocket:message', (event, message) => callback(message)),
  },

  // Repeater
  repeater: {
    send: (request) => ipcRenderer.invoke('repeater:send', request),
  },

  // Intruder
  intruder: {
    start: (config) => ipcRenderer.invoke('intruder:start', config),
    stop: (attackId) => ipcRenderer.invoke('intruder:stop', attackId),
    getResults: (attackId) => ipcRenderer.invoke('intruder:getResults', attackId),
    onProgress: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('intruder:progress', subscription);
      return () => ipcRenderer.removeListener('intruder:progress', subscription);
    },
    onComplete: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('intruder:complete', subscription);
      return () => ipcRenderer.removeListener('intruder:complete', subscription);
    },
  },

  // Match & Replace
  matchReplace: {
    getRules: () => ipcRenderer.invoke('matchreplace:getRules'),
    saveRule: (rule) => ipcRenderer.invoke('matchreplace:saveRule', rule),
    deleteRule: (ruleId) => ipcRenderer.invoke('matchreplace:deleteRule', ruleId),
  },

  // CA Certificate
  ca: {
    getInfo: () => ipcRenderer.invoke('ca:getInfo'),
    export: (format) => ipcRenderer.invoke('ca:export', format),
    regenerate: () => ipcRenderer.invoke('ca:regenerate'),
  },

  // Extensions
  extensions: {
    list: () => ipcRenderer.invoke('extensions:list'),
    load: (extensionPath) => ipcRenderer.invoke('extensions:load', extensionPath),
    unload: (extensionId) => ipcRenderer.invoke('extensions:unload', extensionId),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // Shell
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Project Management
  project: {
    new: (projectName) => ipcRenderer.invoke('project:new', projectName),
    temp: () => ipcRenderer.invoke('project:temp'),
    save: (savePath) => ipcRenderer.invoke('project:save', savePath),
    load: (loadPath) => ipcRenderer.invoke('project:load', loadPath),
    info: () => ipcRenderer.invoke('project:info'),
    export: () => ipcRenderer.invoke('project:export'),
    markModified: () => ipcRenderer.invoke('project:markModified'),
    updateRepeaterTabs: (tabs) => ipcRenderer.invoke('project:updateRepeaterTabs', tabs),
    updateIntruderTabs: (tabs) => ipcRenderer.invoke('project:updateIntruderTabs', tabs),
    onLoaded: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('project:loaded', subscription);
      return () => ipcRenderer.removeListener('project:loaded', subscription);
    },
  },

  // Scanner
  scanner: {
    test: (template, targetUrl) => ipcRenderer.invoke('scanner:test', template, targetUrl),
    loadTemplates: () => ipcRenderer.invoke('scanner:loadTemplates'),
    stop: () => ipcRenderer.invoke('scanner:stop'),
  },

  // Shell (external links)
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Dialog
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  },
});
