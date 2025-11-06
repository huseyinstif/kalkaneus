import { app, BrowserWindow, ipcMain, session, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ProxyManager } from './proxy/proxyManager.js';
import { DatabaseManager } from './database/databaseManager_simple.js';
import { ProjectManager } from './project/projectManager.js';
import { KalkaneusEngine } from './scanner/kalkaneusEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let proxyManager;
let dbManager;
let projectManager;
let scannerEngine;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1400,
    minHeight: 700,
    icon: path.join(__dirname, '../src/images/logo.png'),
    autoHideMenuBar: true, // Menu bar'ı gizle
    frame: false, // Frame'i kaldır (title bar dahil)
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // CORS bypass for scanner
      webviewTag: true, // Enable webview for Collaborator
    },
    backgroundColor: '#0f172a',
    show: false,
  });
  
  // Maximize window on start
  mainWindow.maximize();

  // Disable CORS for scanner
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { Origin: '*', ...details.requestHeaders } });
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['*'],
        'Access-Control-Allow-Headers': ['*'],
        ...details.responseHeaders,
      },
    });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Ignore certificate errors for webview (Collaborator)
  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  // Suppress webview notifications (we'll use custom toast notifications)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      callback(false); // Deny notification permission
    } else {
      callback(true);
    }
  });

  // Check if running in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp() {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'kalkaneus.db');
  dbManager = new DatabaseManager(dbPath);
  dbManager.initialize();

  // Initialize project manager
  projectManager = new ProjectManager(dbManager);

  // Initialize scanner engine
  scannerEngine = new KalkaneusEngine();

  // Block notifications for webview partition
  const collaboratorSession = session.fromPartition('persist:collaborator');
  collaboratorSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      callback(false); // Block notifications
    } else {
      callback(true);
    }
  });

  // Create window first
  createWindow();
  
  // Initialize proxy manager with mainWindow
  proxyManager = new ProxyManager(dbManager, mainWindow);
  
  // Setup IPC handlers
  setupIpcHandlers();
}

let handlersRegistered = false;

