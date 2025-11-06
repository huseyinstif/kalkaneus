import React, { useState } from 'react';
import { X, Copy, Terminal, Check } from 'lucide-react';
import { toast } from '../common/Toast';
import {
  convertToCurl,
  convertToPythonRequests,
  convertToSqlmap,
  convertToFetch
} from '../../utils/requestConverter';

export default function CopyAsModal({ request, onClose }) {
  const [activeTab, setActiveTab] = useState('curl-linux');
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'curl-linux', label: 'cURL (Linux/Mac)', icon: <Terminal size={14} /> },
    { id: 'curl-windows', label: 'cURL (PowerShell)', icon: <Terminal size={14} /> },
    { id: 'python', label: 'Python Requests', icon: <Terminal size={14} /> },
    { id: 'sqlmap', label: 'SQLMap', icon: <Terminal size={14} /> },
    { id: 'fetch', label: 'JavaScript Fetch', icon: <Terminal size={14} /> },
  ];

  const getCommand = () => {
    switch (activeTab) {
      case 'curl-linux':
        return convertToCurl(request, 'linux');
      case 'curl-windows':
        return convertToCurl(request, 'windows');
      case 'python':
        return convertToPythonRequests(request);
      case 'sqlmap':
        return convertToSqlmap(request);
      case 'fetch':
        return convertToFetch(request);
      default:
        return '';
    }
  };

  const handleCopy = async () => {
    const command = getCommand();
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const command = getCommand();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-lg w-full max-w-3xl border border-dark-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <div className="flex items-center space-x-3">
            <Terminal size={20} className="text-primary-400" />
            <h3 className="text-lg font-semibold text-white">Copy Request As...</h3>
          </div>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-1 px-4 pt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-dark-950 text-primary-400 border-t border-x border-dark-700'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Command Display */}
        <div className="bg-dark-950 mx-4 mb-4 rounded-b-lg border border-dark-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-dark-900 border-b border-dark-800">
            <span className="text-xs text-primary-400 font-mono">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3 py-1 rounded bg-primary-600 hover:bg-primary-500 text-white text-sm transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-sm text-dark-200 font-mono overflow-x-auto max-h-96 overflow-y-auto">
            {command}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-dark-950 border-t border-dark-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-dark-500">
            <Terminal size={12} />
            <span>Kalkaneus</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
