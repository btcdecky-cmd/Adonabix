# Adonabix

Adonabix is a TypeScript monorepo for an AI-powered website builder and coding-agent platform. The repo is organized as a workspace of focused packages and artifacts that separate API contracts, shared validation, persistence, generated clients, agent infrastructure, frontend build tooling, and runtime services.

## Architecture overview

Adonabix
│
├── API Specification Layer
│   ├── lib/api-spec
│   ├── lib/api-zod
│   └── generated API contracts and validation
│
├── Shared Database Layer
│   └── lib/db
│
├── Generated Clients
│   └── lib/api-client-react
│
├── Agent Infrastructure
│   └── .agents
│
├── Build Automation
│   └── artifacts/buildflow
│
├── API Runtime
│   └── artifacts/api-server
│
├── Development Tooling
│   └── scripts
│
├── Workspace Configuration
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   └── tsconfig.base.json
│
└── Project Notes
    └── replit.md

## Repository map

- API Specification Layer
  - `lib/api-spec/` — OpenAPI specification and code generation tooling (Orval)
  - `lib/api-zod/` — shared Zod validation schemas

- Shared Database Layer
  - `lib/db/` — Drizzle ORM schema and PostgreSQL integration

- Generated Clients
  - `lib/api-client-react/` — generated React client for API consumption

- Agent Infrastructure
  - `.agents/` — agent definitions and runtime infrastructure metadata

- Build Automation
  - `artifacts/buildflow/` — Vite + React frontend application

- API Runtime
  - `artifacts/api-server/` — Express API server and backend runtime

- Development Tooling
  - `scripts/` — workspace utilities and maintenance scripts

## Stack

- Node.js 24
- TypeScript 5.9
- pnpm workspaces
- Express 5 API runtime
- PostgreSQL + Drizzle ORM
- Zod validation
- Orval-generated API clients
- Vite + React frontend
- esbuild-based build pipeline

## Main commands

From the repo root:

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/buildflow run dev
pnpm --filter @workspace/api-spec run codegen
```

## Environment

The repo expects a Groq API key for AI-related functionality:

```bash
GROQ_API_KEY=your_key_here
```

## Notes

This repo is intentionally structured as a monorepo so each major concern has a distinct place:

- contracts and validation
- persistence layer
- generated clients
- agent infrastructure
- frontend app
- backend app
- automation scripts

That separation makes it easier to evolve the product while keeping the frontend, backend, and AI workflow independent.

## Next steps

The project is already on a good monorepo foundation. Recommended next improvements:

1. Document package responsibilities more explicitly in each package README.
2. Standardize package naming conventions across the workspace.
3. Consider a future filesystem cleanup to flatten the top-level organization if the project grows further.
4. Add CI checks for typecheck and code generation.
