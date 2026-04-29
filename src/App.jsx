import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
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
  Bot,
  Check,
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
import { buildAiPrompt } from '@/lib/aiPrompt.js';

const HISTORY_LIMIT = 50;

const ARROW = { type: MarkerType.ArrowClosed, color: '#0a0a0a', width: 18, height: 18 };
const ARROW_FROM = { ...ARROW };

function migrateEdges(arr) {
  return arr.map((e) => (e.markerEnd || e.markerStart ? e : { ...e, markerEnd: { ...ARROW } }));
}

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
  const [editingEdgeId, setEditingEdgeId] = useState(null);
  const [savedFlows, setSavedFlows] = useState([]);
  const [currentName, setCurrentName] = useState('Flow nou');

  const past = useRef([]);
  const future = useRef([]);
  const [, forceTick] = useState(0);
  const bumpUi = () => forceTick((t) => t + 1);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const fileHandleRef = useRef(null);
  const [linkedFile, setLinkedFile] = useState(null);
  const legacyImportInputRef = useRef(null);
  const clipboardRef = useRef(null);
  const mousePosRef = useRef(null);
  const [aiCopied, setAiCopied] = useState(false);

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
      if (cur.edges) setEdges(migrateEdges(cur.edges));
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
            markerEnd: { ...ARROW },
          },
          eds,
        ),
      );
    },
    [snapshot],
  );

  const onEdgeDoubleClick = useCallback(
    (e, edge) => {
      if (e.shiftKey) {
        snapshot();
        setEdges((eds) => eds.filter((ed) => ed.id !== edge.id));
        return;
      }
      setEditingEdgeId(edge.id);
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
    setEdgeMenu(null);
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

  const onEdgeContextMenu = useCallback(
    (e, edge) => {
      e.preventDefault();
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const menuW = 220;
      const menuH = 220;
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      setContextMenu(null);
      setNodeMenu(null);
      setEdgeMenu({
        x: Math.min(localX, rect.width - menuW - 8),
        y: Math.min(localY, rect.height - menuH - 8),
        edgeId: edge.id,
      });
      // Selectează edge-ul ca să se vadă feedback-ul
      setEdges((eds) =>
        eds.map((ed) => ({ ...ed, selected: ed.id === edge.id })),
      );
    },
    [],
  );

  const setEdgeStyle = (edgeId, kind) => {
    snapshot();
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== edgeId) return e;
        const baseStyle = { strokeWidth: 2.5, stroke: '#0a0a0a' };
        if (kind === 'solid') {
          const { strokeDasharray, ...rest } = e.style || {};
          return { ...e, animated: false, style: { ...baseStyle, ...rest } };
        }
        if (kind === 'dashed') {
          return {
            ...e,
            animated: false,
            style: { ...baseStyle, ...(e.style || {}), strokeDasharray: '8 4' },
          };
        }
        if (kind === 'dotted') {
          return {
            ...e,
            animated: false,
            style: { ...baseStyle, ...(e.style || {}), strokeDasharray: '2 4' },
          };
        }
        if (kind === 'animated') {
          return {
            ...e,
            animated: true,
            style: { ...baseStyle, ...(e.style || {}) },
          };
        }
        return e;
      }),
    );
  };

  const updateEdgeLabel = (id, label) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== id) return e;
        const trimmed = (label ?? '').trim();
        if (!trimmed) {
          const { label: _l, labelStyle, labelBgStyle, labelBgPadding, labelBgBorderRadius, ...rest } = e;
          return rest;
        }
        return {
          ...e,
          label: trimmed,
          labelStyle: { fill: '#ffffff', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 },
          labelBgStyle: { fill: '#0a0a0a', stroke: '#0a0a0a', strokeWidth: 2 },
          labelBgPadding: [10, 5],
          labelBgBorderRadius: 0,
        };
      }),
    );
  };

  const setEdgeArrow = (edgeId, mode) => {
    snapshot();
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== edgeId) return e;
        const next = { ...e };
        if (mode === 'none') {
          delete next.markerEnd;
          delete next.markerStart;
        } else if (mode === 'end') {
          next.markerEnd = { ...ARROW };
          delete next.markerStart;
        } else if (mode === 'start') {
          next.markerStart = { ...ARROW_FROM };
          delete next.markerEnd;
        } else if (mode === 'both') {
          next.markerEnd = { ...ARROW };
          next.markerStart = { ...ARROW_FROM };
        }
        return next;
      }),
    );
  };

  const reverseEdge = (edgeId) => {
    snapshot();
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              source: e.target,
              target: e.source,
              sourceHandle: e.targetHandle ?? null,
              targetHandle: e.sourceHandle ?? null,
            }
          : e,
      ),
    );
  };

  const deleteEdgeById = (edgeId) => {
    snapshot();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
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
      if (editingNodeId || editingEdgeId || isTypingTarget(e.target)) return;

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
  }, [editingNodeId, editingEdgeId]);

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
          version: 1,
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
      if (parsed.edges) setEdges(migrateEdges(parsed.edges));
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
        version: 1,
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
    setEdges(migrateEdges(data.edges || []));
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

  const copyAiPrompt = async () => {
    const prompt = buildAiPrompt({ version: 1, name: currentName, nodes, edges });
    try {
      await navigator.clipboard.writeText(prompt);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2200);
    } catch (err) {
      // Fallback: open in new tab if clipboard refused
      const blob = new Blob([prompt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const exportJson = () => {
    const data = JSON.stringify({ version: 1, name: currentName, nodes, edges }, null, 2);
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
        if (parsed.edges) setEdges(migrateEdges(parsed.edges));
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
  const editingEdge = edges.find((e) => e.id === editingEdgeId);
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

        <Divider />

        <Button
          variant={aiCopied ? 'primary' : 'default'}
          onClick={copyAiPrompt}
          title="Copiază în clipboard un prompt cu schema completă + flowul curent — paste în Claude/GPT/Gemini și AI-ul va genera flowuri compatibile"
        >
          {aiCopied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copiat!
            </>
          ) : (
            <>
              <Bot className="h-3.5 w-3.5" /> Pentru AI
            </>
          )}
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
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={closeContextMenu}
          onMoveStart={closeContextMenu}
          defaultEdgeOptions={{
            style: { strokeWidth: 2.5, stroke: '#0a0a0a' },
            interactionWidth: 24,
            markerEnd: { ...ARROW },
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

        {/* Edge label modal */}
        {editingEdge && (
          <div
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50"
            onClick={() => setEditingEdgeId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[420px] max-w-[90vw] border-[3px] border-black bg-white shadow-[8px_8px_0_0_#000]"
            >
              <div className="flex items-center justify-between border-b-[2.5px] border-black bg-[var(--color-danger)] px-4 py-2 text-white">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">
                  ⌁ Etichetă săgeată
                </span>
                <button
                  onClick={() => setEditingEdgeId(null)}
                  className="hover:opacity-70"
                  title="Închide (Esc)"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
                  Tipic: „yes" / „no" / „dacă fail" / „retry" — gol = șterge eticheta
                </p>
                <input
                  autoFocus
                  type="text"
                  maxLength={50}
                  defaultValue={editingEdge.label || ''}
                  onChange={(e) => updateEdgeLabel(editingEdge.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingEdgeId(null);
                    if (e.key === 'Escape') setEditingEdgeId(null);
                  }}
                  className="w-full border-[2.5px] border-black bg-white p-3 font-mono text-[14px] font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000] placeholder:text-[var(--color-fg-mute)] placeholder:tracking-wider focus:border-[var(--color-danger)] focus:shadow-[3px_3px_0_0_var(--color-danger-deep)] focus:outline-none"
                  placeholder="ex: YES"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      updateEdgeLabel(editingEdge.id, '');
                      setEditingEdgeId(null);
                    }}
                    className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-soft)] underline-offset-4 hover:text-[var(--color-danger)] hover:underline"
                  >
                    Șterge eticheta
                  </button>
                  <Button variant="primary" onClick={() => setEditingEdgeId(null)}>
                    Gata
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Edge context menu (right-click pe săgeată) */}
        {edgeMenu && (() => {
          const ed = edges.find((e) => e.id === edgeMenu.edgeId);
          if (!ed) return null;
          const dashArr = ed.style?.strokeDasharray;
          const isAnimated = !!ed.animated;
          const isDashed = !isAnimated && dashArr === '8 4';
          const isDotted = !isAnimated && dashArr === '2 4';
          const isSolid = !isAnimated && !dashArr;

          const StyleBtn = ({ active, label, onClick, preview }) => (
            <button
              onClick={onClick}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider',
                active
                  ? 'bg-[var(--color-danger)] text-white'
                  : 'hover:bg-[var(--color-fg)] hover:text-white',
              )}
            >
              <span className="inline-block h-[18px] w-[40px] flex-shrink-0 border-y-2 border-black/0">
                <svg width="40" height="18" viewBox="0 0 40 18">
                  {preview}
                </svg>
              </span>
              {label}
              {active && <span className="ml-auto font-mono text-[10px]">●</span>}
            </button>
          );

          return (
            <div
              className="absolute z-[90] w-[240px] border-[2.5px] border-black bg-white p-1 shadow-[6px_6px_0_0_#000]"
              style={{ left: edgeMenu.x, top: edgeMenu.y }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="border-b-2 border-black bg-black px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-white">
                Săgeată · Stil
              </div>

              <StyleBtn
                active={isSolid}
                label="Linie continuă"
                onClick={() => { setEdgeStyle(edgeMenu.edgeId, 'solid'); setEdgeMenu(null); }}
                preview={<line x1="2" y1="9" x2="38" y2="9" stroke="currentColor" strokeWidth="2.5" />}
              />
              <StyleBtn
                active={isDashed}
                label="Punctată"
                onClick={() => { setEdgeStyle(edgeMenu.edgeId, 'dashed'); setEdgeMenu(null); }}
                preview={<line x1="2" y1="9" x2="38" y2="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 3" />}
              />
              <StyleBtn
                active={isDotted}
                label="Puncte mici"
                onClick={() => { setEdgeStyle(edgeMenu.edgeId, 'dotted'); setEdgeMenu(null); }}
                preview={<line x1="2" y1="9" x2="38" y2="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 3" strokeLinecap="round" />}
              />
              <StyleBtn
                active={isAnimated}
                label="Animată"
                onClick={() => { setEdgeStyle(edgeMenu.edgeId, 'animated'); setEdgeMenu(null); }}
                preview={
                  <line
                    x1="2" y1="9" x2="38" y2="9"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeDasharray="5 3"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="0.8s" repeatCount="indefinite" />
                  </line>
                }
              />

              <div className="my-1 h-[2px] bg-black" />

              <button
                onClick={() => {
                  setEditingEdgeId(edgeMenu.edgeId);
                  setEdgeMenu(null);
                }}
                className="group flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider hover:bg-[var(--color-fg)] hover:text-white"
              >
                <span className="inline-flex h-5 min-w-[36px] items-center justify-center bg-black px-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.1em] text-white group-hover:bg-white group-hover:text-black">
                  {ed.label ? ed.label.slice(0, 5) : 'A → B'}
                </span>
                {ed.label ? 'Editează etichetă' : 'Adaugă etichetă'}
              </button>

              <div className="my-1 h-[2px] bg-black" />

              <div className="px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--color-fg-soft)]">
                Săgeată
              </div>
              {(() => {
                const arrowMode = ed.markerStart && ed.markerEnd
                  ? 'both'
                  : ed.markerStart
                    ? 'start'
                    : ed.markerEnd
                      ? 'end'
                      : 'none';
                const ArrowOpt = ({ mode, label, preview }) => (
                  <button
                    onClick={() => { setEdgeArrow(edgeMenu.edgeId, mode); setEdgeMenu(null); }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider',
                      arrowMode === mode
                        ? 'bg-[var(--color-danger)] text-white'
                        : 'hover:bg-[var(--color-fg)] hover:text-white',
                    )}
                  >
                    <span className="inline-block w-[40px] flex-shrink-0">
                      <svg width="40" height="14" viewBox="0 0 40 14">
                        <defs>
                          <marker id={`pf-arrow-${mode}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M0,0 L10,5 L0,10 Z" fill="currentColor" />
                          </marker>
                        </defs>
                        {preview(`pf-arrow-${mode}`)}
                      </svg>
                    </span>
                    {label}
                    {arrowMode === mode && <span className="ml-auto font-mono text-[10px]">●</span>}
                  </button>
                );
                return (
                  <>
                    <ArrowOpt
                      mode="end"
                      label="La capăt"
                      preview={(id) => <line x1="2" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="2.5" markerEnd={`url(#${id})`} />}
                    />
                    <ArrowOpt
                      mode="both"
                      label="Ambele capete"
                      preview={(id) => <line x1="6" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="2.5" markerStart={`url(#${id})`} markerEnd={`url(#${id})`} />}
                    />
                    <ArrowOpt
                      mode="start"
                      label="Doar la început"
                      preview={(id) => <line x1="6" y1="7" x2="38" y2="7" stroke="currentColor" strokeWidth="2.5" markerStart={`url(#${id})`} />}
                    />
                    <ArrowOpt
                      mode="none"
                      label="Fără săgeată"
                      preview={() => <line x1="2" y1="7" x2="38" y2="7" stroke="currentColor" strokeWidth="2.5" />}
                    />
                  </>
                );
              })()}

              <div className="my-1 h-[2px] bg-black" />

              <button
                onClick={() => { reverseEdge(edgeMenu.edgeId); setEdgeMenu(null); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider hover:bg-[var(--color-fg)] hover:text-white"
              >
                <span className="font-mono text-[14px] leading-none">⇄</span>
                Inversează direcția
              </button>

              <div className="my-1 h-[2px] bg-black" />

              <button
                onClick={() => { deleteEdgeById(edgeMenu.edgeId); setEdgeMenu(null); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left font-bold text-[12px] uppercase tracking-wider text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                Șterge
              </button>
            </div>
          );
        })()}
      </div>

      {/* ───── Status bar ───── */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-black bg-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
        <span className="text-white/80">
          drag = select · <span className="text-[var(--color-danger)]">space</span>+drag = pan · right-click = meniu · ctrl+c/v = copy/paste · ctrl+d = duplică · ctrl+z = undo · <span className="text-[var(--color-danger)]">2× click pe edge = etichetă</span> · shift+2× click = șterge edge
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
