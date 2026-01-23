import { describe, it, expect } from 'vitest';
import { parse } from '@/parser/mermaidParser';
import type { MermaidToken } from '@/types';

describe('Security Schemes - Parser', () => {
  describe('parse', () => {
    it('should parse bearerAuth security from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: bearerAuth',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['bearerAuth']);
    });

    it('should parse basicAuth security from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: basicAuth',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['basicAuth']);
    });

    it('should parse apiKey in header from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: apiKey in header',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['apiKey_header']);
    });

    it('should parse apiKey in query from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: apiKey in query',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['apiKey_query']);
    });

    it('should parse apiKey without location (defaults to header)', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: apiKey',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['apiKey_header']);
    });

    it('should parse oauth2 without scopes from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: oauth2',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['oauth2']);
    });

    it('should parse oauth2 with scopes from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: oauth2[read,write]',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['oauth2:read,write']);
    });

    it('should parse openIdConnect from note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: openIdConnect',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['openIdConnect']);
    });

    it('should handle case insensitive security types', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: BEARERAUTH',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['bearerAuth']);
    });

    it('should parse multiple security schemes from same note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: bearerAuth\nSecurity: apiKey in header',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['bearerAuth', 'apiKey_header']);
    });

    it('should handle custom security scheme names', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: customAuth',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['customAuth']);
    });

    it('should not parse security from note not attached to request', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'note',
          line: 1,
          participants: ['API'],
          content: 'Security: bearerAuth',
          noteType: 'info'
        },
        {
          type: 'request',
          line: 2,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toBeUndefined();
    });

    it('should parse security along with body in same note', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'POST',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Body: {"name": "John"}\nSecurity: bearerAuth',
          noteType: 'body'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].body).toEqual({ name: 'John' });
      expect(ast.interactions[0].security).toEqual(['bearerAuth']);
    });

    it('should handle multiple spaces in security declaration', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security:    bearerAuth',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['bearerAuth']);
    });

    it('should handle oauth2 with single scope', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: oauth2[read]',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['oauth2:read']);
    });

    it('should handle oauth2 with spaces in scopes', () => {
      const tokens: MermaidToken[] = [
        {
          type: 'request',
          line: 1,
          source: 'User',
          target: 'API',
          method: 'GET',
          path: '/users'
        },
        {
          type: 'note',
          line: 2,
          participants: ['API'],
          content: 'Security: oauth2[ read , write ]',
          noteType: 'info'
        }
      ];

      const ast = parse(tokens);

      expect(ast.interactions[0].security).toEqual(['oauth2:read,write']);
    });
  });
});
