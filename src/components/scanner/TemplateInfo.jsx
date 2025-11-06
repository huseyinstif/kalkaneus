import React from 'react';
import { Folder, FileText, Info, AlertCircle } from 'lucide-react';

export default function TemplateInfo({ templates, templatesDir }) {
  // Get category statistics
  const categoryStats = React.useMemo(() => {
    const stats = {};
    Object.keys(templates).forEach(path => {
      const category = path.split('/')[0];
      if (!stats[category]) {
        stats[category] = { count: 0, severities: {} };
      }
      stats[category].count++;
      
      const severity = templates[path].info?.severity || 'unknown';
      stats[category].severities[severity] = (stats[category].severities[severity] || 0) + 1;
    });
    return stats;
  }, [templates]);

  const totalTemplates = Object.keys(templates).length;
  const totalCategories = Object.keys(categoryStats).length;

  if (totalTemplates === 0) {
    return (
      <div className="card p-6 bg-dark-850 border-orange-900/30">
        <div className="flex items-start space-x-3">
          <AlertCircle className="text-orange-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-orange-400 mb-2">No Templates Found</h4>
            <p className="text-sm text-dark-400 mb-3">
              Templates should be placed in the <code className="bg-dark-900 px-2 py-1 rounded text-primary-400">scanner-templates</code> folder.
            </p>
            <div className="text-xs text-dark-500 space-y-1">
              <p>📁 Expected structure:</p>
              <pre className="bg-dark-900 rounded p-2 mt-2 text-dark-400">
{`scanner-templates/
  ├── cves/
  │   └── example.yaml
  ├── vulnerabilities/
  │   └── sql-injection.yaml
  └── your-category/
      └── your-template.yaml`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 bg-gradient-to-br from-dark-900 to-dark-850 border-primary-900/30 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Info className="text-primary-400" size={18} />
          <h4 className="font-semibold">Template Library</h4>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <FileText className="text-primary-400" size={14} />
            <span className="text-dark-400">{totalTemplates} Templates</span>
          </div>
          <div className="flex items-center space-x-2">
            <Folder className="text-primary-400" size={14} />
            <span className="text-dark-400">{totalCategories} Categories</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count).map(([category, stats]) => (
          <div key={category} className="bg-dark-950/50 rounded p-2 border border-dark-800">
            <div className="font-semibold text-primary-400 mb-1 capitalize">{category}</div>
            <div className="text-dark-500">{stats.count} templates</div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-dark-800 text-xs text-dark-500 space-y-1">
        <p>💡 Tip: Add new templates to <code className="bg-dark-900 px-1.5 py-0.5 rounded text-primary-400">scanner-templates/</code> folder and click "Refresh Templates"</p>
        {templatesDir && (
          <p className="text-dark-600">📂 Loaded from: <code className="bg-dark-900 px-1.5 py-0.5 rounded text-dark-400">{templatesDir}</code></p>
        )}
      </div>
    </div>
  );
}
