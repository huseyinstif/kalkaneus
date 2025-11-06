import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Globe, Download, Upload, Trash2, Search, X, ChevronRight, ChevronDown, Send, Copy, Flag, MessageSquare, Terminal } from 'lucide-react';
import { toast } from '../common/Toast';
import { useProxyStore } from '../../store/proxyStore';
import RequestDetailView from '../RequestDetailView';
import InterceptView from '../InterceptView';
import ContextMenu from '../ContextMenu';
import CopyAsModal from '../modals/CopyAsModal';
import ProxyMatchReplaceTab from './ProxyMatchReplaceTab';

const tabs = ['Intercept', 'HTTP history', 'WebSockets history', 'Match & replace', 'Proxy settings'];

export default function ProxyPanel() {
  const [activeTab, setActiveTab] = useState('HTTP history');
  const { history, selectedRequest, fetchHistory, selectRequest, clearHistory } = useProxyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    method: '',
    statusCode: '',
    host: '',
    extension: '',
    hideImages: false,
    hideCSS: false,
    hideJS: false,
    showFlaggedOnly: false,
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [commentModal, setCommentModal] = useState(null);
  const [copyAsModal, setCopyAsModal] = useState(null);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => {
      fetchHistory();
    }, 5000); // Fetch every 5 seconds instead of 2
    return () => clearInterval(interval);
  }, [fetchHistory]);


  // Listen for intercept events
  useEffect(() => {
    const { addToInterceptQueue } = useProxyStore.getState();
    
    const handleInterceptRequest = (data) => {
      addToInterceptQueue(data);
    };
    
    const handleInterceptResponse = (data) => {
      addToInterceptQueue(data);
    };
    
    window.electronAPI.on('proxy:intercept', handleInterceptRequest);
    window.electronAPI.on('proxy:interceptResponse', handleInterceptResponse);
    
    return () => {
      window.electronAPI.removeListener('proxy:intercept', handleInterceptRequest);
      window.electronAPI.removeListener('proxy:interceptResponse', handleInterceptResponse);
    };
  }, []);

  // Listen for project loaded event
  useEffect(() => {
    const handleProjectLoaded = () => {
      fetchHistory();
    };

    window.addEventListener('project:loaded', handleProjectLoaded);
    return () => window.removeEventListener('project:loaded', handleProjectLoaded);
  }, [fetchHistory]);

  // Listen for proxy tab change event
  useEffect(() => {
    const handleProxyTab = (e) => {
      setActiveTab(e.detail);
    };

    window.addEventListener('proxyTab', handleProxyTab);
    return () => window.removeEventListener('proxyTab', handleProxyTab);
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredHistory = React.useMemo(() => {
    return history.filter((req) => {
      if (debouncedSearchTerm && !req.url.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return false;
      }
    if (filters.method && req.method !== filters.method) {
      return false;
    }
    if (filters.statusCode && req.status_code !== parseInt(filters.statusCode)) {
      return false;
    }
    
    // Extension filters
    const url = req.url.toLowerCase();
    if (filters.hideImages && /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i.test(url)) {
      return false;
    }
    if (filters.hideCSS && url.endsWith('.css')) {
      return false;
    }
    if (filters.hideJS && url.endsWith('.js')) {
      return false;
    }
    if (filters.extension && !url.endsWith(filters.extension.toLowerCase())) {
      return false;
    }
    if (filters.showFlaggedOnly && !req.flag) {
      return false;
    }
    
      return true;
    });
  }, [history, debouncedSearchTerm, filters]);

  // Sort history
  const sortedHistory = React.useMemo(() => {
    if (!sortConfig.key) return filteredHistory;
    
    return [...filteredHistory].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle null/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // String comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredHistory, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const truncatePath = (url, maxLength = 80) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      if (path.length <= maxLength) return path;
      return path.substring(0, maxLength) + '...';
    } catch {
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }
  };

  const handleContextMenu = (e, request) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      request,
    });
  };

  const sendToRepeater = (request, ctrlKey = false) => {
    const repeaterRequest = {
      method: request.method,
      url: request.url,
      headers: request.request_headers || request.headers || {},
      body: request.request_body || request.body || '',
      timestamp: Date.now(),
    };
    const eventName = ctrlKey ? 'sendToRepeaterNoSwitch' : 'sendToRepeater';
    window.dispatchEvent(new CustomEvent(eventName, { detail: repeaterRequest }));
  };

  const sendToIntruder = (request, ctrlKey = false) => {
    const intruderRequest = {
      method: request.method,
      url: request.url,
      headers: request.request_headers || request.headers || {},
      body: request.request_body || request.body || '',
      timestamp: Date.now(),
    };
    const eventName = ctrlKey ? 'sendToIntruderNoSwitch' : 'sendToIntruder';
    window.dispatchEvent(new CustomEvent(eventName, { detail: intruderRequest }));
  };

  const sendToScanner = (request) => {
    const scannerRequest = {
      method: request.method,
      url: request.url,
      headers: request.request_headers || request.headers || {},
      body: request.request_body || request.body || '',
      timestamp: Date.now(),
    };
    window.dispatchEvent(new CustomEvent('sendToScanner', { detail: scannerRequest }));
  };

  const sendToComparer = (request) => {
    const comparerRequest = {
      method: request.method,
      url: request.url,
      headers: request.request_headers || request.headers || {},
      body: request.request_body || request.body || '',
      response_body: request.response_body || '',
      timestamp: Date.now(),
    };
    window.dispatchEvent(new CustomEvent('sendToComparer', { detail: comparerRequest }));
  };

  const sendToDecoder = (request) => {
    const text = request.request_body || request.body || '';
    window.dispatchEvent(new CustomEvent('sendToDecoder', { detail: { text } }));
  };

  const openBrowser = async () => {
    const { status } = useProxyStore.getState();
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
      alert('Failed to open browser. Make sure Chromium is installed.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Intercept':
        return <InterceptTab />;
      case 'HTTP history':
        return (
          <div className="flex h-full">
            {/* History List */}
            <div className={`${selectedRequest ? 'w-1/2' : 'w-full'} border-r border-dark-800 flex flex-col`}>
              <div className="p-4 border-b border-dark-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">
                    Showing {filteredHistory.length} of {history.length} requests
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-500 pointer-events-none" size={16} />
                    <input
                      type="text"
                      placeholder="Search URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input w-full pl-9"
                    />
                  </div>
                  <button
                    onClick={clearHistory}
                    className="btn btn-secondary btn-sm flex items-center space-x-1"
                    title="Clear history"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={filters.method}
                    onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                    className="input text-sm"
                  >
                    <option value="">All Methods</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Status code..."
                    value={filters.statusCode}
                    onChange={(e) => setFilters({ ...filters, statusCode: e.target.value })}
                    className="input text-sm w-32"
                  />
                  <input
                    type="text"
                    placeholder="Extension (.js)..."
                    value={filters.extension}
                    onChange={(e) => setFilters({ ...filters, extension: e.target.value })}
                    className="input text-sm w-32"
                  />
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hideImages}
                      onChange={(e) => setFilters({ ...filters, hideImages: e.target.checked })}
                      className="rounded border-dark-600"
                    />
                    <span className="text-dark-300">Hide Images</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hideCSS}
                      onChange={(e) => setFilters({ ...filters, hideCSS: e.target.checked })}
                      className="rounded border-dark-600"
                    />
                    <span className="text-dark-300">Hide CSS</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hideJS}
                      onChange={(e) => setFilters({ ...filters, hideJS: e.target.checked })}
                      className="rounded border-dark-600"
                    />
                    <span className="text-dark-300">Hide JS</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showFlaggedOnly}
                      onChange={(e) => setFilters({ ...filters, showFlaggedOnly: e.target.checked })}
                      className="rounded border-dark-600"
                    />
                    <span className="text-dark-300 flex items-center space-x-1">
                      <Flag size={14} className="text-red-500" />
                      <span>Flagged Only</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-12" title="Flag / Comment">
                        <Flag size={14} className="text-dark-500" />
                      </th>
                      <th className="w-16">#</th>
                      <th className="w-20">Method</th>
                      <th>Host</th>
                      <th>Path</th>
                      <th 
                        className="w-20 cursor-pointer hover:bg-dark-700" 
                        onClick={() => handleSort('status_code')}
                        title="Click to sort"
                      >
                        Status {sortConfig.key === 'status_code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="w-24 cursor-pointer hover:bg-dark-700" 
                        onClick={() => handleSort('response_length')}
                        title="Click to sort"
                      >
                        Length {sortConfig.key === 'response_length' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="w-24 cursor-pointer hover:bg-dark-700" 
                        onClick={() => handleSort('duration')}
                        title="Click to sort"
                      >
                        Time {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map((req, index) => (
                      <tr
                        key={req.id}
                        onClick={() => selectRequest(req.id)}
                        onContextMenu={(e) => handleContextMenu(e, req)}
                        className={`cursor-pointer ${
                          selectedRequest?.id === req.id ? 'selected' : ''
                        }`}
                      >
                        <td className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {req.flag && <Flag size={14} className="text-red-500" />}
                            {req.comment && (
                              <MessageSquare 
                                size={14} 
                                className="text-blue-500" 
                                title={req.comment}
                              />
                            )}
                          </div>
                        </td>
                        <td className="text-dark-500">{index + 1}</td>
                        <td>
                          <span className="badge badge-info">{req.method}</span>
                        </td>
                        <td className="text-dark-300" title={req.host}>
                          {req.host || new URL(req.url).hostname}
                        </td>
                        <td className="text-dark-400 font-mono text-xs" title={req.url}>
                          {truncatePath(req.url)}
                        </td>
                        <td>
                          {req.status_code && (
                            <span
                              className={`badge ${
                                req.status_code < 300
                                  ? 'badge-success'
                                  : req.status_code < 400
                                  ? 'badge-info'
                                  : req.status_code < 500
                                  ? 'badge-warning'
                                  : 'badge-error'
                              }`}
                            >
                              {req.status_code}
                            </span>
                          )}
                        </td>
                        <td className="text-dark-400 text-xs">
                          {req.response_length ? `${(req.response_length / 1024).toFixed(1)} KB` : '-'}
                        </td>
                        <td className="text-dark-400 text-xs">
                          {req.duration ? `${req.duration}ms` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredHistory.length === 0 && (
                  <div className="p-8 text-center text-dark-500">
                    No requests captured yet. Start the proxy and browse to see traffic here.
                  </div>
                )}
              </div>
            </div>

            {/* Request Detail */}
            {selectedRequest && (
              <div className="w-1/2 flex flex-col border-l border-dark-800">
                <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold">Request Details</h3>
                  <button
                    onClick={() => selectRequest(null)}
                    className="text-dark-400 hover:text-dark-200 transition-colors"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <RequestDetailView request={selectedRequest} />
                </div>
              </div>
            )}
          </div>
        );
      case 'WebSockets history':
        return <WebSocketsTab />;
      case 'Match & replace':
        return <ProxyMatchReplaceTab />;
      case 'Proxy settings':
        return <ProxySettingsTab />;
      default:
        return <div className="p-4">Coming soon...</div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="bg-dark-900 border-b border-dark-800 flex items-center justify-between">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          onClick={openBrowser}
          className="btn btn-secondary btn-sm mr-4 flex items-center space-x-2"
          title="Open Browser with Proxy"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <span>Open browser</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">{renderTabContent()}</div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: 'Send to Repeater',
              icon: <Send size={14} />,
              onClick: (e) => sendToRepeater(contextMenu.request, e.ctrlKey || e.metaKey),
            },
            {
              label: 'Send to Intruder',
              icon: <Copy size={14} />,
              onClick: (e) => sendToIntruder(contextMenu.request, e.ctrlKey || e.metaKey),
            },
            {
              label: 'Send to Scanner',
              icon: <Send size={14} />,
              onClick: () => sendToScanner(contextMenu.request),
            },
            {
              label: 'Send to Comparer',
              icon: <Send size={14} />,
              onClick: () => sendToComparer(contextMenu.request),
            },
            {
              label: 'Send to Decoder',
              icon: <Send size={14} />,
              onClick: () => sendToDecoder(contextMenu.request),
            },
            { divider: true },
            {
              label: contextMenu.request.flag ? 'Unflag' : 'Flag',
              icon: <Flag size={14} />,
              onClick: async () => {
                const newFlag = !contextMenu.request.flag;
                await window.electronAPI.history.updateFlag(contextMenu.request.id, newFlag);
                fetchHistory();
                toast.success(newFlag ? 'Request flagged' : 'Flag removed');
              },
            },
            {
              label: contextMenu.request.comment ? 'Edit Comment' : 'Add Comment',
              icon: <MessageSquare size={14} />,
              onClick: () => {
                setCommentModal({
                  requestId: contextMenu.request.id,
                  currentComment: contextMenu.request.comment || ''
                });
                setContextMenu(null);
              },
            },
            ...(contextMenu.request.comment ? [{
              label: 'Remove Comment',
              icon: <X size={14} />,
              onClick: async () => {
                await window.electronAPI.history.updateComment(contextMenu.request.id, '');
                fetchHistory();
                toast.success('Comment removed');
              },
            }] : []),
            { divider: true },
            {
              label: 'Copy as...',
              icon: <Terminal size={14} />,
              onClick: () => {
                setCopyAsModal(contextMenu.request);
                setContextMenu(null);
              },
            },
            { divider: true },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: async () => {
                const result = await window.electronAPI.history.delete(contextMenu.request.id);
                if (result.success) {
                  toast.success('Request deleted');
                  fetchHistory();
                  if (selectedRequest?.id === contextMenu.request.id) {
                    selectRequest(null);
                  }
                } else {
                  toast.error('Failed to delete request');
                }
                setContextMenu(null);
              },
            },
          ]}
        />
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-900 rounded-lg p-6 w-96 border border-dark-700">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <textarea
              autoFocus
              defaultValue={commentModal.currentComment}
              className="input w-full h-32 resize-none"
              placeholder="Enter your comment..."
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setCommentModal(null);
                }
              }}
              id="comment-input"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setCommentModal(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const comment = document.getElementById('comment-input').value;
                  await window.electronAPI.history.updateComment(commentModal.requestId, comment);
                  fetchHistory();
                  toast.success('Comment updated');
                  setCommentModal(null);
                }}
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy As Modal */}
      {copyAsModal && (
        <CopyAsModal
          request={copyAsModal}
          onClose={() => setCopyAsModal(null)}
        />
      )}
    </div>
  );
}

