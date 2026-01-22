export interface ValidationError {
  source: 'mermaid' | 'openapi';
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  suggestion?: string;
  context?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
