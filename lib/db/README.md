# @workspace/db

Drizzle ORM schemas and helpers for Adonabix.

## Usage

```bash
pnpm --filter @workspace/db run push   # apply schema (dev only)
```

Requires a PostgreSQL connection string (see `drizzle.config.ts`).

Use only in development; `drizzle-kit push --force` can be destructive.
