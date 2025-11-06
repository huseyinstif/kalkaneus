// Convert HTTP request to various formats

export function convertToCurl(request, platform = 'linux') {
  const url = request.url;
  const method = request.method || 'GET';
  const headers = request.headers || request.request_headers || {};
  const body = request.body || request.request_body || '';

  let cmd = '';
  
  if (platform === 'windows') {
    // PowerShell format
    cmd = `curl.exe -X ${method}`;
    
    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      cmd += ` \`\n  -H "${key}: ${value}"`;
    });
    
    // Add body
    if (body && method !== 'GET') {
      const escapedBody = body.replace(/"/g, '\\"').replace(/\$/g, '`$');
      cmd += ` \`\n  -d "${escapedBody}"`;
    }
    
    cmd += ` \`\n  "${url}"`;
  } else {
    // Linux/Mac format
    cmd = `curl -X ${method}`;
    
    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      cmd += ` \\\n  -H '${key}: ${value}'`;
    });
    
    // Add body
    if (body && method !== 'GET') {
      const escapedBody = body.replace(/'/g, "'\\''");
      cmd += ` \\\n  -d '${escapedBody}'`;
    }
    
    cmd += ` \\\n  '${url}'`;
  }
  
  return cmd;
}

export function convertToPythonRequests(request) {
  const url = request.url;
  const method = (request.method || 'GET').toLowerCase();
  const headers = request.headers || request.request_headers || {};
  const body = request.body || request.request_body || '';

  let code = 'import requests\n\n';
  
  // Headers
  code += 'headers = {\n';
  Object.entries(headers).forEach(([key, value], index, arr) => {
    code += `    '${key}': '${value}'`;
    if (index < arr.length - 1) code += ',';
    code += '\n';
  });
  code += '}\n\n';
  
  // Body
  if (body && method !== 'get') {
    code += `data = '''${body}'''\n\n`;
  }
  
  // Request
  code += `response = requests.${method}('${url}', headers=headers`;
  if (body && method !== 'get') {
    code += ', data=data';
  }
  code += ')\n';
  code += 'print(response.text)';
  
  return code;
}

export function convertToSqlmap(request) {
  const url = request.url;
  const method = request.method || 'GET';
  const headers = request.headers || request.request_headers || {};
  const body = request.body || request.request_body || '';

  let cmd = `sqlmap -u "${url}"`;
  
  // Add method
  if (method !== 'GET') {
    cmd += ` --method=${method}`;
  }
  
  // Add headers
  const headerStr = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\\n');
  
  if (headerStr) {
    cmd += ` --headers="${headerStr}"`;
  }
  
  // Add body
  if (body && method !== 'GET') {
    const escapedBody = body.replace(/"/g, '\\"');
    cmd += ` --data="${escapedBody}"`;
  }
  
  // Common options
  cmd += ' --batch --random-agent --level=5 --risk=3';
  
  return cmd;
}

export function convertToFetch(request) {
  const url = request.url;
  const method = request.method || 'GET';
  const headers = request.headers || request.request_headers || {};
  const body = request.body || request.request_body || '';

  let code = `fetch('${url}', {\n`;
  code += `  method: '${method}',\n`;
  
  // Headers
  code += '  headers: {\n';
  Object.entries(headers).forEach(([key, value], index, arr) => {
    code += `    '${key}': '${value}'`;
    if (index < arr.length - 1) code += ',';
    code += '\n';
  });
  code += '  }';
  
  // Body
  if (body && method !== 'GET') {
    code += ',\n';
    code += `  body: '${body.replace(/'/g, "\\'")}'`;
  }
  
  code += '\n})\n';
  code += '  .then(response => response.text())\n';
  code += '  .then(data => console.log(data))\n';
  code += '  .catch(error => console.error(error));';
  
  return code;
}
