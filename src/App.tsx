import { useState, useEffect, useRef, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  ArrowRightLeft,
  AlertCircle,
  BookOpen,
  GripVertical,
  GripHorizontal,
  FileCode
} from 'lucide-react';
import { ValidationErrors, MermaidViewer, CollapsibleSpec, GuideSection } from './components';
import type { MultiSpecDocs } from './types';
import type { ValidationResult } from './types';
import { tokenize } from './parser/mermaidLexer';
import { parse } from './parser/mermaidParser';
import { generateOpenApiSpecs } from './generators/openapiGenerator';
import { validateMermaidSyntax, validateOpenApiSpecs } from './validators';

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
  const [mermaidValidation, setMermaidValidation] = useState<ValidationResult | null>(null);
  const [openapiValidation, setOpenapiValidation] = useState<ValidationResult | null>(null);

  // Layout State
  const [leftWidth, setLeftWidth] = useState<number>(50); 
  const [topHeight, setTopHeight] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const isDraggingVertical = useRef<boolean>(false);
  const isDraggingHorizontal = useRef<boolean>(false);

  // --- Effects ---
  useEffect(() => {
    // Validate Mermaid input
    const mermaidResult = validateMermaidSyntax(mermaidCode);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing parsing with code input
    setMermaidValidation(mermaidResult);

    // If Mermaid validation has errors, don't proceed
    if (!mermaidResult.valid) {
      setParseError('Mermaid syntax validation failed');
      setGeneratedSpecs({});
      return;
    }

    // Tokenize and parse
    try {
      const tokens = tokenize(mermaidCode);
      const ast = parse(tokens);

      // Generate OpenAPI specs
      const specs = generateOpenApiSpecs(ast);
      setGeneratedSpecs(specs);

      // Validate generated OpenAPI specs
      const openapiResult = validateOpenApiSpecs(specs);
      setOpenapiValidation(openapiResult);

      // If OpenAPI validation has errors, still show specs but warn user
      if (!openapiResult.valid) {
        setParseError('OpenAPI validation failed - specs may be invalid');
      } else {
        setParseError(null);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error parsing diagram');
      setGeneratedSpecs({});
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
                {/* Validation Errors Display */}
                <div className="p-4">
                  <ValidationErrors
                    validation={mermaidValidation}
                    onClose={() => setMermaidValidation(null)}
                  />
                  <ValidationErrors
                    validation={openapiValidation}
                    onClose={() => setOpenapiValidation(null)}
                  />
                </div>
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