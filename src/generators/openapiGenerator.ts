import type { MermaidAST } from '@/types';
import type { Parameter, MultiSpecDocs, SecurityScheme, SchemaObject, Operation } from '@/types';
import { generateSchema } from './schemaGenerator';

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
 * Creates a security scheme object from a security string
 */
const createSecurityScheme = (security: string): SecurityScheme | null => {
  // bearerAuth
  if (security === 'bearerAuth') {
    return {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    };
  }

  // basicAuth
  if (security === 'basicAuth') {
    return {
      type: 'http',
      scheme: 'basic'
    };
  }

  // apiKey_header or apiKey_query
  if (security.startsWith('apiKey_')) {
    const location = security.replace('apiKey_', '');
    if (location === 'header' || location === 'query') {
      return {
        type: 'apiKey',
        name: 'X-API-Key',
        in: location
      };
    }
  }

  // oauth2 or oauth2:scopes
  if (security.startsWith('oauth2')) {
    const scopesPart = security.includes(':') ? security.split(':')[1] : '';
    const scopes = scopesPart ? scopesPart.split(',').reduce((acc, scope) => {
      acc[scope] = `${scope} permission`;
      return acc;
    }, {} as Record<string, string>) : undefined;

    return {
      type: 'oauth2',
      flows: {
        implicit: {
          authorizationUrl: 'https://example.com/oauth/authorize',
          scopes
        }
      }
    };
  }

  // openIdConnect
  if (security === 'openIdConnect') {
    return {
      type: 'openIdConnect',
      openIdConnectUrl: 'https://example.com/.well-known/openid-configuration'
    };
  }

  return null;
};

/**
 * Generates a unique schema name from a schema object
 */
const generateSchemaName = (schema: SchemaObject, usedNames: Set<string>): string => {
  if (schema.properties) {
    const propKeys = Object.keys(schema.properties).slice(0, 3).join('');
    if (propKeys) {
      const baseName = propKeys.charAt(0).toUpperCase() + propKeys.slice(1) + 'Schema';
      let counter = 1;
      let name = baseName;
      while (usedNames.has(name)) {
        name = `${baseName}${counter}`;
        counter++;
      }
      return name;
    }
  }
  return 'AnonymousSchema';
};

/**
 * Removes example values from a schema for comparison purposes
 */
const removeExamples = (schema: SchemaObject): SchemaObject => {
  const copy = { ...schema };
  delete copy.example;
  if (copy.properties) {
    copy.properties = Object.fromEntries(
      Object.entries(copy.properties).map(([key, value]) => [key, removeExamples(value)])
    );
  }
  if (copy.items) {
    copy.items = removeExamples(copy.items);
  }
  return copy;
};

/**
 * Checks if two schemas are identical (ignoring example values)
 */
const areSchemasEqual = (schema1: SchemaObject, schema2: SchemaObject): boolean => {
  return JSON.stringify(removeExamples(schema1)) === JSON.stringify(removeExamples(schema2));
};

/**
 * Finds or creates a reusable schema component
 * Extracts to component if the schema is used more than once
 */
const findOrCreateSchemaComponent = (
  schema: SchemaObject,
  components: Record<string, SchemaObject>,
  usedNames: Set<string>,
  schemaUsage: Map<string, number>
): SchemaObject => {
  // Don't extract simple schemas (primitives or arrays of primitives)
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return schema;
  }

  const schemaKey = JSON.stringify(removeExamples(schema));
  const usageCount = schemaUsage.get(schemaKey) || 0;

  // Only extract if used more than once
  if (usageCount <= 1) {
    return schema;
  }

  // Check if we already have an identical schema
  for (const [name, existingSchema] of Object.entries(components)) {
    if (areSchemasEqual(schema, existingSchema)) {
      return { $ref: `#/components/schemas/${name}` };
    }
  }

  // Create new schema component
  const name = generateSchemaName(schema, usedNames);
  usedNames.add(name);
  components[name] = schema;

  return { $ref: `#/components/schemas/${name}` };
};

/**
 * Gets the default media type for a request method
 */
const getDefaultRequestMediaType = (): string => {
  return 'application/json';
};

/**
 * Gets the default media type for a response
 */
const getDefaultResponseMediaType = (): string => {
  return 'application/json';
};

/**
 * Generates OpenAPI specs from a Mermaid AST
 */
