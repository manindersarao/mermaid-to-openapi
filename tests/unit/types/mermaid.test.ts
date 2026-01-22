import { describe, it, expect } from 'vitest';
import type { MermaidToken, MermaidAST, Interaction, Note } from '@/types/mermaid';

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
  });

  describe('MermaidAST', () => {
    it('should create valid AST', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [],
        notes: []
      };
      expect(ast.participants).toHaveLength(2);
    });
  });
});
