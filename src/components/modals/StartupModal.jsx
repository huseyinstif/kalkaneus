import React, { useState } from 'react';
import { FileText, FolderOpen, Zap, X } from 'lucide-react';
import logo from '../../images/logo.png';

export default function StartupModal({ onClose, onSelectOption }) {
  const [projectName, setProjectName] = useState('');
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const projectNameInputRef = React.useRef(null);

  const handleTempProject = () => {
    onSelectOption('temp');
    onClose();
  };

  const handleNewProject = () => {
    if (showNewProjectInput) {
      if (projectName.trim()) {
        onSelectOption('new', projectName.trim());
        onClose();
      }
    } else {
      setShowNewProjectInput(true);
      // Focus input after state update
      setTimeout(() => {
        projectNameInputRef.current?.focus();
      }, 100);
    }
  };

  const handleNewProjectSectionClick = () => {
    if (!showNewProjectInput) {
      setShowNewProjectInput(true);
      setTimeout(() => {
        projectNameInputRef.current?.focus();
      }, 100);
    }
  };

  const handleLoadProject = async () => {
    const result = await window.electronAPI.project.load();
    if (result) {
      onSelectOption('load', result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-dark-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-dark-700">
        {/* Header */}
        <div className="p-6 border-b border-dark-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary-400">Welcome to Kalkaneus</h2>
              <p className="text-dark-400 mt-1">Choose how you want to start</p>
            </div>
            <img 
              src={logo} 
              alt="Kalkaneus" 
              className="w-12 h-12"
            />
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* Temporary Project */}
          <button
            onClick={handleTempProject}
            className="w-full p-6 bg-dark-800 hover:bg-dark-750 rounded-lg border-2 border-dark-700 hover:border-primary-500 transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-900/20 rounded-lg group-hover:bg-yellow-900/30 transition-colors">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-dark-100 mb-1">Temporary Project</h3>
                <p className="text-dark-400 text-sm">
                  Start quickly without saving. Perfect for quick tests and experiments.
                  All data will be lost when you close the application.
                </p>
              </div>
            </div>
          </button>

          {/* New Project */}
          <div 
            onClick={handleNewProjectSectionClick}
            className="w-full p-6 bg-dark-800 rounded-lg border-2 border-dark-700 hover:border-primary-500 transition-all cursor-pointer group">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-900/20 rounded-lg group-hover:bg-green-900/30 transition-colors">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-dark-100 mb-1">New Project</h3>
                <p className="text-dark-400 text-sm mb-3">
                  Create a new project that you can save and continue later.
                  All your work will be preserved.
                </p>
                
                {showNewProjectInput && (
                  <div className="space-y-2">
                    <input
                      ref={projectNameInputRef}
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name..."
                      className="input w-full"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleNewProject();
                        }
                      }}
                    />
                  </div>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewProject();
                  }}
                  className="btn btn-success btn-sm mt-2"
                >
                  {showNewProjectInput ? 'Create Project' : 'Start New Project'}
                </button>
              </div>
            </div>
          </div>

          {/* Load Project */}
          <button
            onClick={handleLoadProject}
            className="w-full p-6 bg-dark-800 hover:bg-dark-750 rounded-lg border-2 border-dark-700 hover:border-primary-500 transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-900/20 rounded-lg group-hover:bg-blue-900/30 transition-colors">
                <FolderOpen className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-dark-100 mb-1">Load Existing Project</h3>
                <p className="text-dark-400 text-sm">
                  Continue working on a previously saved project.
                  Browse and open .klk project files.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-dark-850 border-t border-dark-800 rounded-b-lg">
          <p className="text-xs text-dark-500 text-center">
            You can always create, save, or load projects from the File menu
          </p>
        </div>
      </div>
    </div>
  );
}
