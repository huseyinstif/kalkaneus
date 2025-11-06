import { create } from 'zustand';

export const useProxyStore = create((set, get) => ({
  // Proxy status
  status: {
    isRunning: false,
    config: null,
    requestCount: 0,
  },

  // HTTP History
  history: [],
  selectedRequest: null,

  // Intercept
  interceptEnabled: false,
  interceptQueue: [],

  // Actions
  fetchStatus: async () => {
    try {
      if (!window.electronAPI?.proxy) {
        return;
      }
      const status = await window.electronAPI.proxy.getStatus();
      set({ status });
    } catch (error) {
      // Silent error handling
    }
  },

  startProxy: async (config) => {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }
      
      const result = await window.electronAPI.proxy.start(config);
      
      if (result.success) {
        get().fetchStatus();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  stopProxy: async () => {
    try {
      const result = await window.electronAPI.proxy.stop();
      if (result.success) {
        get().fetchStatus();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateConfig: async (config) => {
    try {
      const result = await window.electronAPI.proxy.updateConfig(config);
      if (result.success) {
        get().fetchStatus();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // History
  fetchHistory: async (filters) => {
    try {
      const history = await window.electronAPI.history.getAll(filters);
      set({ history });
    } catch (error) {
      // Silent error handling
    }
  },

  selectRequest: async (requestId) => {
    try {
      const request = await window.electronAPI.history.getById(requestId);
      set({ selectedRequest: request });
    } catch (error) {
      // Silent error handling
    }
  },

  clearHistory: async () => {
    try {
      await window.electronAPI.history.clear();
      set({ history: [], selectedRequest: null });
    } catch (error) {
      // Silent error handling
    }
  },

  // Intercept
  addToInterceptQueue: (request) => {
    set((state) => ({
      interceptQueue: [...state.interceptQueue, request],
    }));
  },

  removeFromInterceptQueue: (requestId) => {
    set((state) => ({
      interceptQueue: state.interceptQueue.filter((r) => r.id !== requestId),
    }));
  },

  forwardRequest: async (requestId) => {
    try {
      await window.electronAPI.intercept.forward(requestId);
      get().removeFromInterceptQueue(requestId);
    } catch (error) {
      // Silent error handling
    }
  },

  dropRequest: async (requestId) => {
    try {
      await window.electronAPI.intercept.drop(requestId);
      get().removeFromInterceptQueue(requestId);
    } catch (error) {
      // Silent error handling
    }
  },

  modifyAndForward: async (requestId, modifiedRequest) => {
    try {
      await window.electronAPI.intercept.modify(requestId, modifiedRequest);
      get().removeFromInterceptQueue(requestId);
    } catch (error) {
      // Silent error handling
    }
  },

  toggleIntercept: async () => {
    const newState = !get().interceptEnabled;
    set({ interceptEnabled: newState });
    
    try {
      // Update proxy config
      await window.electronAPI.proxy.updateConfig({ interceptEnabled: newState });
    } catch (error) {
      // Revert on error
      set({ interceptEnabled: !newState });
    }
  },
}));

// Setup event listeners
if (window.electronAPI) {
  // Listen for new requests
  window.electronAPI.proxy.onRequest((request) => {
    const store = useProxyStore.getState();
    store.fetchHistory();
  });

  // Listen for intercept requests
  window.electronAPI.proxy.onInterceptRequest((request) => {
    const store = useProxyStore.getState();
    store.addToInterceptQueue(request);
  });

  // Listen for intercept responses
  window.electronAPI.proxy.onInterceptResponse((response) => {
    const store = useProxyStore.getState();
    store.addToInterceptQueue(response);
  });
}
