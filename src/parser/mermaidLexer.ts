import type { MermaidToken } from '@/types';

const REQUEST_PATTERN = /^\s*([^-]+?)\s*->>\s*([^:]+?):\s?(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|get|post|put|delete|patch|options|head)\s+([^\s]+)(.*)/i;
const RESPONSE_PATTERN = /^\s*([^-]+?)\s*-->>\s*([^:]+?):\s?(\d{3})(.*)/i;
const PARTICIPANT_PATTERN = /^\s*participant\s+([^\s]+)/i;
const NOTE_PATTERN = /^\s*Note\s+over\s+([^:]+):\s*(.+)/i;
const COMMENT_PATTERN = /^\s*%%/;

export function tokenize(input: string): MermaidToken[] {
  const tokens: MermaidToken[] = [];
  const lines = input.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || COMMENT_PATTERN.test(trimmed)) {
      return;
    }

    // Try to match request
    const requestMatch = trimmed.match(REQUEST_PATTERN);
    if (requestMatch) {
      tokens.push({
        type: 'request',
        line: index + 1,
        source: requestMatch[1].trim(),
        target: requestMatch[2].trim(),
        method: requestMatch[3].toLowerCase(),
        path: requestMatch[4],
        summary: requestMatch[5]?.trim()
      });
      return;
    }

    // Try to match response
    const responseMatch = trimmed.match(RESPONSE_PATTERN);
    if (responseMatch) {
      tokens.push({
        type: 'response',
        line: index + 1,
        source: responseMatch[1].trim(),
        target: responseMatch[2].trim(),
        status: responseMatch[3],
        description: responseMatch[4]?.trim()
      });
      return;
    }

    // Try to match participant
    const participantMatch = trimmed.match(PARTICIPANT_PATTERN);
    if (participantMatch) {
      tokens.push({
        type: 'participant',
        line: index + 1,
        name: participantMatch[1].trim()
      });
      return;
    }

    // Try to match note
    const noteMatch = trimmed.match(NOTE_PATTERN);
    if (noteMatch) {
      const participants = noteMatch[1].split(',').map(p => p.trim());
      tokens.push({
        type: 'note',
        line: index + 1,
        participants,
        content: noteMatch[2].trim(),
        noteType: noteMatch[2].toLowerCase().startsWith('body:') ? 'body' : 'info'
      });
      return;
    }
  });

  return tokens;
}
