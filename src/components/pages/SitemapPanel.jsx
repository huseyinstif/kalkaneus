import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Globe, FileText, Folder, Send, Zap, Search, Filter, X, Copy } from 'lucide-react';
import { useProxyStore } from '../../store/proxyStore';
import { toast } from '../common/Toast';
import ContextMenu from '../ContextMenu';
import RequestDetailView from '../RequestDetailView';

export default function SitemapPanel() {
  const { history, fetchHistory } = useProxyStore();
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    method: '',
    statusCode: '',
    showOnlyWithParams: false,
  });

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Build sitemap tree from history
  const sitemapTree = useMemo(() => {
    const tree = {};

    history.forEach((req) => {
      try {
        const url = new URL(req.url);
        const domain = url.hostname;
        const pathParts = url.pathname.split('/').filter(Boolean);
        const queryParams = Array.from(url.searchParams.keys());

        // Initialize domain
        if (!tree[domain]) {
          tree[domain] = {
            type: 'domain',
            name: domain,
            children: {},
            requests: [],
            methods: new Set(),
            statusCodes: new Set(),
            hasParams: false,
          };
        }

        // Add request to domain
        tree[domain].requests.push(req);
        tree[domain].methods.add(req.method);
        if (req.status_code) tree[domain].statusCodes.add(req.status_code);
        if (queryParams.length > 0) tree[domain].hasParams = true;

        // Build path tree
        let currentLevel = tree[domain].children;
        let currentPath = '';

        pathParts.forEach((part, index) => {
          currentPath += '/' + part;
          const isLast = index === pathParts.length - 1;

          if (!currentLevel[part]) {
            currentLevel[part] = {
              type: isLast ? 'endpoint' : 'folder',
              name: part,
              fullPath: currentPath,
              children: {},
              requests: [],
              methods: new Set(),
              statusCodes: new Set(),
              params: new Set(),
              hasParams: false,
            };
          }

          currentLevel[part].requests.push(req);
          currentLevel[part].methods.add(req.method);
          if (req.status_code) currentLevel[part].statusCodes.add(req.status_code);
          
          if (isLast && queryParams.length > 0) {
            queryParams.forEach(param => currentLevel[part].params.add(param));
            currentLevel[part].hasParams = true;
          }

          currentLevel = currentLevel[part].children;
        });

        // Handle root path (/)
        if (pathParts.length === 0) {
          if (!tree[domain].children['/']) {
            tree[domain].children['/'] = {
              type: 'endpoint',
              name: '/',
              fullPath: '/',
              children: {},
              requests: [],
              methods: new Set(),
              statusCodes: new Set(),
              params: new Set(),
              hasParams: false,
            };
          }
          tree[domain].children['/'].requests.push(req);
          tree[domain].children['/'].methods.add(req.method);
          if (req.status_code) tree[domain].children['/'].statusCodes.add(req.status_code);
          if (queryParams.length > 0) {
            queryParams.forEach(param => tree[domain].children['/'].params.add(param));
            tree[domain].children['/'].hasParams = true;
          }
        }
      } catch (error) {
        console.error('Error parsing URL:', req.url, error);
      }
    });

    return tree;
  }, [history]);

  // Filter tree
  const filteredTree = useMemo(() => {
    if (!searchTerm && !filters.method && !filters.statusCode && !filters.showOnlyWithParams) {
      return sitemapTree;
    }

    const filterNode = (node) => {
      const matchesSearch = !searchTerm || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMethod = !filters.method || 
        node.methods.has(filters.method);
      
      const matchesStatus = !filters.statusCode || 
        node.statusCodes.has(parseInt(filters.statusCode));
      
      const matchesParams = !filters.showOnlyWithParams || node.hasParams;

      return matchesSearch && matchesMethod && matchesStatus && matchesParams;
    };

    const filtered = {};
    Object.entries(sitemapTree).forEach(([domain, domainNode]) => {
      if (filterNode(domainNode)) {
        filtered[domain] = domainNode;
      }
    });

    return filtered;
  }, [sitemapTree, searchTerm, filters]);

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (node, event) => {
    setSelectedNode(node);
    
    // Show first request in detail view
    if (node.requests && node.requests.length > 0) {
      setSelectedRequest(node.requests[0]);
      setShowDetail(true);
    }
  };

  const handleContextMenu = (node, event) => {
    // Don't show context menu if no requests
    if (!node.requests || node.requests.length === 0) {
      return;
    }
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: node,
      request: node.requests[0], // First request
    });
  };

  const sendToRepeater = (node) => {
    if (node.requests.length > 0) {
      const request = node.requests[0];
      window.dispatchEvent(new CustomEvent('sendToRepeater', { detail: request }));
      toast.success('Sent to Repeater');
    }
  };

  const sendToIntruder = (node) => {
    if (node.requests.length > 0) {
      const request = node.requests[0];
      window.dispatchEvent(new CustomEvent('sendToIntruder', { detail: request }));
      toast.success('Sent to Intruder');
    }
  };

  const renderNode = (node, nodeId, level = 0) => {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = Object.keys(node.children).length > 0;
    const isSelected = selectedNode === node;

    return (
      <div key={nodeId}>
        <div
          className={`group flex items-center space-x-2 px-2 py-1.5 hover:bg-dark-800/50 cursor-pointer transition-colors ${
            isSelected ? 'bg-dark-800 border-l-2 border-primary-500' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleNode(nodeId);
            handleNodeClick(node, e);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleContextMenu(node, e);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-dark-400 group-hover:text-dark-300 flex-shrink-0 transition-colors" />
            ) : (
              <ChevronRight size={14} className="text-dark-400 group-hover:text-dark-300 flex-shrink-0 transition-colors" />
            )
          ) : (
            <div className="w-3.5" />
          )}

          {node.type === 'domain' ? (
            <Globe size={15} className="text-primary-400 flex-shrink-0" />
          ) : node.type === 'folder' ? (
            <Folder size={15} className="text-yellow-500 flex-shrink-0" />
          ) : (
            <FileText size={15} className="text-blue-400 flex-shrink-0" />
          )}

          <span className={`text-sm flex-1 truncate ${
            node.type === 'domain' ? 'font-semibold text-dark-100' : 'text-dark-200'
          }`}>
            {node.name}
          </span>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {node.hasParams && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded font-medium">
                ?
              </span>
            )}
            {Array.from(node.methods).slice(0, 3).map((method) => (
              <span
                key={method}
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  method === 'GET'
                    ? 'bg-green-600/20 text-green-400'
                    : method === 'POST'
                    ? 'bg-blue-600/20 text-blue-400'
                    : method === 'PUT'
                    ? 'bg-yellow-600/20 text-yellow-400'
                    : method === 'DELETE'
                    ? 'bg-red-600/20 text-red-400'
                    : method === 'PATCH'
                    ? 'bg-orange-600/20 text-orange-400'
                    : 'bg-dark-600/20 text-dark-400'
                }`}
              >
                {method}
              </span>
            ))}
            {node.methods.size > 3 && (
              <span className="text-xs text-dark-500">+{node.methods.size - 3}</span>
            )}
            <span className="text-xs text-dark-500 font-medium">
              {node.requests.length}
            </span>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {Object.entries(node.children)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([childName, childNode]) =>
                renderNode(childNode, `${nodeId}/${childName}`, level + 1)
              )}
          </div>
        )}
      </div>
    );
  };

  const domainCount = Object.keys(filteredTree).length;
  const totalEndpoints = useMemo(() => {
    let count = 0;
    const countEndpoints = (node) => {
      if (node.type === 'endpoint') count++;
      Object.values(node.children).forEach(countEndpoints);
    };
    Object.values(filteredTree).forEach(countEndpoints);
    return count;
  }, [filteredTree]);

  return (
    <div className="h-full flex bg-dark-950">
      {/* Left Panel - Tree */}
      <div className={`flex flex-col bg-dark-950 ${showDetail ? 'w-1/2' : 'w-full'} transition-all`}>
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Globe size={20} className="text-primary-400" />
            <span>Sitemap</span>
          </h2>
          <div className="text-xs text-dark-500">
            {domainCount} domains • {totalEndpoints} endpoints
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            placeholder="Search paths..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <select
            value={filters.method}
            onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            className="input text-sm flex-1"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>

          <select
            value={filters.statusCode}
            onChange={(e) => setFilters({ ...filters, statusCode: e.target.value })}
            className="input text-sm flex-1"
          >
            <option value="">All Status</option>
            <option value="200">200</option>
            <option value="301">301</option>
            <option value="302">302</option>
            <option value="400">400</option>
            <option value="401">401</option>
            <option value="403">403</option>
            <option value="404">404</option>
            <option value="500">500</option>
          </select>
        </div>

        <label className="flex items-center space-x-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showOnlyWithParams}
            onChange={(e) => setFilters({ ...filters, showOnlyWithParams: e.target.checked })}
            className="rounded border-dark-600"
          />
          <span className="text-sm text-dark-300">Show only with parameters</span>
        </label>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto">
        {Object.keys(filteredTree).length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            <div className="text-center">
              <Globe size={48} className="mx-auto mb-3 opacity-50" />
              <p>No endpoints found</p>
              <p className="text-sm">Start browsing to build the sitemap</p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {Object.entries(filteredTree)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([domain, domainNode]) => renderNode(domainNode, domain))}
          </div>
        )}
      </div>

      {/* Selected Node Info */}
      {selectedNode && !showDetail && (
        <div className="bg-dark-900 border-t border-dark-800 p-4">
          <h3 className="text-sm font-semibold mb-2">
            {selectedNode.type === 'domain' ? selectedNode.name : selectedNode.fullPath}
          </h3>
          <div className="space-y-1 text-xs text-dark-400">
            <div>Requests: {selectedNode.requests.length}</div>
            <div>Methods: {Array.from(selectedNode.methods).join(', ')}</div>
            {selectedNode.params && selectedNode.params.size > 0 && (
              <div>Parameters: {Array.from(selectedNode.params).join(', ')}</div>
            )}
            {selectedNode.statusCodes && selectedNode.statusCodes.size > 0 && (
              <div>Status Codes: {Array.from(selectedNode.statusCodes).join(', ')}</div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Right Panel - Request Detail */}
      {showDetail && selectedNode && (
        <div className="w-1/2 flex flex-col border-l border-dark-800">
          <div className="bg-dark-900 border-b border-dark-800 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold">
              {selectedNode.type === 'domain' ? selectedNode.name : selectedNode.fullPath}
              <span className="text-xs text-dark-500 ml-2">
                ({selectedNode.requests.length} request{selectedNode.requests.length > 1 ? 's' : ''})
              </span>
            </h3>
            <button
              onClick={() => {
                setShowDetail(false);
                setSelectedRequest(null);
                setSelectedNode(null);
              }}
              className="text-dark-400 hover:text-dark-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Request List if multiple requests */}
          {selectedNode.requests.length > 1 && (
            <div className="bg-dark-900 border-b border-dark-800 p-2">
              <div className="text-xs text-dark-400 mb-2">Select a request:</div>
              <div className="flex flex-wrap gap-2">
                {selectedNode.requests.map((req, index) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`px-3 py-1.5 rounded text-xs transition-colors ${
                      selectedRequest?.id === req.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    #{index + 1} • {req.method} • {req.status_code || 'pending'}
                    {req.timestamp && (
                      <span className="ml-1 text-dark-500">
                        {new Date(req.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {selectedRequest ? (
              <RequestDetailView request={selectedRequest} />
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500">
                <p>Select a request to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && contextMenu.request && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: 'Send to Repeater',
              icon: <Send size={14} />,
              onClick: () => {
                const req = contextMenu.request;
                const formattedRequest = {
                  method: req.method || 'GET',
                  url: req.url,
                  headers: req.request_headers || req.headers || {},
                  body: req.request_body || req.body || '',
                };
                window.dispatchEvent(new CustomEvent('sendToRepeater', { detail: formattedRequest }));
                toast.success('Sent to Repeater');
                setContextMenu(null);
              },
            },
            {
              label: 'Send to Intruder',
              icon: <Zap size={14} />,
              onClick: () => {
                const req = contextMenu.request;
                const formattedRequest = {
                  method: req.method || 'GET',
                  url: req.url,
                  headers: req.request_headers || req.headers || {},
                  body: req.request_body || req.body || '',
                };
                window.dispatchEvent(new CustomEvent('sendToIntruder', { detail: formattedRequest }));
                toast.success('Sent to Intruder');
                setContextMenu(null);
              },
            },
            { divider: true },
            {
              label: 'Copy URL',
              icon: <Copy size={14} />,
              onClick: async () => {
                await navigator.clipboard.writeText(contextMenu.request.url);
                toast.success('URL copied');
                setContextMenu(null);
              },
            },
            { divider: true },
            {
              label: 'Expand All',
              icon: <ChevronDown size={14} />,
              onClick: () => {
                const allNodes = new Set();
                const addAllNodes = (node, id) => {
                  allNodes.add(id);
                  Object.entries(node.children).forEach(([name, child]) => {
                    addAllNodes(child, `${id}/${name}`);
                  });
                };
                Object.entries(filteredTree).forEach(([domain, node]) => {
                  addAllNodes(node, domain);
                });
                setExpandedNodes(allNodes);
                setContextMenu(null);
              },
            },
            {
              label: 'Collapse All',
              icon: <ChevronRight size={14} />,
              onClick: () => {
                setExpandedNodes(new Set());
                setContextMenu(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
