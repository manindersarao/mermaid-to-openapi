import { describe, it, expect } from 'vitest';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';
import type { MermaidAST } from '@/types';

describe('Security Schemes - Generator', () => {
  describe('generateOpenApiSpecs', () => {
    it('should add bearerAuth security scheme to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['bearerAuth']).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      });
    });

    it('should add basicAuth security scheme to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['basicAuth'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['basicAuth']).toEqual({
        type: 'http',
        scheme: 'basic'
      });
    });

    it('should add apiKey in header security scheme to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['apiKey_header'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['apiKey_header']).toEqual({
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header'
      });
    });

    it('should add apiKey in query security scheme to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['apiKey_query'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['apiKey_query']).toEqual({
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'query'
      });
    });

    it('should add oauth2 security scheme without scopes to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['oauth2'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['oauth2']).toEqual({
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: 'https://example.com/oauth/authorize',
            scopes: undefined
          }
        }
      });
    });

    it('should add oauth2 security scheme with scopes to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['oauth2:read,write'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['oauth2:read,write']).toEqual({
        type: 'oauth2',
        flows: {
          implicit: {
            authorizationUrl: 'https://example.com/oauth/authorize',
            scopes: {
              read: 'read permission',
              write: 'write permission'
            }
          }
        }
      });
    });

    it('should add openIdConnect security scheme to components', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['openIdConnect'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].components?.securitySchemes?.['openIdConnect']).toEqual({
        type: 'openIdConnect',
        openIdConnectUrl: 'https://example.com/.well-known/openid-configuration'
      });
    });

    it('should add security reference to operation', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { bearerAuth: [] }
      ]);
    });

    it('should add multiple security references to operation', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth', 'apiKey_header'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { bearerAuth: [] },
        { apiKey_header: [] }
      ]);
    });

    it('should add oauth2 security reference with scopes to operation', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['oauth2:read,write'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { 'oauth2:read,write': ['read', 'write'] }
      ]);
    });

    it('should not add security reference if interaction has no security', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toBeUndefined();
    });

    it('should reuse security schemes across multiple operations', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth'],
            response: { status: '200' }
          },
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'POST',
            path: '/users',
            line: 2,
            security: ['bearerAuth'],
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      // Should only have one bearerAuth scheme in components
      const schemes = specs['API'].components?.securitySchemes;
      expect(Object.keys(schemes || {}).filter(k => k === 'bearerAuth')).toHaveLength(1);

      // Both operations should reference the same scheme
      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { bearerAuth: [] }
      ]);
      expect(specs['API'].paths['/users'].post?.security).toEqual([
        { bearerAuth: [] }
      ]);
    });

    it('should handle mixed security schemes across different operations', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth'],
            response: { status: '200' }
          },
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'POST',
            path: '/users',
            line: 2,
            security: ['apiKey_header'],
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      const schemes = specs['API'].components?.securitySchemes;
      expect(schemes?.['bearerAuth']).toBeDefined();
      expect(schemes?.['apiKey_header']).toBeDefined();

      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { bearerAuth: [] }
      ]);
      expect(specs['API'].paths['/users'].post?.security).toEqual([
        { apiKey_header: [] }
      ]);
    });

    it('should handle security schemes across multiple servers', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API1', 'API2'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API1',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth'],
            response: { status: '200' }
          },
          {
            type: 'request',
            from: 'User',
            to: 'API2',
            method: 'GET',
            path: '/posts',
            line: 2,
            security: ['apiKey_header'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API1'].components?.securitySchemes?.['bearerAuth']).toBeDefined();
      expect(specs['API2'].components?.securitySchemes?.['apiKey_header']).toBeDefined();

      // API2 should not have bearerAuth
      expect(specs['API2'].components?.securitySchemes?.['bearerAuth']).toBeUndefined();

      // API1 should not have apiKey_header
      expect(specs['API1'].components?.securitySchemes?.['apiKey_header']).toBeUndefined();
    });

    it('should handle operation with no security when security is undefined', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toBeUndefined();
      // Components should be undefined when empty (cleanup removes empty components)
      expect(specs['API'].components).toBeUndefined();
    });

    it('should handle operation with empty security array', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: [],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toBeUndefined();
    });

    it('should ignore unknown security schemes', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['unknownScheme'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      // Unknown scheme should not be added to components
      expect(specs['API'].components?.securitySchemes?.['unknownScheme']).toBeUndefined();

      // Operation should not have security reference
      expect(specs['API'].paths['/users'].get?.security).toBeUndefined();
    });

    it('should handle mix of known and unknown security schemes', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users',
            line: 1,
            security: ['bearerAuth', 'unknownScheme'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      // Only bearerAuth should be added
      expect(specs['API'].components?.securitySchemes?.['bearerAuth']).toBeDefined();
      expect(specs['API'].components?.securitySchemes?.['unknownScheme']).toBeUndefined();

      // Only bearerAuth should be in security reference
      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { bearerAuth: [] }
      ]);
    });

    it('should handle security with request body', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'POST',
            path: '/users',
            line: 1,
            security: ['bearerAuth'],
            body: { name: 'John' },
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].post?.security).toEqual([
        { bearerAuth: [] }
      ]);
      expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      expect(specs['API'].components?.securitySchemes?.['bearerAuth']).toBeDefined();
    });

    it('should handle security with path parameters', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users/{id}',
            line: 1,
            security: ['apiKey_header'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users/{id}'].get?.security).toEqual([
        { apiKey_header: [] }
      ]);
      expect(specs['API'].paths['/users/{id}'].get?.parameters).toHaveLength(1);
      expect(specs['API'].components?.securitySchemes?.['apiKey_header']).toBeDefined();
    });

    it('should handle security with query parameters', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users?active=true',
            line: 1,
            security: ['basicAuth'],
            response: { status: '200' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.security).toEqual([
        { basicAuth: [] }
      ]);
      expect(specs['API'].paths['/users'].get?.parameters).toHaveLength(1);
      expect(specs['API'].components?.securitySchemes?.['basicAuth']).toBeDefined();
    });
  });
});
