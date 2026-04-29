const API = 'https://api.github.com';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary);
}

function b64decode(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getUser(token) {
  const r = await fetch(`${API}/user`, { headers: headers(token) });
  if (!r.ok) throw new Error('Token invalid sau fără permisiuni.');
  return r.json();
}

export async function getFile(token, owner, repo, path) {
  const r = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: headers(token),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
  const data = await r.json();
  return { content: b64decode(data.content), sha: data.sha };
}

export async function saveFile(token, owner, repo, path, content, message, sha) {
  const body = { message, content: b64encode(content), ...(sha ? { sha } : {}) };
  const r = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `GitHub ${r.status}`);
  }
  return r.json();
}

export async function listCommits(token, owner, repo, path) {
  const r = await fetch(
    `${API}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=30`,
    { headers: headers(token) },
  );
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
  return r.json();
}

export async function getFileAtCommit(token, owner, repo, sha, path) {
  const r = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${path}?ref=${sha}`,
    { headers: headers(token) },
  );
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
  const data = await r.json();
  return b64decode(data.content);
}
