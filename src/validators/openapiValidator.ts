import type { OpenApiDoc, MultiSpecDocs } from '@/types/openapi';
import type { ValidationError, ValidationResult } from '@/types/validation';

// Valid HTTP methods according to OpenAPI 3.0 specification
const VALID_HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
]);

// Valid parameter locations
const VALID_PARAMETER_LOCATIONS = new Set(['path', 'query', 'header', 'cookie']);

/**
 * Validates an OpenAPI specification for compliance with OpenAPI 3.0.0.
 * This is a post-generation validation step that ensures the generated spec is valid.
 *
 * @param spec - The OpenAPI specification to validate
 * @returns ValidationResult containing validation status and any errors/warnings
 */
export function validateOpenApiSpec(spec: OpenApiDoc): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for null/undefined
  if (!spec || typeof spec !== 'object') {
    errors.push({
      source: 'openapi',
      severity: 'error',
      message: 'OpenAPI spec is null or undefined',
      suggestion: 'Provide a valid OpenAPI specification object',
    });
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  // Validate required top-level fields
  const requiredFieldsErrors = validateRequiredFields(spec);
  errors.push(...requiredFieldsErrors);

  // Validate OpenAPI version
  const versionErrors = validateOpenApiVersion(spec);
  errors.push(...versionErrors);

  // Validate paths if present
  if (spec.paths && typeof spec.paths === 'object') {
    const pathsErrors = validatePaths(spec);
    errors.push(...pathsErrors);
    const pathsWarnings = validatePathParameters(spec);
    warnings.push(...pathsWarnings);
  }

  // Validate components if present
  if (spec.components && typeof spec.components === 'object') {
    const circularRefErrors = validateCircularReferences(spec);
    errors.push(...circularRefErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates multiple OpenAPI specifications (multi-spec mode).
 * Validates each spec individually and checks for cross-spec issues.
 *
 * @param specs - Object mapping service names to OpenAPI specs
 * @returns ValidationResult containing validation status and any errors/warnings
 */
export function validateOpenApiSpecs(specs: MultiSpecDocs): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const operationIds = new Map<string, string>(); // operationId -> serviceName

  // Validate each spec individually
  for (const [serviceName, spec] of Object.entries(specs)) {
    const result = validateOpenApiSpec(spec);

    // Add context to errors
    result.errors.forEach((error) => {
      errors.push({
        ...error,
        context: error.context ? `${serviceName}: ${error.context}` : serviceName,
      });
    });

    result.warnings.forEach((warning) => {
      warnings.push({
        ...warning,
        context: warning.context ? `${serviceName}: ${warning.context}` : serviceName,
      });
    });

    // Check for operations and operation IDs
    if (spec.paths) {
      let hasOperations = false;
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (pathItem && typeof pathItem === 'object') {
          const methods = Object.keys(pathItem).filter((key) => VALID_HTTP_METHODS.has(key));
          if (methods.length > 0) {
            hasOperations = true;

            // Collect operation IDs for duplicate detection
            methods.forEach((method) => {
              const operation = pathItem[method as keyof typeof pathItem];
              if (operation && typeof operation === 'object') {
                const operationRecord = operation as Record<string, unknown>;
                if ('operationId' in operationRecord && typeof operationRecord.operationId === 'string') {
                  const opId = operationRecord.operationId;
                  if (opId) {
                    if (operationIds.has(opId)) {
                      errors.push({
                        source: 'openapi',
                        severity: 'error',
                        message: `Duplicate operationId "${opId}" found in multiple services`,
                        context: `${serviceName} and ${operationIds.get(opId)}`,
                        suggestion: 'Operation IDs must be unique across all services',
                      });
                    }
                    operationIds.set(opId, serviceName);
                  }
                }
              }
            });
          }
        }
      }

      if (!hasOperations) {
        warnings.push({
          source: 'openapi',
          severity: 'warning',
          message: `Service "${serviceName}" has no operations defined`,
          context: serviceName,
          suggestion: 'Add at least one operation to the service',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that all required top-level fields are present.
 */
function validateRequiredFields(spec: OpenApiDoc): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!spec.openapi) {
    errors.push({
      source: 'openapi',
      severity: 'error',
      message: 'Missing required field: "openapi"',
      suggestion: 'Add the "openapi" field with version "3.0.0" or higher',
    });
  }

  if (!spec.info) {
    errors.push({
      source: 'openapi',
      severity: 'error',
      message: 'Missing required field: "info"',
      suggestion: 'Add an "info" object with title and version',
    });
  } else {
    if (!spec.info.title) {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: 'Missing required field: "info.title"',
        suggestion: 'Add a title to the info object',
      });
    }
    if (!spec.info.version) {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: 'Missing required field: "info.version"',
        suggestion: 'Add a version to the info object',
      });
    }
  }

  if (!spec.paths) {
    errors.push({
      source: 'openapi',
      severity: 'error',
      message: 'Missing required field: "paths"',
      suggestion: 'Add a "paths" object defining your API endpoints',
    });
  }

  return errors;
}

/**
 * Validates the OpenAPI version string.
 */
function validateOpenApiVersion(spec: OpenApiDoc): ValidationError[] {
  const errors: ValidationError[] = [];

  if (spec.openapi) {
    const version = spec.openapi;
    if (typeof version !== 'string') {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: 'Invalid "openapi" field type',
        context: typeof version,
        suggestion: 'The "openapi" field must be a string',
      });
    } else if (!version.startsWith('3.')) {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: `Unsupported OpenAPI version: "${version}"`,
        suggestion: 'Use OpenAPI 3.0.x (e.g., "3.0.0")',
      });
    }
  }

  return errors;
}

