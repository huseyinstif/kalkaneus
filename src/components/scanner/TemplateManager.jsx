import React, { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, Plus, Edit2, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { useScannerStore } from '../../store/scannerStore';
import { groupTemplatesByCategory, filterTemplates, getSeverityColor } from '../../utils/scannerUtils';
import { toast } from '../common/Toast';
import TemplateInfo from './TemplateInfo';

export default function TemplateManager({ onEditTemplate, onNewTemplate }) {
  const { 
    templates,
    templatesDir,
    selectedTemplates, 
    toggleTemplate, 
    selectAllTemplates, 
    deselectAllTemplates,
    loadTemplates,
    isLoadingTemplates 
  } = useScannerStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['all']));

  // Group and filter templates
  const categorizedTemplates = useMemo(() => {
    const filtered = filterTemplates(templates, searchTerm, severityFilter, categoryFilter);
    return groupTemplatesByCategory(Object.fromEntries(filtered));
  }, [templates, searchTerm, severityFilter, categoryFilter]);

  const categories = Object.keys(categorizedTemplates).sort();

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectCategoryTemplates = (category) => {
    const categoryPaths = categorizedTemplates[category].map(t => t.path);
    categoryPaths.forEach(path => {
      if (!selectedTemplates.includes(path)) {
        toggleTemplate(path);
      }
    });
  };

  const deselectCategoryTemplates = (category) => {
    const categoryPaths = categorizedTemplates[category].map(t => t.path);
    categoryPaths.forEach(path => {
      if (selectedTemplates.includes(path)) {
        toggleTemplate(path);
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Search and Filters */}
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
          className="input w-40"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-40"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className="flex items-center space-x-2">
          <button
            onClick={selectAllTemplates}
            className="btn btn-secondary btn-sm"
          >
            Select All
          </button>
          <button
            onClick={deselectAllTemplates}
            className="btn btn-secondary btn-sm"
          >
            Deselect All
          </button>
        </div>

        <button
          onClick={async () => {
            const result = await loadTemplates();
            if (result?.success) {
              const templateCount = Object.keys(result.templates).length;
              const categories = new Set();
              Object.keys(result.templates).forEach(path => {
                const category = path.split('/')[0];
                categories.add(category);
              });
              toast.success(
                `✅ Loaded ${templateCount} templates from ${categories.size} categories`,
                null,
                4000
              );
            } else if (result?.error) {
              toast.error('Failed to load templates: ' + result.error);
            }
          }}
          disabled={isLoadingTemplates}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw size={16} className={isLoadingTemplates ? 'animate-spin' : ''} />
          <span>{isLoadingTemplates ? 'Loading...' : 'Refresh Templates'}</span>
        </button>

        <button
          onClick={onNewTemplate}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>New</span>
        </button>
      </div>

      {/* Template Info */}
      <TemplateInfo templates={templates} templatesDir={templatesDir} />

      {/* Templates by Category */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          {categories.map(category => {
            const categoryTemplates = categorizedTemplates[category];
            const isExpanded = expandedCategories.has(category);
            const selectedCount = categoryTemplates.filter(t => 
              selectedTemplates.includes(t.path)
            ).length;

            return (
              <div key={category} className="card p-4">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center space-x-2 flex-1 text-left hover:text-primary-400 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <span className="font-semibold text-lg">{category}</span>
                    <span className="text-sm text-dark-500">
                      ({selectedCount}/{categoryTemplates.length})
                    </span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => selectCategoryTemplates(category)}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      Select All
                    </button>
                    <span className="text-dark-700">|</span>
                    <button
                      onClick={() => deselectCategoryTemplates(category)}
                      className="text-xs text-dark-500 hover:text-dark-300"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Templates Grid */}
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {categoryTemplates.map(({ path, template }) => (
                      <div
                        key={path}
                        className={`bg-dark-850 rounded-lg p-3 border transition-all ${
                          selectedTemplates.includes(path)
                            ? 'border-primary-500 bg-primary-900/10'
                            : 'border-dark-700 hover:border-dark-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 truncate">
                              {template.info.name}
                            </h4>
                            <p className="text-xs text-dark-600 truncate">{path}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedTemplates.includes(path)}
                            onChange={() => toggleTemplate(path)}
                            className="mt-1 flex-shrink-0"
                          />
                        </div>

                        <p className="text-xs text-dark-400 mb-2 line-clamp-2 min-h-[2rem]">
                          {template.info.description || 'No description'}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(template.info.severity)}`}>
                            {template.info.severity?.toUpperCase() || 'UNKNOWN'}
                          </span>
                          <button
                            onClick={() => onEditTemplate(path)}
                            className="text-primary-400 hover:text-primary-300 text-xs flex items-center space-x-1"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>

                        {template.info.tags && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {template.info.tags.split(',').slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-dark-900 rounded text-xs text-dark-500"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
