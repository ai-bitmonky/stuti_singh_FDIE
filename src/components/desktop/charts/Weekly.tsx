'use client';
import { useMemo, useState } from 'react';
import { CAT, CATEGORIES, type Category, type Expense } from '@/lib/engine';
import { clamp } from '@/lib/format';
import { addDays, dayDiff, fmtDay, fmtK, fmtPlain, iso, parseISO, pct, todayD } from './data';
import { useDesk } from '../ctx';
import { YGrid } from './Axis';
import { niceStep, ticks, useSize } from './util';
import { vars } from '../ui/util';

export interface Week { a: string; b: string; by: Record<Category, number>; total: number; lbl: string; current: boolean }

/** 4–5 seven-day buckets ending today over all data. */
export function weekBuckets(exps: Expense[]): Week[] {
  const t = todayD();
  const oldest = exps.length ? exps.reduce((m, e) => (e.date < m ? e.date : m), exps[0].date) : iso(t);
  const n = clamp(Math.ceil((dayDiff(parseISO(oldest), t) + 1) / 7), 4, 5);
  const out: Week[] = [];
  for (let w = n - 1; w >= 0; w--) {
    const end = addDays(t, -7 * w), start = addDays(end, -6), a = iso(start), b = iso(end);
    const by = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    exps.forEach((e) => {
      if (e.date >= a && e.date <= b) by[e.category] += e.amount;
    });
    const total = CATEGORIES.reduce((s, k) => s + by[k], 0);
    const lbl =
      start.getMonth() === end.getMonth()
        ? `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString('en-GB', { month: 'short' })}`
        : `${fmtDay(a)} – ${fmtDay(b)}`;
    out.push({ a, b, by, total, lbl, current: w === 0 });
  }
  return out;
}

const P = { l: 44, r: 8, t: 26, b: 34 };

/** Weekly spend stacked by category. */
export function Weekly({ expenses }: { expenses: Expense[] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const { showTip, hideTip } = useDesk();
  const [hiCat, setHiCat] = useState<Category | null>(null);
  const wk = useMemo(() => weekBuckets(expenses), [expenses]);
  const W = Math.max(400, size.w), H = size.h || 300;
  const max = Math.max(...wk.map((w) => w.total), 1), step = niceStep(max / 4), top = step * Math.ceil(max / step);
  const iw = W - P.l - P.r, ih = H - P.t - P.b, sx = iw / wk.length, bw = Math.min(96, sx * 0.48);
  const y = (v: number) => P.t + ih * (1 - v / top);

  return (
    <div className="chart an-chart" ref={ref}>
      {size.w > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly spend stacked by category">
          <YGrid vals={ticks(step, top)} y={y} left={P.l} right={W - P.r} />
          {wk.map((w, i) => {
            const cx = P.l + sx * i + sx / 2;
            let acc = 0;
            const segs = CATEGORIES.filter((k) => w.by[k]).map((k) => {
              const y0 = y(acc), y1 = y(acc + w.by[k]), hgt = Math.max(1, y0 - y1 - 2);
              acc += w.by[k];
              return (
                <rect
                  key={k}
                  className="wseg"
                  x={cx - bw / 2}
                  y={y1.toFixed(1)}
                  width={bw}
                  height={hgt.toFixed(1)}
                  rx="4"
                  fill={CAT[k].color}
                  style={{ transition: 'opacity .15s', opacity: hiCat == null || hiCat === k ? 1 : 0.3 }}
                  onMouseEnter={(ev) => {
                    setHiCat(k);
                    const r = ev.currentTarget.getBoundingClientRect();
                    showTip(
                      <>
                        <div className="t-h">
                          {fmtDay(w.a)} – {fmtDay(w.b)}
                        </div>
                        <div className="t-v">
                          <i className="sw" style={{ background: CAT[k].color }} />
                          {k}
                        </div>
                        <div className="t-r">
                          <span>Amount</span>
                          <b>{fmtPlain(w.by[k])}</b>
                        </div>
                        <div className="t-r">
                          <span>Share of week</span>
                          <b>{pct(w.by[k] / w.total)}</b>
                        </div>
                        <div className="t-r">
                          <span>Week total</span>
                          <b>{fmtPlain(w.total)}</b>
                        </div>
                      </>,
                      r.right,
                      r.top + r.height / 2,
                    );
                  }}
                  onMouseLeave={() => {
                    setHiCat(null);
                    hideTip();
                  }}
                />
              );
            });
            return (
              <g key={w.a}>
                <g className="a-bar" style={vars({ '--i': i * 3 })}>
                  {segs}
                </g>
                <text className="a-fade" x={cx} y={y(w.total) - 9} textAnchor="middle" style={{ fill: 'var(--text)', font: '600 12px var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>
                  {w.total ? fmtK(w.total) : ''}
                </text>
                <text className="axis-t" x={cx} y={H - 12} textAnchor="middle" style={w.current ? { fill: 'var(--text-2)', fontWeight: 600 } : undefined}>
                  {w.current ? 'This week' : w.lbl}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
