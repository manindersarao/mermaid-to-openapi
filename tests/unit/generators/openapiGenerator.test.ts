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

    // Edge Case Tests: Boundary and Empty Cases
    describe('Edge Cases: Boundary and Empty Cases', () => {
      it('should handle AST with no participants', () => {
        const ast: MermaidAST = {
          participants: [],
          interactions: [],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs).toEqual({});
      });

      it('should handle AST with participants but no interactions', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs).toEqual({});
      });

      it('should handle interaction with no response', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users',
              line: 1
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API']).toBeDefined();
        expect(specs['API'].paths['/users'].get).toBeDefined();
        // Note: Generator creates empty responses object even without response
        expect(specs['API'].paths['/users'].get?.responses).toEqual({});
      });

      it('should handle very long path', () => {
        const longPath = '/a' + '/b'.repeat(100);
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: longPath,
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths[longPath]).toBeDefined();
      });

      it('should handle very long participant name', () => {
        const longName = 'A'.repeat(1000);
        const ast: MermaidAST = {
          participants: [longName, 'API'],
          interactions: [
            {
              type: 'request',
              from: longName,
              to: 'API',
              method: 'GET',
              path: '/test',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API']).toBeDefined();
      });

      it('should handle path with only slash', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/']).toBeDefined();
      });

      it('should handle path with no leading slash', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: 'users',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['users']).toBeDefined();
      });
    });

    // Edge Case Tests: Malformed and Special Data
    describe('Edge Cases: Malformed and Special Data', () => {
      it('should handle body with null value', () => {
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
              body: { name: null },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with undefined value', () => {
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
              body: { name: undefined },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with empty string', () => {
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
              body: { name: '' },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
        expect(schema?.properties?.name).toMatchObject({ type: 'string', example: '' });
      });

      it('should handle body with zero', () => {
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
              body: { count: 0 },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
        expect(schema?.properties?.count).toMatchObject({ type: 'integer', example: 0 });
      });

      it('should handle body with false', () => {
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
              body: { active: false },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
        expect(schema?.properties?.active).toMatchObject({ type: 'boolean', example: false });
      });

      it('should handle body with negative number', () => {
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
              body: { balance: -100 },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
        expect(schema?.properties?.balance).toMatchObject({ type: 'integer', example: -100 });
      });

      it('should handle body with very large number', () => {
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
              body: { value: Number.MAX_SAFE_INTEGER },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with very small number', () => {
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
              body: { value: Number.MIN_SAFE_INTEGER },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with NaN', () => {
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
              body: { value: NaN },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with Infinity', () => {
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
              body: { value: Infinity },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with empty object', () => {
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
              body: {},
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with empty array', () => {
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
              body: { items: [] },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle body with mixed types', () => {
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
                string: 'text',
                number: 42,
                boolean: true,
                null: null,
                array: [1, 2, 3],
                object: { nested: 'value' }
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });
    });

    // Edge Case Tests: Duplicate and Conflicting Operations
    describe('Edge Cases: Duplicate and Conflicting Operations', () => {
      it('should handle duplicate operations', () => {
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
              method: 'GET',
              path: '/users',
              line: 2,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].get).toBeDefined();
      });

      it('should handle same path different methods', () => {
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
            },
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'PUT',
              path: '/users',
              line: 3,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'DELETE',
              path: '/users',
              line: 4,
              response: { status: '204' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].get).toBeDefined();
        expect(specs['API'].paths['/users'].post).toBeDefined();
        expect(specs['API'].paths['/users'].put).toBeDefined();
        expect(specs['API'].paths['/users'].delete).toBeDefined();
      });

      it('should handle multiple responses to same operation', () => {
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
              method: 'GET',
              path: '/users',
              line: 2,
              response: { status: '404' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].get?.responses).toBeDefined();
      });
    });

    // Edge Case Tests: Complex Nested Structures
    describe('Edge Cases: Complex Nested Structures', () => {
      it('should handle deeply nested objects', () => {
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
                level1: {
                  level2: {
                    level3: {
                      level4: {
                        level5: 'value'
                      }
                    }
                  }
                }
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle array of objects', () => {
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
                users: [
                  { id: 1, name: 'John' },
                  { id: 2, name: 'Jane' }
                ]
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle nested arrays', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'POST',
              path: '/data',
              line: 1,
              body: {
                matrix: [[1, 2], [3, 4]]
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/data'].post?.requestBody).toBeDefined();
      });

      it('should handle mixed arrays and objects', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'POST',
              path: '/data',
              line: 1,
              body: {
                mixed: [
                  { type: 'object', value: 1 },
                  [1, 2, 3],
                  'string',
                  42,
                  true
                ]
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/data'].post?.requestBody).toBeDefined();
      });

      it('should handle very deep nesting', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'POST',
              path: '/data',
              line: 1,
              body: {
                l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: 'value' } } } } } } } } }
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/data'].post?.requestBody).toBeDefined();
      });
    });

    // Edge Case Tests: Special Characters and Unicode
    describe('Edge Cases: Special Characters and Unicode', () => {
      it('should handle unicode in field names', () => {
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
                '用户名': 'John',
                '年纪': 30
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle unicode in values', () => {
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
                name: '用户',
                city: '北京'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle emojis in values', () => {
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
                status: '✅',
                icon: '👤',
                message: 'Hello 🌍'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle special characters in values', () => {
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
                email: 'user@example.com',
                url: 'https://example.com/path?query=value',
                special: '@#$%^&*()_+-=[]{}|;:\'",.<>?/'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle newlines and tabs in values', () => {
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
                text: 'Line 1\nLine 2\tTabbed'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });
    });

    // Edge Case Tests: Path and Query Parameter Edge Cases
    describe('Edge Cases: Path and Query Parameter Edge Cases', () => {
      it('should handle path with many parameters', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users/{id}/posts/{postId}/comments/{commentId}',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const parameters = specs['API'].paths['/users/{id}/posts/{postId}/comments/{commentId}'].get?.parameters;
        expect(parameters).toHaveLength(3);
      });

      it('should handle path with no parameters', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users/all',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users/all'].get?.parameters).toBeUndefined();
      });

      it('should handle query with many parameters', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users?limit=10&offset=20&sort=name&order=asc&filter1=a&filter2=b&filter3=c',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const parameters = specs['API'].paths['/users'].get?.parameters;
        expect(parameters).toHaveLength(7);
      });

      it('should handle query with special characters in values', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users?email=user@example.com&name=John%20Doe',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].get?.parameters).toBeDefined();
      });

      it('should handle query with unicode values', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users?name=用户',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].get?.parameters).toBeDefined();
      });

      it('should handle empty query value', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users?limit=',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const param = specs['API'].paths['/users'].get?.parameters?.find(p => p.name === 'limit');
        expect(param?.schema.example).toBe('');
      });

      it('should handle query param without value', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users?flag',
              line: 1,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const param = specs['API'].paths['/users'].get?.parameters?.find(p => p.name === 'flag');
        // Note: Query param without value gets empty string as example
        expect(param?.schema.example).toBe('');
      });
    });

    // Edge Case Tests: Multi-Service and Complex Scenarios
    describe('Edge Cases: Multi-Service and Complex Scenarios', () => {
      it('should handle many services', () => {
        const participants = ['Client'];
        const interactions = [];

        for (let i = 1; i <= 20; i++) {
          participants.push(`Service${i}`);
        }

        for (let i = 0; i < 19; i++) {
          interactions.push({
            type: 'request' as const,
            from: participants[i],
            to: participants[i + 1],
            method: 'GET',
            path: `/forward${i}`,
            line: i + 1,
            response: { status: '200' }
          });
        }

        const ast: MermaidAST = {
          participants,
          interactions,
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        // Note: Client doesn't receive requests, so only 19 specs are generated
        expect(Object.keys(specs).length).toBe(19);
      });

      it('should handle circular dependencies', () => {
        const ast: MermaidAST = {
          participants: ['Service1', 'Service2', 'Service3'],
          interactions: [
            {
              type: 'request',
              from: 'Service1',
              to: 'Service2',
              method: 'GET',
              path: '/data',
              line: 1,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'Service2',
              to: 'Service3',
              method: 'GET',
              path: '/fetch',
              line: 2,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'Service3',
              to: 'Service1',
              method: 'GET',
              path: '/check',
              line: 3,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['Service1']).toBeDefined();
        expect(specs['Service2']).toBeDefined();
        expect(specs['Service3']).toBeDefined();
      });

      it('should handle fan-out pattern', () => {
        const ast: MermaidAST = {
          participants: ['Client', 'Gateway', 'Service1', 'Service2', 'Service3'],
          interactions: [
            {
              type: 'request',
              from: 'Client',
              to: 'Gateway',
              method: 'GET',
              path: '/data',
              line: 1,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'Gateway',
              to: 'Service1',
              method: 'GET',
              path: '/users',
              line: 2,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'Gateway',
              to: 'Service2',
              method: 'GET',
              path: '/posts',
              line: 3,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'Gateway',
              to: 'Service3',
              method: 'GET',
              path: '/comments',
              line: 4,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['Gateway']).toBeDefined();
        expect(specs['Service1']).toBeDefined();
        expect(specs['Service2']).toBeDefined();
        expect(specs['Service3']).toBeDefined();
      });

      it('should handle request chain of 5+ hops', () => {
        const ast: MermaidAST = {
          participants: ['Client', 'S1', 'S2', 'S3', 'S4', 'S5'],
          interactions: [
            {
              type: 'request',
              from: 'Client',
              to: 'S1',
              method: 'GET',
              path: '/start',
              line: 1,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'S1',
              to: 'S2',
              method: 'GET',
              path: '/step1',
              line: 2,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'S2',
              to: 'S3',
              method: 'GET',
              path: '/step2',
              line: 3,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'S3',
              to: 'S4',
              method: 'GET',
              path: '/step3',
              line: 4,
              response: { status: '200' }
            },
            {
              type: 'request',
              from: 'S4',
              to: 'S5',
              method: 'GET',
              path: '/final',
              line: 5,
              response: { status: '200' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(Object.keys(specs)).toHaveLength(5);
      });
    });

    // Edge Case Tests: Status Code Edge Cases
    describe('Edge Cases: Status Code Edge Cases', () => {
      it('should handle all valid status codes', () => {
        const statusCodes = ['100', '200', '201', '204', '300', '301', '400', '401', '404', '500', '503'];
        const interactions = statusCodes.map((status, index) => ({
          type: 'request' as const,
          from: 'User',
          to: 'API',
          method: 'GET',
          path: `/test${index}`,
          line: index + 1,
          response: { status, description: 'Test' }
        }));

        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions,
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(Object.keys(specs['API'].paths)).toHaveLength(statusCodes.length);
      });

      it('should handle response without description', () => {
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
        expect(specs['API'].paths['/users'].get?.responses['200']).toBeDefined();
      });

      it('should handle response with empty description', () => {
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
              response: { status: '200', description: '' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].get?.responses['200']).toBeDefined();
      });

      it('should handle multiple status codes for same operation', () => {
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
              response: { status: '200', description: 'Success' }
            },
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'GET',
              path: '/users',
              line: 2,
              response: { status: '404', description: 'Not Found' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        // Note: Duplicate operations overwrite each other
        // Only the last response is kept
        expect(specs['API'].paths['/users'].get?.responses['404']).toBeDefined();
        expect(specs['API'].paths['/users'].get?.responses['200']).toBeUndefined();
      });
    });

    // Edge Case Tests: Large Data Sets
    describe('Edge Cases: Large Data Sets', () => {
      it('should handle many interactions', () => {
        const interactions = [];
        for (let i = 0; i < 100; i++) {
          interactions.push({
            type: 'request' as const,
            from: 'User',
            to: 'API',
            method: 'GET',
            path: `/test${i}`,
            line: i + 1,
            response: { status: '200' }
          });
        }

        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions,
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(Object.keys(specs['API'].paths)).toHaveLength(100);
      });

      it('should handle body with many fields', () => {
        const body: Record<string, string> = {};
        for (let i = 0; i < 100; i++) {
          body[`field${i}`] = `value${i}`;
        }

        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'POST',
              path: '/data',
              line: 1,
              body,
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/data'].post?.requestBody).toBeDefined();
      });

      it('should handle array with many items', () => {
        const ast: MermaidAST = {
          participants: ['User', 'API'],
          interactions: [
            {
              type: 'request',
              from: 'User',
              to: 'API',
              method: 'POST',
              path: '/data',
              line: 1,
              body: {
                items: Array.from({ length: 100 }, (_, i) => i)
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/data'].post?.requestBody).toBeDefined();
      });
    });

    // Edge Case Tests: Validation Strings
    describe('Edge Cases: Validation Strings', () => {
      it('should handle all validation types', () => {
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
                name: 'string,required,min:1,max:100',
                email: 'string,required,format:email',
                age: 'integer,required,min:18,max:120',
                active: 'boolean,required',
                score: 'number,min:0,max:100'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });

      it('should handle validation with no required', () => {
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
                name: 'string,min:1,max:100',
                age: 'integer,min:0,max:120'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        const schema = specs['API'].paths['/users'].post?.requestBody?.content['application/json'].schema;
        expect(schema?.required).toBeUndefined();
      });

      it('should handle validation with only type', () => {
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
                name: 'string',
                age: 'integer',
                active: 'boolean'
              },
              response: { status: '201' }
            }
          ],
          notes: []
        };

        const specs = generateOpenApiSpecs(ast);
        expect(specs['API'].paths['/users'].post?.requestBody).toBeDefined();
      });
    });
  });
});
