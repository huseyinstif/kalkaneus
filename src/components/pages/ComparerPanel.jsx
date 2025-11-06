import React, { useState, useEffect } from 'react';
import { Upload, X, ArrowLeftRight } from 'lucide-react';

export default function ComparerPanel() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [compareMode, setCompareMode] = useState('chars'); // 'chars' or 'words' or 'lines'

  // Listen for sendToComparer event
  useEffect(() => {
    const handleSendToComparer = (event) => {
      const data = event.detail;
      if (data) {
        let textToAdd = '';
        
        if (data.text) {
          textToAdd = data.text;
        } else if (data.body || data.response_body) {
          textToAdd = data.body || data.response_body || '';
        }

        if (textToAdd) {
          // Always add to left first, then move left to right
          if (!leftText) {
            setLeftText(textToAdd);
          } else if (!rightText) {
            setRightText(textToAdd);
          } else {
            // Both filled: move left to right, new to left
            setRightText(leftText);
            setLeftText(textToAdd);
          }
        }
      }
    };

    window.addEventListener('sendToComparer', handleSendToComparer);
    return () => window.removeEventListener('sendToComparer', handleSendToComparer);
  }, [leftText, rightText]);

  // Simple diff algorithm
  const getDiff = () => {
    if (!leftText || !rightText) return { left: [], right: [] };

    let leftItems, rightItems;
    
    if (compareMode === 'lines') {
      leftItems = leftText.split('\n');
      rightItems = rightText.split('\n');
    } else if (compareMode === 'words') {
      leftItems = leftText.split(/\s+/);
      rightItems = rightText.split(/\s+/);
    } else {
      leftItems = leftText.split('');
      rightItems = rightText.split('');
    }

    const leftDiff = [];
    const rightDiff = [];
    
    let i = 0, j = 0;
    
    while (i < leftItems.length || j < rightItems.length) {
      if (i >= leftItems.length) {
        rightDiff.push({ text: rightItems[j], type: 'added' });
        j++;
      } else if (j >= rightItems.length) {
        leftDiff.push({ text: leftItems[i], type: 'removed' });
        i++;
      } else if (leftItems[i] === rightItems[j]) {
        leftDiff.push({ text: leftItems[i], type: 'same' });
        rightDiff.push({ text: rightItems[j], type: 'same' });
        i++;
        j++;
      } else {
        // Look ahead to find match
        let foundInRight = rightItems.slice(j, j + 10).indexOf(leftItems[i]);
        let foundInLeft = leftItems.slice(i, i + 10).indexOf(rightItems[j]);
        
        if (foundInRight !== -1 && (foundInLeft === -1 || foundInRight < foundInLeft)) {
          // Items added in right
          for (let k = 0; k < foundInRight; k++) {
            rightDiff.push({ text: rightItems[j + k], type: 'added' });
          }
          j += foundInRight;
        } else if (foundInLeft !== -1) {
          // Items removed from left
          for (let k = 0; k < foundInLeft; k++) {
            leftDiff.push({ text: leftItems[i + k], type: 'removed' });
          }
          i += foundInLeft;
        } else {
          // Changed
          leftDiff.push({ text: leftItems[i], type: 'changed' });
          rightDiff.push({ text: rightItems[j], type: 'changed' });
          i++;
          j++;
        }
      }
    }

    return { left: leftDiff, right: rightDiff };
  };

  const diff = getDiff();

  const renderDiff = (items, side) => {
    const separator = compareMode === 'lines' ? '\n' : compareMode === 'words' ? ' ' : '';
    
    return (
      <div className="font-mono text-sm whitespace-pre-wrap break-words">
        {items.map((item, index) => {
          let className = '';
          if (item.type === 'added') {
            className = 'bg-green-900/30 text-green-300';
          } else if (item.type === 'removed') {
            className = 'bg-red-900/30 text-red-300';
          } else if (item.type === 'changed') {
            className = 'bg-yellow-900/30 text-yellow-300';
          }
          
          return (
            <span key={index} className={className}>
              {item.text}
              {index < items.length - 1 && separator}
            </span>
          );
        })}
      </div>
    );
  };

  const swapSides = () => {
    const temp = leftText;
    setLeftText(rightText);
    setRightText(temp);
  };

  const clearAll = () => {
    setLeftText('');
    setRightText('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Comparer</h2>
            <p className="text-sm text-dark-400 mt-1">
              Compare two texts side by side
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value)}
              className="input input-sm"
            >
              <option value="chars">Character by Character</option>
              <option value="words">Word by Word</option>
              <option value="lines">Line by Line</option>
            </select>
            <button
              onClick={swapSides}
              className="btn btn-secondary btn-sm flex items-center space-x-1"
              title="Swap sides"
            >
              <ArrowLeftRight size={14} />
              <span>Swap</span>
            </button>
            <button
              onClick={clearAll}
              className="btn btn-secondary btn-sm flex items-center space-x-1"
            >
              <X size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="border-b border-dark-800 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Left Text</label>
            <textarea
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              className="input w-full h-32 font-mono text-sm resize-none"
              placeholder="Paste or type text here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Right Text</label>
            <textarea
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              className="input w-full h-32 font-mono text-sm resize-none"
              placeholder="Paste or type text here..."
            />
          </div>
        </div>
      </div>

      {/* Comparison Result */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 divide-x divide-dark-800">
          {/* Left Side */}
          <div className="flex flex-col">
            <div className="bg-dark-900 border-b border-dark-800 px-4 py-2">
              <h3 className="font-semibold text-sm">Left</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-dark-950">
              {leftText ? (
                renderDiff(diff.left, 'left')
              ) : (
                <div className="text-dark-500 text-center mt-8">
                  Enter text to compare
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex flex-col">
            <div className="bg-dark-900 border-b border-dark-800 px-4 py-2">
              <h3 className="font-semibold text-sm">Right</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-dark-950">
              {rightText ? (
                renderDiff(diff.right, 'right')
              ) : (
                <div className="text-dark-500 text-center mt-8">
                  Enter text to compare
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-dark-900 border-t border-dark-800 px-6 py-3">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-900/30 border border-green-700 rounded"></div>
            <span className="text-dark-400">Added</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-900/30 border border-red-700 rounded"></div>
            <span className="text-dark-400">Removed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-900/30 border border-yellow-700 rounded"></div>
            <span className="text-dark-400">Changed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
