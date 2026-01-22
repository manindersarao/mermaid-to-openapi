import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface GuideSectionProps {
  title: string;
  description: string;
  code: string;
  onApply: (code: string) => void;
}

export const GuideSection: React.FC<GuideSectionProps> = ({
  title,
  description,
  code,
  onApply,
}) => (
  <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
        <ChevronRight size={16} className="text-blue-500" /> {title}
      </h3>
      <button
        onClick={() => onApply(code)}
        className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 text-slate-600 font-medium"
      >
        Try this
      </button>
    </div>
    <div className="p-4">
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <div className="bg-slate-900 rounded-md p-3 relative group">
        <code className="text-xs text-blue-300 font-mono whitespace-pre-wrap">
          {code}
        </code>
      </div>
    </div>
  </div>
);
