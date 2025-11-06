import React from 'react';
import { Trash2 } from 'lucide-react';

const builtInPayloads = {
  'Common Passwords': [
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
    'password123', 'admin', 'root', 'toor', 'pass', 'test', 'guest', 'info',
    'administrator', 'welcome', 'login', 'passw0rd', 'admin123', 'root123'
  ],
  'SQL Injection': [
    "' OR '1'='1", "' OR '1'='1' --", "' OR '1'='1' /*", "admin' --", "admin' #",
    "' or 1=1--", "' or 1=1#", "' or 1=1/*", "1' UNION SELECT NULL--",
    "' UNION SELECT NULL,NULL--", "' AND 1=1--", "' AND 1=2--",
    "admin' OR '1'='1", "' OR 'x'='x", "') OR ('1'='1", "1' ORDER BY 1--",
    "1' ORDER BY 2--", "1' ORDER BY 3--", "' WAITFOR DELAY '0:0:5'--"
  ],
  'XSS Payloads': [
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>', '<iframe src=javascript:alert(1)>',
    '<body onload=alert(1)>', '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>', '<textarea onfocus=alert(1) autofocus>',
    '<keygen onfocus=alert(1) autofocus>', '<video><source onerror=alert(1)>',
    '<audio src=x onerror=alert(1)>', '<details open ontoggle=alert(1)>',
    '<marquee onstart=alert(1)>', '"><script>alert(1)</script>'
  ],
  'Directory Traversal': [
    '../', '../../', '../../../', '../../../../', '../../../../../',
    '..\\', '..\\..\\', '..\\..\\..\\', '..\\..\\..\\..\\',
    '..../', '....\\', '...//', '...\\\\',
    '%2e%2e/', '%2e%2e\\', '%252e%252e/', '%c0%ae%c0%ae/',
    '..%2f', '..%5c', '%2e%2e%2f', '%2e%2e%5c'
  ],
  'Command Injection': [
    '; ls', '| ls', '|| ls', '& ls', '&& ls', '`ls`', '$(ls)',
    '; cat /etc/passwd', '| cat /etc/passwd', '|| cat /etc/passwd',
    '; whoami', '| whoami', '|| whoami', '& whoami', '&& whoami',
    '; ping -c 5 127.0.0.1', '| ping -c 5 127.0.0.1', '|| ping -c 5 127.0.0.1'
  ],
  'Common Usernames': [
    'admin', 'administrator', 'root', 'user', 'test', 'guest', 'info',
    'adm', 'mysql', 'postgres', 'oracle', 'ftp', 'pi', 'puppet',
    'ansible', 'ec2-user', 'vagrant', 'azureuser', 'centos', 'ubuntu'
  ],
  'HTTP Methods': [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
    'TRACE', 'CONNECT', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY',
    'MOVE', 'LOCK', 'UNLOCK', 'VERSION-CONTROL', 'REPORT'
  ],
  'File Extensions': [
    '.php', '.asp', '.aspx', '.jsp', '.js', '.html', '.htm', '.xml',
    '.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar',
    '.tar', '.gz', '.bak', '.old', '.tmp', '.log', '.conf', '.config'
  ],
  'Status Codes': [
    '200', '201', '204', '301', '302', '304', '400', '401', '403',
    '404', '405', '500', '501', '502', '503', '504'
  ]
};

const generateNumberPayloads = (config) => {
  if (!config) return [];
  
  const { type = 'sequential', from = 0, to = 100, step = 1, base = 'decimal', minDigits = 1, maxDigits = 0 } = config;
  const payloads = [];
  
  if (type === 'sequential') {
    for (let i = from; i <= to; i += step) {
      let num = base === 'hex' ? i.toString(16) : i.toString();
      if (minDigits > 0) num = num.padStart(minDigits, '0');
      if (maxDigits > 0 && num.length > maxDigits) num = num.slice(-maxDigits);
      payloads.push(num);
    }
  } else if (type === 'random') {
    const count = Math.ceil((to - from) / step);
    for (let i = 0; i < count; i++) {
      const randomNum = Math.floor(Math.random() * (to - from + 1)) + from;
      let num = base === 'hex' ? randomNum.toString(16) : randomNum.toString();
      if (minDigits > 0) num = num.padStart(minDigits, '0');
      if (maxDigits > 0 && num.length > maxDigits) num = num.slice(-maxDigits);
      payloads.push(num);
    }
  }
  
  return payloads;
};

