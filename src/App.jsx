import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import logo from './images/logo.png';
import FileMenu from './components/FileMenu';
import TextSelectionMenu from './components/common/TextSelectionMenu';
import ToastContainer from './components/common/Toast';
import StartupModal from './components/modals/StartupModal';
import Dashboard from './components/pages/Dashboard';
import ProxyPanel from './components/pages/ProxyPanel';
import IntruderPanel from './components/pages/IntruderPanel';
import RepeaterPanel from './components/pages/RepeaterPanel';
import ScannerPanel from './components/pages/ScannerPanel';
import DecoderPanel from './components/pages/DecoderPanel';
import ComparerPanel from './components/pages/ComparerPanel';
import CollaboratorPanel from './components/pages/CollaboratorPanel';
import LoggerPanel from './components/pages/LoggerPanel';
import SitemapPanel from './components/pages/SitemapPanel';
import LearnPanel from './components/pages/LearnPanel';
import { useProxyStore } from './store/proxyStore';
import { logElectronAPIStatus } from './utils/electronCheck';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showStartupModal, setShowStartupModal] = useState(true);
  const [projectInfo, setProjectInfo] = useState(null);
  const { status, fetchStatus } = useProxyStore();

  // Check if project is already initialized
  useEffect(() => {
    const checkProject = async () => {
      if (window.electronAPI?.project) {
        const info = await window.electronAPI.project.info();
        if (info?.currentProject) {
          setProjectInfo(info);
          setShowStartupModal(false);
        }
      }
    };
    checkProject();
  }, []);

  // Debug: Log electronAPI status on mount
  useEffect(() => {
    logElectronAPIStatus();
  }, []);

  // Handle external links
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href && (target.href.startsWith('http://') || target.href.startsWith('https://'))) {
        e.preventDefault();
        window.electronAPI?.shell?.openExternal(target.href);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    // Wait for electronAPI to be ready
    const checkAndFetch = () => {
      if (window.electronAPI) {
        fetchStatus();
      }
    };

    // Fetch initial proxy status
    checkAndFetch();

    // Poll status every 5 seconds
    const interval = setInterval(checkAndFetch, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Handle startup modal selection
  const handleStartupOption = async (option, data) => {
    try {
      if (option === 'temp') {
        const result = await window.electronAPI.project.temp();
        if (result.success) {
          // Get full project info
          const info = await window.electronAPI.project.info();
          setProjectInfo(info);
          // Clear UI state
          window.dispatchEvent(new CustomEvent('project:cleared'));
        }
      } else if (option === 'new') {
        const result = await window.electronAPI.project.new(data);
        if (result.success) {
          // Get full project info
          const info = await window.electronAPI.project.info();
          setProjectInfo(info);
          // Clear UI state
          window.dispatchEvent(new CustomEvent('project:cleared'));
        }
      } else if (option === 'load') {
        // Get full project info after load
        const info = await window.electronAPI.project.info();
        setProjectInfo(info);
        // UI will refresh via project:loaded event
      }
    } catch (error) {
      console.error('Error handling startup option:', error);
    }
  };

  // Listen for project loaded event
  useEffect(() => {
    if (!window.electronAPI?.project) return;

    const unsubscribe = window.electronAPI.project.onLoaded((projectInfo) => {
      setProjectInfo(projectInfo);
      // Refresh UI - could trigger re-fetch of data
      fetchStatus();
      
      // Dispatch window event for components
      window.dispatchEvent(new CustomEvent('project:loaded', { detail: projectInfo }));
    });

    return unsubscribe;
  }, [fetchStatus]);

  // Listen for project updated event (from FileMenu)
  useEffect(() => {
    const handleProjectUpdated = (event) => {
      setProjectInfo(event.detail);
    };

    window.addEventListener('project:updated', handleProjectUpdated);
    return () => window.removeEventListener('project:updated', handleProjectUpdated);
  }, []);

  // Listen for open startup modal event
  useEffect(() => {
    const handleOpenStartupModal = () => {
      setShowStartupModal(true);
    };

    window.addEventListener('open:startup-modal', handleOpenStartupModal);
    return () => window.removeEventListener('open:startup-modal', handleOpenStartupModal);
  }, []);

  // Listen for navigation events from context menu
  useEffect(() => {
    const handleSendToRepeater = (event) => {
      setActiveView('repeater');
      
      // Re-dispatch event after view change to ensure component is mounted
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('addRepeaterTab', { detail: event.detail }));
      }, 100);
    };

    const handleSendToIntruder = (event) => {
      setActiveView('intruder');
      
      // Re-dispatch event after view change
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('loadIntruderRequest', { detail: event.detail }));
      }, 100);
    };

    const handleChangeView = (event) => {
      setActiveView(event.detail);
    };

    // NoSwitch versions - don't change view
    const handleSendToRepeaterNoSwitch = (event) => {
      window.dispatchEvent(new CustomEvent('repeaterMounted', { detail: event.detail }));
    };

    const handleSendToIntruderNoSwitch = (event) => {
      window.dispatchEvent(new CustomEvent('intruderMounted', { detail: event.detail }));
    };

    window.addEventListener('sendToRepeater', handleSendToRepeater);
    window.addEventListener('sendToIntruder', handleSendToIntruder);
    window.addEventListener('sendToRepeaterNoSwitch', handleSendToRepeaterNoSwitch);
    window.addEventListener('sendToIntruderNoSwitch', handleSendToIntruderNoSwitch);
    window.addEventListener('changeView', handleChangeView);

    return () => {
      window.removeEventListener('sendToRepeater', handleSendToRepeater);
      window.removeEventListener('sendToIntruder', handleSendToIntruder);
      window.removeEventListener('sendToRepeaterNoSwitch', handleSendToRepeaterNoSwitch);
      window.removeEventListener('sendToIntruderNoSwitch', handleSendToIntruderNoSwitch);
      window.removeEventListener('changeView', handleChangeView);
    };
  }, []);

  const renderView = () => {
    return (
      <>
        <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }} className="h-full">
          <Dashboard />
        </div>
        <div style={{ display: activeView === 'proxy' ? 'block' : 'none' }} className="h-full">
          <ProxyPanel />
        </div>
        <div style={{ display: activeView === 'intruder' ? 'block' : 'none' }} className="h-full">
          <IntruderPanel />
        </div>
        <div style={{ display: activeView === 'repeater' ? 'block' : 'none' }} className="h-full">
          <RepeaterPanel />
        </div>
        <div style={{ display: activeView === 'scanner' ? 'block' : 'none' }} className="h-full">
          <ScannerPanel />
        </div>
        <div style={{ display: activeView === 'decoder' ? 'block' : 'none' }} className="h-full">
          <DecoderPanel />
        </div>
        <div style={{ display: activeView === 'comparer' ? 'block' : 'none' }} className="h-full">
          <ComparerPanel />
        </div>
        <div style={{ display: activeView === 'collaborator' ? 'block' : 'none' }} className="h-full">
          <CollaboratorPanel />
        </div>
        <div style={{ display: activeView === 'logger' ? 'block' : 'none' }} className="h-full">
          <LoggerPanel />
        </div>
        <div style={{ display: activeView === 'sitemap' ? 'block' : 'none' }} className="h-full">
          <SitemapPanel />
        </div>
        <div style={{ display: activeView === 'learn' ? 'block' : 'none' }} className="h-full">
          <LearnPanel />
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-dark-950 text-dark-100">
      {/* Custom Title Bar */}
      <div className="bg-dark-900 h-8 flex items-center justify-between px-2 select-none" style={{ WebkitAppRegion: 'drag' }}>
        <div className="flex items-center space-x-3">
          <img src={logo} alt="Kalkaneus" className="w-4 h-4 ml-2" />
          <span className="text-xs text-dark-400">Kalkaneus</span>
          <div className="w-px h-4 bg-dark-700"></div>
          <div style={{ WebkitAppRegion: 'no-drag' }}>
            <FileMenu projectInfo={projectInfo} />
          </div>
          {projectInfo?.isTempProject && (
            <span className="text-xs font-semibold text-amber-400">
              Temporary Project
            </span>
          )}
          {projectInfo?.currentProject && !projectInfo?.isTempProject && (
            <span className="text-xs text-dark-300 font-medium">
              {projectInfo.currentProject.projectName}
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => window.electronAPI?.window?.minimize()}
            className="w-8 h-8 flex items-center justify-center hover:bg-dark-800 text-dark-400 hover:text-dark-200"
          >
            <span className="text-lg leading-none">−</span>
          </button>
          <button
            onClick={() => window.electronAPI?.window?.maximize()}
            className="w-8 h-8 flex items-center justify-center hover:bg-dark-800 text-dark-400 hover:text-dark-200"
          >
            <span className="text-lg leading-none">□</span>
          </button>
          <button
            onClick={() => window.electronAPI?.window?.close()}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-600 text-dark-400 hover:text-white"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-dark-900 border-b border-dark-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img src={logo} alt="Kalkaneus Logo" className="w-8 h-8" />
                <h1 className="text-xl font-bold text-primary-400">Kalkaneus</h1>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`status-dot ${status.isRunning ? 'running' : 'stopped'}`}
                />
                <span className="text-sm text-dark-400">
                  {status.isRunning
                    ? `Proxy running on ${status.config?.host}:${status.config?.port}`
                    : 'Proxy stopped'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-dark-400">
                Requests: {status.requestCount || 0}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">{renderView()}</main>
        </div>
      </div>
      <TextSelectionMenu />
      <ToastContainer />
      
      {/* Startup Modal */}
      {showStartupModal && (
        <StartupModal
          onClose={() => setShowStartupModal(false)}
          onSelectOption={handleStartupOption}
        />
      )}
    </div>
  );
}

export default App;
