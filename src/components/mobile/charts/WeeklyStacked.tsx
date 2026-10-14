'use client';
/** Last 4 weeks as category-stacked bars with totals and a week-over-week pill. */
import { CAT, CATEGORIES, type Category, type Expense } from '@/lib/engine';
import { MON, addDays, fmtK, fmtN, iso, parseISO, pct, todayD } from '@/lib/format';
import { Icon } from '../icons';
import { Money } from '../ui';

interface Week { s: string; e: string; by: Record<Category, number>; total: number; label: string }

const W = 329, H = 170, SLOT = W / 4, BW = 46;

export default function WeeklyStacked({ expenses }: { expenses: Expense[] }) {
  const t = todayD();
  const weeks: Week[] = [];
  for (let w = 3; w >= 0; w--) {
    const end = addDays(t, -w * 7), start = addDays(end, -6);
    const s = iso(start), e = iso(end);
    const by = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const x of expenses) if (x.date >= s && x.date <= e) by[x.category] += x.amount;
    const ps = parseISO(s), pe = parseISO(e);
    weeks.push({ s, e, by, total: CATEGORIES.reduce((a, c) => a + by[c], 0), label: `${ps.getDate()} ${MON[ps.getMonth()]}–${pe.getDate()}` });
  }
  const max = Math.max(...weeks.map((w) => w.total), 1);
  const cur = weeks[3].total, prev = weeks[2].total, d = prev ? (cur - prev) / prev : null;

  return (
    <div className="card chart-card">
      <div className="cc-h">
        <div>
          <div className="cc-k">This week</div>
          <div className="cc-v"><Money v={cur} /></div>
        </div>
        {d != null && (
          <span className={'pill ' + (d > 0 ? 'bad' : 'good')}>
            <Icon name={d > 0 ? 'up' : 'down'} size={13} sw={2.4} />{pct(Math.abs(d))} vs last
          </span>
        )}
      </div>
      <div className="bars" style={{ cursor: 'default' }}>
        <svg viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label="Weekly spending by category">
          {[0.33, 0.66].map((f) => (
            <line key={f} x1="0" x2={W} y1={H - f * (H - 24)} y2={H - f * (H - 24)} stroke="rgba(255,255,255,.05)" />
          ))}
          {weeks.map((w, i) => {
            let y = H;
            const x = i * SLOT + (SLOT - BW) / 2;
            const segs = CATEGORIES.filter((c) => w.by[c] > 0);
            const rects = segs.map((c, j) => {
              const h = (w.by[c] / max) * (H - 24);
              y -= h;
              return (
                <rect
                  key={c} className="bar" x={x} y={(y + (j ? 1 : 0)).toFixed(1)} width={BW}
                  height={Math.max(0, h - (j ? 1 : 0)).toFixed(1)} rx={j === segs.length - 1 ? 6 : 1.5} fill={CAT[c].color}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <title>{`${c} ₹${fmtN(w.by[c])}`}</title>
                </rect>
              );
            });
            return (
              <g key={w.s}>
                {rects}
                <text x={x + BW / 2} y={Math.max(12, y - 7)} textAnchor="middle" fill="#9AA3B5" fontSize="11" fontWeight="600" style={{ fontFamily: 'var(--font)' }} className="fade-in">
                  ₹{fmtK(w.total)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="axis" style={{ justifyContent: 'space-around' }}>
        {weeks.map((w, i) => <span key={w.s}>{i === 3 ? 'This wk' : w.label}</span>)}
      </div>
      <div className="legend-chips">
        {CATEGORIES.map((c) => <span key={c}><i style={{ ['--c' as string]: CAT[c].color }} />{c}</span>)}
      </div>
    </div>
  );
}
