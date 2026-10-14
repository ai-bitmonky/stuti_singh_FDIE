'use client';
import { useMemo, useState } from 'react';
import type { Expense } from '@/lib/engine';
import { addDays, dailyMapOf, fmtDay, fmtPlain, isWeekend, iso, todayD } from './data';
import { useDesk } from '../ctx';
import { YGrid } from './Axis';
import { niceStep, ticks, useSize } from './util';
import { vars } from '../ui/util';

const P = { l: 44, r: 8, t: 22, b: 30 }, N = 30;

export interface DailyDay { k: string; d: Date; v: number; n: number; we: boolean }

/** Last 30 days of all data (not range-filtered), as in the prototype. */
export function dailyDays(expenses: Expense[]): { days: DailyDay[]; avg: number; total: number } {
  const t = todayD(), dm = dailyMapOf(expenses), cnt: Record<string, number> = {};
  expenses.forEach((e) => (cnt[e.date] = (cnt[e.date] || 0) + 1));
  const days: DailyDay[] = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = addDays(t, -i), k = iso(d);
    days.push({ k, d, v: dm[k] || 0, n: cnt[k] || 0, we: isWeekend(d) });
  }
  const total = days.reduce((s, x) => s + x.v, 0);
  const avg = days.some((x) => x.v > 0) ? total / N : 0;
  return { days, avg, total };
}

/** Daily spend bars (weekends striped) with a 30-day average line. */
export function DailyBars({ expenses }: { expenses: Expense[] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const { showTip, hideTip } = useDesk();
  const [hi, setHi] = useState<number | null>(null);
  const { days, avg } = useMemo(() => dailyDays(expenses), [expenses]);
  const W = Math.max(400, size.w), H = size.h || 300;
  const max = Math.max(...days.map((x) => x.v), 1), step = niceStep(max / 4), top = step * Math.ceil(max / step);
  const iw = W - P.l - P.r, ih = H - P.t - P.b, sx = iw / N, bw = Math.max(4, Math.min(22, sx * 0.62));
  const y = (v: number) => P.t + ih * (1 - v / top);

  return (
    <div className="chart an-chart" ref={ref}>
      {size.w > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily spend, last 30 days">
          <defs>
            <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFB169" />
              <stop offset="1" stopColor="#FF7A1A" />
            </linearGradient>
            <pattern id="pWeekend" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#FF7A1A" />
              <rect width="2.5" height="6" fill="#FFB169" opacity=".55" />
            </pattern>
          </defs>
          <YGrid vals={ticks(step, top)} y={y} left={P.l} right={W - P.r} />
          {days.map((x, i) => {
            const cx = P.l + sx * i + sx / 2, hgt = x.v ? Math.max(3, (ih * x.v) / top) : 2;
            return (
              <rect
                key={x.k}
                className={`${x.v ? 'a-bar' : ''} dbar`}
                x={(cx - bw / 2).toFixed(1)}
                y={(y(0) - hgt).toFixed(1)}
                width={bw.toFixed(1)}
                height={hgt.toFixed(1)}
                rx={Math.min(4, bw / 2)}
                fill={x.v ? (x.we ? 'url(#pWeekend)' : 'url(#gBar)') : 'var(--surface-3)'}
                style={{ ...vars({ '--i': i }), transition: 'opacity .15s', opacity: hi == null || hi === i ? 1 : 0.35 }}
              />
            );
          })}
          {days.map((x, i) =>
            i === N - 1 || (N - 1 - i) % 5 === 0 ? (
              <text key={x.k} className="axis-t" x={P.l + sx * i + sx / 2} y={H - 8} textAnchor="middle">
                {i === N - 1 ? 'Today' : fmtDay(x.k)}
              </text>
            ) : null,
          )}
          {avg > 0 && (
            <>
              <line className="a-fade" x1={P.l} x2={W - P.r} y1={y(avg)} y2={y(avg)} stroke="var(--text-2)" strokeDasharray="3 5" strokeWidth="1.25" />
              <text className="axis-t a-fade" x={P.l + 6} y={y(avg) - 7} textAnchor="start" style={{ fill: 'var(--text-2)' }}>
                30-day avg {fmtPlain(avg)}/day
              </text>
            </>
          )}
          {days.map((x, i) => (
            <rect
              key={x.k}
              className="hit"
              x={P.l + sx * i}
              y={P.t}
              width={sx}
              height={ih}
              onMouseEnter={(ev) => {
                setHi(i);
                const r = ev.currentTarget.getBoundingClientRect();
                const hgt = x.v ? Math.max(3, (ih * x.v) / top) : 2;
                const svgTop = r.top - P.t;
                const pctVsAvg = (x.v / avg - 1) * 100;
                showTip(
                  <>
                    <div className="t-h">
                      {x.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                      {x.we ? ' · weekend' : ''}
                    </div>
                    <div className="t-v">{fmtPlain(x.v)}</div>
                    <div className="t-r">
                      <span>Transactions</span>
                      <b>{x.n}</b>
                    </div>
                    {avg > 0 && (
                      <div className="t-r">
                        <span>vs 30-day avg</span>
                        <b>{x.v ? (pctVsAvg >= 0 ? '+' : '') + pctVsAvg.toFixed(0) + '%' : '—'}</b>
                      </div>
                    )}
                  </>,
                  r.left + r.width / 2,
                  svgTop + y(0) - hgt,
                );
              }}
              onMouseLeave={() => {
                setHi(null);
                hideTip();
              }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
