import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Loader2, AlertCircle, Bell } from 'lucide-react';
import { toast } from '../common/Toast';

export default function CollaboratorPanel() {
  const webviewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestCount, setRequestCount] = useState(0);
  const lastNotificationTime = useRef(0);

  useEffect(() => {
    const webview = webviewRef.current;
    if (webview) {
      // Webview event listeners
      webview.addEventListener('did-start-loading', () => {
        setIsLoading(true);
      });

      webview.addEventListener('did-stop-loading', () => {
        setIsLoading(false);
      });
      
      webview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode !== -3) { // -3 is ERR_ABORTED, which is normal
          setIsLoading(false);
        }
      });

      // Intercept page title changes (webhook.site updates title with request count)
      webview.addEventListener('page-title-updated', (e) => {
        const title = e.title;
        // Check if title contains request info
        if (title && title.includes('(')) {
          const match = title.match(/\((\d+)\)/);
          if (match) {
            const newCount = parseInt(match[1]);
            if (newCount > requestCount) {
              // New request received
              const requestDiff = newCount - requestCount;
              setRequestCount(newCount);
              
              // Throttle notifications - only show once per 2 seconds
              const now = Date.now();
              if (now - lastNotificationTime.current > 2000) {
                lastNotificationTime.current = now;
                
                // Show custom notification
                const notifTitle = requestDiff > 1 
                  ? `🔔 ${requestDiff} New Collaborator Requests!`
                  : '🔔 New Collaborator Request!';
                const desc = requestDiff > 1
                  ? `${requestDiff} out-of-band interactions detected`
                  : 'Out-of-band interaction detected';
                
                toast.success(notifTitle, desc, 4000);
              }
            }
          }
        }
      });
    }
  }, [requestCount]);

  const openInBrowser = () => {
    if (window.electronAPI?.shell) {
      window.electronAPI.shell.openExternal('https://webhook.site');
    }
  };

  const reloadWebview = () => {
    const webview = webviewRef.current;
    if (webview) {
      webview.reload();
    }
  };

  return (
    <div className="h-full w-full bg-dark-950 flex flex-col">
      {/* Header with controls */}
      <div className="bg-dark-900 border-b border-dark-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-dark-400">Webhook.site - Out-of-Band Interaction Testing</span>
          {requestCount > 0 && (
            <div className="flex items-center space-x-1.5 bg-primary-900/30 border border-primary-700/50 rounded-full px-2.5 py-0.5">
              <Bell size={12} className="text-primary-400" />
              <span className="text-xs font-medium text-primary-300">{requestCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={reloadWebview}
            className="btn btn-secondary btn-sm flex items-center space-x-2"
            title="Reload to see new requests"
          >
            <RefreshCw size={14} />
            <span>Reload</span>
          </button>
          <button
            onClick={openInBrowser}
            className="btn btn-secondary btn-sm flex items-center space-x-2"
            title="Open in external browser"
          >
            <ExternalLink size={14} />
            <span>Open in Browser</span>
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-900/20 border-b border-yellow-700/30 px-4 py-3">
        <div className="flex items-start space-x-3">
          <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-yellow-500 text-sm font-medium mb-1">
              If requests are not visible, click the "Reload" button to refresh the page.
            </p>
            <p className="text-yellow-600/80 text-xs">
              Native Collaborator feature is coming soon. Currently using webhook.site integration.
            </p>
          </div>
        </div>
      </div>

      {/* Webview */}
      <div className="flex-1 relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-dark-950 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-dark-400 text-sm">Loading Webhook.site...</p>
            </div>
          </div>
        )}

        <webview
          ref={webviewRef}
          src="https://webhook.site"
          className="w-full h-full"
          style={{ display: 'flex', flex: 1 }}
          allowpopups="true"
          partition="persist:collaborator"
          webpreferences="allowRunningInsecureContent=yes,disableNotifications=yes"
          httpreferrer=""
        />
      </div>
    </div>
  );
}
