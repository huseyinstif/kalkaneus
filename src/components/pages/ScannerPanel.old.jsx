import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, Plus, Edit2, Search, Send, Copy, Download, Upload, Trash2, Filter, RefreshCw, Target, Shield, AlertTriangle, Info, Zap, FileText, Code, 
  CheckCircle, XCircle, Clock, Database
} from 'lucide-react';
import MonacoHttpEditor from '../common/MonacoHttpEditor';
import { getTemplateStats } from '../../utils/templateLoader';

export default function ScannerPanel() {
  const [activeTab, setActiveTab] = useState('scan'); // scan, templates, editor
  const [scanTarget, setScanTarget] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [findings, setFindings] = useState([]);
  const [selectedFinding, setSelectedFinding] = useState(null);
  
  const scanningRef = useRef(false);
  
  // Template management
  const [templates, setTemplates] = useState({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  
  // Scan stats
  const [scanStats, setScanStats] = useState({ total: 0, vulnerable: 0, safe: 0, errors: 0 });

  const templateStats = getTemplateStats(templates);

  // Refresh templates
  const handleRefreshTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const result = await window.electronAPI.scanner.loadTemplates();
      if (result.success) {
        setTemplates(result.templates);
        setSelectedTemplates(Object.keys(result.templates));
        toast.success(`${Object.keys(result.templates).length} templates loaded successfully!`);
      } else {
        toast.error('Failed to load templates: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates: ' + error.message);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      try {
        const result = await window.electronAPI.scanner.loadTemplates();
        if (result.success) {
          setTemplates(result.templates);
          setSelectedTemplates(Object.keys(result.templates));
        } else {
          console.error('Failed to load templates:', result.error);
          toast.error('Failed to load templates: ' + result.error);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        toast.error('Failed to load templates: ' + error.message);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  // Listen for sendToScanner event
  useEffect(() => {
    const handleSendToScanner = (event) => {
      const request = event.detail;
      if (request && request.url) {
        setScanTarget(request.url);
        setActiveTab('scan');
      }
    };

    window.addEventListener('sendToScanner', handleSendToScanner);
    return () => window.removeEventListener('sendToScanner', handleSendToScanner);
  }, []);

  // Filter templates
  const filteredTemplates = Object.entries(templates).filter(([path, template]) => {
    const matchesSearch = !searchTerm || 
      template.info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.info.tags.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || template.info.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  const startScan = async () => {
    
    if (!scanTarget) {
      toast.warning('Please enter a target URL');
      return;
    }

    if (selectedTemplates.length === 0) {
      toast.warning('Please select at least one template');
      return;
    }

    setScanProgress(0);
    setFindings([]);
    setScanStats({ total: 0, vulnerable: 0, safe: 0, errors: 0 });
    setActiveTab('scan');
    setIsScanning(true);
    scanningRef.current = true;

    const totalTemplates = selectedTemplates.length;
    
    let stats = { total: 0, vulnerable: 0, safe: 0, errors: 0 };
    
    for (let i = 0; i < totalTemplates && scanningRef.current; i++) {
      
      // Wait if paused
      while (isPaused && scanningRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setScanProgress(Math.round(((i + 1) / totalTemplates) * 100));

      const templatePath = selectedTemplates[i];
      const template = templates[templatePath];
      
      if (!template) {
        stats.errors++;
        setScanStats({ ...stats });
        continue;
      }
      
      stats.total++;
      
      try {
        const result = await window.electronAPI.scanner.test(template, scanTarget);
        
        if (!result.success) {
          stats.errors++;
          setScanStats({ ...stats });
          continue;
        }
        
        const scanResult = result.result;
        
        if (scanResult.skipped) {
          stats.safe++;
          setScanStats({ ...stats });
          continue;
        }
        
        if (scanResult.error) {
          stats.errors++;
          setScanStats({ ...stats });
          continue;
        }
        
        if (scanResult.vulnerable) {
          stats.vulnerable++;
          
          // Build request/response strings
          const requestStr = `GET ${scanResult.url} HTTP/1.1\nHost: ${new URL(scanResult.url).host}\nUser-Agent: Kalkaneus Scanner\n\n`;
          const responseStr = scanResult.response ? 
            `HTTP/1.1 ${scanResult.response.status} ${scanResult.response.statusMessage}\n${Object.entries(scanResult.response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${scanResult.response.body.substring(0, 5000)}` 
            : 'No response data';
          
          setFindings(prev => [...prev, {
            id: Date.now() + i,
            template: template.info.name,
            templateId: template.id,
            severity: template.info.severity,
            url: scanResult.url,
            description: template.info.description,
            timestamp: new Date().toISOString(),
            request: requestStr,
            response: responseStr,
            evidence: scanResult.evidence,
            responseTime: scanResult.response?.responseTime || 0,
            payload: scanResult.payload,
          }]);
        } else {
          stats.safe++;
        }
        
        setScanStats({ ...stats });
      } catch (error) {
        console.error(`Error scanning with template ${template.info.name}:`, error);
        stats.errors++;
        setScanStats({ ...stats });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    
    scanningRef.current = false;
    setIsScanning(false);
    
    // Show completion message
    const message = findings.length > 0 
      ? `Scan completed! Found ${findings.length} vulnerabilities (${stats.vulnerable} vulnerable, ${stats.safe} safe, ${stats.errors} errors)`
      : `Scan completed! No vulnerabilities found (${stats.total} templates tested, ${stats.safe} safe, ${stats.errors} errors)`;
    
    toast.success(message);
  };

  const stopScan = async () => {
    scanningRef.current = false;
    setIsScanning(false);
    setIsPaused(false);
    setScanProgress(0);
    
    // Notify backend to stop
    try {
      await window.electronAPI.scanner.stop();
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  };

  const pauseScan = () => {
    setIsPaused(true);
  };

  const resumeScan = () => {
    setIsPaused(false);
  };

  const handleTemplateSelect = (path) => {
    setSelectedTemplates(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const handleSelectAll = () => {
    setSelectedTemplates(Object.keys(templates));
  };

  const handleDeselectAll = () => {
    setSelectedTemplates([]);
  };

  const handleEditTemplate = (path) => {
    setSelectedTemplate(path);
    setEditorContent(templates[path].content || `id: ${templates[path].id}\n\ninfo:\n  name: ${templates[path].info.name}\n  severity: ${templates[path].info.severity}`);
    setActiveTab('editor');
  };

  const handleNewTemplate = () => {
    const newTemplate = `id: new-template

info:
  name: New Template
  author: Your Name
  severity: medium
  description: Template description
  tags: tag1,tag2

http:
  - method: GET
    path:
      - "{{BaseURL}}/path"
    
    matchers:
      - type: word
        words:
          - "keyword"`;

    setSelectedTemplate('custom/new-template.yaml');
    setEditorContent(newTemplate);
    setActiveTab('editor');
  };

  const handleSaveTemplate = () => {
    toast.success('Template saved successfully!');
  };

  const sendToRepeater = (finding) => {
    window.dispatchEvent(new CustomEvent('sendToRepeater', {
      detail: {
        method: 'GET',
        url: finding.url,
        headers: {},
        body: '',
        timestamp: Date.now()
      }
    }));
  };

  const sendToIntruder = (finding) => {
    window.dispatchEvent(new CustomEvent('sendToIntruder', {
      detail: {
        method: 'GET',
        url: finding.url,
        headers: {},
        body: '',
        timestamp: Date.now()
      }
    }));
  };

  const exportFindings = () => {
    const data = JSON.stringify(findings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-900/30';
      case 'high': return 'text-orange-500 bg-orange-900/30';
      case 'medium': return 'text-yellow-500 bg-yellow-900/30';
      case 'low': return 'text-blue-500 bg-blue-900/30';
      case 'info': return 'text-gray-500 bg-gray-900/30';
      default: return 'text-dark-400 bg-dark-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary-900/20 rounded-lg">
              <Shield className="text-primary-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Vulnerability Scanner</h2>
              <p className="text-sm text-dark-400 mt-1">
                {templateStats.total} templates • {findings.length} findings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {findings.length > 0 && (
              <button
                onClick={exportFindings}
                className="btn btn-secondary btn-sm flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Export Results</span>
              </button>
            )}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-red-500" size={16} />
                <span className="text-dark-400">{templateStats.critical + templateStats.high} Critical/High</span>
              </div>
              <div className="flex items-center space-x-2">
                <Info className="text-yellow-500" size={16} />
                <span className="text-dark-400">{templateStats.medium} Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="text-blue-500" size={16} />
                <span className="text-dark-400">{templateStats.low + templateStats.info} Low/Info</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-dark-900 border-b border-dark-800 flex">
        {['scan', 'templates', 'editor'].map((tab) => (
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
        {activeTab === 'scan' && (
          <div className="h-full flex">
            {/* Scan Configuration */}
            <div className="w-96 border-r border-dark-800 flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Target URL</label>
                  <input
                    type="text"
                    value={scanTarget}
                    onChange={(e) => setScanTarget(e.target.value)}
                    placeholder="http://testphp.vulnweb.com/"
                    className="input w-full"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Enter the target URL to scan for vulnerabilities
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Templates ({selectedTemplates.length} selected)
                  </label>
                  <button 
                    onClick={() => setActiveTab('templates')}
                    className="btn btn-secondary btn-sm w-full mb-2"
                  >
                    Select Templates ({selectedTemplates.length})
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={isScanning ? stopScan : startScan}
                    disabled={!scanTarget && !isScanning}
                    className={`btn flex-1 ${isScanning ? 'btn-error' : 'btn-primary'} flex items-center justify-center space-x-2`}
                  >
                    {isScanning ? <Square size={16} /> : <Play size={16} />}
                    <span>{isScanning ? 'Stop' : 'Start Scan'}</span>
                  </button>
                  {isScanning && (
                    <button
                      onClick={isPaused ? resumeScan : pauseScan}
                      className="btn btn-secondary flex items-center justify-center space-x-2"
                    >
                      {isPaused ? <Play size={16} /> : <Square size={16} />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                  )}
                </div>

                {isScanning && (
                  <div className="card p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Scan Progress</span>
                      <span className="text-primary-400">{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-dark-800 rounded-full h-2 mb-3">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="text-green-500" size={14} />
                        <span className="text-dark-400">{scanStats.vulnerable} Vulnerable</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="text-blue-500" size={14} />
                        <span className="text-dark-400">{scanStats.safe} Safe</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="text-yellow-500" size={14} />
                        <span className="text-dark-400">{scanStats.total} Tested</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <XCircle className="text-red-500" size={14} />
                        <span className="text-dark-400">{scanStats.errors} Errors</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Findings */}
            <div className="flex-1 flex">
              {/* Findings List */}
              <div className="w-1/2 border-r border-dark-800 flex flex-col">
                <div className="bg-dark-900 border-b border-dark-800 px-6 py-3">
                  <h3 className="font-semibold">Findings ({findings.length})</h3>
                </div>

                <div className="flex-1 overflow-auto">
                  {findings.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-dark-500">
                      <div className="text-center">
                        <Search size={64} className="mx-auto mb-4 opacity-50" />
                        <p>No findings yet</p>
                        <p className="text-sm mt-2">Start a scan to discover vulnerabilities</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {findings.map((finding) => (
                        <div
                          key={finding.id}
                          onClick={() => setSelectedFinding(finding)}
                          className={`card p-4 cursor-pointer hover:border-primary-500 transition-all ${
                            selectedFinding?.id === finding.id ? 'border-primary-500 bg-primary-900/5' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-dark-100">{finding.template}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                              {finding.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-dark-400 mb-3">{finding.description}</p>
                          <div className="text-xs text-dark-500 mb-3">
                            <span className="font-mono break-all">{finding.url}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendToRepeater(finding);
                              }}
                              className="btn btn-secondary btn-xs flex items-center space-x-1"
                            >
                              <Send size={12} />
                              <span>Repeater</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendToIntruder(finding);
                              }}
                              className="btn btn-secondary btn-xs flex items-center space-x-1"
                            >
                              <Zap size={12} />
                              <span>Intruder</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Finding Details */}
              <div className="flex-1 flex flex-col">
                {selectedFinding ? (
                  <>
                    <div className="bg-dark-900 border-b border-dark-800 px-6 py-3">
                      <h3 className="font-semibold">Finding Details</h3>
                    </div>

                    <div className="flex-1 overflow-auto p-6 space-y-4">
                      {/* Info */}
                      <div className="card p-4">
                        <h4 className="font-semibold mb-3">Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex">
                            <span className="text-dark-500 w-32">Template:</span>
                            <span>{selectedFinding.template}</span>
                          </div>
                          <div className="flex">
                            <span className="text-dark-500 w-32">Severity:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(selectedFinding.severity)}`}>
                              {selectedFinding.severity.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <span className="text-dark-500">URL:</span>
                            <div className="bg-dark-950 rounded p-3 font-mono text-xs text-dark-200 break-all">
                              {selectedFinding.url}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedFinding.url);
                                  toast.success('URL copied to clipboard!');
                                }}
                                className="btn btn-secondary btn-sm flex items-center space-x-2"
                              >
                                <Copy size={14} />
                                <span>Copy Link</span>
                              </button>
                              <button
                                onClick={() => {
                                  window.open(selectedFinding.url, '_blank');
                                }}
                                className="btn btn-secondary btn-sm flex items-center space-x-2"
                              >
                                <Send size={14} />
                                <span>Open Link</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex">
                            <span className="text-dark-500 w-32">Timestamp:</span>
                            <span className="text-xs">{new Date(selectedFinding.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="card p-4">
                        <h4 className="font-semibold mb-3">Description</h4>
                        <p className="text-sm text-dark-300">{selectedFinding.description}</p>
                      </div>

                      {/* Evidence */}
                      {selectedFinding.evidence && (
                        <div className="card p-4">
                          <h4 className="font-semibold mb-3">Evidence</h4>
                          <div className="bg-dark-950 rounded p-3 font-mono text-xs text-yellow-400">
                            {selectedFinding.evidence}
                          </div>
                        </div>
                      )}

                      {/* Request */}
                      <div className="card p-4">
                        <h4 className="font-semibold mb-3 flex items-center space-x-2">
                          <Send size={16} className="text-primary-400" />
                          <span>Request</span>
                        </h4>
                        <div className="h-64 bg-dark-950 rounded overflow-hidden border border-dark-800">
                          <MonacoHttpEditor
                            value={selectedFinding.request}
                            readOnly={true}
                            language="http"
                          />
                        </div>
                      </div>

                      {/* Response */}
                      <div className="card p-4">
                        <h4 className="font-semibold mb-3 flex items-center space-x-2">
                          <Code size={16} className="text-green-400" />
                          <span>Response</span>
                        </h4>
                        <div className="h-64 bg-dark-950 rounded overflow-hidden border border-dark-800">
                          <MonacoHttpEditor
                            value={selectedFinding.response}
                            readOnly={true}
                            language="http"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-dark-500">
                    <p>Select a finding to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="h-full flex flex-col p-6">
            {/* Search and Filter */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-500" size={16} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full pl-10"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="input w-48"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
              <button 
                onClick={async () => {
                  const result = await window.electronAPI.dialog.showOpenDialog({
                    properties: ['openFile', 'multiSelections'],
                    filters: [{ name: 'YAML Templates', extensions: ['yaml', 'yml'] }]
                  });
                  if (!result.canceled && result.filePaths.length > 0) {
                    // Import templates
                    toast.info(`Import ${result.filePaths.length} templates (feature coming soon)`);
                  }
                }}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>Import</span>
              </button>
              <button 
                onClick={handleRefreshTemplates} 
                disabled={isLoadingTemplates}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <Search size={16} />
                <span>{isLoadingTemplates ? 'Loading...' : 'Refresh Templates'}</span>
              </button>
              <button onClick={handleNewTemplate} className="btn btn-primary flex items-center space-x-2">
                <Plus size={16} />
                <span>New Template</span>
              </button>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(([path, template]) => (
                  <div key={path} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{template.info.name}</h4>
                        <p className="text-xs text-dark-500">{path}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(path)}
                        onChange={() => handleTemplateSelect(path)}
                        className="mt-1"
                      />
                    </div>

                    <p className="text-sm text-dark-400 mb-3 line-clamp-2">
                      {template.info.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(template.info.severity)}`}>
                        {template.info.severity.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleEditTemplate(path)}
                        className="text-primary-400 hover:text-primary-300 text-sm flex items-center space-x-1"
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.info.tags.split(',').map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-dark-800 rounded text-xs text-dark-400">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="h-full flex flex-col">
            <div className="bg-dark-900 border-b border-dark-800 px-6 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Template Editor</h3>
                <p className="text-xs text-dark-500 mt-1">{selectedTemplate || 'No template selected'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={handleSaveTemplate} className="btn btn-primary btn-sm">
                  Save Template
                </button>
                <button onClick={() => setActiveTab('templates')} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-dark-950">
              <MonacoHttpEditor
                value={editorContent}
                onChange={(value) => setEditorContent(value)}
                language="yaml"
                readOnly={false}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
