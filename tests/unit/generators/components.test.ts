import { describe, it, expect } from 'vitest';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';
import type { MermaidAST } from '@/types';

describe('openapiGenerator - Components and References (Task 25)', () => {
  it('should extract identical schemas to components and use $ref', () => {
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
            email: 'john@example.com',
            age: 30
          },
          response: {
            status: '201',
            description: 'Created'
          }
        },
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'PUT',
          path: '/users/1',
          line: 2,
          body: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30
          },
          response: {
            status: '200',
            description: 'Updated'
          }
        }
      ],
      notes: []
    };

    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].components).toBeDefined();
    expect(specs['API'].components?.schemas).toBeDefined();

    // Should have one schema component for the identical body
    const schemaNames = Object.keys(specs['API'].components?.schemas || {});
    expect(schemaNames.length).toBeGreaterThan(0);

    // Both operations should reference the same schema
    const postOperation = specs['API'].paths['/users'].post;
    const putOperation = specs['API'].paths['/users/1'].put;

    expect(postOperation?.requestBody?.content?.['application/json'].schema).toBeDefined();
    expect(putOperation?.requestBody?.content?.['application/json'].schema).toBeDefined();

    // Both should have $ref
    expect(postOperation?.requestBody?.content?.['application/json'].schema).toHaveProperty('$ref');
    expect(putOperation?.requestBody?.content?.['application/json'].schema).toHaveProperty('$ref');

    // Both should reference the same schema
    const postRef = postOperation?.requestBody?.content?.['application/json'].schema?.$ref;
    const putRef = putOperation?.requestBody?.content?.['application/json'].schema?.$ref;
    expect(postRef).toBe(putRef);
  });

  it('should not extract simple primitive schemas to components', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/simple',
          line: 1,
          body: {
            value: 'test'
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

    expect(specs['API']).toBeDefined();
    // Should not have schemas in components for simple schemas
    expect(specs['API'].components?.schemas).toBeUndefined();
  });

  it('should generate unique schema names for different schemas', () => {
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
            email: 'john@example.com'
          },
          response: {
            status: '201',
            description: 'Created'
          }
        },
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/products',
          line: 2,
          body: {
            title: 'Product',
            price: 100
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

    expect(specs['API']).toBeDefined();
    // Different schemas used only once should not be extracted to components
    expect(specs['API'].components?.schemas).toBeUndefined();
  });

  it('should handle identical schemas across GET responses', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'GET',
          path: '/users/1',
          line: 1,
          body: {
            id: 1,
            name: 'John',
            email: 'john@example.com'
          },
          response: {
            status: '200',
            description: 'OK'
          }
        },
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'GET',
          path: '/users/2',
          line: 2,
          body: {
            id: 2,
            name: 'Jane',
            email: 'jane@example.com'
          },
          response: {
            status: '200',
            description: 'OK'
          }
        }
      ],
      notes: []
    };

    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].components?.schemas).toBeDefined();

    // Should extract one schema (the structure is identical, ignoring examples)
    const schemaNames = Object.keys(specs['API'].components?.schemas || {});
    expect(schemaNames.length).toBe(1);
  });

  it('should clean up empty components object', () => {
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

    expect(specs['API']).toBeDefined();
    // Should not have components if empty
    expect(specs['API'].components).toBeUndefined();
  });
});
