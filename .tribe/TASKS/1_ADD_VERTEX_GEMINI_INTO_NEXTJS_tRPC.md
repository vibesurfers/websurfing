We need to have following snippets/modules working with example.ts files for each operator.

each has to have docs file and example .ts file

operators:
- Google URL Search operator
- Google URL Context Operator
- Google Structured JSON Operator

given that our repo currently looks like this:

.
├── app
│   ├── api
│   │   ├── auth
│   │   │   └── [...nextauth]
│   │   │       └── route.ts
│   │   └── trpc
│   │       └── [trpc]
│   │           └── route.ts
│   ├── _components
│   │   └── post.tsx
│   ├── layout.tsx
│   └── page.tsx
├── env.js
├── server
│   ├── api
│   │   ├── root.ts
│   │   ├── routers
│   │   │   └── post.ts
│   │   └── trpc.ts
│   ├── auth
│   │   ├── config.ts
│   │   └── index.ts
│   └── db
│       ├── index.ts
│       └── schema.ts
├── styles
│   └── globals.css
└── trpc
    ├── query-client.ts
    ├── react.tsx
    └── server.ts

15 directories, 17 files


let's use tRPC server/api for that

use context from .tribe/snippets/GEMINI-*.md

we must use VERTEX for that, in order to see how to use it, see @.tribe/snippets/VERTEX.md