function InterceptTab() {
  const { interceptQueue, interceptEnabled, toggleIntercept, forwardRequest, dropRequest, modifyAndForward } = useProxyStore();
  const [selectedInterceptIndex, setSelectedInterceptIndex] = useState(0);

  const currentRequest = interceptQueue[selectedInterceptIndex];

  const handleForward = async (requestId) => {
    await forwardRequest(requestId);
    // Move to next request if available
    if (interceptQueue.length > 1) {
      setSelectedInterceptIndex(Math.min(selectedInterceptIndex, interceptQueue.length - 2));
    }
  };

  const handleDrop = async (requestId) => {
    await dropRequest(requestId);
    // Move to next request if available
    if (interceptQueue.length > 1) {
      setSelectedInterceptIndex(Math.min(selectedInterceptIndex, interceptQueue.length - 2));
    }
  };

  const handleModify = async (requestId, modifiedRequest) => {
    await modifyAndForward(requestId, modifiedRequest);
    // Move to next request if available
    if (interceptQueue.length > 1) {
      setSelectedInterceptIndex(Math.min(selectedInterceptIndex, interceptQueue.length - 2));
    }
  };

  const handleForwardAll = async () => {
    // Forward all pending requests
    const requests = [...interceptQueue];
    for (const req of requests) {
      await forwardRequest(req.id);
    }
    setSelectedInterceptIndex(0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Intercept Toggle */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold">Intercept</h3>
          <button
            onClick={toggleIntercept}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              interceptEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
            }`}
          >
            {interceptEnabled ? 'Intercept is ON' : 'Intercept is OFF'}
          </button>
        </div>
        {interceptQueue.length > 0 && (
          <div className="text-sm text-dark-400">
            {interceptQueue.length} request{interceptQueue.length > 1 ? 's' : ''} in queue
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Queue List */}
        {interceptQueue.length > 1 && (
        <div className="w-64 border-r border-dark-800 overflow-auto">
          <div className="p-2 border-b border-dark-800 bg-dark-900">
            <span className="text-sm font-semibold text-dark-400">
              Queue ({interceptQueue.length})
            </span>
          </div>
          {interceptQueue.map((req, index) => (
            <div
              key={req.id}
              onClick={() => setSelectedInterceptIndex(index)}
              className={`p-3 border-b border-dark-800 cursor-pointer hover:bg-dark-800 transition-colors ${
                index === selectedInterceptIndex ? 'bg-dark-800 border-l-2 border-l-primary-500' : ''
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="badge badge-info text-xs">{req.method}</span>
                <span className="text-xs text-dark-500">#{index + 1}</span>
              </div>
              <div className="text-sm text-dark-300 truncate">{req.url}</div>
            </div>
          ))}
        </div>
      )}

        {/* Request Detail */}
        <div className="flex-1">
          <InterceptView
            request={currentRequest}
            onForward={handleForward}
            onDrop={handleDrop}
            onModify={handleModify}
            onForwardAll={handleForwardAll}
          />
        </div>
      </div>
    </div>
  );
}

