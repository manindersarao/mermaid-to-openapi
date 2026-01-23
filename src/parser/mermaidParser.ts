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

        // Parse security from note
        if (token.content) {
          // Find all Security: declarations in the note
          const securityRegex = /Security:\s*(.+?)(?=\n|$)/gi;
          let match;

          while ((match = securityRegex.exec(token.content)) !== null) {
            const securityInfo = match[1].trim();
            if (!lastRequest.security) {
              lastRequest.security = [];
            }

            // Parse different security patterns
            // Pattern: "bearerAuth" or "basicAuth"
            if (securityInfo.toLowerCase() === 'bearerauth') {
              lastRequest.security.push('bearerAuth');
            } else if (securityInfo.toLowerCase() === 'basicauth') {
              lastRequest.security.push('basicAuth');
            }
            // Pattern: "apiKey in header" or "apiKey in query"
            else if (securityInfo.toLowerCase().startsWith('apikey')) {
              const locationMatch = securityInfo.match(/apiKey\s+in\s+(header|query)/i);
              if (locationMatch) {
                const location = locationMatch[1].toLowerCase();
                lastRequest.security.push(`apiKey_${location}`);
              } else {
                // Default to header if location not specified
                lastRequest.security.push('apiKey_header');
              }
            }
            // Pattern: OAuth2 with optional scopes
            else if (securityInfo.toLowerCase().startsWith('oauth2')) {
              const scopesMatch = securityInfo.match(/oauth2\s*\[(.*?)\]/i);
              if (scopesMatch) {
                // Parse scopes: read,write
                const scopes = scopesMatch[1].split(',').map(s => s.trim()).filter(s => s);
                lastRequest.security.push(`oauth2:${scopes.join(',')}`);
              } else {
                lastRequest.security.push('oauth2');
              }
            }
            // Pattern: OpenID Connect
            else if (securityInfo.toLowerCase().startsWith('openid')) {
              lastRequest.security.push('openIdConnect');
            }
            // Otherwise, treat as a custom scheme name
            else {
              lastRequest.security.push(securityInfo);
            }
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
