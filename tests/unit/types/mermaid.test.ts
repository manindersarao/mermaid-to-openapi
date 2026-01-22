import { describe, it, expect } from 'vitest';
import type { MermaidToken, MermaidAST, Interaction, Note, ParserWarning } from '@/types/mermaid';

describe('Mermaid Types', () => {
  describe('MermaidToken', () => {
    it('should create valid token', () => {
      const token: MermaidToken = {
        type: 'request',
        line: 1
      };
      expect(token.type).toBe('request');
      expect(token.line).toBe(1);
    });

    it('should accept all token types', () => {
      const types: MermaidToken['type'][] = ['participant', 'request', 'response', 'note'];
      types.forEach(type => {
        const token: MermaidToken = { type, line: 1 };
        expect(token.type).toBe(type);
      });
    });

    it('should handle optional properties', () => {
      const token: MermaidToken = {
        type: 'request',
        line: 1,
        name: 'Test',
        source: 'Client',
        target: 'Server',
        method: 'GET',
        path: '/api/test',
        summary: 'Test summary',
        status: '200',
        description: 'Test description'
      };
      expect(token.name).toBe('Test');
      expect(token.source).toBe('Client');
      expect(token.target).toBe('Server');
      expect(token.method).toBe('GET');
      expect(token.path).toBe('/api/test');
    });

    it('should handle note-specific properties', () => {
      const token: MermaidToken = {
        type: 'note',
        line: 1,
        participants: ['Client', 'Server'],
        content: 'Note content',
        noteType: 'body'
      };
      expect(token.participants).toEqual(['Client', 'Server']);
      expect(token.content).toBe('Note content');
      expect(token.noteType).toBe('body');
    });
  });

  describe('MermaidAST', () => {
    it('should create valid AST', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [],
        notes: []
      };
      expect(ast.participants).toHaveLength(2);
      expect(ast.interactions).toEqual([]);
      expect(ast.notes).toEqual([]);
    });

    it('should hold interactions and notes', () => {
      const interaction: Interaction = {
        type: 'request',
        from: 'User',
        to: 'API',
        line: 1
      };
      const note: Note = {
        participants: ['User'],
        content: 'Test note',
        type: 'info',
        line: 2
      };
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [interaction],
        notes: [note]
      };
      expect(ast.interactions).toHaveLength(1);
      expect(ast.notes).toHaveLength(1);
    });
  });

  describe('Interaction', () => {
    it('should create valid request interaction', () => {
      const interaction: Interaction = {
        type: 'request',
        from: 'Client',
        to: 'Server',
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        line: 1
      };
      expect(interaction.type).toBe('request');
      expect(interaction.from).toBe('Client');
      expect(interaction.to).toBe('Server');
      expect(interaction.method).toBe('POST');
      expect(interaction.path).toBe('/api/users');
      expect(interaction.summary).toBe('Create user');
    });

    it('should create valid response interaction', () => {
      const interaction: Interaction = {
        type: 'response',
        from: 'Server',
        to: 'Client',
        status: '200',
        description: 'Success',
        line: 2
      };
      expect(interaction.type).toBe('response');
      expect(interaction.status).toBe('200');
      expect(interaction.description).toBe('Success');
    });

    it('should handle optional fields', () => {
      const interaction: Interaction = {
        type: 'request',
        from: 'A',
        to: 'B',
        line: 1
      };
      expect(interaction.method).toBeUndefined();
      expect(interaction.path).toBeUndefined();
      expect(interaction.status).toBeUndefined();
    });

    it('should support context fields', () => {
      const interaction: Interaction = {
        type: 'request',
        from: 'Client',
        to: 'Server',
        line: 1,
        contextPath: '/api',
        contextMethod: 'GET',
        contextServer: 'api.example.com'
      };
      expect(interaction.contextPath).toBe('/api');
      expect(interaction.contextMethod).toBe('GET');
      expect(interaction.contextServer).toBe('api.example.com');
    });

    it('should support optional note attachment', () => {
      const note: Note = {
        participants: ['Client'],
        content: 'Important note',
        type: 'body',
        line: 2
      };
      const interaction: Interaction = {
        type: 'request',
        from: 'Client',
        to: 'Server',
        line: 1,
        note
      };
      expect(interaction.note).toEqual(note);
      expect(interaction.note?.content).toBe('Important note');
    });

    it('should support response object', () => {
      const interaction: Interaction = {
        type: 'request',
        from: 'Client',
        to: 'Server',
        line: 1,
        response: {
          status: '200',
          description: 'Success'
        }
      };
      expect(interaction.response?.status).toBe('200');
      expect(interaction.response?.description).toBe('Success');
    });

    it('should support body property', () => {
      const interaction: Interaction = {
        type: 'request',
        from: 'Client',
        to: 'Server',
        line: 1,
        body: { id: '123' }
      };
      expect(interaction.body).toEqual({ id: '123' });
    });
  });

  describe('Note', () => {
    it('should create valid body note', () => {
      const note: Note = {
        participants: ['Client', 'Server'],
        content: 'Request body schema',
        type: 'body',
        line: 5
      };
      expect(note.type).toBe('body');
      expect(note.participants).toEqual(['Client', 'Server']);
      expect(note.content).toBe('Request body schema');
      expect(note.line).toBe(5);
    });

    it('should create valid info note', () => {
      const note: Note = {
        participants: ['Server'],
        content: 'Authentication required',
        type: 'info',
        line: 10
      };
      expect(note.type).toBe('info');
      expect(note.participants).toEqual(['Server']);
      expect(note.content).toBe('Authentication required');
    });

    it('should support multiple participants', () => {
      const note: Note = {
        participants: ['Client', 'Server', 'Database'],
        content: 'Transaction flow',
        type: 'info',
        line: 15
      };
      expect(note.participants).toHaveLength(3);
      expect(note.participants).toContain('Database');
    });

    it('should require all fields', () => {
      const note: Note = {
        participants: ['A'],
        content: 'Test',
        type: 'body',
        line: 1
      };
      expect(note.participants).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.type).toBeDefined();
      expect(note.line).toBeDefined();
    });
  });

  describe('ParserWarning', () => {
    it('should create valid warning', () => {
      const warning: ParserWarning = {
        type: 'warning',
        line: 5,
        message: 'orphaned response'
      };
      expect(warning.type).toBe('warning');
      expect(warning.line).toBe(5);
      expect(warning.message).toBe('orphaned response');
    });

    it('should create valid error', () => {
      const error: ParserWarning = {
        type: 'error',
        line: 10,
        message: 'Invalid JSON'
      };
      expect(error.type).toBe('error');
      expect(error.line).toBe(10);
      expect(error.message).toBe('Invalid JSON');
    });

    it('should require all fields', () => {
      const warning: ParserWarning = {
        type: 'warning',
        line: 1,
        message: 'Test warning'
      };
      expect(warning.type).toBeDefined();
      expect(warning.line).toBeDefined();
      expect(warning.message).toBeDefined();
    });
  });
});
