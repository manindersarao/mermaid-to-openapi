import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Info, 
  AlertCircle,
  BookOpen,
  Play,
  GripVertical,
  GripHorizontal
} from 'lucide-react';

// --- Type Definitions ---

interface MermaidViewerProps {
  code: string;
}

interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: {
    type: string;
    example?: string;
  };
}

interface ResponseContent {
  description: string;
  content: {
    "application/json": {
      schema: {
        type: string;
        example: Record<string, unknown>;
      };
    };
  };
}

interface Operation {
  summary: string;
  parameters?: Parameter[];
  responses: Record<string, ResponseContent>;
}

interface PathItem {
  [method: string]: Operation; 
}

interface OpenApiDoc {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
}

// --- Mermaid Renderer Component ---

const MermaidViewer: React.FC<MermaidViewerProps> = ({ code }) => {
  const [imgUrl, setImgUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      const jsonString = JSON.stringify({ 
        code: code, 
        mermaid: { 
          theme: 'default', 
          securityLevel: 'loose',
          sequence: { showSequenceNumbers: true }
        } 
      });
      
      const utf8Bytes = new TextEncoder().encode(jsonString);
      const binaryString = Array.from(utf8Bytes, byte => String.fromCodePoint(byte)).join("");
      const b64 = window.btoa(binaryString);
      
      setImgUrl(`https://mermaid.ink/img/${b64}`);
      setError(false);
    } catch (e) {
      console.error("Mermaid render error:", e);
      setError(true);
    }
  }, [code]);

  if (error) return (
    <div className="flex items-center justify-center p-8 text-red-400 text-sm bg-red-50/50 rounded border border-red-100">
      <AlertCircle size={16} className="mr-2" /> Unable to render diagram.
    </div>
  );
  
  return (
    <div className="w-full h-full bg-white overflow-auto flex justify-center items-start p-4">
      {code ? (
        <img 
          src={imgUrl} 
          alt="Mermaid Diagram" 
          className="max-w-none shadow-sm"
          loading="lazy"
        />
      ) : (
        <span className="text-slate-400 text-sm">Diagram preview</span>
      )}
    </div>
  );
};

// --- Main Application ---

