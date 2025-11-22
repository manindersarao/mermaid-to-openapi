import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRightLeft, 
  Copy, 
  Check,
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

interface SchemaObject {
  type: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  example?: any;
  items?: SchemaObject;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: SchemaObject;
}

interface MediaType {
  schema: SchemaObject;
}

interface ResponseContent {
  description: string;
  content: {
    "application/json": MediaType;
  };
}

interface RequestBody {
  content: {
    "application/json": MediaType;
  };
  required?: boolean;
}

interface Operation {
  summary: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
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

// --- Helper Functions ---

const parseSchemaFromValue = (value: any): { schema: SchemaObject, isRequired: boolean } => {
  const schema: SchemaObject = { type: 'string' };
  let isRequired = false;

  if (typeof value === 'string') {
    // Check for validation shorthand string: "type, validation, ..."
    // e.g. "string, required, format:email"
    const parts = value.split(',').map(s => s.trim());
    const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
    
    // Heuristic: If it starts with a type OR has "required"/"min:"/"max:", treat as definition
    const explicitType = validTypes.includes(parts[0]) ? parts[0] : null;
    const isDefinition = explicitType || parts.some(p => p === 'required' || p.includes(':'));

    if (isDefinition) {
      schema.type = explicitType || 'string'; // Default to string if just validations provided

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

  // Infer from literal value
  if (typeof value === 'number') {
    schema.type = Number.isInteger(value) ? 'integer' : 'number';
    schema.example = value;
  } else if (typeof value === 'boolean') {
    schema.type = 'boolean';
    schema.example = value;
  } else if (Array.isArray(value)) {
    schema.type = 'array';
    schema.items = parseSchemaFromValue(value[0] || '').schema;
  } else if (typeof value === 'object' && value !== null) {
    schema.type = 'object';
    // Recursion is handled by the generateSchema function, not here for leaf values usually
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
    // Recursive check for nested objects
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
  const [mermaidCode, setMermaidCode] = useState<string>(`sequenceDiagram
    participant User
    participant API
    
    Note over User, API: Define validation rules in Body notes
    
    User->>API: POST /users/register
    Note right of User: Body: { "username": "string, required, min:5", "age": "integer, min:18", "email": "alice@test.com" }
    
    API-->>User: 201 Created`);

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
  const isDraggingVertical = useRef<boolean>(false);
  const isDraggingHorizontal = useRef<boolean>(false);

  // --- Resizing Logic ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingVertical.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      newWidth = Math.min(Math.max(newWidth, 20), 80);
      setLeftWidth(newWidth);
    }

    if (isDraggingHorizontal.current && leftPaneRef.current) {
      const paneRect = leftPaneRef.current.getBoundingClientRect();
      let newHeight = ((e.clientY - paneRect.top) / paneRect.height) * 100;
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
    
    // State tracking
    let currentPath: string | null = null;
    let currentMethod: string | null = null;
    let lastInteraction: { type: 'req' | 'res', status?: string } | null = null;
    
    // Patterns
    const requestPattern = /->>.*?: ?(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) ([^\s]+)(.*)/i;
    const responsePattern = /-->>.*?: ?(\d{3})(.*)/;
    const notePattern = /Note .*?: ?Body: ?(.+)/i;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // 1. Check Request
      const reqMatch = trimmed.match(requestPattern);
      if (reqMatch) {
        const method = reqMatch[1].toLowerCase();
        const rawUrl = reqMatch[2]; 
        const rawSummary = reqMatch[3] ? reqMatch[3].trim() : '';
        
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
        if (!paths[pathKey]) paths[pathKey] = {};
        
        // Initialize Operation
        paths[pathKey][method] = {
          summary: summary,
          parameters: detectedParams.length > 0 ? detectedParams : undefined,
          responses: {}
        };
        
        currentPath = pathKey;
        currentMethod = method;
        lastInteraction = { type: 'req' };
        return;
      }

      // 2. Check Response
      const resMatch = trimmed.match(responsePattern);
      if (resMatch && currentPath && currentMethod) {
        const status = resMatch[1];
        const description = resMatch[2] ? resMatch[2].trim() : 'Response description';
        
        if (paths[currentPath][currentMethod]) {
            if (!paths[currentPath][currentMethod].responses) {
                paths[currentPath][currentMethod].responses = {};
            }
            // Default response
            paths[currentPath][currentMethod].responses[status] = {
                description: description,
                content: { 
                  "application/json": { 
                    schema: { type: "object", example: {} } 
                  } 
                }
            };
        }
        lastInteraction = { type: 'res', status: status };
        return;
      }

      // 3. Check Note for Body Definition
      const noteMatch = trimmed.match(notePattern);
      if (noteMatch && currentPath && currentMethod && lastInteraction) {
        const bodyContent = noteMatch[1].trim();
        try {
            // Attempt to parse JSON
            const parsedJson = JSON.parse(bodyContent);
            const schema = generateSchema(parsedJson);

            if (lastInteraction.type === 'req') {
                // Attach to Request Body
                paths[currentPath][currentMethod].requestBody = {
                    content: {
                        "application/json": { schema: schema }
                    },
                    required: true
                };
            } else if (lastInteraction.type === 'res' && lastInteraction.status) {
                // Attach to Response Body
                const status = lastInteraction.status;
                if (paths[currentPath][currentMethod].responses[status]) {
                    paths[currentPath][currentMethod].responses[status].content["application/json"].schema = schema;
                }
            }
        } catch (e) {
            console.warn("Failed to parse body note JSON", e);
        }
      }
    });

    return {
      openapi: "3.0.0",
      info: { title: "Generated API", version: "1.0.0" },
      paths: paths
    };
  };

  const toYaml = (obj: Record<string, unknown> | unknown, indent = 0): string => {
    let yaml = '';
    const spaces = '  '.repeat(indent);
    
    if (typeof obj !== 'object' || obj === null) {
      return `${JSON.stringify(obj)}\n`;
    }

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
    try { document.execCommand('copy'); setCopied(true); } catch (e) {}
    document.body.removeChild(textarea);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertExample = () => {
    setMermaidCode(`sequenceDiagram
    participant Client
    participant API
    
    Note over Client, API: Validation Examples
    
    Client->>API: POST /users/create
    Note right of Client: Body: { "username": "string, required, min:5", "age": "integer, min:18, max:99", "email": "string, required, format:email" }
    API-->>Client: 201 { "id": 123, "status": "created" }
    
    Client->>API: PUT /products/{id}
    Note right of Client: Body: { "tags": ["array", "string"], "stock": 50 }
    API-->>Client: 200 { "updated": true }`);
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
                <div className="space-y-6 text-slate-700">
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-2">1. Request & Response</h3>
                    <code className="block bg-slate-100 p-2 rounded mb-2">User-&gt;&gt;API: POST /path</code>
                    <code className="block bg-slate-100 p-2 rounded">API--&gt;&gt;User: 200 OK</code>
                  </div>
                  
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-2">2. Body & Validation</h3>
                    <p className="mb-2 text-sm">Add a note starting with <code>Body:</code> immediately after a request or response.</p>
                    <code className="block bg-slate-100 p-2 rounded mb-2">Note right of User: Body: &#123; "key": "rule" &#125;</code>
                    
                    <h4 className="font-semibold mt-3 text-sm">Validation Rules (String Format):</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                        <li><code>"string, required"</code></li>
                        <li><code>"integer, min:10, max:20"</code></li>
                        <li><code>"string, format:email"</code></li>
                        <li><code>"string, min:5"</code> (interpreted as minLength)</li>
                    </ul>
                    
                    <h4 className="font-semibold mt-3 text-sm">Implicit Inference:</h4>
                    <p className="text-sm">Use literal values to infer types automatically:</p>
                    <code className="block bg-slate-100 p-2 rounded mt-1 text-xs">Body: &#123; "age": 25, "active": true &#125;</code>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex w-full h-full">
            
            {/* LEFT PANE */}
            <div 
                ref={leftPaneRef}
                className="flex flex-col h-full min-w-[200px]"
                style={{ width: `${leftWidth}%` }}
            >
                {/* Editor */}
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

                {/* Preview */}
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

            {/* RIGHT PANE */}
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