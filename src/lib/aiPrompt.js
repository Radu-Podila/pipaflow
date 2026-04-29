/**
 * Generates a self-contained prompt that teaches an LLM how to produce
 * Pipaflow-compatible JSON. Paste output into Claude / GPT / Gemini, then
 * append your request. The model returns a JSON file you can import with
 * the "Deschide" button (or paste into a .json file and import).
 */

const SCHEMA_SPEC = `# PIPAFLOW JSON FORMAT (v1)

Pipaflow is a flow-diagram editor. The format is plain JSON that can be
imported via the "Deschide" / Import button. Coordinates are in pixels.

## Top-level shape
{
  "version": 1,
  "name": "string — title of the flow",
  "nodes": NodeArray,
  "edges": EdgeArray
}

## Node types

All nodes share: { id (unique string), type, data, position: {x, y}, width?, height? }

1. type "terminal"  — start/end pill
   data: { label: string, variant: "start" | "end", fillColor?: Fill }
   Use one "start" near the top, one "end" at the conclusion.

2. type "box"       — rectangle for actions/steps (most common)
   data: { label: string, fillColor?: Fill }

3. type "decision"  — diamond shape (yes/no fork)
   data: { label: string (usually phrased as a question), fillColor?: Fill }
   Source handles: id "yes" (right), id "no" (left), or no id (bottom).
   On outgoing edges, set sourceHandle: "yes" | "no" to control which side.

4. type "sticky"    — yellow handwritten note (no logic, just commentary)
   data: { label: string, fillColor?: Fill }

## Fill colors (optional)

Use one of these presets for fillColor (or omit for default):
  Snow:   { bg: "#fafafa", fg: "#0a0a0a", border: "#0a0a0a" }
  Ash:    { bg: "#e5e5e5", fg: "#0a0a0a", border: "#0a0a0a" }
  Butter: { bg: "#fff8c5", fg: "#0a0a0a", border: "#0a0a0a" }
  Flame:  { bg: "#ea580c", fg: "#ffffff", border: "#0a0a0a" }
  Blush:  { bg: "#fce7e8", fg: "#0a0a0a", border: "#0a0a0a" }
  Danger: { bg: "#e11d3f", fg: "#ffffff", border: "#0a0a0a" }
  Wine:   { bg: "#7a0e22", fg: "#ffffff", border: "#0a0a0a" }
  Toxic:  { bg: "#84cc16", fg: "#0a0a0a", border: "#0a0a0a" }
  Noir:   { bg: "#0a0a0a", fg: "#ffffff", border: "#0a0a0a" }

Suggestion: tag risky/destructive nodes Danger or Wine, success paths
Toxic, sticky-note context Butter, side-info Ash.

## Edges

{
  "id":          string (unique, e.g. "e-1"),
  "source":      string (source node id),
  "target":      string (target node id),
  "sourceHandle": "yes" | "no" | undefined,
  "label":       string (optional — short text shown on the line),
  "animated":    boolean (default false),
  "style":       { strokeWidth: 2.5, stroke: "#0a0a0a", strokeDasharray?: "8 4" | "2 4" },
  "markerEnd":   { type: "arrowclosed", color: "#0a0a0a", width: 18, height: 18 },
  "markerStart": same shape (omit unless bidirectional)
}

strokeDasharray: omit for solid · "8 4" for dashed · "2 4" for dotted.
Use markerStart + markerEnd for bidirectional relationships.

## Layout hints

- Use a top-down layout: start at y≈60, increment ~120 per row.
- Center horizontally around x≈300–500.
- For decisions, place "yes" branch to the right, "no" to the left.
- Pipaflow has an auto-layout button (Dagre) so rough positions are fine —
  user can re-layout in one click.

## Minimal example (a 3-step approval flow)

{
  "version": 1,
  "name": "Aprobare cerere",
  "nodes": [
    { "id": "s",  "type": "terminal", "data": { "label": "Cerere primită", "variant": "start" }, "position": { "x": 300, "y": 60 } },
    { "id": "d1", "type": "decision", "data": { "label": "Sumă > 1000 RON?" }, "position": { "x": 280, "y": 200 } },
    { "id": "a1", "type": "box",      "data": { "label": "Aprobare manager", "fillColor": { "bg": "#fff8c5", "fg": "#0a0a0a", "border": "#0a0a0a" } }, "position": { "x": 80,  "y": 380 } },
    { "id": "a2", "type": "box",      "data": { "label": "Auto-aprobare" },  "position": { "x": 480, "y": 380 } },
    { "id": "e",  "type": "terminal", "data": { "label": "Procesat", "variant": "end" }, "position": { "x": 300, "y": 540 } }
  ],
  "edges": [
    { "id": "e1", "source": "s",  "target": "d1", "markerEnd": { "type": "arrowclosed", "color": "#0a0a0a" }, "style": { "strokeWidth": 2.5, "stroke": "#0a0a0a" } },
    { "id": "e2", "source": "d1", "target": "a1", "sourceHandle": "no",  "label": "Da",  "markerEnd": { "type": "arrowclosed", "color": "#0a0a0a" }, "style": { "strokeWidth": 2.5, "stroke": "#0a0a0a" } },
    { "id": "e3", "source": "d1", "target": "a2", "sourceHandle": "yes", "label": "Nu",  "markerEnd": { "type": "arrowclosed", "color": "#0a0a0a" }, "style": { "strokeWidth": 2.5, "stroke": "#0a0a0a" } },
    { "id": "e4", "source": "a1", "target": "e",  "markerEnd": { "type": "arrowclosed", "color": "#0a0a0a" }, "style": { "strokeWidth": 2.5, "stroke": "#0a0a0a" } },
    { "id": "e5", "source": "a2", "target": "e",  "markerEnd": { "type": "arrowclosed", "color": "#0a0a0a" }, "style": { "strokeWidth": 2.5, "stroke": "#0a0a0a" } }
  ]
}

## Output rules
- Return ONLY the JSON object — no markdown fences, no commentary.
- Every "source"/"target" must reference an existing node id.
- Use the exact field names above (camelCase, with "fillColor" not "fill_color").
- Keep labels short (<60 chars). Long descriptions go into a sticky node.
`;

export function buildAiPrompt(currentFlow) {
  const liveExample = currentFlow && currentFlow.nodes?.length > 0
    ? `\n\n## User's current flow (for context)\n\n${JSON.stringify(currentFlow, null, 2)}`
    : '';

  return `You will produce a Pipaflow-compatible JSON flow diagram.
Read the format spec carefully, then generate JSON that matches it exactly.

${SCHEMA_SPEC}${liveExample}

---

Now generate a flow for the following request (replace this line with what you want):

[YOUR FLOW DESCRIPTION HERE]
`;
}

export const PIPAFLOW_SCHEMA = SCHEMA_SPEC;
