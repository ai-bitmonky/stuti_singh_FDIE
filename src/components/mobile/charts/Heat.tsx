'use client';
/** 28-day calendar heatmap; tap a day for its total and transaction count. */
import { useState } from 'react';
import type { Computed, Expense } from '@/lib/engine';
import { DOW, fmtN, parseISO, relDate, todayISO } from '@/lib/format';
import { haptic } from '../device';
import { lastNDays } from './DailyBars';

export default function Heat({ c, expenses }: { c: Computed; expenses: Expense[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const days = lastNDays(28);
  const vals = days.map((d) => c.byDate[d] || 0);
  const max = Math.max(...vals, 1);
  const today = todayISO();
  const n = sel == null ? 0 : expenses.filter((x) => x.date === days[sel]).length;
  return (
    <div className="card chart-card">
      <div className="heat">
        {days.slice(0, 7).map((d) => <div key={'h' + d} className="dh">{DOW[parseISO(d).getDay()][0]}</div>)}
        {days.map((d, i) => {
          const v = vals[i];
          const a = v ? (0.18 + 0.82 * (v / max)).toFixed(2) : 0;
          return (
            <button
              key={d}
              type="button"
              className={'hc' + (v ? '' : ' none') + (d === today ? ' today' : '') + (sel === i ? ' on' : '')}
              style={{ ['--a' as string]: a, animationDelay: `${i * 14}ms` }}
              aria-label={relDate(d)}
              onClick={() => { haptic(4); setSel(i); }}
            >
              {parseISO(d).getDate()}
            </button>
          );
        })}
      </div>
      <div className="heat-info">
        <span>
          {sel == null ? 'Tap a day' : (
            <><b style={{ color: 'var(--text)' }}>{relDate(days[sel])}</b> · ₹{fmtN(vals[sel])} · {n} txn{n === 1 ? '' : 's'}</>
          )}
        </span>
        <span className="heat-scale">
          Less {[0.18, 0.4, 0.6, 0.8, 1].map((a) => <i key={a} style={{ ['--a' as string]: a }} />)} More
        </span>
      </div>
    </div>
  );
}
