import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowRightLeft, 
  Copy, 
  Check, 
  AlertCircle,
  BookOpen,
  GripVertical,
  GripHorizontal,
  ChevronRight
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

// --- Helper Functions for Type Inference ---

const parseSchemaFromValue = (value: any): { schema: SchemaObject, isRequired: boolean } => {
  const schema: SchemaObject = { type: 'string' };
  let isRequired = false;

  // 1. Handle Explicit Validation Strings (e.g. "integer, required")
  if (typeof value === 'string') {
    // Check if it looks like a validation string
    const parts = value.split(',').map(s => s.trim());
    const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
    
    // Heuristic: If it starts with a type OR has "required"/"min:"/"max:", treat as definition
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
          schema.example = part.split(':')[1]; // Only string examples in this mode
        }
      });
      return { schema, isRequired };
    }
  }

  // 2. Auto-Inference from Literal Values
  if (value === null) {
     schema.type = 'string'; // Default for nulls in simple inference
     // In real OpenAPI 3.0 you'd add nullable: true, keeping simple for now
  } else if (typeof value === 'number') {
    schema.type = Number.isInteger(value) ? 'integer' : 'number';
    schema.example = value;
  } else if (typeof value === 'boolean') {
    schema.type = 'boolean';
    schema.example = value;
  } else if (Array.isArray(value)) {
    schema.type = 'array';
    // Infer items type from the first element
    if (value.length > 0) {
        schema.items = parseSchemaFromValue(value[0]).schema;
    } else {
        schema.items = { type: 'string' }; // Default for empty array
    }
    schema.example = value;
  } else if (typeof value === 'object') {
    // Recursion is handled by generateSchema, this block is hit if an array has an object
    // schema.type = 'object'; 
    // properties handled externally usually, but if hit directly:
    // return { schema: generateSchema(value), isRequired: false };
    // For safety here, we treat as generic object if not passed through generateSchema
    schema.type = 'object';
  } else {
    // Default String literal
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


// --- Components ---

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
        <img src={imgUrl} alt="Mermaid Diagram" className="max-w-none shadow-sm" loading="lazy" />
      ) : (
        <span className="text-slate-400 text-sm">Diagram preview</span>
      )}
    </div>
  );
};

