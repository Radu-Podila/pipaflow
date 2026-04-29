import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  GitBranch,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { getUser, getFile, saveFile, listCommits, getFileAtCommit } from '@/lib/github';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LS_TOKEN = 'pipaflow_gh_token';
const LS_REPO  = 'pipaflow_gh_repo';
const LS_PATH  = 'pipaflow_gh_path';

function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'acum';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

export function GitHubPanel({ flowName, nodes, edges, onLoad, onClose }) {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken]           = useState('');
  const [user, setUser]             = useState(null);
  const [repo, setRepo]             = useState('');
  const [filePath, setFilePath]     = useState('');
  const [fileSha, setFileSha]       = useState(null);
  const [commitMsg, setCommitMsg]   = useState('');
  const [commits, setCommits]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [status, setStatus]         = useState(null); // {type:'ok'|'err'|'busy', text}

  useEffect(() => {
    const t = localStorage.getItem(LS_TOKEN);
    const r = localStorage.getItem(LS_REPO);
    const p = localStorage.getItem(LS_PATH);
    if (r) setRepo(r);
    setFilePath(p || `flows/${(flowName || 'flow').toLowerCase().replace(/\s+/g, '-')}.json`);
    if (t) {
      setToken(t);
      getUser(t).then(setUser).catch(() => {
        localStorage.removeItem(LS_TOKEN);
      });
    }
  }, []);

  async function handleConnect() {
    const t = tokenInput.trim();
    if (!t) return;
    setStatus({ type: 'busy', text: 'Verifică token...' });
    try {
      const u = await getUser(t);
      setToken(t);
      setUser(u);
      setTokenInput('');
      localStorage.setItem(LS_TOKEN, t);
      setStatus({ type: 'ok', text: `Conectat ca @${u.login}` });
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    }
  }

  async function handleSave() {
    if (!repo.includes('/') || !filePath) return;
    setStatus({ type: 'busy', text: 'Se salvează...' });
    const [owner, repoName] = repo.split('/');
    const content = JSON.stringify({ version: 1, name: flowName, nodes, edges }, null, 2);
    const message = commitMsg.trim() || `Update ${flowName}`;
    try {
      let sha = fileSha;
      if (!sha) {
        const existing = await getFile(token, owner, repoName, filePath);
        sha = existing?.sha ?? null;
      }
      await saveFile(token, owner, repoName, filePath, content, message, sha);
      localStorage.setItem(LS_REPO, repo);
      localStorage.setItem(LS_PATH, filePath);
      setCommitMsg('');
      setStatus({ type: 'ok', text: 'Salvat pe GitHub ✓' });
      setTimeout(() => setStatus(null), 3000);
      const updated = await getFile(token, owner, repoName, filePath);
      setFileSha(updated?.sha ?? null);
      if (showHistory) await fetchCommits();
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    }
  }

  async function fetchCommits() {
    const [owner, repoName] = repo.split('/');
    setStatus({ type: 'busy', text: 'Încarcă istoricul...' });
    try {
      const data = await listCommits(token, owner, repoName, filePath);
      setCommits(data);
      setStatus(null);
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    }
  }

  async function handleLoadCommit(sha) {
    const [owner, repoName] = repo.split('/');
    setStatus({ type: 'busy', text: 'Încarcă versiunea...' });
    try {
      const text = await getFileAtCommit(token, owner, repoName, sha, filePath);
      onLoad(JSON.parse(text));
      setStatus({ type: 'ok', text: 'Versiune încărcată ✓' });
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    }
  }

  function disconnect() {
    setToken(''); setUser(null); setFileSha(null); setCommits([]);
    localStorage.removeItem(LS_TOKEN);
  }

  return (
    <div className="absolute right-0 top-0 z-[200] flex h-full w-[340px] flex-col border-l-[3px] border-black bg-white shadow-[-8px_0_0_0_#000]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[2.5px] border-black bg-black px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-white" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            GitHub · Versionare
          </span>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {!token ? (
          /* ── Connect ── */
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
              1. Generează un Personal Access Token
            </p>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Pipaflow"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-[2.5px] border-black bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_#000]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub → Tokens (Classic)
            </a>
            <p className="font-mono text-[9px] leading-relaxed text-[var(--color-fg-mute)]">
              Bifează <strong>repo</strong> pentru repo-uri private, sau <strong>public_repo</strong> pentru
              doar publice. Fine-grained PATs merg și mai bine — alege <em>Contents: Read &amp; Write</em>.
            </p>

            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
              2. Lipește token-ul
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full border-[2.5px] border-black p-2.5 font-mono text-[12px] shadow-[2px_2px_0_0_#000] placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-danger)] focus:outline-none"
            />
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={!tokenInput.trim()}
            >
              Conectează
            </Button>
          </div>
        ) : (
          /* ── Connected ── */
          <>
            {/* User badge */}
            <div className="flex items-center gap-3 border-[2.5px] border-black p-2.5 shadow-[2px_2px_0_0_#000]">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-8 w-8 border-[2px] border-black"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-bold">{user?.name || user?.login}</p>
                <p className="font-mono text-[9px] text-[var(--color-fg-mute)]">@{user?.login}</p>
              </div>
              <button
                onClick={disconnect}
                className="font-mono text-[9px] font-bold uppercase text-[var(--color-fg-mute)] hover:text-[var(--color-danger)]"
              >
                Logout
              </button>
            </div>

            {/* Repo + path */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
                Repository
              </label>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="username/repo-name"
                className="w-full border-[2.5px] border-black p-2 font-mono text-[12px] shadow-[2px_2px_0_0_#000] focus:border-black focus:outline-none"
              />
              <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
                Cale fișier în repo
              </label>
              <input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="flows/flow.json"
                className="w-full border-[2.5px] border-black p-2 font-mono text-[12px] shadow-[2px_2px_0_0_#000] focus:border-black focus:outline-none"
              />
            </div>

            {/* Commit message */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
                Mesaj commit
              </label>
              <input
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder={`Update ${flowName}`}
                className="w-full border-[2.5px] border-black p-2 font-mono text-[12px] shadow-[2px_2px_0_0_#000] focus:border-black focus:outline-none"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!repo.includes('/') || !filePath}
            >
              <Save className="h-3.5 w-3.5" /> Salvează versiune
            </Button>

            {/* History accordion */}
            <div className="border-[2.5px] border-black">
              <button
                onClick={() => {
                  const next = !showHistory;
                  setShowHistory(next);
                  if (next && repo.includes('/')) fetchCommits();
                }}
                className="flex w-full items-center justify-between px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Istoric versiuni
                </span>
                <span className="flex items-center gap-1.5">
                  {showHistory && (
                    <RefreshCw
                      className="h-3 w-3 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); fetchCommits(); }}
                    />
                  )}
                  {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>

              {showHistory && (
                <div className="max-h-[300px] divide-y-[1.5px] divide-black/15 overflow-y-auto border-t-[2px] border-black">
                  {commits.length === 0 ? (
                    <p className="px-3 py-3 font-mono text-[10px] text-[var(--color-fg-mute)]">
                      Niciun commit găsit pe această cale.
                    </p>
                  ) : (
                    commits.map((c) => (
                      <div
                        key={c.sha}
                        className="flex items-start gap-2 px-3 py-2.5 hover:bg-[var(--color-muted)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[10px] font-bold leading-tight">
                            {c.commit.message.split('\n')[0]}
                          </p>
                          <p className="mt-0.5 font-mono text-[9px] text-[var(--color-fg-mute)]">
                            {c.sha.slice(0, 7)} · {relativeDate(c.commit.author.date)} · {c.commit.author.name}
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoadCommit(c.sha)}
                          className="shrink-0 border-[2px] border-black px-2 py-0.5 font-mono text-[9px] font-bold uppercase hover:bg-black hover:text-white"
                        >
                          Load
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Status bar */}
        {status && (
          <div
            className={cn(
              'border-[2.5px] px-3 py-2 font-mono text-[10px] font-bold',
              status.type === 'ok'   && 'border-[#84cc16] bg-[#f7ffe0] text-[#3a5c00]',
              status.type === 'err'  && 'border-[var(--color-danger)] bg-[var(--color-danger-glow)] text-[var(--color-danger-deep)]',
              status.type === 'busy' && 'border-black bg-[var(--color-muted)] text-[var(--color-fg)]',
            )}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
