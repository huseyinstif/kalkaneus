// Helper to check if electronAPI is available
export const waitForElectronAPI = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (window.electronAPI) {
      resolve(window.electronAPI);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.electronAPI) {
        clearInterval(checkInterval);
        resolve(window.electronAPI);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('electronAPI not available'));
      }
    }, 100);
  });
};

// Check electronAPI status
export const logElectronAPIStatus = () => {
  // Silent check for production
  return !!window.electronAPI;
};
