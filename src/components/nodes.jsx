import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

const HANDLE_CLASS =
  '!w-[10px] !h-[10px] !bg-black !border-2 !border-white !rounded-none';

export const StickyNote = memo(function StickyNote({ data, selected }) {
  return (
    <div
      className={cn(
        'min-w-[140px] max-w-[220px] whitespace-pre-wrap break-words',
        'bg-[#fff8c5] text-black px-4 py-3',
        'border-[2.5px] border-black',
        'shadow-[3px_3px_0_0_#000]',
        'font-hand text-[16px] leading-tight font-medium',
        '-rotate-[1.2deg]',
        selected && 'border-[var(--color-danger)] shadow-[4px_4px_0_0_var(--color-danger-deep)] rotate-0',
      )}
    >
      {data.label || 'Notă'}
    </div>
  );
});

export const DecisionNode = memo(function DecisionNode({ data, selected }) {
  return (
    <div className="relative w-[170px] h-[100px] flex items-center justify-center">
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />
      <div
        className={cn(
          'absolute inset-0 rotate-45 scale-[0.71]',
          'bg-white border-[2.5px] border-black',
          'shadow-[4px_4px_0_0_#000]',
          selected && 'border-[var(--color-danger)] bg-[var(--color-danger-glow)] shadow-[4px_4px_0_0_var(--color-danger-deep)]',
        )}
      />
      <span className="relative z-10 px-3 text-center font-display text-[13px] font-extrabold uppercase tracking-tight">
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
  return (
    <div
      className={cn(
        'min-w-[120px] px-6 py-2.5 text-center',
        'border-[2.5px] border-black',
        'font-display font-extrabold uppercase tracking-wider text-[12px]',
        'shadow-[3px_3px_0_0_#000]',
        isEnd
          ? 'bg-[var(--color-danger)] text-white'
          : 'bg-white text-black',
        selected && (isEnd
          ? 'shadow-[4px_4px_0_0_#000]'
          : 'border-[var(--color-danger)] bg-[var(--color-danger-glow)] shadow-[4px_4px_0_0_var(--color-danger-deep)]'),
      )}
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        borderRadius: 999,
      }}
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
