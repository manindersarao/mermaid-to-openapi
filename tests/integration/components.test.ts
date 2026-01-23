import { describe, it, expect } from 'vitest';
import { tokenize } from '@/parser/mermaidLexer';
import { parse } from '@/parser/mermaidParser';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';

describe('Integration - Components and References (Task 25)', () => {
  it('should parse and generate schema components from Mermaid diagram', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /users
        Note over API: Body: {"name":"John","email":"john@example.com"}
        API-->>User: 201 Created

        User->>API: PUT /users/1
        Note over API: Body: {"name":"John","email":"john@example.com"}
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].components?.schemas).toBeDefined();

    // Should extract identical schema
    const schemaNames = Object.keys(specs['API'].components?.schemas || {});
    expect(schemaNames.length).toBeGreaterThan(0);

    // Both operations should reference the same schema
    const postRef = specs['API'].paths['/users'].post?.requestBody?.content?.['application/json'].schema?.$ref;
    const putRef = specs['API'].paths['/users/1'].put?.requestBody?.content?.['application/json'].schema?.$ref;

    expect(postRef).toBe(putRef);
  });

  it('should handle multiple different schemas', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /users
        Note over API: Body: {"name":"John","email":"john@example.com"}
        API-->>User: 201 Created

        User->>API: POST /products
        Note over API: Body: {"title":"Product","price":100}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].components?.schemas).toBeDefined();

    const schemaNames = Object.keys(specs['API'].components?.schemas || {});
    expect(schemaNames.length).toBe(2);
  });
});
