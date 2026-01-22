import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSchema, parseSchemaFromValue } from '@/generators/schemaGenerator';
import type { SchemaObject } from '@/types';

describe('schemaGenerator (property-based)', () => {
  describe('parseSchemaFromValue', () => {
    it('should always return a valid SchemaObject with type property', () => {
      fc.assert(
        fc.property(fc.anything(), (value) => {
          const result = parseSchemaFromValue(value);
          return (
            result.schema !== undefined &&
            result.schema.type !== undefined &&
            typeof result.schema.type === 'string'
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should infer correct type from string values', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const result = parseSchemaFromValue(str);
          // Regular strings should be inferred as string type
          return result.schema.type === 'string';
        }),
        { numRuns: 1000 }
      );
    });

    it('should infer integer type from integer numbers', () => {
      fc.assert(
        fc.property(fc.integer(), (num) => {
          const result = parseSchemaFromValue(num);
          return (
            result.schema.type === 'integer' &&
            result.schema.example === num
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should infer number type from floating point numbers', () => {
      // Generate doubles that are actually floating point (not integers or NaN/Infinity)
      const floatArb = fc.double({ noNaN: true, noInfinity: true })
        .filter(n => !Number.isInteger(n));

      fc.assert(
        fc.property(floatArb, (num) => {
          const result = parseSchemaFromValue(num);
          return (
            result.schema.type === 'number' &&
            result.schema.example === num
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should infer boolean type from boolean values', () => {
      fc.assert(
        fc.property(fc.boolean(), (bool) => {
          const result = parseSchemaFromValue(bool);
          return (
            result.schema.type === 'boolean' &&
            result.schema.example === bool
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should infer array type from arrays', () => {
      fc.assert(
        fc.property(fc.array(fc.anything()), (arr) => {
          const result = parseSchemaFromValue(arr);
          return (
            result.schema.type === 'array' &&
            result.schema.items !== undefined
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should infer object type from plain objects', () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const result = parseSchemaFromValue(obj);
          return result.schema.type === 'object';
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle null values', () => {
      fc.assert(
        fc.property(fc.constantFrom(null), (value) => {
          const result = parseSchemaFromValue(value);
          return result.schema.type === 'string';
        }),
        { numRuns: 10 }
      );
    });

    it('should correctly parse validation strings with required flag', () => {
      const validationStringArb = fc.tuple(
        fc.constantFrom('string', 'integer', 'number', 'boolean', 'array', 'object'),
        fc.boolean(),
        fc.option(fc.nat(), { nil: undefined }),
        fc.option(fc.nat(), { nil: undefined })
      ).map(([type, includeRequired, min, max]) => {
        const parts = [type];
        if (includeRequired) parts.push('required');
        if (min !== undefined) parts.push(`min:${min}`);
        if (max !== undefined) parts.push(`max:${max}`);
        return parts.join(',');
      });

      fc.assert(
        fc.property(validationStringArb, (validationString) => {
          const result = parseSchemaFromValue(validationString);
          const hasRequired = validationString.includes('required');

          return result.isRequired === hasRequired;
        }),
        { numRuns: 1000 }
      );
    });

    it('should parse format from validation strings', () => {
      const formatStringArb = fc.tuple(
        fc.constantFrom('string', 'integer', 'number'),
        fc.constantFrom('email', 'date', 'uri', 'uuid')
      ).map(([type, format]) => `${type},format:${format}`);

      fc.assert(
        fc.property(formatStringArb, (validationString) => {
          const result = parseSchemaFromValue(validationString);
          const format = validationString.split('format:')[1]?.split(',')[0];

          return result.schema.format === format;
        }),
        { numRuns: 1000 }
      );
    });

    it('should parse min/max constraints from validation strings', () => {
      const constraintStringArb = fc.tuple(
        fc.constantFrom('string', 'integer', 'number'),
        fc.nat(100),
        fc.nat(100, 101)
      ).map(([type, min, max]) => `${type},min:${min},max:${max}`);

      fc.assert(
        fc.property(constraintStringArb, (validationString) => {
          const result = parseSchemaFromValue(validationString);
          const type = validationString.split(',')[0];

          if (type === 'string') {
            return (
              typeof result.schema.minLength === 'number' &&
              typeof result.schema.maxLength === 'number'
            );
          } else {
            return (
              typeof result.schema.minimum === 'number' &&
              typeof result.schema.maximum === 'number'
            );
          }
        }),
        { numRuns: 1000 }
      );
    });

    it('should not treat regular strings as validation strings', () => {
      // Generate strings that look like normal text, not validation strings
      // Avoid strings starting with validation keywords or containing colons
      const regularStringArb = fc.stringMatching(/[a-zA-Z ]+/)
        .filter(s => !s.includes(':'));

      fc.assert(
        fc.property(regularStringArb, (str) => {
          const result = parseSchemaFromValue(str);
          // Should be inferred as string type with the value as example
          return (
            result.schema.type === 'string' &&
            result.schema.example === str &&
            result.isRequired === false
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should set example value for primitive types', () => {
      // Filter out NaN which doesn't equal itself
      const finiteDoubleArb = fc.double({ noNaN: true, noInfinity: true });
      // Avoid strings with colons which might be parsed as validation strings
      const safeStringArb = fc.string().filter(s => !s.includes(':'));

      fc.assert(
        fc.property(fc.oneof(safeStringArb, fc.integer(), finiteDoubleArb, fc.boolean()), (value) => {
          const result = parseSchemaFromValue(value);

          if (typeof value === 'string') {
            // Skip validation strings (contain comma and keywords)
            if (value.includes(',') && value.match(/^(string|integer|number|boolean|array|object|required|min|max|format|example)/)) {
              return true;
            }
            return result.schema.example === value;
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            return result.schema.example === value;
          }
          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle arrays with proper item types', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          (arr) => {
            const result = parseSchemaFromValue(arr);

            if (arr.length === 0) {
              return (
                result.schema.type === 'array' &&
                result.schema.items?.type === 'string'
              );
            } else {
              const firstItem = arr[0];
              let expectedType: string;
              if (typeof firstItem === 'string') expectedType = 'string';
              else if (typeof firstItem === 'boolean') expectedType = 'boolean';
              else if (Number.isInteger(firstItem)) expectedType = 'integer';
              else expectedType = 'number';

              return (
                result.schema.type === 'array' &&
                result.schema.items?.type === expectedType
              );
            }
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle arrays of objects with recursive schema generation', () => {
      const objectArb = fc.object({
        maxDepth: 2,
        maxKeys: 5
      });

      fc.assert(
        fc.property(fc.array(objectArb, { minLength: 1 }), (arr) => {
          const result = parseSchemaFromValue(arr);

          return (
            result.schema.type === 'array' &&
            result.schema.items?.type === 'object' &&
            typeof result.schema.items?.properties === 'object'
          );
        }),
        { numRuns: 1000 }
      );
    });
  });

  describe('generateSchema', () => {
    it('should always return an object type schema', () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const schema = generateSchema(obj);
          return schema.type === 'object';
        }),
        { numRuns: 1000 }
      );
    });

    it('should always have properties object', () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const schema = generateSchema(obj);
          return (
            schema.properties !== undefined &&
            typeof schema.properties === 'object'
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should have same number of properties as input object', () => {
      // Use dictionary to avoid undefined values that fc.object might generate
      // Use simple string keys to avoid __proto__ and other prototype keys
      const safeObjectArb = fc.dictionary(
        fc.stringMatching(/[a-z]+/),
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.double(), fc.array(fc.string())),
        { maxKeys: 10 }
      );

      fc.assert(
        fc.property(safeObjectArb, (obj) => {
          const schema = generateSchema(obj);
          return Object.keys(schema.properties).length === Object.keys(obj).length;
        }),
        { numRuns: 1000 }
      );
    });

    it('should preserve property names from input object', () => {
      // Use dictionary with safe keys to avoid __proto__ and other prototype keys
      const safeObjectArb = fc.dictionary(
        fc.stringMatching(/[a-z]+/),
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.array(fc.string())),
        { maxKeys: 10 }
      );

      fc.assert(
        fc.property(safeObjectArb, (obj) => {
          const schema = generateSchema(obj);
          const inputKeys = new Set(Object.keys(obj));
          const schemaKeys = new Set(Object.keys(schema.properties));

          // Check that all input keys are in schema
          return Object.keys(obj).every((key) => schemaKeys.has(key));
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle nested objects correctly', () => {
      const nestedObjectArb = fc.object({
        maxDepth: 3,
        maxKeys: 5
      });

      fc.assert(
        fc.property(nestedObjectArb, (obj) => {
          const schema = generateSchema(obj);

          const validateNestedSchema = (schemaObj: SchemaObject): boolean => {
            if (schemaObj.type === 'object' && schemaObj.properties) {
              for (const prop of Object.values(schemaObj.properties)) {
                if (!validateNestedSchema(prop)) return false;
              }
            }
            return true;
          };

          return validateNestedSchema(schema);
        }),
        { numRuns: 1000 }
      );
    });

    it('should collect required fields from validation strings', () => {
      const objectWithRequiredArb = fc.dictionary(
        fc.string(),
        fc.oneof(
          fc.string(),
          fc.tuple(
            fc.constantFrom('string', 'integer', 'number', 'boolean'),
            fc.boolean()
          ).map(([type, includeRequired]) =>
            includeRequired ? `${type},required` : type
          )
        )
      );

      fc.assert(
        fc.property(objectWithRequiredArb, (obj) => {
          const schema = generateSchema(obj);

          // Count how many fields have 'required' in their value
          const expectedRequiredCount = Object.entries(obj).filter(
            ([key, value]) => typeof value === 'string' && value.includes('required')
          ).length;

          const actualRequiredCount = schema.required?.length || 0;

          return actualRequiredCount === expectedRequiredCount;
        }),
        { numRuns: 1000 }
      );
    });

    it('should only include required array when there are required fields', () => {
      const mixedObjectArb = fc.tuple(
        fc.dictionary(fc.string(), fc.string()),
        fc.boolean()
      ).map(([obj, shouldHaveRequired]) => {
        if (shouldHaveRequired) {
          // Ensure at least one required field
          return { ...obj, requiredField: 'string,required' };
        }
        return obj;
      });

      fc.assert(
        fc.property(mixedObjectArb, (obj) => {
          const schema = generateSchema(obj);
          const hasRequiredInValues = Object.values(obj).some(
            (v) => typeof v === 'string' && v.includes('required')
          );

          if (hasRequiredInValues) {
            return (
              schema.required !== undefined &&
              schema.required.length > 0 &&
              Array.isArray(schema.required)
            );
          } else {
            return schema.required === undefined;
          }
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle empty objects', () => {
      fc.assert(
        fc.property(fc.constant({}), (obj) => {
          const schema = generateSchema(obj);

          return (
            schema.type === 'object' &&
            schema.properties !== undefined &&
            Object.keys(schema.properties).length === 0 &&
            schema.required === undefined
          );
        }),
        { numRuns: 10 }
      );
    });

    it('should handle objects with arrays', () => {
      const objectWithArraysArb = fc.dictionary(
        fc.string(),
        fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()))
      );

      fc.assert(
        fc.property(objectWithArraysArb, (obj) => {
          const schema = generateSchema(obj);

          // Verify all array properties are correctly typed
          for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
              const propSchema = schema.properties[key];
              if (propSchema?.type !== 'array' || !propSchema.items) {
                return false;
              }
            }
          }

          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle objects with nested objects', () => {
      const nestedValueArb = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.object({ maxDepth: 2, maxKeys: 3 })
      );

      fc.assert(
        fc.property(fc.dictionary(fc.string(), nestedValueArb), (obj) => {
          const schema = generateSchema(obj);

          // Verify nested object properties
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const propSchema = schema.properties[key];
              if (propSchema?.type !== 'object' || !propSchema.properties) {
                return false;
              }
            }
          }

          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should maintain round-trip property consistency', () => {
      // Test that generating schema from same values produces consistent types
      const testObjectArb = fc.dictionary(
        fc.string(),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.double(),
          fc.boolean(),
          fc.array(fc.string())
        )
      );

      fc.assert(
        fc.property(testObjectArb, (obj) => {
          const schema1 = generateSchema(obj);
          const schema2 = generateSchema(obj);

          // Schemas should be identical for same input
          return JSON.stringify(schema1) === JSON.stringify(schema2);
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle mixed primitive and complex types', () => {
      const mixedValueArb = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.double(),
        fc.boolean(),
        fc.array(fc.string()),
        fc.object({ maxDepth: 1, maxKeys: 3 })
      );

      fc.assert(
        fc.property(fc.dictionary(fc.string(), mixedValueArb, { maxKeys: 10 }), (obj) => {
          const schema = generateSchema(obj);

          // All properties should have valid types
          for (const propSchema of Object.values(schema.properties)) {
            if (
              !['string', 'integer', 'number', 'boolean', 'array', 'object'].includes(
                propSchema.type
              )
            ) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 1000 }
      );
    });
  });

  describe('Schema invariants', () => {
    it('should never produce schemas with undefined type', () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const schema = generateSchema(obj);

          const checkType = (s: SchemaObject): boolean => {
            if (!s.type || typeof s.type !== 'string') return false;

            if (s.properties) {
              for (const prop of Object.values(s.properties)) {
                if (!checkType(prop)) return false;
              }
            }

            if (s.items) {
              if (!checkType(s.items)) return false;
            }

            return true;
          };

          return checkType(schema);
        }),
        { numRuns: 1000 }
      );
    });

    it('should maintain type consistency for array items', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          (arr) => {
            const result = parseSchemaFromValue(arr);

            if (arr.length > 0) {
              const itemsSchema = result.schema.items;
              if (!itemsSchema) return false;

              // Items should always have a type
              return typeof itemsSchema.type === 'string';
            }

            return true;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle large objects without performance issues', () => {
      const largeObjectArb = fc.dictionary(
        fc.string(),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        { maxKeys: 100 }
      );

      fc.assert(
        fc.property(largeObjectArb, (obj) => {
          const start = Date.now();
          const schema = generateSchema(obj);
          const duration = Date.now() - start;

          // Should complete in reasonable time (< 1 second)
          return duration < 1000 && schema.type === 'object';
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid schemas for all primitive types', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.double(), fc.boolean(), fc.constant(null)),
          (value) => {
            const result = parseSchemaFromValue(value);

            // Must have a type
            if (!result.schema.type) return false;

            // Type must be valid
            const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
            if (!validTypes.includes(result.schema.type)) return false;

            return true;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });
});
