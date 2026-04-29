import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

const HANDLE_CLASS =
  '!w-[10px] !h-[10px] !bg-black !border-2 !border-white !rounded-none';

function fillStyle(fill, defaults) {
  if (!fill) return defaults;
  return {
    background: fill.bg ?? defaults.background,
    color: fill.fg ?? defaults.color,
    borderColor: fill.border ?? defaults.borderColor,
  };
}

export const StickyNote = memo(function StickyNote({ data, selected }) {
  const style = fillStyle(data.fillColor, {
    background: '#fff8c5',
    color: '#0a0a0a',
    borderColor: '#0a0a0a',
  });
  return (
    <div
      style={style}
      className={cn(
        'min-w-[140px] max-w-[220px] whitespace-pre-wrap break-words',
        'px-4 py-3',
        'border-[2.5px]',
        'font-hand text-[16px] leading-tight font-medium',
        '-rotate-[1.2deg]',
        selected && 'rotate-0 outline-3 outline-offset-3 outline-[var(--color-danger)]',
      )}
    >
      {data.label || 'Notă'}
    </div>
  );
});

export const DecisionNode = memo(function DecisionNode({ data, selected }) {
  const style = fillStyle(data.fillColor, {
    background: '#ffffff',
    color: '#0a0a0a',
    borderColor: '#0a0a0a',
  });
  return (
    <div
      className={cn(
        'relative w-[170px] h-[100px] flex items-center justify-center',
        selected && 'outline-3 outline-offset-3 outline-[var(--color-danger)]',
      )}
    >
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />
      <div
        style={{ background: style.background, borderColor: style.borderColor }}
        className="absolute inset-0 rotate-45 scale-[0.71] border-[2.5px]"
      />
      <span
        style={{ color: style.color }}
        className="relative z-10 px-3 text-center font-display text-[13px] font-extrabold uppercase tracking-tight"
      >
        {data.label || 'Decizie?'}
      </span>
      <Handle type="source" position={Position.Left} id="no" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="yes" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
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
    <div
      style={{ ...style, borderRadius: 999 }}
      className={cn(
        'min-w-[120px] px-6 py-2.5 text-center',
        'border-[2.5px]',
        'font-display font-extrabold uppercase tracking-wider text-[12px]',
        selected && 'outline-3 outline-offset-3 outline-[var(--color-danger)]',
      )}
    >
      {variant !== 'start' && <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />}
      {data.label}
      {!isEnd && <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />}
    </div>
  );
});

export const nodeTypes = {
  sticky: StickyNote,
  decision: DecisionNode,
  terminal: TerminalNode,
};
