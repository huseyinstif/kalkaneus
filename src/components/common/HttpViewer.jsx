import React, { useMemo, useEffect, useRef } from 'react';

export default function HttpViewer({ content, viewMode = 'pretty', searchTerm = '', currentMatch = 0 }) {
  const containerRef = useRef(null);
  
  // Scroll to current match
  useEffect(() => {
    if (!searchTerm || !containerRef.current) return;
    
    // Find all marks
    const marks = containerRef.current.querySelectorAll('mark');
    if (marks.length === 0) return;
    
    // Find current match (orange one)
    const currentMarkElement = marks[currentMatch];
    if (currentMarkElement) {
      currentMarkElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentMatch, searchTerm]);
  
  // Helper to highlight search matches in text
  const highlightSearchMatches = (text, baseClassName = '') => {
    if (!searchTerm || !text) return <span className={baseClassName}>{text}</span>;
    
    const parts = [];
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    let lastIndex = 0;
    let matchIndex = 0;
    let match;
    
    const regexCopy = new RegExp(regex);
    while ((match = regexCopy.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`} className={baseClassName}>{text.substring(lastIndex, match.index)}</span>);
      }
      
      // Add highlighted match
      const isCurrentMatch = matchIndex === currentMatch;
      parts.push(
        <mark 
          key={`match-${match.index}`}
          className={isCurrentMatch ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-black'}
        >
          {match[0]}
        </mark>
      );
      
      lastIndex = regexCopy.lastIndex;
      matchIndex++;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`} className={baseClassName}>{text.substring(lastIndex)}</span>);
    }
    
    return <>{parts}</>;
  };
  
  // Comprehensive syntax highlighter for HTTP messages
  const highlightHTTP = (text) => {
    if (!text) return [];
    
    const lines = text.split('\n');
    const result = [];
    const headers = [];
    let inBody = false;
    let bodyContent = '';
    let bodyStartIndex = -1;
    
    // Find where body starts
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 0) {
        bodyStartIndex = i;
        break;
      }
    }
    
    lines.forEach((line, idx) => {
      // First line - HTTP method/status
      if (idx === 0) {
        result.push(highlightFirstLine(line, idx));
        return;
      }
      
      // Empty line - separator
      if (line.trim() === '') {
        inBody = true;
        return;
      }
      
      // Headers
      if (!inBody && line.includes(':')) {
        headers.push(highlightHeader(line, idx));
        return;
      }
      
      // Body content
      if (inBody) {
        bodyContent += line + '\n';
      }
    });
    
    // Render headers in a box
    if (headers.length > 0) {
      result.push(
        <div key="headers" className="mt-3 mb-3">
          <div className="text-xs font-semibold text-gray-400 mb-2">HEADERS</div>
          <div className="border border-dark-700 rounded p-3 bg-dark-900">
            {headers}
          </div>
        </div>
      );
    }
    
    // Render body if exists
    if (bodyContent.trim()) {
      result.push(
        <div key="body" className="mt-3">
          <div className="text-xs font-semibold text-gray-400 mb-2">BODY</div>
          <div className="border border-dark-700 rounded p-3 bg-dark-900">
            {highlightBody(bodyContent, bodyStartIndex + 1)}
          </div>
        </div>
      );
    }
    
    return result;
  };
  
  // Highlight first line (GET /path HTTP/1.1 or HTTP/1.1 200 OK)
  const highlightFirstLine = (line, idx) => {
    const parts = line.split(' ');
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
    const isRequest = methods.includes(parts[0]);
    
    if (isRequest) {
      return (
        <div key={idx} className="mb-2">
          <span className="text-orange-500 font-bold">{parts[0]}</span>
          <span className="text-blue-500 ml-2">{parts[1]}</span>
          <span className="text-gray-500 ml-2">{parts.slice(2).join(' ')}</span>
        </div>
      );
    } else {
      return (
        <div key={idx} className="mb-2">
          <span className="text-gray-500">{parts[0]}</span>
          <span className="text-blue-500 ml-2 font-bold">{parts[1]}</span>
          <span className="text-gray-500 ml-2">{parts.slice(2).join(' ')}</span>
        </div>
      );
    }
  };
  
  // Highlight headers
  const highlightHeader = (line, idx) => {
    const colonIndex = line.indexOf(':');
    const key = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);
    
    return (
      <div key={idx} className="leading-relaxed">
        {highlightSearchMatches(key, 'text-gray-300')}
        <span className="text-gray-600">:</span>
        {highlightSearchMatches(value, 'text-blue-400')}
      </div>
    );
  };
  
  // Highlight body content
  const highlightBody = (body, startIdx) => {
    const trimmed = body.trim();
    
    // Try JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return (
          <div key={`body-${startIdx}`} className="mt-2">
            {highlightJSON(parsed, 0)}
          </div>
        );
      } catch (e) {
        // Not valid JSON, continue
      }
    }
    
    // Try HTML/XML
    if (trimmed.includes('<') && trimmed.includes('>')) {
      return (
        <div key={`body-${startIdx}`} className="mt-2">
          {highlightHTML(trimmed)}
        </div>
      );
    }
    
    // URL-encoded form data
    if (trimmed.includes('=') && trimmed.includes('&')) {
      return (
        <div key={`body-${startIdx}`} className="mt-2">
          {highlightFormData(trimmed)}
        </div>
      );
    }
    
    // Plain text
    return (
      <div key={`body-${startIdx}`} className="mt-2 text-gray-300 whitespace-pre-wrap">
        {highlightSearchMatches(trimmed, 'text-gray-300')}
      </div>
    );
  };
  
  // Highlight JSON with proper indentation
  const highlightJSON = (obj, depth = 0) => {
    const indent = '  '.repeat(depth);
    
    if (obj === null) {
      return <span className="text-gray-500">null</span>;
    }
    
    if (typeof obj === 'string') {
      return (
        <span className="text-green-400">
          "{highlightSearchMatches(obj, '')}"
        </span>
      );
    }
    
    if (typeof obj === 'number') {
      return (
        <span className="text-blue-400">
          {highlightSearchMatches(obj.toString(), '')}
        </span>
      );
    }
    
    if (typeof obj === 'boolean') {
      return (
        <span className="text-orange-400">
          {highlightSearchMatches(obj.toString(), '')}
        </span>
      );
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return <span className="text-gray-400">[]</span>;
      }
      
      return (
        <div>
          <span className="text-gray-400">[</span>
          {obj.map((item, i) => (
            <div key={i} style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
              {highlightJSON(item, depth + 1)}
              {i < obj.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <span className="text-gray-400">]</span>
          </div>
        </div>
      );
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return <span className="text-gray-400">{'{}'}</span>;
      }
      
      return (
        <div>
          <span className="text-gray-400">{'{'}</span>
          {keys.map((key, i) => (
            <div key={key} style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
              <span className="text-purple-400">
                "{highlightSearchMatches(key, '')}"
              </span>
              <span className="text-gray-400">: </span>
              {highlightJSON(obj[key], depth + 1)}
              {i < keys.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <span className="text-gray-400">{'}'}</span>
          </div>
        </div>
      );
    }
    
    return <span>{String(obj)}</span>;
  };
  
  // Highlight HTML/XML
  const highlightHTML = (html) => {
    const lines = html.split('\n');
    
    return lines.map((line, idx) => {
      // Simple approach: apply search highlight to the whole line
      // while preserving basic HTML syntax colors
      const parts = [];
      let currentPos = 0;
      
      // Find tags
      const tagRegex = /<\/?[\w-]+[^>]*>/g;
      let match;
      
      while ((match = tagRegex.exec(line)) !== null) {
        // Add text before tag
        if (match.index > currentPos) {
          const textBefore = line.substring(currentPos, match.index);
          parts.push(
            <span key={`text-${idx}-${currentPos}`} className="text-gray-300">
              {highlightSearchMatches(textBefore, '')}
            </span>
          );
        }
        
        // Add tag
        parts.push(
          <span key={`tag-${idx}-${match.index}`} className="text-purple-400">
            {highlightSearchMatches(match[0], '')}
          </span>
        );
        
        currentPos = tagRegex.lastIndex;
      }
      
      // Add remaining text
      if (currentPos < line.length) {
        const remaining = line.substring(currentPos);
        parts.push(
          <span key={`text-${idx}-${currentPos}`} className="text-gray-300">
            {highlightSearchMatches(remaining, '')}
          </span>
        );
      }
      
      return (
        <div key={idx} className="leading-relaxed">
          {parts.length > 0 ? parts : highlightSearchMatches(line, 'text-gray-300')}
        </div>
      );
    });
  };
  
  // Highlight form data - each parameter on new line
  const highlightFormData = (data) => {
    const params = data.split('&');
    
    return params.map((param, idx) => {
      const [key, value] = param.split('=');
      return (
        <div key={idx} className="leading-relaxed">
          <span className="text-purple-400">{decodeURIComponent(key || '')}</span>
          <span className="text-gray-400">=</span>
          <span className="text-green-400">{decodeURIComponent(value || '')}</span>
        </div>
      );
    });
  };
  
  // Render modes
  const renderPretty = () => {
    if (!content) return <div className="text-gray-500">No content</div>;
    return (
      <div className="font-mono text-sm">
        {highlightHTTP(content)}
      </div>
    );
  };
  
  const renderRaw = () => {
    if (!content) return <div className="text-gray-500">No content</div>;
    return (
      <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">
        {content}
      </pre>
    );
  };
  
  const renderHex = () => {
    if (!content) return <div className="text-gray-500">No content</div>;
    
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    const rows = [];
    
    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(8, '0');
      
      const hexPart = Array.from(chunk)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      const asciiPart = Array.from(chunk)
        .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
        .join('');
      
      rows.push(
        <div key={i} className="font-mono text-xs flex space-x-4">
          <span className="text-gray-500">{offset}</span>
          <span className="text-cyan-400 flex-1">{hexPart.padEnd(47, ' ')}</span>
          <span className="text-green-400">{asciiPart}</span>
        </div>
      );
    }
    
    return <div className="space-y-0.5">{rows}</div>;
  };
  
  const renderBrowser = () => {
    if (!content) return <div className="text-gray-500">No content</div>;
    
    const bodyStart = content.indexOf('\n\n');
    let htmlContent = bodyStart > 0 ? content.substring(bodyStart + 2) : content;
    
    // Extract base URL from headers if available
    const lines = content.split('\n');
    let baseUrl = '';
    let protocol = 'https';
    
    // Check for protocol in first line (e.g., "GET /path HTTP/1.1")
    const firstLine = lines[0];
    if (firstLine && firstLine.includes('http://')) {
      protocol = 'http';
    }
    
    for (const line of lines) {
      if (line.toLowerCase().startsWith('host:')) {
        const host = line.substring(5).trim();
        baseUrl = `${protocol}://${host}`;
        break;
      }
    }
    
    // Add base tag and meta to allow external resources
    if (baseUrl && !htmlContent.includes('<base')) {
      const metaTag = '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\'; img-src * data: blob:; style-src * \'unsafe-inline\';">';
      const baseTag = `<base href="${baseUrl}/">`;
      
      const headMatch = htmlContent.match(/<head[^>]*>/i);
      if (headMatch) {
        htmlContent = htmlContent.replace(
          headMatch[0],
          `${headMatch[0]}\n${metaTag}\n${baseTag}`
        );
      } else if (htmlContent.includes('<html')) {
        htmlContent = htmlContent.replace(
          /<html[^>]*>/i,
          `$&\n<head>${metaTag}\n${baseTag}</head>`
        );
      } else {
        htmlContent = `<head>${metaTag}\n${baseTag}</head>\n${htmlContent}`;
      }
    }
    
    return (
      <div className="h-full w-full bg-white overflow-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 text-xs mb-2">
          ⚠️ External resources (CSS/JS/Images) may not load due to CORS restrictions
        </div>
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
          title="Response Render"
        />
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-dark-950">
        {viewMode === 'pretty' && renderPretty()}
        {viewMode === 'raw' && renderRaw()}
        {viewMode === 'hex' && renderHex()}
        {viewMode === 'render' && renderBrowser()}
      </div>
    </div>
  );
}
