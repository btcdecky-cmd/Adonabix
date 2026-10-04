/**
 * Extract one or more project files from an AI assistant response.
 * Supports:
 *  - ```html / ```css / ```js / ```javascript / ```typescript fences
 *  - Filename hints inside the fence: HTML comments, CSS comments, or JS comments
 *  - Fallback: raw <!doctype / <html content treated as index.html
 */
export type ProjectFile = { path: string; content: string };

const FENCE_RE = /```(\w+)?\s*([\s\S]*?)(?:```|$)/gi;

function guessPathFromLang(lang: string | undefined, body: string): string {
  const lower = (lang || "").toLowerCase();
  // Explicit filename comments/markers
  const htmlComment = body.match(/<!--\s*([\w./-]+\.\w+)\s*-->/);
  if (htmlComment) return htmlComment[1];
  const cssComment = body.match(/\/\*\s*([\w./-]+\.\w+)\s*\*\//);
  if (cssComment) return cssComment[1];
  const jsComment = body.match(/\/\/\s*([\w./-]+\.\w+)/);
  if (jsComment) return jsComment[1];

  if (lower === "html" || lower === "htm") return "index.html";
  if (lower === "css") return "styles.css";
  if (lower === "js" || lower === "javascript") return "script.js";
  if (lower === "ts" || lower === "typescript") return "script.ts";
  if (lower === "json") return "data.json";
  if (lower === "md" || lower === "markdown") return "README.md";

  // Heuristic on content
  const trimmed = body.trimStart();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
    return "index.html";
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "data.json";
  return "index.html";
}

export function extractFilesFromStream(files: ProjectFile[], text: string): ProjectFile[] {
  const found = new Map<string, string>();
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(text)) !== null) {
    const lang = match[1];
    let body = (match[2] || "").trim();
    if (!body) continue;
    // Strip trailing fence leftovers
    body = body.replace(/```\s*$/, "").trim();
    const path = guessPathFromLang(lang, body);
    // Remove the filename marker line if present so it does not pollute the file
    body = body
      .replace(/^<!--\s*[\w./-]+\.\w+\s*-->\s*\n?/, "")
      .replace(/^\/\*\s*[\w./-]+\.\w+\s*\*\/\s*\n?/, "")
      .replace(/^\/\/\s*[\w./-]+\.\w+\s*\n?/, "")
      .trim();
    if (body) found.set(path, body);
  }

  // Fallback: entire response looks like raw HTML
  if (found.size === 0) {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
      found.set("index.html", text.trim());
    }
  }

  if (found.size === 0) return files;

  // Merge into existing file list (update matching paths, append new ones)
  const next = files.map((f) => {
    const updated = found.get(f.path);
    if (updated !== undefined) {
      found.delete(f.path);
      return { ...f, content: updated };
    }
    return f;
  });
  for (const [path, content] of found) {
    next.push({ path, content });
  }
  return next;
}
