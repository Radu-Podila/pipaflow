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

import Hero from './components/Hero.jsx';
import { nodeTypes } from './components/nodes.jsx';
import { layoutDagre } from './lib/layout.js';
import { exportPng, exportSvg } from './lib/exportImage.js';
import {
  loadCurrent,
  loadList,
  loadFlow,
  saveFlow,
  deleteFlow,
} from './lib/storage.js';
import {
  supportsFsAccess,
  openJsonFile,
  writeJsonToHandle,
  saveAsJsonFile,
} from './lib/fsAccess.js';

import './App.css';

const HISTORY_LIMIT = 50;

const PALETTE = [
  { key: 'start', kind: 'terminal', variant: 'start', label: 'Start', bg: '#b2f2bb', border: '#2f9e44' },
  { key: 'action', kind: 'default', label: 'Acțiune', bg: '#a5d8ff', border: '#1971c2' },
  { key: 'decision', kind: 'decision', label: 'Decizie?', bg: '#ffec99', border: '#f59f00' },
  { key: 'end', kind: 'terminal', variant: 'end', label: 'Final', bg: '#ffc9c9', border: '#e03131' },
  { key: 'note', kind: 'sticky', label: 'Notă liberă', bg: '#fff3bf', border: '#fab005' },
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
    return {
      id,
      type: 'sticky',
      data: { label: preset.label },
      position,
    };
  }
  if (preset.kind === 'decision') {
    return {
      id,
      type: 'decision',
      data: { label: preset.label },
      position,
    };
  }
  if (preset.kind === 'terminal') {
    return {
      id,
      type: 'terminal',
      data: { label: preset.label, variant: preset.variant },
      position,
    };
  }
  return {
    id,
    type: 'default',
    data: { label: preset.label },
    position,
    style: {
      background: preset.bg,
      border: `2px solid ${preset.border}`,
      borderRadius: 12,
      padding: 10,
      fontWeight: 600,
      minWidth: 140,
      textAlign: 'center',
    },
  };
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
  const fileHandleRef = useRef(null);
  const [linkedFile, setLinkedFile] = useState(null);
  const legacyImportInputRef = useRef(null);

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
      if (cur.nodes) setNodes(cur.nodes);
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
            style: { strokeWidth: 2, stroke: '#495057' },
            interactionWidth: 24,
          },
          eds,
        ),
      );
    },
    [snapshot],
  );

  const onEdgeDoubleClick = useCallback((_, edge) => {
    snapshot();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, [snapshot]);

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

  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const menuW = 200;
    const menuH = 240;
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    setContextMenu({
      x: Math.min(localX, rect.width - menuW - 8),
      y: Math.min(localY, rect.height - menuH - 8),
      flowPos,
    });
  }, [rf]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

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
      } else if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      } else if (e.key === 'Escape') {
        setContextMenu(null);
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
      if (parsed.nodes) setNodes(parsed.nodes);
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

  const detachFile = () => {
    fileHandleRef.current = null;
    setLinkedFile(null);
  };

  const handleLoad = (id) => {
    const data = loadFlow(id);
    if (!data) return;
    snapshot();
    setNodes(data.nodes || []);
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
        if (parsed.nodes) setNodes(parsed.nodes);
        if (parsed.edges) setEdges(parsed.edges);
        if (parsed.name) setCurrentName(parsed.name);
        // Browser-ul nu suportă File System Access — nu putem scrie înapoi.
        detachFile();
        if (!supportsFsAccess) {
          // Notă discretă: arătăm filename-ul ca read-only marker
          setLinkedFile(`${file.name} (read-only — browser-ul tău nu suportă scrierea)`);
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

  return (
    <div className="pf-editor">
      <header className="pf-toolbar">
        <button className="pf-btn pf-btn--ghost" onClick={onBackToHero} title="Înapoi la pagina principală">
          ← Acasă
        </button>

        <input
          className="pf-name-input"
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          placeholder="Numele flowului"
        />

        {linkedFile && (
          <span className="pf-file-chip" title="Fișier legat — Salvează scrie aici">
            📎 {linkedFile}
            <button
              className="pf-file-chip__close"
              onClick={detachFile}
              title="Detașează"
            >
              ×
            </button>
          </span>
        )}

        <div className="pf-toolbar__group">
          <button className="pf-btn" onClick={handleNew}>📄 Nou</button>
          <button
            className="pf-btn"
            onClick={handleSave}
            title={fileHandleRef.current ? `Salvează în ${linkedFile} + localStorage` : 'Salvează în localStorage'}
          >
            💾 Salvează
          </button>
        </div>

        <div className="pf-toolbar__group">
          <button className="pf-btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">↶</button>
          <button className="pf-btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">↷</button>
        </div>

        <div className="pf-toolbar__group">
          <button className="pf-btn" onClick={() => autoLayout('TB')} title="Aranjează vertical">
            ⬇ Aranjează
          </button>
          <button className="pf-btn" onClick={() => autoLayout('LR')} title="Aranjează orizontal">
            ➡ Orizontal
          </button>
        </div>

        <div className="pf-toolbar__group">
          <button className="pf-btn" onClick={openFile} title="Deschide JSON din disk (sync bidirecțional unde e suportat)">
            📂 Deschide
          </button>
          <button className="pf-btn" onClick={saveAs} title="Salvează ca fișier nou pe disk">
            💾 Salvează ca…
          </button>
        </div>

        <div className="pf-toolbar__group">
          <button className="pf-btn" onClick={exportJson}>⬇ JSON</button>
          <button className="pf-btn" onClick={() => exportPng(currentName, nodes)}>⬇ PNG</button>
          <button className="pf-btn" onClick={() => exportSvg(currentName, nodes)}>⬇ SVG</button>
        </div>

        <input
          ref={legacyImportInputRef}
          type="file"
          accept=".json"
          onChange={importJson}
          hidden
        />

        <div className="pf-toolbar__spacer" />

        <button className="pf-btn pf-btn--danger" onClick={deleteSelected} title="Șterge selecția (Delete)">
          🗑 Șterge
        </button>
      </header>

      <section className="pf-palette">
        <span className="pf-palette__label">Adaugă:</span>
        {PALETTE.map((p) => (
          <button
            key={p.key}
            className="pf-palette__btn"
            style={{ background: p.bg, borderColor: p.border }}
            onClick={() => addNode(p)}
          >
            + {p.label}
          </button>
        ))}
      </section>

      {savedFlows.length > 0 && (
        <section className="pf-saved">
          <span className="pf-saved__label">Salvate:</span>
          {savedFlows.map((f) => (
            <button key={f.id} className="pf-saved__item" onClick={() => handleLoad(f.id)}>
              {f.name}
              <span className="pf-saved__close" onClick={(e) => handleDelete(f.id, e)}>×</span>
            </button>
          ))}
        </section>
      )}

      <div
        className={`pf-canvas${spaceHeld ? ' pf-canvas--pan' : ''}`}
        ref={wrapperRef}
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
          onPaneClick={closeContextMenu}
          onMoveStart={closeContextMenu}
          defaultEdgeOptions={{
            style: { strokeWidth: 2, stroke: '#495057' },
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
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>

        {editingNode && (
          <div className="pf-edit-overlay" onClick={() => setEditingNodeId(null)}>
            <div className="pf-edit-modal" onClick={(e) => e.stopPropagation()}>
              <label>Text bulă</label>
              <textarea
                autoFocus
                rows={3}
                value={editingNode.data.label || ''}
                onChange={(e) => updateNodeLabel(editingNode.id, e.target.value)}
              />
              <button className="pf-btn pf-btn--primary" onClick={() => setEditingNodeId(null)}>
                Gata
              </button>
            </div>
          </div>
        )}

        {contextMenu && (
          <div
            className="pf-ctx-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="pf-ctx-menu__title">Adaugă bulă aici</div>
            {PALETTE.map((p) => (
              <button
                key={p.key}
                className="pf-ctx-menu__item"
                onClick={() => {
                  addNode(p, contextMenu.flowPos);
                  setContextMenu(null);
                }}
              >
                <span
                  className="pf-ctx-menu__chip"
                  style={{ background: p.bg, borderColor: p.border }}
                />
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <footer className="pf-help">
        💡 <strong>Cum folosești:</strong> drag pe canvas = <strong>selecție multiplă</strong> · <strong>Space + drag = pan (mănușă)</strong> · <strong>click dreapta = meniu „adaugă aici"</strong> · trage de la punctul unei bule ca s-o conectezi · dublu-click pe bulă schimbă textul · dublu-click pe săgeată o șterge · Delete șterge selecția · Ctrl+Z undo
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
