import React from 'react';
import { Copy, ExternalLink, Send, Code, AlertTriangle, Info } from 'lucide-react';
import { useScannerStore } from '../../store/scannerStore';
import { getSeverityColor } from '../../utils/scannerUtils';
import MonacoHttpEditor from '../common/MonacoHttpEditor';
import { toast } from '../common/Toast';

export default function FindingDetails() {
  const { selectedFinding } = useScannerStore();

  if (!selectedFinding) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-500">
        <div className="text-center">
          <Info size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a finding to view details</p>
        </div>
      </div>
    );
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(selectedFinding.url);
    toast.success('URL copied to clipboard');
  };

  const openInBrowser = () => {
    window.open(selectedFinding.url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Finding Details</h3>
          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getSeverityColor(selectedFinding.severity)}`}>
            {selectedFinding.severity.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Template Info */}
        <div className="card p-4 bg-gradient-to-br from-dark-900 to-dark-850">
          <h4 className="font-semibold mb-3 flex items-center space-x-2">
            <AlertTriangle className="text-primary-400" size={18} />
            <span>{selectedFinding.template}</span>
          </h4>
          <p className="text-sm text-dark-300 leading-relaxed">{selectedFinding.description}</p>
        </div>

        {/* URL Info */}
        <div className="card p-4">
          <h4 className="font-semibold mb-3 text-sm text-dark-500">Target URL</h4>
          <div className="bg-dark-950 rounded-lg p-3 font-mono text-xs text-dark-200 break-all mb-3">
            {selectedFinding.url}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={copyUrl}
              className="btn btn-secondary btn-sm flex items-center space-x-2"
            >
              <Copy size={14} />
              <span>Copy URL</span>
            </button>
            <button
              onClick={openInBrowser}
              className="btn btn-secondary btn-sm flex items-center space-x-2"
            >
              <ExternalLink size={14} />
              <span>Open in Browser</span>
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="card p-4">
          <h4 className="font-semibold mb-3 text-sm text-dark-500">Metadata</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-dark-600 text-xs">Discovered:</span>
              <p className="text-dark-200 font-medium">
                {new Date(selectedFinding.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-dark-600 text-xs">Response Time:</span>
              <p className="text-dark-200 font-medium">
                {selectedFinding.responseTime}ms
              </p>
            </div>
            {selectedFinding.payload && (
              <div className="col-span-2">
                <span className="text-dark-600 text-xs">Payload:</span>
                <p className="text-dark-200 font-mono text-xs bg-dark-950 rounded p-2 mt-1">
                  {selectedFinding.payload}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Evidence */}
        {selectedFinding.evidence && (
          <div className="card p-4">
            <h4 className="font-semibold mb-3 flex items-center space-x-2">
              <Code className="text-yellow-400" size={16} />
              <span>Evidence</span>
            </h4>
            <div className="bg-dark-950 rounded-lg p-4 font-mono text-xs text-yellow-400 border border-yellow-900/30">
              {selectedFinding.evidence}
            </div>
          </div>
        )}

        {/* Request */}
        <div className="card p-4">
          <h4 className="font-semibold mb-3 flex items-center space-x-2">
            <Send size={16} className="text-primary-400" />
            <span>HTTP Request</span>
          </h4>
          <div className="h-64 bg-dark-950 rounded-lg overflow-hidden border border-dark-800">
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
            <span>HTTP Response</span>
          </h4>
          <div className="h-64 bg-dark-950 rounded-lg overflow-hidden border border-dark-800">
            <MonacoHttpEditor
              value={selectedFinding.response}
              readOnly={true}
              language="http"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
