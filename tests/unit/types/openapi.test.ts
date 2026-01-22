import { describe, it, expect } from 'vitest';
import type { OpenApiDoc, SchemaObject, Parameter, Operation, PathItem } from '@/types/openapi';

describe('OpenAPI Types', () => {
  describe('OpenApiDoc', () => {
    it('should create valid minimal spec', () => {
      const doc: OpenApiDoc = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {}
      };
      expect(doc.openapi).toBe('3.0.0');
      expect(doc.info.title).toBe('Test API');
    });

    it('should support optional description', () => {
      const doc: OpenApiDoc = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test description'
        },
        paths: {}
      };
      expect(doc.info.description).toBe('Test description');
    });
  });

  describe('SchemaObject', () => {
    it('should support all types', () => {
      const types: SchemaObject['type'][] = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
      types.forEach(type => {
        const schema: SchemaObject = { type };
        expect(schema.type).toBe(type);
      });
    });

    it('should support nested properties', () => {
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' }
        },
        required: ['name']
      };
      expect(schema.properties?.name).toBeDefined();
      expect(schema.required).toContain('name');
    });

    it('should support array items', () => {
      const schema: SchemaObject = {
        type: 'array',
        items: {
          type: 'string'
        }
      };
      expect(schema.type).toBe('array');
      expect(schema.items?.type).toBe('string');
    });

    it('should support validation constraints', () => {
      const schema: SchemaObject = {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        format: 'email'
      };
      expect(schema.minLength).toBe(1);
      expect(schema.maxLength).toBe(100);
      expect(schema.format).toBe('email');
    });

    it('should support numeric constraints', () => {
      const schema: SchemaObject = {
        type: 'number',
        minimum: 0,
        maximum: 100
      };
      expect(schema.minimum).toBe(0);
      expect(schema.maximum).toBe(100);
    });

    it('should support example values', () => {
      const schema: SchemaObject = {
        type: 'string',
        example: 'test@example.com'
      };
      expect(schema.example).toBe('test@example.com');
    });
  });

  describe('Parameter', () => {
    it('should create valid path parameter', () => {
      const param: Parameter = {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      };
      expect(param.name).toBe('userId');
      expect(param.in).toBe('path');
      expect(param.required).toBe(true);
    });

    it('should create valid query parameter', () => {
      const param: Parameter = {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer' }
      };
      expect(param.name).toBe('limit');
      expect(param.in).toBe('query');
      expect(param.required).toBeUndefined();
    });

    it('should support all parameter locations', () => {
      const locations: Parameter['in'][] = ['path', 'query', 'header', 'cookie'];
      locations.forEach(inLocation => {
        const param: Parameter = {
          name: 'test',
          in: inLocation,
          schema: { type: 'string' }
        };
        expect(param.in).toBe(inLocation);
      });
    });

    it('should support complex schema', () => {
      const param: Parameter = {
        name: 'filter',
        in: 'query',
        schema: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            value: { type: 'string' }
          }
        }
      };
      expect(param.schema.type).toBe('object');
      expect(param.schema.properties).toBeDefined();
    });
  });

  describe('Operation', () => {
    it('should create minimal operation', () => {
      const operation: Operation = {
        summary: 'Get user',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      expect(operation.summary).toBe('Get user');
      expect(operation.responses['200']).toBeDefined();
    });

    it('should support parameters array', () => {
      const param: Parameter = {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      };
      const operation: Operation = {
        summary: 'Get user by ID',
        parameters: [param],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      expect(operation.parameters).toHaveLength(1);
      expect(operation.parameters?.[0].name).toBe('id');
    });

    it('should support request body', () => {
      const operation: Operation = {
        summary: 'Create user',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                }
              }
            }
          },
          required: true
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody?.required).toBe(true);
      expect(operation.requestBody?.content['application/json']).toBeDefined();
    });

    it('should support multiple response codes', () => {
      const operation: Operation = {
        summary: 'Get user',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      expect(Object.keys(operation.responses)).toHaveLength(2);
      expect(operation.responses['404']).toBeDefined();
    });
  });

  describe('PathItem', () => {
    it('should support dynamic method keys', () => {
      const getOperation: Operation = {
        summary: 'List users',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array' }
              }
            }
          }
        }
      };

      const postOperation: Operation = {
        summary: 'Create user',
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };

      const pathItem: PathItem = {
        get: getOperation,
        post: postOperation
      };

      expect(pathItem.get?.summary).toBe('List users');
      expect(pathItem.post?.summary).toBe('Create user');
    });

    it('should support all HTTP methods', () => {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      const pathItem: PathItem = {};

      methods.forEach(method => {
        pathItem[method] = {
          summary: `${method} operation`,
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            }
          }
        };
      });

      expect(Object.keys(pathItem)).toHaveLength(methods.length);
    });
  });
});