/**
 * Validates all paths and their operations.
 */
function validatePaths(spec: OpenApiDoc): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    // Validate each HTTP method in the path
    for (const [method, operation] of Object.entries(pathItem)) {
      // Skip non-operation properties
      if (!VALID_HTTP_METHODS.has(method)) {
        // Check if it might be a path extension like $ref
        if (method !== '$ref' && method !== 'summary' && method !== 'description' &&
            method !== 'parameters' && method !== 'servers') {
          errors.push({
            source: 'openapi',
            severity: 'error',
            message: `Invalid HTTP method: "${method}"`,
            context: path,
            suggestion: `Use one of: ${Array.from(VALID_HTTP_METHODS).join(', ')}`,
          });
        }
        continue;
      }

      if (!operation || typeof operation !== 'object') {
        continue;
      }

      // Validate responses
      if ('responses' in operation && operation.responses) {
        const responseErrors = validateResponses(operation.responses, path, method, spec);
        errors.push(...responseErrors);
      } else {
        errors.push({
          source: 'openapi',
          severity: 'error',
          message: 'Operation missing "responses" field',
          context: `${path} (${method})`,
          suggestion: 'Add a "responses" object with at least one response',
        });
      }

      // Validate request body if present
      if ('requestBody' in operation && operation.requestBody) {
        const bodyErrors = validateRequestBody(operation.requestBody, path, method, spec);
        errors.push(...bodyErrors);
      }

      // Validate parameters if present
      if ('parameters' in operation && operation.parameters) {
        const paramErrors = validateParameters(operation.parameters, path, method);
        errors.push(...paramErrors);
      }
    }
  }

  return errors;
}

/**
 * Validates response objects.
 */
function validateResponses(
  responses: Record<string, unknown>,
  path: string,
  method: string,
  spec: OpenApiDoc
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response || typeof response !== 'object') {
      continue;
    }

    // Validate status code format
    if (!/^\d{3}$/.test(statusCode) && statusCode !== 'default') {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: `Invalid status code: "${statusCode}"`,
        context: `${path} (${method})`,
        suggestion: 'Use a valid 3-digit status code (100-599) or "default"',
      });
    } else if (/^\d{3}$/.test(statusCode)) {
      const code = parseInt(statusCode, 10);
      if (code < 100 || code > 599) {
        errors.push({
          source: 'openapi',
          severity: 'error',
          message: `Invalid status code: "${statusCode}" (must be between 100-599)`,
          context: `${path} (${method})`,
        });
      }
    }

    // Check for content field
    if ('content' in response && response.content) {
      const contentErrors = validateMediaTypes(response.content, path, method, statusCode, spec);
      errors.push(...contentErrors);
    } else {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: 'Response missing "content" field',
        context: `${path} (${method}) - ${statusCode}`,
        suggestion: 'Add a "content" object with at least one media type',
      });
    }
  }

  return errors;
}

