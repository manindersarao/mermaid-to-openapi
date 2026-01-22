import type { MermaidAST } from '@/types';
import type { SchemaObject, Parameter, MultiSpecDocs } from '@/types';

/**
 * Parses schema from a value, handling explicit validation strings and auto-inference
 */
const parseSchemaFromValue = (value: unknown): { schema: SchemaObject; isRequired: boolean } => {
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
const generateSchema = (jsonObj: Record<string, unknown>): SchemaObject => {
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

/**
 * Extracts parameters from a path (query and path parameters)
 */
const extractParameters = (path: string): { cleanPath: string; parameters: Parameter[] } => {
  const parameters: Parameter[] = [];
  let cleanPath = path;

  // Extract query parameters
  if (cleanPath.includes('?')) {
    const [pathPart, queryPart] = cleanPath.split('?');
    cleanPath = pathPart;
    if (queryPart) {
      const pairs = queryPart.split('&');
      pairs.forEach(pair => {
        const [key, val] = pair.split('=');
        if (key) {
          parameters.push({
            name: key,
            in: 'query',
            schema: { type: 'string', example: val || '' }
          });
        }
      });
    }
  }

  // Extract path parameters
  const paramMatches = cleanPath.match(/\{([^}]+)\}/g);
  if (paramMatches) {
    paramMatches.forEach(p => {
      const name = p.replace(/[{}]/g, '');
      parameters.push({
        name: name,
        in: 'path',
        required: true,
        schema: { type: 'string' }
      });
    });
  }

  return { cleanPath, parameters };
};

/**
 * Generates OpenAPI specs from a Mermaid AST
 */
export function generateOpenApiSpecs(ast: MermaidAST): MultiSpecDocs {
  const specs: MultiSpecDocs = {};

  ast.interactions.forEach((interaction) => {
    const { to: server, method, path: rawPath, body, response } = interaction;

    if (!method || !rawPath || !server) {
      return;
    }

    // Initialize spec for this server if not exists
    if (!specs[server]) {
      specs[server] = {
        openapi: '3.0.0',
        info: { title: `${server} API`, version: '1.0.0' },
        paths: {}
      };
    }

    // Parse path and extract parameters
    const { cleanPath, parameters } = extractParameters(rawPath);
    const normalizedMethod = method.toLowerCase();

    // Initialize path structure if not exists
    if (!specs[server].paths[cleanPath]) {
      specs[server].paths[cleanPath] = {};
    }

    // Create operation
    const summary = interaction.summary || `Operation for ${cleanPath}`;

    specs[server].paths[cleanPath][normalizedMethod] = {
      summary,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses: {}
    };

    // Add response if present
    if (response) {
      const status = response.status || '200';
      const description = response.description || 'Response description';

      specs[server].paths[cleanPath][normalizedMethod].responses[status] = {
        description,
        content: { 'application/json': { schema: { type: 'object', example: {} } } }
      };

      // Add response body if present (body applies to response for GET requests)
      if (body && !['post', 'put', 'patch'].includes(normalizedMethod)) {
        try {
          const schema = generateSchema(body as Record<string, unknown>);
          specs[server].paths[cleanPath][normalizedMethod].responses[status].content['application/json'].schema = schema;
        } catch (e) {
          // If body parsing fails, keep default empty schema
        }
      }
    }

    // Add request body if present (only for POST, PUT, PATCH)
    if (body && ['post', 'put', 'patch'].includes(normalizedMethod)) {
      try {
        const schema = generateSchema(body as Record<string, unknown>);
        specs[server].paths[cleanPath][normalizedMethod].requestBody = {
          content: { 'application/json': { schema } },
          required: true
        };
      } catch (e) {
        // If body parsing fails, skip request body
      }
    }
  });

  return specs;
}
