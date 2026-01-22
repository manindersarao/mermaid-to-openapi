import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, ChevronRight, ChevronDown, Server } from 'lucide-react';
import type { OpenApiDoc } from '../types';
import { toYaml } from '../generators/yamlFormatter';

export interface CollapsibleSpecProps {
  title: string;
  content: OpenApiDoc;
  format: 'json' | 'yaml';
}

export const CollapsibleSpec: React.FC<CollapsibleSpecProps> = ({
  title,
  content,
  format,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const textContent = useMemo(() => {
    return format === 'json'
      ? JSON.stringify(content, null, 2)
      : toYaml(content as unknown as Record<string, unknown>);
  }, [content, format]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

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
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-300">
            {format.toUpperCase()}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-600"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="h-96 relative border-t border-slate-700">
          <textarea
            readOnly
            value={textContent}
            className="w-full h-full bg-slate-900 p-4 font-mono text-sm text-green-300 focus:outline-none resize-none"
            spellCheck={false}
            aria-label={`${title} API ${format.toUpperCase()} content`}
          />
        </div>
      )}
    </div>
  );
};

export const MemoizedCollapsibleSpec = React.memo(CollapsibleSpec);
