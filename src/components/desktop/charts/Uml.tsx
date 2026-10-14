'use client';
import type { KeyboardEvent, ReactNode } from 'react';
import type { UmlBox } from '@/lib/reports';

type Box = Exclude<UmlBox, null>;
const KIDS: [Box, string, string, number][] = [
  ['html', 'HTMLReportGenerator', '.html', 8],
  ['text', 'TextReportGenerator', '.txt', 182],
  ['csv', 'CSVReportGenerator', '.csv', 356],
];

/** Class diagram: abstract ReportGenerator with three overriding subclasses. Click a box to pick it. */
export function Uml({ sel, onPick }: { sel: UmlBox; onPick: (b: Box) => void }) {
  const box = (id: Box, x: number, y: number, w: number, h: number, inner: ReactNode) => (
    <g
      key={id}
      className={`box${sel === id ? ' sel' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`Show ${id} code`}
      onClick={() => onPick(id)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(id);
        }
      }}
    >
      <rect className="bg" x={x} y={y} width={w} height={h} rx="12" />
      {inner}
    </g>
  );
  const kidSel = !!sel && sel !== 'base';
  return (
    <svg className="uml" viewBox="0 0 520 372" role="img" aria-label="Class hierarchy: ReportGenerator with HTML, Text and CSV subclasses">
      {box(
        'base',
        100,
        12,
        320,
        120,
        <>
          <path className="hdr" d="M100 24a12 12 0 0 1 12-12h296a12 12 0 0 1 12 12v28H100z" />
          <text className="t-ster" x="260" y="28" textAnchor="middle">
            «abstract»
          </text>
          <text className="t-name" x="260" y="45" textAnchor="middle">
            ReportGenerator
          </text>
          <text className="t-m" x="116" y="74">
            <tspan className="t-v">virtual</tspan> formatName() : string = 0
          </text>
          <text className="t-m" x="116" y="94">
            <tspan className="t-v">virtual</tspan> generate(Snapshot) : string = 0
          </text>
          <text className="t-m" x="116" y="114">
            <tspan className="t-v">virtual</tspan> ~ReportGenerator()
          </text>
        </>,
      )}
      <path className={`edge${kidSel ? ' sel' : ''}`} d="M260 147V196" />
      <path className="edge" d="M86 196H434" />
      {KIDS.map(([id, , , x]) => (
        <g key={'e' + id}>
          <path className={`edge${sel === id ? ' sel' : ''}`} d={`M${x + 78} 196V244`} />
          {sel === id && <path className="flow" d={`M260 147V196H${x + 78}V244`} />}
        </g>
      ))}
      <path d="M260 133l-9 14h18z" fill="#0F141D" stroke={kidSel ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1.5" />
      {KIDS.map(([id, name, ext, x]) =>
        box(
          id,
          x,
          244,
          156,
          112,
          <>
            <path className="hdr" d={`M${x} 256a12 12 0 0 1 12-12h132a12 12 0 0 1 12 12v24H${x}z`} />
            <text className="t-name" x={x + 78} y="267" textAnchor="middle" style={{ fontSize: 11 }}>
              {name}
            </text>
            <text className="t-m" x={x + 12} y="300">
              formatName()
            </text>
            <text className="t-m t-o" x={x + 103} y="300" style={{ fontSize: 9.5 }}>
              override
            </text>
            <text className="t-m" x={x + 12} y="320">
              generate()
            </text>
            <text className="t-m t-o" x={x + 103} y="320" style={{ fontSize: 9.5 }}>
              override
            </text>
            <text className="t-ster" x={x + 12} y="342">
              → {ext}
            </text>
          </>,
        ),
      )}
    </svg>
  );
}
