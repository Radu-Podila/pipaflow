import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';

const PADDING = 40;

function pickViewportEl() {
  return document.querySelector('.react-flow__viewport');
}

async function snapshot(format, fileName, nodes) {
  const el = pickViewportEl();
  if (!el) throw new Error('Nu am găsit canvas-ul de exportat');

  const bounds = getNodesBounds(nodes);
  const width = Math.max(bounds.width + PADDING * 2, 400);
  const height = Math.max(bounds.height + PADDING * 2, 300);
  const transform = getViewportForBounds(bounds, width, height, 0.5, 2, PADDING);

  const opts = {
    backgroundColor: '#ffffff',
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
    },
    pixelRatio: format === 'png' ? 2 : 1,
  };

  const dataUrl = format === 'png' ? await toPng(el, opts) : await toSvg(el, opts);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${fileName}.${format}`;
  a.click();
}

export const exportPng = (fileName, nodes) => snapshot('png', fileName, nodes);
export const exportSvg = (fileName, nodes) => snapshot('svg', fileName, nodes);
