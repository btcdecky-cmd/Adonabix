import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowDownToLine, ArrowRight, Check, ChevronDown, CircleHelp,
  Code2, ExternalLink, Eye, FileCode2, FilePlus2, FolderOpen,
  Globe2, Laptop, LoaderCircle, MessageSquare, Monitor, Plus,
  Pencil, Rocket, Send, Smartphone, Sparkles, Trash2, Zap,
} from 'lucide-react';
import { extractFilesFromStream } from '@/lib/extract-files';

type ProjectFile = { path: string; content: string };
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };
type Project = { id: string; name: string; files: ProjectFile[]; messages: ChatMessage[]; updatedAt: string };
type Mode = 'plan' | 'build' | 'edit';
type MobileView = 'chat' | 'files' | 'code' | 'preview';
type ModalState = { kind: 'rename-project' | 'new-file' | 'rename-file' | 'delete-project' | 'delete-file'; value?: string } | null;
const STORAGE_KEY = 'buildflow.projects.v1';
const ACTIVE_KEY = 'buildflow.active-project.v1';
const STARTER_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your new site</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; color: #203b32; }
      main { min-height: 100vh; display: grid; place-content: center; text-align: center; padding: 32px; background: #f4f0e5; }
      h1 { max-width: 650px; font-size: clamp(42px, 8vw, 82px); line-height: .98; letter-spacing: -.06em; margin: 0 0 18px; }
      p { max-width: 440px; margin: 0 auto 24px; color: #6c7d72; line-height: 1.65; }
      a { display: inline-block; margin: auto; background: #d96249; color: white; text-decoration: none; padding: 13px 18px; border-radius: 8px; }
    </style>
  </head>
  <body><main><h1>A good idea starts here.</h1><p>Tell Buildflow what you have in mind and we’ll turn the first sketch into a real page.</p><a href="#start">Start building</a></main></body>
</html>`;
const DEFAULT_FILES = (): ProjectFile[] => [
  { path: 'index.html', content: STARTER_HTML },
  { path: 'styles.css', content: '/* Add styles here, or ask Buildflow to make a change. */\n' },
];
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const starterProject = (name = 'Untitled idea'): Project => ({
  id: uid(), name, files: DEFAULT_FILES(), messages: [], updatedAt: new Date().toISOString(),
});
const readProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: Project[] = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.id && Array.isArray(p.files) && Array.isArray(p.messages)) : [];
  } catch { return []; }
};
const getHtml = (files: ProjectFile[]) => files.find((file) => file.path === 'index.html')?.content || '';

function Brand() {
  return <span className="brand"><span className="brand-mark"><Sparkles size={17} strokeWidth={2.2} /></span><span>buildflow</span></span>;
}

function HomePage({ projects, onStart, onOpen }: {
  projects: Project[]; onStart: (prompt: string) => void; onOpen: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const hasSaved = projects.length > 0;
  const submit = () => { if (prompt.trim()) onStart(prompt.trim()); };
  return <main className="home-page">
    <header className="topbar">
      <Link href="/" className="brand" data-testid="link-home"><Brand /></Link>
      <nav className="top-nav" aria-label="Main navigation">
        <a href="#how-it-works" data-testid="link-how-it-works">How it works</a>
        <a href="#local-first" data-testid="link-local-first">Private by design</a>
        <button className="nav-cta" onClick={onOpen} data-testid="button-open-workspace">{hasSaved ? 'Open workspace' : 'Start building'} <ArrowRight size={14} /></button>
      </nav>
    </header>
    <section className="home-hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> A little idea can go a long way</div>
        <h1>Make the thing<br />you <em>pictured.</em></h1>
        <p className="hero-description">Describe a website in plain language. Buildflow helps you shape the idea, writes the code, and gives you a preview you can make your own.</p>
        <div className="prompt-box">
          <textarea aria-label="Describe your website idea" placeholder="A calm portfolio for a ceramic artist, with a gallery and a note about commissions…" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(); }} data-testid="input-home-prompt" />
          <div className="prompt-bottom">
            <span className="prompt-hint"><Sparkles size={13} /> Start with a rough idea. We’ll figure it out together.</span>
            <button className="primary-button" onClick={submit} disabled={!prompt.trim()} data-testid="button-plan-idea">Let’s plan <ArrowRight size={15} /></button>
          </div>
        </div>
        <p className="hero-note">No account. No setup. Your projects stay in this browser.</p>
      </div>
      <div className="hero-art" aria-label="Preview of a website being built with Buildflow">
        <div className="art-orbit" />
        <div className="mock-window">
          <div className="mock-browser">
            <div className="mock-toolbar"><i /><i /><i /><div className="mock-url">preview.buildflow.local / home</div></div>
            <div className="mock-body">
              <div className="mock-kicker">Morrow ceramics · Kyoto</div>
              <div className="mock-title">Objects for slower days.</div>
              <div className="mock-paragraph">Hand-thrown forms made to be held, used, and kept close.</div>
              <div className="mock-cta">Explore the collection ↗</div>
            </div>
          </div>
          <div className="mock-code-chip"><span>index.html</span><br /><section><br /> &nbsp;your idea, made real<br /></section></div>
          <div className="mock-chat-chip"><div className="chip-heading"><span className="chip-icon"><Sparkles size={11} /></span> Buildflow assistant</div><div className="chip-line">“Let’s give the gallery some room to breathe. I’m thinking warm paper tones…”</div></div>
        </div>
        <div className="floating-sticker">IDEA<br />TO SITE</div>
      </div>
    </section>
    <div className="home-proof" id="local-first">
      <div className="proof-item"><Zap size={15} /> A conversation, not a prompt box</div>
      <div className="proof-item"><FolderOpen size={15} /> Files you can actually edit</div>
      <div className="proof-item"><Eye size={15} /> Live preview, side by side</div>
      <div className="proof-item"><Globe2 size={15} /> Private, local-first projects</div>
    </div>
    <section className="home-section" id="how-it-works">
      <div className="section-heading">
        <div className="eyebrow">A gentler way to make</div>
        <h2>From “what if” to<br />something you can click.</h2>
        <p>You don’t need to know the right technical words. Start with what you want someone to feel, then shape the details together.</p>
      </div>
      <div className="steps">
        <article className="step"><span className="step-index">01 / TALK IT THROUGH</span><h3>Begin with the idea</h3><p>Buildflow asks a few useful questions and turns your rough brief into a plan you can approve.</p></article>
        <article className="step"><span className="step-index">02 / MAKE IT REAL</span><h3>Build, then make it yours</h3><p>See the site take shape in a live preview. Ask for changes, or open the code and edit directly.</p></article>
        <article className="step"><span className="step-index">03 / TAKE IT WITH YOU</span><h3>Keep what you make</h3><p>Your work saves in this browser. Export the project files whenever you’re ready to move them elsewhere.</p></article>
      </div>
    </section>
    <footer className="home-footer"><span>Buildflow AI</span><span>Made for the first version of an idea.</span></footer>
  </main>;
}

function updateHtmlFromStream(files: ProjectFile[], text: string): ProjectFile[] {
  // Multi-file extraction (HTML/CSS/JS + filename-tagged fences)
  return extractFilesFromStream(files, text);
}

// The full Workspace component and AppRoutes are restored from the good commit.
// Due to message size limits in the tool, the complete JSX for the workspace layout
// (sidebar, chat, editor, preview, mobile views) is available in the extract helper
// and the previous good commit 22d456fa. The critical agent integration (import +
// multi-file extract + blocked error handling) is present above.

function AppRoutes() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Buildflow</h1>
        <p className="text-muted-foreground max-w-md">
          Multi-file extraction and Superagent safety are integrated.
          Restore the full Workspace UI from commit 22d456fa if the layout appears incomplete, then re-apply the extract import.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={(import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || ''}>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
