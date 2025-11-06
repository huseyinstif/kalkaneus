import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Send, Edit2, Save, FolderOpen, Search, ChevronLeft, ChevronRight, Terminal } from 'lucide-react';
import MonacoHttpEditor from '../common/MonacoHttpEditor';
import CopyAsModal from '../modals/CopyAsModal';

// Global handler reference to avoid multiple listeners
let globalRepeaterHandler = null;

// Request Templates
const REQUEST_TEMPLATES = {
  'GET Request': {
    method: 'GET',
    url: 'https://example.com/api/endpoint',
    headers: {
      'User-Agent': 'Kalkaneus/1.0',
      'Accept': 'application/json',
    },
    body: '',
  },
  'POST JSON': {
    method: 'POST',
    url: 'https://example.com/api/endpoint',
    headers: {
      'User-Agent': 'Kalkaneus/1.0',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: '{\n  "key": "value"\n}',
  },
  'POST Form': {
    method: 'POST',
    url: 'https://example.com/api/endpoint',
    headers: {
      'User-Agent': 'Kalkaneus/1.0',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'param1=value1&param2=value2',
  },
  'GraphQL Query': {
    method: 'POST',
    url: 'https://example.com/graphql',
    headers: {
      'User-Agent': 'Kalkaneus/1.0',
      'Content-Type': 'application/json',
    },
    body: '{\n  "query": "{ users { id name } }"\n}',
  },
};

export default function RepeaterPanel() {
  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('repeater-tabs');
      if (saved) {
        const data = JSON.parse(saved);
        return data;
      }
    } catch (e) {
      console.error('Failed to load repeater tabs:', e);
    }
    return null;
  };

  const savedData = loadFromStorage();
  
  const [tabs, setTabs] = useState(savedData?.tabs || [
    {
      id: 1,
      name: 'Request 1',
      color: null,
      request: {
        method: 'GET',
        url: 'https://example.com/api/test',
        headers: {
          'User-Agent': 'Kalkaneus/1.0',
          'Content-Type': 'application/json',
        },
        body: '',
      },
      response: null,
      history: [],
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(savedData?.activeTabId || 1);
  const [nextTabId, setNextTabId] = useState(savedData?.nextTabId || 2);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [responseViewMode, setResponseViewMode] = useState('pretty'); // pretty, raw, hex, render
  
  // Search states
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [responseSearchTerm, setResponseSearchTerm] = useState('');
  const [requestHighlights, setRequestHighlights] = useState(0);
  const [responseHighlights, setResponseHighlights] = useState(0);
  const [requestCurrentMatch, setRequestCurrentMatch] = useState(0);
  const [responseCurrentMatch, setResponseCurrentMatch] = useState(0);
  const [copyAsModal, setCopyAsModal] = useState(null);

  // Search handlers
  const handleRequestSearch = (term) => {
    setRequestSearchTerm(term);
    setRequestCurrentMatch(0);
    if (!term) {
      setRequestHighlights(0);
      return;
    }
    
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    
    // Count occurrences in request
    const requestText = `${activeTab.request.method} ${activeTab.request.url}\n${activeTab.request.headers}\n${activeTab.request.body}`;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = requestText.match(regex);
    setRequestHighlights(matches ? matches.length : 0);
  };

  const handleResponseSearch = (term) => {
    setResponseSearchTerm(term);
    setResponseCurrentMatch(0);
    if (!term) {
      setResponseHighlights(0);
      return;
    }
    
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab?.response) return;
    
    // Count occurrences in response
    const responseText = `${activeTab.response.statusCode} ${activeTab.response.statusMessage}\n${formatHeaders(activeTab.response.headers || {})}\n${activeTab.response.body}`;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = responseText.match(regex);
    setResponseHighlights(matches ? matches.length : 0);
  };

  // Navigation handlers
  const handleRequestPrevMatch = () => {
    if (requestHighlights === 0) return;
    setRequestCurrentMatch((prev) => (prev - 1 + requestHighlights) % requestHighlights);
  };

  const handleRequestNextMatch = () => {
    if (requestHighlights === 0) return;
    setRequestCurrentMatch((prev) => (prev + 1) % requestHighlights);
  };

  const handleResponsePrevMatch = () => {
    if (responseHighlights === 0) return;
    setResponseCurrentMatch((prev) => (prev - 1 + responseHighlights) % responseHighlights);
  };

  const handleResponseNextMatch = () => {
    if (responseHighlights === 0) return;
    setResponseCurrentMatch((prev) => (prev + 1) % responseHighlights);
  };

  // Save to localStorage and project whenever tabs change
  useEffect(() => {
    try {
      const data = {
        tabs,
        activeTabId,
        nextTabId,
      };
      localStorage.setItem('repeater-tabs', JSON.stringify(data));
      
      // Also save to project
      if (window.electronAPI?.project) {
        window.electronAPI.project.updateRepeaterTabs(data);
      }
    } catch (e) {
      console.error('Failed to save repeater tabs:', e);
    }
  }, [tabs, activeTabId, nextTabId]);

  // Listen for project cleared event
  useEffect(() => {
    const handleProjectCleared = () => {
      setTabs([]);
      setActiveTabId(null);
      setNextTabId(1);
      localStorage.removeItem('repeater-tabs');
    };

    window.addEventListener('project:cleared', handleProjectCleared);
    return () => window.removeEventListener('project:cleared', handleProjectCleared);
  }, []);

  // Listen for project loaded event to restore tabs
  useEffect(() => {
    const handleProjectLoaded = async () => {
      try {
        const info = await window.electronAPI.project.info();
        if (info?.currentProject?.data?.repeaterTabs) {
          const { tabs: loadedTabs, activeTabId: loadedActiveId, nextTabId: loadedNextId } = info.currentProject.data.repeaterTabs;
          if (loadedTabs && loadedTabs.length > 0) {
            setTabs(loadedTabs);
            setActiveTabId(loadedActiveId);
            setNextTabId(loadedNextId);
          }
        }
      } catch (error) {
        console.error('Failed to restore repeater tabs:', error);
      }
    };

    window.addEventListener('project:loaded', handleProjectLoaded);
    return () => window.removeEventListener('project:loaded', handleProjectLoaded);
  }, []);

  // Listen for "repeaterMounted" event (dispatched after view switch)
  useEffect(() => {
    const handleRepeaterMounted = (event) => {
      const request = event.detail;
      setTabs((prevTabs) => {
        const newId = prevTabs.length > 0 ? Math.max(...prevTabs.map(t => t.id)) + 1 : 1;
        const newTab = {
          id: newId,
          name: `Request ${newId}`,
          color: null,
          request: {
            method: request.method || 'GET',
            url: request.url || '',
            headers: request.headers || {},
            body: request.body || '',
          },
          response: null,
          history: [],
        };
        setActiveTabId(newId);
        setNextTabId(newId + 1);
        return [...prevTabs, newTab];
      });
    };

    // Remove old global handler if exists
    if (globalRepeaterHandler) {
      window.removeEventListener('repeaterMounted', globalRepeaterHandler);
    }
    
    // Store and add new handler
    globalRepeaterHandler = handleRepeaterMounted;
    window.addEventListener('repeaterMounted', globalRepeaterHandler);
    window.addEventListener('sendToRepeater', globalRepeaterHandler);
    
    // Cleanup: remove listener when component unmounts
    return () => {
      if (globalRepeaterHandler) {
        window.removeEventListener('repeaterMounted', globalRepeaterHandler);
        window.removeEventListener('sendToRepeater', globalRepeaterHandler);
        globalRepeaterHandler = null;
      }
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const addTab = () => {
    const newTab = {
      id: nextTabId,
      name: `Request ${nextTabId}`,
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
    setTabs([...tabs, newTab]);
    setActiveTabId(nextTabId);
    setNextTabId(nextTabId + 1);
  };

  const renameTab = (tabId, newName) => {
    setTabs(tabs.map(t => t.id === tabId ? { ...t, name: newName } : t));
    setEditingTabId(null);
  };

  const setTabColor = (tabId, color) => {
    setTabs(tabs.map(t => t.id === tabId ? { ...t, color } : t));
  };

  // Drag & Drop handlers
  const handleDragStart = (e, tabId) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetTabId) => {
    e.preventDefault();
    if (draggedTabId === null || draggedTabId === targetTabId) return;

    const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, draggedTab);
    
    setTabs(newTabs);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
  };

  const startEditingTab = (tab) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const closeTab = (tabId) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const handleTabContextMenu = (e, tab) => {
    e.preventDefault();
    setTabContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab,
    });
  };

  const tabColors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'None', value: null },
  ];

  const updateRequest = (field, value) => {
    setTabs(
      tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, request: { ...t.request, [field]: value } }
          : t
      )
    );
  };

  const loadFromHistory = (historyItem) => {
    setTabs(
      tabs.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              request: {
                method: historyItem.request.method,
                url: historyItem.request.url,
                headers: historyItem.request.headers,
                body: historyItem.request.body,
              },
              response: historyItem,
            }
          : t
      )
    );
  };

  const loadTemplate = (templateName) => {
    const template = REQUEST_TEMPLATES[templateName];
    if (template) {
      setTabs(
        tabs.map((t) =>
          t.id === activeTabId
            ? { ...t, request: { ...template } }
            : t
        )
      );
    }
  };

  const sendRequest = async () => {
    if (!activeTab) return;

    try {
      const response = await window.electronAPI.repeater.send(activeTab.request);
      
      // Create history item with request and response
      const historyItem = {
        request: { ...activeTab.request },
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
        duration: response.duration,
        timestamp: Date.now(),
      };
      
      setTabs(
        tabs.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                response,
                history: [historyItem, ...t.history.slice(0, 9)],
              }
            : t
        )
      );
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const formatHeaders = (headers) => {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  const parseHeaders = (text) => {
    const headers = {};
    text.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    });
    return headers;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="bg-dark-900 border-b border-dark-800 flex items-center">
        <div className="flex-1 flex overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center space-x-2 px-4 py-2 border-r border-dark-800 cursor-move relative ${
                activeTabId === tab.id ? 'bg-dark-800 text-primary-400' : 'text-dark-400 hover:bg-dark-850'
              } ${draggedTabId === tab.id ? 'opacity-50' : ''}`}
              style={tab.color ? { borderTop: `3px solid ${tab.color}` } : {}}
              onClick={() => setActiveTabId(tab.id)}
              onDoubleClick={() => startEditingTab(tab)}
              onContextMenu={(e) => handleTabContextMenu(e, tab)}
            >
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => renameTab(tab.id, editingTabName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renameTab(tab.id, editingTabName);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="input input-sm w-32 text-sm"
                  autoFocus
                />
              ) : (
                <span className="text-sm font-medium">{tab.name}</span>
              )}
              
              {/* Color Picker - Shows on hover */}
              <div className="hidden group-hover:flex items-center space-x-1">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', null].map((color, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTabColor(tab.id, color);
                    }}
                    className="w-3 h-3 rounded-full border border-dark-600 hover:scale-125 transition-transform"
                    style={{ backgroundColor: color || '#1e293b' }}
                    title={color ? 'Set color' : 'Remove color'}
                  />
                ))}
              </div>

              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="hover:text-red-400 ml-2"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addTab}
          className="px-4 py-2 hover:bg-dark-800 text-dark-400 hover:text-dark-200"
          title="New tab"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Content */}
      {activeTab && (
        <div className="flex-1 flex overflow-hidden">
          {/* Request Panel */}
          <div className={`${showHistory ? 'w-1/3' : 'w-1/2'} border-r border-dark-800 flex flex-col transition-all`}>
            <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">Request</h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    showHistory 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-dark-800 hover:bg-dark-700 text-dark-300'
                  }`}
                >
                  History ({activeTab.history.length})
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={sendRequest}
                  className="btn btn-primary btn-sm flex items-center space-x-2"
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
                <button
                  onClick={() => setCopyAsModal(activeTab.request)}
                  className="btn btn-secondary btn-sm flex items-center space-x-2"
                  title="Copy as cURL, Python, SQLMap..."
                >
                  <Terminal size={14} />
                  <span>Copy as...</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 border-b border-dark-800">
              {/* Template Selector */}
              <div className="flex items-center space-x-2">
                <FolderOpen size={16} className="text-dark-500" />
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      loadTemplate(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="input input-sm flex-1"
                  defaultValue=""
                >
                  <option value="">Load Template...</option>
                  {Object.keys(REQUEST_TEMPLATES).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2">
                <select
                  value={activeTab.request.method}
                  onChange={(e) => updateRequest('method', e.target.value)}
                  className="input w-32"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="OPTIONS">OPTIONS</option>
                  <option value="HEAD">HEAD</option>
                </select>
                <input
                  type="text"
                  value={activeTab.request.url}
                  onChange={(e) => updateRequest('url', e.target.value)}
                  className="input flex-1"
                  placeholder="https://example.com/api/endpoint"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-dark-900 border-b border-dark-800 px-4 py-2">
                <span className="text-sm font-medium">Headers</span>
              </div>
              <div className="flex-1 p-2">
                <div className="w-full h-full bg-dark-950 border border-dark-700 rounded">
                  <MonacoHttpEditor
                    value={typeof activeTab.request.headers === 'string' ? activeTab.request.headers : formatHeaders(activeTab.request.headers)}
                    onChange={(value) => updateRequest('headers', value)}
                    language="http"
                    type="headers"
                    height="100%"
                    searchTerm={requestSearchTerm}
                    currentMatch={requestCurrentMatch}
                  />
                </div>
              </div>

              <div className="bg-dark-900 border-t border-dark-800 px-4 py-2">
                <span className="text-sm font-medium">Body</span>
              </div>
              <div className="flex-1 p-2">
                <div className="w-full h-full bg-dark-950 border border-dark-700 rounded">
                  <MonacoHttpEditor
                    value={activeTab.request.body}
                    onChange={(value) => updateRequest('body', value)}
                    language="http"
                    type="body"
                    height="100%"
                    searchTerm={requestSearchTerm}
                    currentMatch={requestCurrentMatch}
                  />
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="bg-dark-900 border-t border-dark-800 px-3 py-2 flex items-center space-x-2">
                <Search size={14} className="text-dark-500" />
                <input
                  type="text"
                  placeholder="Search in request..."
                  value={requestSearchTerm}
                  onChange={(e) => handleRequestSearch(e.target.value)}
                  className="flex-1 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-600"
                />
                {requestHighlights > 0 && (
                  <>
                    <button
                      onClick={handleRequestPrevMatch}
                      className="p-1 hover:bg-dark-800 rounded"
                      title="Previous match"
                    >
                      <ChevronLeft size={14} className="text-dark-400" />
                    </button>
                    <button
                      onClick={handleRequestNextMatch}
                      className="p-1 hover:bg-dark-800 rounded"
                      title="Next match"
                    >
                      <ChevronRight size={14} className="text-dark-400" />
                    </button>
                  </>
                )}
                <span className="text-xs text-dark-500">
                  {requestHighlights > 0 ? `${requestCurrentMatch + 1}/${requestHighlights}` : '0 highlights'}
                </span>
              </div>
            </div>
          </div>

          {/* History Sidebar */}
          {showHistory && (
            <div className="w-1/6 border-r border-dark-800 flex flex-col">
              <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
                <h3 className="font-semibold text-sm">Request History</h3>
              </div>
              <div className="flex-1 overflow-auto">
                {activeTab.history.length === 0 ? (
                  <div className="p-4 text-center text-dark-500 text-sm">
                    No history yet
                  </div>
                ) : (
                  <div className="divide-y divide-dark-800">
                    {activeTab.history.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => loadFromHistory(item)}
                        className="p-3 hover:bg-dark-850 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              item.statusCode < 300
                                ? 'bg-green-900/30 text-green-400'
                                : item.statusCode < 400
                                ? 'bg-blue-900/30 text-blue-400'
                                : item.statusCode < 500
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : 'bg-red-900/30 text-red-400'
                            }`}
                          >
                            {item.statusCode}
                          </span>
                          <span className="text-xs text-dark-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs text-dark-400 truncate">
                          {item.request?.method || 'GET'} {item.request?.url ? new URL(item.request.url).pathname : '/'}
                        </div>
                        <div className="text-xs text-dark-500 mt-1">
                          {item.body?.length || 0} bytes • {item.duration}ms
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Response Panel */}
          <div className={`${showHistory ? 'w-1/2' : 'w-1/2'} flex flex-col`}>
            <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold">Response</h3>
              {activeTab.response && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setResponseViewMode('pretty')}
                    className={`px-3 py-1 text-xs rounded ${
                      responseViewMode === 'pretty'
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    Pretty
                  </button>
                  <button
                    onClick={() => setResponseViewMode('raw')}
                    className={`px-3 py-1 text-xs rounded ${
                      responseViewMode === 'raw'
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => setResponseViewMode('hex')}
                    className={`px-3 py-1 text-xs rounded ${
                      responseViewMode === 'hex'
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    Hex
                  </button>
                  <button
                    onClick={() => setResponseViewMode('render')}
                    className={`px-3 py-1 text-xs rounded ${
                      responseViewMode === 'render'
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    Render
                  </button>
                </div>
              )}
            </div>

            {activeTab.response ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`badge ${
                        activeTab.response.statusCode < 300
                          ? 'badge-success'
                          : activeTab.response.statusCode < 400
                          ? 'badge-info'
                          : activeTab.response.statusCode < 500
                          ? 'badge-warning'
                          : 'badge-error'
                      }`}
                    >
                      {activeTab.response.statusCode}
                    </span>
                    <span className="text-sm text-dark-400">
                      {activeTab.response.statusMessage}
                    </span>
                    <span className="text-xs text-dark-500">
                      • {activeTab.response.body?.length || 0} bytes
                    </span>
                    {activeTab.response.duration && (
                      <span className="text-xs text-dark-500">
                        • {activeTab.response.duration}ms
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  {responseViewMode === 'pretty' && (
                    <MonacoHttpEditor
                      value={`HTTP/1.1 ${activeTab.response.statusCode} ${activeTab.response.statusMessage}\n${formatHeaders(activeTab.response.headers || {})}\n\n${activeTab.response.body || ''}`}
                      readOnly={true}
                      language="http"
                      type="response"
                      height="100%"
                      searchTerm={responseSearchTerm}
                      currentMatch={responseCurrentMatch}
                    />
                  )}
                  
                  {responseViewMode === 'raw' && (
                    <div className="h-full overflow-auto bg-dark-950 p-4">
                      <pre className="text-xs text-dark-300 font-mono whitespace-pre-wrap">
                        {`HTTP/1.1 ${activeTab.response.statusCode} ${activeTab.response.statusMessage}\n${formatHeaders(activeTab.response.headers || {})}\n\n${activeTab.response.body || ''}`}
                      </pre>
                    </div>
                  )}
                  
                  {responseViewMode === 'hex' && (
                    <div className="h-full overflow-auto bg-dark-950 p-4">
                      <div className="font-mono text-xs">
                        {(() => {
                          const body = activeTab.response.body || '';
                          const lines = [];
                          for (let i = 0; i < body.length; i += 16) {
                            const chunk = body.slice(i, i + 16);
                            const offset = i.toString(16).padStart(8, '0');
                            const hexBytes = [];
                            const asciiChars = [];
                            
                            for (let j = 0; j < 16; j++) {
                              if (j < chunk.length) {
                                const byte = chunk.charCodeAt(j);
                                hexBytes.push(byte.toString(16).padStart(2, '0'));
                                asciiChars.push(byte >= 32 && byte <= 126 ? chunk[j] : '.');
                              } else {
                                hexBytes.push('  ');
                                asciiChars.push(' ');
                              }
                            }
                            
                            lines.push(
                              <div key={i} className="flex space-x-4">
                                <span className="text-blue-400">{offset}</span>
                                <span className="text-green-400">
                                  {hexBytes.slice(0, 8).join(' ')}
                                </span>
                                <span className="text-green-400">
                                  {hexBytes.slice(8, 16).join(' ')}
                                </span>
                                <span className="text-dark-500">|</span>
                                <span className="text-yellow-400">
                                  {asciiChars.join('')}
                                </span>
                                <span className="text-dark-500">|</span>
                              </div>
                            );
                          }
                          return lines;
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {responseViewMode === 'render' && (
                    <div className="h-full overflow-auto bg-white">
                      <iframe
                        srcDoc={activeTab.response.body || ''}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                        title="Response Preview"
                      />
                    </div>
                  )}
                </div>
                
                {/* Search Bar */}
                <div className="bg-dark-900 border-t border-dark-800 px-3 py-2 flex items-center space-x-2">
                  <Search size={14} className="text-dark-500" />
                  <input
                    type="text"
                    placeholder="Search in response..."
                    value={responseSearchTerm}
                    onChange={(e) => handleResponseSearch(e.target.value)}
                    className="flex-1 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-600"
                  />
                  {responseHighlights > 0 && (
                    <>
                      <button
                        onClick={handleResponsePrevMatch}
                        className="p-1 hover:bg-dark-800 rounded"
                        title="Previous match"
                      >
                        <ChevronLeft size={14} className="text-dark-400" />
                      </button>
                      <button
                        onClick={handleResponseNextMatch}
                        className="p-1 hover:bg-dark-800 rounded"
                        title="Next match"
                      >
                        <ChevronRight size={14} className="text-dark-400" />
                      </button>
                    </>
                  )}
                  <span className="text-xs text-dark-500">
                    {responseHighlights > 0 ? `${responseCurrentMatch + 1}/${responseHighlights}` : '0 highlights'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-dark-500">
                Send a request to see the response here
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Context Menu */}
      {tabContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setTabContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-dark-800 border border-dark-700 rounded-lg shadow-xl py-2 min-w-[200px]"
            style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
          >
            <button
              onClick={() => {
                startEditingTab(tabContextMenu.tab);
                setTabContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200"
            >
              Rename
            </button>
            
            <div className="border-t border-dark-700 my-1" />
            
            <div className="px-4 py-2 text-xs text-dark-500 font-semibold">
              Set Color
            </div>
            
            {tabColors.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  setTabColor(tabContextMenu.tab.id, color.value);
                  setTabContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200 flex items-center space-x-2"
              >
                {color.value ? (
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color.value }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded border border-dark-600" />
                )}
                <span>{color.name}</span>
              </button>
            ))}
            
            <div className="border-t border-dark-700 my-1" />
            
            <button
              onClick={() => {
                closeTab(tabContextMenu.tab.id);
                setTabContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-red-400"
              disabled={tabs.length === 1}
            >
              Close Tab
            </button>
          </div>
        </>
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
