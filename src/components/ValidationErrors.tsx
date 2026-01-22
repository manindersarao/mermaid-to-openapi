import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ValidationError, ValidationResult } from '@/types';

interface ValidationErrorsProps {
  validation: ValidationResult | null;
  onClose?: () => void;
}

/**
 * Displays validation errors and warnings with severity levels,
 * line numbers, context, and suggestions for fixes.
 */
export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ validation, onClose }) => {
  if (!validation || (validation.errors.length === 0 && validation.warnings.length === 0)) {
    return null;
  }

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div className="mb-4">
      {/* Error Summary */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">
                Validation Failed ({validation.errors.length} error{validation.errors.length > 1 ? 's' : ''})
              </h3>
              <p className="text-red-700 text-sm">
                Please fix the errors below to generate valid OpenAPI specifications.
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Close errors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning Summary */}
      {hasWarnings && !hasErrors && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-2">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-800 font-semibold mb-1">
                Validation Warnings ({validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''})
              </h3>
              <p className="text-yellow-700 text-sm">
                The following warnings were detected. Specs generated, but review recommended.
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-yellow-400 hover:text-yellow-600 transition-colors"
                aria-label="Close warnings"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error List */}
      {hasErrors && (
        <div className="space-y-2 mb-2">
          {validation.errors.map((error, index) => (
            <ValidationErrorItem key={`error-${index}`} error={error} />
          ))}
        </div>
      )}

      {/* Warning List */}
      {hasWarnings && (
        <div className="space-y-2">
          {validation.warnings.map((warning, index) => (
            <ValidationErrorItem key={`warning-${index}`} error={warning} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ValidationErrorItemProps {
  error: ValidationError;
}

const ValidationErrorItem: React.FC<ValidationErrorItemProps> = ({ error }) => {
  const isError = error.severity === 'error';
  const isWarning = error.severity === 'warning';

  const bgColors = isError
    ? 'bg-red-50 border-red-200'
    : isWarning
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-blue-50 border-blue-200';

  const iconColors = isError ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-blue-500';
  const textColors = isError ? 'text-red-800' : isWarning ? 'text-yellow-800' : 'text-blue-800';
  const subTextColors = isError ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-blue-700';

  const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : Info;

  return (
    <div className={`border rounded-lg p-3 ${bgColors}`}>
      <div className="flex items-start gap-2">
        <Icon size={16} className={`${iconColors} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium text-sm ${textColors}`}>
              {error.source === 'mermaid' ? 'Mermaid' : 'OpenAPI'} Error
            </span>
            {error.line !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded ${isError ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                Line {error.line}
              </span>
            )}
          </div>
          <p className={`text-sm ${subTextColors} mb-1`}>{error.message}</p>
          {error.context && (
            <code className={`text-xs block mb-1 p-1.5 rounded ${isError ? 'bg-red-100 text-red-900' : 'bg-yellow-100 text-yellow-900'} overflow-x-auto`}>
              {error.context}
            </code>
          )}
          {error.suggestion && (
            <p className={`text-xs ${subTextColors} italic`}>
              💡 {error.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationErrors;
