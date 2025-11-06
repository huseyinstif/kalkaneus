import React from 'react';
import {
  LayoutDashboard,
  Network,
  Zap,
  Repeat,
  Search,
  Binary,
  GitCompare,
  ExternalLink,
  FileText,
  FolderTree,
  Puzzle,
  BookOpen,
  Globe,
} from 'lucide-react';
import logo from '../images/logo.png';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'proxy', label: 'Proxy', icon: Network },
  { id: 'intruder', label: 'Intruder', icon: Zap },
  { id: 'repeater', label: 'Repeater', icon: Repeat },
  { id: 'scanner', label: 'Scanner', icon: Search },
  { id: 'decoder', label: 'Decoder', icon: Binary },
  { id: 'comparer', label: 'Comparer', icon: GitCompare },
  { id: 'collaborator', label: 'Collaborator', icon: ExternalLink },
  { id: 'logger', label: 'Logger', icon: FileText },
  { id: 'sitemap', label: 'Sitemap', icon: Globe },
  { id: 'learn', label: 'Learn', icon: BookOpen },
];

export default function Sidebar({ activeView, onViewChange }) {
  return (
    <div className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col">
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Kalkaneus Logo" className="w-8 h-8" />
          <div>
            <h2 className="font-bold text-lg">Kalkaneus</h2>
            <p className="text-xs text-dark-400">MITM Proxy Tool</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-primary-900 bg-opacity-30 text-primary-400 border-r-2 border-primary-500'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-800">
        <div className="text-xs text-dark-500 space-y-1">
          <div>Version 1.0.0</div>
          <div>© 2025 Kalkaneus</div>
        </div>
      </div>
    </div>
  );
}
