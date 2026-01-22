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
  notes: Note[];
}

export interface Interaction {
  type: 'request' | 'response';
  source: string;
  target: string;
  method?: string;
  path?: string;
  status?: string;
  description?: string;
  summary?: string;
  line: number;
  note?: Note;
  contextPath?: string;
  contextMethod?: string;
  contextServer?: string;
}

export interface Note {
  participants: string[];
  content: string;
  type: 'body' | 'info';
  line: number;
}
