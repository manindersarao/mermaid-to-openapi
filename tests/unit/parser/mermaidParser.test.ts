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

    // Edge Case Tests

    describe('Edge Cases: Empty and Minimal Input', () => {
      it('should handle empty token array', () => {
        const tokens: MermaidToken[] = [];
        const ast = parse(tokens);

        expect(ast.participants).toEqual([]);
        expect(ast.interactions).toEqual([]);
        expect(ast.notes).toEqual([]);
      });

      it('should handle tokens with only participants', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: 'User' },
          { type: 'participant', line: 2, name: 'API' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toEqual(['User', 'API']);
        expect(ast.interactions).toEqual([]);
        expect(ast.notes).toEqual([]);
      });

      it('should handle tokens with only notes', () => {
        const tokens: MermaidToken[] = [
          { type: 'note', line: 1, participants: ['API'], content: 'Info: Some note', noteType: 'info' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions).toEqual([]);
        expect(ast.notes).toEqual([]);
      });
    });

    describe('Edge Cases: Malformed Participant Names', () => {
      it('should handle participant names with special characters', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: 'User-Service' },
          { type: 'participant', line: 2, name: 'API_V2' },
          { type: 'participant', line: 3, name: 'service.name' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toContain('User-Service');
        expect(ast.participants).toContain('API_V2');
        expect(ast.participants).toContain('service.name');
      });

      it('should handle participant names with numbers', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: 'Service1' },
          { type: 'participant', line: 2, name: 'API2' },
          { type: 'participant', line: 3, name: 'DB3' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toEqual(['Service1', 'API2', 'DB3']);
      });

      it('should handle very long participant names', () => {
        const longName = 'A'.repeat(1000);
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: longName },
          { type: 'request', line: 2, source: longName, target: 'API', method: 'GET', path: '/test' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toContain(longName);
        expect(ast.interactions[0].from).toBe(longName);
      });

      it('should handle participant names with leading/trailing spaces', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: '  User  ' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toContain('  User  ');
      });

      it('should handle duplicate participant declarations', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: 'User' },
          { type: 'participant', line: 2, name: 'User' },
          { type: 'participant', line: 3, name: 'API' },
          { type: 'participant', line: 4, name: 'User' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toEqual(['User', 'API']);
      });
    });

    describe('Edge Cases: Invalid HTTP Methods', () => {
      it('should handle lowercase HTTP methods', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'get', path: '/users' },
          { type: 'request', line: 2, source: 'User', target: 'API', method: 'post', path: '/users' },
          { type: 'request', line: 3, source: 'User', target: 'API', method: 'put', path: '/users' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].method).toBe('get');
        expect(ast.interactions[1].method).toBe('post');
        expect(ast.interactions[2].method).toBe('put');
      });

      it('should handle mixed case HTTP methods', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GeT', path: '/users' },
          { type: 'request', line: 2, source: 'User', target: 'API', method: 'PoSt', path: '/users' }
        ];
        const ast = parse(tokens);

        // Parser stores method as provided by lexer (which normalizes to lowercase)
        // But when tokens are created directly for testing, they keep original casing
        expect(ast.interactions[0].method).toBe('GeT');
        expect(ast.interactions[1].method).toBe('PoSt');
      });

      it('should handle all standard HTTP methods', () => {
        const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
        const tokens: MermaidToken[] = methods.map((method, index) => ({
          type: 'request' as const,
          line: index + 1,
          source: 'User',
          target: 'API',
          method,
          path: `/test${index}`
        }));
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(7);
        ast.interactions.forEach((interaction, index) => {
          expect(interaction.method).toBe(methods[index]);
        });
      });
    });

    describe('Edge Cases: Duplicate Operations', () => {
      it('should handle duplicate requests with same method and path', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'response', line: 2, source: 'API', target: 'User', status: '200' },
          { type: 'request', line: 3, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'response', line: 4, source: 'API', target: 'User', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(2);
        expect(ast.interactions[0].path).toBe('/users');
        expect(ast.interactions[1].path).toBe('/users');
      });

      it('should handle requests from different sources to same endpoint', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User1', target: 'API', method: 'GET', path: '/users' },
          { type: 'request', line: 2, source: 'User2', target: 'API', method: 'GET', path: '/users' },
          { type: 'request', line: 3, source: 'User3', target: 'API', method: 'GET', path: '/users' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(3);
        expect(ast.participants).toContain('User1');
        expect(ast.participants).toContain('User2');
        expect(ast.participants).toContain('User3');
      });
    });

    describe('Edge Cases: Nested JSON in Notes', () => {
      it('should parse simple JSON in body note', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {"name": "John", "age": 30}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({ name: 'John', age: 30 });
      });

      it('should parse nested JSON objects', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {"user": {"name": "John", "address": {"city": "NYC"}}}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({
          user: {
            name: 'John',
            address: { city: 'NYC' }
          }
        });
      });

      it('should parse JSON arrays in body note', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {"items": [1, 2, 3], "tags": ["a", "b", "c"]}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({
          items: [1, 2, 3],
          tags: ['a', 'b', 'c']
        });
      });

      it('should handle deeply nested JSON structures', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/data' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {"level1": {"level2": {"level3": {"level4": "value"}}}}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({
          level1: {
            level2: {
              level3: {
                level4: 'value'
              }
            }
          }
        });
      });

      it('should add error note for invalid JSON in body', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {invalid json}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.notes).toHaveLength(1);
        expect(ast.notes[0].type).toBe('error');
        expect(ast.notes[0].message).toContain('Invalid JSON');
      });

      it('should handle JSON with special characters', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/data' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {"text": "Line 1\\nLine 2", "symbol": "@#$%"}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({
          text: 'Line 1\nLine 2',
          symbol: '@#$%'
        });
      });
    });

    describe('Edge Cases: Unicode and Special Characters', () => {
      it('should handle unicode in participant names', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: '用户' },
          { type: 'participant', line: 2, name: 'Пользователь' },
          { type: 'participant', line: 3, name: 'Utilisateur' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toContain('用户');
        expect(ast.participants).toContain('Пользователь');
        expect(ast.participants).toContain('Utilisateur');
      });

      it('should handle unicode in request paths', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users/用户' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].path).toBe('/users/用户');
      });

      it('should handle emojis in participant names', () => {
        const tokens: MermaidToken[] = [
          { type: 'participant', line: 1, name: '👤 User' },
          { type: 'participant', line: 2, name: '🔐 Auth' },
          { type: 'participant', line: 3, name: '💾 Database' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toContain('👤 User');
        expect(ast.participants).toContain('🔐 Auth');
        expect(ast.participants).toContain('💾 Database');
      });

      it('should handle special characters in paths', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users/user@example.com' },
          { type: 'request', line: 2, source: 'User', target: 'API', method: 'GET', path: '/files/file%20name.pdf' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].path).toBe('/users/user@example.com');
        expect(ast.interactions[1].path).toBe('/files/file%20name.pdf');
      });
    });

    describe('Edge Cases: Response Without Request', () => {
      it('should warn about response without matching request', () => {
        const tokens: MermaidToken[] = [
          { type: 'response', line: 1, source: 'API', target: 'User', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.notes).toHaveLength(1);
        expect(ast.notes[0].type).toBe('warning');
        expect(ast.notes[0].message).toContain('orphaned');
        expect(ast.notes[0].line).toBe(1);
      });

      it('should handle multiple orphaned responses', () => {
        const tokens: MermaidToken[] = [
          { type: 'response', line: 1, source: 'API', target: 'User', status: '200' },
          { type: 'response', line: 2, source: 'API', target: 'User', status: '404' },
          { type: 'response', line: 3, source: 'API', target: 'User', status: '500' }
        ];
        const ast = parse(tokens);

        expect(ast.notes).toHaveLength(3);
        ast.notes.forEach(note => {
          expect(note.type).toBe('warning');
          expect(note.message).toContain('orphaned');
        });
      });

      it('should not pair response with mismatched request', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'response', line: 2, source: 'Database', target: 'API', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].response).toBeUndefined();
        expect(ast.notes).toHaveLength(1);
        expect(ast.notes[0].message).toContain('orphaned');
      });
    });

    describe('Edge Cases: Multiple Notes for Same Interaction', () => {
      it('should attach only the last note to request', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['API'], content: 'Body: {"name": "John"}', noteType: 'body' },
          { type: 'note', line: 3, participants: ['API'], content: 'Body: {"name": "Jane"}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({ name: 'Jane' });
      });

      it('should handle info notes', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'note', line: 2, participants: ['API'], content: 'Info: Returns user list', noteType: 'info' }
        ];
        const ast = parse(tokens);

        // Info notes don't attach as body
        expect(ast.interactions[0].body).toBeUndefined();
      });
    });

    describe('Edge Cases: Cross-Service Dependencies', () => {
      it('should handle chain of service calls', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/data' },
          { type: 'response', line: 2, source: 'API', target: 'User', status: '200' },
          { type: 'request', line: 3, source: 'API', target: 'Database', method: 'GET', path: '/records' },
          { type: 'response', line: 4, source: 'Database', target: 'API', status: '200' },
          { type: 'request', line: 5, source: 'Database', target: 'Cache', method: 'GET', path: '/lookup' },
          { type: 'response', line: 6, source: 'Cache', target: 'Database', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(3);
        expect(ast.participants).toContain('User');
        expect(ast.participants).toContain('API');
        expect(ast.participants).toContain('Database');
        expect(ast.participants).toContain('Cache');
      });

      it('should extract all participants from cross-service calls', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'Frontend', target: 'Backend', method: 'GET', path: '/api' },
          { type: 'request', line: 2, source: 'Backend', target: 'Auth', method: 'POST', path: '/validate' },
          { type: 'request', line: 3, source: 'Backend', target: 'Database', method: 'GET', path: '/data' },
          { type: 'request', line: 4, source: 'Backend', target: 'Cache', method: 'GET', path: '/check' }
        ];
        const ast = parse(tokens);

        expect(ast.participants).toEqual(['Frontend', 'Backend', 'Auth', 'Database', 'Cache']);
      });
    });

    describe('Edge Cases: Deep Request Chains', () => {
      it('should handle 5+ levels of request chains', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'Client', target: 'Service1', method: 'GET', path: '/1' },
          { type: 'response', line: 2, source: 'Service1', target: 'Client', status: '200' },
          { type: 'request', line: 3, source: 'Service1', target: 'Service2', method: 'GET', path: '/2' },
          { type: 'response', line: 4, source: 'Service2', target: 'Service1', status: '200' },
          { type: 'request', line: 5, source: 'Service2', target: 'Service3', method: 'GET', path: '/3' },
          { type: 'response', line: 6, source: 'Service3', target: 'Service2', status: '200' },
          { type: 'request', line: 7, source: 'Service3', target: 'Service4', method: 'GET', path: '/4' },
          { type: 'response', line: 8, source: 'Service4', target: 'Service3', status: '200' },
          { type: 'request', line: 9, source: 'Service4', target: 'Service5', method: 'GET', path: '/5' },
          { type: 'response', line: 10, source: 'Service5', target: 'Service4', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(5);
        expect(ast.participants).toHaveLength(6);
      });

      it('should handle very long sequences of interactions', () => {
        const tokens: MermaidToken[] = [];
        for (let i = 0; i < 100; i++) {
          tokens.push(
            { type: 'request' as const, line: i * 2 + 1, source: 'Client', target: 'Server', method: 'GET', path: `/test${i}` },
            { type: 'response' as const, line: i * 2 + 2, source: 'Server', target: 'Client', status: '200' }
          );
        }
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(100);
      });
    });

    describe('Edge Cases: Response Descriptions', () => {
      it('should handle response with description', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'response', line: 2, source: 'API', target: 'User', status: '200', description: 'Success' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].response?.description).toBe('Success');
      });

      it('should handle response without description', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'response', line: 2, source: 'API', target: 'User', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].response?.description).toBeUndefined();
      });
    });

    describe('Edge Cases: Request Summaries', () => {
      it('should handle request without summary', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].summary).toBeUndefined();
      });
    });

    describe('Edge Cases: Note Attachment Logic', () => {
      it('should not attach note to non-matching participant', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['Database'], content: 'Body: {"data": "value"}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toBeUndefined();
      });

      it('should attach note when participant matches request target', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: ['API', 'Database'], content: 'Body: {"name": "test"}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].body).toEqual({ name: 'test' });
      });

      it('should handle note without participants', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'POST', path: '/users' },
          { type: 'note', line: 2, participants: [], content: 'Body: {"test": "value"}', noteType: 'body' }
        ];
        const ast = parse(tokens);

        // Note won't attach if participants array is empty
        expect(ast.interactions[0].body).toBeUndefined();
      });
    });

    describe('Edge Cases: Request-Response Pairing', () => {
      it('should reset lastRequest after pairing', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'response', line: 2, source: 'API', target: 'User', status: '200' },
          { type: 'request', line: 3, source: 'User', target: 'API', method: 'GET', path: '/posts' },
          { type: 'response', line: 4, source: 'API', target: 'User', status: '200' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].response?.status).toBe('200');
        expect(ast.interactions[1].response?.status).toBe('200');
      });

      it('should handle request without response', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].response).toBeUndefined();
        expect(ast.notes).toHaveLength(0);
      });

      it('should handle consecutive requests without responses', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users' },
          { type: 'request', line: 2, source: 'User', target: 'API', method: 'GET', path: '/posts' },
          { type: 'request', line: 3, source: 'User', target: 'API', method: 'GET', path: '/comments' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions).toHaveLength(3);
        ast.interactions.forEach(interaction => {
          expect(interaction.response).toBeUndefined();
        });
      });
    });

    describe('Edge Cases: Large Numbers of Participants', () => {
      it('should handle many participants', () => {
        const tokens: MermaidToken[] = [];
        for (let i = 0; i < 50; i++) {
          tokens.push({ type: 'participant' as const, line: i + 1, name: `Service${i}` });
        }
        const ast = parse(tokens);

        expect(ast.participants).toHaveLength(50);
      });
    });

    describe('Edge Cases: Path Variations', () => {
      it('should handle root path', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].path).toBe('/');
      });

      it('should handle paths with query parameters', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users?limit=10&offset=20' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].path).toBe('/users?limit=10&offset=20');
      });

      it('should handle paths with fragments', () => {
        const tokens: MermaidToken[] = [
          { type: 'request', line: 1, source: 'User', target: 'API', method: 'GET', path: '/users#section' }
        ];
        const ast = parse(tokens);

        expect(ast.interactions[0].path).toBe('/users#section');
      });
    });
  });
});
