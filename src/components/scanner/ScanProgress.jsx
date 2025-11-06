import React from 'react';
import { CheckCircle, Shield, Clock, XCircle, AlertTriangle, Zap } from 'lucide-react';
import { useScannerStore } from '../../store/scannerStore';

export default function ScanProgress() {
  const { scanProgress, scanStats, isPaused } = useScannerStore();

  return (
    <div className="card p-4 bg-gradient-to-br from-dark-900 to-dark-850 border-primary-900/30">
      {/* Progress Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <Zap className="text-primary-400 animate-pulse" size={16} />
          <span className="font-semibold text-dark-200">
            {isPaused ? 'Scan Paused' : 'Scanning...'}
          </span>
        </div>
        <span className="text-primary-400 font-bold text-lg">{scanProgress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-dark-800 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary-600 to-primary-400 h-3 rounded-full transition-all duration-300 relative"
          style={{ width: `${scanProgress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-dark-950/50 rounded-lg p-3 border border-red-900/20">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="text-red-400" size={14} />
            <span className="text-xs text-dark-500">Vulnerable</span>
          </div>
          <span className="text-red-400 font-bold text-xl">{scanStats.vulnerable}</span>
        </div>

        <div className="bg-dark-950/50 rounded-lg p-3 border border-green-900/20">
          <div className="flex items-center space-x-2 mb-1">
            <Shield className="text-green-400" size={14} />
            <span className="text-xs text-dark-500">Safe</span>
          </div>
          <span className="text-green-400 font-bold text-xl">{scanStats.safe}</span>
        </div>

        <div className="bg-dark-950/50 rounded-lg p-3 border border-blue-900/20">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="text-blue-400" size={14} />
            <span className="text-xs text-dark-500">Tested</span>
          </div>
          <span className="text-blue-400 font-bold text-xl">{scanStats.total}</span>
        </div>

        <div className="bg-dark-950/50 rounded-lg p-3 border border-orange-900/20">
          <div className="flex items-center space-x-2 mb-1">
            <XCircle className="text-orange-400" size={14} />
            <span className="text-xs text-dark-500">Errors</span>
          </div>
          <span className="text-orange-400 font-bold text-xl">{scanStats.errors}</span>
        </div>
      </div>
    </div>
  );
}
