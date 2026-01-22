import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Props for the MermaidViewer component
 */
export interface MermaidViewerProps {
  /**
   * Mermaid diagram code to render
   */
  code: string;
}

/**
 * MermaidViewer component
 *
 * Renders Mermaid diagrams as images using the mermaid.ink service.
 * Handles encoding the diagram code and displaying errors if rendering fails.
 *
 * @param props - Component props containing the Mermaid code
 * @returns JSX element displaying the rendered diagram or error message
 */
export const MermaidViewer: React.FC<MermaidViewerProps> = ({ code }) => {
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

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizing URL generation with code prop
      setImgUrl(`https://mermaid.ink/img/${b64}`);
      setError(false);
    } catch {
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
