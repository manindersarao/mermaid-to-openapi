import { describe, it, expect } from 'vitest';
import { tokenize } from '@/parser/mermaidLexer';
import { parse } from '@/parser/mermaidParser';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';

describe('Integration - Documentation Features (Task 26)', () => {
  it('should parse and generate summary from note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /users
        Note over API: Summary: Get all users
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/users'].get?.summary).toBe('Get all users');
  });

  it('should parse and generate description from note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /users
        Note over API: Description: Paginated list of users
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/users'].get?.description).toBe('Paginated list of users');
  });

  it('should parse and generate tags from note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /users
        Note over API: Tags: users, inventory
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/users'].get?.tags).toEqual(['users', 'inventory']);
    expect(specs['API'].tags).toBeDefined();
    expect(specs['API'].tags?.length).toBe(2);
  });

  it('should parse and generate operationId from note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /users/{id}
        Note over API: Operation-Id: getUserById
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/users/{id}'].get?.operationId).toBe('getUserById');
  });

  it('should parse and generate deprecated flag from note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /old-endpoint
        Note over API: Deprecated: true
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/old-endpoint'].get?.deprecated).toBe(true);
  });

  it('should parse and generate external docs from note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /users
        Note over API: External-Docs-Url: https://docs.example.com/users\nExternal-Docs-Description: Detailed docs
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/users'].get?.externalDocs).toEqual({
      url: 'https://docs.example.com/users',
      description: 'Detailed docs'
    });
  });

  it('should parse and generate multiple documentation features from single note', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /users
        Note over API: Summary: Get all users\nDescription: Paginated list\nTags: users, admin\nOperation-Id: getAllUsers\nDeprecated: false
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    const operation = specs['API'].paths['/users'].get;
    expect(operation?.summary).toBe('Get all users');
    expect(operation?.description).toBe('Paginated list');
    expect(operation?.tags).toEqual(['users', 'admin']);
    expect(operation?.operationId).toBe('getAllUsers');
    expect(operation?.deprecated).toBe(false);
  });
});
