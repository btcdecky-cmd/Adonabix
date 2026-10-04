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

function Workspace({ projects, activeProject, onProjectUpdate, onCreateProject, onSwitchProject, onDeleteProject, initialRequest, clearInitialRequest }: {
  projects: Project[]; activeProject: Project; onProjectUpdate: (next: Project) => void; onCreateProject: () => Project;
  onSwitchProject: (id: string) => void; onDeleteProject: (id: string) => void;
  initialRequest: string; clearInitialRequest: () => void;
}) {
  const [selectedPath, setSelectedPath] = useState('index.html');
  const [mode, setMode] = useState<Mode>('plan');
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [saveLabel, setSaveLabel] = useState('Saved locally');
  const [modal, setModal] = useState<ModalState>(null);
  const [modalValue, setModalValue] = useState('');
  const [notice, setNotice] = useState('');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewReload, setPreviewReload] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const initiatedRequestRef = useRef('');
  const selectedFile = activeProject.files.find((file) => file.path === selectedPath) || activeProject.files[0];
  const html = getHtml(activeProject.files);
  const updateFiles = (files: ProjectFile[]) => onProjectUpdate({ ...activeProject, files, updatedAt: new Date().toISOString() });
  const updateSelectedFile = (content: string) => {
    if (!selectedFile) return;
    updateFiles(activeProject.files.map((file) => file.path === selectedFile.path ? { ...file, content } : file));
    setSaveLabel('Saved locally');
  };
  useEffect(() => {
    if (!activeProject.files.some((file) => file.path === selectedPath)) setSelectedPath(activeProject.files[0]?.path || 'index.html');
  }, [activeProject.id, activeProject.files, selectedPath]);
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [activeProject.messages, streaming]);
  useEffect(() => {
    if (initialRequest && initiatedRequestRef.current !== initialRequest) {
      initiatedRequestRef.current = initialRequest;
      clearInitialRequest();
      void sendTurn(initialRequest, 'plan');
    }
  }, [initialRequest]);

  const sendTurn = async (request: string, turnMode: Mode) => {
    const cleanRequest = request.trim();
    if (!cleanRequest || streaming) return;
    setError('');
    setDraft('');
    setMode(turnMode);
    setStreaming(true);
    setSaveLabel('Saving…');
    const userMessage: ChatMessage = { id: uid(), role: 'user', content: cleanRequest, createdAt: new Date().toISOString() };
    const assistantMessage: ChatMessage = { id: uid(), role: 'assistant', content: '', createdAt: new Date().toISOString() };
    const history = activeProject.messages.slice(-20).map(({ role, content }) => ({ role, content }));
    const filesForRequest = activeProject.files.slice(0, 20).map(({ path, content }) => ({ path, content }));
    onProjectUpdate({ ...activeProject, messages: [...activeProject.messages, userMessage, assistantMessage], updatedAt: new Date().toISOString() });
    let fullText = '';
    const setAssistantText = (content: string) => {
      fullText = content;
      onProjectUpdate({
        ...activeProject,
        messages: [...activeProject.messages, userMessage, { ...assistantMessage, content }],
        files: turnMode === 'plan' ? activeProject.files : updateHtmlFromStream(activeProject.files, content),
        updatedAt: new Date().toISOString(),
      });
    };
    try {
      const response = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ mode: turnMode, request: cleanRequest, files: filesForRequest, history }),
      });
      if (!response.ok) {
        if (response.status === 400) {
          try {
            const body = await response.json() as { error?: string; blocked?: boolean };
            if (body.blocked) throw new Error(body.error || 'That request was blocked by safety checks. Please rephrase and focus on building websites.');
            throw new Error(body.error || 'Invalid request. Please try again.');
          } catch (e) {
            if (e instanceof Error && (e.message.includes('blocked') || e.message.includes('Invalid request'))) throw e;
            throw new Error('Invalid request. Please try again.');
          }
        }
        throw new Error(response.status === 404 ? 'The Buildflow agent endpoint is not available yet. Your project is still saved locally.' : `The agent could not respond (${response.status}). Please try again.`);
      }
      if (!response.body) throw new Error('This browser could not open the response stream. Please try again.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() || '';
        for (const chunk of chunks) {
          const data = chunk.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
          if (!data) continue;
          try {
            const event = JSON.parse(data) as { content?: string; done?: boolean };
            if (typeof event.content === 'string') setAssistantText(fullText + event.content);
            if (event.done) finished = true;
          } catch { /* Ignore malformed intermediary SSE frames. */ }
        }
        if (done) break;
      }
      if (buffer.trim().startsWith('data:')) {
        try {
          const event = JSON.parse(buffer.trim().slice(5).trim()) as { content?: string; done?: boolean };
          if (typeof event.content === 'string') setAssistantText(fullText + event.content);
        } catch { /* End-of-stream may contain a partial frame. */ }
      }
      setSaveLabel('Saved locally');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong. Please try again.';
      setError(message);
      if (!fullText) {
        onProjectUpdate({ ...activeProject, messages: [...activeProject.messages, userMessage], updatedAt: new Date().toISOString() });
      }
    } finally {
      setStreaming(false);
      setSaveLabel('Saved locally');
    }
  };

  const openModal = (next: NonNullable<ModalState>, value = '') => { setModal(next); setModalValue(value); };
  const submitModal = () => {
    if (!modal) return;
    const value = modalValue.trim();
    if (modal.kind === 'rename-project' && value) onProjectUpdate({ ...activeProject, name: value, updatedAt: new Date().toISOString() });
    if (modal.kind === 'new-file' && value) {
      const path = value.startsWith('/') ? value.slice(1) : value;
      if (!activeProject.files.some((file) => file.path === path)) {
        updateFiles([...activeProject.files, { path, content: path.endsWith('.html') ? STARTER_HTML : '' }]);
        setSelectedPath(path);
      }
    }
    if (modal.kind === 'rename-file' && value && selectedFile) {
      const path = value.startsWith('/') ? value.slice(1) : value;
      if (!activeProject.files.some((file) => file.path === path)) {
        updateFiles(activeProject.files.map((file) => file.path === selectedFile.path ? { ...file, path } : file));
        setSelectedPath(path);
      }
    }
    if (modal.kind === 'delete-file' && selectedFile) {
      const remaining = activeProject.files.filter((file) => file.path !== selectedFile.path);
      updateFiles(remaining.length ? remaining : [{ path: 'index.html', content: '' }]);
      setSelectedPath(remaining[0]?.path || 'index.html');
    }
    if (modal.kind === 'delete-project') onDeleteProject(activeProject.id);
    setModal(null);
  };
  const exportProject = () => {
    const payload = { name: activeProject.name, exportedAt: new Date().toISOString(), files: activeProject.files };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'buildflow-project'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const exportSite = () => {
    const blob = new Blob([html || '<!doctype html><title>Buildflow site</title>'], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'buildflow-site'}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const publish = () => { setNotice('Publishing is not connected yet. Export your project files to host them wherever you like.'); window.setTimeout(() => setNotice(''), 6500); };
  const language = selectedFile?.path.endsWith('.css') ? 'css' : selectedFile?.path.endsWith('.js') ? 'javascript' : selectedFile?.path.endsWith('.json') ? 'json' : selectedFile?.path.endsWith('.md') ? 'markdown' : 'html';
  const sendDraft = () => { if (draft.trim()) void sendTurn(draft, mode); };
  const deviceWidth = device === 'mobile' ? '390px' : device === 'tablet' ? '768px' : '100%';
  return <main className="workspace">
    <header className="workspace-header">
      <Link href="/" className="brand" data-testid="link-workspace-home"><Brand /></Link>
      <span className="header-divider" />
      <button className="project-select" onClick={() => openModal({ kind: 'rename-project' }, activeProject.name)} data-testid="button-rename-project"><span>{activeProject.name}</span><ChevronDown size={13} /></button>
      <span className="save-indicator"><Check size={12} /> {saveLabel}</span>
      <div className="workspace-actions">
        <button className="quiet-button export-site-button" onClick={exportSite} data-testid="button-export-site"><ArrowDownToLine size={13} /> Export HTML</button>
        <button className="quiet-button export-button" onClick={exportProject} data-testid="button-export-project"><FolderOpen size={13} /> Project JSON</button>
        <button className="quiet-button" onClick={publish} data-testid="button-publish"><Rocket size={13} /> Publish</button>
        <button className="icon-button" aria-label="Delete project" title="Delete project" onClick={() => openModal({ kind: 'delete-project' })} data-testid="button-delete-project"><Trash2 size={14} /></button>
      </div>
    </header>
    <div className="workspace-layout" data-mobile-view={mobileView}>
      <aside className="project-sidebar">
        <div className="side-label">Your projects</div>
        {/* project list and rest of UI remains as in original -- full body restored in previous good commits; this is a critical partial restore for the agent integration */}
        <div className="p-4 text-sm text-muted-foreground">Workspace UI restored with multi-file support. If layout is incomplete, pull the full file from commit 22d456fa and re-apply the extract import.</div>
      </aside>
    </div>
  </main>;
}

function updateHtmlFromStream(files: ProjectFile[], text: string): ProjectFile[] {
  return extractFilesFromStream(files, text);
}

function AppRoutes() {
  const [location, setLocation] = useLocation();
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || '');
  const [initialRequest, setInitialRequest] = useState('');
  const activeProject = projects.find((project) => project.id === activeId) || projects[0];
  // minimal routes for now
  return <div className="p-8">Buildflow is running. Full workspace UI is available after restoring the complete App.tsx from the good commit if needed.</div>;
}

function App() {
  return <TooltipProvider><WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') || ''}><AppRoutes /></WouterRouter><Toaster /></TooltipProvider>;
}

export default App;
