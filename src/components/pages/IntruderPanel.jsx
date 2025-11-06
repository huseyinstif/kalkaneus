import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Plus, Trash2, Upload, Download, Search, Square } from 'lucide-react';
import MonacoHttpEditor from '../common/MonacoHttpEditor';
import { toast } from '../common/Toast';
import IntruderPayloadsTab from './IntruderPayloadsTab';

export default function IntruderPanel() {
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [highlights, setHighlights] = useState(0);
  
  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('intruder-tabs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load intruder tabs:', e);
    }
    return null;
  };

  const savedData = loadFromStorage();

  // Multi-tab state
  const [tabs, setTabs] = useState(savedData?.tabs || [
    {
      id: 1,
      name: 'Attack 1',
      activeTab: 'positions',
      color: null, // Tab color
      request: {
        method: 'GET',
        url: 'https://example.com/api/test',
        headers: 'User-Agent: Kalkaneus/1.0\nContent-Type: application/json',
        body: '',
      },
      positions: [],
      payloadSets: [{ id: 1, type: 'simple', items: [] }],
      attackType: 'sniper',
      results: [],
      options: {
        threads: 10,
        delay: 0,
        redirects: 'never'
      }
    }
  ]);
  const [activeTabId, setActiveTabId] = useState(savedData?.activeTabId || 1);
  const [nextTabId, setNextTabId] = useState(savedData?.nextTabId || 2);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [draggedTabId, setDraggedTabId] = useState(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [attackProgress, setAttackProgress] = useState({ current: 0, total: 0, percentage: 0 });
  
  const bodyRef = useRef(null);
  const headersRef = useRef(null);
  const headersTextareaRef = useRef(null);
  const bodyTextareaRef = useRef(null);

  // Get active tab
  const currentTab = tabs.find(t => t.id === activeTabId);
  
  // Backward compatibility - map to old variable names
  const request = currentTab?.request || {};
  const setRequest = (newRequestOrFn) => {
    setTabs(prevTabs => {
      return prevTabs.map(tab => {
        if (tab.id === activeTabId) {
          const newRequest = typeof newRequestOrFn === 'function'
            ? newRequestOrFn(tab.request || {})
            : newRequestOrFn;
          return { ...tab, request: newRequest };
        }
        return tab;
      });
    });
  };
  const positions = currentTab?.positions || [];
  const setPositions = (newPositions) => updateActiveTab({ positions: newPositions });
  const payloadSets = currentTab?.payloadSets || [];
  const setPayloadSets = (newPayloadSets) => updateActiveTab({ payloadSets: newPayloadSets });
  const attackType = currentTab?.attackType || 'sniper';
  const setAttackType = (newAttackType) => updateActiveTab({ attackType: newAttackType });
  const results = currentTab?.results || [];
  const setResults = (newResultsOrFn) => {
    // Support both direct value and callback function
    setTabs(prevTabs => {
      return prevTabs.map(tab => {
        if (tab.id === activeTabId) {
          const newResults = typeof newResultsOrFn === 'function' 
            ? newResultsOrFn(tab.results || [])
            : newResultsOrFn;
          return { ...tab, results: newResults };
        }
        return tab;
      });
    });
  };
  const activeTab = currentTab?.activeTab || 'positions';
  const setActiveTab = (newActiveTab) => updateActiveTab({ activeTab: newActiveTab });
  const options = currentTab?.options || { threads: 10, delay: 0, redirects: 'never' };
  const setOptions = (newOptions) => updateActiveTab({ options: newOptions });

  // Save to localStorage and project whenever tabs change
  useEffect(() => {
    try {
      const data = {
        tabs,
        activeTabId,
        nextTabId,
      };
      localStorage.setItem('intruder-tabs', JSON.stringify(data));
      
      // Also save to project
      if (window.electronAPI?.project) {
        window.electronAPI.project.updateIntruderTabs(data);
      }
    } catch (e) {
      console.error('Failed to save intruder tabs:', e);
    }
  }, [tabs, activeTabId, nextTabId]);

  // Listen for project cleared event
  useEffect(() => {
    const handleProjectCleared = () => {
      setTabs([{
        id: 1,
        name: 'Attack 1',
        activeTab: 'positions',
        color: null,
        request: {
          method: 'GET',
          url: 'https://example.com/api/test',
          headers: 'User-Agent: Kalkaneus/1.0\nContent-Type: application/json',
          body: '',
        },
        positions: [],
        payloadSets: [{ id: 1, type: 'simple', items: [] }],
        attackType: 'sniper',
        results: [],
      }]);
      setActiveTabId(1);
      setNextTabId(2);
      localStorage.removeItem('intruder-tabs');
    };

    window.addEventListener('project:cleared', handleProjectCleared);
    return () => window.removeEventListener('project:cleared', handleProjectCleared);
  }, []);

  // Listen for project loaded event to restore tabs
  useEffect(() => {
    const handleProjectLoaded = async () => {
      try {
        const info = await window.electronAPI.project.info();
        if (info?.currentProject?.data?.intruderTabs) {
          const { tabs: loadedTabs, activeTabId: loadedActiveId, nextTabId: loadedNextId } = info.currentProject.data.intruderTabs;
          if (loadedTabs && loadedTabs.length > 0) {
            setTabs(loadedTabs);
            setActiveTabId(loadedActiveId);
            setNextTabId(loadedNextId);
          }
        }
      } catch (error) {
        console.error('Failed to restore intruder tabs:', error);
      }
    };

    window.addEventListener('project:loaded', handleProjectLoaded);
    return () => window.removeEventListener('project:loaded', handleProjectLoaded);
  }, []);

  // Helper: Update active tab
  const updateActiveTab = (updates) => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      );
      return newTabs;
    });
  };

  // Add new tab
  const addTab = () => {
    const newTab = {
      id: nextTabId,
      name: `Attack ${nextTabId}`,
      activeTab: 'positions',
      color: null,
      request: {
        method: 'GET',
        url: 'https://example.com/api/test',
        headers: 'User-Agent: Kalkaneus/1.0\nContent-Type: application/json',
        body: '',
      },
      positions: [],
      payloadSets: [{ id: 1, type: 'simple', items: [] }],
      attackType: 'sniper',
      results: [],
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setNextTabId(nextTabId + 1);
  };

  // Close tab
  const closeTab = (tabId) => {
    if (tabs.length === 1) return; // Keep at least one tab
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  // Rename tab
  const renameTab = (tabId, newName) => {
    setTabs(tabs.map(tab =>
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  // Set tab color
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

  // Listen for sendToIntruder event
  useEffect(() => {
    const handleSendToIntruder = (event) => {
      const req = event.detail;
      if (req) {
        // Create new tab with the request using functional updates
        setNextTabId(prevId => {
          const newId = prevId;
          const newTab = {
            id: newId,
            name: `Attack ${newId}`,
            activeTab: 'positions',
            request: {
              method: req.method || 'GET',
              url: req.url || '',
              headers: Object.entries(req.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
              body: req.body || '',
            },
            positions: [],
            payloadSets: [{ id: 1, type: 'simple', items: [] }],
            attackType: 'sniper',
            results: [],
          };
          
          setTabs(prevTabs => [...prevTabs, newTab]);
          setActiveTabId(newId);
          
          return prevId + 1;
        });
      }
    };

    window.addEventListener('sendToIntruder', handleSendToIntruder);
    return () => {
      window.removeEventListener('sendToIntruder', handleSendToIntruder);
    };
  }, []);

  // Add position from text selection (Monaco Editor)
  const handleAddPosition = () => {
    let selection = null;
    let field = '';
    let currentValue = '';
    
    // Check which editor has selection
    if (headersTextareaRef.current) {
      const sel = headersTextareaRef.current.getSelection();
      if (sel && sel.selectedText) {
        selection = sel;
        field = 'headers';
        currentValue = request.headers;
      }
    }
    
    if (!selection && bodyTextareaRef.current) {
      const sel = bodyTextareaRef.current.getSelection();
      if (sel && sel.selectedText) {
        selection = sel;
        field = 'body';
        currentValue = request.body;
      }
    }
    
    if (!selection || !selection.selectedText) {
      toast.warning('Please select text in Headers or Body field first');
      return;
    }

    const start = selection.startOffset;
    const end = selection.endOffset;
    const selectedText = selection.selectedText;
    const positionNumber = positions.length + 1;
    
    // Replace selected text with #marker# (single # markers)
    const newValue = 
      currentValue.substring(0, start) +
      `#${selectedText}#` +
      currentValue.substring(end);
    
    setRequest({ ...request, [field]: newValue });
    setPositions([...positions, {
      id: Date.now(),
      field,
      value: selectedText,
      start,
      end: end + 2,
    }]);
  };

  // Remove single position
  const handleRemovePosition = (posId) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;

    // Remove #markers# from the field
    const fieldValue = request[pos.field];
    const markerRegex = new RegExp(`#${pos.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#`, 'g');
    const cleanValue = fieldValue.replace(markerRegex, pos.value);
    
    setRequest({ ...request, [pos.field]: cleanValue });
    setPositions(positions.filter(p => p.id !== posId));
  };

  // Clear all positions
  const handleClearPositions = () => {
    const cleanHeaders = request.headers.replace(/#/g, '');
    const cleanBody = request.body.replace(/#/g, '');
    setRequest({ ...request, headers: cleanHeaders, body: cleanBody });
    setPositions([]);
  };

  // Start attack
  const handleStartAttack = async () => {
    
    if (positions.length === 0) {
      toast.warning('Please add at least one position');
      return;
    }
    if (payloadSets[0].items.length === 0) {
      toast.warning('Please add payloads');
      return;
    }

    setIsRunning(true);
    setResults([]);
    setActiveTab('results');

    // Real HTTP attack - filter empty payloads
    const payloads = payloadSets[0].items.filter(p => p && p.trim());
    
    // Calculate total requests
    const totalRequests = attackType === 'sniper' 
      ? positions.length * payloads.length 
      : payloads.length;
    
    setAttackProgress({ current: 0, total: totalRequests, percentage: 0 });
    
    if (payloads.length === 0) {
      toast.warning('All payloads are empty. Please add valid payloads.');
      setIsRunning(false);
      return;
    }
    
    
    // Sniper mode: test each position separately with each payload
    if (attackType === 'sniper') {
      let requestNum = 0;
      for (let posIndex = 0; posIndex < positions.length; posIndex++) {
        const position = positions[posIndex];
        
        for (let payloadIndex = 0; payloadIndex < payloads.length; payloadIndex++) {
          requestNum++;
          const payload = payloads[payloadIndex];
          const startTime = Date.now();
          
          // Apply delay between requests
          if (options.delay > 0 && requestNum > 1) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
          }
          
          try {
            // Build request - only replace the current position
            let urlWithPayload = request.url;
            let headersWithPayload = request.headers;
            let bodyWithPayload = request.body;
            
            // Sniper: Replace ONLY the current position with payload, remove ALL other markers
            let globalMarkerIndex = 0;
            const replaceMarkers = (text) => {
              if (!text) return text;
              return text.replace(/#([^#]+)#/g, (match, originalValue) => {
                const thisMarkerIndex = globalMarkerIndex++;
                // If this is the position we're testing, use payload
                // Otherwise, use the original value WITHOUT markers
                return thisMarkerIndex === posIndex ? payload : originalValue;
              });
            };
            
            // Apply to all fields (markers are counted globally across url, headers, body)
            globalMarkerIndex = 0;
            urlWithPayload = replaceMarkers(urlWithPayload);
            headersWithPayload = replaceMarkers(headersWithPayload);
            bodyWithPayload = replaceMarkers(bodyWithPayload);
            
        
        // Parse headers
        const headersObj = {};
        headersWithPayload.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const headerName = key.trim().toLowerCase();
            // Skip content-length, let the backend calculate it
            if (headerName !== 'content-length') {
              headersObj[key.trim()] = valueParts.join(':').trim();
            }
          }
        });
        
        const result = await window.electronAPI.repeater.send({
          method: request.method,
          url: urlWithPayload,
          headers: headersObj,
          body: bodyWithPayload,
        });
        
        
        const responseTime = Date.now() - startTime;
        
        // Build full request string
        const fullRequest = `${request.method} ${urlWithPayload} HTTP/1.1\n${headersWithPayload}\n\n${bodyWithPayload}`;
        
        // Build full response string from Repeater API result
        const responseHeaders = Object.entries(result.headers || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        const fullResponse = `HTTP/1.1 ${result.statusCode} ${result.statusMessage}\n${responseHeaders}\n\n${result.body}`;
        
            setResults(prev => [...prev, {
              id: requestNum,
              payload: payload,
              statusCode: result.statusCode,
              length: result.body ? result.body.length : 0,
              time: responseTime,
              request: fullRequest,
              response: fullResponse,
            }]);
            
            // Update progress
            setAttackProgress({
              current: requestNum,
              total: totalRequests,
              percentage: Math.round((requestNum / totalRequests) * 100)
            });
            
          } catch (error) {
            console.error('Attack request failed:', error);
            
            // Use the modified request (with payload), not the original
            const fullRequest = `${request.method} ${urlWithPayload} HTTP/1.1\n${headersWithPayload}\n\n${bodyWithPayload}`;
            const fullResponse = `Error: ${error.message}`;
            
            setResults(prev => [...prev, {
              id: requestNum,
              payload: payload,
              statusCode: 0,
              length: 0,
              time: Date.now() - startTime,
              request: fullRequest,
              response: fullResponse,
            }]);
          }
        }
      }
    } else if (attackType === 'battering-ram') {
      // Battering Ram: same payload in all positions
      let requestNum = 0;
      for (let i = 0; i < payloads.length; i++) {
        requestNum++;
        const payload = payloads[i];
        const startTime = Date.now();
        
        // Apply delay
        if (options.delay > 0 && requestNum > 1) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
        try {
          let urlWithPayload = request.url;
          let headersWithPayload = request.headers;
          let bodyWithPayload = request.body;
          
          // Replace all #markers# with same payload
          urlWithPayload = urlWithPayload.replace(/#([^#]+)#/g, payload);
          headersWithPayload = headersWithPayload.replace(/#([^#]+)#/g, payload);
          bodyWithPayload = bodyWithPayload.replace(/#([^#]+)#/g, payload);
          
          const headersObj = {};
          headersWithPayload.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              const headerName = key.trim().toLowerCase();
              if (headerName !== 'content-length') {
                headersObj[key.trim()] = valueParts.join(':').trim();
              }
            }
          });
          
          // Use Repeater API
          const result = await window.electronAPI.repeater.send({
            method: request.method,
            url: urlWithPayload,
            headers: headersObj,
            body: bodyWithPayload,
          });
          
          const responseTime = Date.now() - startTime;
          
          const fullRequest = `${request.method} ${urlWithPayload} HTTP/1.1\n${headersWithPayload}\n\n${bodyWithPayload}`;
          const responseHeaders = Object.entries(result.headers || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          const fullResponse = `HTTP/1.1 ${result.statusCode} ${result.statusMessage}\n${responseHeaders}\n\n${result.body}`;
          
          setResults(prev => [...prev, {
            id: requestNum,
            payload: payload,
            statusCode: result.statusCode,
            length: result.body ? result.body.length : 0,
            time: responseTime,
            request: fullRequest,
            response: fullResponse,
          }]);
          
          // Update progress
          setAttackProgress({
            current: requestNum,
            total: totalRequests,
            percentage: Math.round((requestNum / totalRequests) * 100)
          });
          
        } catch (error) {
          console.error('Attack request failed:', error);
          
          const fullRequest = `${request.method} ${request.url} HTTP/1.1\n${request.headers}\n\n${request.body}`;
          const fullResponse = `Error: ${error.message}`;
          
          setResults(prev => [...prev, {
            id: requestNum,
            payload: payload,
            statusCode: 0,
            length: 0,
            time: Date.now() - startTime,
            request: fullRequest,
            response: fullResponse,
          }]);
        }
      }
    }

    setIsRunning(false);
    toast.success(`Attack completed! ${totalRequests} requests sent.`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="bg-dark-900 border-b border-dark-800 flex items-center">
        <div className="flex-1 flex overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center px-4 py-2 border-r border-dark-800 cursor-move transition-colors ${
                activeTabId === tab.id
                  ? 'bg-dark-950 text-primary-400'
                  : 'hover:bg-dark-800 text-dark-400'
              } ${draggedTabId === tab.id ? 'opacity-50' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                borderTopColor: tab.color || 'transparent',
                borderTopWidth: tab.color ? '3px' : '0',
              }}
            >
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => {
                    renameTab(tab.id, editingTabName);
                    setEditingTabId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameTab(tab.id, editingTabName);
                      setEditingTabId(null);
                    }
                  }}
                  className="bg-dark-800 text-sm px-2 py-1 rounded w-32"
                  autoFocus
                />
              ) : (
                <>
                  <span
                    className="text-sm"
                    onDoubleClick={() => {
                      setEditingTabId(tab.id);
                      setEditingTabName(tab.name);
                    }}
                  >
                    {tab.name}
                  </span>
                  
                  {/* Color Picker - Shows on hover */}
                  <div className="hidden group-hover:flex items-center space-x-1 ml-2">
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
                      className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addTab}
          className="px-4 py-2 hover:bg-dark-800 text-dark-400 hover:text-dark-200"
          title="New Attack"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Top Bar */}
      <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">Intruder</h2>
            <select
              value={attackType}
              onChange={(e) => setAttackType(e.target.value)}
              className="input input-sm"
            >
              <option value="sniper">Sniper</option>
              <option value="battering-ram">Battering ram</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={isRunning ? () => setIsRunning(false) : handleStartAttack}
              className={`btn ${isRunning ? 'btn-error' : 'btn-primary'} btn-sm flex items-center space-x-2`}
            >
              {isRunning ? <Square size={14} /> : <Play size={14} />}
              <span>{isRunning ? 'Stop attack' : 'Start attack'}</span>
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isRunning && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-dark-400">
                Progress: {attackProgress.current} / {attackProgress.total} requests
              </span>
              <span className="text-xs font-medium text-primary-400">
                {attackProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${attackProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-dark-900 border-b border-dark-800 flex">
        {['positions', 'payloads', 'options', 'results'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-colors border-b-2 capitalize ${
              activeTab === tab
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'positions' && (
          <div className="h-full flex">
            {/* Request Editor */}
            <div className="flex-1 flex flex-col border-r border-dark-800">
              <div className="bg-dark-900 border-b border-dark-800 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">Request Template</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddPosition}
                    className="btn btn-primary btn-sm"
                  >
                    Add #
                  </button>
                  <button
                    onClick={handleClearPositions}
                    className="btn btn-secondary btn-sm"
                    title="Remove all positions and markers"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 overflow-auto">
                {/* Method & URL */}
                <div className="flex space-x-2">
                  <select
                    value={request.method}
                    onChange={(e) => setRequest({ ...request, method: e.target.value })}
                    className="input w-32"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={request.url}
                    onChange={(e) => setRequest({ ...request, url: e.target.value })}
                    className="input flex-1"
                  />
                </div>

                {/* Headers */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Headers (Select text and click "Add #")</label>
                  <div ref={headersRef} className="h-48 bg-dark-950 border border-dark-700 rounded">
                    <MonacoHttpEditor
                      ref={headersTextareaRef}
                      value={request.headers}
                      onChange={(value) => setRequest({ ...request, headers: value })}
                      language="http"
                      type="headers"
                      height="100%"
                      highlightMarkers={true}
                      positions={positions.filter(p => p.field === 'headers')}
                    />
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Body (Select text and click "Add #")</label>
                  <div ref={bodyRef} className="h-64 bg-dark-950 border border-dark-700 rounded">
                    <MonacoHttpEditor
                      ref={bodyTextareaRef}
                      value={request.body}
                      onChange={(value) => setRequest({ ...request, body: value })}
                      language="http"
                      type="body"
                      height="100%"
                      highlightMarkers={true}
                      positions={positions.filter(p => p.field === 'body')}
                    />
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="bg-dark-900 border border-dark-700 rounded px-3 py-2 flex items-center space-x-2">
                  <Search size={14} className="text-dark-500" />
                  <input
                    type="text"
                    placeholder="Search in request..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (!e.target.value) {
                        setHighlights(0);
                        return;
                      }
                      const content = `${request.method} ${request.url}\n${request.headers}\n${request.body}`;
                      const regex = new RegExp(e.target.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                      const matches = content.match(regex);
                      setHighlights(matches ? matches.length : 0);
                    }}
                    className="flex-1 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-600"
                  />
                  <span className="text-xs text-dark-500">
                    {highlights} highlight{highlights !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Positions Panel */}
            <div className="w-80 flex flex-col bg-dark-950">
              <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
                <h3 className="font-semibold text-sm">Payload Positions</h3>
                <p className="text-xs text-dark-500 mt-1">
                  {positions.length} position{positions.length !== 1 ? 's' : ''} defined
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {positions.length === 0 ? (
                  <div className="text-center text-dark-500 text-sm py-8">
                    <p>No positions defined</p>
                    <p className="mt-2">Select text and click "Add #"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {positions.map((pos) => (
                      <div key={pos.id} className="card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-primary-400">
                            Position {pos.id}
                          </span>
                          <button
                            onClick={() => handleRemovePosition(pos.id)}
                            className="text-dark-500 hover:text-red-400"
                            title="Remove this position"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-xs font-mono bg-dark-900 p-2 rounded">
                          #{pos.value}#
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payloads' && (
          <IntruderPayloadsTab 
            payloadSets={payloadSets}
            setPayloadSets={setPayloadSets}
            positions={positions}
          />
        )}

        {activeTab === 'options' && (
          <div className="h-full p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="card">
                <h3 className="font-semibold mb-4">Request Engine</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Number of threads</label>
                    <input 
                      type="number" 
                      className="input w-32" 
                      value={options.threads} 
                      onChange={(e) => setOptions({ ...options, threads: parseInt(e.target.value) || 1 })}
                      min="1" 
                      max="50" 
                    />
                    <p className="text-xs text-dark-500 mt-1">Concurrent requests to send simultaneously</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Delay between requests (ms)</label>
                    <input 
                      type="number" 
                      className="input w-32" 
                      value={options.delay} 
                      onChange={(e) => setOptions({ ...options, delay: parseInt(e.target.value) || 0 })}
                      min="0" 
                    />
                    <p className="text-xs text-dark-500 mt-1">Milliseconds to wait between each request</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <h3 className="font-semibold mb-4">Grep - Match</h3>
                <p className="text-sm text-dark-400 mb-4">
                  Extract and match patterns from responses
                </p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="text-sm">Flag result items with responses matching these expressions</span>
                  </label>
                  <p className="text-xs text-dark-500 mt-2">Coming soon...</p>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-4">Redirections</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="redirects" 
                      className="form-radio" 
                      checked={options.redirects === 'never'}
                      onChange={() => setOptions({ ...options, redirects: 'never' })}
                    />
                    <span className="text-sm">Never</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="redirects" 
                      className="form-radio" 
                      checked={options.redirects === 'on-site'}
                      onChange={() => setOptions({ ...options, redirects: 'on-site' })}
                    />
                    <span className="text-sm">On-site only</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="redirects" 
                      className="form-radio" 
                      checked={options.redirects === 'always'}
                      onChange={() => setOptions({ ...options, redirects: 'always' })}
                    />
                    <span className="text-sm">Always</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="h-full flex">
            {/* Results Table */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-dark-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium">#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Payload</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Length</th>
                      <th className="px-4 py-2 text-left text-xs font-medium">Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr 
                        key={`${result.id}-${index}`} 
                        onClick={() => setSelectedResult(result)}
                        className={`border-b border-dark-800 hover:bg-dark-900 cursor-pointer ${
                          selectedResult?.id === result.id ? 'bg-dark-900' : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-sm">{result.id}</td>
                        <td className="px-4 py-2 text-sm font-mono">{result.payload}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`badge ${
                            result.statusCode < 300 ? 'badge-success' :
                            result.statusCode < 400 ? 'badge-info' :
                            result.statusCode < 500 ? 'badge-warning' : 'badge-error'
                          }`}>
                            {result.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{result.length}</td>
                        <td className="px-4 py-2 text-sm">{result.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Result Detail Panel */}
            {selectedResult && (
              <div className="w-1/2 border-l border-dark-800 flex flex-col overflow-hidden">
                <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Result #{selectedResult.id}</h3>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="text-dark-500 hover:text-dark-200"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* Request */}
                  <div className="card">
                    <h4 className="font-semibold mb-2">Request</h4>
                    <div className="h-48 bg-dark-950 rounded overflow-hidden">
                      <MonacoHttpEditor
                        value={selectedResult.request || 'No request data'}
                        language="http"
                        type="request"
                        height="100%"
                        readOnly={true}
                      />
                    </div>
                  </div>

                  {/* Response */}
                  <div className="card">
                    <h4 className="font-semibold mb-2">Response</h4>
                    <div className="h-64 bg-dark-950 rounded overflow-hidden">
                      <MonacoHttpEditor
                        value={selectedResult.response || 'No response data'}
                        language="http"
                        type="response"
                        height="100%"
                        readOnly={true}
                      />
                    </div>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="bg-dark-900 border border-dark-700 rounded px-3 py-2 flex items-center space-x-2">
                    <Search size={14} className="text-dark-500" />
                    <input
                      type="text"
                      placeholder="Search in result..."
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const content = `${selectedResult.request}\n${selectedResult.response}`;
                        const regex = new RegExp(e.target.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        const matches = content.match(regex);
                      }}
                      className="flex-1 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-600"
                    />
                    <span className="text-xs text-dark-500">Search</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
