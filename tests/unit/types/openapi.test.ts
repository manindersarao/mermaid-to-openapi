import { describe, it, expect } from 'vitest';
import type { OpenApiDoc, SchemaObject, MultiSpecDocs } from '@/types/openapi';

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
  });
});
