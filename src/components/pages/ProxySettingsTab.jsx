import React, { useState } from 'react';
import { Play, Square, Globe, Download } from 'lucide-react';
import { toast } from '../common/Toast';
import { useProxyStore } from '../../store/proxyStore';

function InterceptFiltersSection() {
  const [filters, setFilters] = useState({ excludedHosts: [], excludedUrls: [] });
  const [newHost, setNewHost] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const loadFilters = async () => {
    try {
      const result = await window.electronAPI.intercept.getFilters();
      setFilters(result);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  React.useEffect(() => {
    loadFilters();
  }, []);

  const addHost = async () => {
    if (!newHost.trim()) return;
    try {
      await window.electronAPI.intercept.addExcludedHost(newHost.trim());
      setNewHost('');
      loadFilters();
    } catch (error) {
      console.error('Error adding host:', error);
    }
  };

  const addUrl = async () => {
    if (!newUrl.trim()) return;
    try {
      await window.electronAPI.intercept.addExcludedUrl(newUrl.trim());
      setNewUrl('');
      loadFilters();
    } catch (error) {
      console.error('Error adding URL:', error);
    }
  };

  const removeHost = async (host) => {
    try {
      await window.electronAPI.intercept.removeExcludedHost(host);
      loadFilters();
    } catch (error) {
      console.error('Error removing host:', error);
    }
  };

  const removeUrl = async (url) => {
    try {
      await window.electronAPI.intercept.removeExcludedUrl(url);
      loadFilters();
    } catch (error) {
      console.error('Error removing URL:', error);
    }
  };

  const clearAll = async () => {
    try {
      await window.electronAPI.intercept.clearFilters();
      loadFilters();
    } catch (error) {
      console.error('Error clearing filters:', error);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-400">
        Requests matching these filters will not be intercepted, but will still appear in HTTP history.
      </p>

      <div>
        <label className="block text-sm font-medium mb-2">Excluded Hosts</label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHost()}
            placeholder="example.com"
            className="input flex-1"
          />
          <button onClick={addHost} className="btn btn-primary btn-sm">Add</button>
        </div>
        <div className="space-y-1">
          {filters.excludedHosts?.map((host, idx) => (
            <div key={idx} className="flex items-center justify-between bg-dark-800 rounded px-3 py-2">
              <span className="text-sm font-mono">{host}</span>
              <button onClick={() => removeHost(host)} className="text-red-400 hover:text-red-300 text-sm">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Excluded URLs</label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addUrl()}
            placeholder="/api/health"
            className="input flex-1"
          />
          <button onClick={addUrl} className="btn btn-primary btn-sm">Add</button>
        </div>
        <div className="space-y-1">
          {filters.excludedUrls?.map((url, idx) => (
            <div key={idx} className="flex items-center justify-between bg-dark-800 rounded px-3 py-2">
              <span className="text-sm font-mono">{url}</span>
              <button onClick={() => removeUrl(url)} className="text-red-400 hover:text-red-300 text-sm">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={clearAll} className="btn btn-secondary btn-sm">
        Clear All Filters
      </button>
    </div>
  );
}

export default function ProxySettingsTab() {
  const { status, startProxy, stopProxy } = useProxyStore();
  const [config, setConfig] = useState({
    port: 8080,
    host: '127.0.0.1',
    setElectronProxy: true,
  });
  const [settings, setSettings] = useState({
    maxHistorySize: 1000,
    autoScroll: true,
    captureImages: true,
    captureCSS: true,
    captureJS: true,
    timeout: 30000,
  });

  // Listen for project updates
  React.useEffect(() => {
    const handleProjectUpdate = async (event) => {
      const project = event.detail;
      if (project?.data?.proxySettings) {
        setSettings(prev => ({ ...prev, ...project.data.proxySettings }));
      }
    };

    window.addEventListener('project:updated', handleProjectUpdate);
    return () => window.removeEventListener('project:updated', handleProjectUpdate);
  }, []);

  const handleStartProxy = async () => {
    try {
      const result = await startProxy(config);
      if (!result.success) {
        toast.error(`Failed to start proxy: ${result.error}`);
      }
    } catch (error) {
      console.error('Error starting proxy:', error);
      toast.error(`Error starting proxy: ${error.message}`);
    }
  };

  const handleStopProxy = async () => {
    await stopProxy();
  };

  const handleExportCA = async () => {
    try {
      const result = await window.electronAPI.ca.export('pem');
      if (result.success) {
        toast.success('CA certificate exported successfully');
      } else if (!result.canceled) {
        toast.error('Failed to export CA certificate: ' + result.error);
      }
    } catch (error) {
      toast.error('Failed to export CA certificate: ' + error.message);
    }
  };

  const openBrowser = async () => {
    if (!status.isRunning) {
      toast.warning('Please start the proxy first!');
      return;
    }
    
    try {
      await window.electronAPI.proxy.openBrowser({
        proxyHost: status.config.host,
        proxyPort: status.config.port
      });
    } catch (error) {
      console.error('Failed to open browser:', error);
      toast.error('Failed to open browser. Make sure Chromium is installed.');
    }
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI.proxy.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const resetSettings = () => {
    setSettings({
      maxHistorySize: 1000,
      autoScroll: true,
      captureImages: true,
      captureCSS: true,
      captureJS: true,
      timeout: 30000,
    });
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Proxy Configuration */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Proxy Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Host</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="input w-full"
                disabled={status.isRunning}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                className="input w-full"
                disabled={status.isRunning}
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.setElectronProxy}
                onChange={(e) => setConfig({ ...config, setElectronProxy: e.target.checked })}
                className="rounded"
                disabled={status.isRunning}
              />
              <span className="text-sm">Set Electron session proxy automatically</span>
            </label>
          </div>

          <div className="flex space-x-3">
            {!status.isRunning ? (
              <button onClick={handleStartProxy} className="btn btn-success flex items-center space-x-2">
                <Play size={16} />
                <span>Start Proxy</span>
              </button>
            ) : (
              <button onClick={handleStopProxy} className="btn btn-danger flex items-center space-x-2">
                <Square size={16} />
                <span>Stop Proxy</span>
              </button>
            )}
            <button
              onClick={openBrowser}
              disabled={!status.isRunning}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Globe size={16} />
              <span>Open Browser</span>
            </button>
          </div>
        </div>

        {/* CA Certificate */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">CA Certificate</h3>
          <p className="text-sm text-dark-400 mb-4">
            To intercept HTTPS traffic, install the CA certificate in your browser or OS.
          </p>
          <button
            onClick={handleExportCA}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Download CA Certificate</span>
          </button>
        </div>

        {/* Current Status */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Current Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dark-400">Status:</span>
              <span className={`ml-2 font-medium ${status.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                {status.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div>
              <span className="text-dark-400">Port:</span>
              <span className="ml-2 font-medium text-dark-200">
                {status.config?.port || config.port}
              </span>
            </div>
            <div>
              <span className="text-dark-400">Host:</span>
              <span className="ml-2 font-medium text-dark-200">
                {status.config?.host || config.host}
              </span>
            </div>
            <div>
              <span className="text-dark-400">Requests:</span>
              <span className="ml-2 font-medium text-dark-200">
                {status.requestCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Capture Settings */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Capture Settings</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">History Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max History Size: {settings.maxHistorySize}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={settings.maxHistorySize}
                    onChange={(e) => setSettings({ ...settings, maxHistorySize: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Maximum number of requests to keep in history
                  </p>
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.autoScroll}
                    onChange={(e) => setSettings({ ...settings, autoScroll: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Auto-scroll to new requests</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Capture Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.captureImages}
                    onChange={(e) => setSettings({ ...settings, captureImages: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Capture image files</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.captureCSS}
                    onChange={(e) => setSettings({ ...settings, captureCSS: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Capture CSS files</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.captureJS}
                    onChange={(e) => setSettings({ ...settings, captureJS: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Capture JavaScript files</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Timeout Settings</h4>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Request Timeout: {settings.timeout / 1000}s
                </label>
                <input
                  type="range"
                  min="5000"
                  max="120000"
                  step="5000"
                  value={settings.timeout}
                  onChange={(e) => setSettings({ ...settings, timeout: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-dark-500 mt-1">
                  Maximum time to wait for a response
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Intercept Filters</h4>
              <InterceptFiltersSection />
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="sticky bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-sm border-t border-dark-700 mt-6 pt-4 pb-4 -mx-6 px-6">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={saveSettings} 
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Save Settings</span>
                </button>
                <button 
                  onClick={resetSettings} 
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