function InterceptFiltersSection() {
  const [filters, setFilters] = useState({ excludedHosts: [], excludedUrls: [] });
  const [newHost, setNewHost] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const result = await window.electronAPI.intercept.getFilters();
      setFilters(result);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

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

      {/* Excluded Hosts */}
      <div>
        <label className="block text-sm font-medium mb-2">Excluded Hosts</label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHost()}
            placeholder="e.g., update.googleapis.com"
            className="input flex-1 text-sm"
          />
          <button onClick={addHost} className="btn btn-primary btn-sm">
            Add
          </button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {filters.excludedHosts.map((host, index) => (
            <div key={index} className="flex items-center justify-between bg-dark-800 px-3 py-2 rounded text-sm">
              <span className="text-dark-200">{host}</span>
              <button
                onClick={() => removeHost(host)}
                className="text-red-400 hover:text-red-300"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {filters.excludedHosts.length === 0 && (
            <p className="text-xs text-dark-500 italic">No excluded hosts</p>
          )}
        </div>
      </div>

      {/* Excluded URLs */}
      <div>
        <label className="block text-sm font-medium mb-2">Excluded URLs</label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addUrl()}
            placeholder="e.g., https://example.com/api/"
            className="input flex-1 text-sm"
          />
          <button onClick={addUrl} className="btn btn-primary btn-sm">
            Add
          </button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {filters.excludedUrls.map((url, index) => (
            <div key={index} className="flex items-center justify-between bg-dark-800 px-3 py-2 rounded text-sm">
              <span className="text-dark-200 truncate">{url}</span>
              <button
                onClick={() => removeUrl(url)}
                className="text-red-400 hover:text-red-300 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {filters.excludedUrls.length === 0 && (
            <p className="text-xs text-dark-500 italic">No excluded URLs</p>
          )}
        </div>
      </div>

      {/* Clear All */}
      {(filters.excludedHosts.length > 0 || filters.excludedUrls.length > 0) && (
        <button onClick={clearAll} className="btn btn-danger btn-sm">
          Clear All Filters
        </button>
      )}
    </div>
  );
}

function ProxySettingsTab() {
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
      } else if (result.canceled) {
      } else {
        console.error('Failed to export CA:', result.error);
        toast.error('Failed to export CA certificate: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to export CA:', error);
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
      alert('Failed to open browser. Make sure Chromium is installed.');
    }
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

            {/* Capture Settings */}
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

            {/* Timeout Settings */}
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

            {/* Intercept Filters */}
            <div>
              <h4 className="font-semibold mb-3">Intercept Filters</h4>
              <InterceptFiltersSection />
            </div>

            {/* Actions - Sticky */}
            <div className="sticky bottom-0 bg-dark-900 flex items-center space-x-3 pt-4 pb-2 border-t border-dark-700 mt-4">
              <button 
                onClick={async () => {
                  try {
                    await window.electronAPI.proxy.updateSettings(settings);
                    toast.success('Settings saved successfully');
                  } catch (error) {
                    toast.error('Failed to save settings');
                  }
                }}
                className="btn btn-primary"
              >
                Save Settings
              </button>
              <button 
                onClick={() => {
                  setSettings({
                    port: 8080,
                    host: '127.0.0.1',
                    interceptEnabled: false,
                    maxHistorySize: 1000,
                    autoScroll: true,
                  });
                  toast.info('Settings reset to defaults');
                }}
                className="btn btn-secondary"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebSocketsTab() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Fetch WebSocket history
    const fetchHistory = async () => {
      try {
        const history = await window.electronAPI.websocket.getHistory();
        setConnections(history);
      } catch (error) {
        console.error('Failed to fetch WebSocket history:', error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch messages for selected connection
    const fetchMessages = async () => {
      if (selectedConnection) {
        try {
          const msgs = await window.electronAPI.websocket.getMessages(selectedConnection.id);
          setMessages(msgs);
        } catch (error) {
          console.error('Failed to fetch WebSocket messages:', error);
        }
      }
    };

    fetchMessages();
    if (selectedConnection) {
      const interval = setInterval(fetchMessages, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedConnection]);

  return (
    <div className="h-full flex">
      {/* Connections List */}
      <div className="w-1/3 border-r border-dark-800 flex flex-col">
        <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold">WebSocket Connections</h3>
          <button
            onClick={async () => {
              if (confirm('Clear all WebSocket history?')) {
                await window.electronAPI.websocket.clear();
                setConnections([]);
                setSelectedConnection(null);
                setMessages([]);
              }
            }}
            className="btn btn-danger btn-sm"
            title="Clear all"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {connections.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              No WebSocket connections captured yet
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnection(conn)}
                  className={`p-4 hover:bg-dark-900 cursor-pointer ${
                    selectedConnection?.id === conn.id ? 'bg-dark-900 border-l-2 border-l-primary-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      conn.status === 'connected' ? 'bg-green-900/30 text-green-400' :
                      conn.status === 'disconnected' ? 'bg-red-900/30 text-red-400' :
                      'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {conn.status}
                    </span>
                    <span className="text-xs text-dark-500">
                      {new Date(conn.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm font-mono truncate">{conn.url}</div>
                  <div className="text-xs text-dark-500 mt-1">{conn.host}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selectedConnection ? (
          <>
            <div className="bg-dark-900 border-b border-dark-800 px-6 py-4">
              <h3 className="font-semibold">{selectedConnection.url}</h3>
              <p className="text-sm text-dark-400 mt-1">
                {messages.length} messages
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`card ${
                    msg.direction === 'outgoing' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        msg.direction === 'outgoing' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                      }`}>
                        {msg.direction === 'outgoing' ? '→ Outgoing' : '← Incoming'}
                      </span>
                      <span className="text-xs text-dark-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="bg-dark-950 rounded p-3 font-mono text-xs whitespace-pre-wrap break-all">
                      {msg.data}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-dark-500">
            Select a connection to view messages
          </div>
        )}
      </div>
    </div>
  );
}
