import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useIntruderStore = create(
  persist(
    (set, get) => ({
      // Intruder tabs
      intruderTabs: [],
      activeIntruderTab: null,

      // Add intruder tab
      addIntruderTab: (request) => {
        const tabs = get().intruderTabs;
        const newTab = {
          id: Date.now(),
          name: `Attack ${tabs.length + 1}`,
          request: {
            method: request.method || 'GET',
            url: request.url || '',
            headers: request.headers || 'User-Agent: Kalkaneus/1.0\nContent-Type: application/json',
            body: request.body || '',
          },
          positions: [],
          payloads: [],
          results: [],
        };
        set({ 
          intruderTabs: [...tabs, newTab],
          activeIntruderTab: newTab.id 
        });
      },

      // Update intruder tab
      updateIntruderTab: (tabId, updates) => {
        set({
          intruderTabs: get().intruderTabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          )
        });
      },

      // Remove intruder tab
      removeIntruderTab: (tabId) => {
        const tabs = get().intruderTabs.filter(tab => tab.id !== tabId);
        set({ 
          intruderTabs: tabs,
          activeIntruderTab: tabs.length > 0 ? tabs[0].id : null
        });
      },

      // Set active intruder tab
      setActiveIntruderTab: (tabId) => {
        set({ activeIntruderTab: tabId });
      },
    }),
    {
      name: 'intruder-storage',
    }
  )
);
