import { describe, it, expect } from 'vitest';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';
import type { MermaidAST } from '@/types';

describe('openapiGenerator', () => {
  describe('generateOpenApiSpecs', () => {
    it('should generate empty specs for empty AST', () => {
      const ast: MermaidAST = {
        participants: [],
        interactions: [],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs).toEqual({});
    });

    it('should generate single spec for single server', () => {
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
            response: {
              status: '200',
              description: 'OK'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(Object.keys(specs)).toHaveLength(1);
      expect(specs['API']).toBeDefined();
      expect(specs['API'].openapi).toBe('3.0.0');
      expect(specs['API'].info.title).toBe('API API');
      expect(specs['API'].paths['/users']).toBeDefined();
      expect(specs['API'].paths['/users'].get).toBeDefined();
      expect(specs['API'].paths['/users'].get?.summary).toBe('Operation for /users');
      expect(specs['API'].paths['/users'].get?.responses).toBeDefined();
    });

    it('should generate multiple specs for multiple servers', () => {
      const ast: MermaidAST = {
        participants: ['User', 'Gateway', 'Database'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'Gateway',
            method: 'GET',
            path: '/users',
            line: 1,
            response: {
              status: '200',
              description: 'OK'
            }
          },
          {
            type: 'request',
            from: 'Gateway',
            to: 'Database',
            method: 'GET',
            path: '/internal/users',
            line: 2,
            response: {
              status: '200',
              description: 'OK'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(Object.keys(specs)).toHaveLength(2);
      expect(specs['Gateway']).toBeDefined();
      expect(specs['Database']).toBeDefined();
    });

    it('should extract query parameters from path with query string', () => {
      const ast: MermaidAST = {
        participants: ['User', 'API'],
        interactions: [
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'GET',
            path: '/users?active=true&limit=10',
            line: 1,
            response: {
              status: '200',
              description: 'OK'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.parameters).toBeDefined();
      expect(specs['API'].paths['/users'].get?.parameters).toHaveLength(2);
      expect(specs['API'].paths['/users'].get?.parameters?.[0]).toMatchObject({
        name: 'active',
        in: 'query',
        schema: { type: 'string', example: 'true' }
      });
      expect(specs['API'].paths['/users'].get?.parameters?.[1]).toMatchObject({
        name: 'limit',
        in: 'query',
        schema: { type: 'string', example: '10' }
      });
    });

    it('should extract path parameters from URL', () => {
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
            response: {
              status: '200',
              description: 'OK'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users/{id}'].get?.parameters).toBeDefined();
      expect(specs['API'].paths['/users/{id}'].get?.parameters).toHaveLength(1);
      expect(specs['API'].paths['/users/{id}'].get?.parameters?.[0]).toMatchObject({
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      });
    });

    it('should handle request body from interaction', () => {
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
            body: {
              name: 'John Doe',
              email: 'john@example.com'
            },
            response: {
              status: '201',
              description: 'Created'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      expect(specs['API'].paths['/users'].post?.requestBody?.required).toBe(true);
      expect(specs['API'].paths['/users'].post?.requestBody?.content['application/json']).toBeDefined();
      expect(specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' }
        }
      });
    });

    it('should handle response body from interaction', () => {
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
            response: {
              status: '200',
              description: 'OK'
            },
            body: {
              users: [
                { id: 1, name: 'John' }
              ]
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.responses['200']).toBeDefined();
      expect(specs['API'].paths['/users'].get?.responses['200'].content['application/json'].schema).toBeDefined();
      expect(specs['API'].paths['/users'].get?.responses['200'].content['application/json'].schema).toMatchObject({
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'John' }
              }
            }
          }
        }
      });
    });

    it('should infer types from body values', () => {
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
            body: {
              name: 'John',
              age: 30,
              active: true,
              score: 95.5
            },
            response: {
              status: '201',
              description: 'Created'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
      expect(schema?.properties?.name).toMatchObject({ type: 'string', example: 'John' });
      expect(schema?.properties?.age).toMatchObject({ type: 'integer', example: 30 });
      expect(schema?.properties?.active).toMatchObject({ type: 'boolean', example: true });
      expect(schema?.properties?.score).toMatchObject({ type: 'number', example: 95.5 });
    });

    it('should handle multiple methods on same path', () => {
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
          },
          {
            type: 'request',
            from: 'User',
            to: 'API',
            method: 'POST',
            path: '/users',
            line: 2,
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get).toBeDefined();
      expect(specs['API'].paths['/users'].post).toBeDefined();
    });

    it('should handle explicit validation strings in values', () => {
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
            body: {
              name: 'string,required,min:2,max:50',
              email: 'string,required,format:email',
              age: 'integer,required,min:18,max:120'
            },
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
      expect(schema?.properties?.name).toMatchObject({
        type: 'string',
        minLength: 2,
        maxLength: 50
      });
      expect(schema?.required).toContain('name');
      expect(schema?.properties?.email).toMatchObject({
        type: 'string',
        format: 'email'
      });
      expect(schema?.required).toContain('email');
      expect(schema?.properties?.age).toMatchObject({
        type: 'integer',
        minimum: 18,
        maximum: 120
      });
      expect(schema?.required).toContain('age');
    });

    it('should handle nested objects', () => {
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
            body: {
              name: 'John',
              address: {
                street: '123 Main St',
                city: 'New York'
              }
            },
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
      expect(schema?.properties?.address).toMatchObject({
        type: 'object',
        properties: {
          street: { type: 'string', example: '123 Main St' },
          city: { type: 'string', example: 'New York' }
        }
      });
    });

    it('should handle arrays with inferred item types', () => {
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
            body: {
              tags: ['javascript', 'typescript']
            },
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
      expect(schema?.properties?.tags).toMatchObject({
        type: 'array',
        items: { type: 'string', example: 'javascript' },
        example: ['javascript', 'typescript']
      });
    });

    it('should handle empty arrays', () => {
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
            body: {
              tags: []
            },
            response: { status: '201' }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
      expect(schema?.properties?.tags).toMatchObject({
        type: 'array',
        items: { type: 'string' },
        example: []
      });
    });

    it('should set correct response descriptions', () => {
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
            response: {
              status: '404',
              description: 'User not found'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.responses['404'].description).toBe('User not found');
    });

    it('should use default description when not provided', () => {
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
            response: {
              status: '200'
            }
          }
        ],
        notes: []
      };

      const specs = generateOpenApiSpecs(ast);

      expect(specs['API'].paths['/users'].get?.responses['200'].description).toBe('Response description');
    });
  });
});
