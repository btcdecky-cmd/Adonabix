# @workspace/buildflow

Vite + React frontend for Adonabix (branded as Buildflow).

## Features

- Local-first projects (saved in browser `localStorage`)
- Monaco editor, live HTML preview, chat with the AI agent
- Multi-file support via `src/lib/extract-files.ts` (HTML / CSS / JS fences + filename hints)
- Responsive / mobile view switcher (`chat` | `files` | `code` | `preview`)
- PWA bits (manifest, service worker)

## Scripts

```bash
pnpm --filter @workspace/buildflow run dev
pnpm --filter @workspace/buildflow run build
pnpm --filter @workspace/buildflow run typecheck
```

Or from root: `pnpm dev:web`

## Multi-file extraction

The helper `extractFilesFromStream` parses AI responses for:

- ` ```html `, ` ```css `, ` ```js ` fences
- Filename markers such as `<!-- index.html -->`, `/* styles.css */`, `// script.js`

It merges the extracted files into the current project.

## Note on App.tsx

If `App.tsx` was truncated during a previous automated edit, restore it from commit `22d456fae97b0fc75e84f6a7c768a22de2529f57` (or the parent of the broken commit) and re-add:

```ts
import { extractFilesFromStream } from '@/lib/extract-files';
```

and replace the body of `updateHtmlFromStream` with:

```ts
return extractFilesFromStream(files, text);
```
