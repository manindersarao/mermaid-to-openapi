import { tokenize } from '@/parser/mermaidLexer';
import type { MermaidToken } from '@/types';
import type { ValidationError, ValidationResult } from '@/types/validation';

// Patterns for validation
const REQUEST_PATTERN = /^\s*([^-]+?)\s*->>\s*([^:]+?):\s?([A-Za-z]+)\s+([^\s]+)(.*)/i;
const RESPONSE_PATTERN = /^\s*([^-]+?)\s*-->>\s*([^:]+?):\s?(\d{3})(.*)/i;
const PARTICIPANT_PATTERN = /^\s*participant\s+([^\s]+)/i;
const NOTE_PATTERN = /^\s*Note\s+over\s+([^:]+):\s*(.+)/i;

/**
 * Validates Mermaid diagram syntax before parsing.
 * This is a pre-parsing validation step that catches common syntax errors.
 */
export function validateMermaidSyntax(input: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!input || input.trim().length === 0) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line: 0,
      message: 'Empty input',
      suggestion: 'Please provide a valid Mermaid sequence diagram',
    });
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const lines = input.split('\n');

  // First pass: validate raw lines for syntax errors
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('%%')) {
      return;
    }

    // Check if line matches any known pattern
    const isRequest = REQUEST_PATTERN.test(trimmed);
    const isResponse = RESPONSE_PATTERN.test(trimmed);
    const isParticipant = PARTICIPANT_PATTERN.test(trimmed);
    const isNote = NOTE_PATTERN.test(trimmed);

    if (!isRequest && !isResponse && !isParticipant && !isNote) {
      // Line doesn't match any pattern - it's malformed
      warnings.push({
        source: 'mermaid',
        severity: 'warning',
        line: lineNum,
        message: 'Line does not match any known Mermaid pattern',
        suggestion: 'Check the syntax for requests, responses, participants, or notes',
        context: trimmed,
      });
    }

    // Validate request method if present
    const requestMatch = trimmed.match(REQUEST_PATTERN);
    if (requestMatch) {
      const method = requestMatch[3];
      const validMethods = [
        'get',
        'post',
        'put',
        'delete',
        'patch',
        'options',
        'head',
        'trace',
        'connect',
      ];
      if (!validMethods.includes(method.toLowerCase())) {
        errors.push({
          source: 'mermaid',
          severity: 'error',
          line: lineNum,
          message: `Invalid HTTP method: "${method}"`,
          suggestion: `Use one of: ${validMethods.join(', ')}`,
          context: method,
        });
      }

      // Validate path
      const path = requestMatch[4];
      const pathErrors = validatePath(path, lineNum);
      errors.push(...pathErrors);
    }
  });

  const tokens = tokenize(input);
  const participants = new Set<string>();
  const requestMap = new Map<number, MermaidToken>(); // line -> request token
  const responseTokens: MermaidToken[] = [];

  // Second pass: collect participants and categorize tokens
  tokens.forEach((token) => {
    if (token.type === 'participant') {
      if (token.name) {
        participants.add(token.name);
      }
    } else if (token.type === 'request') {
      if (token.line) {
        requestMap.set(token.line, token);
      }
    } else if (token.type === 'response') {
      responseTokens.push(token);
    }
  });

  // Second pass: validate each token
  tokens.forEach((token) => {
    const tokenErrors = validateToken(token, participants, tokens);
    errors.push(...tokenErrors);
  });

  // Validate response matching
  const responseErrors = validateResponses(responseTokens, requestMap);
  errors.push(...responseErrors);

  // Validate participant names
  const participantErrors = validateParticipantNames(tokens);
  errors.push(...participantErrors);

  // Check for orphaned notes
  const orphanedNoteWarnings = checkOrphanedNotes(tokens, requestMap);
  warnings.push(...orphanedNoteWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a single token
 */
function validateToken(
  token: MermaidToken,
  participants: Set<string>,
  allTokens: MermaidToken[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (token.type) {
    case 'participant': {
      const participantErrors = validateParticipantToken(token);
      errors.push(...participantErrors);
      break;
    }

    case 'request': {
      const requestErrors = validateRequestToken(token, participants);
      errors.push(...requestErrors);
      break;
    }

    case 'response': {
      const responseErrors = validateResponseToken(token);
      errors.push(...responseErrors);
      break;
    }

    case 'note': {
      const noteErrors = validateNoteToken(token, allTokens);
      errors.push(...noteErrors);
      break;
    }
  }

  return errors;
}

/**
 * Validates participant name format
 */
function validateParticipantToken(token: MermaidToken): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!token.name) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line: token.line,
      message: 'Participant name is empty',
      suggestion: 'Provide a valid participant name',
      context: token.name || '',
    });
    return errors;
  }

  // Check for invalid characters (special characters that aren't allowed)
  const invalidChars = /[<>{}|\\^`[\]]/;
  if (invalidChars.test(token.name)) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line: token.line,
      message: `Invalid character in participant name: "${token.name}"`,
      suggestion: 'Use only alphanumeric characters, underscores, hyphens, and spaces',
      context: token.name,
    });
  }

  // Check if name starts with a number (not ideal)
  if (/^\d/.test(token.name)) {
    errors.push({
      source: 'mermaid',
      severity: 'warning',
      line: token.line,
      message: `Participant name starts with a number: "${token.name}"`,
      suggestion: 'Consider starting with a letter',
      context: token.name,
    });
  }

  return errors;
}

/**
 * Validates request token
 */
function validateRequestToken(
  token: MermaidToken,
  participants: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate source and target participants
  if (token.source && !participants.has(token.source)) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line: token.line,
      message: `Unknown source participant: "${token.source}"`,
      suggestion: 'Declare the participant first using "participant <name>"',
      context: token.source,
    });
  }

  if (token.target && !participants.has(token.target)) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line: token.line,
      message: `Unknown target participant: "${token.target}"`,
      suggestion: 'Declare the participant first using "participant <name>"',
      context: token.target,
    });
  }

  return errors;
}

/**
 * Validates response token
 */
function validateResponseToken(token: MermaidToken): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate status code
  if (token.status) {
    // Check if it's purely numeric
    if (!/^\d{3}$/.test(token.status)) {
      errors.push({
        source: 'mermaid',
        severity: 'error',
        line: token.line,
        message: `Invalid HTTP status code: "${token.status}"`,
        suggestion: 'Use a valid 3-digit status code between 100-599',
        context: token.status,
      });
    } else {
      const statusCode = parseInt(token.status, 10);
      if (statusCode < 100 || statusCode > 599) {
        errors.push({
          source: 'mermaid',
          severity: 'error',
          line: token.line,
          message: `Invalid HTTP status code: "${token.status}"`,
          suggestion: 'Use a valid status code between 100-599',
          context: token.status,
        });
      }
    }
  }

  return errors;
}

/**
 * Validates note token
 */
function validateNoteToken(
  token: MermaidToken,
  allTokens: MermaidToken[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate note participants exist
  if (token.participants) {
    token.participants.forEach((participant) => {
      const participantDeclarations = allTokens.filter(
        (t) => t.type === 'participant' && t.name === participant
      );
      if (participantDeclarations.length === 0) {
        errors.push({
          source: 'mermaid',
          severity: 'warning',
          line: token.line,
          message: `Note references undefined participant: "${participant}"`,
          suggestion: 'Declare the participant first using "participant <name>"',
          context: participant,
        });
      }
    });
  }

  // Validate body note JSON format
  if (token.noteType === 'body' && token.content) {
    const jsonErrors = validateBodyNoteJson(token.content, token.line);
    errors.push(...jsonErrors);
  }

  return errors;
}

/**
 * Validates URL path format
 */
function validatePath(path: string, line: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Split path and query string to validate path part only
  const [pathPart] = path.split('?');

  // Check for double braces
  if (pathPart.includes('{{')) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line,
      message: 'Double braces detected in path',
      suggestion: 'Use single braces for path parameters: /users/{id}',
      context: path,
    });
  }

  // Check for unclosed braces
  const openBraces = (pathPart.match(/{/g) || []).length;
  const closeBraces = (pathPart.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line,
      message: 'Unclosed braces in path',
      suggestion: 'Ensure all opening braces have corresponding closing braces',
      context: path,
    });
  }

  // Check for adjacent parameters (e.g., /{id}{name})
  if (/\}\{/.test(pathPart)) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line,
      message: 'Adjacent path parameters detected',
      suggestion: 'Separate path parameters with a slash: /users/{id}/{name}',
      context: path,
    });
  }

  // Check for spaces in path part (query strings can have spaces)
  if (/\s/.test(pathPart)) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line,
      message: 'Spaces detected in path',
      suggestion: 'Remove spaces or use %20 for encoding',
      context: path,
    });
  }

  return errors;
}

/**
 * Validates JSON content in body notes
 */
function validateBodyNoteJson(content: string, line: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Extract JSON from "Body: { ... }" format
  const jsonMatch = content.match(/Body:\s*(.+)/s);
  if (!jsonMatch) {
    return errors;
  }

  const jsonString = jsonMatch[1].trim();

  try {
    JSON.parse(jsonString);
  } catch (error) {
    errors.push({
      source: 'mermaid',
      severity: 'error',
      line,
      message: `Invalid JSON in body note: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestion: 'Ensure JSON is properly formatted with matching braces and quotes',
      context: jsonString,
    });
  }

  return errors;
}

