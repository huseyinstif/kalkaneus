export class InterceptManager {
  constructor() {
    this.pendingRequests = new Map();
    this.actionResolvers = new Map();
    this.pendingResponses = new Map();
    this.responseResolvers = new Map();
    this.interceptResponseIds = new Set(); // Track which requests should intercept response
    this.excludedHosts = new Set(); // Hosts to not intercept
    this.excludedUrls = new Set(); // URLs to not intercept
  }

  shouldInterceptRequest(url, host) {
    // Check if host is excluded
    if (this.excludedHosts.has(host)) {
      return false;
    }

    // Check if URL is excluded
    if (this.excludedUrls.has(url)) {
      return false;
    }

    // Check if URL matches any excluded pattern
    for (const excludedUrl of this.excludedUrls) {
      if (url.startsWith(excludedUrl)) {
        return false;
      }
    }

    return true;
  }

  addExcludedHost(host) {
    this.excludedHosts.add(host);
  }

  addExcludedUrl(url) {
    this.excludedUrls.add(url);
  }

  removeExcludedHost(host) {
    this.excludedHosts.delete(host);
  }

  removeExcludedUrl(url) {
    this.excludedUrls.delete(url);
  }

  getExcludedHosts() {
    return Array.from(this.excludedHosts);
  }

  getExcludedUrls() {
    return Array.from(this.excludedUrls);
  }

  clearExclusions() {
    this.excludedHosts.clear();
    this.excludedUrls.clear();
  }

  addRequest(requestId, requestData, ctx) {
    this.pendingRequests.set(requestId, {
      requestData,
      ctx,
      timestamp: Date.now(),
    });
  }

  addResponse(requestId, responseData) {
    this.pendingResponses.set(requestId, {
      responseData,
      timestamp: Date.now(),
    });
  }

  markForResponseInterception(requestId) {
    this.interceptResponseIds.add(requestId);
  }

  shouldInterceptResponse(requestId) {
    return this.interceptResponseIds.has(requestId);
  }

  waitForAction(requestId) {
    return new Promise((resolve) => {
      this.actionResolvers.set(requestId, resolve);
      
      // Set timeout (30 seconds)
      setTimeout(() => {
        if (this.actionResolvers.has(requestId)) {
          this.resolveAction(requestId, { type: 'forward' });
        }
      }, 30000);
    });
  }

  waitForResponseAction(requestId) {
    return new Promise((resolve) => {
      this.responseResolvers.set(requestId, resolve);
      
      // Set timeout (30 seconds)
      setTimeout(() => {
        if (this.responseResolvers.has(requestId)) {
          this.resolveResponseAction(requestId, { type: 'forward' });
        }
      }, 30000);
    });
  }

  resolveAction(requestId, action) {
    const resolver = this.actionResolvers.get(requestId);
    
    if (resolver) {
      resolver(action);
      this.actionResolvers.delete(requestId);
      this.pendingRequests.delete(requestId);
      return { success: true };
    }

    return { success: false, error: 'Request not found or already resolved' };
  }

  resolveResponseAction(requestId, action) {
    const resolver = this.responseResolvers.get(requestId);
    
    if (resolver) {
      resolver(action);
      this.responseResolvers.delete(requestId);
      this.pendingResponses.delete(requestId);
      this.interceptResponseIds.delete(requestId);
      return { success: true };
    }

    return { success: false, error: 'Response not found or already resolved' };
  }

  getPendingRequests() {
    return Array.from(this.pendingRequests.entries()).map(([id, data]) => ({
      id,
      ...data.requestData,
    }));
  }

  getPendingResponses() {
    return Array.from(this.pendingResponses.entries()).map(([id, data]) => ({
      id,
      ...data.responseData,
    }));
  }

  clearPending() {
    // Forward all pending requests
    for (const [requestId] of this.pendingRequests) {
      this.resolveAction(requestId, { type: 'forward' });
    }
    // Forward all pending responses
    for (const [requestId] of this.pendingResponses) {
      this.resolveResponseAction(requestId, { type: 'forward' });
    }
  }
}
