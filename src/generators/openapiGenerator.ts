import type { MermaidAST } from '@/types';
import type { Parameter, MultiSpecDocs } from '@/types';
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
        } catch {
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
      } catch {
        // If body parsing fails, skip request body
      }
    }
  });

  return specs;
}