/**
 * Validates request body object.
 */
function validateRequestBody(
  requestBody: Record<string, unknown>,
  path: string,
  method: string,
  spec: OpenApiDoc
): ValidationError[] {
  const errors: ValidationError[] = [];

  if ('content' in requestBody && requestBody.content) {
    const contentErrors = validateMediaTypes(requestBody.content, path, method, 'request body', spec);
    errors.push(...contentErrors);
  } else {
    errors.push({
      source: 'openapi',
      severity: 'error',
      message: 'Request body missing "content" field',
      context: `${path} (${method})`,
      suggestion: 'Add a "content" object with at least one media type',
    });
  }

  return errors;
}

/**
 * Validates media type objects (for requests and responses).
 */
function validateMediaTypes(
  content: Record<string, unknown>,
  path: string,
  method: string,
  context: string,
  spec: OpenApiDoc
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [mediaType, mediaTypeObject] of Object.entries(content)) {
    if (!mediaTypeObject || typeof mediaTypeObject !== 'object') {
      continue;
    }

    // Check for schema field
    if (!('schema' in mediaTypeObject) || !mediaTypeObject.schema) {
      errors.push({
        source: 'openapi',
        severity: 'error',
        message: `Media type "${mediaType}" missing "schema" field`,
        context: `${path} (${method}) - ${context}`,
        suggestion: 'Add a "schema" object defining the data structure',
      });
    } else {
      // Validate references within the schema
      const refErrors = validateReferences(mediaTypeObject.schema, path, method, context, spec);
      errors.push(...refErrors);
    }
  }

  return errors;
}

/**
 * Validates parameter objects.
 */
function validateParameters(
  parameters: unknown,
  path: string,
  method: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(parameters)) {
    errors.push({
      source: 'openapi',
      severity: 'error',
      message: 'Parameters must be an array',
      context: `${path} (${method})`,
      suggestion: 'Convert parameters to an array',
    });
    return errors;
  }

  for (const param of parameters) {
    if (!param || typeof param !== 'object') {
      continue;
    }

    // Validate parameter location
    if ('in' in param && param.in) {
      const location = param.in as string;
      if (!VALID_PARAMETER_LOCATIONS.has(location)) {
        errors.push({
          source: 'openapi',
          severity: 'error',
          message: `Invalid parameter location: "${location}"`,
          context: `${path} (${method})`,
          suggestion: `Use one of: ${Array.from(VALID_PARAMETER_LOCATIONS).join(', ')}`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validates path parameters are correctly marked as required.
 */
function validatePathParameters(spec: OpenApiDoc): ValidationError[] {
  const warnings: ValidationError[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!VALID_HTTP_METHODS.has(method)) {
        continue;
      }

      if (!operation || typeof operation !== 'object') {
        continue;
      }

      // Check parameters defined in the operation
      const operationRecord = operation as Record<string, unknown>;
      if ('parameters' in operationRecord && Array.isArray(operationRecord.parameters)) {
        for (const param of operationRecord.parameters) {
          if (!param || typeof param !== 'object') {
            continue;
          }

          // Access properties with type guards
          const paramRecord = param as Record<string, unknown>;
          const paramIn = 'in' in paramRecord ? paramRecord.in : undefined;
          const paramRequired = 'required' in paramRecord ? paramRecord.required : undefined;
          const paramName = 'name' in paramRecord ? paramRecord.name : undefined;

          if (paramIn === 'path' && paramRequired === false && typeof paramName === 'string') {
            warnings.push({
              source: 'openapi',
              severity: 'warning',
              message: `Path parameter "${paramName}" is not marked as required`,
              context: `${path} (${method})`,
              suggestion: 'Path parameters must be marked as required: true',
            });
          }
        }
      }
    }
  }

  return warnings;
}

/**
 * Validates that all $ref references point to valid locations.
 */
function validateReferences(
  schema: unknown,
  path: string,
  method: string,
  context: string,
  spec: OpenApiDoc
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build a set of all valid reference paths
  const validRefs = new Set<string>();

  if (spec.components?.schemas) {
    Object.keys(spec.components.schemas).forEach((key) => {
      validRefs.add(`#/components/schemas/${key}`);
    });
  }

  if (spec.paths) {
    Object.keys(spec.paths).forEach((key) => {
      validRefs.add(`#/paths/${key}`);
    });
  }

  function traverse(obj: unknown, visited = new Set<unknown>()): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Detect circular references during traversal
    if (visited.has(obj)) {
      return;
    }
    visited.add(obj);

    if ('$ref' in obj && typeof obj.$ref === 'string') {
      const ref = obj.$ref;
      // Validate reference format
      if (!ref.startsWith('#/')) {
        errors.push({
          source: 'openapi',
          severity: 'error',
          message: `Invalid reference format: "${ref}"`,
          context: `${path} (${method}) - ${context}`,
          suggestion: 'References should start with "#/" for JSON Pointers',
        });
      } else if (!validRefs.has(ref)) {
        errors.push({
          source: 'openapi',
          severity: 'error',
          message: `Invalid reference: "${ref}" does not exist`,
          context: `${path} (${method}) - ${context}`,
          suggestion: 'Ensure the referenced component is defined',
        });
      }
    } else {
      // Recursively traverse all properties
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          traverse(value, visited);
        }
      }
    }
  }

  traverse(schema);
  return errors;
}

