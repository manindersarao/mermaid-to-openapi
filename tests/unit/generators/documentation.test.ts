import { describe, it, expect } from 'vitest';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';
import type { MermaidAST } from '@/types';

describe('openapiGenerator - Documentation Features (Task 26)', () => {
  it('should add summary to operation', () => {
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
          summary: 'Get all users',
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
    expect(specs['API'].paths['/users'].get?.summary).toBe('Get all users');
  });

  it('should add description to operation', () => {
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
          description: 'Returns a paginated list of users',
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
    expect(specs['API'].paths['/users'].get?.description).toBe('Returns a paginated list of users');
  });

  it('should add tags to operation and spec', () => {
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
          tags: ['users', 'admin'],
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
    expect(specs['API'].paths['/users'].get?.tags).toEqual(['users', 'admin']);
    expect(specs['API'].tags).toBeDefined();
    expect(specs['API'].tags?.length).toBe(2);
    expect(specs['API'].tags?.[0].name).toBe('users');
    expect(specs['API'].tags?.[1].name).toBe('admin');
  });

  it('should add operationId to operation', () => {
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
          operationId: 'getUserById',
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
    expect(specs['API'].paths['/users/{id}'].get?.operationId).toBe('getUserById');
  });

  it('should add deprecated flag to operation', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'GET',
          path: '/old-endpoint',
          line: 1,
          deprecated: true,
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
    expect(specs['API'].paths['/old-endpoint'].get?.deprecated).toBe(true);
  });

  it('should add external documentation to operation', () => {
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
          externalDocs: {
            url: 'https://docs.example.com/users',
            description: 'Detailed user documentation'
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
    expect(specs['API'].paths['/users'].get?.externalDocs).toEqual({
      url: 'https://docs.example.com/users',
      description: 'Detailed user documentation'
    });
  });

  it('should add external documentation with only URL', () => {
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
          externalDocs: {
            url: 'https://docs.example.com/users'
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
    expect(specs['API'].paths['/users'].get?.externalDocs).toEqual({
      url: 'https://docs.example.com/users'
    });
  });

  it('should handle operations without documentation features', () => {
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
    const operation = specs['API'].paths['/users'].get;
    expect(operation?.summary).toBe('Operation for /users'); // Default summary
    expect(operation?.description).toBeUndefined();
    expect(operation?.tags).toBeUndefined();
    expect(operation?.operationId).toBeUndefined();
    expect(operation?.deprecated).toBeUndefined();
    expect(operation?.externalDocs).toBeUndefined();
  });

  it('should collect all unique tags from all operations', () => {
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
          tags: ['users'],
          response: {
            status: '200',
            description: 'OK'
          }
        },
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/products',
          line: 2,
          tags: ['products'],
          response: {
            status: '201',
            description: 'Created'
          }
        },
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'GET',
          path: '/admin/users',
          line: 3,
          tags: ['users', 'admin'],
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
    expect(specs['API'].tags).toBeDefined();
    expect(specs['API'].tags?.length).toBe(3);
    const tagNames = specs['API'].tags?.map(t => t.name).sort();
    expect(tagNames).toEqual(['admin', 'products', 'users']);
  });
});
