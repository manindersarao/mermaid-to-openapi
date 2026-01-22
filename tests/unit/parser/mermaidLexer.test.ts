import { describe, it, expect } from 'vitest';
import { tokenize } from '@/parser/mermaidLexer';

describe('mermaidLexer', () => {
  describe('tokenize', () => {
    it('should tokenize simple request', () => {
      const input = 'User->>API: GET /users';
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('request');
      expect(tokens[0].source).toBe('User');
      expect(tokens[0].target).toBe('API');
      expect(tokens[0].method).toBe('get');
      expect(tokens[0].path).toBe('/users');
    });

    it('should tokenize response', () => {
      const input = 'API-->>User: 200 OK';
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('response');
      expect(tokens[0].source).toBe('API');
      expect(tokens[0].target).toBe('User');
      expect(tokens[0].status).toBe('200');
    });

    it('should tokenize participant declaration', () => {
      const input = 'participant User';
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('participant');
      expect(tokens[0].name).toBe('User');
    });

    it('should tokenize multiple lines', () => {
      const input = `User->>API: GET /users
API-->>User: 200 OK`;
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(2);
    });

    it('should handle empty lines', () => {
      const input = `User->>API: GET /users

API-->>User: 200 OK`;
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(2);
    });

    it('should track line numbers', () => {
      const input = `User->>API: GET /users
API-->>User: 200 OK`;
      const tokens = tokenize(input);
      expect(tokens[0].line).toBe(1);
      expect(tokens[1].line).toBe(2);
    });

    it('should handle lowercase HTTP methods', () => {
      const input = 'User->>API: get /users';
      const tokens = tokenize(input);
      expect(tokens[0].method).toBe('get'); // normalized to lowercase
    });

    it('should tokenize note with body', () => {
      const input = 'Note over User,API: Body: { "id": 1 }';
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('note');
      expect(tokens[0].content).toContain('{ "id": 1 }');
    });

    it('should ignore comment lines', () => {
      const input = `%% This is a comment
User->>API: GET /users`;
      const tokens = tokenize(input);
      expect(tokens).toHaveLength(1);
    });
  });
});
