import fs from 'fs/promises';
import path from 'path';
import { app, dialog } from 'electron';

export class ProjectManager {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.currentProject = null;
    this.projectPath = null;
    this.hasUnsavedChanges = false;
    this.isTempProject = false;
  }

  // Create new project
  async createNewProject(projectName = 'Untitled Project') {
    this.currentProject = {
      projectName,
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      data: {
        httpHistory: [],
        websocketHistory: [],
        websocketMessages: [],
        interceptFilters: {
          excludedHosts: [],
          excludedUrls: []
        },
        matchReplaceRules: [],
        repeaterTabs: [],
        intruderTabs: [],
        intruderAttacks: [],
        intruderResults: [],
        extensions: [],
        proxySettings: {},
        scannerTemplates: []
      }
    };
    
    this.projectPath = null;
    this.hasUnsavedChanges = false;
    this.isTempProject = false;
    
    // Clear database
    await this.clearAllData();
    
    return this.currentProject;
  }

  // Create temporary project
  async createTempProject() {
    await this.createNewProject('Temporary Project');
    this.isTempProject = true;
    return this.currentProject;
  }

  // Save project
  async saveProject(savePath = null) {
    if (!this.currentProject) {
      throw new Error('No project to save');
    }

    // If no path provided, show save dialog
    if (!savePath && !this.projectPath) {
      const result = await dialog.showSaveDialog({
        title: 'Save Project',
        defaultPath: path.join(app.getPath('documents'), `${this.currentProject.projectName}.klk`),
        filters: [
          { name: 'Kalkaneus Project', extensions: ['klk'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return null;
      }

      savePath = result.filePath;
    }

    const finalPath = savePath || this.projectPath;

    // Collect current data from database
    const projectData = {
      ...this.currentProject,
      lastModified: Date.now(),
      data: {
        httpHistory: await this.dbManager.getAllRequests(),
        websocketHistory: await this.dbManager.getWebSocketHistory(),
        websocketMessages: this.dbManager.data.websocketMessages || [],
        interceptFilters: this.dbManager.getInterceptFilters(),
        matchReplaceRules: await this.dbManager.getMatchReplaceRules(),
        repeaterTabs: this.currentProject?.data?.repeaterTabs || [],
        intruderTabs: this.currentProject?.data?.intruderTabs || [],
        intruderAttacks: this.dbManager.data.intruderAttacks || [],
        intruderResults: this.dbManager.data.intruderResults || [],
        extensions: this.dbManager.data.extensions || [],
        proxySettings: this.dbManager.data.settings || {},
        scannerTemplates: this.currentProject?.data?.scannerTemplates || []
      }
    };

    // Write to file
    await fs.writeFile(
      finalPath,
      JSON.stringify(projectData, null, 2),
      'utf-8'
    );

    this.projectPath = finalPath;
    this.hasUnsavedChanges = false;
    this.isTempProject = false;
    this.currentProject = projectData;

    return finalPath;
  }

  // Load project
  async loadProject(loadPath = null) {
    // If no path provided, show open dialog
    if (!loadPath) {
      const result = await dialog.showOpenDialog({
        title: 'Load Project',
        defaultPath: app.getPath('documents'),
        filters: [
          { name: 'Kalkaneus Project', extensions: ['klk'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      loadPath = result.filePaths[0];
    }

    // Read project file
    const fileContent = await fs.readFile(loadPath, 'utf-8');
    const projectData = JSON.parse(fileContent);

    // Validate project structure
    if (!projectData.projectName || !projectData.data) {
      throw new Error('Invalid project file');
    }

    // Clear current data
    await this.clearAllData();

    // Load data into database
    if (projectData.data.httpHistory) {
      // Directly load history to preserve all fields (flag, comment, etc.)
      this.dbManager.data.httpHistory = projectData.data.httpHistory;
      this.dbManager.saveData();
    }

    if (projectData.data.websocketHistory) {
      this.dbManager.data.websocketHistory = projectData.data.websocketHistory;
      this.dbManager.saveData();
    }

    if (projectData.data.websocketMessages) {
      this.dbManager.data.websocketMessages = projectData.data.websocketMessages;
      this.dbManager.saveData();
    }

    if (projectData.data.interceptFilters) {
      this.dbManager.data.interceptFilters = projectData.data.interceptFilters;
      this.dbManager.saveData();
    }

    if (projectData.data.matchReplaceRules) {
      this.dbManager.data.matchReplaceRules = projectData.data.matchReplaceRules;
      this.dbManager.saveData();
    }

    if (projectData.data.intruderAttacks) {
      this.dbManager.data.intruderAttacks = projectData.data.intruderAttacks;
      this.dbManager.saveData();
    }

    if (projectData.data.intruderResults) {
      this.dbManager.data.intruderResults = projectData.data.intruderResults;
      this.dbManager.saveData();
    }

    if (projectData.data.extensions) {
      this.dbManager.data.extensions = projectData.data.extensions;
      this.dbManager.saveData();
    }

    // Load proxy settings
    if (projectData.data.proxySettings) {
      this.dbManager.data.settings = projectData.data.proxySettings;
      this.dbManager.saveData();
    }

    // Scanner templates will be loaded from file system, not from project
    // But we keep them in project for reference

    this.currentProject = projectData;
    this.projectPath = loadPath;
    this.hasUnsavedChanges = false;
    this.isTempProject = false;

    return projectData;
  }

  // Clear all data
  async clearAllData() {
    await this.dbManager.clearHistory();
    await this.dbManager.clearWebSocketHistory();
    this.dbManager.data.websocketMessages = [];
    this.dbManager.data.matchReplaceRules = [];
    this.dbManager.data.interceptFilters = { excludedHosts: [], excludedUrls: [] };
    this.dbManager.data.intruderAttacks = [];
    this.dbManager.data.intruderResults = [];
    this.dbManager.data.extensions = [];
    this.dbManager.data.settings = {};
    this.dbManager.saveData();
  }

  // Mark project as modified
  markAsModified() {
    if (!this.isTempProject) {
      this.hasUnsavedChanges = true;
    }
  }

  // Get project info
  getProjectInfo() {
    return {
      currentProject: this.currentProject,
      projectPath: this.projectPath,
      hasUnsavedChanges: this.hasUnsavedChanges,
      isTempProject: this.isTempProject
    };
  }

  // Check if should prompt save
  shouldPromptSave() {
    return this.hasUnsavedChanges && !this.isTempProject;
  }

  // Export project as JSON
  async exportProject() {
    if (!this.currentProject) {
      throw new Error('No project to export');
    }

    const result = await dialog.showSaveDialog({
      title: 'Export Project',
      defaultPath: path.join(app.getPath('documents'), `${this.currentProject.projectName}_export.json`),
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return null;
    }

    const projectData = {
      ...this.currentProject,
      data: {
        httpHistory: await this.dbManager.getAllRequests(),
        websocketHistory: await this.dbManager.getWebSocketHistory(),
        interceptFilters: this.dbManager.getInterceptFilters(),
        matchReplaceRules: await this.dbManager.getMatchReplaceRules()
      }
    };

    await fs.writeFile(
      result.filePath,
      JSON.stringify(projectData, null, 2),
      'utf-8'
    );

    return result.filePath;
  }
}
