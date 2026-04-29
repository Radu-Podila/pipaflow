import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export const StickyNote = memo(function StickyNote({ data, selected }) {
  return (
    <div className={`pf-sticky${selected ? ' pf-sticky--selected' : ''}`}>
      {data.label || 'Notă'}
    </div>
  );
});

export const DecisionNode = memo(function DecisionNode({ data, selected }) {
  return (
    <div className={`pf-decision${selected ? ' pf-decision--selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="pf-handle" />
      <div className="pf-decision__shape">
        <span className="pf-decision__label">{data.label || 'Decizie?'}</span>
      </div>
      <Handle type="source" position={Position.Left} id="no" className="pf-handle" />
      <Handle type="source" position={Position.Right} id="yes" className="pf-handle" />
      <Handle type="source" position={Position.Bottom} className="pf-handle" />
    </div>
  );
});

export const TerminalNode = memo(function TerminalNode({ data, selected }) {
  const variant = data.variant || 'start';
  return (
    <div className={`pf-terminal pf-terminal--${variant}${selected ? ' pf-terminal--selected' : ''}`}>
      {variant !== 'start' && <Handle type="target" position={Position.Top} className="pf-handle" />}
      <span>{data.label}</span>
      {variant !== 'end' && <Handle type="source" position={Position.Bottom} className="pf-handle" />}
    </div>
  );
});

export const nodeTypes = {
  sticky: StickyNote,
  decision: DecisionNode,
  terminal: TerminalNode,
};
