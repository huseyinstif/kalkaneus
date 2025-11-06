import React, { useEffect, useRef } from 'react';
import { Send, Copy, Trash2, Flag, MessageSquare } from 'lucide-react';

export default function ContextMenu({ x, y, onClose, options }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Ekranın dışına taşmasını önle
  const adjustPosition = () => {
    if (!menuRef.current) return { left: x, top: y };
    
    const menuWidth = 200; // Approximate width
    const menuHeight = options.length * 36; // Approximate height
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // Sağa taşıyorsa sola kaydır
    if (x + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 10;
    }
    
    // Aşağı taşıyorsa yukarı kaydır
    if (y + menuHeight > windowHeight) {
      top = windowHeight - menuHeight - 10;
    }
    
    return { left, top };
  };
  
  const position = adjustPosition();

  return (
    <div
      ref={menuRef}
      className="fixed bg-dark-800 border border-dark-700 rounded-lg shadow-xl py-1 z-50 min-w-48"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
    >
      {options.map((option, index) => (
        <React.Fragment key={index}>
          {option.divider ? (
            <div className="h-px bg-dark-700 my-1" />
          ) : (
            <button
              onClick={(e) => {
                option.onClick(e);
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-700 transition-colors flex items-center space-x-2 text-dark-200"
            >
              {option.icon && <span className="text-dark-400">{option.icon}</span>}
              <span>{option.label}</span>
              {option.label.includes('Repeater') || option.label.includes('Intruder') ? (
                <span className="ml-auto text-xs text-dark-500">Ctrl+Click: no switch</span>
              ) : null}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
