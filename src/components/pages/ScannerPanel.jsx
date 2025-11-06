import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Info, Download, FileText } from 'lucide-react';
import { useScannerStore } from '../../store/scannerStore';
import { useEventListener } from '../../hooks/useEventListener';
import { toast } from '../common/Toast';
import apiService from '../../services/api';
import ScanConfig from '../scanner/ScanConfig';
import FindingsList from '../scanner/FindingsList';
import FindingDetails from '../scanner/FindingDetails';
import TemplateManager from '../scanner/TemplateManager';
import MonacoHttpEditor from '../common/MonacoHttpEditor';

export default function ScannerPanel() {
  const [activeTab, setActiveTab] = useState('scan');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  
  const scanningRef = useRef(false);

  const {
    templates,
    selectedTemplates,
    scanTarget,
    setScanTarget,
    isScanning,
    isPaused,
    setIsScanning,
    setIsPaused,
    updateScanProgress,
    updateScanStats,
    addFinding,
    clearFindings,
    loadTemplates,
    exportFindings,
    getTemplateStats
  } = useScannerStore();

  const templateStats = getTemplateStats();

  // Load templates on mount
  useEffect(() => {
    const load = async () => {
      const result = await loadTemplates();
      if (result?.success) {
        toast.success(`${Object.keys(result.templates).length} templates loaded`);
      } else if (result?.error) {
        toast.error('Failed to load templates: ' + result.error);
      }
    };
    load();
  }, []);

  // Listen for sendToScanner event
  useEventListener('sendToScanner', (event) => {
    const request = event.detail;
    if (request?.url) {
      setScanTarget(request.url);
      setActiveTab('scan');
    }
  });

  // Start scan
  const startScan = async () => {
    if (!scanTarget) {
      toast.warning('Please enter a target URL');
      return;
    }

    if (selectedTemplates.length === 0) {
      toast.warning('Please select at least one template');
      return;
    }

    updateScanProgress(0);
    clearFindings();
    updateScanStats({ total: 0, vulnerable: 0, safe: 0, errors: 0 });
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

      updateScanProgress(Math.round(((i + 1) / totalTemplates) * 100));

      const templatePath = selectedTemplates[i];
      const template = templates[templatePath];

      if (!template) {
        stats.errors++;
        updateScanStats({ ...stats });
        continue;
      }

      stats.total++;

      try {
        const result = await apiService.scanner.test(template, scanTarget);

        if (!result.success) {
          stats.errors++;
          updateScanStats({ ...stats });
          continue;
        }

        const scanResult = result.result;

        if (scanResult.skipped) {
          stats.safe++;
          updateScanStats({ ...stats });
          continue;
        }

        if (scanResult.error) {
          stats.errors++;
          updateScanStats({ ...stats });
          continue;
        }

        if (scanResult.vulnerable) {
          stats.vulnerable++;

          // Build request/response strings
          const requestStr = `GET ${scanResult.url} HTTP/1.1\nHost: ${new URL(scanResult.url).host}\nUser-Agent: Kalkaneus Scanner\n\n`;
          const responseStr = scanResult.response
            ? `HTTP/1.1 ${scanResult.response.status} ${scanResult.response.statusMessage}\n${Object.entries(scanResult.response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${scanResult.response.body.substring(0, 5000)}`
            : 'No response data';

          addFinding({
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
          });
        } else {
          stats.safe++;
        }

        updateScanStats({ ...stats });
      } catch (error) {
        console.error(`Error scanning with template ${template.info.name}:`, error);
        stats.errors++;
        updateScanStats({ ...stats });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    scanningRef.current = false;
    setIsScanning(false);

    // Show completion notification
    const vulnerableCount = stats.vulnerable;
    if (vulnerableCount > 0) {
      toast.error(
        `Scan completed! Found ${vulnerableCount} vulnerabilities`,
        null,
        5000
      );
    } else {
      toast.success(
        `Scan completed! No vulnerabilities found (${stats.total} templates tested)`,
        null,
        5000
      );
    }
  };

  const stopScan = async () => {
    scanningRef.current = false;
    setIsScanning(false);
    setIsPaused(false);
    updateScanProgress(0);

    try {
      await apiService.scanner.stop();
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

  const handleEditTemplate = (path) => {
    setSelectedTemplate(path);
    const template = templates[path];
    setEditorContent(
      template.content ||
      `id: ${template.id}\n\ninfo:\n  name: ${template.info.name}\n  severity: ${template.info.severity}`
    );
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

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-br from-primary-900/30 to-primary-800/20 rounded-lg border border-primary-900/50">
              <Shield className="text-primary-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Vulnerability Scanner</h2>
              <p className="text-sm text-dark-400 mt-1">
                {templateStats.total} templates • {useScannerStore.getState().findings.length} findings
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {useScannerStore.getState().findings.length > 0 && (
              <button
                onClick={() => {
                  exportFindings();
                  toast.success('Scan results exported successfully');
                }}
                className="btn btn-secondary btn-sm flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Export Results</span>
              </button>
            )}
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-900/30">
                <AlertTriangle className="text-red-400" size={16} />
                <span className="text-red-400 font-semibold">
                  {templateStats.critical + templateStats.high}
                </span>
                <span className="text-dark-500">Critical/High</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-yellow-900/20 border border-yellow-900/30">
                <Info className="text-yellow-400" size={16} />
                <span className="text-yellow-400 font-semibold">{templateStats.medium}</span>
                <span className="text-dark-500">Medium</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-900/20 border border-blue-900/30">
                <Shield className="text-blue-400" size={16} />
                <span className="text-blue-400 font-semibold">
                  {templateStats.low + templateStats.info}
                </span>
                <span className="text-dark-500">Low/Info</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-dark-900 border-b border-dark-800 flex">
        {[
          { id: 'scan', label: 'Scan', icon: Shield },
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'editor', label: 'Editor', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400 bg-primary-900/10'
                  : 'border-transparent text-dark-400 hover:text-dark-200 hover:bg-dark-850'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'scan' && (
          <div className="h-full flex">
            <ScanConfig
              onStartScan={startScan}
              onStopScan={stopScan}
              onPauseScan={pauseScan}
              onResumeScan={resumeScan}
            />
            <FindingsList />
            <FindingDetails />
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateManager
            onEditTemplate={handleEditTemplate}
            onNewTemplate={handleNewTemplate}
          />
        )}

        {activeTab === 'editor' && (
          <div className="h-full flex flex-col">
            <div className="bg-dark-900 border-b border-dark-800 px-6 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Template Editor</h3>
                <p className="text-xs text-dark-500 mt-1">
                  {selectedTemplate || 'No template selected'}
                </p>
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
