# Comprehensive Refactor Design Document

## Overview

This document outlines the complete refactoring of the Mermaid-to-OpenAPI converter into a production-ready, comprehensively tested tool.

## Architecture

### Module Extraction Approach

The current monolithic `App.tsx` (680 lines) will be reorganized into focused modules:

```
src/
├── parser/           # Mermaid parsing logic
│   ├── mermaidLexer.ts       # Tokenizes Mermaid input
│   ├── mermaidParser.ts      # Builds AST from tokens
│   └── astTypes.ts           # AST TypeScript interfaces
├── generators/       # OpenAPI spec generation
│   ├── schemaGenerator.ts    # Schema generation logic
│   ├── openapiBuilder.ts     # Converts AST to OpenAPI
│   └── yamlFormatter.ts      # YAML formatting
├── validators/       # Validation logic
│   ├── mermaidValidator.ts   # Mermaid syntax validation
│   └── openapiValidator.ts   # OpenAPI compliance validation
├── types/            # TypeScript interfaces
│   ├── mermaid.ts            # Mermaid-related types
│   ├── openapi.ts            # OpenAPI-related types
│   └── validation.ts         # Validation error types
├── components/       # React UI components
│   ├── MermaidViewer.tsx
│   ├── CollapsibleSpec.tsx
│   └── GuideSection.tsx
└── utils/            # Utility functions
```

### Transformation Pipeline

**Input → Parse → Validate → Generate → Output**

Each module has a single responsibility and can be tested independently.

## Testing Strategy (Paranoid Coverage)

### Test Organization

```
tests/
├── unit/           # Isolated function tests
├── integration/    # Multi-module interaction tests
├── property/       # Property-based tests (fast-check)
├── fuzz/           # Fuzz test harnesses
├── fixtures/       # Dummy specs and examples
│   ├── mermaid/
│   │   ├── valid/
│   │   └── invalid/
│   ├── openapi/
│   └── schemas/
└── setup.ts        # Test configuration
```

### Testing Techniques

**Unit Tests:**
- Every function tested with valid/invalid inputs
- Edge cases: empty strings, unicode, special characters, malformed syntax
- Line-specific assertions

**Property-Based Testing:**
- 1000+ random inputs per property
- Tests for schema inference, parser round-trips
- Invariants preservation (e.g., valid OpenAPI always generated)

**Fuzz Testing:**
- 10,000+ random Mermaid-like strings
- Ensure no crashes or infinite loops
- Failed inputs become regression tests

**Mutation Testing:**
- Stryker introduces code mutations
- Target: 85%+ mutation score
- Ensures tests catch actual bugs

### Quality Gates

- ✅ TypeScript: Zero errors
- ✅ ESLint: Zero warnings
- ✅ Coverage: 95%+ statements, 90%+ branches
- ✅ Property tests: 1000+ cases pass
- ✅ Fuzz tests: 10,000+ inputs, no crashes
- ✅ Mutation score: 85%+
- ✅ Build time: < 30 seconds

## Validation System

### Stage 1: Mermaid Syntax Validation (Pre-Parsing)

Validates before parsing:
- Participant names (no special characters, not empty)
- HTTP methods (valid methods, normalize case)
- URL paths (proper formatting, query string syntax)
- Notes (correct syntax, proper attachment)
- No orphaned responses

Error format:
```typescript
interface ValidationError {
  source: 'mermaid' | 'openapi';
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  suggestion?: string;
  context?: string;
}
```

### Stage 2: OpenAPI Compliance (Post-Generation)

Validates generated specs:
- Required fields present
- Valid HTTP methods and status codes
- No circular references in schemas
- References point to valid components
- Media types follow structure

### Multi-Specific Validations

- No duplicate operation IDs across services
- Consistent data types for shared schemas
- No circular dependencies between services
- Each service has at least one operation

## Edge Case Handling

### Category 1: Malformed Input (100+ tests)

**Invalid Participant Names:**
- Starts with number, special characters, empty names
- Unicode handling, newline in names

**Invalid HTTP Methods:**
- Typos, missing methods, lowercase normalization

**Malformed URLs:**
- Double braces, unclosed braces, adjacent params
- Dangling query params, spaces in paths

**Malformed Notes:**
- Bad JSON, incomplete JSON, typos in keywords

### Category 2: Ambiguous Scenarios (50+ tests)

- Response without matching request
- Body note not attached to operation
- Duplicate operations
- Conflicting definitions

### Category 3: Complex Multi-Service (30+ tests)

**Request Chaining (3+ hops):**
- Track context depth, warn at 5+ levels
- Each hop generates correct spec

**Response Routing:**
- Match responses to requests properly
- Error on mismatched types

**Circular Dependencies:**
- Detect circular service dependencies
- Warn with dependency chain

## OpenAPI 3.0 Features

### Security Schemes

Syntax:
```mermaid
Note over API: Security: bearerAuth
Note over API: Security: apiKey in header
```

Supports:
- API key (header or query)
- HTTP bearer/basic
- OAuth2 flows
- OpenID Connect

### Components/References

- Detect identical schema patterns
- Extract to `components.schemas`
- Use `$ref` in operations
- Shared parameters, responses, examples

### Documentation Features

Syntax:
```mermaid
Note over User,API: Summary: Get all products
Note over User,API: Description: Paginated list
Note over User,API: Tags: products, inventory
```

Maps to: `summary`, `description`, `tags`, `externalDocs`

### Advanced Media Types

Current: `application/json`
Add: `text/*`, `application/xml`, `multipart/form-data`

Syntax:
```mermaid
Note over API: Response-Type: application/xml
Note over API: Request-Type: multipart/form-data
```

## Implementation Phases

1. **Foundation**: Testing infrastructure + types extraction
2. **Parser**: Extract parser module + basic tests
3. **Generators**: Extract generators + validation
4. **Validation**: Implement validation system
5. **Edge Cases**: Handle all edge cases with tests
6. **OpenAPI Features**: Implement all OpenAPI 3.0 features
7. **UI Components**: Extract React components
8. **Final Quality Gates**: Full test suite, mutation testing, optimization

Each phase ends with:
- Working application
- All tests passing
- Commit and push upstream

## Success Criteria

- All tests passing (unit, integration, property, fuzz, mutation)
- 95%+ code coverage
- Zero TypeScript errors
- Zero ESLint warnings
- App functionality identical to current
- Production-ready for team usage

## Documentation

**Code Documentation:**
- JSDoc/TSDoc comments on all functions
- Algorithm explanations
- Time complexity notes
- Usage examples

**README Updates:**
- Architecture overview
- Contributing guidelines
- Development setup
- Testing strategy

**docs/ Directory:**
- `docs/architecture.md` - Module interactions
- `docs/testing.md` - Testing strategy
- `docs/validation.md` - Validation rules
- `docs/openapi-features.md` - Supported features
