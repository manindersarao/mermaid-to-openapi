import { describe, it, expect } from 'vitest';
import { generateOpenApiSpecs } from '@/generators/openapiGenerator';
import type { MermaidAST } from '@/types';

describe('openapiGenerator - Advanced Media Types (Task 27)', () => {
  it('should use default application/json for request body when no media type specified', () => {
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
            name: 'John Doe'
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
    expect(specs['API'].paths['/users'].post?.requestBody?.content?.['application/json']).toBeDefined();
  });

  it('should use default application/json for response when no media type specified', () => {
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
    expect(specs['API'].paths['/users'].get?.responses['200'].content?.['application/json']).toBeDefined();
  });

  it('should use custom request media type when specified', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/upload',
          line: 1,
          requestMediaType: 'multipart/form-data',
          body: {
            file: 'data'
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
    expect(specs['API'].paths['/upload'].post?.requestBody?.content?.['multipart/form-data']).toBeDefined();
    expect(specs['API'].paths['/upload'].post?.requestBody?.content?.['application/json']).toBeUndefined();
  });

  it('should use custom response media type when specified', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'GET',
          path: '/data',
          line: 1,
          responseMediaType: 'application/xml',
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
    expect(specs['API'].paths['/data'].get?.responses['200'].content?.['application/xml']).toBeDefined();
    expect(specs['API'].paths['/data'].get?.responses['200'].content?.['application/json']).toBeUndefined();
  });

  it('should handle application/xml media type', () => {
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
          requestMediaType: 'application/xml',
          body: {
            data: 'value'
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
    expect(specs['API'].paths['/data'].post?.requestBody?.content?.['application/xml']).toBeDefined();
  });

  it('should handle text/plain media type', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/text',
          line: 1,
          requestMediaType: 'text/plain',
          body: {
            text: 'Hello World'
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
    expect(specs['API'].paths['/text'].post?.requestBody?.content?.['text/plain']).toBeDefined();
  });

  it('should handle application/x-www-form-urlencoded media type', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/form',
          line: 1,
          requestMediaType: 'application/x-www-form-urlencoded',
          body: {
            field1: 'value1',
            field2: 'value2'
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
    expect(specs['API'].paths['/form'].post?.requestBody?.content?.['application/x-www-form-urlencoded']).toBeDefined();
  });

  it('should handle different media types for request and response', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/convert',
          line: 1,
          requestMediaType: 'application/xml',
          responseMediaType: 'application/json',
          body: {
            data: 'value'
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
    expect(specs['API'].paths['/convert'].post?.requestBody?.content?.['application/xml']).toBeDefined();
    expect(specs['API'].paths['/convert'].post?.responses['201'].content?.['application/json']).toBeDefined();
  });

  it('should handle custom vendor-specific media types', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'POST',
          path: '/custom',
          line: 1,
          requestMediaType: 'application/vnd.company.v1+json',
          body: {
            data: 'value'
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
    expect(specs['API'].paths['/custom'].post?.requestBody?.content?.['application/vnd.company.v1+json']).toBeDefined();
  });

  it('should maintain schema structure with custom media types', () => {
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
          requestMediaType: 'application/xml',
          body: {
            name: 'Test',
            value: 123
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
    const requestBody = specs['API'].paths['/data'].post?.requestBody;
    expect(requestBody?.content?.['application/xml']).toBeDefined();
    expect(requestBody?.content?.['application/xml'].schema).toBeDefined();
    expect(requestBody?.required).toBe(true);
  });

  it('should handle response media type for GET requests with body', () => {
    const ast: MermaidAST = {
      participants: ['User', 'API'],
      interactions: [
        {
          type: 'request',
          from: 'User',
          to: 'API',
          method: 'GET',
          path: '/data',
          line: 1,
          responseMediaType: 'text/plain',
          body: {
            text: 'Response text'
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
    expect(specs['API'].paths['/data'].get?.responses['200'].content?.['text/plain']).toBeDefined();
  });
});
