import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight as ArrowRightIcon,
  Download,
  FileJson,
  FilePlus2,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Redo2,
  Save,
  SaveAll,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';

import Hero from '@/components/Hero.jsx';
import { nodeTypes } from '@/components/nodes.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { layoutDagre } from '@/lib/layout.js';
import { exportPng, exportSvg } from '@/lib/exportImage.js';
import {
  loadCurrent,
  loadList,
  loadFlow,
  saveFlow,
  deleteFlow,
} from '@/lib/storage.js';
import {
  supportsFsAccess,
  openJsonFile,
  writeJsonToHandle,
  saveAsJsonFile,
} from '@/lib/fsAccess.js';

const HISTORY_LIMIT = 50;

const PALETTE = [
  { key: 'start',    kind: 'terminal', variant: 'start', label: 'Start',    dot: '#0a0a0a', sample: 'pill-w' },
  { key: 'action',   kind: 'box',                        label: 'Acțiune',  dot: '#0a0a0a', sample: 'box-w'  },
  { key: 'decision', kind: 'decision',                   label: 'Decizie?', dot: '#0a0a0a', sample: 'diamond' },
  { key: 'end',      kind: 'terminal', variant: 'end',   label: 'Final',    dot: '#e11d3f', sample: 'pill-r' },
  { key: 'note',     kind: 'sticky',                     label: 'Notă',     dot: '#fbbf24', sample: 'note'   },
];

// 60-30-10 fill palette — culori care păstrează tematica + 2 hazard accents (verde toxic + portocaliu flame)
const FILL_COLORS = [
  { key: 'reset',  label: 'Default', bg: null,      fg: null,      border: null,      hint: 'Resetează la culoarea default' },
  { key: 'snow',   label: 'Snow',    bg: '#fafafa', fg: '#0a0a0a', border: '#0a0a0a', hint: 'Off-white' },
  { key: 'ash',    label: 'Ash',     bg: '#e5e5e5', fg: '#0a0a0a', border: '#0a0a0a', hint: 'Gri deschis' },
  { key: 'butter', label: 'Butter',  bg: '#fff8c5', fg: '#0a0a0a', border: '#0a0a0a', hint: 'Galben sticky' },
  { key: 'flame',  label: 'Flame',   bg: '#ea580c', fg: '#ffffff', border: '#0a0a0a', hint: 'Portocaliu hazard' },
  { key: 'blush',  label: 'Blush',   bg: '#fce7e8', fg: '#0a0a0a', border: '#0a0a0a', hint: 'Roșu washed' },
  { key: 'danger', label: 'Danger',  bg: '#e11d3f', fg: '#ffffff', border: '#0a0a0a', hint: 'Roșu plin' },
  { key: 'wine',   label: 'Wine',    bg: '#7a0e22', fg: '#ffffff', border: '#0a0a0a', hint: 'Roșu închis' },
  { key: 'toxic',  label: 'Toxic',   bg: '#84cc16', fg: '#0a0a0a', border: '#0a0a0a', hint: 'Verde toxic' },
  { key: 'noir',   label: 'Noir',    bg: '#0a0a0a', fg: '#ffffff', border: '#0a0a0a', hint: 'Negru' },
];

const initialNodes = [
  {
    id: 'n-start',
    type: 'terminal',
    data: { label: 'Început', variant: 'start' },
    position: { x: 280, y: 60 },
  },
];

function makeId(prefix = 'n') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function buildNode(preset, position) {
  const id = makeId();
  if (preset.kind === 'sticky') {
    return { id, type: 'sticky', data: { label: preset.label }, position };
  }
  if (preset.kind === 'decision') {
    return { id, type: 'decision', data: { label: preset.label }, position };
  }
  if (preset.kind === 'terminal') {
    return {
      id,
      type: 'terminal',
      data: { label: preset.label, variant: preset.variant },
      position,
    };
  }
  // box (action)
  return { id, type: 'box', data: { label: preset.label }, position };
}

// Backwards-compat: convert legacy default nodes (din versiunea pre-Tailwind) la box
function migrateNodes(arr) {
  return arr.map((n) => {
    if (!n.type || n.type === 'default') {
      const fillFromStyle =
        n.style && n.style.background
          ? { bg: n.style.background, fg: n.style.color, border: n.style.borderColor }
          : undefined;
      return {
        ...n,
        type: 'box',
        data: { ...n.data, ...(fillFromStyle ? { fillColor: fillFromStyle } : {}) },
        style: undefined,
      };
    }
    return n;
  });
}

