import { fmtK } from '@/lib/format';

/** Horizontal grid lines + y labels. */
export function YGrid({ vals, y, left, right }: { vals: number[]; y: (v: number) => number; left: number; right: number }) {
  return (
    <>
      {vals.map((v) => (
        <g key={v}>
          <line className="grid-l" x1={left} x2={right} y1={y(v)} y2={y(v)} />
          <text className="axis-t" x={left - 10} y={y(v) + 4} textAnchor="end">
            {v ? fmtK(v) : '0'}
          </text>
        </g>
      ))}
    </>
  );
}