/**
 * Validates that there are no circular references in the schema.
 * Note: Direct self-references for recursive structures are allowed and don't generate errors.
 */
function validateCircularReferences(spec: OpenApiDoc): ValidationError[] {
  const errors: ValidationError[] = [];

  // Collect all component schemas that can be referenced
  const componentSchemas = new Map<string, unknown>();
  if (spec.components?.schemas) {
    for (const [key, schema] of Object.entries(spec.components.schemas)) {
      componentSchemas.set(`#/components/schemas/${key}`, schema);
    }
  }

  // Track references during traversal
  const detectCycles = (
    obj: unknown,
    refChain: string[] = [],
    visited = new Set<unknown>()
  ): void => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Detect circular references during traversal
    if (visited.has(obj)) {
      return;
    }
    visited.add(obj);

    if ('$ref' in obj && typeof obj.$ref === 'string') {
      const ref = obj.$ref;

      // Check if this reference is already in the chain (circular reference)
      // But allow direct self-references (refChain has 0 or 1 element and it's the same ref)
      if (refChain.includes(ref)) {
        // Only report error if it's a multi-level cycle (not a direct self-reference)
        if (refChain.length > 1 || refChain[0] !== ref) {
          const cycle = [...refChain, ref].join(' -> ');
          errors.push({
            source: 'openapi',
            severity: 'error',
            message: `Circular reference detected: ${cycle}`,
            context: ref,
            suggestion: 'Restructure your schema to avoid circular dependencies',
          });
        }
        return;
      }

      // Continue traversal through the referenced component if it exists
      const referencedSchema = componentSchemas.get(ref);
      if (referencedSchema) {
        detectCycles(referencedSchema, [...refChain, ref], new Set());
      }
    } else {
      // Recursively traverse all properties
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          detectCycles(value, refChain, visited);
        }
      }
    }
  };

  // Start traversal from paths
  if (spec.paths) {
    for (const pathItem of Object.values(spec.paths)) {
      if (pathItem && typeof pathItem === 'object') {
        detectCycles(pathItem);
      }
    }
  }

  // Also traverse components themselves
  if (spec.components?.schemas) {
    for (const schema of Object.values(spec.components.schemas)) {
      if (schema && typeof schema === 'object') {
        detectCycles(schema);
      }
    }
  }

  return errors;
}
