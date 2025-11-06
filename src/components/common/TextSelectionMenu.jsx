import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export default function TextSelectionMenu() {
  const [menu, setMenu] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleMouseUp = (e) => {
      // Don't close if clicking on menu
      if (menuRef.current && menuRef.current.contains(e.target)) {
        return;
      }

      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text && text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setMenu({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      } else {
        setMenu(null);
      }
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sendToComparer = () => {
    window.dispatchEvent(new CustomEvent('sendToComparer', { 
      detail: { text: selectedText } 
    }));
    setMenu(null);
  };

  const sendToDecoder = () => {
    window.dispatchEvent(new CustomEvent('sendToDecoder', { 
      detail: { text: selectedText } 
    }));
    setMenu(null);
  };

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-dark-800 border border-dark-700 rounded-lg shadow-xl py-1 z-50 flex items-center space-x-1 px-2"
      style={{
        left: `${menu.x}px`,
        top: `${menu.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={sendToComparer}
        className="px-3 py-1 text-xs hover:bg-dark-700 rounded transition-colors flex items-center space-x-1"
        title="Send to Comparer"
      >
        <Send size={12} />
        <span>Comparer</span>
      </button>
      <div className="w-px h-4 bg-dark-700" />
      <button
        onClick={sendToDecoder}
        className="px-3 py-1 text-xs hover:bg-dark-700 rounded transition-colors flex items-center space-x-1"
        title="Send to Decoder"
      >
        <Send size={12} />
        <span>Decoder</span>
      </button>
    </div>
  );
}
