import React, { useState, useEffect, useRef } from 'react';
import { File, Save, FolderOpen, FileText, Download, AlertTriangle } from 'lucide-react';
import { toast } from './common/Toast';

export default function FileMenu({ projectInfo: propProjectInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectInfo, setProjectInfo] = useState(propProjectInfo);
  const [showNewProjectWarning, setShowNewProjectWarning] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const menuRef = useRef(null);

  // Update local state when prop changes
  useEffect(() => {
    setProjectInfo(propProjectInfo);
  }, [propProjectInfo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNewProject = () => {
    setShowNewProjectWarning(true);
    setIsOpen(false);
  };

  const confirmNewProject = () => {
    // Close warning modal
    setShowNewProjectWarning(false);
    
    // Clear current project data
    window.dispatchEvent(new CustomEvent('project:cleared'));
    
    // Open startup modal
    window.dispatchEvent(new CustomEvent('open:startup-modal'));
  };

  const handleSave = async () => {
    try {
      const result = await window.electronAPI.project.save();
      if (result.success) {
        toast.success(`Project saved to: ${result.path}`);
        // Refresh project info
        const info = await window.electronAPI.project.info();
        setProjectInfo(info);
      } else {
        toast.error('Failed to save project: ' + result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project: ' + error.message);
    }
    setIsOpen(false);
  };

  const handleLoad = async () => {
    const result = await window.electronAPI.project.load();
    if (result.success) {
      setProjectInfo(result.project);
      toast.success(`Project loaded successfully: ${result.project.currentProject.projectName}`);
      // project:loaded event will be sent by backend
      window.dispatchEvent(new CustomEvent('project:updated', { detail: result.project }));
    } else if (result.canceled) {
      // User canceled the dialog, no message needed
    } else {
      toast.error('Failed to load project: ' + (result.error || 'Unknown error'));
    }
    setIsOpen(false);
  };

  const handleExport = async () => {
    const result = await window.electronAPI.project.export();
    if (result.success) {
      toast.success(`Project exported to: ${result.path}`);
    } else {
      toast.error('Failed to export project');
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-800 rounded transition-colors flex items-center space-x-1"
        >
          <File size={14} />
          <span>File</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50">
            {/* Project Info */}
            {projectInfo?.currentProject && (
              <div className="px-3 py-2 border-b border-dark-700">
                <div className="text-xs text-dark-500">Current Project</div>
                <div className="text-sm text-dark-200 font-medium truncate">
                  {projectInfo.currentProject.projectName}
                </div>
                {projectInfo.isTempProject && (
                  <div className="text-xs text-yellow-400 mt-1">Temporary (not saved)</div>
                )}
                {projectInfo.hasUnsavedChanges && !projectInfo.isTempProject && (
                  <div className="text-xs text-orange-400 mt-1">● Unsaved changes</div>
                )}
              </div>
            )}

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={handleNewProject}
                className="w-full px-3 py-2 text-left text-sm text-dark-200 hover:bg-dark-750 flex items-center space-x-2"
              >
                <FileText size={16} />
                <span>New Project</span>
              </button>

              <button
                onClick={handleSave}
                className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                  projectInfo?.isTempProject 
                    ? 'text-dark-600 cursor-not-allowed' 
                    : 'text-dark-200 hover:bg-dark-750'
                }`}
                disabled={projectInfo?.isTempProject}
              >
                <Save size={16} />
                <span>Save Project</span>
                {projectInfo?.hasUnsavedChanges && !projectInfo?.isTempProject && (
                  <span className="ml-auto text-xs text-orange-400">●</span>
                )}
              </button>

              <button
                onClick={handleLoad}
                className="w-full px-3 py-2 text-left text-sm text-dark-200 hover:bg-dark-750 flex items-center space-x-2"
              >
                <FolderOpen size={16} />
                <span>Load Project</span>
              </button>

              <div className="border-t border-dark-700 my-1"></div>

              <button
                onClick={handleExport}
                className="w-full px-3 py-2 text-left text-sm text-dark-200 hover:bg-dark-750 flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Export as JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Project Warning Modal */}
      {showNewProjectWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-dark-900 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-dark-700">
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-900/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-dark-100 mb-2">Create New Project?</h3>
                  <p className="text-sm text-dark-400 mb-4">
                    Creating a new project will clear all current data including:
                  </p>
                  <ul className="text-sm text-dark-400 space-y-1 mb-4 ml-4">
                    <li>• HTTP/HTTPS history</li>
                    <li>• WebSocket connections</li>
                    <li>• Intercept filters</li>
                    <li>• Match & Replace rules</li>
                    <li>• Repeater tabs</li>
                    <li>• Intruder results</li>
                  </ul>
                  <p className="text-sm text-orange-400">
                    {projectInfo?.hasUnsavedChanges 
                      ? 'You have unsaved changes that will be lost!' 
                      : 'All current data will be permanently lost!'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 px-6 py-4 bg-dark-850 border-t border-dark-800 rounded-b-lg">
              <button
                onClick={() => setShowNewProjectWarning(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewProject}
                className="btn btn-danger btn-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
