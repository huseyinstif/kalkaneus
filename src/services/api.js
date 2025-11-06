/**
 * API Service Layer - Centralized API calls
 */

class APIService {
  constructor() {
    this.api = window.electronAPI;
  }

  // Proxy API
  proxy = {
    start: (config) => this.api.proxy.start(config),
    stop: () => this.api.proxy.stop(),
    getStatus: () => this.api.proxy.getStatus(),
    getConfig: () => this.api.proxy.getConfig(),
    updateConfig: (config) => this.api.proxy.updateConfig(config),
    updateMatchReplaceRules: (rules) => this.api.proxy.updateMatchReplaceRules(rules),
    openBrowser: (config) => this.api.proxy.openBrowser(config),
    updateSettings: (settings) => this.api.proxy.updateSettings(settings),
  };

  // Repeater API
  repeater = {
    send: (request) => this.api.repeater.send(request),
  };

  // Scanner API
  scanner = {
    loadTemplates: () => this.api.scanner.loadTemplates(),
    test: (template, target) => this.api.scanner.test(template, target),
    stop: () => this.api.scanner.stop(),
  };

  // Project API
  project = {
    save: () => this.api.project.save(),
    load: () => this.api.project.load(),
    export: () => this.api.project.export(),
    info: () => this.api.project.info(),
    updateRepeaterTabs: (data) => this.api.project.updateRepeaterTabs(data),
    updateIntruderTabs: (data) => this.api.project.updateIntruderTabs(data),
  };

  // CA Certificate API
  ca = {
    export: (format) => this.api.ca.export(format),
  };

  // Intercept API
  intercept = {
    getFilters: () => this.api.intercept.getFilters(),
    addExcludedHost: (host) => this.api.intercept.addExcludedHost(host),
    addExcludedUrl: (url) => this.api.intercept.addExcludedUrl(url),
    removeExcludedHost: (host) => this.api.intercept.removeExcludedHost(host),
    removeExcludedUrl: (url) => this.api.intercept.removeExcludedUrl(url),
    clearFilters: () => this.api.intercept.clearFilters(),
  };

  // Event listeners
  on = (channel, callback) => {
    return this.api.on(channel, callback);
  };

  removeListener = (channel, callback) => {
    return this.api.removeListener(channel, callback);
  };
}

// Export singleton instance
export const apiService = new APIService();
export default apiService;
