import React from 'react';
import { Github, Globe } from 'lucide-react';
import logo from '../../images/logo.png';

export default function LearnPanel() {
  const handleExternalLink = (url) => {
    window.electronAPI.shell.openExternal(url);
  };

  return (
    <div className="h-full overflow-auto bg-dark-950">
      <div className="max-w-4xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="Kalkaneus Logo" 
              className="w-20 h-20"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary-400 mb-2">
            Kalkaneus
          </h1>
          <p className="text-dark-400">
            Professional Web Security Testing Platform
          </p>
        </div>

        {/* Links */}
        <div className="card">
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => handleExternalLink('https://github.com/huseyinstif/kalkaneus')}
              className="flex items-center space-x-3 p-3 bg-dark-900 hover:bg-dark-800 rounded-lg transition-colors w-full text-left"
            >
              <Github className="w-5 h-5 text-dark-300" />
              <span className="text-dark-200">github.com/huseyinstif/kalkaneus</span>
            </button>
            
            <button
              onClick={() => handleExternalLink('https://kalkaneus.com')}
              className="flex items-center space-x-3 p-3 bg-dark-900 hover:bg-dark-800 rounded-lg transition-colors w-full text-left"
            >
              <Globe className="w-5 h-5 text-dark-300" />
              <span className="text-dark-200">kalkaneus.com</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-dark-500 text-sm">
          <p>Made with ❤️ by Hüseyin Tıntaş</p>
        </div>
      </div>
    </div>
  );
}