export default function App() {
  // State for content
  const [mermaidCode, setMermaidCode] = useState<string>(`sequenceDiagram
    participant User
    participant API
    
    Note over User, API: Resize panes to view details
    
    User->>API: GET /users?active=true
    API-->>User: 200 OK
    
    User->>API: POST /users/{id}/update
    API-->>User: 200 Updated`);

  const [openApiOutput, setOpenApiOutput] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'yaml' | 'json'>('yaml');
  const [activeTab, setActiveTab] = useState<'editor' | 'guide'>('editor');
  const [copied, setCopied] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // --- Resizing State & Refs ---
  const [leftWidth, setLeftWidth] = useState<number>(50); 
  const [topHeight, setTopHeight] = useState<number>(50);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  
  // Use boolean refs to track dragging state without triggering re-renders
  const isDraggingVertical = useRef<boolean>(false);
  const isDraggingHorizontal = useRef<boolean>(false);

  // --- Resizing Logic ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingVertical.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      // Clamp between 20% and 80%
      newWidth = Math.min(Math.max(newWidth, 20), 80);
      setLeftWidth(newWidth);
    }

    if (isDraggingHorizontal.current && leftPaneRef.current) {
      const paneRect = leftPaneRef.current.getBoundingClientRect();
      let newHeight = ((e.clientY - paneRect.top) / paneRect.height) * 100;
      // Clamp between 20% and 80%
      newHeight = Math.min(Math.max(newHeight, 20), 80);
      setTopHeight(newHeight);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingVertical.current || isDraggingHorizontal.current) {
        isDraggingVertical.current = false;
        isDraggingHorizontal.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto'; 
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startVerticalDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingVertical.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; 
  };

  const startHorizontalDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingHorizontal.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };


  // --- The Parser Logic ---
  const parseMermaidToOpenApi = (code: string): OpenApiDoc => {
    const lines = code.split('\n');
    const paths: Record<string, PathItem> = {};
    let currentPath: string | null = null;
    let currentMethod: string | null = null;
    
    const requestPattern = /->>.*?: ?(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) ([^\s]+)(.*)/i;
    const responsePattern = /-->>.*?: ?(\d{3})(.*)/;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const reqMatch = trimmed.match(requestPattern);
      if (reqMatch) {
        const method = reqMatch[1].toLowerCase();
        const rawUrl = reqMatch[2]; 
        const rawSummary = reqMatch[3] ? reqMatch[3].trim() : '';
        
        let pathKey = rawUrl;
        const detectedParams: Parameter[] = [];

        if (rawUrl.includes('?')) {
            const [p, q] = rawUrl.split('?');
            pathKey = p;
            if (q) {
                const pairs = q.split('&');
                pairs.forEach(pair => {
                    const [key, val] = pair.split('=');
                    if (key) {
                        detectedParams.push({
                            name: key,
                            in: "query",
                            schema: { type: "string", example: val || "" }
                        });
                    }
                });
            }
        }

        const paramMatches = pathKey.match(/\{([^}]+)\}/g);
        if (paramMatches) {
            paramMatches.forEach(p => {
                const name = p.replace(/[{}]/g, '');
                detectedParams.push({
                    name: name,
                    in: "path",
                    required: true,
                    schema: { type: "string" }
                });
            });
        }

        const summary = rawSummary || `Operation for ${pathKey}`;
        if (!paths[pathKey]) paths[pathKey] = {};
        
        paths[pathKey][method] = {
          summary: summary,
          parameters: detectedParams.length > 0 ? detectedParams : undefined,
          responses: {}
        };
        currentPath = pathKey;
        currentMethod = method;
        return;
      }

      const resMatch = trimmed.match(responsePattern);
      if (resMatch && currentPath && currentMethod) {
        const status = resMatch[1];
        const description = resMatch[2] ? resMatch[2].trim() : 'Response description';
        
        if (paths[currentPath] && paths[currentPath][currentMethod]) {
             if (!paths[currentPath][currentMethod].responses) {
                paths[currentPath][currentMethod].responses = {};
            }
            paths[currentPath][currentMethod].responses[status] = {
                description: description,
                content: { 
                  "application/json": { 
                    schema: { 
                      type: "object", 
                      example: {} 
                    } 
                  } 
                }
            };
        }
      }
    });

    return {
      openapi: "3.0.0",
      info: { title: "Generated API", version: "1.0.0" },
      paths: paths
    };
  };

  // Helper type for recursive iteration
  const toYaml = (obj: Record<string, unknown> | unknown, indent = 0): string => {
    let yaml = '';
    const spaces = '  '.repeat(indent);
    
    if (typeof obj !== 'object' || obj === null) {
      return `${JSON.stringify(obj)}\n`;
    }

    // Handle standard objects and arrays
    const objectValue = obj as Record<string, unknown>;

    for (const key in objectValue) {
      const value = objectValue[key];
      if (value === undefined) continue; 
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            yaml += `${spaces}${key}:\n`;
            value.forEach((item: unknown) => {
                if (typeof item === 'object' && item !== null) {
                    const itemYaml = toYaml(item, indent + 2).trimStart();
                    yaml += `${spaces}  - ${itemYaml}`; 
                } else {
                    yaml += `${spaces}  - ${item}\n`;
                }
            });
        } else if (Object.keys(value).length === 0) {
          yaml += `${spaces}${key}: {}\n`;
        } else {
          yaml += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
        }
      } else {
        yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
      }
    }
    return yaml;
  };

  useEffect(() => {
    try {
      const resultObj = parseMermaidToOpenApi(mermaidCode);
      if (Object.keys(resultObj.paths).length === 0) {
        setParseError("No valid interactions found.");
      } else {
        setParseError(null);
      }
      
      // Type assertion for toYaml compatibility
      const safeResult = resultObj as unknown as Record<string, unknown>;

      if (outputFormat === 'json') {
        setOpenApiOutput(JSON.stringify(resultObj, null, 2));
      } else {
        setOpenApiOutput(toYaml(safeResult));
      }
    } catch (err) {
      setParseError("Error parsing diagram.");
    }
  }, [mermaidCode, outputFormat]);

  const handleCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = openApiOutput;
    document.body.appendChild(textarea);
    textarea.select();
    try { 
      document.execCommand('copy'); 
      setCopied(true); 
    } catch (e) {
      console.error("Copy failed", e);
    }
    document.body.removeChild(textarea);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertExample = () => {
    setMermaidCode(`sequenceDiagram
    participant Client
    participant API
    
    Client->>API: GET /users?role=admin
    API-->>Client: 200 []
    
    Client->>API: POST /users/{id}
    API-->>Client: 201 Created`);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mermaid to OpenAPI</h1>
          </div>
        </div>
        
        <div className="flex gap-3">
           <button 
            onClick={() => setActiveTab(activeTab === 'guide' ? 'editor' : 'guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'guide' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <BookOpen size={16} /> {activeTab === 'guide' ? 'Back' : 'Guide'}
          </button>
          <button onClick={insertExample} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors">
            <Play size={16} /> Example
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative" ref={containerRef}>
        
        {activeTab === 'guide' ? (
          <div className="w-full h-full overflow-auto p-8 max-w-4xl mx-auto">
             <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-6 text-blue-600">Syntax Guide</h2>
                <div className="space-y-4 text-slate-700">
                  <p className="flex items-center gap-2">
                    <span className="font-bold bg-slate-100 px-2 py-1 rounded">Request</span> 
                    <code>User-&gt;&gt;API: GET /path</code>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold bg-slate-100 px-2 py-1 rounded">Response</span> 
                    <code>API--&gt;&gt;User: 200 OK</code>
                  </p>
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <Info size={14} className="inline mr-1"/>
                      Parameters in <code>{`{braces}`}</code> are detected as path parameters. Query strings <code>?key=val</code> are detected as query parameters.
                    </p>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex w-full h-full">
            
            {/* LEFT PANE (Code + Diagram) */}
            <div 
                ref={leftPaneRef}
                className="flex flex-col h-full min-w-[200px]"
                style={{ width: `${leftWidth}%` }}
            >
                {/* Top Section: Code Editor */}
                <div className="flex flex-col min-h-[100px]" style={{ height: `${topHeight}%` }}>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase">Mermaid Input</span>
                    </div>
                    <textarea
                        value={mermaidCode}
                        onChange={(e) => setMermaidCode(e.target.value)}
                        className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none text-slate-700 w-full"
                        placeholder="Enter mermaid code..."
                        spellCheck={false}
                    />
                </div>

                {/* Horizontal Resizer */}
                <div 
                    onMouseDown={startHorizontalDrag}
                    className="h-3 bg-slate-100 hover:bg-blue-100 border-y border-slate-200 cursor-row-resize flex items-center justify-center shrink-0 z-10 transition-colors group"
                >
                    <GripHorizontal size={16} className="text-slate-400 group-hover:text-blue-500" />
                </div>

                {/* Bottom Section: Diagram Preview */}
                <div className="flex-1 flex flex-col min-h-[100px] overflow-hidden bg-white">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase">Diagram Preview</span>
                    </div>
                    <div className="flex-1 overflow-auto bg-white relative">
                         <MermaidViewer code={mermaidCode} />
                    </div>
                </div>
            </div>

            {/* Vertical Resizer */}
            <div 
                onMouseDown={startVerticalDrag}
                className="w-3 bg-slate-100 hover:bg-blue-100 border-x border-slate-200 cursor-col-resize flex items-center justify-center shrink-0 z-10 transition-colors group"
            >
                <GripVertical size={16} className="text-slate-400 group-hover:text-blue-500" />
            </div>

            {/* RIGHT PANE (OpenAPI Output) */}
            <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 min-w-[200px]">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">OpenAPI Output</span>
                  {parseError && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Error</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-700 rounded p-0.5">
                    <button onClick={() => setOutputFormat('yaml')} className={`px-2 py-0.5 text-xs rounded ${outputFormat === 'yaml' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}>YAML</button>
                    <button onClick={() => setOutputFormat('json')} className={`px-2 py-0.5 text-xs rounded ${outputFormat === 'json' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}>JSON</button>
                  </div>
                  <button onClick={handleCopy} className="text-slate-400 hover:text-white">{copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}</button>
                </div>
              </div>
              <textarea
                readOnly
                value={openApiOutput}
                className="flex-1 w-full bg-slate-900 p-4 font-mono text-sm text-green-300 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}