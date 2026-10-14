'use client';
import { useEffect, useMemo, useState } from 'react';
import { CAT, sortedExpenses, type State } from '@/lib/engine';
import { relDate, todayISO } from '@/lib/format';
import { ExpenseForm, type RawForm } from '../ExpenseForm';
import { ImpactPanel, impactModel } from '../Impact';
import { Icon } from '../ui/Icon';
import { Money } from '../ui/Money';
import { RowActions } from '../ui/TxRow';
import { catStyle, vi } from '../ui/util';

export function AddView({ state }: { state: State }) {
  const [raw, setRaw] = useState<RawForm>({ amount: '', category: null, date: todayISO(), note: '' });
  const [flashId, setFlashId] = useState<string | null>(null);
  const m = useMemo(() => impactModel(state, raw), [state, raw]);
  const recent = useMemo(() => sortedExpenses(state).slice(0, 6), [state]);
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1400);
    return () => clearTimeout(t);
  }, [flashId]);

  return (
    <div className="add-layout">
      <article className="card flat" style={vi(0)}>
        <div className="card-head">
          <div>
            <div className="card-title" style={{ fontSize: 18 }}>
              Log an expense
            </div>
            <div className="card-sub">Amount, category and date are required. Notes stay on this device.</div>
          </div>
          <span className="kbd" title="Open quick add from anywhere">
            N
          </span>
        </div>
        <ExpenseForm mode="add" onChange={setRaw} onSaved={(e) => setFlashId(e.id)} />
      </article>
      <div className="stack">
        <article className="card impact" style={vi(1)}>
          <div className="card-head" style={{ marginBottom: 10 }}>
            <div>
              <div className="card-title">Live impact</div>
              <div className="card-sub">Across all data · updates as you type</div>
            </div>
            <span className="pill info">
              <Icon name="sparkles" size={14} />
              Preview
            </span>
          </div>
          <div aria-live="polite">
            <ImpactPanel m={m} />
          </div>
        </article>
        <article className="card" style={vi(2)}>
          <div className="card-head" style={{ marginBottom: 6 }}>
            <div>
              <div className="card-title">Recent entries</div>
              <div className="card-sub">Hover to edit or delete</div>
            </div>
            <a className="card-link" href="#overview">
              All <Icon name="chevR" size={14} />
            </a>
          </div>
          <div className="recent-list">
            {recent.length ? (
              recent.map((e) => (
                <div key={e.id} className={'rl' + (e.id === flashId ? ' flash' : '')}>
                  <span className="glyph sm" style={catStyle(e.category)} aria-hidden="true">
                    {CAT[e.category].glyph}
                  </span>
                  <div className="rl-text">
                    <div className="rl-note" title={e.note || e.category}>
                      {e.note || e.category}
                    </div>
                    <div className="rl-sub">
                      {e.category} · {relDate(e.date)}
                    </div>
                  </div>
                  <span className="rl-amt">
                    <Money n={e.amount} cls="cur-sm" />
                  </span>
                  <RowActions e={e} />
                </div>
              ))
            ) : (
              <div className="mini-empty">
                <Icon name="receipt" size={28} />
                <span>Your entries will appear here.</span>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
