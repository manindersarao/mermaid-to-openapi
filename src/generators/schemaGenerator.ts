import type { SchemaObject } from '@/types';

/**
 * Parses schema from a value, handling explicit validation strings and auto-inference
 */
export const parseSchemaFromValue = (value: unknown): { schema: SchemaObject; isRequired: boolean } => {
  const schema: SchemaObject = { type: 'string' };
  let isRequired = false;

  // 1. Handle Explicit Validation Strings
  if (typeof value === 'string') {
    const parts = value.split(',').map(s => s.trim());
    const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object'];

    const explicitType = validTypes.includes(parts[0]) ? parts[0] : null;
    const isDefinition = explicitType || parts.some(p => p === 'required' || p.includes(':'));

    if (isDefinition) {
      schema.type = explicitType || 'string';
      parts.forEach(part => {
        if (part === 'required') isRequired = true;
        else if (part.startsWith('min:')) {
          const val = Number(part.split(':')[1]);
          if (schema.type === 'string') schema.minLength = val;
          else schema.minimum = val;
        }
        else if (part.startsWith('max:')) {
          const val = Number(part.split(':')[1]);
          if (schema.type === 'string') schema.maxLength = val;
          else schema.maximum = val;
        }
        else if (part.startsWith('format:')) {
          schema.format = part.split(':')[1];
        }
        else if (part.startsWith('example:')) {
          schema.example = part.split(':')[1];
        }
      });
      return { schema, isRequired };
    }
  }

  // 2. Auto-Inference
  if (value === null) {
    schema.type = 'string';
  } else if (typeof value === 'number') {
    schema.type = Number.isInteger(value) ? 'integer' : 'number';
    schema.example = value;
  } else if (typeof value === 'boolean') {
    schema.type = 'boolean';
    schema.example = value;
  } else if (Array.isArray(value)) {
    schema.type = 'array';
    if (value.length > 0) {
      const firstItem = value[0];
      if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
        // For array of objects, recursively generate schema
        schema.items = generateSchema(firstItem as Record<string, unknown>);
      } else {
        schema.items = parseSchemaFromValue(firstItem).schema;
      }
    } else {
      schema.items = { type: 'string' };
    }
    schema.example = value;
  } else if (typeof value === 'object') {
    schema.type = 'object';
  } else {
    schema.type = 'string';
    schema.example = value;
  }

  return { schema, isRequired };
};

/**
 * Generates a schema object from a JSON object
 */
export const generateSchema = (jsonObj: Record<string, unknown>): SchemaObject => {
  const properties: Record<string, SchemaObject> = {};
  const requiredFields: string[] = [];

  for (const [key, value] of Object.entries(jsonObj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      properties[key] = generateSchema(value as Record<string, unknown>);
    } else {
      const { schema, isRequired } = parseSchemaFromValue(value);
      properties[key] = schema;
      if (isRequired) requiredFields.push(key);
    }
  }

  const result: SchemaObject = {
    type: 'object',
    properties
  };

  if (requiredFields.length > 0) {
    result.required = requiredFields;
  }

  return result;
};