/**
 * Validates responses match to requests
 */
function validateResponses(
  responseTokens: MermaidToken[],
  requestMap: Map<number, MermaidToken>
): ValidationError[] {
  const errors: ValidationError[] = [];

  responseTokens.forEach((response) => {
    if (!response.line || !response.source || !response.target) return;

    // Find the most recent request before this response that matches the direction
    // Response should be from target to source of the request
    let matchingRequest: MermaidToken | undefined;
    for (const [line, token] of requestMap) {
      if (line < response.line &&
          token.source === response.target &&
          token.target === response.source) {
        matchingRequest = token;
      } else if (line > response.line) {
        break;
      }
    }

    if (!matchingRequest) {
      errors.push({
        source: 'mermaid',
        severity: 'error',
        line: response.line,
        message: 'Orphaned response - no matching request found',
        suggestion: `Ensure there's a request from ${response.target} to ${response.source} before this response`,
        context: `${response.source} -> ${response.target}`,
      });
    }
  });

  return errors;
}

/**
 * Validates participant names across all tokens
 */
function validateParticipantNames(tokens: MermaidToken[]): ValidationError[] {
  const errors: ValidationError[] = [];

  const allParticipantNames = new Set<string>();
  tokens.forEach((token) => {
    if (token.type === 'participant' && token.name) {
      allParticipantNames.add(token.name);
    }
  });

  // Check for empty participant names
  tokens.forEach((token) => {
    if (token.type === 'participant' && (!token.name || token.name.trim() === '')) {
      errors.push({
        source: 'mermaid',
        severity: 'error',
        line: token.line,
        message: 'Empty participant name',
        suggestion: 'Provide a valid participant name',
      });
    }
  });

  return errors;
}

/**
 * Checks for notes that aren't attached to any operation
 */
function checkOrphanedNotes(
  tokens: MermaidToken[],
  requestMap: Map<number, MermaidToken>
): ValidationError[] {
  const warnings: ValidationError[] = [];

  tokens.forEach((token) => {
    if (token.type === 'note' && token.line) {
      // Check if there's a request before this note
      let hasPrecedingRequest = false;
      for (const [line] of requestMap) {
        if (line < token.line) {
          hasPrecedingRequest = true;
          break;
        }
      }

      if (!hasPrecedingRequest) {
        warnings.push({
          source: 'mermaid',
          severity: 'warning',
          line: token.line,
          message: 'Note may be orphaned - no preceding request found',
          suggestion: 'Ensure notes are placed after the request they describe',
          context: token.content,
        });
      }
    }
  });

  return warnings;
}
