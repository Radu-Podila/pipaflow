import dagre from '@dagrejs/dagre';

const NODE_W = 180;
const NODE_H = 60;

export function layoutDagre(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => {
    g.setNode(n.id, {
      width: n.width || n.measured?.width || NODE_W,
      height: n.height || n.measured?.height || NODE_H,
    });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    const w = n.width || n.measured?.width || NODE_W;
    const h = n.height || n.measured?.height || NODE_H;
    return {
      ...n,
      position: { x: x - w / 2, y: y - h / 2 },
    };
  });
}
