'use client';
/** Live impact preview: how the monthly estimate & budget change before saving. */
import { CAT, compute, validate, type Category, type Computed, type Expense, type State } from '@/lib/engine';
import { clamp, fmtK, fmtPlain, pct } from '@/lib/format';
import type { RawForm } from './ExpenseForm';
import { Icon } from './ui/Icon';
import { Money } from './ui/Money';
import { StatusPill } from './ui/StatusPill';
import { budgetColor, budgetTextColor } from './ui/util';

export interface ImpactModel {
  before: Computed;
  after: Computed | null;
  cat: Category | null;
}

/** Totals across ALL data (not range-filtered), with the draft applied. */
export function impactModel(state: State, raw: RawForm, excludeId?: string): ImpactModel {
  const all = state.expenses, base = excludeId ? all.filter((e) => e.id !== excludeId) : all;
  const before = compute(all, state.budget);
  const v = validate({ ...raw, category: raw.category || 'Food' });
  if (v.errors.amount || v.errors.date || !String(raw.amount).trim() || !v.value) return { before, after: null, cat: raw.category };
  // compute needs a category; a neutral bucket is used for totals until one is chosen
  const cand: Expense = { id: '__preview', amount: v.value.amount, category: raw.category || 'Education', date: raw.date, note: '' };
  return { before, after: compute([...base, cand], state.budget), cat: raw.category };
}

const signed = (d: number) => (d >= 0 ? '+' : '−') + fmtPlain(Math.abs(d));

function Arrow() {
  return (
    <span className="arrow">
      <Icon name="arrowR" size={14} />
    </span>
  );
}

/** Full panel on the Add view. */
export function ImpactPanel({ m }: { m: ImpactModel }) {
  const b = m.before, a = m.after;
  const maxU = Math.max(1.15, b.used, a ? a.used : 0);
  const w = (u: number) => ((clamp(u, 0, maxU) / maxU) * 100).toFixed(1) + '%';
  const delta = a ? a.monthlyEstimate - b.monthlyEstimate : 0;
  const cat = m.cat;
  const mark = parseFloat(w(1));
  return (
    <>
      <div className="imp-flow">
        <div className="imp-box">
          <div className="label" style={{ fontSize: 10.5 }}>
            Now
          </div>
          <div className="ib-v">
            <Money n={b.monthlyEstimate} />
          </div>
          <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
            est. per month
          </div>
        </div>
        <span className="imp-arrow">
          <Icon name="arrowR" size={18} />
        </span>
        <div className="imp-box after">
          <div className="label" style={{ fontSize: 10.5, color: 'var(--accent-2)' }}>
            After saving
          </div>
          <div className="ib-v">{a ? <Money n={a.monthlyEstimate} /> : <span className="faint">—</span>}</div>
          <div style={{ fontSize: 11.5, marginTop: 2, color: !a ? 'var(--text-3)' : delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--text-3)' }}>
            {a ? `${signed(delta)} / month` : 'waiting for an amount'}
          </div>
        </div>
      </div>
      <div className="imp-meter">
        <div className="field-row">
          <span className="label" style={{ fontSize: 10.5 }}>
            Budget used
          </span>
          <span className="num" style={{ fontSize: 12, fontWeight: 600 }}>
            {pct(b.used)}
            {a && (
              <>
                {' → '}
                <span style={{ color: budgetTextColor(a.used) }}>{pct(a.used)}</span>
              </>
            )}
          </span>
        </div>
        <div className="im-track">
          {a && <span className="im-after" style={{ width: w(a.used) }} />}
          <span className="im-before" style={{ width: w(Math.min(b.used, a ? a.used : b.used)), background: budgetColor(b.used) }} />
          <span className="im-mark" style={{ left: w(1) }} title="Budget" />
        </div>
        <div className="im-legend">
          <span>₹0</span>
          <span style={{ marginLeft: 'auto', marginRight: `${(100 - mark).toFixed(1)}%`, transform: 'translateX(50%)' }}>{fmtK(b.budget)} budget</span>
        </div>
      </div>
      <div className="imp-list">
        <div className="il">
          <span>Budget status</span>
          <b>
            <StatusPill status={b.status} mini />
            {a && (
              <>
                <Arrow />
                <StatusPill status={a.status} mini />
              </>
            )}
          </b>
        </div>
        {cat && (
          <div className="il">
            <span>
              {CAT[cat].glyph} {cat} share
            </span>
            <b>
              {pct(b.share[cat] || 0)}
              {a && (
                <>
                  <Arrow />
                  {pct(a.share[cat])}
                </>
              )}
            </b>
          </div>
        )}
        <div className="il">
          <span>Spent so far</span>
          <b>
            {fmtPlain(b.total)}
            {a && (
              <>
                <Arrow />
                {fmtPlain(a.total)}
              </>
            )}
          </b>
        </div>
        <div className="il">
          <span>Observed days</span>
          <b>
            {b.days}
            {a && a.days !== b.days && (
              <>
                <Arrow />
                {a.days}
              </>
            )}
          </b>
        </div>
      </div>
      {!a && (
        <p className="imp-empty">
          <Icon name="info" size={14} />
          Type an amount to preview its impact before saving.
        </p>
      )}
    </>
  );
}

/** One-line summary in the drawer. */
export function DrawerImpact({ m }: { m: ImpactModel }) {
  if (!m.after) {
    return (
      <div className="drawer-impact" aria-live="polite">
        <span>
          <Icon name="info" size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
          Monthly estimate now <b>{fmtPlain(m.before.monthlyEstimate)}</b>
        </span>
        <StatusPill status={m.before.status} />
      </div>
    );
  }
  const dl = m.after.monthlyEstimate - m.before.monthlyEstimate;
  return (
    <div className="drawer-impact" aria-live="polite">
      <span>
        Estimate <b>{fmtPlain(m.before.monthlyEstimate)}</b> → <b>{fmtPlain(m.after.monthlyEstimate)}</b>{' '}
        <span style={{ color: dl > 0 ? 'var(--red)' : 'var(--green)' }}>({signed(dl)})</span>
      </span>
      <StatusPill status={m.after.status} />
    </div>
  );
}