// --- Guide Component ---

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
    participant API
    
    Note over User, API: Auto-Type Inference Demo
    
    User->>API: POST /products/create
    Note right of User: Body: { "name": "Super Widget", "price": 19.99, "stock": 100, "tags": ["gadget", "sale"] }
    API-->>User: 201 { "id": 550e8400, "status": "created" }`);

  const [openApiOutput, setOpenApiOutput] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'yaml' | 'json'>('yaml');
  const [activeTab, setActiveTab] = useState<'editor' | 'guide'>('editor');
  const [copied, setCopied] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Layout State
  const [leftWidth, setLeftWidth] = useState<number>(50); 
  const [topHeight, setTopHeight] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const isDraggingVertical = useRef<boolean>(false);
  const isDraggingHorizontal = useRef<boolean>(false);

  // --- Parser Logic ---
  const parseMermaidToOpenApi = (code: string): OpenApiDoc => {
    const lines = code.split('\n');
    const paths: Record<string, PathItem> = {};
    
    let currentPath: string | null = null;
    let currentMethod: string | null = null;
    let lastInteraction: { type: 'req' | 'res', status?: string } | null = null;
    
    const requestPattern = /->>.*?: ?(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) ([^\s]+)(.*)/i;
    const responsePattern = /-->>.*?: ?(\d{3})(.*)/;
    const notePattern = /Note .*?: ?Body: ?(.+)/i;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Request
      const reqMatch = trimmed.match(requestPattern);
      if (reqMatch) {
        const method = reqMatch[1].toLowerCase();
        const rawUrl = reqMatch[2]; 
        const rawSummary = reqMatch[3] ? reqMatch[3].trim() : '';
        
        let pathKey = rawUrl;
        const detectedParams: Parameter[] = [];
        // Query Params
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
        // Path Params
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
        lastInteraction = { type: 'req' };
        return;
      }

      // Response
      const resMatch = trimmed.match(responsePattern);
      if (resMatch && currentPath && currentMethod) {
        const status = resMatch[1];
        const description = resMatch[2] ? resMatch[2].trim() : 'Response description';
        
        if (paths[currentPath][currentMethod]) {
            if (!paths[currentPath][currentMethod].responses) {
                paths[currentPath][currentMethod].responses = {};
            }
            paths[currentPath][currentMethod].responses[status] = {
                description: description,
                content: { "application/json": { schema: { type: "object", example: {} } } }
            };
        }
        lastInteraction = { type: 'res', status: status };
        return;
      }

      // Body Notes
      const noteMatch = trimmed.match(notePattern);
      if (noteMatch && currentPath && currentMethod && lastInteraction) {
        const bodyContent = noteMatch[1].trim();
        try {
            const parsedJson = JSON.parse(bodyContent);
            const schema = generateSchema(parsedJson);

            if (lastInteraction.type === 'req') {
                paths[currentPath][currentMethod].requestBody = {
                    content: { "application/json": { schema: schema } },
                    required: true
                };
            } else if (lastInteraction.type === 'res' && lastInteraction.status) {
                const status = lastInteraction.status;
                if (paths[currentPath][currentMethod].responses[status]) {
                    paths[currentPath][currentMethod].responses[status].content["application/json"].schema = schema;
                }
            }
        } catch (e) {
            // console.warn("Failed to parse body note JSON");
        }
      }
    });

    return { openapi: "3.0.0", info: { title: "Generated API", version: "1.0.0" }, paths: paths };
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

  // --- Effects ---
  useEffect(() => {
    try {
      const resultObj = parseMermaidToOpenApi(mermaidCode);
      if (Object.keys(resultObj.paths).length === 0) setParseError("No valid interactions found.");
      else setParseError(null);
      const safeResult = resultObj as unknown as Record<string, unknown>;
      setOpenApiOutput(outputFormat === 'json' ? JSON.stringify(resultObj, null, 2) : toYaml(safeResult));
    } catch (err) {
      setParseError("Error parsing diagram.");
    }
  }, [mermaidCode, outputFormat]);

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

  const handleCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = openApiOutput;
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); setCopied(true); } catch (e) {}
    document.body.removeChild(textarea);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadExample = (code: string) => {
      setMermaidCode(code);
      setActiveTab('editor');
  }

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
                    title="1. Basic GET Request" 
                    description="The simplest interaction. A request followed by a response." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: GET /status
API-->>User: 200 { "status": "online" }`} 
                />

                <GuideSection 
                    title="2. Path & Query Parameters" 
                    description="Use {curly} braces for path parameters. Use ?key=value for query parameters. The types are inferred automatically." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: GET /users/{id}/history?limit=10&sort=desc
Note right of User: {id} becomes path param, limit/sort become query params
API-->>User: 200 OK`} 
                />

                <GuideSection 
                    title="3. POST with Body (Auto-Inference)" 
                    description="Provide a JSON example in a Note starting with 'Body:'. The parser detects Integers, Floats, Booleans, and Strings automatically." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: POST /products
Note right of User: Body: { "name": "Widget", "price": 9.99, "inStock": true }
API-->>User: 201 Created`} 
                />

                <GuideSection 
                    title="4. POST with Arrays" 
                    description="You can define arrays in the body. The parser infers the schema from the first item." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: POST /tags/bulk-add
Note right of User: Body: { "ids": [101, 102, 103], "names": ["new", "featured"] }
API-->>User: 200 OK`} 
                />

                <GuideSection 
                    title="5. Advanced Validation Rules" 
                    description="If you need specific constraints, use a string with 'required', 'min:', 'max:', or 'format:'." 
                    onApply={handleLoadExample}
                    code={`sequenceDiagram
User->>API: POST /register
Note right of User: Body: { "email": "string, required, format:email", "age": "integer, min:18" }
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
              <textarea readOnly value={openApiOutput} className="flex-1 w-full bg-slate-900 p-4 font-mono text-sm text-green-300 focus:outline-none resize-none" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}