function PaletteSample({ kind }) {
  const base = 'inline-block border-[2px] border-black';
  if (kind === 'pill-w') return <span className={cn(base, 'h-3 w-5 rounded-full bg-white')} />;
  if (kind === 'pill-r') return <span className={cn(base, 'h-3 w-5 rounded-full bg-[var(--color-danger)]')} />;
  if (kind === 'box-w') return <span className={cn(base, 'h-3 w-3 bg-white')} />;
  if (kind === 'diamond')
    return <span className={cn(base, 'h-3 w-3 rotate-45 bg-white')} />;
  if (kind === 'note') return <span className={cn(base, 'h-3 w-3 bg-[#fff8c5] -rotate-6')} />;
  return null;
}

function FlowInner({ onBackToHero }) {
  const rf = useReactFlow();
  const wrapperRef = useRef(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([]);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [savedFlows, setSavedFlows] = useState([]);
  const [currentName, setCurrentName] = useState('Flow nou');

  const past = useRef([]);
  const future = useRef([]);
  const [, forceTick] = useState(0);
  const bumpUi = () => forceTick((t) => t + 1);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const fileHandleRef = useRef(null);
  const [linkedFile, setLinkedFile] = useState(null);
  const legacyImportInputRef = useRef(null);
  const clipboardRef = useRef(null);
  const mousePosRef = useRef(null);

  const snapshot = useCallback(() => {
    past.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    bumpUi();
  }, [nodes, edges]);

  useEffect(() => {
    const cur = loadCurrent();
    if (cur) {
      if (cur.nodes) setNodes(migrateNodes(cur.nodes));
      if (cur.edges) setEdges(cur.edges);
      if (cur.name) setCurrentName(cur.name);
    }
    setSavedFlows(loadList());
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback(
    (params) => {
      snapshot();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: false,
            style: { strokeWidth: 2.5, stroke: '#0a0a0a' },
            interactionWidth: 24,
          },
          eds,
        ),
      );
    },
    [snapshot],
  );

  const onEdgeDoubleClick = useCallback(
    (_, edge) => {
      snapshot();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [snapshot],
  );

  const addNode = (preset, atFlowPos = null) => {
    snapshot();
    let position;
    if (atFlowPos) {
      position = { x: atFlowPos.x - 70, y: atFlowPos.y - 20 };
    } else {
      const center = wrapperRef.current
        ? rf.screenToFlowPosition({
            x: wrapperRef.current.clientWidth / 2,
            y: wrapperRef.current.clientHeight / 2,
          })
        : { x: 200, y: 200 };
      position = {
        x: center.x - 90 + Math.random() * 60,
        y: center.y - 30 + Math.random() * 60,
      };
    }
    setNodes((nds) => [...nds, buildNode(preset, position)]);
  };

  const onPaneContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const menuW = 220;
      const menuH = 280;
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      setContextMenu({
        x: Math.min(localX, rect.width - menuW - 8),
        y: Math.min(localY, rect.height - menuH - 8),
        flowPos,
      });
    },
    [rf],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setNodeMenu(null);
  }, []);

  const onNodeContextMenu = useCallback(
    (e, node) => {
      e.preventDefault();
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const menuW = 240;
      const menuH = 240;
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      setContextMenu(null);
      setNodeMenu({
        x: Math.min(localX, rect.width - menuW - 8),
        y: Math.min(localY, rect.height - menuH - 8),
        nodeId: node.id,
      });
    },
    [],
  );

  const setNodeFill = (nodeId, color) => {
    snapshot();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        if (color.key === 'reset') {
          const { background, color: _c, borderColor, ...restStyle } = n.style || {};
          const newData = { ...n.data };
          delete newData.fillColor;
          return { ...n, data: newData, style: restStyle };
        }
        const fill = { bg: color.bg, fg: color.fg, border: color.border };
        if (n.type === 'default' || !n.type) {
          return {
            ...n,
            style: {
              ...(n.style || {}),
              background: color.bg,
              color: color.fg,
              borderColor: color.border,
            },
          };
        }
        return { ...n, data: { ...n.data, fillColor: fill } };
      }),
    );
  };

  const deleteNodeById = (nodeId) => {
    snapshot();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
    );
  };

  const duplicateNodeById = (nodeId) => {
    const orig = nodes.find((n) => n.id === nodeId);
    if (!orig) return;
    snapshot();
    const copy = {
      ...orig,
      id: makeId(),
      position: { x: orig.position.x + 30, y: orig.position.y + 30 },
      selected: false,
    };
    setNodes((nds) => [...nds, copy]);
  };

  const onNodeDoubleClick = (_, node) => setEditingNodeId(node.id);

  const updateNodeLabel = (id, label) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
    );
  };

  const deleteSelected = () => {
    const hasSelection =
      nodes.some((n) => n.selected) || edges.some((e) => e.selected);
    if (!hasSelection) return;
    snapshot();
    const removedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) =>
      eds.filter(
        (e) => !e.selected && !removedIds.has(e.source) && !removedIds.has(e.target),
      ),
    );
  };

  const copySelection = () => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (!selectedNodes.length) return;
    const ids = new Set(selectedNodes.map((n) => n.id));
    const internalEdges = edges.filter(
      (e) => ids.has(e.source) && ids.has(e.target),
    );
    clipboardRef.current = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(internalEdges),
    };
  };

  const pasteFromClipboard = () => {
    const clip = clipboardRef.current;
    if (!clip || !clip.nodes.length) return;
    snapshot();

    const minX = Math.min(...clip.nodes.map((n) => n.position.x));
    const minY = Math.min(...clip.nodes.map((n) => n.position.y));

    let target;
    if (mousePosRef.current) {
      target = rf.screenToFlowPosition(mousePosRef.current);
    } else {
      target = { x: minX + 40, y: minY + 40 };
    }

    const idMap = new Map();
    const newNodes = clip.nodes.map((n) => {
      const newId = makeId();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: {
          x: target.x + (n.position.x - minX),
          y: target.y + (n.position.y - minY),
        },
        selected: true,
      };
    });
    const newEdges = clip.edges.map((e) => ({
      ...e,
      id: makeId('e'),
      source: idMap.get(e.source),
      target: idMap.get(e.target),
      selected: false,
    }));

    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges((eds) => [
      ...eds.map((e) => ({ ...e, selected: false })),
      ...newEdges,
    ]);
  };

  const undo = () => {
    if (!past.current.length) return;
    const prev = past.current.pop();
    future.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    setNodes(prev.nodes);
    setEdges(prev.edges);
    bumpUi();
  };

  const redo = () => {
    if (!future.current.length) return;
    const next = future.current.pop();
    past.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    setNodes(next.nodes);
    setEdges(next.edges);
    bumpUi();
  };

  const isTypingTarget = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (editingNodeId || isTypingTarget(e.target)) return;

      const meta = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (meta && k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((meta && k === 'z' && e.shiftKey) || (meta && k === 'y')) {
        e.preventDefault();
        redo();
      } else if (meta && k === 'c') {
        e.preventDefault();
        copySelection();
      } else if (meta && k === 'v') {
        e.preventDefault();
        pasteFromClipboard();
      } else if (meta && k === 'd') {
        e.preventDefault();
        copySelection();
        pasteFromClipboard();
      } else if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      } else if (e.key === 'Escape') {
        setContextMenu(null);
        setNodeMenu(null);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    const onBlur = () => setSpaceHeld(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [editingNodeId]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  const detachFile = () => {
    fileHandleRef.current = null;
    setLinkedFile(null);
  };

  const handleSave = async () => {
    const list = saveFlow(currentName, nodes, edges);
    setSavedFlows(list);
    if (fileHandleRef.current) {
      try {
        await writeJsonToHandle(fileHandleRef.current, {
          name: currentName,
          nodes,
          edges,
        });
      } catch (err) {
        alert('Nu am putut scrie în fișier: ' + err.message);
      }
    }
  };

  const openFile = async () => {
    if (!supportsFsAccess) {
      legacyImportInputRef.current?.click();
      return;
    }
    try {
      const result = await openJsonFile();
      if (!result) return;
      const parsed = JSON.parse(result.text);
      snapshot();
      if (parsed.nodes) setNodes(migrateNodes(parsed.nodes));
      if (parsed.edges) setEdges(parsed.edges);
      if (parsed.name) setCurrentName(parsed.name);
      fileHandleRef.current = result.handle;
      setLinkedFile(result.name);
    } catch (err) {
      alert('Nu am putut deschide fișierul: ' + err.message);
    }
  };

  const saveAs = async () => {
    if (!supportsFsAccess) {
      exportJson();
      return;
    }
    try {
      const result = await saveAsJsonFile(`${currentName || 'flow'}.json`, {
        name: currentName,
        nodes,
        edges,
      });
      if (!result) return;
      fileHandleRef.current = result.handle;
      setLinkedFile(result.name);
      const list = saveFlow(currentName, nodes, edges);
      setSavedFlows(list);
    } catch (err) {
      alert('Nu am putut salva: ' + err.message);
    }
  };

  const handleLoad = (id) => {
    const data = loadFlow(id);
    if (!data) return;
    snapshot();
    setNodes(migrateNodes(data.nodes || []));
    setEdges(data.edges || []);
    setCurrentName(data.name || id);
    detachFile();
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!confirm('Șterg flowul „' + id + '"?')) return;
    setSavedFlows(deleteFlow(id));
  };

  const handleNew = () => {
    snapshot();
    setNodes(initialNodes);
    setEdges([]);
    setCurrentName('Flow nou');
    detachFile();
  };

  const exportJson = () => {
    const data = JSON.stringify({ name: currentName, nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentName || 'flow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        snapshot();
        if (parsed.nodes) setNodes(migrateNodes(parsed.nodes));
        if (parsed.edges) setEdges(parsed.edges);
        if (parsed.name) setCurrentName(parsed.name);
        detachFile();
        if (!supportsFsAccess) {
          setLinkedFile(`${file.name} (read-only)`);
        }
      } catch (err) {
        alert('JSON invalid: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const autoLayout = (direction = 'TB') => {
    snapshot();
    const laid = layoutDagre(nodes, edges, direction);
    setNodes(laid);
    requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 300 }));
  };

  const editingNode = nodes.find((n) => n.id === editingNodeId);
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const nodeTypesMemo = useMemo(() => nodeTypes, []);

  // ─── Toolbar group divider ───
  const Divider = () => <span className="mx-1 hidden h-6 w-[2px] bg-black/20 sm:inline-block" />;

  return (
    <div className="flex h-screen w-full flex-col bg-white text-[var(--color-fg)]">
      {/* ───── Top bar ───── */}
      <header className="flex flex-wrap items-center gap-2 border-b-[3px] border-black bg-white px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBackToHero}>
          <ArrowLeft className="h-3.5 w-3.5" /> Acasă
        </Button>

        <Divider />

        <Input
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          placeholder="Numele flowului"
          className="w-44 sm:w-56"
        />

        {linkedFile && (
          <span
            title="Fișier legat — Salvează scrie aici"
            className="inline-flex h-9 max-w-[280px] items-center gap-1.5 truncate border-[2.5px] border-[var(--color-danger)] bg-[var(--color-danger-glow)] px-2.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-danger-deep)] shadow-[2px_2px_0_0_var(--color-danger-deep)]"
          >
            ⌁ {linkedFile}
            <button
              onClick={detachFile}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center hover:bg-[var(--color-danger)] hover:text-white"
              title="Detașează"
            >
              <X className="h-3 w-3" strokeWidth={3} />
            </button>
          </span>
        )}

        <Divider />

        <Button onClick={handleNew} title="Flow nou">
          <FilePlus2 className="h-3.5 w-3.5" /> Nou
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          title={fileHandleRef.current ? `Salvează în ${linkedFile} + localStorage` : 'Salvează în localStorage'}
        >
          <Save className="h-3.5 w-3.5" /> Salvează
        </Button>

        <Divider />

        <Button size="icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </Button>

        <Divider />

        <Button onClick={() => autoLayout('TB')} title="Aranjează vertical">
          <ArrowDown className="h-3.5 w-3.5" /> Aranjează
        </Button>
        <Button onClick={() => autoLayout('LR')} title="Aranjează orizontal">
          <ArrowRightIcon className="h-3.5 w-3.5" /> Orizontal
        </Button>

        <Divider />

        <Button onClick={openFile} title="Deschide JSON din disk">
          <FolderOpen className="h-3.5 w-3.5" /> Deschide
        </Button>
        <Button onClick={saveAs} title="Salvează ca fișier nou pe disk">
          <SaveAll className="h-3.5 w-3.5" /> Save as
        </Button>

        <Divider />

        <Button onClick={exportJson} size="icon" title="Export JSON">
          <FileJson className="h-4 w-4" />
        </Button>
        <Button onClick={() => exportPng(currentName, nodes)} size="icon" title="Export PNG">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button onClick={() => exportSvg(currentName, nodes)} size="icon" title="Export SVG">
          <Download className="h-4 w-4" />
        </Button>

        <input
          ref={legacyImportInputRef}
          type="file"
          accept=".json"
          onChange={importJson}
          hidden
        />

        <span className="ml-auto" />

        <Button variant="danger" onClick={deleteSelected} title="Șterge selecția (Delete)">
          <Trash2 className="h-3.5 w-3.5" /> Șterge
        </Button>
      </header>

      {/* ───── Palette ───── */}
      <section className="flex flex-wrap items-center gap-2 border-b-[2.5px] border-black bg-[var(--color-card)] px-4 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-fg-soft)]">
          Adaugă →
        </span>
        {PALETTE.map((p) => (
          <button
            key={p.key}
            onClick={() => addNode(p)}
            className={cn(
              'inline-flex items-center gap-2 h-8 px-3',
              'border-[2.5px] border-black bg-white',
              'font-bold text-[11px] uppercase tracking-wider',
              'shadow-[2px_2px_0_0_#000]',
              'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_0_#000]',
              'hover:bg-[var(--color-danger)] hover:text-white hover:border-black',
              'active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_#000]',
              'transition-[transform,box-shadow,background] duration-100',
            )}
          >
            <PaletteSample kind={p.sample} />
            {p.label}
          </button>
        ))}
      </section>

      {/* ───── Saved flows ───── */}
      {savedFlows.length > 0 && (
        <section className="flex flex-wrap items-center gap-2 border-b-[2.5px] border-black bg-white px-4 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-fg-soft)]">
            Salvate ↘
          </span>
          {savedFlows.map((f) => (
            <button
              key={f.id}
              onClick={() => handleLoad(f.id)}
              className="group inline-flex h-7 items-center gap-2 border-[2px] border-black bg-white pr-1 pl-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-black hover:text-white"
            >
              {f.name}
              <span
                onClick={(e) => handleDelete(f.id, e)}
                className="inline-flex h-5 w-5 items-center justify-center hover:bg-[var(--color-danger)] hover:text-white group-hover:text-white"
              >
                ×
              </span>
            </button>
          ))}
        </section>
      )}

      {/* ───── Canvas ───── */}
      <div
        ref={wrapperRef}
        className={cn(
          'relative flex-1 min-h-0',
          spaceHeld
            ? '[&_.react-flow__pane]:!cursor-grab [&_.react-flow__pane:active]:!cursor-grabbing'
            : '[&_.react-flow__pane]:!cursor-crosshair',
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypesMemo}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStart={snapshot}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={closeContextMenu}
          onMoveStart={closeContextMenu}
          defaultEdgeOptions={{
            style: { strokeWidth: 2.5, stroke: '#0a0a0a' },
            interactionWidth: 24,
          }}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
          snapToGrid
          snapGrid={[10, 10]}
          panOnDrag={spaceHeld}
          selectionOnDrag={!spaceHeld}
          selectionMode={SelectionMode.Partial}
        >
          <Background gap={24} size={1.5} color="#0a0a0a" style={{ opacity: 0.08 }} />
          <Controls />
          <MiniMap pannable zoomable maskColor="rgba(10,10,10,0.85)" />
        </ReactFlow>

        {/* Edit text modal */}
        {editingNode && (
          <div
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50"
            onClick={() => setEditingNodeId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[420px] max-w-[90vw] border-[3px] border-black bg-white shadow-[8px_8px_0_0_#000]"
            >
              <div className="flex items-center justify-between border-b-[2.5px] border-black bg-[var(--color-danger)] px-4 py-2 text-white">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">
                  ▲ Editează text
                </span>
                <button
                  onClick={() => setEditingNodeId(null)}
                  className="hover:opacity-70"
                  title="Închide (Esc)"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <textarea
                  autoFocus
                  rows={4}
                  value={editingNode.data.label || ''}
                  onChange={(e) => updateNodeLabel(editingNode.id, e.target.value)}
                  className="w-full border-[2.5px] border-black bg-white p-3 font-sans text-sm font-medium shadow-[3px_3px_0_0_#000] focus:border-[var(--color-danger)] focus:shadow-[3px_3px_0_0_var(--color-danger-deep)] focus:outline-none"
                />
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => setEditingNodeId(null)}>
                    Gata
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pane context menu (right-click pe canvas) */}
        {contextMenu && (
          <div
            className="absolute z-[90] w-[220px] border-[2.5px] border-black bg-white p-1 shadow-[6px_6px_0_0_#000]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="border-b-2 border-black bg-black px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white">
              Adaugă bulă aici
            </div>
            {PALETTE.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  addNode(p, contextMenu.flowPos);
                  setContextMenu(null);
                }}
                className="group flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider hover:bg-[var(--color-danger)] hover:text-white"
              >
                <PaletteSample kind={p.sample} />
                {p.label}
                <Plus className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100" strokeWidth={3} />
              </button>
            ))}
          </div>
        )}

        {/* Node context menu (right-click pe bulă) */}
        {nodeMenu && (
          <div
            className="absolute z-[90] w-[240px] border-[2.5px] border-black bg-white p-1 shadow-[6px_6px_0_0_#000]"
            style={{ left: nodeMenu.x, top: nodeMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="border-b-2 border-black bg-black px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white">
              Bulă · Acțiuni
            </div>

            <button
              onClick={() => {
                setEditingNodeId(nodeMenu.nodeId);
                setNodeMenu(null);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider hover:bg-[var(--color-fg)] hover:text-white"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center border-2 border-current font-mono text-[9px]">A</span>
              Editează text
            </button>

            <button
              onClick={() => {
                duplicateNodeById(nodeMenu.nodeId);
                setNodeMenu(null);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider hover:bg-[var(--color-fg)] hover:text-white"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center border-2 border-current font-mono text-[9px]">+</span>
              Duplică
            </button>

            <div className="my-1 h-[2px] bg-black" />

            <div className="px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--color-fg-soft)]">
              Umple cu
            </div>
            <div className="grid grid-cols-5 gap-1 px-2 pb-2">
              {FILL_COLORS.map((c) => (
                <button
                  key={c.key}
                  title={`${c.label} — ${c.hint}`}
                  onClick={() => {
                    setNodeFill(nodeMenu.nodeId, c);
                    setNodeMenu(null);
                  }}
                  className={cn(
                    'group relative h-9 w-full border-[2.5px] border-black',
                    'transition-transform duration-100 hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_#000]',
                  )}
                  style={
                    c.key === 'reset'
                      ? {
                          backgroundImage:
                            'repeating-linear-gradient(45deg, #fff 0 4px, #e5e5e5 4px 8px)',
                        }
                      : { background: c.bg }
                  }
                >
                  {c.key === 'reset' && (
                    <X
                      className="absolute inset-0 m-auto h-4 w-4"
                      strokeWidth={3}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="my-1 h-[2px] bg-black" />

            <button
              onClick={() => {
                deleteNodeById(nodeMenu.nodeId);
                setNodeMenu(null);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              Șterge
            </button>
          </div>
        )}
      </div>

      {/* ───── Status bar ───── */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-black bg-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
        <span className="text-white/80">
          drag = select · <span className="text-[var(--color-danger)]">space</span>+drag = pan · right-click = meniu · ctrl+c/v = copy/paste · ctrl+d = duplică · ctrl+z = undo · 2× click pe edge = șterge
        </span>
        <span className="text-white/40">
          {nodes.length} noduri · {edges.length} edges
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'hero';
    const seen = localStorage.getItem('pipaflow_seen_hero');
    return seen === '1' ? 'editor' : 'hero';
  });

  const goEditor = () => {
    localStorage.setItem('pipaflow_seen_hero', '1');
    setView('editor');
  };

  if (view === 'hero') {
    return <Hero onStart={goEditor} />;
  }

  return (
    <ReactFlowProvider>
      <FlowInner onBackToHero={() => setView('hero')} />
    </ReactFlowProvider>
  );
}
