import dagre from '@dagrejs/dagre';

const NODE_W = 180;
const NODE_H = 60;

export function layoutDagre(nodes, edges, direction = 'TB') {
  const isHorizontal = direction === 'LR' || direction === 'RL';

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 120 : 240,
    ranksep: isHorizontal ? 320 : 170,
    edgesep: 50,
    marginx: 60,
    marginy: 60,
    ranker: 'network-simplex',
    acyclicer: 'greedy',
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => {
    g.setNode(n.id, {
      width: n.width || n.measured?.width || NODE_W,
      height: n.height || n.measured?.height || NODE_H,
    });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target, {
      // weight decision branches lower so the main flow stays straight
      weight: e.sourceHandle === 'yes' || e.sourceHandle === 'no' ? 1 : 2,
      minlen: 1,
    });
  });

  dagre.layout(g);

  const sourcePosition = isHorizontal ? 'right' : 'bottom';
  const targetPosition = isHorizontal ? 'left' : 'top';
  const defaultSourceHandle = isHorizontal ? 'right-s' : 'bottom-s';
  const defaultTargetHandle = isHorizontal ? 'left-t' : 'top-t';

  const idToNode = new Map(nodes.map((n) => [n.id, n]));

  const laidNodes = nodes.map((n) => {
    const { x, y } = g.node(n.id);
    const w = n.width || n.measured?.width || NODE_W;
    const h = n.height || n.measured?.height || NODE_H;
    return {
      ...n,
      position: { x: x - w / 2, y: y - h / 2 },
      sourcePosition,
      targetPosition,
    };
  });

  const laidEdges = edges.map((e) => {
    const sourceNode = idToNode.get(e.source);
    const isDecisionBranch =
      sourceNode?.type === 'decision' &&
      (e.sourceHandle === 'yes' || e.sourceHandle === 'no');

    if (isDecisionBranch) {
      // Keep the yes/no semantics on decision nodes (Left = no, Right = yes).
      return {
        ...e,
        type: 'smoothstep',
        targetHandle: targetPosition === 'top' ? 'top-t' : 'left-t',
        pathOptions: { borderRadius: 8, offset: 16 },
      };
    }

    return {
      ...e,
      type: 'smoothstep',
      sourceHandle: defaultSourceHandle,
      targetHandle: defaultTargetHandle,
      pathOptions: { borderRadius: 8, offset: 16 },
    };
  });

  return { nodes: laidNodes, edges: laidEdges };
}
