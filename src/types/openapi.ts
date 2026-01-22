export interface SchemaObject {
  type: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  example?: any;
  items?: SchemaObject;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
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
}

export type MultiSpecDocs = Record<string, OpenApiDoc>;
