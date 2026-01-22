import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { tokenize } from '@/parser/mermaidLexer';
import { parse } from '@/parser/mermaidParser';
import type { MermaidToken } from '@/types';

describe('parser fuzz tests', () => {
  describe('lexer fuzzing', () => {
    it('should never crash on completely random strings', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          // Should not throw unhandled exceptions
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on random multi-line inputs', () => {
      const linesArb = fc.array(fc.string(), { minLength: 1, maxLength: 100 });

      fc.assert(
        fc.property(linesArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on random strings with special characters', () => {
      const specialChars = fc.constantFrom(
        '\n', '\r', '\t', '\\', '/', ':', '-', '>>', '-->>',
        '{', '}', '[', ']', '(', ')', '@', '#', '$', '%', '^', '&', '*',
        ' participant ', ' ->>', ' -->> ', ' Note over '
      );

      const specialStringArb = fc.array(fc.oneof(fc.string(), specialChars), { maxLength: 200 });

      fc.assert(
        fc.property(specialStringArb, (chars) => {
          const input = chars.join('');
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on random strings with Mermaid keywords', () => {
      const keywords = fc.constantFrom(
        'participant', 'Participant', 'PARTICIPANT',
        '->>', '-->>', '>>', 'Note', 'note', 'NOTE',
        'over', 'Over', 'OVER', 'Body:', 'body:',
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD',
        'get', 'post', 'put', 'delete', 'patch', 'options', 'head'
      );

      const keywordStringArb = fc.array(fc.oneof(fc.string(), keywords), { maxLength: 100 });

      fc.assert(
        fc.property(keywordStringArb, (parts) => {
          const input = parts.join(' ');
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on malformed request patterns', () => {
      const malformedArb = fc.tuple(
        fc.string(),
        fc.string(),
        fc.string(),
        fc.string()
      ).map(([source, arrow, target, rest]) => `${source}${arrow}${target}: ${rest}`);

      fc.assert(
        fc.property(malformedArb, (input) => {
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on extremely long lines', { timeout: 30000 }, () => {
      const longLineArb = fc.string({ minLength: 10000, maxLength: 50000 });

      fc.assert(
        fc.property(longLineArb, (input) => {
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 500, timeout: 30000 }
      );
    });

    it('should never crash on inputs with many blank lines', () => {
      const blankLinesArb = fc.array(fc.constantFrom('', '   ', '\t', '  \t  '));

      fc.assert(
        fc.property(blankLinesArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          return Array.isArray(tokens) && tokens.length === 0;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on inputs with many comments', { timeout: 15000 }, () => {
      const commentArb = fc.array(fc.stringMatching(/%%.*/));

      fc.assert(
        fc.property(commentArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          return Array.isArray(tokens) && tokens.length === 0;
        }),
        { numRuns: 5000, timeout: 15000 }
      );
    });

    it('should never crash on random unicode strings', { timeout: 15000 }, () => {
      const unicodeArb = fc.string();

      fc.assert(
        fc.property(unicodeArb, (input) => {
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 5000, timeout: 15000 }
      );
    });

    it('should never hang on deeply nested arrows', () => {
      const nestedArb = fc.nat(100).map((n) => {
        const parts = [];
        for (let i = 0; i < n; i++) {
          parts.push(`A${i}>>B${i}:`);
        }
        return parts.join(' ');
      });

      fc.assert(
        fc.property(nestedArb, (input) => {
          const tokens = tokenize(input);
          return Array.isArray(tokens);
        }),
        { numRuns: 1000, timeout: 10000 }
      );
    });
  });

  describe('parser fuzzing', () => {
    it('should never crash on completely random token arrays', { timeout: 15000 }, () => {
      const randomTokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request', 'response', 'note'),
          line: fc.nat(100000),
          name: fc.option(fc.string(), { nil: undefined }),
          source: fc.option(fc.string(), { nil: undefined }),
          target: fc.option(fc.string(), { nil: undefined }),
          method: fc.option(fc.string(), { nil: undefined }),
          path: fc.option(fc.string(), { nil: undefined }),
          status: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          participants: fc.option(fc.array(fc.string()), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { maxLength: 500 }
      );

      fc.assert(
        fc.property(randomTokenArb, (tokens) => {
          const ast = parse(tokens);
          return (
            ast !== null &&
            ast !== undefined &&
            Array.isArray(ast.participants) &&
            Array.isArray(ast.interactions) &&
            Array.isArray(ast.notes)
          );
        }),
        { numRuns: 5000, timeout: 15000 }
      );
    });

    it('should never crash on malformed tokens', { timeout: 15000 }, () => {
      const malformedTokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request', 'response', 'note'),
          line: fc.nat(),
          // All optional fields can be anything
          name: fc.option(fc.string(), { nil: undefined }),
          source: fc.option(fc.string(), { nil: undefined }),
          target: fc.option(fc.string(), { nil: undefined }),
          method: fc.option(fc.string(), { nil: undefined }),
          path: fc.option(fc.string(), { nil: undefined }),
          status: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          participants: fc.option(fc.array(fc.string()), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { maxLength: 200 }
      );

      fc.assert(
        fc.property(malformedTokenArb, (tokens) => {
          const ast = parse(tokens);
          return ast !== null && ast !== undefined;
        }),
        { numRuns: 3000, timeout: 15000 }
      );
    });

    it('should never crash on token arrays with extreme line numbers', { timeout: 15000 }, () => {
      const tokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request', 'response', 'note'),
          line: fc.integer({ min: -1000000, max: 1000000 }),
          name: fc.option(fc.string(), { nil: undefined }),
          source: fc.option(fc.string(), { nil: undefined }),
          target: fc.option(fc.string(), { nil: undefined }),
          method: fc.option(fc.string(), { nil: undefined }),
          path: fc.option(fc.string(), { nil: undefined }),
          status: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          participants: fc.option(fc.array(fc.string()), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { maxLength: 100 }
      );

      fc.assert(
        fc.property(tokenArb, (tokens) => {
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 5000, timeout: 15000 }
      );
    });

    it('should never crash on very large token arrays', { timeout: 20000 }, () => {
      const largeTokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request'),
          line: fc.nat(10000),
          name: fc.option(fc.string(), { nil: undefined }),
          source: fc.option(fc.string(), { nil: undefined }),
          target: fc.option(fc.string(), { nil: undefined }),
          method: fc.option(fc.string(), { nil: undefined }),
          path: fc.option(fc.string(), { nil: undefined }),
          status: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          participants: fc.option(fc.array(fc.string()), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { minLength: 500, maxLength: 2000 }
      );

      fc.assert(
        fc.property(largeTokenArb, (tokens) => {
          const start = Date.now();
          const ast = parse(tokens);
          const duration = Date.now() - start;
          // Should complete in reasonable time and not crash
          return ast !== undefined && duration < 5000;
        }),
        { numRuns: 50, timeout: 20000 }
      );
    });

    it('should never crash on tokens with undefined/null fields', () => {
      const partialTokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request', 'response', 'note'),
          line: fc.nat()
        }),
        { maxLength: 100 }
      );

      fc.assert(
        fc.property(partialTokenArb, (tokens) => {
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on tokens with invalid JSON in body notes', () => {
      const invalidJsonArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request', 'response', 'note'),
          line: fc.nat(1000),
          name: fc.option(fc.string(), { nil: undefined }),
          source: fc.option(fc.string(), { nil: undefined }),
          target: fc.option(fc.string(), { nil: undefined }),
          method: fc.option(fc.string(), { nil: undefined }),
          path: fc.option(fc.string(), { nil: undefined }),
          status: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          participants: fc.option(fc.array(fc.string()), { nil: undefined }),
          content: fc.option(fc.stringMatching(/Body:\s*.+/), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { maxLength: 50 }
      );

      fc.assert(
        fc.property(invalidJsonArb, (tokens) => {
          const ast = parse(tokens);
          // Should handle invalid JSON gracefully
          return ast !== undefined && Array.isArray(ast.notes);
        }),
        { numRuns: 1000, timeout: 15000 }
      );
    });
  });

  describe('combined lexer+parser fuzzing', () => {
    it('should never crash on random string input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          // Should not throw unhandled exceptions
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on random multi-line Mermaid-like input', () => {
      const mermaidKeywordArb = fc.constantFrom(
        'participant', 'Participant',
        'Client', 'Server', 'API', 'Database',
        '->>', '-->>', '>>',
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
        'Note over', 'note over', 'Body:',
        '/api/users', '/api/posts', '/test',
        '200', '201', '400', '404', '500'
      );

      const mermaidLineArb = fc.array(mermaidKeywordArb, { minLength: 1, maxLength: 10 })
        .map(parts => parts.join(' '));

      const multiLineArb = fc.array(mermaidLineArb, { minLength: 1, maxLength: 100 });

      fc.assert(
        fc.property(multiLineArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on random strings with arrow patterns', () => {
      const arrowArb = fc.tuple(
        fc.string({ maxLength: 20 }),
        fc.constantFrom('>>', '->>', '-->>', '>>>', '---->>', ' - >> '),
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 50 })
      ).map(([source, arrow, target, rest]) => `${source}${arrow}${target}: ${rest}`);

      const multiArrowArb = fc.array(arrowArb, { minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(multiArrowArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on malformed request-response patterns', () => {
      const malformedPatternArb = fc.tuple(
        fc.string(),
        fc.constantFrom('>>', '->>', '-->>', '->', '-->', '->->', '>>-'),
        fc.string(),
        fc.constantFrom(':', '::', ' : ', '  :  '),
        fc.string()
      ).map(([source, arrow, target, colon, rest]) =>
        `${source}${arrow}${target}${colon}${rest}`
      );

      fc.assert(
        fc.property(malformedPatternArb, (input) => {
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never hang on inputs with many consecutive arrows', () => {
      const consecutiveArrowsArb = fc.tuple(
        fc.string({ maxLength: 10 }),
        fc.nat(50),
        fc.string({ maxLength: 10 })
      ).map(([prefix, count, suffix]) => {
        const arrows = '>>'.repeat(count);
        return `${prefix}${arrows}${suffix}`;
      });

      fc.assert(
        fc.property(consecutiveArrowsArb, (input) => {
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 1000, timeout: 10000 }
      );
    });

    it('should never crash on mixed valid and invalid syntax', () => {
      const validLineArb = fc.constantFrom(
        'participant Client',
        'Client>>Server: GET /api/users',
        'Server-->>Client: 200 OK',
        'Note over Server: Body: {"id": 1}',
        'Database>>Server: POST /data',
        'API-->>Client: 500 Error'
      );

      const invalidLineArb = fc.string();

      const mixedLineArb = fc.array(
        fc.oneof(validLineArb, invalidLineArb),
        { minLength: 1, maxLength: 100 }
      );

      fc.assert(
        fc.property(mixedLineArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on input with repeated patterns', () => {
      const patternArb = fc.tuple(
        fc.string({ maxLength: 20 }),
        fc.nat(100)
      ).map(([base, count]) => {
        return Array(count).fill(base).join('\n');
      });

      fc.assert(
        fc.property(patternArb, (input) => {
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 1000, timeout: 10000 }
      );
    });

    it('should never crash on input with special control characters', () => {
      const controlChars = fc.constantFrom(
        '\x00', '\x01', '\x02', '\x1B', '\x7F',
        '\r\n', '\n\r', '\t\t', '  '
      );

      const controlStringArb = fc.array(
        fc.oneof(fc.string(), controlChars),
        { maxLength: 200 }
      );

      fc.assert(
        fc.property(controlStringArb, (chars) => {
          const input = chars.join('');
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 10000, timeout: 10000 }
      );
    });

    it('should never crash on inputs with deeply nested notes', () => {
      const nestedNoteArb = fc.nat(20).map((n) => {
        const lines = [];
        for (let i = 0; i < n; i++) {
          lines.push(`Note over Server,Client,API: Body: {"level": ${i}}`);
        }
        return lines.join('\n');
      });

      fc.assert(
        fc.property(nestedNoteArb, (input) => {
          const tokens = tokenize(input);
          const ast = parse(tokens);
          return ast !== undefined;
        }),
        { numRuns: 1000, timeout: 10000 }
      );
    });
  });

  describe('regression test collection', () => {
    const failingInputs: string[] = [];

    it('should collect and report any crashing inputs', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          try {
            const tokens = tokenize(input);
            const ast = parse(tokens);
            return true;
          } catch (e) {
            // Collect failing input for regression testing
            failingInputs.push(input);
            throw e;
          }
        }),
        { numRuns: 10000, timeout: 10000 }
      );

      // If we get here, no crashes occurred
      expect(failingInputs).toHaveLength(0);
    });
  });
});
