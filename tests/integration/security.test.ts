import { describe, it, expect } from 'vitest';
import { tokenize } from '@/parser/mermaidLexer';
import { parse } from '@/parser/mermaidParser';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';
import { toYaml } from '@/generators/yamlFormatter';

describe('Security Schemes - Integration Tests', () => {
  it('should process security schemes from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: bearerAuth
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('bearerAuth:');
    expect(yaml).toContain('type: "http"');
    expect(yaml).toContain('scheme: "bearer"');
    expect(yaml).toContain('bearerFormat: "JWT"');
    expect(yaml).toContain('security:');
    expect(yaml).toContain('- bearerAuth:');
  });

  it('should process apiKey in header from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: apiKey in header
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('apiKey_header:');
    expect(yaml).toContain('type: "apiKey"');
    expect(yaml).toContain('name: "X-API-Key"');
    expect(yaml).toContain('in: "header"');
    expect(yaml).toContain('security:');
    expect(yaml).toContain('- apiKey_header:');
  });

  it('should process oauth2 with scopes from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: oauth2[read,write]
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('oauth2:read,write:');
    expect(yaml).toContain('type: "oauth2"');
    expect(yaml).toContain('flows:');
    expect(yaml).toContain('implicit:');
    expect(yaml).toContain('authorizationUrl: "https://example.com/oauth/authorize"');
    expect(yaml).toContain('scopes:');
    expect(yaml).toContain('read: "read permission"');
    expect(yaml).toContain('write: "write permission"');
  });

  it('should process multiple security schemes from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: bearerAuth
        Note over API: Security: apiKey in header
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('bearerAuth:');
    expect(yaml).toContain('apiKey_header:');
    expect(yaml).toContain('security:');
    expect(yaml).toContain('- bearerAuth:');
    expect(yaml).toContain('- apiKey_header:');
  });

  it('should process security with body from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: POST /users
        Note over API: Body: {"name": "John"}
        Note over API: Security: bearerAuth
        API-->>Client: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('requestBody:');
    expect(yaml).toContain('bearerAuth:');
    expect(yaml).toContain('security:');
    expect(yaml).toContain('- bearerAuth:');
  });

  it('should process different security schemes for different endpoints', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /public
        API-->>Client: 200 OK

        Client->>API: GET /users
        Note over API: Security: bearerAuth
        API-->>Client: 200 OK

        Client->>API: POST /users
        Note over API: Security: apiKey in header
        API-->>Client: 201 Created
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    // Public endpoint should have no security
    expect(yaml).toMatch(/\/public:\n    get:/);
    // The /public endpoint should not have a security property
    const publicIndex = yaml.indexOf('/public:');
    const usersIndex = yaml.indexOf('/users:');
    const publicSection = yaml.substring(publicIndex, usersIndex);
    expect(publicSection).not.toContain('security:');

    // GET /users should have bearerAuth
    expect(yaml).toContain('bearerAuth:');

    // POST /users should have apiKey_header
    expect(yaml).toContain('apiKey_header:');
  });

  it('should process basicAuth from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /admin
        Note over API: Security: basicAuth
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('basicAuth:');
    expect(yaml).toContain('type: "http"');
    expect(yaml).toContain('scheme: "basic"');
    expect(yaml).toContain('security:');
    expect(yaml).toContain('- basicAuth:');
  });

  it('should process openIdConnect from Mermaid to OpenAPI YAML', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: openIdConnect
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);
    const yaml = toYaml(specs['API']);

    expect(yaml).toContain('openIdConnect:');
    expect(yaml).toContain('type: "openIdConnect"');
    expect(yaml).toContain('openIdConnectUrl: "https://example.com/.well-known/openid-configuration"');
    expect(yaml).toContain('security:');
    expect(yaml).toContain('- openIdConnect:');
  });

  it('should handle case insensitive security declarations', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: BEARERAUTH
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    expect(specs['API'].components?.securitySchemes?.['bearerAuth']).toBeDefined();
  });

  it('should generate valid OpenAPI spec with all security components', () => {
    const mermaid = `
      sequenceDiagram
        participant Client
        participant API

        Client->>API: GET /users
        Note over API: Security: bearerAuth
        API-->>Client: 200 OK
    `;

    const tokens = tokenize(mermaid);
    const ast = parse(tokens);
    const specs = generateOpenApiSpecs(ast);

    // Verify the spec structure
    expect(specs['API'].openapi).toBe('3.0.0');
    expect(specs['API'].components).toBeDefined();
    expect(specs['API'].components?.securitySchemes).toBeDefined();
    expect(specs['API'].paths['/users'].get?.security).toBeDefined();

    // Verify security scheme
    const bearerAuth = specs['API'].components?.securitySchemes?.['bearerAuth'];
    expect(bearerAuth?.type).toBe('http');
    expect(bearerAuth?.scheme).toBe('bearer');
    expect(bearerAuth?.bearerFormat).toBe('JWT');

    // Verify security reference
    const security = specs['API'].paths['/users'].get?.security;
    expect(security).toEqual([{ bearerAuth: [] }]);
  });
});
