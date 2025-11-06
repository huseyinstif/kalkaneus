import React, { useState, useEffect } from 'react';
import { Activity, Globe, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import logo from '../../images/logo.png';
import { useProxyStore } from '../../store/proxyStore';

export default function Dashboard() {
  const { status, history } = useProxyStore();
  const [stats, setStats] = useState({
    totalRequests: 0,
    uniqueHosts: 0,
    errors: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    const uniqueHosts = new Set();
    let totalTime = 0;
    let errors = 0;

    history.forEach(req => {
      try {
        const url = new URL(req.url);
        uniqueHosts.add(url.hostname);
      } catch (e) {}
      
      if (req.status_code >= 400) errors++;
      if (req.duration) totalTime += req.duration;
    });

    setStats({
      totalRequests: history.length,
      uniqueHosts: uniqueHosts.size,
      errors: errors,
      avgResponseTime: history.length > 0 ? Math.round(totalTime / history.length) : 0
    });
  }, [history]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="card bg-gradient-to-br from-primary-900/20 to-primary-800/10 border-primary-700/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="Kalkaneus Logo" className="w-16 h-16" />
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome!</h1>
                <p className="text-dark-300 mb-3">
                  Kalkaneus is an open-source web security testing platform.
                </p>
                <p className="text-sm text-dark-400">
                  Kalkaneus is an open-source MITM proxy for intercepting, inspecting and modifying HTTP/HTTPS traffic in real time. It lets security testers capture requests and responses, edit and replay them, run automated payloads (fuzzing), apply regex-based match & replace rules, and extend functionality via a JavaScript plugin API. Sessions and results are stored locally and exposed through a collaborative callback service for safe OOB testing. Use only on systems you are authorized to test.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-dark-900 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
                 onClick={() => {
                   window.dispatchEvent(new CustomEvent('changeView', { detail: 'proxy' }));
                   setTimeout(() => {
                     window.dispatchEvent(new CustomEvent('proxyTab', { detail: 'Proxy settings' }));
                   }, 100);
                 }}>
              <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-dark-100 mb-1">Configure Proxy Settings</h3>
                <p className="text-sm text-dark-400">Start the proxy and download the CA certificate from Proxy Settings</p>
              </div>
              <ArrowRight size={20} className="text-dark-500 flex-shrink-0" />
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-dark-900 rounded-lg">
              <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-dark-100 mb-1">Configure Your Browser</h3>
                <p className="text-sm text-dark-400">Set your browser's proxy settings to 127.0.0.1:8080</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-dark-900 rounded-lg">
              <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-dark-100 mb-1">Start Testing</h3>
                <p className="text-sm text-dark-400">View requests in HTTP History, send to Repeater or Intruder</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-dark-400">Status</h3>
              <Activity size={20} className={status.isRunning ? 'text-green-500' : 'text-red-500'} />
            </div>
            <p className="text-2xl font-bold">
              {status.isRunning ? (
                <span className="text-green-500">Running</span>
              ) : (
                <span className="text-red-500">Stopped</span>
              )}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-dark-400">Total Requests</h3>
              <Zap size={20} className="text-primary-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalRequests}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-dark-400">Unique Hosts</h3>
              <Globe size={20} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.uniqueHosts}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-dark-400">Errors (4xx/5xx)</h3>
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
