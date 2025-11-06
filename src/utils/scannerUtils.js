import { AlertTriangle, AlertCircle, Info, Shield, Zap } from 'lucide-react';

/**
 * Get severity color classes
 */
export function getSeverityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'text-red-500 bg-red-900/30 border-red-900/50';
    case 'high':
      return 'text-orange-500 bg-orange-900/30 border-orange-900/50';
    case 'medium':
      return 'text-yellow-500 bg-yellow-900/30 border-yellow-900/50';
    case 'low':
      return 'text-blue-500 bg-blue-900/30 border-blue-900/50';
    case 'info':
      return 'text-gray-500 bg-gray-900/30 border-gray-900/50';
    default:
      return 'text-dark-400 bg-dark-800 border-dark-700';
  }
}

/**
 * Get severity icon
 */
export function getSeverityIcon(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return AlertTriangle;
    case 'high':
      return AlertCircle;
    case 'medium':
      return Info;
    case 'low':
      return Shield;
    case 'info':
      return Info;
    default:
      return Info;
  }
}

/**
 * Get severity priority for sorting
 */
export function getSeverityPriority(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical': return 5;
    case 'high': return 4;
    case 'medium': return 3;
    case 'low': return 2;
    case 'info': return 1;
    default: return 0;
  }
}

/**
 * Sort findings by severity
 */
export function sortFindingsBySeverity(findings) {
  return [...findings].sort((a, b) => {
    return getSeverityPriority(b.severity) - getSeverityPriority(a.severity);
  });
}

/**
 * Group templates by category
 */
export function groupTemplatesByCategory(templates) {
  const categories = {};
  
  Object.entries(templates).forEach(([path, template]) => {
    // Extract category from path (e.g., "cves/2021/..." -> "CVEs")
    const parts = path.split('/');
    let category = 'Other';
    
    if (parts[0]) {
      category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    
    // Map common categories
    const categoryMap = {
      'Cves': 'CVEs',
      'Vulnerabilities': 'Vulnerabilities',
      'Exposures': 'Exposures',
      'Misconfigurations': 'Misconfigurations',
      'Technologies': 'Technologies',
      'Takeovers': 'Takeovers',
      'Fuzzing': 'Fuzzing',
      'Workflows': 'Workflows'
    };
    
    category = categoryMap[category] || category;
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    categories[category].push({ path, template });
  });
  
  return categories;
}

/**
 * Filter templates
 */
export function filterTemplates(templates, searchTerm, severityFilter, categoryFilter) {
  return Object.entries(templates).filter(([path, template]) => {
    // Search filter
    const matchesSearch = !searchTerm || 
      template.info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.info.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.info.tags?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      path.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Severity filter
    const matchesSeverity = severityFilter === 'all' || 
      template.info.severity?.toLowerCase() === severityFilter.toLowerCase();
    
    // Category filter
    let matchesCategory = true;
    if (categoryFilter && categoryFilter !== 'all') {
      const parts = path.split('/');
      const pathCategory = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1);
      matchesCategory = pathCategory === categoryFilter;
    }
    
    return matchesSearch && matchesSeverity && matchesCategory;
  });
}

/**
 * Get template statistics
 */
export function getTemplateStats(templates) {
  const stats = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };
  
  Object.values(templates).forEach(template => {
    stats.total++;
    const severity = template.info.severity?.toLowerCase();
    if (stats[severity] !== undefined) {
      stats[severity]++;
    }
  });
  
  return stats;
}
