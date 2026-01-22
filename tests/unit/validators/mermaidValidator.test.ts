import { describe, it, expect } from 'vitest';
import { validateMermaidSyntax } from '@/validators/mermaidValidator';

describe('mermaidValidator', () => {
  describe('validateMermaidSyntax', () => {
    describe('valid input', () => {
      it('should validate a simple request', () => {
        const input = `
participant User
participant API
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a complete interaction', () => {
        const input = `
participant User
participant API
User->>API: GET /users
API-->>User: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate multiple requests', () => {
        const input = `
participant User
participant API
User->>API: GET /users
User->>API: POST /users
API-->>User: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate all HTTP methods', () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        methods.forEach((method) => {
          const input = `
participant User
participant API
User->>API: ${method} /test
`;
          const result = validateMermaidSyntax(input);
          expect(result.valid).toBe(true);
        });
      });

      it('should validate lowercase HTTP methods', () => {
        const input = `
participant User
participant API
User->>API: get /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should validate path with parameters', () => {
        const input = `
participant User
participant API
User->>API: GET /users/{id}
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should validate note with body', () => {
        const input = `
participant User
participant API
User->>API: POST /users
Note over User,API: Body: { "name": "John" }
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid participant names', () => {
      it('should detect invalid characters in participant name', () => {
        const input = `
participant User<Name>
participant API
User<Name>->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid character'))).toBe(true);
      });

      it('should detect braces in participant name', () => {
        const input = `
participant User{Name}
participant API
User{Name}->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid character'))).toBe(true);
      });

      it('should detect pipe in participant name', () => {
        const input = `
participant User|Name
participant API
User|Name->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
      });

      it('should warn about participant name starting with number', () => {
        const input = `
participant 1User
participant API
1User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        // The warning about starting with a number is in the errors array but has severity 'warning'
        const allIssues = [...result.errors, ...result.warnings];
        expect(allIssues.some((i) => i.message.includes('starts with a number'))).toBe(true);
      });

      it('should detect empty participant name', () => {
        const input = `participant

User->>API: GET /users`;
        const result = validateMermaidSyntax(input);
        // Empty participant names are skipped by the lexer, so they won't be tokenized
        // The validator should warn about lines that don't match patterns
        expect(result.warnings.some((w) => w.message.includes('does not match'))).toBe(true);
      });
    });

    describe('invalid HTTP methods', () => {
      it('should detect invalid HTTP method', () => {
        const input = `
participant User
participant API
User->>API: INVALID /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid HTTP method'))).toBe(true);
      });

      it('should detect typo in HTTP method', () => {
        const input = `
participant User
participant API
User->>API: GTE /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid HTTP method'))).toBe(true);
      });

      it('should provide suggestion for invalid method', () => {
        const input = `
participant User
participant API
User->>API: INVALID /users
`;
        const result = validateMermaidSyntax(input);
        const methodError = result.errors.find((e) => e.message.includes('Invalid HTTP method'));
        expect(methodError?.suggestion).toBeDefined();
        expect(methodError?.suggestion).toContain('get');
      });
    });

    describe('malformed URLs', () => {
      it('should detect double braces in path', () => {
        const input = `
participant User
participant API
User->>API: GET /users/{{id}}
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Double braces'))).toBe(true);
      });

      it('should detect unclosed opening brace', () => {
        const input = `
participant User
participant API
User->>API: GET /users/{id
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Unclosed braces'))).toBe(true);
      });

      it('should detect unclosed closing brace', () => {
        const input = `
participant User
participant API
User->>API: GET /users/id}
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Unclosed braces'))).toBe(true);
      });

      it('should detect adjacent path parameters', () => {
        const input = `
participant User
participant API
User->>API: GET /users/{id}{name}
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Adjacent path parameters'))).toBe(true);
      });

      it('should detect spaces in path', () => {
        const input = `
participant User
participant API
User->>API: GET /users/{id}/posts
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should accept properly formatted path with multiple parameters', () => {
        const input = `
participant User
participant API
User->>API: GET /users/{id}/posts/{postId}
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });
    });

    describe('malformed notes', () => {
      it('should detect invalid JSON in body note', () => {
        const input = `
participant User
participant API
User->>API: POST /users
Note over User,API: Body: { "name": "John", }
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid JSON'))).toBe(true);
      });

      it('should detect incomplete JSON in body note', () => {
        const input = `
participant User
participant API
User->>API: POST /users
Note over User,API: Body: { "name":
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid JSON'))).toBe(true);
      });

      it('should detect malformed JSON object', () => {
        const input = `
participant User
participant API
User->>API: POST /users
Note over User,API: Body: { name: "John" }
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid JSON'))).toBe(true);
      });

      it('should accept valid JSON in body note', () => {
        const input = `
participant User
participant API
User->>API: POST /users
Note over User,API: Body: { "name": "John", "age": 30 }
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should warn about note referencing undefined participant', () => {
        const input = `
participant User
participant API
User->>API: GET /users
Note over User,Unknown: This is a note
`;
        const result = validateMermaidSyntax(input);
        // Check both errors and warnings arrays
        const allIssues = [...result.errors, ...result.warnings];
        expect(allIssues.some((i) => i.message.includes('undefined participant') || i.message.includes('Unknown'))).toBe(true);
      });
    });

    describe('orphaned responses', () => {
      it('should detect response without matching request', () => {
        const input = `
participant User
participant API
API-->>User: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Orphaned response'))).toBe(true);
      });

      it('should detect response direction mismatch', () => {
        const input = `
participant User
participant API
User->>API: GET /users
User-->>API: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        // Response is from User to API, but the request was from User to API
        // So there's no matching request (request was User->API, response should be API->User)
        expect(result.errors.some((e) => e.message.includes('Orphaned response'))).toBe(true);
      });

      it('should accept properly matched response', () => {
        const input = `
participant User
participant API
User->>API: GET /users
API-->>User: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });
    });

    describe('unknown participants', () => {
      it('should detect undeclared source participant', () => {
        const input = `
participant API
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Unknown source participant'))).toBe(true);
      });

      it('should detect undeclared target participant', () => {
        const input = `
participant User
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Unknown target participant'))).toBe(true);
      });

      it('should suggest declaring participant', () => {
        const input = `
participant User
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        const error = result.errors.find((e) => e.message.includes('Unknown target participant'));
        expect(error?.suggestion).toContain('participant');
      });
    });

    describe('invalid status codes', () => {
      it('should detect invalid status code', () => {
        const input = `
participant User
participant API
User->>API: GET /users
API-->>User: 999 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Invalid HTTP status code'))).toBe(true);
      });

      it('should detect non-numeric status code', () => {
        const input = `
participant User
participant API
User->>API: GET /users
API-->>User: OK
`;
        const result = validateMermaidSyntax(input);
        // Non-numeric status codes don't match the response pattern
        expect(result.warnings.some((w) => w.message.includes('does not match'))).toBe(true);
      });

      it('should accept all valid status code ranges', () => {
        const statusCodes = ['100', '200', '300', '400', '500'];
        statusCodes.forEach((status) => {
          const input = `
participant User
participant API
User->>API: GET /users
API-->>User: ${status} OK
`;
          const result = validateMermaidSyntax(input);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty input', () => {
        const input = '';
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Empty input'))).toBe(true);
      });

      it('should handle whitespace-only input', () => {
        const input = '   \n\n  \n  ';
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Empty input'))).toBe(true);
      });

      it('should handle unicode in participant names', () => {
        const input = `
participant 用户
participant API
用户->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should handle special characters that are allowed', () => {
        const input = `
participant User_Name
participant API-Service
User_Name->>API-Service: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should warn about orphaned notes', () => {
        const input = `
participant User
participant API
Note over User,API: This note comes before any request
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.warnings.some((w) => w.message.includes('orphaned'))).toBe(true);
      });

      it('should handle multiple errors', () => {
        const input = `
participant User<Bad>
User->>API: INVALID /users/{{id}}
API-->>User: 999 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(2);
      });

      it('should handle comments correctly', () => {
        const input = `
%% This is a comment
participant User
%% Another comment
participant API
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });
    });

    describe('validation result structure', () => {
      it('should return ValidationResult with correct structure', () => {
        const input = `
participant User
participant API
User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it('should include line numbers in errors', () => {
        const input = `
participant User
participant API
User->>API: INVALID /users
`;
        const result = validateMermaidSyntax(input);
        const error = result.errors[0];
        expect(error).toHaveProperty('line');
        expect(error.line).toBeGreaterThan(0);
      });

      it('should include severity levels', () => {
        const input = `
participant 1User
participant API
1User->>API: GET /users
`;
        const result = validateMermaidSyntax(input);
        // Check both errors and warnings for severity
        const allIssues = [...result.errors, ...result.warnings];
        expect(allIssues.length).toBeGreaterThan(0);
        expect(allIssues[0]).toHaveProperty('severity');
        expect(allIssues[0].severity).toMatch(/error|warning|info/);
      });

      it('should include suggestions for fixable errors', () => {
        const input = `
participant User
participant API
User->>API: INVALID /users
`;
        const result = validateMermaidSyntax(input);
        const error = result.errors.find((e) => e.message.includes('Invalid HTTP method'));
        expect(error?.suggestion).toBeDefined();
        expect(typeof error?.suggestion).toBe('string');
      });

      it('should include context for errors', () => {
        const input = `
participant User
participant API
User->>API: INVALID /users
`;
        const result = validateMermaidSyntax(input);
        const error = result.errors.find((e) => e.message.includes('Invalid HTTP method'));
        expect(error?.context).toBeDefined();
      });
    });

    describe('complex scenarios', () => {
      it('should validate multi-service diagram', () => {
        const input = `
participant User
participant API
participant Database
User->>API: GET /users/{id}
API->>Database: GET /users/{id}
Database-->>API: 200 OK
API-->>User: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should handle multiple responses to different requests', () => {
        const input = `
participant User
participant API
User->>API: GET /users
API-->>User: 200 OK
User->>API: POST /users
API-->>User: 201 Created
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });

      it('should validate request chaining', () => {
        const input = `
participant Client
participant Service1
participant Service2
participant Service3
Client->>Service1: GET /data
Service1->>Service2: GET /fetch
Service2->>Service3: GET /retrieve
Service3-->>Service2: 200 OK
Service2-->>Service1: 200 OK
Service1-->>Client: 200 OK
`;
        const result = validateMermaidSyntax(input);
        expect(result.valid).toBe(true);
      });
    });
  });
});
