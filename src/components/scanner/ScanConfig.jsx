import React from 'react';
import { Play, Square, Pause } from 'lucide-react';
import { useScannerStore } from '../../store/scannerStore';
import ScanProgress from './ScanProgress';

export default function ScanConfig({ onStartScan, onStopScan, onPauseScan, onResumeScan }) {
  const { 
    scanTarget, 
    setScanTarget, 
    selectedTemplates, 
    isScanning, 
    isPaused 
  } = useScannerStore();

  return (
    <div className="w-96 border-r border-dark-800 flex flex-col">
      <div className="p-6 space-y-4">
        {/* Target URL */}
        <div>
          <label className="text-sm font-medium mb-2 block">Target URL</label>
          <input
            type="text"
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            placeholder="https://example.com"
            className="input w-full"
            disabled={isScanning}
          />
          <p className="text-xs text-dark-500 mt-1">
            Enter the target URL to scan for vulnerabilities
          </p>
        </div>

        {/* Template Count */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Selected Templates
          </label>
          <div className="card p-3 bg-dark-850">
            <div className="flex items-center justify-between">
              <span className="text-dark-400 text-sm">Templates selected:</span>
              <span className="text-primary-400 font-semibold text-lg">
                {selectedTemplates.length}
              </span>
            </div>
          </div>
        </div>

        {/* Scan Controls */}
        <div className="space-y-2">
          <button
            onClick={isScanning ? onStopScan : onStartScan}
            disabled={!scanTarget && !isScanning}
            className={`btn w-full ${isScanning ? 'btn-danger' : 'btn-primary'} flex items-center justify-center space-x-2`}
          >
            {isScanning ? <Square size={16} /> : <Play size={16} />}
            <span>{isScanning ? 'Stop Scan' : 'Start Scan'}</span>
          </button>
          
          {isScanning && (
            <button
              onClick={isPaused ? onResumeScan : onPauseScan}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}
        </div>

        {/* Scan Progress */}
        {isScanning && <ScanProgress />}
      </div>
    </div>
  );
}
