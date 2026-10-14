'use client';
import { useMemo } from 'react';
import type { Expense } from '@/lib/engine';
import { addDays, dailyMapOf, fmtPlain, iso, todayD } from './data';
import { useDesk } from '../ctx';

/** 4-week calendar heatmap ending today. */
export function Heatmap({ expenses }: { expenses: Expense[] }) {
  const { showTip, hideTip } = useDesk();
  const { start, cells, max } = useMemo(() => {
    const t = todayD(), dm = dailyMapOf(expenses), cnt: Record<string, number> = {};
    expenses.forEach((e) => (cnt[e.date] = (cnt[e.date] || 0) + 1));
    const start = addDays(t, -27);
    const cells = Array.from({ length: 28 }, (_, i) => {
      const d = addDays(start, i), k = iso(d);
      return { d, k, v: dm[k] || 0, n: cnt[k] || 0 };
    });
    return { start, cells, max: Math.max(...cells.map((c) => c.v), 1) };
  }, [expenses]);
  const col = (v: number) => (v ? `rgba(255,122,26,${(0.16 + 0.84 * Math.sqrt(v / max)).toFixed(2)})` : 'var(--surface-3)');

  return (
    <div className="heat">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={'h' + i} className="hd">
          {addDays(start, i).toLocaleDateString('en-GB', { weekday: 'short' })}
        </div>
      ))}
      {cells.map((c, i) => {
        const show = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          showTip(
            <>
              <div className="t-h">
                {c.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                {i === 27 ? ' · today' : ''}
              </div>
              <div className="t-v">{fmtPlain(c.v)}</div>
              <div className="t-r">
                <span>Transactions</span>
                <b>{c.n}</b>
              </div>
            </>,
            r.left + r.width / 2,
            r.top,
          );
        };
        return (
          <div
            key={c.k}
            className={'hc' + (i === 27 ? ' today' : '')}
            style={{ background: col(c.v) }}
            tabIndex={0}
            aria-label={`${c.k}: ${fmtPlain(c.v)}`}
            onMouseEnter={(e) => show(e.currentTarget)}
            onFocus={(e) => show(e.currentTarget)}
            onMouseLeave={hideTip}
            onBlur={hideTip}
          >
            <span className="hn">{c.d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}
