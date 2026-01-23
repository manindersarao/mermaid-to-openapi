export interface MermaidToken {
  type: 'participant' | 'request' | 'response' | 'note';
  line: number;
  name?: string;
  source?: string;
  target?: string;
  method?: string;
  path?: string;
  summary?: string;
  status?: string;
  description?: string;
  participants?: string[];
  content?: string;
  noteType?: 'body' | 'info';
}

export interface MermaidAST {
  participants: string[];
  interactions: Interaction[];
  notes: (Note | ParserWarning)[];
}

export interface Interaction {
  type: 'request' | 'response';
  from: string;
  to: string;
  method?: string;
  path?: string;
  status?: string;
  description?: string;
  summary?: string;
  line: number;
  note?: Note;
  response?: {
    status?: string;
    description?: string;
  };
  body?: unknown;
  contextPath?: string;
  contextMethod?: string;
  contextServer?: string;
  security?: string[];
  tags?: string[];
  externalDocs?: ExternalDocumentation;
  requestMediaType?: string;
  responseMediaType?: string;
  operationId?: string;
  deprecated?: boolean;
}

export interface ExternalDocumentation {
  url?: string;
  description?: string;
}

export interface Note {
  participants: string[];
  content: string;
  type: 'body' | 'info';
  line: number;
}

export interface ParserWarning {
  type: 'warning' | 'error';
  line: number;
  message: string;
}
