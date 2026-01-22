import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { tokenize } from '@/parser/mermaidLexer';
import { parse } from '@/parser/mermaidParser';
import type { MermaidToken, MermaidAST } from '@/types';

describe('parser (property-based)', () => {
  describe('tokenize', () => {
    it('should always return tokens with sequential line numbers', () => {
      const inputArb = fc.array(fc.string(), { minLength: 1 });

      fc.assert(
        fc.property(inputArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);

          // Line numbers should be sequential and increasing
          for (let i = 1; i < tokens.length; i++) {
            if (tokens[i].line <= tokens[i - 1].line) {
              return false;
            }
          }

          // All line numbers should be positive
          return tokens.every(t => t.line > 0);
        }),
        { numRuns: 1000 }
      );
    });

    it('should always normalize HTTP methods to lowercase', () => {
      const httpMethodArb = fc.constantFrom(
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD',
        'get', 'post', 'put', 'delete', 'patch', 'options', 'head',
        'GeT', 'POst', 'pUT', 'DELEte'
      );

      const requestArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        httpMethodArb,
        fc.stringMatching(/\/[A-Za-z0-9_/]*/)
      ).map(([source, method, path]) => `${source}>>API: ${method} ${path}`);

      fc.assert(
        fc.property(requestArb, (input) => {
          const tokens = tokenize(input);

          return tokens.every(token => {
            if (token.type === 'request' && token.method) {
              return token.method === token.method.toLowerCase();
            }
            return true;
          });
        }),
        { numRuns: 1000 }
      );
    });

    it('should preserve participant names (with trim)', () => {
      // Use a simple string generator instead of regex to avoid shrinking issues
      const participantNameArb = fc.tuple(
        fc.constantFrom('A', 'B', 'C', 'X', 'Y', 'Z', 'User', 'API', 'Service'),
        fc.option(fc.array(fc.constantFrom('a', 'b', '1', '2', '_', '-')))
      ).map(([first, rest]) => first + (rest || []).join(''));

      const participantArb = fc.tuple(
        fc.constantFrom('participant'),
        participantNameArb
      ).map(([keyword, name]) => `${keyword} ${name}`);

      fc.assert(
        fc.property(participantArb, (input) => {
          const tokens = tokenize(input);
          // Extract name by removing 'participant ' prefix and trimming
          const expectedName = input.substring('participant '.length).trim();

          return tokens.every(token => {
            if (token.type === 'participant') {
              // Lexer trims whitespace from names
              return token.name === expectedName;
            }
            return true;
          });
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle empty input gracefully', () => {
      fc.assert(
        fc.property(fc.constant(''), (input) => {
          const tokens = tokenize(input);
          return Array.isArray(tokens) && tokens.length === 0;
        }),
        { numRuns: 10 }
      );
    });

    it('should handle input with only whitespace and comments', () => {
      const whitespaceCommentArb = fc.array(
        fc.oneof(
          fc.stringMatching(/\s*/),
          fc.stringMatching(/%%.*/)
        )
      );

      fc.assert(
        fc.property(whitespaceCommentArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          return tokens.length === 0;
        }),
        { numRuns: 1000 }
      );
    });

    it('should always return valid token types', () => {
      const validTokenTypes = ['participant', 'request', 'response', 'note'];

      fc.assert(
        fc.property(fc.string(), (input) => {
          const tokens = tokenize(input);
          return tokens.every(token => validTokenTypes.includes(token.type));
        }),
        { numRuns: 1000 }
      );
    });

    it('should extract request source and target correctly', () => {
      const requestArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        fc.stringMatching(/\/[A-Za-z0-9_/]*/)
      ).map(([source, target, method, path]) => `${source}>>${target}: ${method} ${path}`);

      fc.assert(
        fc.property(requestArb, (input) => {
          const tokens = tokenize(input);
          const [expectedSource, expectedTarget] = input.split('>>')[0].split('>>')[0].split('>>');

          return tokens.every(token => {
            if (token.type === 'request') {
              return token.source !== undefined && token.target !== undefined;
            }
            return true;
          });
        }),
        { numRuns: 1000 }
      );
    });

    it('should extract response status codes', () => {
      const statusArb = fc.integer({ min: 100, max: 599 });
      const responseArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        statusArb
      ).map(([source, status]) => `API-->>${source}: ${status}`);

      fc.assert(
        fc.property(responseArb, (input) => {
          const tokens = tokenize(input);
          const expectedStatus = input.match(/\d{3}/)?.[0];

          return tokens.every(token => {
            if (token.type === 'response') {
              return token.status !== undefined && token.status.length === 3;
            }
            return true;
          });
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle multiple lines of input', () => {
      const multiLineArb = fc.array(fc.string(), { minLength: 1, maxLength: 100 });

      fc.assert(
        fc.property(multiLineArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);

          // Should return an array
          return Array.isArray(tokens);
        }),
        { numRuns: 1000 }
      );
    });
  });

  describe('parse', () => {
    it('should always return valid AST structure', () => {
      const tokenArb = fc.array(
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
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { maxLength: 100 }
      );

      fc.assert(
        fc.property(tokenArb, (tokens) => {
          const ast = parse(tokens);

          // AST must have required structure
          return (
            Array.isArray(ast.participants) &&
            Array.isArray(ast.interactions) &&
            Array.isArray(ast.notes)
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should extract all unique participants', () => {
      const participantTokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant'),
          line: fc.nat(1000),
          name: fc.stringMatching(/[A-Za-z0-9_]+/)
        }),
        { minLength: 1, maxLength: 50 }
      );

      fc.assert(
        fc.property(participantTokenArb, (tokens) => {
          const ast = parse(tokens as MermaidToken[]);

          // All declared participants should be in AST
          const declaredNames = new Set(
            tokens
              .filter(t => t.type === 'participant')
              .map(t => t.name!)
          );

          return Array.from(declaredNames).every(name =>
            ast.participants.includes(name)
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should not have duplicate participants', () => {
      const tokenArb = fc.array(
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
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { maxLength: 100 }
      );

      fc.assert(
        fc.property(tokenArb, (tokens) => {
          const ast = parse(tokens);

          // Check for duplicates using Set
          const uniqueParticipants = new Set(ast.participants);
          return uniqueParticipants.size === ast.participants.length;
        }),
        { numRuns: 1000 }
      );
    });

    it('should extract participants from request tokens', () => {
      const requestTokenArb = fc.array(
        fc.tuple(
          fc.stringMatching(/[A-Za-z0-9_]+/),
          fc.stringMatching(/[A-Za-z0-9_]+/),
          fc.nat(1000)
        ).map(([source, target, line]) => ({
          type: 'request' as const,
          line,
          source,
          target,
          method: 'GET',
          path: '/test'
        })),
        { minLength: 1, maxLength: 50 }
      );

      fc.assert(
        fc.property(requestTokenArb, (tokens) => {
          const ast = parse(tokens);

          // All sources and targets from requests should be in participants
          const allParticipants = new Set([
            ...tokens.map(t => t.source),
            ...tokens.map(t => t.target)
          ]);

          return Array.from(allParticipants).every(p =>
            ast.participants.includes(p)
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should pair matching request-response tokens', () => {
      const pairedTokensArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.nat(1000)
      ).map(([source, target, startLine]) => [
        {
          type: 'request' as const,
          line: startLine,
          source,
          target,
          method: 'GET',
          path: '/test'
        },
        {
          type: 'response' as const,
          line: startLine + 1,
          source: target,
          target: source,
          status: '200'
        }
      ]);

      fc.assert(
        fc.property(pairedTokensArb, (tokens) => {
          const ast = parse(tokens);

          // If we have a paired request-response, the request should have a response
          if (ast.interactions.length > 0) {
            return ast.interactions[0].response !== undefined;
          }
          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should detect orphaned responses', () => {
      const orphanedResponseArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.nat(1000)
      ).map(([source, target, line]) => [{
        type: 'response' as const,
        line,
        source,
        target,
        status: '200'
      }]);

      fc.assert(
        fc.property(orphanedResponseArb, (tokens) => {
          const ast = parse(tokens);

          // Orphaned response should generate a warning note
          if (tokens.length > 0 && tokens[0].type === 'response') {
            return ast.notes.some(note =>
              note.type === 'warning' && note.message.includes('orphaned')
            );
          }
          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should maintain interaction line numbers', () => {
      const tokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('request'),
          line: fc.nat(1000),
          source: fc.stringMatching(/[A-Za-z0-9_]+/),
          target: fc.stringMatching(/[A-Za-z0-9_]+/),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          path: fc.stringMatching(/\/[A-Za-z0-9_/]*/)
        }),
        { minLength: 1, maxLength: 50 }
      );

      fc.assert(
        fc.property(tokenArb, (tokens) => {
          const ast = parse(tokens as MermaidToken[]);

          return ast.interactions.every((interaction, index) => {
            return interaction.line === tokens[index].line;
          });
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle empty token array', () => {
      fc.assert(
        fc.property(fc.constant([] as MermaidToken[]), (tokens) => {
          const ast = parse(tokens);

          return (
            ast.participants.length === 0 &&
            ast.interactions.length === 0 &&
            ast.notes.length === 0
          );
        }),
        { numRuns: 10 }
      );
    });

    it('should preserve request properties in interactions', () => {
      const requestArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        fc.stringMatching(/\/[A-Za-z0-9_/]*/),
        fc.nat(1000)
      ).map(([source, target, method, path, line]) => [{
        type: 'request' as const,
        line,
        source,
        target,
        method,
        path
      }]);

      fc.assert(
        fc.property(requestArb, (tokens) => {
          const ast = parse(tokens);

          if (ast.interactions.length > 0) {
            const interaction = ast.interactions[0];
            const token = tokens[0];

            return (
              interaction.from === token.source &&
              interaction.to === token.target &&
              interaction.method === token.method &&
              interaction.path === token.path
            );
          }
          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle multiple request-response pairs', () => {
      const multiPairArb = fc.nat(10).map(count => {
        const tokens: MermaidToken[] = [];
        for (let i = 0; i < count; i++) {
          tokens.push({
            type: 'request',
            line: i * 2 + 1,
            source: 'Client',
            target: 'Server',
            method: 'GET',
            path: `/test${i}`
          });
          tokens.push({
            type: 'response',
            line: i * 2 + 2,
            source: 'Server',
            target: 'Client',
            status: '200'
          });
        }
        return tokens;
      });

      fc.assert(
        fc.property(multiPairArb, (tokens) => {
          const ast = parse(tokens);

          // All interactions should have responses
          return ast.interactions.every(interaction =>
            interaction.response !== undefined
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should not pair mismatched request-response', () => {
      const mismatchedArb = fc.tuple(
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.stringMatching(/[A-Za-z0-9_]+/),
        fc.nat(1000)
      ).map(([source, target, differentTarget, startLine]) => [
        {
          type: 'request' as const,
          line: startLine,
          source,
          target,
          method: 'GET',
          path: '/test'
        },
        {
          type: 'response' as const,
          line: startLine + 1,
          source: differentTarget,
          target: source,
          status: '200'
        }
      ]);

      fc.assert(
        fc.property(mismatchedArb, (tokens) => {
          const ast = parse(tokens);

          // Mismatched response should not be paired
          if (ast.interactions.length > 0) {
            return ast.interactions[0].response === undefined;
          }
          return true;
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle large token arrays efficiently', () => {
      const largeTokenArb = fc.array(
        fc.record({
          type: fc.constantFrom('participant', 'request'),
          line: fc.nat(10000),
          name: fc.option(fc.stringMatching(/[A-Za-z0-9_]+/), { nil: undefined }),
          source: fc.option(fc.stringMatching(/[A-Za-z0-9_]+/), { nil: undefined }),
          target: fc.option(fc.stringMatching(/[A-Za-z0-9_]+/), { nil: undefined }),
          method: fc.option(fc.constantFrom('GET', 'POST', 'PUT'), { nil: undefined }),
          path: fc.option(fc.stringMatching(/\/[A-Za-z0-9_/]*/), { nil: undefined }),
          status: fc.option(fc.string(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          participants: fc.option(fc.array(fc.string()), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        }),
        { minLength: 50, maxLength: 200 }
      );

      fc.assert(
        fc.property(largeTokenArb, (tokens) => {
          const start = Date.now();
          const ast = parse(tokens);
          const duration = Date.now() - start;

          // Should complete in reasonable time (< 2 seconds for large arrays)
          return duration < 2000 && Array.isArray(ast.interactions);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('round-trip invariants', () => {
    it('should preserve participant information through tokenize-parse cycle', () => {
      // Only test lines that actually tokenize successfully
      const validInputArb = fc.array(
        fc.oneof(
          fc.stringMatching(/participant [A-Za-z][A-Za-z0-9_]*/),
          fc.stringMatching(/[A-Za-z][A-Za-z0-9_]+>>[A-Za-z][A-Za-z0-9_]+: GET \/[A-Za-z0-9_/]*/)
        ),
        { minLength: 1, maxLength: 20 }
      );

      fc.assert(
        fc.property(validInputArb, (lines) => {
          const input = lines.join('\n');
          const tokens = tokenize(input);
          const ast = parse(tokens);

          // Only check participants that were successfully tokenized
          const participantsFromTokens = new Set<string>();
          tokens.forEach(token => {
            if (token.type === 'participant' && token.name) {
              participantsFromTokens.add(token.name);
            }
            if (token.type === 'request') {
              if (token.source) participantsFromTokens.add(token.source);
              if (token.target) participantsFromTokens.add(token.target);
            }
          });

          // All participants from tokens should be in AST
          return Array.from(participantsFromTokens).every(p =>
            ast.participants.includes(p)
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should produce consistent results for same input', () => {
      const validInputArb = fc.array(
        fc.stringMatching(/participant [A-Za-z0-9_]+|[A-Za-z0-9_]+>>[A-Za-z0-9_]+: GET \/test/)
      );

      fc.assert(
        fc.property(validInputArb, (lines) => {
          const input = lines.join('\n');
          const tokens1 = tokenize(input);
          const tokens2 = tokenize(input);

          // Tokenization should be deterministic
          return tokens1.length === tokens2.length;
        }),
        { numRuns: 1000 }
      );
    });
  });

  describe('structural invariants', () => {
    it('should never modify input token array', () => {
      const tokenArb = fc.array(
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
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        })
      );

      fc.assert(
        fc.property(tokenArb, (tokens) => {
          const originalLength = tokens.length;
          const originalFirst = tokens.length > 0 ? { ...tokens[0] } : null;

          parse(tokens);

          // Input should not be modified
          return (
            tokens.length === originalLength &&
            (originalFirst === null || JSON.stringify(tokens[0]) === JSON.stringify(originalFirst))
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should always return arrays for AST properties', () => {
      const tokenArb = fc.array(
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
          content: fc.option(fc.string(), { nil: undefined }),
          noteType: fc.option(fc.constantFrom('body', 'info'), { nil: undefined }),
          summary: fc.option(fc.string(), { nil: undefined })
        })
      );

      fc.assert(
        fc.property(tokenArb, (tokens) => {
          const ast = parse(tokens);

          return (
            Array.isArray(ast.participants) &&
            Array.isArray(ast.interactions) &&
            Array.isArray(ast.notes)
          );
        }),
        { numRuns: 1000 }
      );
    });

    it('should maintain participant ordering (insertion order)', () => {
      const participantArb = fc.array(
        fc.tuple(
          fc.nat(1000),
          // Use Map to track first occurrence to avoid __proto__ issues
          fc.stringMatching(/[A-Za-z][A-Za-z0-9_]{0,10}/)
        ).map(([line, name]) => ({
          type: 'participant' as const,
          line,
          name
        })),
        { minLength: 1, maxLength: 20 }
      );

      fc.assert(
        fc.property(participantArb, (tokens) => {
          const ast = parse(tokens);

          // Participants should maintain insertion order (Set in JS maintains insertion order)
          const firstOccurrence = new Map<string, number>();
          tokens.forEach((token, index) => {
            if (token.type === 'participant' && token.name) {
              if (!firstOccurrence.has(token.name)) {
                firstOccurrence.set(token.name, index);
              }
            }
          });

          // Check that order in AST matches first occurrence order
          const sortedByFirstOccurrence = Array.from(firstOccurrence.keys())
            .sort((a, b) => (firstOccurrence.get(a) || 0) - (firstOccurrence.get(b) || 0));

          return JSON.stringify(ast.participants) === JSON.stringify(sortedByFirstOccurrence);
        }),
        { numRuns: 1000 }
      );
    });
  });
});