export function generateOpenApiSpecs(ast: MermaidAST): MultiSpecDocs {
  const specs: MultiSpecDocs = {};
  const securitySchemesCache: Record<string, Record<string, SecurityScheme>> = {};
  const schemaComponentsCache: Record<string, Record<string, SchemaObject>> = {};
  const usedSchemaNames: Record<string, Set<string>> = {};
  const allTags: Set<string> = new Set();
  const schemaUsage: Record<string, Map<string, number>> = {};

  // First pass: collect all tags and count schema usage
  ast.interactions.forEach((interaction) => {
    if (interaction.tags) {
      interaction.tags.forEach(tag => allTags.add(tag));
    }

    // Count schema usage for component extraction
    const { to: server, body } = interaction;
    if (server && body) {
      try {
        const schema = generateSchema(body as Record<string, unknown>);
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          // Use schema without examples for comparison
          const schemaKey = JSON.stringify(removeExamples(schema));
          if (!schemaUsage[server]) {
            schemaUsage[server] = new Map();
          }
          schemaUsage[server].set(schemaKey, (schemaUsage[server].get(schemaKey) || 0) + 1);
        }
      } catch {
        // Ignore schema generation errors
      }
    }
  });

  ast.interactions.forEach((interaction) => {
    const { to: server, method, path: rawPath, body, response, security, tags, externalDocs, requestMediaType, responseMediaType, operationId, deprecated } = interaction;

    if (!method || !rawPath || !server) {
      return;
    }

    // Initialize spec for this server if not exists
    if (!specs[server]) {
      specs[server] = {
        openapi: '3.0.0',
        info: { title: `${server} API`, version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {},
          schemas: {}
        }
      };
      securitySchemesCache[server] = {};
      schemaComponentsCache[server] = {};
      usedSchemaNames[server] = new Set();
    }

    // Initialize tags in spec
    if (allTags.size > 0 && !specs[server].tags) {
      specs[server].tags = Array.from(allTags).map(tag => ({ name: tag }));
    }

    // Parse path and extract parameters
    const { cleanPath, parameters } = extractParameters(rawPath);
    const normalizedMethod = method.toLowerCase();

    // Initialize path structure if not exists
    if (!specs[server].paths[cleanPath]) {
      specs[server].paths[cleanPath] = {};
    }

    // Create operation with documentation features
    const operation: Operation = {
      summary: interaction.summary || `Operation for ${cleanPath}`,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses: {}
    };

    // Add description if present
    if (interaction.description) {
      operation.description = interaction.description;
    }

    // Add tags if present
    if (tags && tags.length > 0) {
      operation.tags = tags;
    }

    // Add operationId if present
    if (operationId) {
      operation.operationId = operationId;
    }

    // Add deprecated flag if present
    if (deprecated !== undefined) {
      operation.deprecated = deprecated;
    }

    // Add external docs if present
    if (externalDocs) {
      operation.externalDocs = externalDocs;
    }

    specs[server].paths[cleanPath][normalizedMethod] = operation;

    // Add security to operation
    if (security && security.length > 0) {
      const operationSecurity: Record<string, string[]>[] = [];

      security.forEach(sec => {
        const scheme = createSecurityScheme(sec);
        if (scheme) {
          // Add scheme to components if not already added
          if (!securitySchemesCache[server][sec]) {
            securitySchemesCache[server][sec] = scheme;
            specs[server].components!.securitySchemes![sec] = scheme;
          }

          // Add security reference to operation
          // Handle scopes for oauth2
          if (sec.startsWith('oauth2:')) {
            const scopes = sec.split(':')[1].split(',');
            operationSecurity.push({ [sec]: scopes });
          } else {
            operationSecurity.push({ [sec]: [] });
          }
        }
      });

      if (operationSecurity.length > 0) {
        specs[server].paths[cleanPath][normalizedMethod].security = operationSecurity;
      }
    }

    // Add response if present
    if (response) {
      const status = response.status || '200';
      const description = response.description || 'Response description';

      // Determine response media type
      const responseType = responseMediaType || getDefaultResponseMediaType();

      specs[server].paths[cleanPath][normalizedMethod].responses[status] = {
        description,
        content: {
          [responseType]: { schema: { type: 'object', example: {} } }
        }
      };

      // Add response body if present (body applies to response for GET requests)
      if (body && !['post', 'put', 'patch'].includes(normalizedMethod)) {
        try {
          const schema = generateSchema(body as Record<string, unknown>);
          // Try to find or create a reusable schema component
          const processedSchema = findOrCreateSchemaComponent(
            schema,
            schemaComponentsCache[server],
            usedSchemaNames[server],
            schemaUsage[server] || new Map()
          );
          specs[server].paths[cleanPath][normalizedMethod].responses[status].content![responseType].schema = processedSchema;
        } catch {
          // If body parsing fails, keep default empty schema
        }
      }
    }

    // Add request body if present (only for POST, PUT, PATCH)
    if (body && ['post', 'put', 'patch'].includes(normalizedMethod)) {
      try {
        const schema = generateSchema(body as Record<string, unknown>);
        // Try to find or create a reusable schema component
        const processedSchema = findOrCreateSchemaComponent(
          schema,
          schemaComponentsCache[server],
          usedSchemaNames[server],
          schemaUsage[server] || new Map()
        );

        // Determine request media type
        const requestType = requestMediaType || getDefaultRequestMediaType();

        specs[server].paths[cleanPath][normalizedMethod].requestBody = {
          content: {
            [requestType]: { schema: processedSchema }
          },
          required: true
        };
      } catch {
        // If body parsing fails, skip request body
      }
    }
  });

  // Copy schema components from cache to specs
  Object.keys(specs).forEach(server => {
    const spec = specs[server];
    if (spec.components && schemaComponentsCache[server]) {
      spec.components.schemas = schemaComponentsCache[server];
    }
  });

  // Clean up empty components
  Object.keys(specs).forEach(server => {
    const spec = specs[server];
    if (spec.components) {
      // Remove schemas if empty
      if (!spec.components.schemas || Object.keys(spec.components.schemas).length === 0) {
        delete spec.components.schemas;
      }
      // Remove securitySchemes if empty
      if (!spec.components.securitySchemes || Object.keys(spec.components.securitySchemes).length === 0) {
        delete spec.components.securitySchemes;
      }
      // Remove components entirely if both are empty
      if (!spec.components.schemas && !spec.components.securitySchemes) {
        delete spec.components;
      }
    }
  });

  return specs;
}
