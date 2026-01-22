import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  ArrowRightLeft,
  Copy,
  Check,
  AlertCircle,
  BookOpen,
  GripVertical,
  GripHorizontal,
  ChevronRight,
  ChevronDown,
  Server,
  FileCode
} from 'lucide-react';
import type {
  SchemaObject,
  Parameter,
  OpenApiDoc,
  MultiSpecDocs
} from './types';

// --- Type Definitions ---

interface MermaidViewerProps {
  code: string;
}

// --- Helper Functions ---

const parseSchemaFromValue = (value: any): { schema: SchemaObject, isRequired: boolean } => {
  const schema: SchemaObject = { type: 'string' };
  let isRequired = false;

  // 1. Handle Explicit Validation Strings
  if (typeof value === 'string') {
    const parts = value.split(',').map(s => s.trim());
    const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
    
    const explicitType = validTypes.includes(parts[0]) ? parts[0] : null;
    const isDefinition = explicitType || parts.some(p => p === 'required' || p.includes(':'));

    if (isDefinition) {
      schema.type = explicitType || 'string';
      parts.forEach(part => {
        if (part === 'required') isRequired = true;
        else if (part.startsWith('min:')) {
          const val = Number(part.split(':')[1]);
          if (schema.type === 'string') schema.minLength = val;
          else schema.minimum = val;
        }
        else if (part.startsWith('max:')) {
          const val = Number(part.split(':')[1]);
          if (schema.type === 'string') schema.maxLength = val;
          else schema.maximum = val;
        }
        else if (part.startsWith('format:')) {
          schema.format = part.split(':')[1];
        }
        else if (part.startsWith('example:')) {
          schema.example = part.split(':')[1];
        }
      });
      return { schema, isRequired };
    }
  }

  // 2. Auto-Inference
  if (value === null) {
     schema.type = 'string'; 
  } else if (typeof value === 'number') {
    schema.type = Number.isInteger(value) ? 'integer' : 'number';
    schema.example = value;
  } else if (typeof value === 'boolean') {
    schema.type = 'boolean';
    schema.example = value;
  } else if (Array.isArray(value)) {
    schema.type = 'array';
    if (value.length > 0) {
        schema.items = parseSchemaFromValue(value[0]).schema;
    } else {
        schema.items = { type: 'string' };
    }
    schema.example = value;
  } else if (typeof value === 'object') {
    schema.type = 'object';
  } else {
    schema.type = 'string';
    schema.example = value;
  }

  return { schema, isRequired };
};

const generateSchema = (jsonObj: Record<string, any>): SchemaObject => {
  const properties: Record<string, SchemaObject> = {};
  const requiredFields: string[] = [];

  for (const [key, value] of Object.entries(jsonObj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      properties[key] = generateSchema(value);
    } else {
      const { schema, isRequired } = parseSchemaFromValue(value);
      properties[key] = schema;
      if (isRequired) requiredFields.push(key);
    }
  }

  const result: SchemaObject = {
    type: 'object',
    properties
  };

  if (requiredFields.length > 0) {
    result.required = requiredFields;
  }

  return result;
};

