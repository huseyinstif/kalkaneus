import React, { useMemo } from 'react';
import { Search, Send, Zap, Filter, ChevronDown } from 'lucide-react';
import { useScannerStore } from '../../store/scannerStore';
import { getSeverityColor, getSeverityIcon } from '../../utils/scannerUtils';

export default function FindingsList() {
  const { findings, selectedFinding, setSelectedFinding } = useScannerStore();
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [severityFilter, setSeverityFilter] = React.useState('all');

  // Group findings by severity
  const groupedFindings = useMemo(() => {
    const filtered = findings.filter(f => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      return true;
    });

    return filtered.reduce((acc, finding) => {
      const severity = finding.severity;
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(finding);
      return acc;
    }, {});
  }, [findings, severityFilter]);

  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];

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

  return (
    <div className="w-1/2 border-r border-dark-800 flex flex-col">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Findings ({findings.length})</h3>
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-dark-500" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-dark-800 border border-dark-700 rounded px-3 py-1.5 text-sm text-dark-200 hover:border-dark-600 focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-auto">
        {findings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            <div className="text-center">
              <Search size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No findings yet</p>
              <p className="text-sm mt-2">Start a scan to discover vulnerabilities</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {severityOrder.map(severity => {
              const severityFindings = groupedFindings[severity];
              if (!severityFindings || severityFindings.length === 0) return null;

              const SeverityIcon = getSeverityIcon(severity);

              return (
                <div key={severity} className="space-y-2">
                  {/* Severity Header */}
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getSeverityColor(severity)} border`}>
                    <SeverityIcon size={16} />
                    <span className="font-semibold text-sm uppercase">{severity}</span>
                    <span className="text-xs opacity-75">({severityFindings.length})</span>
                  </div>

                  {/* Findings */}
                  {severityFindings.map((finding) => (
                    <div
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding)}
                      className={`card p-4 cursor-pointer hover:border-primary-500 transition-all ${
                        selectedFinding?.id === finding.id ? 'border-primary-500 bg-primary-900/5 ring-1 ring-primary-500/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-dark-100 flex-1">{finding.template}</h4>
                      </div>
                      
                      <p className="text-sm text-dark-400 mb-3 line-clamp-2">{finding.description}</p>
                      
                      <div className="text-xs text-dark-500 mb-3 font-mono break-all bg-dark-950 rounded p-2">
                        {finding.url}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dark-600">
                          {new Date(finding.timestamp).toLocaleTimeString()}
                        </span>
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
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
