import type { MermaidToken, MermaidAST, Interaction } from '@/types';

export function parse(tokens: MermaidToken[]): MermaidAST {
  const participants = new Set<string>();
  const interactions: Interaction[] = [];
  const notes: MermaidAST['notes'] = [];

  // Extract participants from tokens
  tokens.forEach(token => {
    if (token.type === 'participant') {
      participants.add(token.name!);
    }
  });

  // Build interactions and pair responses
  let lastRequest: Interaction | null = null;

  tokens.forEach(token => {
    if (token.type === 'request') {
      const interaction: Interaction = {
        type: 'request',
        from: token.source!,
        to: token.target!,
        method: token.method!,
        path: token.path!,
        line: token.line
      };

      // Add participants from interaction
      participants.add(token.source!);
      participants.add(token.target!);

      interactions.push(interaction);
      lastRequest = interaction;
    } else if (token.type === 'response') {
      if (lastRequest && lastRequest.to === token.source && lastRequest.from === token.target) {
        // Pair response with request
        lastRequest.response = {
          status: token.status,
          description: token.description
        };
        lastRequest = null;
      } else {
        // Orphaned response
        notes.push({
          type: 'warning',
          line: token.line,
          message: `orphaned response from ${token.source} to ${token.target} at line ${token.line}`
        });
      }
    } else if (token.type === 'note') {
      // Attach note to last request
      if (lastRequest && token.participants && token.participants.includes(lastRequest.to)) {
        if (token.noteType === 'body' && token.content) {
          try {
            const jsonMatch = token.content.match(/Body:\s*(.+)/);
            if (jsonMatch) {
              lastRequest.body = JSON.parse(jsonMatch[1]);
            }
          } catch (e) {
            notes.push({
              type: 'error',
              line: token.line,
              message: `Invalid JSON in body note at line ${token.line}: ${token.content}`
            });
          }
        }
      }
    }
  });

  return {
    participants: Array.from(participants),
    interactions,
    notes
  };
}