const toYaml = (obj: Record<string, unknown> | unknown, indent = 0): string => {
    let yaml = '';
    const spaces = '  '.repeat(indent);
    if (typeof obj !== 'object' || obj === null) return `${JSON.stringify(obj)}\n`;
    const objectValue = obj as Record<string, unknown>;
    for (const key in objectValue) {
      const value = objectValue[key];
      if (value === undefined) continue; 
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            yaml += `${spaces}${key}:\n`;
            value.forEach((item: unknown) => {
                if (typeof item === 'object' && item !== null) {
                    yaml += `${spaces}  - ${toYaml(item, indent + 2).trimStart()}`; 
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


// --- Components ---

const CollapsibleSpec = ({ title, content, format }: { title: string, content: OpenApiDoc, format: 'json' | 'yaml' }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [copied, setCopied] = useState(false);

    const textContent = format === 'json' 
        ? JSON.stringify(content, null, 2) 
        : toYaml(content as unknown as Record<string, unknown>);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const textarea = document.createElement('textarea');
        textarea.value = textContent;
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); setCopied(true); } catch (e) {}
        document.body.removeChild(textarea);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border-b border-slate-700 bg-slate-800 last:border-b-0">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-700 transition-colors select-none"
            >
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Server size={16} className="text-blue-400" />
                    <span>{title} API</span>
                    <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-300">{format.toUpperCase()}</span>
                </div>
                <button onClick={handleCopy} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-600">
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
            </div>
            
            {isOpen && (
                <div className="h-96 relative border-t border-slate-700">
                     <textarea 
                        readOnly 
                        value={textContent} 
                        className="w-full h-full bg-slate-900 p-4 font-mono text-sm text-green-300 focus:outline-none resize-none"
                        spellCheck={false}
                    />
                </div>
            )}
        </div>
    );
};

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
            onError={() => setError(true)} 
        />
      ) : (
        <span className="text-slate-400 text-sm">Diagram preview</span>
      )}
    </div>
  );
};

const GuideSection = ({ title, description, code, onApply }: { title: string, description: string, code: string, onApply: (c: string) => void }) => (
    <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ChevronRight size={16} className="text-blue-500" /> {title}
            </h3>
            <button onClick={() => onApply(code)} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 text-slate-600 font-medium">
                Try this
            </button>
        </div>
        <div className="p-4">
            <p className="text-sm text-slate-600 mb-3">{description}</p>
            <div className="bg-slate-900 rounded-md p-3 relative group">
                <code className="text-xs text-blue-300 font-mono whitespace-pre-wrap">{code}</code>
            </div>
        </div>
    </div>
);

// --- Main Application ---

