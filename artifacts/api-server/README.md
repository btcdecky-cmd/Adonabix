# @workspace/api-server

Express 5 API server for Adonabix / Buildflow.

## Features

- `/api/agent/turn` — streaming AI coding agent powered by **Groq**
- **Superagent safety-agent** Guard (prompt-injection blocking) + Redact (PII)
- Rate limiting, pino logging, Zod validation via `@workspace/api-zod`

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for code generation |
| `SUPERAGENT_API_KEY` | Optional | Superagent usage tracking (Guard works without it) |
| `PORT` | No | Default 5000 |

## Scripts

```bash
pnpm --filter @workspace/api-server run dev     # build + start
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run typecheck
```

Or from root: `pnpm dev:api`

## Safety

Incoming user messages are checked with Superagent Guard before being sent to Groq. If classified as `block`, the request is rejected with a friendly message. Optional Redact runs when `GROQ_API_KEY` is present (uses a lightweight Groq model).
