// HTTP utility functions

/**
 * Parse headers string to object
 */
export const parseHeaders = (headersString) => {
  const headers = {};
  if (!headersString) return headers;
  
  headersString.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      headers[key.trim()] = valueParts.join(':').trim();
    }
  });
  
  return headers;
};

/**
 * Convert headers object to string
 */
export const stringifyHeaders = (headersObj) => {
  if (!headersObj || typeof headersObj !== 'object') return '';
  
  return Object.entries(headersObj)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

/**
 * Get status code color class
 */
export const getStatusCodeColor = (statusCode) => {
  if (statusCode < 200) return 'text-blue-400';
  if (statusCode < 300) return 'text-green-400';
  if (statusCode < 400) return 'text-blue-400';
  if (statusCode < 500) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get status code badge class
 */
export const getStatusCodeBadge = (statusCode) => {
  if (statusCode < 200) return 'badge-info';
  if (statusCode < 300) return 'badge-success';
  if (statusCode < 400) return 'badge-info';
  if (statusCode < 500) return 'badge-warning';
  return 'badge-error';
};

/**
 * Format file size
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format response time
 */
export const formatTime = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Extract hostname from URL
 */
export const getHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/**
 * Check if URL matches filter
 */
export const matchesFilter = (url, filter) => {
  if (!filter) return true;
  return url.toLowerCase().includes(filter.toLowerCase());
};

/**
 * Get file extension from URL
 */
export const getFileExtension = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  } catch {
    return '';
  }
};

/**
 * Check if request is static resource (CSS, JS, images)
 */
export const isStaticResource = (url) => {
  const ext = getFileExtension(url);
  const staticExtensions = ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
  return staticExtensions.includes(ext);
};