export default function IntruderPayloadsTab({ payloadSets, setPayloadSets, positions }) {
  const handleLoadPayloadSet = (setName) => {
    if (builtInPayloads[setName]) {
      setPayloadSets([{
        id: 1,
        type: 'simple',
        items: builtInPayloads[setName]
      }]);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left: Built-in Lists */}
      <div className="w-64 border-r border-dark-800 bg-dark-950 flex flex-col">
        <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
          <h3 className="text-sm font-semibold">Built-in Lists</h3>
          <p className="text-xs text-dark-500 mt-1">Click to load</p>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {Object.keys(builtInPayloads).map((name) => (
            <button
              key={name}
              onClick={() => handleLoadPayloadSet(name)}
              className="w-full text-left px-3 py-2 rounded bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-200">{name}</span>
                <span className="text-xs text-dark-500 bg-dark-900 px-2 py-0.5 rounded">
                  {builtInPayloads[name].length}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-dark-900 border-b border-dark-800 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Payload Set</h3>
            <div className="text-xs text-dark-500">
              <span className="font-medium">{payloadSets[0]?.items?.length || 0}</span> payloads • 
              <span className="font-medium ml-1">{(payloadSets[0]?.items?.length || 0) * (positions.length || 1)}</span> requests
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="text-xs text-dark-400">Type:</label>
            <select 
              value={payloadSets[0]?.type || 'simple'}
              onChange={(e) => {
                const newType = e.target.value;
                if (newType === 'numbers') {
                  const config = { type: 'sequential', from: 0, to: 100, step: 1, base: 'decimal', minDigits: 1, maxDigits: 0 };
                  setPayloadSets([{ ...payloadSets[0], type: newType, config, items: generateNumberPayloads(config) }]);
                } else {
                  setPayloadSets([{ ...payloadSets[0], type: newType, config: {}, items: [] }]);
                }
              }}
              className="input input-sm"
            >
              <option value="simple">Simple list</option>
              <option value="numbers">Numbers</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Simple List */}
          {payloadSets[0]?.type === 'simple' && (
            <div className="h-full flex flex-col p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-dark-400">Enter payloads one per line</p>
                <button 
                  onClick={() => setPayloadSets([{ ...payloadSets[0], items: [] }])}
                  className="btn btn-sm btn-secondary flex items-center space-x-1"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              </div>
              <textarea
                value={payloadSets[0]?.items?.join('\n') || ''}
                onChange={(e) => setPayloadSets([{ ...payloadSets[0], items: e.target.value.split('\n') }])}
                className="flex-1 bg-dark-950 border border-dark-700 rounded p-3 text-sm font-mono text-dark-200 resize-none focus:outline-none focus:border-primary-600"
                placeholder="admin&#10;test&#10;user&#10;password123"
                spellCheck="false"
              />
            </div>
          )}

          {/* Numbers */}
          {payloadSets[0]?.type === 'numbers' && (
            <div className="p-4 space-y-6">
              <div>
                <label className="text-xs font-medium text-dark-400 mb-2 block">Type:</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      checked={payloadSets[0]?.config?.type === 'sequential'}
                      onChange={() => {
                        const newConfig = { ...payloadSets[0].config, type: 'sequential' };
                        setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                      }}
                      className="form-radio" 
                    />
                    <span className="text-sm">Sequential</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      checked={payloadSets[0]?.config?.type === 'random'}
                      onChange={() => {
                        const newConfig = { ...payloadSets[0].config, type: 'random' };
                        setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                      }}
                      className="form-radio" 
                    />
                    <span className="text-sm">Random</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-dark-400 mb-1 block">From:</label>
                  <input 
                    type="number" 
                    value={payloadSets[0]?.config?.from || 0}
                    onChange={(e) => {
                      const newConfig = { ...payloadSets[0].config, from: parseInt(e.target.value) || 0 };
                      setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                    }}
                    className="input input-sm w-full" 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-dark-400 mb-1 block">To:</label>
                  <input 
                    type="number" 
                    value={payloadSets[0]?.config?.to || 100}
                    onChange={(e) => {
                      const newConfig = { ...payloadSets[0].config, to: parseInt(e.target.value) || 100 };
                      setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                    }}
                    className="input input-sm w-full" 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-dark-400 mb-1 block">Step:</label>
                  <input 
                    type="number" 
                    value={payloadSets[0]?.config?.step || 1}
                    onChange={(e) => {
                      const newConfig = { ...payloadSets[0].config, step: parseInt(e.target.value) || 1 };
                      setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                    }}
                    className="input input-sm w-full" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-dark-400 mb-2 block">Base:</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      checked={payloadSets[0]?.config?.base === 'decimal'}
                      onChange={() => {
                        const newConfig = { ...payloadSets[0].config, base: 'decimal' };
                        setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                      }}
                      className="form-radio" 
                    />
                    <span className="text-sm">Decimal</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      checked={payloadSets[0]?.config?.base === 'hex'}
                      onChange={() => {
                        const newConfig = { ...payloadSets[0].config, base: 'hex' };
                        setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                      }}
                      className="form-radio" 
                    />
                    <span className="text-sm">Hex</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-dark-400 mb-1 block">Min digits:</label>
                  <input 
                    type="number" 
                    value={payloadSets[0]?.config?.minDigits || 1}
                    onChange={(e) => {
                      const newConfig = { ...payloadSets[0].config, minDigits: parseInt(e.target.value) || 1 };
                      setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                    }}
                    className="input input-sm w-full" 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-dark-400 mb-1 block">Max digits:</label>
                  <input 
                    type="number" 
                    value={payloadSets[0]?.config?.maxDigits || 0}
                    onChange={(e) => {
                      const newConfig = { ...payloadSets[0].config, maxDigits: parseInt(e.target.value) || 0 };
                      setPayloadSets([{ ...payloadSets[0], config: newConfig, items: generateNumberPayloads(newConfig) }]);
                    }}
                    className="input input-sm w-full" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-dark-400 mb-2 block">Preview ({payloadSets[0]?.items?.length || 0} items):</label>
                <div className="bg-dark-950 border border-dark-700 rounded p-3 text-xs font-mono text-dark-300 space-y-1 max-h-64 overflow-auto">
                  {(payloadSets[0]?.items || []).map((item, idx) => (
                    <div key={idx} className="hover:bg-dark-900 px-1 rounded">{item}</div>
                  ))}
                  {(payloadSets[0]?.items?.length || 0) === 0 && (
                    <div className="text-dark-500 text-center py-4">No payloads generated</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
