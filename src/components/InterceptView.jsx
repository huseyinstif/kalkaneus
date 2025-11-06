import React, { useState, useEffect } from 'react';
import { Play, X, Send, Copy, ChevronDown, Search, ChevronLeft, ChevronRight, FastForward } from 'lucide-react';
import HttpViewer from './common/HttpViewer';
import MonacoHttpEditor from './common/MonacoHttpEditor';

export default function InterceptView({ request, onForward, onDrop, onModify, onForwardAll }) {
  const [editedRequest, setEditedRequest] = useState(null);
  const [editedResponse, setEditedResponse] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [viewMode, setViewMode] = useState('edit'); // edit, pretty, hex
  const [isResponse, setIsResponse] = useState(false); // Track if this is a response
  const [isForwarding, setIsForwarding] = useState(false); // Prevent double clicks
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [highlights, setHighlights] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Search handler
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentMatch(0);
    if (!term) {
      setHighlights(0);
      return;
    }
    
    let content = '';
    if (isResponse && editedResponse) {
      content = `${editedResponse.statusCode} ${editedResponse.statusMessage}\n${Object.entries(editedResponse.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n${editedResponse.body}`;
    } else if (editedRequest) {
      content = `${editedRequest.method} ${editedRequest.url}\n${Object.entries(editedRequest.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n${editedRequest.body}`;
    }
    
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    setHighlights(matches ? matches.length : 0);
  };

  // Navigation handlers
  const handlePrevMatch = () => {
    if (highlights === 0) return;
    setCurrentMatch((prev) => (prev - 1 + highlights) % highlights);
  };

  const handleNextMatch = () => {
    if (highlights === 0) return;
    setCurrentMatch((prev) => (prev + 1) % highlights);
  };

  useEffect(() => {
    if (request) {
      // Reset search when request changes
      setSearchTerm('');
      setHighlights(0);
      setCurrentMatch(0);
      
      // Check if this is a response (has statusCode)
      if (request.statusCode !== undefined) {
        setIsResponse(true);
        setEditedResponse({
          statusCode: request.statusCode,
          statusMessage: request.statusMessage || 'OK',
          headers: request.headers,
          body: request.body || '',
        });
      } else {
        setIsResponse(false);
        // Check if WebSocket
        const isWs = request.method === 'WEBSOCKET' || request.type === 'websocket';
        setEditedRequest({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body || '',
          data: isWs ? request.data : undefined,
          direction: request.direction,
          wsId: request.wsId,
          type: request.type,
        });
      }
    }
  }, [request]);

  if (!request) {
    return (
      <div className="flex items-center justify-center h-full text-dark-500">
        <div className="text-center">
          <p className="text-lg mb-2">No intercepted requests</p>
          <p className="text-sm">Enable intercept to capture requests</p>
        </div>
      </div>
    );
  }

  // Check if this is a WebSocket message
  const isWebSocket = request.method === 'WEBSOCKET' || request.type === 'websocket';

  const handleHeadersChange = (value) => {
    try {
      const headers = {};
      value.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          headers[key.trim()] = valueParts.join(':').trim();
        }
      });
      setEditedRequest({ ...editedRequest, headers });
    } catch (error) {
      console.error('Error parsing headers:', error);
    }
  };

  const handleBodyChange = (value) => {
    if (isResponse) {
      setEditedResponse({ ...editedResponse, body: value });
    } else {
      setEditedRequest({ ...editedRequest, body: value });
    }
  };

  const handleResponseHeadersChange = (value) => {
    try {
      const headers = {};
      value.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          headers[key.trim()] = valueParts.join(':').trim();
        }
      });
      setEditedResponse({ ...editedResponse, headers });
    } catch (error) {
      console.error('Error parsing response headers:', error);
    }
  };

  const handleForward = async () => {
    if (isForwarding) return; // Prevent double clicks
    setIsForwarding(true);
    
    try {
      if (isResponse) {
        // Forward response (original)
        await window.electronAPI.intercept.forwardResponse(request.id);
        // Clear the intercepted response from UI
        setEditedResponse(null);
        setIsResponse(false);
        // Call onForward to remove from queue
        onForward(request.id);
      } else {
        // Forward request or WebSocket message
        if (isWebSocket) {
          // For WebSocket, check if data was modified
          const isModified = editedRequest.data !== request.data;
          if (isModified) {
            onModify(request.id, editedRequest);
          } else {
            onForward(request.id);
          }
        } else {
          // For HTTP requests
          const isModified = 
            editedRequest.method !== request.method ||
            editedRequest.url !== request.url ||
            JSON.stringify(editedRequest.headers) !== JSON.stringify(request.headers) ||
            editedRequest.body !== (request.body || '');
          
          if (isModified) {
            onModify(request.id, editedRequest);
          } else {
            onForward(request.id);
          }
        }
      }
    } catch (error) {
      console.error('Error forwarding:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const handleModifyResponse = async () => {
    if (isForwarding) return; // Prevent double clicks
    setIsForwarding(true);
    
    try {
      await window.electronAPI.intercept.modifyResponse(request.id, editedResponse);
      // Clear the intercepted response from UI
      setEditedResponse(null);
      setIsResponse(false);
      // Call onForward to remove from queue
      onForward(request.id);
    } catch (error) {
      console.error('Error modifying response:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  const handleSendToRepeater = (e) => {
    e.stopPropagation();
    const repeaterRequest = {
      method: editedRequest.method,
      url: editedRequest.url,
      headers: editedRequest.headers,
      body: editedRequest.body,
      timestamp: Date.now(),
    };
    console.log('InterceptView: Sending to Repeater:', repeaterRequest);
    // Don't change view, just dispatch event
    window.dispatchEvent(new CustomEvent('sendToRepeaterNoSwitch', { detail: repeaterRequest }));
  };

  const handleSendToIntruder = (e) => {
    e.stopPropagation();
    const intruderRequest = {
      method: editedRequest.method,
      url: editedRequest.url,
      headers: editedRequest.headers,
      body: editedRequest.body,
      timestamp: Date.now(),
    };
    console.log('InterceptView: Sending to Intruder:', intruderRequest);
    window.dispatchEvent(new CustomEvent('sendToIntruder', { detail: intruderRequest }));
  };

  const handleForwardAndInterceptResponse = async () => {
    console.log('InterceptView: Marking for response interception');
    
    // Just mark this request for response interception, don't forward yet
    try {
      await window.electronAPI.intercept.markForResponseInterception(request.id);
      setContextMenu(null);
      console.log('Request marked for response interception. Forward it to intercept the response.');
    } catch (error) {
      console.error('Error setting up response interception:', error);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  if (!editedRequest && !editedResponse) {
    return (
      <div className="flex items-center justify-center h-full text-dark-500">
        <div className="text-center">
          <p className="text-lg mb-2">No intercepted requests or responses</p>
          <p className="text-sm">Enable intercept to capture traffic</p>
        </div>
      </div>
    );
  }

  const headersText = isResponse 
    ? Object.entries(editedResponse?.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
    : Object.entries(editedRequest?.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n');

  return (
    <div className="flex flex-col h-full">
      {/* Action Bar */}
      <div 
        className="p-4 border-b border-dark-800 flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          {isResponse ? (
            <>
              {/* Response buttons */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleModifyResponse();
                }}
                disabled={isForwarding}
                className="btn btn-primary btn-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                <span>{isForwarding ? 'Forwarding...' : 'Forward Modified'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleForward();
                }}
                disabled={isForwarding}
                className="btn btn-success btn-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                <span>{isForwarding ? 'Forwarding...' : 'Forward Original'}</span>
              </button>
              <div className="text-sm text-orange-400 ml-4">
                ⚠️ Intercepted Response
              </div>
            </>
          ) : (
            <>
              {/* Request buttons */}
              <button
                onClick={handleForward}
                className="btn btn-success btn-sm flex items-center space-x-2"
              >
                <Play size={14} />
                <span>Forward</span>
              </button>
              <button
                onClick={() => onDrop(request.id)}
                className="btn btn-danger btn-sm flex items-center space-x-2"
              >
                <X size={14} />
                <span>Drop</span>
              </button>
              <button
                onClick={onForwardAll}
                className="btn btn-primary btn-sm flex items-center space-x-2"
                title="Forward all pending requests"
              >
                <FastForward size={14} />
                <span>Forward All</span>
              </button>
              <div className="w-px h-6 bg-dark-700 mx-2" />
              <button
                onClick={handleSendToRepeater}
                className="btn btn-secondary btn-sm flex items-center space-x-2"
              >
                <Send size={14} />
                <span>Send to Repeater</span>
              </button>
              <button
                onClick={handleSendToIntruder}
                className="btn btn-secondary btn-sm flex items-center space-x-2"
              >
                <Copy size={14} />
                <span>Send to Intruder</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed bg-dark-800 border border-dark-700 rounded shadow-lg z-50 min-w-[250px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                handleForward();
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200 flex items-center space-x-2"
            >
              <Play size={14} />
              <span>Forward</span>
            </button>
            <button
              onClick={() => {
                onDrop(request.id);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200 flex items-center space-x-2"
            >
              <X size={14} />
              <span>Drop</span>
            </button>
            <div className="border-t border-dark-700 my-1"></div>
            <button
              onClick={async () => {
                try {
                  const host = editedRequest.headers.host;
                  await window.electronAPI.intercept.addExcludedHost(host);
                  console.log('Added excluded host:', host);
                  handleForward();
                } catch (error) {
                  console.error('Error adding excluded host:', error);
                }
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200"
            >
              Don't intercept this host
            </button>
            <button
              onClick={async () => {
                try {
                  const url = editedRequest.url;
                  await window.electronAPI.intercept.addExcludedUrl(url);
                  console.log('Added excluded URL:', url);
                  handleForward();
                } catch (error) {
                  console.error('Error adding excluded URL:', error);
                }
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200"
            >
              Don't intercept this URL
            </button>
            <div className="border-t border-dark-700 my-1"></div>
            <button
              onClick={() => {
                handleForwardAndInterceptResponse();
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200 flex items-center space-x-2"
            >
              <ChevronDown size={14} />
              <span>Do intercept response</span>
            </button>
            <button
              onClick={(e) => {
                handleSendToRepeater(e);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200 flex items-center space-x-2"
            >
              <Send size={14} />
              <span>Send to Repeater</span>
            </button>
            <button
              onClick={(e) => {
                handleSendToIntruder(e);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 text-dark-200 flex items-center space-x-2"
            >
              <Copy size={14} />
              <span>Send to Intruder</span>
            </button>
          </div>
        </>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center space-x-1 border-b border-dark-800 px-4 py-2 bg-dark-900">
        <button
          onClick={() => setViewMode('edit')}
          className={`px-3 py-1 text-xs rounded ${
            viewMode === 'edit'
              ? 'bg-primary-600 text-white'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setViewMode('pretty')}
          className={`px-3 py-1 text-xs rounded ${
            viewMode === 'pretty'
              ? 'bg-primary-600 text-white'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Pretty
        </button>
        <button
          onClick={() => setViewMode('hex')}
          className={`px-3 py-1 text-xs rounded ${
            viewMode === 'hex'
              ? 'bg-primary-600 text-white'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Hex
        </button>
      </div>

      {/* Request Details */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {viewMode === 'edit' ? (
          <>
            {isResponse ? (
              /* Response Status Line */
              <div className="card">
                <h3 className="text-sm font-semibold mb-3 text-primary-400">Response Status</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={editedResponse.statusCode}
                    onChange={(e) => setEditedResponse({ ...editedResponse, statusCode: parseInt(e.target.value) })}
                    className="input w-24"
                    placeholder="200"
                  />
                  <input
                    type="text"
                    value={editedResponse.statusMessage}
                    onChange={(e) => setEditedResponse({ ...editedResponse, statusMessage: e.target.value })}
                    className="input flex-1"
                    placeholder="OK"
                  />
                </div>
              </div>
            ) : isWebSocket ? (
              /* WebSocket Message Info */
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-primary-400">WebSocket Message</h3>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${
                    request.direction === 'outgoing' 
                      ? 'bg-blue-900/30 text-blue-400' 
                      : 'bg-green-900/30 text-green-400'
                  }`}>
                    {request.direction === 'outgoing' ? '→ Outgoing' : '← Incoming'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-dark-500">Connection URL:</span>
                    <div className="text-sm font-mono text-dark-300 mt-1">{request.url}</div>
                  </div>
                  <div>
                    <span className="text-xs text-dark-500">WebSocket ID:</span>
                    <div className="text-xs font-mono text-dark-400 mt-1">{request.wsId}</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Request Line */
              <div className="card">
                <h3 className="text-sm font-semibold mb-3 text-primary-400">Request Line</h3>
                <div className="flex items-center space-x-2">
                  <select
                    value={editedRequest.method}
                    onChange={(e) => setEditedRequest({ ...editedRequest, method: e.target.value })}
                    className="input w-32"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                    <option>PATCH</option>
                    <option>OPTIONS</option>
                    <option>HEAD</option>
                  </select>
                  <input
                    type="text"
                    value={editedRequest.url}
                    onChange={(e) => setEditedRequest({ ...editedRequest, url: e.target.value })}
                    className="input flex-1"
                  />
                </div>
              </div>
            )}

            {/* Headers - Hide for WebSocket */}
            {!isWebSocket && (
            <div>
              <label className="text-sm font-medium mb-2 block">Headers</label>
              <div className="h-48 bg-dark-950 border border-dark-700 rounded">
                <MonacoHttpEditor
                  value={headersText}
                  onChange={(value) => isResponse ? handleResponseHeadersChange(value) : handleHeadersChange(value)}
                  language="http"
                  type="headers"
                  height="100%"
                  searchTerm={searchTerm}
                  currentMatch={currentMatch}
                  onContextMenu={handleContextMenu}
                />
              </div>
            </div>
            )}

            {/* Body / Message Data */}
            <div>
              <label className="text-sm font-medium mb-2 block">{isWebSocket ? 'Message Data' : 'Body'}</label>
              <div className="h-64 bg-dark-950 border border-dark-700 rounded">
                <MonacoHttpEditor
                  value={isWebSocket ? (request.data || '') : (isResponse ? editedResponse.body : editedRequest.body)}
                  onChange={(value) => isWebSocket ? setEditedRequest({...editedRequest, data: value}) : handleBodyChange(value)}
                  language={isWebSocket ? 'plaintext' : 'http'}
                  type="body"
                  height="100%"
                  searchTerm={searchTerm}
                  currentMatch={currentMatch}
                  onContextMenu={handleContextMenu}
                />
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="bg-dark-900 border border-dark-700 rounded px-3 py-2 flex items-center space-x-2">
              <Search size={14} className="text-dark-500" />
              <input
                type="text"
                placeholder={isResponse ? "Search in response..." : "Search in request..."}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-600"
              />
              {highlights > 0 && (
                <>
                  <button
                    onClick={handlePrevMatch}
                    className="p-1 hover:bg-dark-800 rounded"
                    title="Previous match"
                  >
                    <ChevronLeft size={14} className="text-dark-400" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    className="p-1 hover:bg-dark-800 rounded"
                    title="Next match"
                  >
                    <ChevronRight size={14} className="text-dark-400" />
                  </button>
                </>
              )}
              <span className="text-xs text-dark-500">
                {highlights > 0 ? `${currentMatch + 1}/${highlights}` : '0 highlights'}
              </span>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <HttpViewer 
                content={isResponse 
                  ? `HTTP/1.1 ${editedResponse.statusCode} ${editedResponse.statusMessage}\n${Object.entries(editedResponse.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${editedResponse.body || ''}`
                  : `${editedRequest.method} ${editedRequest.url} HTTP/1.1\n${Object.entries(editedRequest.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${editedRequest.body || ''}`
                }
                type={isResponse ? "response" : "request"}
                viewMode={viewMode}
                searchTerm={searchTerm}
                currentMatch={currentMatch}
              />
            </div>
            
            {/* Search Bar */}
            <div className="bg-dark-900 border-t border-dark-800 px-3 py-2 flex items-center space-x-2">
              <Search size={14} className="text-dark-500" />
              <input
                type="text"
                placeholder={isResponse ? "Search in response..." : "Search in request..."}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-600"
              />
              {highlights > 0 && (
                <>
                  <button
                    onClick={handlePrevMatch}
                    className="p-1 hover:bg-dark-800 rounded"
                    title="Previous match"
                  >
                    <ChevronLeft size={14} className="text-dark-400" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    className="p-1 hover:bg-dark-800 rounded"
                    title="Next match"
                  >
                    <ChevronRight size={14} className="text-dark-400" />
                  </button>
                </>
              )}
              <span className="text-xs text-dark-500">
                {highlights > 0 ? `${currentMatch + 1}/${highlights}` : '0 highlights'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
