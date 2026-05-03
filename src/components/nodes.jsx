import { memo } from 'react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n.jsx';

const HANDLE_CLASS =
  '!w-[10px] !h-[10px] !bg-black !border-2 !border-white !rounded-none';

const RESIZER_LINE = '!border-[var(--color-danger)] !border-[1.5px] !border-dashed';
const RESIZER_HANDLE =
  '!bg-white !border-[2px] !border-[var(--color-danger)] !w-[10px] !h-[10px] !rounded-none';

function fillStyle(fill, defaults) {
  if (!fill) return defaults;
  return {
    background: fill.bg ?? defaults.background,
    color: fill.fg ?? defaults.color,
    borderColor: fill.border ?? defaults.borderColor,
  };
}

function NoteCorner({ note }) {
  if (!note) return null;
  return (
    <div className="absolute top-0 right-0 z-20 group/note cursor-default select-none">
      <svg width="16" height="16" viewBox="0 0 16 16" className="block">
        <polygon points="0,0 16,0 16,16" fill="#fff8c5" stroke="#0a0a0a" strokeWidth="1.5" />
      </svg>
      <div className="pointer-events-none absolute right-0 top-4 hidden group-hover/note:block w-44 border-[2.5px] border-black bg-[#fff8c5] px-2.5 py-2 font-hand text-[12px] leading-snug shadow-[4px_4px_0_0_#000] whitespace-pre-wrap break-words z-50 text-[#0a0a0a]">
        {note}
      </div>
    </div>
  );
}

function Resizer({ selected, minWidth = 80, minHeight = 40 }) {
  return (
    <NodeResizer
      isVisible={selected}
      minWidth={minWidth}
      minHeight={minHeight}
      lineClassName={RESIZER_LINE}
      handleClassName={RESIZER_HANDLE}
    />
  );
}

export const BoxNode = memo(function BoxNode({ data, selected }) {
  const style = fillStyle(data.fillColor, {
    background: '#ffffff',
    color: '#0a0a0a',
    borderColor: '#0a0a0a',
  });
  return (
    <>
      <Resizer selected={selected} minWidth={120} minHeight={50} />
      <Handle type="target" position={Position.Top} id="top-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top} id="top-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left} id="left-s" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right} id="right-t" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={HANDLE_CLASS} />
      <div
        style={{ ...style, width: '100%', height: '100%', position: 'relative' }}
        className={cn(
          'flex items-center justify-center text-center',
          'border-[2.5px] px-3 py-2',
          'font-display text-[13px] font-extrabold uppercase tracking-tight',
          'whitespace-pre-line break-words',
          selected && 'outline-3 outline-offset-3 outline-[var(--color-danger)]',
        )}
      >
        {data.label}
        <NoteCorner note={data.note} />
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={HANDLE_CLASS} />
    </>
  );
});

export const StickyNote = memo(function StickyNote({ data, selected }) {
  const { t } = useT();
  const style = fillStyle(data.fillColor, {
    background: '#fff8c5',
    color: '#0a0a0a',
    borderColor: '#0a0a0a',
  });
  return (
    <>
      <Resizer selected={selected} minWidth={120} minHeight={50} />
      <Handle type="target" position={Position.Top} id="top-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top} id="top-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left} id="left-s" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right} id="right-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={HANDLE_CLASS} />
      <div
        style={{ ...style, width: '100%', height: '100%' }}
        className={cn(
          'whitespace-pre-wrap break-words px-4 py-3',
          'border-[2.5px]',
          'font-hand text-[16px] leading-tight font-medium',
          '-rotate-[1.2deg]',
          selected && 'rotate-0 outline-3 outline-offset-3 outline-[var(--color-danger)]',
        )}
      >
        {data.label || t('nodes.noteDefault')}
      </div>
    </>
  );
});

export const DecisionNode = memo(function DecisionNode({ data, selected }) {
  const { t } = useT();
  const style = fillStyle(data.fillColor, {
    background: '#ffffff',
    color: '#0a0a0a',
    borderColor: '#0a0a0a',
  });
  return (
    <div className="relative w-full h-full min-w-[170px] min-h-[100px]">
      <Resizer selected={selected} minWidth={140} minHeight={80} />
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          points="50,1.5 98.5,50 50,98.5 1.5,50"
          fill={style.background}
          stroke={style.borderColor}
          strokeWidth="3"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
        {selected && (
          <polygon
            points="50,1.5 98.5,50 50,98.5 1.5,50"
            fill="none"
            stroke="var(--color-danger)"
            strokeWidth="3"
            strokeDasharray="5 3"
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
            style={{ transform: 'scale(1.06)', transformOrigin: '50% 50%' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <span
          style={{ color: style.color }}
          className="relative z-10 text-center font-display text-[13px] font-extrabold uppercase tracking-tight break-words"
        >
          {data.label || t('nodes.decisionDefault')}
        </span>
      </div>
      {data.note && (
        <div className="absolute right-[18%] top-[18%] z-20 group/note cursor-default select-none">
          <svg width="14" height="14" viewBox="0 0 14 14" className="block">
            <polygon points="0,0 14,0 14,14" fill="#fff8c5" stroke="#0a0a0a" strokeWidth="1.5" />
          </svg>
          <div className="pointer-events-none absolute right-0 top-4 hidden group-hover/note:block w-44 border-[2.5px] border-black bg-[#fff8c5] px-2.5 py-2 font-hand text-[12px] leading-snug shadow-[4px_4px_0_0_#000] whitespace-pre-wrap break-words z-50 text-[#0a0a0a]">
            {data.note}
          </div>
        </div>
      )}
      <Handle type="target" position={Position.Top} id="top-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top} id="top-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left} id="no" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right} id="right-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="yes" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={HANDLE_CLASS} />
    </div>
  );
});

export const TerminalNode = memo(function TerminalNode({ data, selected }) {
  const variant = data.variant || 'start';
  const isEnd = variant === 'end';
  const defaults = isEnd
    ? { background: '#e11d3f', color: '#ffffff', borderColor: '#0a0a0a' }
    : { background: '#ffffff', color: '#0a0a0a', borderColor: '#0a0a0a' };
  const style = fillStyle(data.fillColor, defaults);
  return (
    <>
      <Resizer selected={selected} minWidth={100} minHeight={36} />
      <Handle type="target" position={Position.Top} id="top-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top} id="top-s" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left} id="left-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right} id="right-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={HANDLE_CLASS} />
      <div
        style={{ ...style, width: '100%', height: '100%', borderRadius: 999, position: 'relative' }}
        className={cn(
          'flex items-center justify-center px-6 py-2 text-center',
          'border-[2.5px]',
          'font-display font-extrabold uppercase tracking-wider text-[12px]',
          selected && 'outline-3 outline-offset-3 outline-[var(--color-danger)]',
        )}
      >
        {data.label}
        <NoteCorner note={data.note} />
      </div>
    </>
  );
});

export const nodeTypes = {
  box: BoxNode,
  sticky: StickyNote,
  decision: DecisionNode,
  terminal: TerminalNode,
};
