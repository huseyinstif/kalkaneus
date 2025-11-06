// Utility functions for formatting requests across different panels

/**
 * Format request for Repeater/Intruder
 * Handles both database format (request_headers, request_body) and standard format
 */
export const formatRequest = (request) => {
  return {
    method: request.method || 'GET',
    url: request.url || '',
    headers: request.request_headers || request.headers || {},
    body: request.request_body || request.body || '',
    timestamp: request.timestamp || Date.now(),
  };
};

/**
 * Send request to Repeater
 * @param {Object} request - Request object
 * @param {boolean} noSwitch - If true, don't switch to Repeater tab
 */
export const sendToRepeater = (request, noSwitch = false) => {
  const formattedRequest = formatRequest(request);
  const eventName = noSwitch ? 'sendToRepeaterNoSwitch' : 'sendToRepeater';
  window.dispatchEvent(new CustomEvent(eventName, { detail: formattedRequest }));
};

/**
 * Send request to Intruder
 * @param {Object} request - Request object
 * @param {boolean} noSwitch - If true, don't switch to Intruder tab
 */
export const sendToIntruder = (request, noSwitch = false) => {
  const formattedRequest = formatRequest(request);
  const eventName = noSwitch ? 'sendToIntruderNoSwitch' : 'sendToIntruder';
  window.dispatchEvent(new CustomEvent(eventName, { detail: formattedRequest }));
};

/**
 * Send request to Scanner
 */
export const sendToScanner = (request) => {
  const formattedRequest = formatRequest(request);
  window.dispatchEvent(new CustomEvent('sendToScanner', { detail: formattedRequest }));
};
