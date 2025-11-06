import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useRepeaterStore = create(
  persist(
    (set, get) => ({
      // Repeater tabs
      repeaterTabs: [],
      activeRepeaterTab: null,

      // Add repeater tab
      addRepeaterTab: (request) => {
        const tabs = get().repeaterTabs;
        const newTab = {
          id: Date.now(),
          name: `Request ${tabs.length + 1}`,
          request: {
            method: request.method || 'GET',
            url: request.url || '',
            headers: request.headers || {},
            body: request.body || '',
          },
          response: null,
          history: [],
        };
        set({ 
          repeaterTabs: [...tabs, newTab],
          activeRepeaterTab: newTab.id 
        });
        return newTab.id;
      },

      // Update repeater tab
      updateRepeaterTab: (tabId, updates) => {
        set({
          repeaterTabs: get().repeaterTabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          )
        });
      },

      // Remove repeater tab
      removeRepeaterTab: (tabId) => {
        const tabs = get().repeaterTabs.filter(tab => tab.id !== tabId);
        set({ 
          repeaterTabs: tabs,
          activeRepeaterTab: tabs.length > 0 ? tabs[0].id : null
        });
      },

      // Set active repeater tab
      setActiveRepeaterTab: (tabId) => {
        set({ activeRepeaterTab: tabId });
      },
    }),
    {
      name: 'repeater-storage',
    }
  )
);
