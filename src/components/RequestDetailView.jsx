import React, { useState } from 'react';
import { Flag, MessageSquare } from 'lucide-react';
import MonacoHttpEditor from './common/MonacoHttpEditor';

export default function RequestDetailView({ request }) {
  const [activeTab, setActiveTab] = useState('request');

  // Debug: Log request data
  console.log('RequestDetailView - Full request:', request);
  console.log('RequestDetailView - request_body:', request.request_body);
  console.log('RequestDetailView - response_body:', request.response_body);

  return (
    <div className="h-full flex flex-col">
      {/* Flag & Comment Info */}
      {(request.flag || request.comment) && (
        <div className="bg-dark-900 border-b border-dark-800 px-4 py-2 space-y-1">
          {request.flag && (
            <div className="flex items-center space-x-2 text-sm">
              <Flag size={14} className="text-red-500" />
              <span className="text-red-400 font-medium">Flagged</span>
            </div>
          )}
          {request.comment && (
            <div className="flex items-start space-x-2 text-sm">
              <MessageSquare size={14} className="text-blue-500 mt-0.5" />
              <div className="flex-1">
                <span className="text-blue-400 font-medium">Comment: </span>
                <span className="text-dark-300">{request.comment}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request/Response Tabs */}
      <div className="bg-dark-900 border-b border-dark-800 flex items-center justify-between px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'request'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            Request
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'response'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            Response
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'request' ? (
          <div className="h-full flex flex-col">
            {/* Request Line */}
            <div className="bg-dark-900 p-4 border-b border-dark-800 font-mono text-sm">
              <div className="text-primary-400">
                {request.method} {new URL(request.url).pathname}
              </div>
              <div className="text-dark-400 text-xs mt-1">
                Host: {new URL(request.url).hostname}
              </div>
            </div>

            {/* Content with Monaco Editor */}
            <div className="flex-1 overflow-hidden">
              <MonacoHttpEditor
                value={`${request.method} ${request.url} HTTP/1.1\n${Object.entries(request.request_headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${request.request_body || ''}`}
                readOnly={true}
                language="http"
                type="request"
                height="100%"
              />
            </div>
          </div>
        ) : request.status_code ? (
          <div className="h-full flex flex-col">
            {/* Status Line */}
            <div className="bg-dark-900 p-4 border-b border-dark-800 font-mono text-sm">
              <div className="flex items-center space-x-2">
                <span
                  className={`badge ${
                    request.status_code < 300
                      ? 'badge-success'
                      : request.status_code < 400
                      ? 'badge-info'
                      : request.status_code < 500
                      ? 'badge-warning'
                      : 'badge-error'
                  }`}
                >
                  {request.status_code}
                </span>
                <span className="text-dark-400">{request.status_message}</span>
              </div>
              <div className="text-dark-400 text-xs mt-1">
                Length: {request.response_length || 0} bytes
                {request.duration && ` • Duration: ${request.duration}ms`}
              </div>
            </div>

            {/* Content with Monaco Editor */}
            <div className="flex-1 overflow-hidden">
              <MonacoHttpEditor
                value={`HTTP/1.1 ${request.status_code} ${request.status_message}\n${Object.entries(request.response_headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${request.response_body || ''}`}
                readOnly={true}
                language="http"
                type="response"
                height="100%"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-dark-500">
            <div className="text-center">
              <p className="text-lg mb-2">No response yet</p>
              <p className="text-sm">This request hasn't received a response</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