function setupIpcHandlers() {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;
  
  // Proxy control
  ipcMain.handle('proxy:start', async (event, config) => {
    try {
      await proxyManager.start(config);
      
      // Set Electron session proxy
      if (config.setElectronProxy) {
        await session.defaultSession.setProxy({
          proxyRules: `http://127.0.0.1:${config.port}`,
          proxyBypassRules: '<local>'
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('proxy:stop', async () => {
    try {
      await proxyManager.stop();
      
      // Clear Electron session proxy
      await session.defaultSession.setProxy({ proxyRules: '' });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('proxy:getStatus', () => {
    return proxyManager.getStatus();
  });

  ipcMain.handle('proxy:getConfig', () => {
    return proxyManager.getConfig();
  });

  ipcMain.handle('proxy:updateConfig', async (event, config) => {
    try {
      await proxyManager.updateConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('proxy:updateMatchReplaceRules', async (event, rules) => {
    try {
      proxyManager.updateMatchReplaceRules(rules);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('proxy:updateSettings', async (event, settings) => {
    try {
      // Save settings to project
      if (projectManager && projectManager.currentProject) {
        projectManager.currentProject.proxySettings = settings;
        projectManager.markAsModified();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Intercept control
  ipcMain.handle('intercept:forward', (event, requestId) => {
    return proxyManager.forwardRequest(requestId);
  });

  ipcMain.handle('intercept:drop', (event, requestId) => {
    return proxyManager.dropRequest(requestId);
  });

  ipcMain.handle('intercept:modify', (event, requestId, modifiedRequest) => {
    return proxyManager.modifyAndForward(requestId, modifiedRequest);
  });

  ipcMain.handle('intercept:markForResponseInterception', (event, requestId) => {
    return proxyManager.markForResponseInterception(requestId);
  });

  ipcMain.handle('intercept:getPendingResponses', () => {
    return proxyManager.getPendingResponses();
  });

  ipcMain.handle('intercept:forwardResponse', (event, requestId) => {
    return proxyManager.forwardResponse(requestId);
  });

  ipcMain.handle('intercept:modifyResponse', (event, requestId, modifiedResponse) => {
    return proxyManager.modifyAndForwardResponse(requestId, modifiedResponse);
  });

  // Intercept Filters
  ipcMain.handle('intercept:addExcludedHost', (event, host) => {
    return proxyManager.addExcludedHost(host);
  });

  ipcMain.handle('intercept:addExcludedUrl', (event, url) => {
    return proxyManager.addExcludedUrl(url);
  });

  ipcMain.handle('intercept:removeExcludedHost', (event, host) => {
    return proxyManager.removeExcludedHost(host);
  });

  ipcMain.handle('intercept:removeExcludedUrl', (event, url) => {
    return proxyManager.removeExcludedUrl(url);
  });

  ipcMain.handle('intercept:getFilters', () => {
    return proxyManager.getInterceptFilters();
  });

  ipcMain.handle('intercept:clearFilters', () => {
    return proxyManager.clearInterceptFilters();
  });

  // History & Database
  ipcMain.handle('history:getAll', (event, filters) => {
    return dbManager.getHistory(filters);
  });

  ipcMain.handle('history:getById', (event, id) => {
    return dbManager.getHistoryById(id);
  });

  ipcMain.handle('history:delete', (event, id) => {
    return dbManager.deleteRequest(id);
  });

  ipcMain.handle('history:clear', () => {
    return dbManager.clearHistory();
  });

  ipcMain.handle('history:export', (event, format) => {
    return dbManager.exportHistory(format);
  });

  ipcMain.handle('history:updateFlag', (event, id, flag) => {
    return dbManager.updateRequestFlag(id, flag);
  });

  ipcMain.handle('history:updateComment', (event, id, comment) => {
    return dbManager.updateRequestComment(id, comment);
  });

  // WebSocket
  ipcMain.handle('websocket:getHistory', () => {
    return dbManager.getWebSocketHistory();
  });

  ipcMain.handle('websocket:getMessages', (event, wsId) => {
    return dbManager.getWebSocketMessages(wsId);
  });

  ipcMain.handle('websocket:clear', () => {
    return dbManager.clearWebSocketHistory();
  });

  // Repeater
  ipcMain.handle('repeater:send', async (event, request) => {
    return proxyManager.sendRequest(request);
  });

  // Intruder
  ipcMain.handle('intruder:start', async (event, config) => {
    return proxyManager.startIntruder(config);
  });

  ipcMain.handle('intruder:stop', (event, attackId) => {
    return proxyManager.stopIntruder(attackId);
  });

  ipcMain.handle('intruder:getResults', (event, attackId) => {
    return dbManager.getIntruderResults(attackId);
  });

  // Match & Replace
  ipcMain.handle('matchreplace:getRules', () => {
    return dbManager.getMatchReplaceRules();
  });

  ipcMain.handle('matchreplace:saveRule', (event, rule) => {
    return dbManager.saveMatchReplaceRule(rule);
  });

  ipcMain.handle('matchreplace:deleteRule', (event, ruleId) => {
    return dbManager.deleteMatchReplaceRule(ruleId);
  });

  // CA Certificate
  ipcMain.handle('ca:getInfo', () => {
    return proxyManager.getCertificateInfo();
  });

  ipcMain.handle('ca:export', async (event, format) => {
    try {
      // Ensure certificate exists first
      await proxyManager.certificateManager.ensureCertificate();
      
      const certData = proxyManager.exportCertificate(format);
      
      if (!certData || !certData.content) {
        throw new Error('Certificate data is empty');
      }
      
      // Show save dialog
      const { dialog } = await import('electron');
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save CA Certificate',
        defaultPath: certData.filename,
        filters: [
          { name: 'Certificate Files', extensions: [format] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, certData.content);
        return { success: true, path: result.filePath };
      }
      
      return { success: false, canceled: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ca:regenerate', async () => {
    return proxyManager.regenerateCertificate();
  });

  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  // Shell - Open external links
  ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Dialog
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    try {
      return await dialog.showOpenDialog(options);
    } catch (error) {
      return { canceled: true, error: error.message };
    }
  });

  // Scanner stop
  ipcMain.handle('scanner:stop', async () => {
    // Scanner stop logic (if needed)
    return { success: true };
  });

  // Open Browser
  ipcMain.handle('proxy:openBrowser', async (event, config) => {
    const { spawn } = await import('child_process');
    const path = await import('path');
    
    try {
      // Try to find Chromium/Chrome
      const chromePaths = process.platform === 'win32' 
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
          ]
        : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['google-chrome', 'chromium-browser', 'chromium'];

      let chromePath = null;
      const fs = await import('fs');
      
      for (const p of chromePaths) {
        if (typeof p === 'string' && fs.existsSync(p)) {
          chromePath = p;
          break;
        }
      }

      if (!chromePath && process.platform !== 'win32') {
        chromePath = 'google-chrome'; // Try PATH
      }

      if (!chromePath) {
        return { success: false, error: 'Chrome/Chromium not found' };
      }

      const userDataDir = path.join(app.getPath('userData'), 'chrome-profile');
      
      spawn(chromePath, [
        `--proxy-server=${config.proxyHost}:${config.proxyPort}`,
        `--user-data-dir=${userDataDir}`,
        '--ignore-certificate-errors',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        'about:blank'
      ], {
        detached: true,
        stdio: 'ignore'
      }).unref();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Extensions
  ipcMain.handle('extensions:list', () => {
    return dbManager.getExtensions();
  });

  ipcMain.handle('extensions:load', (event, extensionPath) => {
    return proxyManager.loadExtension(extensionPath);
  });

  ipcMain.handle('extensions:unload', (event, extensionId) => {
    return proxyManager.unloadExtension(extensionId);
  });

  // Project Management
  ipcMain.handle('project:new', async (event, projectName) => {
    try {
      const project = await projectManager.createNewProject(projectName);
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:temp', async () => {
    try {
      const project = await projectManager.createTempProject();
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:save', async (event, savePath) => {
    try {
      const path = await projectManager.saveProject(savePath);
      return { success: true, path };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:load', async (event, loadPath) => {
    try {
      const project = await projectManager.loadProject(loadPath);
      if (project) {
        // Get full project info
        const projectInfo = projectManager.getProjectInfo();
        // Notify renderer to refresh UI
        mainWindow.webContents.send('project:loaded', projectInfo);
        return { success: true, project: projectInfo };
      }
      return { success: false, error: 'No project selected' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:info', () => {
    return projectManager.getProjectInfo();
  });

  ipcMain.handle('project:export', async () => {
    try {
      const path = await projectManager.exportProject();
      return { success: true, path };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:markModified', () => {
    projectManager.markAsModified();
    return { success: true };
  });

  ipcMain.handle('project:updateRepeaterTabs', (event, tabs) => {
    if (projectManager.currentProject) {
      projectManager.currentProject.data.repeaterTabs = tabs;
      projectManager.markAsModified();
    }
    return { success: true };
  });

  ipcMain.handle('project:updateIntruderTabs', (event, tabs) => {
    if (projectManager.currentProject) {
      projectManager.currentProject.data.intruderTabs = tabs;
      projectManager.markAsModified();
    }
    return { success: true };
  });

  // Scanner handlers
  ipcMain.handle('scanner:test', async (event, template, targetUrl) => {
    try {
      const result = await scannerEngine.scanTemplate(template, targetUrl);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:loadTemplates', async () => {
    try {
      // Development: scanner-templates in project root
      // Production: scanner-templates next to executable or in resources
      let templatesDir;
      
      if (app.isPackaged) {
        // Production build - check multiple possible locations
        const exeDir = path.dirname(app.getPath('exe'));
        const possiblePaths = [
          // 1. Next to executable (for portable/release)
          path.join(exeDir, 'scanner-templates'),
          // 2. In resources folder
          path.join(process.resourcesPath, 'scanner-templates'),
          // 3. In app.asar.unpacked
          path.join(process.resourcesPath, 'app.asar.unpacked', 'scanner-templates'),
          // 4. Relative to main.js
          path.join(__dirname, '../scanner-templates'),
        ];
        
        console.log('Searching for scanner-templates in:', possiblePaths);
        
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            templatesDir = p;
            console.log('Found scanner-templates at:', templatesDir);
            break;
          }
        }
        
        if (!templatesDir) {
          const error = `Scanner templates directory not found. Searched in:\n${possiblePaths.join('\n')}`;
          console.error(error);
          throw new Error(error);
        }
      } else {
        // Development
        templatesDir = path.join(__dirname, '../scanner-templates');
      }
      
      const templates = await loadTemplatesFromDirectory(templatesDir);
      return { success: true, templates, templatesDir };
    } catch (error) {
      console.error('Error loading templates:', error);
      return { success: false, error: error.message, templates: {} };
    }
  });
}

async function loadTemplatesFromDirectory(dir) {
  const yaml = await import('js-yaml');
  const templates = {};

  async function scanDirectory(currentDir, relativePath = '') {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, relPath);
      } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
        try {
          const content = await fs.promises.readFile(fullPath, 'utf8');
          const template = yaml.load(content);
          
          if (template && template.info) {
            templates[relPath] = {
              id: template.id || relPath.replace(/\.ya?ml$/, ''),
              path: relPath,
              info: template.info,
              http: template.http || [],
              requests: template.requests || [],
              content: content,
            };
          }
        } catch (error) {
          // Skip invalid templates
        }
      }
    }
  }

  try {
    await scanDirectory(dir);
  } catch (error) {
    // Skip if directory doesn't exist
  }

  return templates;
}

// Disable notifications globally
app.commandLine.appendSwitch('disable-notifications');

// App lifecycle
app.whenReady().then(initializeApp);

// Ignore certificate errors globally (for webview)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  if (proxyManager) {
    await proxyManager.stop();
  }
  if (dbManager) {
    dbManager.close();
  }
});


// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  // Log to file or error tracking service in production
});

process.on('unhandledRejection', (reason, promise) => {
  // Log to file or error tracking service in production
});
