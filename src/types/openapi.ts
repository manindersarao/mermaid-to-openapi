export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  example?: unknown;
  items?: SchemaObject;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
  $ref?: string;
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'header' | 'query';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: SchemaObject;
}

export interface MediaType {
  schema?: SchemaObject;
  example?: unknown;
  examples?: Record<string, unknown>;
}

export interface ResponseContent {
  description: string;
  content?: Record<string, MediaType>;
}

export interface RequestBody {
  content?: Record<string, MediaType>;
  required?: boolean;
  description?: string;
}

export interface Operation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ResponseContent>;
  security?: Record<string, string[]>[];
  externalDocs?: ExternalDocumentation;
  deprecated?: boolean;
  operationId?: string;
}

export interface ExternalDocumentation {
  url?: string;
  description?: string;
}

export interface PathItem {
  [method: string]: Operation;
}

export interface OpenApiDoc {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    securitySchemes?: Record<string, SecurityScheme>;
    schemas?: Record<string, SchemaObject>;
    responses?: Record<string, ResponseContent>;
    parameters?: Record<string, Parameter>;
    examples?: Record<string, unknown>;
    requestBodies?: Record<string, RequestBody>;
  };
  tags?: Tag[];
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
}

export type MultiSpecDocs = Record<string, OpenApiDoc>;
