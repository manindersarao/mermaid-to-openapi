import { describe, it, expect } from 'vitest';
import { parse } from '@/parser/mermaidParser';
import type { MermaidToken } from '@/types';

describe('mermaidParser', () => {
  describe('parse', () => {
    it('should build AST from tokens', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'participant',
          line: 1,
          name: 'User'
        },
        {
          type: 'request',
          line: 2,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'response',
          line: 3,
          source: 'API',
          target: 'User',
          status: '200',
          description: 'OK'
        }
      ];

      const ast = parse(tokens);

      expect(ast).toMatchObject({
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users'
          }
        ],
        notes: []
      });
    });

    it('should handle multiple participants', () => {
      const tokens: MermaidToken[] = [
        { type: 'participant', line: 1, name: 'User' },
        { type: 'participant', line: 2, name: 'API' },
        { type: 'participant', line: 3, name: 'Database' }
      ];

      const ast = parse(tokens);

      expect(ast.participants).toEqual(['User', 'API', 'Database']);
    });

    it('should pair requests with responses', () => {
      const tokens: MermaidToken[] = [
        { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
        { type: 'response', line: 2, source: 'API', target: 'User', status: '200' }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0]).toMatchObject({
        response: { status: '200' }
      });
    });

    it('should handle orphaned responses', () => {
      const tokens: MermaidToken[] = [
        { type: 'response', line: 1, source: 'API', target: 'User', status: '200' }
      ];

      const ast = parse(tokens);

      expect(ast.notes.length).toBeGreaterThan(0);
      expect(ast.notes[0].message).toContain('orphaned');
    });

    it('should attach notes to interactions', () => {
      const tokens: MermaidToken[] = [
        { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
        { type: 'note', line: 2, participants: ['API'], content: 'Body: {"id": "string"}', noteType: 'body' }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].body).toEqual({ id: 'string' });
    });

    it('should extract participant names from interactions', () => {
      const tokens: MermaidToken[] = [
        { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' }
      ];

      const ast = parse(tokens);

      expect(ast.participants).toContain('User');
      expect(ast.participants).toContain('API');
    });

    it('should handle multiple interactions', () => {
      const tokens: MermaidToken[] = [
        { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
        { type: 'response', line: 2, source: 'API', target: 'User', status: '200' },
        { type: 'request', line: 3, source: 'User', target: 'API', method: 'POST', path: '/users' },
        { type: 'response', line: 4, source: 'API', target: 'User', status: '201' }
      ];

      const ast = parse(tokens);

      expect(ast.interactions).toHaveLength(2);
    });

    it('should track line numbers for errors', () => {
      const tokens: MermaidToken[] = [
        { type: 'request', line: 5, source: 'User', target: 'API', method: 'GET', path: '/users' }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].line).toBe(5);
    });
  });
});
