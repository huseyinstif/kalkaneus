import { create } from 'zustand';
import apiService from '../services/api';

export const useScannerStore = create((set, get) => ({
  // State
  templates: {},
  templatesDir: null,
  selectedTemplates: [],
  findings: [],
  isScanning: false,
  isPaused: false,
  scanProgress: 0,
  scanStats: { total: 0, vulnerable: 0, safe: 0, errors: 0 },
  isLoadingTemplates: false,
  scanTarget: '',
  selectedFinding: null,
  
  // Actions
  setTemplates: (templates) => set({ templates }),
  
  setSelectedTemplates: (templates) => set({ selectedTemplates: templates }),
  
  toggleTemplate: (templatePath) => set((state) => ({
    selectedTemplates: state.selectedTemplates.includes(templatePath)
      ? state.selectedTemplates.filter(p => p !== templatePath)
      : [...state.selectedTemplates, templatePath]
  })),
  
  selectAllTemplates: () => set((state) => ({
    selectedTemplates: Object.keys(state.templates)
  })),
  
  deselectAllTemplates: () => set({ selectedTemplates: [] }),
  
  setScanTarget: (target) => set({ scanTarget: target }),
  
  setSelectedFinding: (finding) => set({ selectedFinding: finding }),
  
  addFinding: (finding) => set((state) => ({
    findings: [...state.findings, finding]
  })),
  
  clearFindings: () => set({ findings: [], selectedFinding: null }),
  
  updateScanProgress: (progress) => set({ scanProgress: progress }),
  
  updateScanStats: (stats) => set({ scanStats: stats }),
  
  setIsScanning: (isScanning) => set({ isScanning }),
  
  setIsPaused: (isPaused) => set({ isPaused }),
  
  // Load templates
  loadTemplates: async () => {
    set({ isLoadingTemplates: true });
    try {
      const result = await apiService.scanner.loadTemplates();
      if (result.success) {
        set({ 
          templates: result.templates,
          templatesDir: result.templatesDir,
          selectedTemplates: Object.keys(result.templates),
          isLoadingTemplates: false
        });
        return result;
      } else {
        set({ isLoadingTemplates: false });
        return result;
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      set({ isLoadingTemplates: false });
      return { success: false, error: error.message };
    }
  },
  
  // Export findings
  exportFindings: () => {
    const { findings } = get();
    const data = JSON.stringify(findings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Get template stats
  getTemplateStats: () => {
    const { templates } = get();
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
      const severity = template.info.severity.toLowerCase();
      if (stats[severity] !== undefined) {
        stats[severity]++;
      }
    });
    
    return stats;
  },
  
  // Get findings by severity
  getFindingsBySeverity: () => {
    const { findings } = get();
    return findings.reduce((acc, finding) => {
      const severity = finding.severity;
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(finding);
      return acc;
    }, {});
  }
}));
