import { describe, it, expect } from 'vitest';
import { toYaml } from '@/generators/yamlFormatter';

describe('yamlFormatter', () => {
  describe('toYaml', () => {
    it('should handle primitive values', () => {
      expect(toYaml('string')).toBe('"string"\n');
      expect(toYaml(42)).toBe('42\n');
      expect(toYaml(3.14)).toBe('3.14\n');
      expect(toYaml(true)).toBe('true\n');
      expect(toYaml(false)).toBe('false\n');
      expect(toYaml(null)).toBe('null\n');
    });

    it('should handle simple key-value pairs', () => {
      const result = toYaml({ name: 'test', count: 42 });
      expect(result).toContain('name: "test"');
      expect(result).toContain('count: 42');
    });

    it('should handle nested objects', () => {
      const result = toYaml({
        user: {
          name: 'John',
          age: 30
        }
      });
      expect(result).toBe('user:\n  name: "John"\n  age: 30\n');
    });

    it('should handle arrays of primitives', () => {
      const result = toYaml({
        items: ['a', 'b', 'c']
      });
      expect(result).toContain('items:');
      expect(result).toContain('  - a');
      expect(result).toContain('  - b');
      expect(result).toContain('  - c');
    });

    it('should handle arrays of numbers', () => {
      const result = toYaml({
        numbers: [1, 2, 3]
      });
      expect(result).toContain('numbers:');
      expect(result).toContain('  - 1');
      expect(result).toContain('  - 2');
      expect(result).toContain('  - 3');
    });

    it('should handle arrays of objects', () => {
      const result = toYaml({
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ]
      });
      expect(result).toContain('users:');
      expect(result).toContain('  - id: 1');
      expect(result).toContain('    name: "John"');
      expect(result).toContain('  - id: 2');
      expect(result).toContain('    name: "Jane"');
    });

    it('should handle empty objects', () => {
      const result = toYaml({ empty: {} });
      expect(result).toContain('empty: {}');
    });

    it('should skip undefined values', () => {
      const result = toYaml({
        name: 'test',
        undefined: undefined,
        count: 42
      });
      expect(result).toContain('name: "test"');
      expect(result).toContain('count: 42');
      expect(result).not.toContain('undefined:');
    });

    it('should handle deeply nested objects', () => {
      const result = toYaml({
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      });
      expect(result).toContain('level1:');
      expect(result).toContain('  level2:');
      expect(result).toContain('    level3:');
      expect(result).toContain('      value: "deep"');
    });

    it('should handle mixed content', () => {
      const result = toYaml({
        name: 'Test API',
        version: '1.0.0',
        info: {
          title: 'Test',
          description: 'A test API'
        },
        servers: [
          { url: 'https://api.example.com' },
          { url: 'https://api2.example.com' }
        ],
        tags: ['api', 'test']
      });

      expect(result).toContain('name: "Test API"');
      expect(result).toContain('version: "1.0.0"');
      expect(result).toContain('info:');
      expect(result).toContain('  title: "Test"');
      expect(result).toContain('  description: "A test API"');
      expect(result).toContain('servers:');
      expect(result).toContain('  - url: "https://api.example.com"');
      expect(result).toContain('  - url: "https://api2.example.com"');
      expect(result).toContain('tags:');
      expect(result).toContain('  - api');
      expect(result).toContain('  - test');
    });

    it('should handle boolean values', () => {
      const result = toYaml({
        active: true,
        deleted: false
      });
      expect(result).toContain('active: true');
      expect(result).toContain('deleted: false');
    });

    it('should handle null values', () => {
      const result = toYaml({
        value: null
      });
      expect(result).toContain('value: null');
    });

    it('should handle empty arrays', () => {
      const result = toYaml({
        items: []
      });
      expect(result).toContain('items:');
    });

    it('should properly format OpenAPI-like structure', () => {
      const openApiDoc = {
        openapi: '3.0.0',
        info: {
          title: 'Sample API',
          version: '1.0.0'
        },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const result = toYaml(openApiDoc);

      expect(result).toContain('openapi: "3.0.0"');
      expect(result).toContain('info:');
      expect(result).toContain('  title: "Sample API"');
      expect(result).toContain('  version: "1.0.0"');
      expect(result).toContain('paths:');
      expect(result).toContain('  /users:');
      expect(result).toContain('    get:');
      expect(result).toContain('      summary: "List users"');
      expect(result).toContain('      responses:');
      expect(result).toContain('        200:');
      expect(result).toContain('          description: "Success"');
    });

    it('should handle indentation correctly for nested structures', () => {
      const result = toYaml({
        level1: {
          level2: {
            level3: {
              array: [
                { item: 'a' },
                { item: 'b' }
              ]
            }
          }
        }
      });

      const lines = result.split('\n');
      // Check that indentation increases correctly
      const level1Line = lines.find(l => l.includes('level1:'));
      const level2Line = lines.find(l => l.trim().startsWith('level2:'));
      const level3Line = lines.find(l => l.trim().startsWith('level3:'));

      expect(level1Line).toMatch(/^level1:/);
      expect(level2Line).toMatch(/^  level2:/);
      expect(level3Line).toMatch(/^    level3:/);
    });

    it('should handle special string characters with proper escaping', () => {
      const result = toYaml({
        message: 'Hello "World"',
        path: 'C:\\Users\\test'
      });
      expect(result).toContain('message: "Hello \\"World\\""');
      expect(result).toContain('path: "C:\\\\Users\\\\test"');
    });

    it('should handle zero and negative numbers', () => {
      const result = toYaml({
        zero: 0,
        negative: -42,
        float: 0.5
      });
      expect(result).toContain('zero: 0');
      expect(result).toContain('negative: -42');
      expect(result).toContain('float: 0.5');
    });

    it('should indent at specified level', () => {
      const result = toYaml({ nested: { value: 'test' } }, 2);
      const lines = result.split('\n');
      expect(lines[0]).toBe('    nested:');
      expect(lines[1]).toBe('      value: "test"');
    });

    it('should handle arrays with null values', () => {
      const result = toYaml({
        items: [1, null, 3]
      });
      expect(result).toContain('items:');
      expect(result).toContain('  - 1');
      expect(result).toContain('  - null');
      expect(result).toContain('  - 3');
    });

    it('should handle arrays with mixed types', () => {
      const result = toYaml({
        mixed: ['string', 42, true, null, { key: 'value' }]
      });
      expect(result).toContain('mixed:');
      expect(result).toContain('  - string');
      expect(result).toContain('  - 42');
      expect(result).toContain('  - true');
      expect(result).toContain('  - null');
      expect(result).toContain('  - key: "value"');
    });
  });
});
