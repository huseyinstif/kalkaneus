import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

const MonacoHttpEditor = React.forwardRef(({
  value = '',
  onChange,
  readOnly = false,
  language = 'http', // 'http', 'json', 'plaintext'
  type = 'request', // 'request', 'response', 'headers', 'body'
  searchTerm = '',
  currentMatch = 0,
  highlightMarkers = false, // For Intruder ##markers##
  positions = [], // Intruder positions array
  height = '100%',
  className = '',
  onContextMenu = null // Custom context menu handler
}, ref) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const [isReady, setIsReady] = useState(false);

  // Expose editor methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    getSelection: () => {
      if (!editorRef.current) return null;
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      if (!selection || !model) return null;
      
      return {
        startOffset: model.getOffsetAt(selection.getStartPosition()),
        endOffset: model.getOffsetAt(selection.getEndPosition()),
        selectedText: model.getValueInRange(selection)
      };
    },
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  }));

  // Detect language from content
  const detectLanguage = () => {
    if (language !== 'http') return language;
    
    const trimmed = value.trim();
    
    // HTTP headers detection (must be first)
    if (type === 'headers') {
      return 'httpheaders';
    }
    
    // Check for full HTTP request (method + path + HTTP/1.1)
    const requestMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
    const firstLine = trimmed.split('\n')[0];
    const firstWord = firstLine.split(' ')[0];
    if (requestMethods.includes(firstWord)) {
      return 'httprequest';
    }
    
    // Check for full HTTP response (status line + headers + body)
    if (trimmed.startsWith('HTTP/')) {
      return 'httpresponse';
    }
    
    // Body type detection
    if (type === 'body') {
      // JSON detection (handle Google's XSSI prefix)
      let jsonContent = trimmed;
      if (trimmed.startsWith(")]}'\n")) {
        jsonContent = trimmed.substring(5);
      } else if (trimmed.startsWith(")]}'")) {
        jsonContent = trimmed.substring(4);
      }
      
      if ((jsonContent.startsWith('{') && jsonContent.endsWith('}')) || 
          (jsonContent.startsWith('[') && jsonContent.endsWith(']'))) {
        try {
          JSON.parse(jsonContent);
          return 'json';
        } catch (e) {
          // Not valid JSON
        }
      }
      
      // HTML/XML detection - use httpresponse language for better highlighting
      if (trimmed.startsWith('<') && trimmed.includes('>')) {
        return 'httpresponse'; // Use our custom HTTP response tokenizer
      }
      
      // Form data detection (key=value&key2=value2)
      if (trimmed.includes('=') && trimmed.includes('&')) {
        return 'plaintext'; // No special language for form data
      }
      
      return 'plaintext';
    }
    
    // Default
    return 'plaintext';
  };

  const actualLanguage = detectLanguage();

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);

    // Register HTTP headers language
    monaco.languages.register({ id: 'httpheaders' });
    monaco.languages.setMonarchTokensProvider('httpheaders', {
      tokenizer: {
        root: [
          // Header key (before colon)
          [/^[a-zA-Z0-9\-]+(?=:)/, 'keyword'],
          // Colon
          [/:/, 'delimiter'],
          // Header value (after colon)
          [/.*$/, 'string'],
        ]
      }
    });

    // Register HTTP request language
    monaco.languages.register({ id: 'httprequest' });
    monaco.languages.setMonarchTokensProvider('httprequest', {
      tokenizer: {
        root: [
          // HTTP request line (GET /path HTTP/1.1)
          [/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\s+.*\s+HTTP\/[\d.]+$/, 'keyword'],
          
          // Header lines (key: value)
          [/^[a-zA-Z0-9\-]+:/, { token: 'type', next: '@headerValue' }],
          
          // Empty line (separator)
          [/^\s*$/, ''],
          
          // JSON body
          [/\{/, { token: 'delimiter.curly', next: '@jsonRoot' }],
          [/\[/, { token: 'delimiter.square', next: '@jsonRoot' }],
          
          // HTML
          [/<[^>]+>/, 'tag'],
          
          // Default text
          [/.*/, ''],
        ],
        
        headerValue: [
          [/.*$/, { token: 'string', next: '@pop' }],
        ],
        
        jsonRoot: [
          [/"([^"\\]|\\.)*"\s*:/, 'key'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
          [/\b(true|false|null)\b/, 'keyword'],
          [/[{}]/, 'delimiter.curly'],
          [/[\[\]]/, 'delimiter.square'],
          [/[:,]/, 'delimiter'],
          [/\s+/, ''],
        ]
      }
    });

    // Register HTTP response language (with better highlighting)
    monaco.languages.register({ id: 'httpresponse' });
    monaco.languages.setMonarchTokensProvider('httpresponse', {
      tokenizer: {
        root: [
          // HTTP status line
          [/^HTTP\/[\d.]+\s+\d{3}\s+.*$/, 'keyword'],
          
          // Header lines (key: value)
          [/^[a-zA-Z0-9\-]+:/, { token: 'type', next: '@headerValue' }],
          
          // Empty line (separator)
          [/^\s*$/, ''],
          
          // XSSI prefix
          [/^\)\]\}'$/, 'comment'],
          
          // JSON body
          [/\{/, { token: 'delimiter.curly', next: '@jsonRoot' }],
          [/\[/, { token: 'delimiter.square', next: '@jsonRoot' }],
          
          // HTML - DOCTYPE
          [/<!DOCTYPE/, { token: 'metatag', next: '@doctype' }],
          
          // HTML - Comments
          [/<!--/, { token: 'comment', next: '@comment' }],
          
          // HTML - Opening tags
          [/<([a-zA-Z][\w-]*)/, { token: 'tag', next: '@tag.$1' }],
          
          // HTML - Closing tags
          [/<\/([a-zA-Z][\w-]*)>/, 'tag'],
          
          // Default text
          [/[^<]+/, ''],
        ],
        
        headerValue: [
          [/.*$/, { token: 'string', next: '@pop' }],
        ],
        
        doctype: [
          [/>/, { token: 'metatag', next: '@pop' }],
          [/./, 'metatag'],
        ],
        
        comment: [
          [/-->/, { token: 'comment', next: '@pop' }],
          [/./, 'comment'],
        ],
        
        tag: [
          [/\/?>/, { token: 'tag', next: '@pop' }],
          [/[\w-]+/, 'attribute.name'],
          [/=/, 'delimiter'],
          [/"([^"]*)"/, 'attribute.value'],
          [/'([^']*)'/, 'attribute.value'],
        ],
        
        jsonRoot: [
          [/"([^"\\]|\\.)*"\s*:/, 'key'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
          [/\b(true|false|null)\b/, 'keyword'],
          [/[{}]/, 'delimiter.curly'],
          [/[\[\]]/, 'delimiter.square'],
          [/[:,]/, 'delimiter'],
          [/\s+/, ''],
        ]
      }
    });

    // Configure editor
    editor.updateOptions({
      wordWrap: 'on',
      wrappingIndent: 'same',
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'line',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      contextmenu: !onContextMenu // Disable Monaco's context menu if custom one provided
    });

    // Add custom context menu handler
    if (onContextMenu) {
      editor.onContextMenu((e) => {
        e.event.preventDefault();
        onContextMenu({
          clientX: e.event.posx,
          clientY: e.event.posy,
          preventDefault: () => {}
        });
      });
    }

    // Custom theme for dark mode
    monaco.editor.defineTheme('burp-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string', foreground: 'CE9178' },      // Orange-ish for strings
        { token: 'number', foreground: 'B5CEA8' },      // Light green for numbers
        { token: 'keyword', foreground: '569CD6' },     // Blue for keywords (HTTP/1.1, true, false)
        { token: 'type', foreground: '4EC9B0' },        // Cyan for header keys
        { token: 'key', foreground: '9CDCFE' },         // Light blue for JSON keys
        { token: 'comment', foreground: '6A9955' },     // Green for comments
        { token: 'tag', foreground: '569CD6' },         // Blue for HTML tags
        { token: 'metatag', foreground: '569CD6' },     // Blue for DOCTYPE
        { token: 'attribute.name', foreground: '9CDCFE' },   // Light blue for attributes
        { token: 'attribute.value', foreground: 'CE9178' },  // Orange for attribute values
        { token: 'delimiter', foreground: 'D4D4D4' },   // Light gray for delimiters
        { token: 'delimiter.curly', foreground: 'FFD700' },   // Gold for {}
        { token: 'delimiter.square', foreground: 'DA70D6' },  // Orchid for []
      ],
      colors: {
        'editor.background': '#0a0e1a',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#1e293b33',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41'
      }
    });

    monaco.editor.setTheme('burp-dark');
  };

  // Apply search highlights
  useEffect(() => {
    if (!isReady || !editorRef.current || !monacoRef.current || !searchTerm) {
      // Clear decorations if no search
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current?.deltaDecorations(decorationsRef.current, []) || [];
      }
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    
    if (!model) return;

    // Find all matches
    const matches = model.findMatches(
      searchTerm,
      true, // searchOnlyEditableRange
      false, // isRegex
      true, // matchCase = false (case insensitive)
      null, // wordSeparators
      true // captureMatches
    );

    // Create decorations
    const newDecorations = matches.map((match, index) => {
      const isCurrentMatch = index === currentMatch;
      
      return {
        range: match.range,
        options: {
          className: isCurrentMatch ? 'monaco-search-current' : 'monaco-search-match',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      };
    });

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // Scroll to current match
    if (matches.length > 0 && currentMatch < matches.length) {
      const match = matches[currentMatch];
      editor.revealRangeInCenter(match.range);
    }

  }, [searchTerm, currentMatch, isReady]);

  // Highlight Intruder markers (##text##)
  useEffect(() => {
    if (!isReady || !editorRef.current || !monacoRef.current || !highlightMarkers) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    
    if (!model) return;

    // Find ##markers##
    const markerMatches = model.findMatches(
      '##[^#]+##',
      true,
      true, // isRegex
      false,
      null,
      true
    );

    const markerDecorations = markerMatches.map(match => ({
      range: match.range,
      options: {
        inlineClassName: 'monaco-intruder-marker',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }));

    // Apply marker decorations (separate from search)
    editor.deltaDecorations([], markerDecorations);

  }, [value, highlightMarkers, isReady]);

  // Highlight Intruder positions from positions array
  useEffect(() => {
    if (!isReady || !editorRef.current || !monacoRef.current || !positions || positions.length === 0) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    
    if (!model) return;

    const positionDecorations = positions.map(pos => {
      const startPos = model.getPositionAt(pos.start);
      const endPos = model.getPositionAt(pos.end);
      
      return {
        range: new monaco.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        ),
        options: {
          inlineClassName: 'monaco-intruder-position',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: { value: `**Position ${pos.id}**: ${pos.value}` }
        }
      };
    });

    // Apply position decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, positionDecorations);

  }, [positions, isReady, value]);

  return (
    <div className={`monaco-editor-wrapper ${className}`} style={{ height: '100%', width: '100%' }}>
      <Editor
        height={height}
        language={actualLanguage}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          automaticLayout: true,
        }}
      />
      
      {/* Custom CSS for highlights */}
      <style>{`
        .monaco-editor-wrapper {
          height: 100%;
          width: 100%;
        }
        
        .monaco-search-match {
          background-color: rgba(255, 235, 59, 0.3) !important;
          border: 1px solid rgba(255, 235, 59, 0.6);
        }
        
        .monaco-search-current {
          background-color: rgba(255, 152, 0, 0.5) !important;
          border: 1px solid rgba(255, 152, 0, 0.8);
        }
        
        .monaco-intruder-marker {
          background-color: rgba(139, 92, 246, 0.3);
          border: 1px solid rgba(139, 92, 246, 0.6);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
});

MonacoHttpEditor.displayName = 'MonacoHttpEditor';

export default MonacoHttpEditor;
