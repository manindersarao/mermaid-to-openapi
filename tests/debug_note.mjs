import { tokenize } from '@/parser/mermaidLexer';

const mermaid = `
  sequenceDiagram
    participant User
    participant API

    User->>API: GET /users
    Note over API: External-Docs-Url: https://docs.example.com/users\nExternal-Docs-Description: Detailed docs
    API-->>User: 200 OK
`;

const tokens = tokenize(mermaid);
const noteToken = tokens.find(t => t.type === 'note');
console.log('Note token content (JSON):', JSON.stringify(noteToken?.content));
console.log('Note token content (raw):', noteToken?.content);
console.log('Contains literal \\n:', noteToken?.content.includes('\\n'));
console.log('Contains actual newline:', noteToken?.content.includes('\n'));
