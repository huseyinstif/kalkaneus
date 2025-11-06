import React, { useState, useEffect } from 'react';
import { Copy, ArrowRight } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { toast } from '../common/Toast';

const encodings = [
  { id: 'base64', name: 'Base64', category: 'Encoding' },
  { id: 'url', name: 'URL', category: 'Encoding' },
  { id: 'html', name: 'HTML Entities', category: 'Encoding' },
  { id: 'hex', name: 'Hex', category: 'Encoding' },
  { id: 'binary', name: 'Binary', category: 'Encoding' },
  { id: 'unicode', name: 'Unicode Escape', category: 'Encoding' },
  { id: 'ascii', name: 'ASCII Codes', category: 'Encoding' },
  { id: 'md5', name: 'MD5', category: 'Hash' },
  { id: 'sha1', name: 'SHA-1', category: 'Hash' },
  { id: 'sha256', name: 'SHA-256', category: 'Hash' },
  { id: 'sha512', name: 'SHA-512', category: 'Hash' },
];

export default function DecoderPanel() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [selectedEncoding, setSelectedEncoding] = useState('base64');
  const [operation, setOperation] = useState('encode');

  // Listen for sendToDecoder event
  useEffect(() => {
    const handleSendToDecoder = (event) => {
      const data = event.detail;
      if (data && data.text) {
        setInput(data.text);
      }
    };

    window.addEventListener('sendToDecoder', handleSendToDecoder);
    return () => window.removeEventListener('sendToDecoder', handleSendToDecoder);
  }, []);

  const handleTransform = () => {
    try {
      let result = '';

      if (operation === 'encode') {
        switch (selectedEncoding) {
          case 'base64':
            result = btoa(input);
            break;
          case 'url':
            result = encodeURIComponent(input);
            break;
          case 'html':
            result = input
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
            break;
          case 'hex':
            result = Array.from(input)
              .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join('');
            break;
          case 'binary':
            result = Array.from(input)
              .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
              .join(' ');
            break;
          case 'unicode':
            result = Array.from(input)
              .map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
              .join('');
            break;
          case 'ascii':
            result = Array.from(input)
              .map((c) => c.charCodeAt(0))
              .join(' ');
            break;
          default:
            result = 'Encoding not implemented';
        }
      } else {
        switch (selectedEncoding) {
          case 'base64':
            result = atob(input);
            break;
          case 'url':
            result = decodeURIComponent(input);
            break;
          case 'html':
            const txt = document.createElement('textarea');
            txt.innerHTML = input;
            result = txt.value;
            break;
          case 'hex':
            result = input.match(/.{1,2}/g)
              ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
              .join('') || '';
            break;
          case 'binary':
            result = input.split(' ')
              .map((byte) => String.fromCharCode(parseInt(byte, 2)))
              .join('');
            break;
          case 'unicode':
            result = input.replace(/\\u[\dA-F]{4}/gi, (match) =>
              String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
            );
            break;
          case 'ascii':
            result = input.split(' ')
              .map((code) => String.fromCharCode(parseInt(code)))
              .join('');
            break;
          default:
            result = 'Decoding not implemented';
        }
      }

      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  const handleHash = () => {
    try {
      let hash;

      switch (selectedEncoding) {
        case 'md5':
          hash = CryptoJS.MD5(input).toString();
          break;
        case 'sha1':
          hash = CryptoJS.SHA1(input).toString();
          break;
        case 'sha256':
          hash = CryptoJS.SHA256(input).toString();
          break;
        case 'sha512':
          hash = CryptoJS.SHA512(input).toString();
          break;
        default:
          setOutput('Hash function not supported');
          return;
      }

      setOutput(hash);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const isHashFunction = ['md5', 'sha1', 'sha256', 'sha512'].includes(selectedEncoding);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="max-w-6xl mx-auto w-full space-y-4">
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Decoder / Encoder</h2>
          <p className="text-dark-400 text-sm">
            Transform data between different encodings and generate hashes
          </p>
        </div>

        {/* Controls */}
        <div className="card">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={selectedEncoding}
                onChange={(e) => setSelectedEncoding(e.target.value)}
                className="input w-full"
              >
                <optgroup label="Encodings">
                  {encodings.filter(e => e.category === 'Encoding').map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {enc.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hash Functions">
                  {encodings.filter(e => e.category === 'Hash').map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {enc.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {!isHashFunction && (
              <div>
                <label className="block text-sm font-medium mb-2">Operation</label>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  className="input w-full"
                >
                  <option value="encode">Encode</option>
                  <option value="decode">Decode</option>
                </select>
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={isHashFunction ? handleHash : handleTransform}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                <ArrowRight size={16} />
                <span>{isHashFunction ? 'Generate Hash' : 'Transform'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Input/Output */}
        <div className="grid grid-cols-2 gap-4">
          {/* Input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Input</h3>
              <button
                onClick={() => copyToClipboard(input)}
                className="btn btn-secondary btn-sm flex items-center space-x-1"
              >
                <Copy size={14} />
                <span>Copy</span>
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input w-full h-64 font-mono text-sm resize-none"
              placeholder="Enter text to encode/decode..."
            />
            <div className="mt-2 text-xs text-dark-500">
              {input.length} characters
            </div>
          </div>

          {/* Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Output</h3>
              <button
                onClick={() => copyToClipboard(output)}
                className="btn btn-secondary btn-sm flex items-center space-x-1"
                disabled={!output}
              >
                <Copy size={14} />
                <span>Copy</span>
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              className="input w-full h-64 font-mono text-sm resize-none bg-dark-900"
              placeholder="Result will appear here..."
            />
            <div className="mt-2 text-xs text-dark-500">
              {output.length} characters
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setInput(output);
                setOutput('');
              }}
              className="btn btn-secondary btn-sm"
              disabled={!output}
            >
              Use Output as Input
            </button>
            <button
              onClick={() => {
                setInput('');
                setOutput('');
              }}
              className="btn btn-secondary btn-sm"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
