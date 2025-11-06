// Utility functions for tab management (Repeater, Intruder panels)

/**
 * Load tabs from localStorage
 */
export const loadTabsFromStorage = (storageKey) => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Failed to load ${storageKey}:`, error);
  }
  return null;
};

/**
 * Save tabs to localStorage
 */
export const saveTabsToStorage = (storageKey, data) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${storageKey}:`, error);
  }
};

/**
 * Create a new tab with default values
 */
export const createNewTab = (id, name, type = 'repeater') => {
  const baseTab = {
    id,
    name,
    color: null,
    request: {
      method: 'GET',
      url: '',
      headers: {},
      body: '',
    },
    response: null,
    history: [],
  };

  if (type === 'intruder') {
    return {
      ...baseTab,
      activeTab: 'positions',
      positions: [],
      payloadSets: [{ id: 1, type: 'simple', items: [] }],
      attackType: 'sniper',
      results: [],
      options: {
        threads: 10,
        delay: 0,
        redirects: 'never'
      }
    };
  }

  return baseTab;
};

/**
 * Find next available tab ID
 */
export const getNextTabId = (tabs) => {
  if (!tabs || tabs.length === 0) return 1;
  return Math.max(...tabs.map(t => t.id)) + 1;
};

/**
 * Reorder tabs after drag and drop
 */
export const reorderTabs = (tabs, draggedId, targetId) => {
  const draggedIndex = tabs.findIndex(t => t.id === draggedId);
  const targetIndex = tabs.findIndex(t => t.id === targetId);
  
  if (draggedIndex === -1 || targetIndex === -1) return tabs;
  
  const newTabs = [...tabs];
  const [draggedTab] = newTabs.splice(draggedIndex, 1);
  newTabs.splice(targetIndex, 0, draggedTab);
  
  return newTabs;
};
