import { describe, it, expect } from 'vitest';
import { tokenize } from '@/parser/mermaidLexer';
import { parse } from '@/parser/mermaidParser';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';

describe('Integration - Advanced Media Types (Task 27)', () => {
  it('should parse and generate XML request media type', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /data
        Note over API: Request-Type: application/xml\nBody: {"data":"value"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/data'].post?.requestBody?.content?.['application/xml']).toBeDefined();
  });

  it('should parse and generate XML response media type', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: GET /data
        Note over API: Response-Type: application/xml
        API-->>User: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/data'].get?.responses['200'].content?.['application/xml']).toBeDefined();
  });

  it('should parse and generate multipart/form-data request media type', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /upload
        Note over API: Request-Type: multipart/form-data\nBody: {"file":"data"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/upload'].post?.requestBody?.content?.['multipart/form-data']).toBeDefined();
  });

  it('should parse and generate different media types for request and response', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /convert
        Note over API: Request-Type: application/xml\nResponse-Type: application/json\nBody: {"data":"value"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/convert'].post?.requestBody?.content?.['application/xml']).toBeDefined();
    expect(specs['API'].paths['/convert'].post?.responses['201'].content?.['application/json']).toBeDefined();
  });

  it('should parse and generate text/plain media type', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /text
        Note over API: Request-Type: text/plain\nBody: {"text":"hello"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/text'].post?.requestBody?.content?.['text/plain']).toBeDefined();
  });

  it('should parse and generate application/x-www-form-urlencoded media type', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /form
        Note over API: Request-Type: application/x-www-form-urlencoded\nBody: {"field":"value"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/form'].post?.requestBody?.content?.['application/x-www-form-urlencoded']).toBeDefined();
  });

  it('should parse and generate vendor-specific media types', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /custom
        Note over API: Request-Type: application/vnd.company.v1+json\nBody: {"data":"value"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/custom'].post?.requestBody?.content?.['application/vnd.company.v1+json']).toBeDefined();
  });

  it('should default to application/json when no media type specified', () => {
    const mermaid = `
      sequenceDiagram
        participant User
        participant API

        User->>API: POST /users
        Note over API: Body: {"name":"John"}
        API-->>User: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API']).toBeDefined();
    expect(specs['API'].paths['/users'].post?.requestBody?.content?.['application/json']).toBeDefined();
  });
});
