import React, { useState, useEffect } from 'react';
import { toast } from '../common/Toast';

const DEFAULT_RULES = [
  {
    id: 1,
    enabled: true,
    type: 'Request header',
    match: 'User-Agent',
    replace: 'CustomAgent/1.0',
    isRegex: false,
    comment: 'Replace User-Agent'
  },
  {
    id: 2,
    enabled: false,
    type: 'Request header',
    match: 'Referer',
    replace: 'https://google.com',
    isRegex: false,
    comment: 'Set Referer'
  },
  {
    id: 3,
    enabled: false,
    type: 'Request header',
    match: 'X-Forwarded-For',
    replace: '127.0.0.1',
    isRegex: false,
    comment: 'Spoof IP'
  },
  {
    id: 4,
    enabled: false,
    type: 'Response header',
    match: 'X-Frame-Options',
    replace: '',
    isRegex: false,
    comment: 'Remove X-Frame-Options'
  },
  {
    id: 5,
    enabled: false,
    type: 'Response header',
    match: 'Content-Security-Policy',
    replace: '',
    isRegex: false,
    comment: 'Remove CSP'
  },
  {
    id: 6,
    enabled: false,
    type: 'Request body',
    match: 'test@example.com',
    replace: 'admin@example.com',
    isRegex: false,
    comment: 'Replace email'
  },
  {
    id: 7,
    enabled: false,
    type: 'Response body',
    match: '"role":"user"',
    replace: '"role":"admin"',
    isRegex: false,
    comment: 'Elevate privileges'
  },
  {
    id: 8,
    enabled: false,
    type: 'Request param value',
    match: 'id',
    replace: '1 OR 1=1',
    isRegex: false,
    comment: 'SQL Injection test'
  }
];

const RULE_TYPES = [
  'Request header',
  'Request body',
  'Response header',
  'Response body',
  'Request first line',
  'Response first line',
  'Request param name',
  'Request param value',
];

const PRESET_RULES = [
  { type: 'Request header', match: 'User-Agent', replace: 'Kalkaneus/1.0', comment: 'Custom User-Agent' },
  { type: 'Request header', match: 'Accept-Encoding', replace: 'identity', comment: 'Disable compression' },
  { type: 'Response header', match: 'X-Frame-Options', replace: '', comment: 'Remove X-Frame-Options' },
  { type: 'Response header', match: 'Content-Security-Policy', replace: '', comment: 'Remove CSP' },
  { type: 'Response header', match: 'Access-Control-Allow-Origin', replace: '*', comment: 'Allow CORS' },
];

export default function ProxyMatchReplaceTab() {
  const [rules, setRules] = useState(() => {
    try {
      const saved = localStorage.getItem('proxy-match-replace-rules');
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch (error) {
      console.error('Failed to load match & replace rules:', error);
      return DEFAULT_RULES;
    }
  });
  
  const [editingRule, setEditingRule] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('proxy-match-replace-rules', JSON.stringify(rules));
      
      if (window.electronAPI?.proxy) {
        window.electronAPI.proxy.updateMatchReplaceRules(rules);
      }
    } catch (error) {
      console.error('Failed to save match & replace rules:', error);
    }
  }, [rules]);

  // Listen for project updates
  useEffect(() => {
    const handleProjectUpdate = (event) => {
      const project = event.detail;
      if (project?.data?.matchReplaceRules) {
        setRules(project.data.matchReplaceRules);
        localStorage.setItem('proxy-match-replace-rules', JSON.stringify(project.data.matchReplaceRules));
      }
    };

    window.addEventListener('project:updated', handleProjectUpdate);
    return () => window.removeEventListener('project:updated', handleProjectUpdate);
  }, []);

  const addRule = () => {
    setEditingRule({
      id: Date.now(),
      enabled: true,
      type: 'Request header',
      match: '',
      replace: '',
      isRegex: false,
      comment: ''
    });
    setShowAddForm(true);
  };

  const saveRule = () => {
    if (editingRule.id && rules.find(r => r.id === editingRule.id)) {
      setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
    } else {
      setRules([...rules, editingRule]);
    }
    setEditingRule(null);
    setShowAddForm(false);
  };

  const deleteRule = (id) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const toggleRule = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const editRule = (rule) => {
    setEditingRule({ ...rule });
    setShowAddForm(true);
  };

  const loadPresets = () => {
    const existingComments = rules.map(r => r.comment);
    const newPresets = PRESET_RULES.filter(preset => !existingComments.includes(preset.comment));
    
    if (newPresets.length === 0) {
      toast.info('Presets already loaded');
      return;
    }
    
    const newRules = newPresets.map((preset, idx) => ({
      id: Date.now() + idx,
      enabled: false,
      isRegex: false,
      ...preset
    }));
    setRules([...rules, ...newRules]);
    toast.success(`Loaded ${newPresets.length} preset rules`);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Match & Replace Rules</h3>
            <p className="text-sm text-dark-400 mt-1">
              Automatically modify requests and responses
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={loadPresets} className="btn btn-secondary btn-sm">
              Load Presets
            </button>
            <button onClick={addRule} className="btn btn-primary btn-sm">
              Add Rule
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">Enabled</th>
                <th className="w-32">Type</th>
                <th>Match</th>
                <th>Replace</th>
                <th className="w-20">Regex</th>
                <th>Comment</th>
                <th className="w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-dark-500 py-8">
                    No rules defined. Click "Add Rule" to create one.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className={!rule.enabled ? 'opacity-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(rule.id)}
                        className="rounded"
                      />
                    </td>
                    <td>
                      <span className="text-xs px-2 py-1 rounded bg-dark-800">
                        {rule.type}
                      </span>
                    </td>
                    <td className="font-mono text-sm">{rule.match || '-'}</td>
                    <td className="font-mono text-sm">{rule.replace || '-'}</td>
                    <td>
                      {rule.isRegex && (
                        <span className="text-xs px-2 py-1 rounded bg-primary-900/30 text-primary-400">
                          Regex
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-dark-400">{rule.comment}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => editRule(rule)}
                          className="text-primary-400 hover:text-primary-300 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">
              {rules.find(r => r.id === editingRule.id) ? 'Edit Rule' : 'Add Rule'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  value={editingRule.type}
                  onChange={(e) => setEditingRule({ ...editingRule, type: e.target.value })}
                  className="input w-full"
                >
                  {RULE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Match</label>
                <input
                  type="text"
                  value={editingRule.match}
                  onChange={(e) => setEditingRule({ ...editingRule, match: e.target.value })}
                  className="input w-full font-mono"
                  placeholder="Text or regex to match"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Replace</label>
                <input
                  type="text"
                  value={editingRule.replace}
                  onChange={(e) => setEditingRule({ ...editingRule, replace: e.target.value })}
                  className="input w-full font-mono"
                  placeholder="Replacement text"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingRule.isRegex}
                    onChange={(e) => setEditingRule({ ...editingRule, isRegex: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Use regex</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Comment (optional)</label>
                <input
                  type="text"
                  value={editingRule.comment}
                  onChange={(e) => setEditingRule({ ...editingRule, comment: e.target.value })}
                  className="input w-full"
                  placeholder="Description of this rule"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setEditingRule(null);
                  setShowAddForm(false);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveRule}
                className="btn btn-primary"
                disabled={!editingRule.match}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
