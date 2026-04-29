# Pipaflow

Editor de flowuri logice minimalist. Drag bule, conectezi cu săgeți, salvezi local. Fără cont, fără cloud.

## Stack

- Vite + React 19
- [@xyflow/react](https://reactflow.dev) (fost React Flow) pentru canvas
- [@dagrejs/dagre](https://github.com/dagrejs/dagre) pentru auto-layout
- [html-to-image](https://github.com/bubkoo/html-to-image) pentru export PNG/SVG
- localStorage pentru persistență

## Dezvoltare

```bash
npm install
npm run dev      # http://localhost:5180
npm run build
npm run preview
```

## Features

**MVP (v0.1)**
- 5 tipuri de noduri: Start, Acțiune, Decizie (diamant), Final, Notă liberă
- Drag & drop, snap-to-grid, mini-map, zoom & pan
- Conectare prin handle-uri
- Editare text prin dublu-click
- Salvare multi-flow în localStorage
- Auto-layout vertical / orizontal (Dagre)
- Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)
- Export JSON / PNG / SVG
- Import JSON
- Landing page minimalistă

## Roadmap

- [ ] Sharing prin URL hash (gen mermaid.live)
- [ ] Galerie de templates
- [ ] Dark mode
- [ ] PWA / offline
- [ ] (opțional) Cloud sync via Supabase
- [ ] Export Mermaid / PlantUML

## Origini

Extras din [snipetly](https://github.com/) pe 2026-04-29 (`/flow` page → standalone).

## Licență

MIT
