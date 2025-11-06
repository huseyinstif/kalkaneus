import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Send, Copy, Flag, MessageSquare, X, Terminal } from 'lucide-react';
import { toast } from '../common/Toast';
import { useProxyStore } from '../../store/proxyStore';
import ContextMenu from '../ContextMenu';
import RequestDetailView from '../RequestDetailView';
import CopyAsModal from '../modals/CopyAsModal';

export default function LoggerPanel() {
  const { history, fetchHistory, clearHistory, selectRequest, selectedRequest } = useProxyStore();
  const [filters, setFilters] = useState({
    search: '',
    method: '',
    statusCode: '',
    host: '',
    showFlaggedOnly: false,
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [commentModal, setCommentModal] = useState(null);
  const [copyAsModal, setCopyAsModal] = useState(null);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Listen for project loaded event
  useEffect(() => {
    const handleProjectLoaded = () => {
      console.log('LoggerPanel: Project loaded, refreshing data...');
      fetchHistory();
    };

    window.addEventListener('project:loaded', handleProjectLoaded);
    return () => window.removeEventListener('project:loaded', handleProjectLoaded);
  }, [fetchHistory]);

  const filteredHistory = history.filter((req) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !req.url.toLowerCase().includes(searchLower) &&
        !req.method.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    if (filters.method && req.method !== filters.method) {
      return false;
    }
    if (filters.statusCode && req.status_code !== parseInt(filters.statusCode)) {
      return false;
    }
    if (filters.host && !req.host?.includes(filters.host)) {
      return false;
    }
    if (filters.showFlaggedOnly && !req.flag) {
      return false;
    }
    return true;
  });

  const handleContextMenu = (e, request) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      request,
    });
  };

  const sendToRepeater = (request) => {
    const repeaterRequest = {
      method: request.method,
      url: request.url,
      headers: request.request_headers || request.headers || {},
      body: request.request_body || request.body || '',
      timestamp: Date.now(),
    };
    console.log('LoggerPanel: Sending to Repeater:', repeaterRequest);
    window.dispatchEvent(new CustomEvent('sendToRepeater', { detail: repeaterRequest }));
  };

  const sendToIntruder = (request) => {
    const intruderRequest = {
      method: request.method,
      url: request.url,
      headers: request.request_headers || request.headers || {},
      body: request.request_body || request.body || '',
      timestamp: Date.now(),
    };
    console.log('LoggerPanel: Sending to Intruder:', intruderRequest);
    window.dispatchEvent(new CustomEvent('sendToIntruder', { detail: intruderRequest }));
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

  const exportLogs = async () => {
    try {
      const result = await window.electronAPI.history.export('json');
      const blob = new Blob([result.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'text-green-400',
      POST: 'text-blue-400',
      PUT: 'text-yellow-400',
      DELETE: 'text-red-400',
      PATCH: 'text-purple-400',
    };
    return colors[method] || 'text-dark-400';
  };

  const getStatusColor = (status) => {
    if (status < 300) return 'text-green-400';
    if (status < 400) return 'text-blue-400';
    if (status < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleRowClick = async (req) => {
    await selectRequest(req.id);
    setShowDetail(true);
  };

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className={`${showDetail ? 'w-1/2' : 'w-full'} flex flex-col border-r border-dark-800`}>
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">HTTP Logger</h2>
          <div className="flex space-x-2">
            <button
              onClick={exportLogs}
              className="btn btn-secondary btn-sm flex items-center space-x-2"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button
              onClick={clearHistory}
              className="btn btn-danger btn-sm flex items-center space-x-2"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input w-full pl-10"
              />
            </div>
            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="input"
            >
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <input
              type="text"
              placeholder="Status code..."
              value={filters.statusCode}
              onChange={(e) => setFilters({ ...filters, statusCode: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="Host..."
              value={filters.host}
              onChange={(e) => setFilters({ ...filters, host: e.target.value })}
              className="input"
            />
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showFlaggedOnly}
              onChange={(e) => setFilters({ ...filters, showFlaggedOnly: e.target.checked })}
              className="rounded border-dark-600"
            />
            <span className="text-dark-300 flex items-center space-x-1 text-sm">
              <Flag size={14} className="text-red-500" />
              <span>Show Flagged Only</span>
            </span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-3 flex items-center space-x-6 text-sm">
        <div>
          <span className="text-dark-500">Total:</span>{' '}
          <span className="font-semibold">{history.length}</span>
        </div>
        <div>
          <span className="text-dark-500">Filtered:</span>{' '}
          <span className="font-semibold">{filteredHistory.length}</span>
        </div>
        <div>
          <span className="text-dark-500">GET:</span>{' '}
          <span className="font-semibold text-green-400">
            {history.filter((r) => r.method === 'GET').length}
          </span>
        </div>
        <div>
          <span className="text-dark-500">POST:</span>{' '}
          <span className="font-semibold text-blue-400">
            {history.filter((r) => r.method === 'POST').length}
          </span>
        </div>
      </div>

      {/* Log Table */}
      <div className="flex-1 overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-12" title="Flag / Comment">
                <Flag size={14} className="text-dark-500" />
              </th>
              <th className="w-16">#</th>
              <th className="w-32">Time</th>
              <th className="w-24">Method</th>
              <th className="w-32">Host</th>
              <th>Path</th>
              <th className="w-20">Status</th>
              <th className="w-24">Length</th>
              <th className="w-24">Duration</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((req, index) => (
              <tr 
                key={req.id}
                onClick={() => handleRowClick(req)}
                onContextMenu={(e) => handleContextMenu(e, req)}
                className={`cursor-pointer hover:bg-dark-800 ${selectedRequest?.id === req.id ? 'selected' : ''}`}
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
                <td className="text-xs text-dark-400">
                  {new Date(req.timestamp).toLocaleTimeString()}
                </td>
                <td>
                  <span className={`font-semibold ${getMethodColor(req.method)}`}>
                    {req.method}
                  </span>
                </td>
                <td className="text-sm truncate" title={req.host}>
                  {req.host}
                </td>
                <td className="text-sm truncate font-mono" title={req.path}>
                  {req.path}
                </td>
                <td>
                  {req.status_code && (
                    <span className={`font-semibold ${getStatusColor(req.status_code)}`}>
                      {req.status_code}
                    </span>
                  )}
                </td>
                <td className="text-dark-400 text-sm">
                  {req.response_length ? `${req.response_length} B` : '-'}
                </td>
                <td className="text-dark-400 text-sm">
                  {req.duration ? `${req.duration}ms` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredHistory.length === 0 && (
          <div className="p-8 text-center text-dark-500">
            {history.length === 0
              ? 'No requests logged yet. Start the proxy to see traffic here.'
              : 'No requests match the current filters.'}
          </div>
        )}
      </div>

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
              onClick: () => sendToRepeater(contextMenu.request),
            },
            {
              label: 'Send to Intruder',
              icon: <Copy size={14} />,
              onClick: () => sendToIntruder(contextMenu.request),
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
          ]}
        />
      )}
      </div>

      {/* Detail Panel */}
      {showDetail && selectedRequest && (
        <div className="w-1/2 flex flex-col overflow-hidden border-l border-dark-800">
          <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold">Request Details</h3>
            <button
              onClick={() => setShowDetail(false)}
              className="text-dark-400 hover:text-dark-200"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <RequestDetailView request={selectedRequest} />
          </div>
        </div>
      )}
      
      {/* Old detail panel - remove this */}
      {false && showDetail && selectedRequest && (
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Request Info */}
            <div className="card">
              <h4 className="font-semibold mb-3">Request</h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="text-dark-500 w-24">Method:</span>
                  <span className="font-semibold">{selectedRequest.method}</span>
                </div>
                <div className="flex">
                  <span className="text-dark-500 w-24">URL:</span>
                  <span className="font-mono text-xs break-all">{selectedRequest.url}</span>
                </div>
              </div>
            </div>

            {/* Request Headers */}
            <div className="card">
              <h4 className="font-semibold mb-3">Request Headers</h4>
              <div className="bg-dark-950 rounded p-3 font-mono text-xs space-y-1">
                {selectedRequest.request_headers && typeof selectedRequest.request_headers === 'object' ? (
                  Object.entries(selectedRequest.request_headers).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-primary-400">{key}:</span> {value}
                    </div>
                  ))
                ) : (
                  <div className="text-dark-500">No headers</div>
                )}
              </div>
            </div>

            {/* Request Body */}
            {selectedRequest.request_body && (
              <div className="card">
                <h4 className="font-semibold mb-3">Request Body</h4>
                <div className="bg-dark-950 rounded p-3 font-mono text-xs whitespace-pre-wrap break-all">
                  {selectedRequest.request_body}
                </div>
              </div>
            )}

            {/* Response Info */}
            {selectedRequest.status_code && (
              <>
                <div className="card">
                  <h4 className="font-semibold mb-3">Response</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-dark-500 w-24">Status:</span>
                      <span className={`font-semibold ${getStatusColor(selectedRequest.status_code)}`}>
                        {selectedRequest.status_code} {selectedRequest.status_message}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-dark-500 w-24">Length:</span>
                      <span>{selectedRequest.response_length || 0} bytes</span>
                    </div>
                    <div className="flex">
                      <span className="text-dark-500 w-24">Duration:</span>
                      <span>{selectedRequest.duration || 0}ms</span>
                    </div>
                  </div>
                </div>

                {/* Response Headers */}
                <div className="card">
                  <h4 className="font-semibold mb-3">Response Headers</h4>
                  <div className="bg-dark-950 rounded p-3 font-mono text-xs space-y-1">
                    {selectedRequest.response_headers && typeof selectedRequest.response_headers === 'object' ? (
                      Object.entries(selectedRequest.response_headers).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-green-400">{key}:</span> {value}
                        </div>
                      ))
                    ) : (
                      <div className="text-dark-500">No headers</div>
                    )}
                  </div>
                </div>

                {/* Response Body */}
                {selectedRequest.response_body && (
                  <div className="card">
                    <h4 className="font-semibold mb-3">Response Body</h4>
                    <div className="bg-dark-950 rounded p-3 font-mono text-xs whitespace-pre-wrap break-all max-h-96 overflow-auto">
                      {selectedRequest.response_body}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
              id="logger-comment-input"
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
                  const comment = document.getElementById('logger-comment-input').value;
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
