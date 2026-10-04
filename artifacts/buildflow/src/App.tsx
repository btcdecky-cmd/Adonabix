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
          <textarea aria-label="Describe your website idea" placeholder="A calm portfolio for a ceramic artist, with a gallery and a note about commissions…" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(); }} data-testid="input-home-prompt" />
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
          <div className="mock-code-chip"><span>index.html</span><br />&lt;section&gt;<br /> &nbsp;your idea, made real<br />&lt;/section&gt;</div>
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
      if (!response.ok) throw new Error(response.status === 404 ? 'The Buildflow agent endpoint is not available yet. Your project is still saved locally.' : `The agent could not respond (${response.status}). Please try again.`);
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
        {projects.map((project) => <button key={project.id} className={`side-project ${project.id === activeProject.id ? 'active' : ''}`} onClick={() => onSwitchProject(project.id)} data-testid={`button-switch-project-${project.id}`}><span className="project-dot" /><span>{project.name}</span>{project.id === activeProject.id && <Check size={12} />}</button>)}
        <button className="side-project" onClick={() => onCreateProject()} data-testid="button-create-project"><Plus size={14} /><span>New project</span></button>
        <div className="side-section-head"><div className="side-label">Project files</div><button className="mini-icon" aria-label="Add file" title="Add file" onClick={() => openModal({ kind: 'new-file' }, 'new-file.txt')} data-testid="button-add-file"><FilePlus2 size={14} /></button></div>
        <div className="file-list">
          {activeProject.files.map((file) => <button className={`file-row ${selectedFile?.path === file.path ? 'active' : ''}`} key={file.path} onClick={() => setSelectedPath(file.path)} data-testid={`button-file-${file.path}`}><FileCode2 size={13} /><span>{file.path}</span></button>)}
        </div>
        <div className="side-bottom"><strong><Check size={11} /> Saved on this device</strong>Projects live in this browser. Export a copy before clearing site data.</div>
      </aside>
      <section className="chat-pane">
        <div className="pane-heading"><span>Build conversation</span><div className="mode-pill" aria-label="Agent mode">{(['plan', 'build', 'edit'] as Mode[]).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)} data-testid={`button-mode-${item}`}>{item}</button>)}</div></div>
        <div className="chat-scroll" ref={scrollerRef}>
          {activeProject.messages.length === 0 && <div className="welcome-card"><strong>Let’s make a first version.</strong>Tell me what you want to build. We’ll start with a plan, then you decide when it’s ready to become a site.</div>}
          {activeProject.messages.map((message, index) => <div className={`chat-message ${message.role}`} key={message.id} data-testid={`message-${message.role}-${message.id}`}>
            {message.role === 'assistant' && <div className="message-label"><Sparkles size={10} /> Buildflow</div>}
            {message.content || (streaming && index === activeProject.messages.length - 1 ? 'Thinking through the details…' : '')}
            {message.role === 'assistant' && mode === 'plan' && message.content && index === activeProject.messages.length - 1 && <button className="plan-approve" onClick={() => void sendTurn('The plan looks good. Please build the site now.', 'build')} disabled={streaming} data-testid="button-approve-plan"><Check size={13} /> Looks good — build it</button>}
          </div>)}
          {streaming && <div className="chat-message assistant"><div className="message-label"><LoaderCircle size={10} className="spin" /> Working</div></div>}
          {error && <div className="chat-error" role="alert" data-testid="status-agent-error">{error}<br /><button className="mini-icon" onClick={() => { const previous = [...activeProject.messages].reverse().find((message) => message.role === 'user'); if (previous) void sendTurn(previous.content, mode); }} data-testid="button-retry-agent">Try again</button></div>}
        </div>
        <div className="chat-composer">
          <div className="composer-box">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={mode === 'plan' ? 'Describe what you have in mind…' : 'Ask for a change or a new direction…'} onKeyDown={(event) => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) sendDraft(); }} data-testid="input-chat-message" />
            <div className="composer-bottom"><span className="composer-note">⌘ / Ctrl + Enter to send</span><button className="send-button" disabled={!draft.trim() || streaming} aria-label="Send message" onClick={sendDraft} data-testid="button-send-message">{streaming ? <LoaderCircle size={14} /> : <Send size={14} />}</button></div>
          </div>
        </div>
      </section>
      <section className="code-pane">
        <div className="code-toolbar"><span className="pane-title">Code</span><span className="file-breadcrumb"><ChevronDown size={11} /> {selectedFile?.path || 'index.html'}</span><span className="toolbar-spacer" /><button className="mini-icon" aria-label="Rename file" title="Rename file" onClick={() => selectedFile && openModal({ kind: 'rename-file' }, selectedFile.path)} data-testid="button-rename-file"><Pencil size={13} /></button><button className="mini-icon" aria-label="Delete file" title="Delete file" onClick={() => openModal({ kind: 'delete-file' })} data-testid="button-delete-file"><Trash2 size={13} /></button><span className="code-saved"><Check size={11} /> saved</span></div>
        <div className="editor-wrap">
          <Editor height="100%" language={language} value={selectedFile?.content || ''} theme="vs" onChange={(value) => updateSelectedFile(value || '')} options={{ minimap: { enabled: false }, fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 21, padding: { top: 14 }, scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true, renderLineHighlight: 'gutter', lineNumbersMinChars: 3, scrollbar: { verticalScrollbarSize: 7 } }} loading={<textarea className="editor-fallback" aria-label="Code editor" value={selectedFile?.content || ''} onChange={(event) => updateSelectedFile(event.target.value)} />} />
        </div>
      </section>
      <section className="preview-pane">
        <div className="preview-toolbar"><span className="pane-title">Preview</span><div className="toolbar-spacer" /><div className="preview-devices">
          <button className={device === 'desktop' ? 'active' : ''} aria-label="Desktop preview" title="Desktop" onClick={() => setDevice('desktop')} data-testid="button-preview-desktop"><Monitor size={13} /></button>
          <button className={device === 'tablet' ? 'active' : ''} aria-label="Tablet preview" title="Tablet" onClick={() => setDevice('tablet')} data-testid="button-preview-tablet"><Laptop size={13} /></button>
          <button className={device === 'mobile' ? 'active' : ''} aria-label="Mobile preview" title="Mobile" onClick={() => setDevice('mobile')} data-testid="button-preview-mobile"><Smartphone size={13} /></button>
        </div>
        <button className="mini-icon" aria-label="Reload preview" title="Reload preview" onClick={() => setPreviewReload((value) => value + 1)} data-testid="button-reload-preview"><ExternalLink size={13} /></button></div>
        <div className="preview-stage">
          {html ? <iframe key={previewReload} className="preview-frame" title="Live website preview" srcDoc={html} style={{ maxWidth: deviceWidth }} sandbox="allow-scripts allow-forms allow-modals" data-testid="iframe-live-preview" /> : <div className="preview-empty"><Eye size={23} /><div>Your live preview will appear here once there’s an index.html file.</div><button className="quiet-button" onClick={() => openModal({ kind: 'new-file' }, 'index.html')} data-testid="button-create-html">Create index.html</button></div>}
        </div>
      </section>
    </div>
    <nav className="mobile-tabs" aria-label="Workspace panels">
      {([
        ['chat', MessageSquare, 'Chat'], ['files', FolderOpen, 'Files'], ['code', Code2, 'Code'], ['preview', Eye, 'Preview'],
      ] as const).map(([id, Icon, label]) => <button key={id} className={mobileView === id ? 'active' : ''} onClick={() => setMobileView(id)} data-testid={`button-mobile-${id}`}><Icon size={16} />{label}</button>)}
    </nav>
    {notice && <div className="publish-notice" role="status" data-testid="status-publish-notice"><CircleHelp size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
    {modal && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="modal-card" role="dialog" aria-modal="true">
      <h3>{modal.kind === 'rename-project' ? 'Name this project' : modal.kind === 'new-file' ? 'Add a file' : modal.kind === 'rename-file' ? 'Rename file' : modal.kind === 'delete-file' ? 'Remove this file?' : 'Delete this project?'}</h3>
      <p>{modal.kind === 'delete-project' ? 'This project and its local chat history will be removed from this browser. This can’t be undone.' : modal.kind === 'delete-file' ? `“${selectedFile?.path}” will be removed from this project.` : modal.kind === 'new-file' ? 'Add a file path, including its extension, to your project.' : modal.kind === 'rename-file' ? 'Choose a new path for this file.' : 'Give your idea a name you’ll recognize.'}</p>
      {(modal.kind === 'rename-project' || modal.kind === 'new-file' || modal.kind === 'rename-file') && <input autoFocus value={modalValue} onChange={(event) => setModalValue(event.target.value)} onKeyDown={(event) => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === 'Enter') submitModal(); }} aria-label={modal.kind === 'rename-project' ? 'Project name' : 'File path'} data-testid="input-modal-value" />}
      <div className="modal-actions"><button onClick={() => setModal(null)} data-testid="button-modal-cancel">Cancel</button><button className="confirm" onClick={submitModal} data-testid="button-modal-confirm">{modal.kind.startsWith('delete') ? 'Delete' : 'Save'}</button></div>
    </section></div>}
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
  const createProject = useCallback((name?: string) => {
    const project = starterProject(name);
    setProjects((previous) => [project, ...previous]);
    setActiveId(project.id);
    return project;
  }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch { /* Browser storage may be full; editor remains usable in memory. */ } }, [projects]);
  useEffect(() => { if (activeProject && activeProject.id !== activeId) setActiveId(activeProject.id); }, [activeProject, activeId]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); else localStorage.removeItem(ACTIVE_KEY); }, [activeId]);
  useEffect(() => { if (location === '/workspace' && !activeProject) createProject(); }, [location, activeProject, createProject]);
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  }, []);
  const updateProject = useCallback((next: Project) => {
    setProjects((previous) => previous.map((project) => project.id === next.id ? next : project));
  }, []);
  const deleteProject = (id: string) => {
    const remaining = projects.filter((project) => project.id !== id);
    setProjects(remaining);
    const next = remaining[0] || starterProject();
    if (!remaining.length) setProjects([next]);
    setActiveId(next.id);
    if (location === '/') setLocation('/workspace');
  };
  const openWorkspace = () => {
    if (!activeProject) createProject();
    setLocation('/workspace');
  };
  const startWithPrompt = (prompt: string) => {
    const project = createProject(prompt.trim().slice(0, 32) || 'Untitled idea');
    setInitialRequest(prompt);
    setActiveId(project.id);
    setLocation('/workspace');
  };
  const workspace = activeProject ? <Workspace projects={projects} activeProject={activeProject} onProjectUpdate={updateProject} onCreateProject={() => createProject()} onSwitchProject={setActiveId} onDeleteProject={deleteProject} initialRequest={initialRequest} clearInitialRequest={() => setInitialRequest('')} /> : null;
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/"><HomePage projects={projects} onStart={startWithPrompt} onOpen={openWorkspace} /></Route>
    <Route path="/workspace">{workspace || <div className="workspace" />}</Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  return <TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRoutes /></WouterRouter><Toaster /></TooltipProvider>;
}

export default App;
