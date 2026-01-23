export interface SchemaObject {
  type: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  example?: unknown;
  items?: SchemaObject;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
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
  schema: SchemaObject;
}

export interface ResponseContent {
  description: string;
  content: {
    "application/json": MediaType;
  };
}

export interface RequestBody {
  content: {
    "application/json": MediaType;
  };
  required?: boolean;
}

export interface Operation {
  summary: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ResponseContent>;
  security?: Record<string, string[]>[];
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
  };
}

export type MultiSpecDocs = Record<string, OpenApiDoc>;