export default function App() {
  const [mermaidCode, setMermaidCode] = useState<string>(`sequenceDiagram
    participant User
    participant Gateway
    participant ProductService 
    
    Note over User, ProductService: Multi-System Example
    
    User->>Gateway: GET /api/products
    Gateway->>ProductService: GET /internal/products?active=true
    ProductService-->>Gateway: 200 { "items": [] }
    Gateway-->>User: 200 { "products": [] }`);

  const [generatedSpecs, setGeneratedSpecs] = useState<MultiSpecDocs>({});
  const [outputFormat, setOutputFormat] = useState<'yaml' | 'json'>('yaml');
  const [activeTab, setActiveTab] = useState<'editor' | 'guide'>('editor');
  const [parseError, setParseError] = useState<string | null>(null);

  // Layout State
  const [leftWidth, setLeftWidth] = useState<number>(50); 
  const [topHeight, setTopHeight] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const isDraggingVertical = useRef<boolean>(false);
  const isDraggingHorizontal = useRef<boolean>(false);

  // --- Parser Logic ---
  const parseMermaidToOpenApi = (code: string): MultiSpecDocs => {
    const lines = code.split('\n');
    
    // We now maintain a dictionary of specs, one for each server participant
    const specs: MultiSpecDocs = {};
    
    // State tracking
    let currentPath: string | null = null;
    let currentMethod: string | null = null;
    // Track which server is handling the current active request
    let activeServer: string | null = null; 
    
    // Track context for Notes: { type, status, server }
    let lastInteraction: { type: 'req' | 'res', status?: string, server: string } | null = null;
    
    // Updated Regex to capture Source and Target
    // Matches: Source ->> Target: METHOD URL Description
    const requestPattern = /^\s*([^-]+?)\s*->>\s*([^:]+?):\s?(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+([^\s]+)(.*)/i;
    const responsePattern = /-->>.*?: ?(\d{3})(.*)/;
    const notePattern = /Note .*?: ?Body: ?(.+)/i;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // 1. Request Logic
      const reqMatch = trimmed.match(requestPattern);
      if (reqMatch) {
        // const source = reqMatch[1].trim(); // Unused for spec generation but useful for logic
        const targetServer = reqMatch[2].trim(); // This is the API Owner
        const method = reqMatch[3].toLowerCase();
        const rawUrl = reqMatch[4]; 
        const rawSummary = reqMatch[5] ? reqMatch[5].trim() : '';
        
        // Initialize Spec for this Server if not exists
        if (!specs[targetServer]) {
            specs[targetServer] = {
                openapi: "3.0.0",
                info: { title: `${targetServer} API`, version: "1.0.0" },
                paths: {}
            };
        }

        // Parse URL
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
        
        // Initialize Path Structure
        if (!specs[targetServer].paths[pathKey]) {
            specs[targetServer].paths[pathKey] = {};
        }

        specs[targetServer].paths[pathKey][method] = {
          summary: summary,
          parameters: detectedParams.length > 0 ? detectedParams : undefined,
          responses: {}
        };
        
        // Update Context
        currentPath = pathKey;
        currentMethod = method;
        activeServer = targetServer;
        lastInteraction = { type: 'req', server: targetServer };
        return;
      }

      // 2. Response Logic
      const resMatch = trimmed.match(responsePattern);
      if (resMatch && currentPath && currentMethod && activeServer) {
        const status = resMatch[1];
        const description = resMatch[2] ? resMatch[2].trim() : 'Response description';
        
        // Ensure we are adding response to the correct server's spec
        if (specs[activeServer]?.paths[currentPath]?.[currentMethod]) {
             const op = specs[activeServer].paths[currentPath][currentMethod];
             if (!op.responses) op.responses = {};
             
             op.responses[status] = {
                description: description,
                content: { "application/json": { schema: { type: "object", example: {} } } }
            };
        }
        lastInteraction = { type: 'res', status: status, server: activeServer };
        return;
      }

      // 3. Body Note Logic
      const noteMatch = trimmed.match(notePattern);
      if (noteMatch && currentPath && currentMethod && lastInteraction) {
        const bodyContent = noteMatch[1].trim();
        const targetSpec = specs[lastInteraction.server];

        try {
            const parsedJson = JSON.parse(bodyContent);
            const schema = generateSchema(parsedJson);

            if (targetSpec && targetSpec.paths[currentPath] && targetSpec.paths[currentPath][currentMethod]) {
                 const op = targetSpec.paths[currentPath][currentMethod];

                if (lastInteraction.type === 'req') {
                    op.requestBody = {
                        content: { "application/json": { schema: schema } },
                        required: true
                    };
                } else if (lastInteraction.type === 'res' && lastInteraction.status) {
                    const status = lastInteraction.status;
                    if (op.responses[status]) {
                        op.responses[status].content["application/json"].schema = schema;
                    }
                }
            }
        } catch (e) {
            // ignore parse errors in notes
        }
      }
    });

    return specs;
  };

  // --- Effects ---
  useEffect(() => {
    try {
      const results = parseMermaidToOpenApi(mermaidCode);
      if (Object.keys(results).length === 0) setParseError("No valid interactions found.");
      else setParseError(null);
      setGeneratedSpecs(results);
    } catch (err) {
      setParseError("Error parsing diagram.");
    }
  }, [mermaidCode]);

  // --- Drag Logic ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingVertical.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.min(Math.max(((e.clientX - containerRect.left) / containerRect.width) * 100, 20), 80);
      setLeftWidth(newWidth);
    }
    if (isDraggingHorizontal.current && leftPaneRef.current) {
      const paneRect = leftPaneRef.current.getBoundingClientRect();
      const newHeight = Math.min(Math.max(((e.clientY - paneRect.top) / paneRect.height) * 100, 20), 80);
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

  const handleLoadExample = (code: string) => {
      setMermaidCode(code);
      setActiveTab('editor');
  }

  const serverNames = Object.keys(generatedSpecs);

  return (
    <div className="h-screen bg-slate-50 text-slate-800 font-sans flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm"><ArrowRightLeft size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mermaid to OpenAPI</h1>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setActiveTab(activeTab === 'guide' ? 'editor' : 'guide')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'guide' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
            <BookOpen size={16} /> {activeTab === 'guide' ? 'Back to Editor' : 'Documentation'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative" ref={containerRef}>
        {activeTab === 'guide' ? (
          <div className="w-full h-full overflow-auto bg-slate-50">
             <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Documentation & Recipes</h2>
                    <p className="text-slate-600">Copy these snippets to get started with common API patterns.</p>
                </div>

                <GuideSection 
                    title="1. Multi-System Architecture" 
                    description="Define interactions between multiple participants. The tool generates a separate OpenAPI file for each 'Server' (the participant receiving the request)." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
    participant Client
    participant Gateway
    participant DatabaseAPI

    Client->>Gateway: GET /users
    Gateway->>DatabaseAPI: GET /db/users?active=true
    DatabaseAPI-->>Gateway: 200 { "rows": [] }
    Gateway-->>Client: 200 { "users": [] }`} 
                />

                <GuideSection 
                    title="2. Basic GET Request" 
                    description="The simplest interaction. A request followed by a response." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: GET /status
API-->>User: 200 { "status": "online" }`} 
                />

                <GuideSection 
                    title="3. POST with Body" 
                    description="Provide a JSON example in a Note starting with 'Body:'. The parser detects data types automatically." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: POST /products
Note right of User: Body: { "name": "Widget", "price": 9.99, "inStock": true }
API-->>User: 201 Created`} 
                />
             </div>
          </div>
        ) : (
          <div className="flex w-full h-full">
            <div ref={leftPaneRef} className="flex flex-col h-full min-w-[200px]" style={{ width: `${leftWidth}%` }}>
                <div className="flex flex-col min-h-[100px]" style={{ height: `${topHeight}%` }}>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase">Mermaid Input</span>
                    </div>
                    <textarea value={mermaidCode} onChange={(e) => setMermaidCode(e.target.value)} className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none text-slate-700 w-full" spellCheck={false} />
                </div>
                <div onMouseDown={(e) => { e.preventDefault(); isDraggingHorizontal.current = true; document.body.style.cursor = 'row-resize'; }} className="h-3 bg-slate-100 hover:bg-blue-100 border-y border-slate-200 cursor-row-resize flex items-center justify-center shrink-0 z-10 transition-colors group">
                    <GripHorizontal size={16} className="text-slate-400 group-hover:text-blue-500" />
                </div>
                <div className="flex-1 flex flex-col min-h-[100px] overflow-hidden bg-white">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase">Diagram Preview</span>
                    </div>
                    <div className="flex-1 overflow-auto bg-white relative">
                         <MermaidViewer code={mermaidCode} />
                    </div>
                </div>
            </div>
            <div onMouseDown={(e) => { e.preventDefault(); isDraggingVertical.current = true; document.body.style.cursor = 'col-resize'; }} className="w-3 bg-slate-100 hover:bg-blue-100 border-x border-slate-200 cursor-col-resize flex items-center justify-center shrink-0 z-10 transition-colors group">
                <GripVertical size={16} className="text-slate-400 group-hover:text-blue-500" />
            </div>
            <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-100 min-w-[200px]">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">OpenAPI Specs ({serverNames.length})</span>
                  {parseError && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Error</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-700 rounded p-0.5">
                    <button onClick={() => setOutputFormat('yaml')} className={`px-2 py-0.5 text-xs rounded ${outputFormat === 'yaml' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}>YAML</button>
                    <button onClick={() => setOutputFormat('json')} className={`px-2 py-0.5 text-xs rounded ${outputFormat === 'json' ? 'bg-slate-500 text-white' : 'text-slate-400'}`}>JSON</button>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full bg-slate-900 overflow-y-auto">
                 {serverNames.length === 0 ? (
                     <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                         <FileCode size={32} className="opacity-50" />
                         <p>No API interactions detected.</p>
                     </div>
                 ) : (
                     serverNames.map(name => (
                         <CollapsibleSpec 
                            key={name} 
                            title={name} 
                            content={generatedSpecs[name]} 
                            format={outputFormat} 
                        />
                     ))
                 )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Analytics />
    </div>
  );
}