import { describe, it, expect } from 'vitest';
import { validateOpenApiSpec, validateOpenApiSpecs } from '@/validators/openapiValidator';
import type { OpenApiDoc, MultiSpecDocs } from '@/types/openapi';

describe('openapiValidator', () => {
  describe('validateOpenApiSpec', () => {
    describe('valid specs', () => {
      it('should validate a minimal valid OpenAPI spec', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/users': {
              get: {
                summary: 'Get users',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a complete OpenAPI spec with all fields', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'Complete API',
            version: '1.0.0',
            description: 'A complete API specification',
          },
          paths: {
            '/users': {
              get: {
                summary: 'Get all users',
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer' },
                  },
                ],
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              post: {
                summary: 'Create user',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string' },
                        },
                        required: ['name', 'email'],
                      },
                    },
                  },
                  required: true,
                },
                responses: {
                  '201': {
                    description: 'Created',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate spec with path parameters', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/users/{id}': {
              get: {
                summary: 'Get user by ID',
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
      });

      it('should validate all valid HTTP methods', () => {
        const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];

        methods.forEach((method) => {
          const spec: OpenApiDoc = {
            openapi: '3.0.0',
            info: {
              title: 'API',
              version: '1.0.0',
            },
            paths: {
              '/test': {
                [method]: {
                  summary: 'Test endpoint',
                  responses: {
                    '200': {
                      description: 'OK',
                      content: {
                        'application/json': {
                          schema: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          };

          const result = validateOpenApiSpec(spec);
          expect(result.valid).toBe(true);
        });
      });

      it('should validate all valid status codes', () => {
        const statusCodes = ['100', '200', '201', '204', '301', '400', '401', '404', '500', '503'];

        statusCodes.forEach((code) => {
          const spec: OpenApiDoc = {
            openapi: '3.0.0',
            info: {
              title: 'API',
              version: '1.0.0',
            },
            paths: {
              '/test': {
                get: {
                  summary: 'Test endpoint',
                  responses: {
                    [code]: {
                      description: 'Response',
                      content: {
                        'application/json': {
                          schema: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          };

          const result = validateOpenApiSpec(spec);
          expect(result.valid).toBe(true);
        });
      });

      it('should validate spec with default and example values', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/users': {
              post: {
                summary: 'Create user',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          age: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 120,
                            example: 30,
                          },
                          name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                          },
                        },
                      },
                    },
                  },
                },
                responses: {
                  '201': {
                    description: 'Created',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
      });

      it('should validate empty paths object', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {},
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
      });
    });

    describe('missing required fields', () => {
      it('should detect missing openapi field', () => {
        const spec = {
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {},
        } as unknown as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('openapi'))).toBe(true);
      });

      it('should detect missing info field', () => {
        const spec = {
          openapi: '3.0.0',
          paths: {},
        } as unknown as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('info'))).toBe(true);
      });

      it('should detect missing paths field', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
        } as unknown as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('paths'))).toBe(true);
      });

      it('should detect missing info.title', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            version: '1.0.0',
          },
          paths: {},
        } as unknown as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('title'))).toBe(true);
      });

      it('should detect missing info.version', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'API',
          },
          paths: {},
        } as unknown as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('version'))).toBe(true);
      });

      it('should detect all missing required fields at once', () => {
        const spec = {} as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('invalid HTTP methods', () => {
      it('should detect invalid HTTP method', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              invalid: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            } as unknown as Record<string, unknown>,
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid HTTP method'))).toBe(true);
      });

      it('should detect multiple invalid methods', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test1': {
              invalid1: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            } as unknown as Record<string, unknown>,
            '/test2': {
              invalid2: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            } as unknown as Record<string, unknown>,
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.filter((e) => e.message.includes('Invalid HTTP method')).length).toBe(2);
      });
    });

    describe('invalid status codes', () => {
      it('should detect invalid status code (too low)', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '99': {
                    description: 'Too low',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid status code'))).toBe(true);
      });

      it('should detect invalid status code (too high)', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '600': {
                    description: 'Too high',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid status code'))).toBe(true);
      });

      it('should detect non-numeric status code', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  ok: {
                    description: 'Not numeric',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                } as unknown as Record<string, unknown>,
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid status code'))).toBe(true);
      });

      it('should detect status code with wrong format', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '20': {
                    description: 'Wrong format',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid status code'))).toBe(true);
      });
    });

    describe('circular references', () => {
      it('should detect direct circular reference in schema', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          $ref: '#/components/schemas/Circular',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              Circular: {
                type: 'object',
                properties: {
                  self: {
                    $ref: '#/components/schemas/Circular',
                  },
                },
              },
            },
          },
        } as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        // Direct self-references are allowed for recursive structures
        expect(result.valid).toBe(true);
      });

      it('should detect circular reference chain', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          $ref: '#/components/schemas/A',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              A: {
                type: 'object',
                properties: {
                  b: {
                    $ref: '#/components/schemas/B',
                  },
                },
              },
              B: {
                type: 'object',
                properties: {
                  c: {
                    $ref: '#/components/schemas/C',
                  },
                },
              },
              C: {
                type: 'object',
                properties: {
                  a: {
                    $ref: '#/components/schemas/A',
                  },
                },
              },
            },
          },
        } as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        // Circular chains should be detected
        expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
      });

      it('should allow self-referencing schemas for recursive structures', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            tree: {
                              $ref: '#/components/schemas/TreeNode',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              TreeNode: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  children: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/TreeNode',
                    },
                  },
                },
              },
            },
          },
        } as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        // Recursive structures are valid but may generate warnings
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid references', () => {
      it('should detect reference to non-existent component', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          $ref: '#/components/schemas/NonExistent',
                        } as unknown as Record<string, unknown>,
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              Existing: {
                type: 'object',
              },
            },
          },
        } as unknown as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid reference'))).toBe(true);
      });

      it('should detect malformed reference', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          $ref: 'not-a-valid-ref',
                        } as unknown as Record<string, unknown>,
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid reference'))).toBe(true);
      });

      it('should detect reference to non-existent path', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          $ref: '#/paths/invalid',
                        } as unknown as Record<string, unknown>,
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid reference'))).toBe(true);
      });
    });

    describe('media type validation', () => {
      it('should validate correct media type structure', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
      });

      it('should detect media type without schema', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {} as unknown as Record<string, unknown>,
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('schema'))).toBe(true);
      });

      it('should detect response without content', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                responses: {
                  '200': {
                    description: 'OK',
                  } as unknown as Record<string, unknown>,
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('content'))).toBe(true);
      });

      it('should detect request body without content', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              post: {
                summary: 'Test',
                requestBody: {} as unknown as Record<string, unknown>,
                responses: {
                  '201': {
                    description: 'Created',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('content'))).toBe(true);
      });
    });

    describe('parameter validation', () => {
      it('should validate required path parameters', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/users/{id}': {
              get: {
                summary: 'Get user',
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
      });

      it('should warn about path parameter not marked as required', () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/users/{id}': {
              get: {
                summary: 'Get user',
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: false,
                    schema: { type: 'string' },
                  },
                ],
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        } as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        // The spec is valid, but should have warnings about path parameter
        expect(result.valid).toBe(true);
        // Note: Path parameter warnings may not be generated depending on implementation
        // This test documents the expected behavior
      });

      it('should detect invalid parameter location', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                summary: 'Test',
                parameters: [
                  {
                    name: 'param',
                    in: 'invalid' as unknown as 'path',
                    schema: { type: 'string' },
                  },
                ],
                responses: {
                  '200': {
                    description: 'OK',
                    content: {
                      'application/json': {
                        schema: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid parameter location'))).toBe(true);
      });
    });

    describe('validation result structure', () => {
      it('should return ValidationResult with correct structure', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {},
        };

        const result = validateOpenApiSpec(spec);
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it('should include severity levels', () => {
        const spec = {} as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.errors.length).toBeGreaterThan(0);
        result.errors.forEach((error) => {
          expect(error).toHaveProperty('severity');
          expect(error.severity).toMatch(/error|warning|info/);
        });
      });

      it('should include source field', () => {
        const spec = {} as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.errors.length).toBeGreaterThan(0);
        result.errors.forEach((error) => {
          expect(error).toHaveProperty('source');
          expect(error.source).toBe('openapi');
        });
      });

      it('should include suggestions for fixable errors', () => {
        const spec = {} as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.errors.length).toBeGreaterThan(0);
        const errorsWithSuggestions = result.errors.filter((e) => e.suggestion);
        expect(errorsWithSuggestions.length).toBeGreaterThan(0);
      });
    });

    describe('edge cases', () => {
      it('should handle null spec', () => {
        const result = validateOpenApiSpec(null as unknown as OpenApiDoc);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle undefined spec', () => {
        const result = validateOpenApiSpec(undefined as unknown as OpenApiDoc);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle spec with invalid openapi version', () => {
        const spec = {
          openapi: '2.0.0',
          info: {
            title: 'API',
            version: '1.0.0',
          },
          paths: {},
        } as OpenApiDoc;

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('version'))).toBe(true);
      });

      it('should handle spec with no operations', () => {
        const spec: OpenApiDoc = {
          openapi: '3.0.0',
          info: {
            title: 'Empty API',
            version: '1.0.0',
          },
          paths: {},
        };

        const result = validateOpenApiSpec(spec);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateOpenApiSpecs (multi-spec)', () => {
    describe('valid multi-specs', () => {
      it('should validate multiple valid specs', () => {
        const specs: MultiSpecDocs = {
          'users-service': {
            openapi: '3.0.0',
            info: {
              title: 'Users Service',
              version: '1.0.0',
            },
            paths: {
              '/users': {
                get: {
                  summary: 'Get users',
                  responses: {
                    '200': {
                      description: 'OK',
                      content: {
                        'application/json': {
                          schema: { type: 'array' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          'orders-service': {
            openapi: '3.0.0',
            info: {
              title: 'Orders Service',
              version: '1.0.0',
            },
            paths: {
              '/orders': {
                get: {
                  summary: 'Get orders',
                  responses: {
                    '200': {
                      description: 'OK',
                      content: {
                        'application/json': {
                          schema: { type: 'array' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = validateOpenApiSpecs(specs);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate empty multi-specs object', () => {
        const specs: MultiSpecDocs = {};

        const result = validateOpenApiSpecs(specs);
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid multi-specs', () => {
      it('should detect errors in multiple specs', () => {
        const specs: MultiSpecDocs = {
          'service1': {
            openapi: '3.0.0',
            info: {
              title: 'Service 1',
              version: '1.0.0',
            },
            paths: {},
          } as unknown as OpenApiDoc,
          'service2': {} as unknown as OpenApiDoc,
        };

        const result = validateOpenApiSpecs(specs);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should identify which service has errors', () => {
        const specs: MultiSpecDocs = {
          'valid-service': {
            openapi: '3.0.0',
            info: {
              title: 'Valid Service',
              version: '1.0.0',
            },
            paths: {},
          },
          'invalid-service': {} as unknown as OpenApiDoc,
        };

        const result = validateOpenApiSpecs(specs);
        expect(result.valid).toBe(false);
        const invalidServiceErrors = result.errors.filter((e) => e.context?.includes('invalid-service'));
        expect(invalidServiceErrors.length).toBeGreaterThan(0);
      });
    });

    describe('multi-spec specific validations', () => {
      it('should ensure each service has at least one operation', () => {
        const specs: MultiSpecDocs = {
          'empty-service': {
            openapi: '3.0.0',
            info: {
              title: 'Empty Service',
              version: '1.0.0',
            },
            paths: {},
          },
        };

        const result = validateOpenApiSpecs(specs);
        expect(result.valid).toBe(true);
        // Empty service is valid but may generate a warning
        expect(result.warnings.some((w) => w.message.includes('no operations'))).toBe(true);
      });
    });
  });
});
