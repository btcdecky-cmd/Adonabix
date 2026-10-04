# Adonabix

Adonabix is a TypeScript monorepo for a modern AI-powered website builder and coding-agent platform. It provides a developer-friendly workspace where users can describe a website in natural language and the system generates, edits, debugs, previews, and iteratively improves the code in real time.

This repository is organized as a set of focused packages and runtime artifacts to separate API contracts, validation, persistence, generated clients, agent infrastructure, frontend build tooling, and backend runtime.

- Homepage: https://replit.com/@dealchange90/AI-Website-Builder
- Language: TypeScript (primary)

Key goals
- Provide a safe, type-safe development environment for building and iterating on AI-generated websites.
- Keep API contracts, validation, and generated clients synchronized via OpenAPI + Orval + Zod.
- Keep the data layer strictly typed using Drizzle ORM and Zod.
- Give developers a predictable monorepo developer experience via pnpm workspaces and curated workspace scripts.

Features
- Natural-language driven website generation powered by an AI model (requires GROQ_API_KEY).
- Realtime editing and preview UI using Monaco editor and Vite-powered frontend.
- Type-safe API contracts: OpenAPI spec + Orval to generate React hooks/clients.
- Shared validation with Zod and drizzle-zod integration for consistency between runtime and client.
- Postgres-backed persistence with Drizzle ORM and schema push tooling (drizzle-kit).
- Modular monorepo layout so frontend, backend, agents, and shared libraries evolve independently.

Repository layout (logical)

Adonabix
│
├── API Specification Layer
│   ├── lib/api-spec        — OpenAPI spec, Orval codegen
│   ├── lib/api-zod        — Zod validation schemas shared by server & client
│
├── Shared Database Layer
│   └── lib/db             — Drizzle schemas, drizzle-kit for dev push
│
├── Generated Clients
│   └── lib/api-client-react — Orval-generated React hooks / SDK
│
├── Agent Infrastructure
│   └── .agents            — AI agent definitions and infra metadata
│
├── Build Automation / Frontend
│   └── artifacts/buildflow — Vite + React app (Monaco editor, Radix UI, Tailwind)
│
├── API Runtime
│   └── artifacts/api-server — Express 5 API server (pino logging, drizzle ORM)
│
└── Development Tooling
    └── scripts             — repo maintenance utilities

The repo uses pnpm workspaces, Node.js 24, TypeScript 5.9, esbuild as the build toolchain, and Orval + Zod for API + validation tooling.

Quickstart (development)

1) Clone and install

   git clone https://github.com/btcdecky-cmd/Adonabix.git
   cd Adonabix
   pnpm install -w

2) Required environment

   - GROQ_API_KEY — required for AI chat/code generation integrations. Add this to your shell environment or a .env used by your local dev tooling.

3) Run the backend and frontend in development (in separate terminals)

   # API server (port 5000 by default in replit.md)
   pnpm --filter @workspace/api-server run dev

   # Frontend (Buildflow app)
   pnpm --filter @workspace/buildflow run dev

4) Regenerate API clients & Zod schemas (when API spec changes)

   pnpm --filter @workspace/api-spec run codegen

5) Full typecheck across the workspace

   pnpm run typecheck

Notes about the database

- lib/db includes Drizzle ORM schemas and a drizzle-kit configuration. For local development use a local PostgreSQL instance and the `pnpm --filter @workspace/db run push` command to apply schema changes in a safe dev-only manner.
- Be careful: `drizzle-kit push --force` may be destructive. Only use in development environments.

Recommended workspace scripts (suggested)

You can add these to the root package.json to simplify developer experience:

"scripts": {
  "dev:api": "pnpm --filter @workspace/api-server run dev",
  "dev:web": "pnpm --filter @workspace/buildflow run dev",
  "codegen": "pnpm --filter @workspace/api-spec run codegen",
  "typecheck": "pnpm run typecheck"
}

CI and future steps

- Add a GitHub Actions workflow to run `pnpm -w install`, `pnpm -w run typecheck`, and `pnpm --filter @workspace/api-spec run codegen` as pre-merge checks.
- Add package-level README.md files for lib/db, artifacts/api-server, and artifacts/buildflow describing how to run and test each package.
- Consider a future refactor that flattens artifacts/ to top-level directories (api-server/, buildflow/) and adopt a consistent package scope (e.g., `@adonabix/*`). Perform that refactor in a dedicated PR with repository-wide search-and-replace and CI validation.

License

This repository uses the MIT license (root package.json lists license: MIT). Confirm license terms before publishing or reusing code in other projects.

Contact / maintainers

Owner: btcdecky-cmd (https://github.com/btcdecky-cmd)

---

If you'd like, I can also:
- add workspace convenience scripts to root package.json directly in this change,
- add package-level READMEs for the main packages,
- open a PR that moves artifacts/buildflow and artifacts/api-server to top-level directories (more invasive).
