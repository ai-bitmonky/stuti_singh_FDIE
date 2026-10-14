'use client';
/** UML-style class hierarchy: abstract ReportGenerator → HTML / Text / CSV. Tap a class to view its code. */
import type { UmlBox } from '@/lib/reports';

const KIDS: [Exclude<UmlBox, 'base' | null>, string, number, string][] = [
  ['html', 'HTML', 3, '#FBBF24'],
  ['text', 'Text', 116.5, '#60A5FA'],
  ['csv', 'CSV', 230, '#34D399'],
];
const UI = '-apple-system,BlinkMacSystemFont,var(--font-inter),Inter,sans-serif';

export default function Hierarchy({ on, onPick }: { on: UmlBox; onPick: (k: Exclude<UmlBox, null>) => void }) {
  return (
    <svg viewBox="0 0 329 176" role="img" aria-label="Class hierarchy">
      <defs>
        <marker id="mb-tri" viewBox="0 0 12 12" refX="6" refY="1" markerWidth="12" markerHeight="12" orient="auto">
          <path d="M6 1 11 10H1z" fill="#11161F" stroke="#9AA3B5" strokeWidth="1.2" />
        </marker>
      </defs>
      <path d="M164.5 64V88M51 112V88H278V112M164.5 88V112" fill="none" stroke="#9AA3B5" strokeWidth="1.2" markerStart="url(#mb-tri)" />
      <g className={'nd' + (on === 'base' ? ' on' : '')} onClick={() => onPick('base')}>
        <rect x="72" y="8" width="185" height="56" rx="12" fill="#171D28" stroke="rgba(255,255,255,.14)" />
        <text x="164.5" y="25" textAnchor="middle" fill="#9AA3B5" fontSize="10" style={{ fontFamily: 'var(--mono)' }}>«abstract»</text>
        <text x="164.5" y="41" textAnchor="middle" fill="#EEF1F6" fontSize="13.5" fontWeight="700" style={{ fontFamily: UI }}>ReportGenerator</text>
        <text x="164.5" y="56" textAnchor="middle" fill="#A78BFA" fontSize="10.5" fontStyle="italic" style={{ fontFamily: 'var(--mono)' }}>virtual generate() = 0</text>
      </g>
      {KIDS.map(([k, n, x, col]) => (
        <g key={k} className={'nd' + (on === k ? ' on' : '')} onClick={() => onPick(k)}>
          <rect x={x} y="112" width="96" height="58" rx="12" fill="#171D28" stroke="rgba(255,255,255,.14)" />
          <circle cx={x + 14} cy="128" r="4" fill={col} />
          <text x={x + 23} y="132" fill="#EEF1F6" fontSize="13" fontWeight="700" style={{ fontFamily: UI }}>{n}</text>
          <text x={x + 10} y="147" fill="#9AA3B5" fontSize="9.5" style={{ fontFamily: UI }}>ReportGenerator</text>
          <text x={x + 10} y="161" fill="#FF7A1A" fontSize="9.5" style={{ fontFamily: 'var(--mono)' }}>generate() ✓</text>
        </g>
      ))}
    </svg>
  );
}
