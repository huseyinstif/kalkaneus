/**
 * Application Constants
 */

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Attack Types
export const ATTACK_TYPES = {
  SNIPER: 'sniper',
  BATTERING_RAM: 'battering-ram',
};

// Payload Types
export const PAYLOAD_TYPES = {
  SIMPLE: 'simple',
  NUMBERS: 'numbers',
};

// Panel Names
export const PANELS = {
  DASHBOARD: 'Dashboard',
  PROXY: 'Proxy',
  INTRUDER: 'Intruder',
  REPEATER: 'Repeater',
  SCANNER: 'Scanner',
  DECODER: 'Decoder',
  COMPARER: 'Comparer',
  LOGGER: 'Logger',
  SITEMAP: 'Sitemap',
  COLLABORATOR: 'Collaborator',
  LEARN: 'Learn',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  PROXY_HISTORY: 'proxy-history',
  PROXY_MATCH_REPLACE: 'proxy-match-replace-rules',
  REPEATER_TABS: 'repeater-tabs',
  INTRUDER_TABS: 'intruder-tabs',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar-collapsed',
};

// Event Names
export const EVENTS = {
  PROJECT_CLEARED: 'project:cleared',
  PROJECT_LOADED: 'project:loaded',
  PROJECT_UPDATED: 'project:updated',
  SEND_TO_REPEATER: 'sendToRepeater',
  SEND_TO_REPEATER_NO_SWITCH: 'sendToRepeaterNoSwitch',
  SEND_TO_INTRUDER: 'sendToIntruder',
  SEND_TO_INTRUDER_NO_SWITCH: 'sendToIntruderNoSwitch',
  SEND_TO_SCANNER: 'sendToScanner',
  OPEN_STARTUP_MODAL: 'open:startup-modal',
};

// Timeouts and Intervals
export const TIMING = {
  DEBOUNCE_DELAY: 300,
  SEARCH_DEBOUNCE: 500,
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  PROXY_FETCH_INTERVAL: 5000, // 5 seconds
  TOAST_DURATION: 3000,
  NOTIFICATION_THROTTLE: 2000,
};

// Limits
export const LIMITS = {
  MAX_HISTORY_SIZE: 10000,
  MAX_PAYLOAD_SIZE: 1000000, // 1MB
  MAX_REQUEST_SIZE: 10000000, // 10MB
  MAX_TABS: 50,
  MAX_RESULTS: 1000,
};

// File Extensions
export const FILE_EXTENSIONS = {
  STATIC: ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'],
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'],
  SCRIPTS: ['js', 'jsx', 'ts', 'tsx', 'mjs'],
  STYLES: ['css', 'scss', 'sass', 'less'],
};

// Regex Patterns
export const PATTERNS = {
  URL: /^https?:\/\/.+/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  IP: /^(\d{1,3}\.){3}\d{1,3}$/,
  PORT: /^\d{1,5}$/,
};

// Default Values
export const DEFAULTS = {
  PROXY_PORT: 8080,
  PROXY_HOST: '127.0.0.1',
  INTRUDER_THREADS: 10,
  INTRUDER_DELAY: 0,
  REQUEST_TIMEOUT: 30000,
};
