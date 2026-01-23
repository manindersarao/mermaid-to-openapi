import type { MermaidAST } from '@/types';
import type { Parameter, MultiSpecDocs, SecurityScheme } from '@/types';
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
 * Generates OpenAPI specs from a Mermaid AST
 */
export function generateOpenApiSpecs(ast: MermaidAST): MultiSpecDocs {
  const specs: MultiSpecDocs = {};
  const securitySchemesCache: Record<string, Record<string, SecurityScheme>> = {};

  ast.interactions.forEach((interaction) => {
    const { to: server, method, path: rawPath, body, response, security } = interaction;

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
          securitySchemes: {}
        }
      };
      securitySchemesCache[server] = {};
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
