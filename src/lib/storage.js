const KEY_CURRENT = 'pipaflow_current';
const KEY_LIST = 'pipaflow_list';
const KEY_FLOW = (slug) => `pipaflow_flow_${slug}`;

export function loadCurrent() {
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCurrent(payload) {
  localStorage.setItem(KEY_CURRENT, JSON.stringify(payload));
}

export function loadList() {
  try {
    return JSON.parse(localStorage.getItem(KEY_LIST) || '[]');
  } catch {
    return [];
  }
}

export function saveFlow(name, nodes, edges) {
  const slug = slugify(name);
  const payload = { name, nodes, edges, savedAt: new Date().toISOString() };
  saveCurrent(payload);
  localStorage.setItem(KEY_FLOW(slug), JSON.stringify(payload));

  const list = loadList();
  const idx = list.findIndex((f) => f.id === slug);
  const meta = { id: slug, name, savedAt: payload.savedAt };
  if (idx >= 0) list[idx] = meta;
  else list.push(meta);
  localStorage.setItem(KEY_LIST, JSON.stringify(list));
  return list;
}

export function loadFlow(id) {
  try {
    const raw = localStorage.getItem(KEY_FLOW(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function deleteFlow(id) {
  localStorage.removeItem(KEY_FLOW(id));
  const list = loadList().filter((f) => f.id !== id);
  localStorage.setItem(KEY_LIST, JSON.stringify(list));
  return list;
}

function slugify(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}
