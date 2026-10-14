'use client';
import { CAT, type Category, type Computed } from '@/lib/engine';
import { fmtPlain, pct } from '@/lib/format';
import { vars } from '../ui/util';

const S = 300, SW = 14, R = S / 2 - SW / 2 - 6, C = 2 * Math.PI * R, GAP = 3;

/** Category donut; hover state is owned by the parent (shared with the legend table). */
export function Donut({ c, hover, onHover }: { c: Computed; hover: Category | null; onHover: (k: Category | null) => void }) {
  const cats = c.ranked.filter((k) => c.byCat[k] > 0);
  const single = cats.length === 1;
  let start = 0;
  const arcs = cats.map((k, i) => {
    const len = c.share[k] * C;
    const dash = single ? C : Math.max(0.001, len - GAP - SW);
    const off = single ? 0 : -(start + (GAP + SW) / 2);
    start += len;
    return (
      <circle
        key={k}
        className={`arc a-arc${hover === k ? ' hl' : ''}`}
        cx={S / 2}
        cy={S / 2}
        r={R}
        fill="none"
        stroke={CAT[k].color}
        strokeWidth={SW}
        strokeLinecap={single ? 'butt' : 'round'}
        strokeDasharray={`${dash.toFixed(2)} ${C.toFixed(2)}`}
        strokeDashoffset={off.toFixed(2)}
        style={vars({ '--c': C.toFixed(2), '--i': i })}
        transform={`rotate(-90 ${S / 2} ${S / 2})`}
        onMouseEnter={() => onHover(k)}
        onMouseLeave={() => onHover(null)}
      >
        <title>{`${k}: ${fmtPlain(c.byCat[k])} (${pct(c.share[k])})`}</title>
      </circle>
    );
  });
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Spending by category donut">
      <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={SW} />
      {arcs}
      <circle cx={S / 2} cy={S / 2} r={R - 30} fill="none" stroke="var(--line)" strokeDasharray="1 5" />
    </svg>
  );
}
