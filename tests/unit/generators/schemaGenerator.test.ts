import { describe, it, expect } from 'vitest';
import { generateSchema, parseSchemaFromValue } from '@/generators/schemaGenerator';

describe('schemaGenerator', () => {
  describe('parseSchemaFromValue', () => {
    it('should infer string type from string values', () => {
      const result = parseSchemaFromValue('hello');
      expect(result.schema).toMatchObject({
        type: 'string',
        example: 'hello'
      });
      expect(result.isRequired).toBe(false);
    });

    it('should infer integer type from integer numbers', () => {
      const result = parseSchemaFromValue(42);
      expect(result.schema).toMatchObject({
        type: 'integer',
        example: 42
      });
    });

    it('should infer number type from floating point numbers', () => {
      const result = parseSchemaFromValue(3.14);
      expect(result.schema).toMatchObject({
        type: 'number',
        example: 3.14
      });
    });

    it('should infer boolean type', () => {
      const result = parseSchemaFromValue(true);
      expect(result.schema).toMatchObject({
        type: 'boolean',
        example: true
      });
    });

    it('should handle null values', () => {
      const result = parseSchemaFromValue(null);
      expect(result.schema).toMatchObject({
        type: 'string'
      });
    });

    it('should handle arrays of primitives', () => {
      const result = parseSchemaFromValue(['a', 'b', 'c']);
      expect(result.schema).toMatchObject({
        type: 'array',
        items: { type: 'string', example: 'a' },
        example: ['a', 'b', 'c']
      });
    });

    it('should handle empty arrays', () => {
      const result = parseSchemaFromValue([]);
      expect(result.schema).toMatchObject({
        type: 'array',
        items: { type: 'string' },
        example: []
      });
    });

    it('should handle arrays of objects', () => {
      const result = parseSchemaFromValue([{ id: 1, name: 'John' }]);
      expect(result.schema).toMatchObject({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'John' }
          }
        }
      });
    });

    it('should parse explicit type validation strings', () => {
      const result = parseSchemaFromValue('string,required,min:2,max:50');
      expect(result.schema).toMatchObject({
        type: 'string',
        minLength: 2,
        maxLength: 50
      });
      expect(result.isRequired).toBe(true);
    });

    it('should parse integer validation with min/max', () => {
      const result = parseSchemaFromValue('integer,min:18,max:120');
      expect(result.schema).toMatchObject({
        type: 'integer',
        minimum: 18,
        maximum: 120
      });
      expect(result.isRequired).toBe(false);
    });

    it('should parse format validation', () => {
      const result = parseSchemaFromValue('string,format:email');
      expect(result.schema).toMatchObject({
        type: 'string',
        format: 'email'
      });
    });

    it('should parse example validation', () => {
      const result = parseSchemaFromValue('string,example:test@example.com');
      expect(result.schema).toMatchObject({
        type: 'string',
        example: 'test@example.com'
      });
    });

    it('should handle multiple validations together', () => {
      const result = parseSchemaFromValue('string,required,min:5,max:100,format:email,example:test@test.com');
      expect(result.schema).toMatchObject({
        type: 'string',
        minLength: 5,
        maxLength: 100,
        format: 'email',
        example: 'test@test.com'
      });
      expect(result.isRequired).toBe(true);
    });

    it('should not treat regular strings as validation strings', () => {
      const result = parseSchemaFromValue('just a regular string');
      expect(result.schema).toMatchObject({
        type: 'string',
        example: 'just a regular string'
      });
      expect(result.isRequired).toBe(false);
    });

    it('should infer object type for objects', () => {
      const result = parseSchemaFromValue({ key: 'value' });
      expect(result.schema).toMatchObject({
        type: 'object'
      });
    });
  });

  describe('generateSchema', () => {
    it('should generate schema from simple object', () => {
      const schema = generateSchema({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(schema).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' }
        }
      });
    });

    it('should infer types from values', () => {
      const schema = generateSchema({
        name: 'John',
        age: 30,
        active: true,
        score: 95.5
      });

      expect(schema.properties?.name).toMatchObject({ type: 'string', example: 'John' });
      expect(schema.properties?.age).toMatchObject({ type: 'integer', example: 30 });
      expect(schema.properties?.active).toMatchObject({ type: 'boolean', example: true });
      expect(schema.properties?.score).toMatchObject({ type: 'number', example: 95.5 });
    });

    it('should handle nested objects', () => {
      const schema = generateSchema({
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'New York'
        }
      });

      expect(schema.properties?.address).toMatchObject({
        type: 'object',
        properties: {
          street: { type: 'string', example: '123 Main St' },
          city: { type: 'string', example: 'New York' }
        }
      });
    });

    it('should handle arrays with inferred item types', () => {
      const schema = generateSchema({
        tags: ['javascript', 'typescript']
      });

      expect(schema.properties?.tags).toMatchObject({
        type: 'array',
        items: { type: 'string', example: 'javascript' },
        example: ['javascript', 'typescript']
      });
    });

    it('should handle empty arrays', () => {
      const schema = generateSchema({
        tags: []
      });

      expect(schema.properties?.tags).toMatchObject({
        type: 'array',
        items: { type: 'string' },
        example: []
      });
    });

    it('should handle arrays of objects', () => {
      const schema = generateSchema({
        users: [
          { id: 1, name: 'John' }
        ]
      });

      expect(schema.properties?.users).toMatchObject({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'John' }
          }
        }
      });
    });

    it('should handle explicit validation strings', () => {
      const schema = generateSchema({
        name: 'string,required,min:2,max:50',
        email: 'string,required,format:email',
        age: 'integer,required,min:18,max:120'
      });

      expect(schema.properties?.name).toMatchObject({
        type: 'string',
        minLength: 2,
        maxLength: 50
      });
      expect(schema.properties?.email).toMatchObject({
        type: 'string',
        format: 'email'
      });
      expect(schema.properties?.age).toMatchObject({
        type: 'integer',
        minimum: 18,
        maximum: 120
      });
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('email');
      expect(schema.required).toContain('age');
    });

    it('should collect required fields', () => {
      const schema = generateSchema({
        requiredField: 'string,required',
        optionalField: 'string'
      });

      expect(schema.required).toEqual(['requiredField']);
    });

    it('should handle deeply nested objects', () => {
      const schema = generateSchema({
        user: {
          profile: {
            settings: {
              theme: 'dark'
            }
          }
        }
      });

      expect(schema.properties?.user).toMatchObject({
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            properties: {
              settings: {
                type: 'object',
                properties: {
                  theme: { type: 'string', example: 'dark' }
                }
              }
            }
          }
        }
      });
    });

    it('should handle mixed nested and primitive arrays', () => {
      const schema = generateSchema({
        tags: ['tag1', 'tag2'],
        items: [{ id: 1 }, { id: 2 }]
      });

      expect(schema.properties?.tags).toMatchObject({
        type: 'array',
        items: { type: 'string', example: 'tag1' }
      });
      expect(schema.properties?.items).toMatchObject({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 }
          }
        }
      });
    });

    it('should handle empty object', () => {
      const schema = generateSchema({});

      expect(schema).toMatchObject({
        type: 'object',
        properties: {}
      });
      expect(schema.required).toBeUndefined();
    });
  });
});
