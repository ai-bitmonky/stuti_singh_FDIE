'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT, CATEGORIES, compute, dailyMap, sortedExpenses, viewByRange, windowTotal, type State } from '@/lib/engine';
import { fmtN, fmtPlain, pct, relDate } from '@/lib/format';
import { useDesk } from '../ctx';
import { Cumulative, Sparkline } from '../charts/Cumulative';
import { Icon } from '../ui/Icon';
import { CountInt, CountMoney, Money } from '../ui/Money';
import { Ring } from '../ui/Ring';
import { Seg } from '../ui/Seg';
import { StatusPill } from '../ui/StatusPill';
import { TxRow } from '../ui/TxRow';
import { budgetColor, catStyle, vars, vi } from '../ui/util';
import { OverviewEmpty } from './OverviewEmpty';

const CHART_RANGES = [[7, '7D'], [14, '14D'], [30, '30D']] as const;

function BudgetOf({ budget, editing, onEnd }: { budget: number; editing: boolean; onEnd: () => void }) {
  const { applyBudget } = useDesk();
  const [val, setVal] = useState(String(budget));
  const done = useRef(false);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) return;
    done.current = false;
    inp.current?.focus();
    inp.current?.select();
  }, [editing]);
  const fin = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save && !applyBudget(val)) {
      done.current = false;
      inp.current?.focus();
      return;
    }
    onEnd();
  };
  if (!editing) return <div className="rc-s">of {fmtPlain(budget)}</div>;
  return (
    <div className="rc-s">
      of ₹
      <input
        ref={inp}
        className="input"
        inputMode="numeric"
        aria-label="Monthly budget"
        value={val}
        style={{ width: 110, height: 30, padding: '0 8px', font: '700 13px var(--font-display)', textAlign: 'center' }}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') fin(true);
          if (e.key === 'Escape') {
            e.stopPropagation();
            fin(false);
          }
        }}
        onBlur={() => fin(true)}
      />
    </div>
  );
}

export function Overview({ state, chartRange, setChartRange }: { state: State; chartRange: number; setChartRange: (n: number) => void }) {
  const { range, animate, replay, search, setSearch } = useDesk();
  const list = useMemo(() => viewByRange(state, range), [state, range]);
  const c = useMemo(() => compute(list, state.budget), [list, state.budget]);
  const allDaily = useMemo(() => dailyMap(state.expenses), [state.expenses]);
  const [editBudget, setEditBudget] = useState(false);
  const q = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const s = sortedExpenses(state, list);
    if (!q) return s;
    return s.filter(
      (e) => (e.note || '').toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || String(e.amount).includes(q) || relDate(e.date).toLowerCase().includes(q),
    );
  }, [state, list, q]);

  if (c.empty) return <OverviewEmpty hasAny={state.expenses.length > 0} />;

  let delta = null;
  if (range !== 'all') {
    const N = Number(range), cur = windowTotal(state, 0, N - 1), prev = windowTotal(state, N, 2 * N - 1);
    if (prev > 0) {
      const d = (cur - prev) / prev, up = d > 0;
      delta = (
        <span className={`delta ${up ? 'up' : 'down'}`} title={`vs previous ${N} days (${fmtPlain(prev)})`}>
          <Icon name={up ? 'up' : 'down'} size={14} />
          {Math.abs(d * 100).toFixed(0)}% vs prev {N}d
        </span>
      );
    }
  }
  const spanDays = range === 'all' ? c.days : Number(range);
  const col = budgetColor(c.used);
  const catMax = Math.max(...CATEGORIES.map((k) => c.byCat[k]), 1);
  const headroom = c.diff >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="grid">
      <article className="card span-8 md-12" style={vi(0)}>
        <div className="hero-top">
          <div>
            <div className="label">Total spent · last {spanDays} days</div>
            <div className="hero-num">
              <CountMoney n={c.total} animate={animate} />
            </div>
            <div className="hero-meta">
              {delta}
              <span>
                <b>{fmtPlain(c.dailyPace)}</b>/day average · {c.count} transactions
              </span>
            </div>
          </div>
          <Seg
            options={CHART_RANGES}
            value={chartRange as 7 | 14 | 30}
            onChange={(v) => {
              setChartRange(v);
              replay();
            }}
          />
        </div>
        <Cumulative key={chartRange} N={chartRange} daily={allDaily} budget={state.budget} />
        <div className="legend" style={{ marginTop: 6 }}>
          <span>
            <i style={{ background: 'linear-gradient(90deg,#FF7A1A,#FFB169)' }} />
            Cumulative spend · last {chartRange} days
          </span>
          <span>
            <i className="dash" />
            Budget pace (₹{fmtN(state.budget)} ÷ 30 per day)
          </span>
        </div>
      </article>

      <article className="card span-4 md-12 budget-card" style={vi(1)}>
        <div className="card-head">
          <div style={{ textAlign: 'left' }}>
            <div className="card-title">Monthly budget</div>
            <div className="card-sub">Estimate vs budget</div>
          </div>
          <button type="button" className="icon-btn sm" aria-label="Edit budget" title="Edit budget" onClick={() => setEditBudget(true)}>
            <Icon name="pencil" size={15} />
          </button>
        </div>
        <div className="ring-wrap">
          <Ring size={188} stroke={12} frac={c.used} color={col} />
          <div className="ring-center">
            <div className="rc-v">
              <CountMoney n={c.monthlyEstimate} animate={animate} />
            </div>
            <div className="rc-s" style={{ marginTop: 2, fontSize: 11, color: 'var(--text-3)' }}>
              estimated / month
            </div>
            {editBudget ? (
              <BudgetOf key="edit" budget={state.budget} editing onEnd={() => setEditBudget(false)} />
            ) : (
              <BudgetOf budget={state.budget} editing={false} onEnd={() => undefined} />
            )}
            <div className="rc-p" style={{ color: col }}>
              {Math.round(c.used * 100)}% used
            </div>
          </div>
        </div>
        <div className="budget-status">
          <StatusPill status={c.status} />
          <span className="based">
            Based on {c.days} observed day{c.days === 1 ? '' : 's'}
            {c.days < 7 ? ' · early estimate' : ''}
          </span>
        </div>
        <div className="budget-split">
          <div className="bs-item">
            <div className="label" style={{ fontSize: 10.5 }}>
              Spent so far
            </div>
            <div className="bs-v">
              <Money n={c.total} cls="cur-sm" />
            </div>
            <div className="bs-h">{pct(c.spentPct)} of budget</div>
            <div className="bs-bar">
              <i className="a-barx" style={{ width: `${Math.min(100, c.spentPct * 100)}%`, background: budgetColor(c.spentPct) }} />
            </div>
          </div>
          <div className="bs-item">
            <div className="label" style={{ fontSize: 10.5 }}>
              {c.diff >= 0 ? 'Headroom' : 'Overshoot'}
            </div>
            <div className="bs-v" style={{ color: headroom }}>
              <Money n={Math.abs(c.diff)} cls="cur-sm" />
            </div>
            <div className="bs-h">at current pace</div>
            <div className="bs-bar">
              <i className="a-barx" style={{ width: `${Math.min(100, (Math.abs(c.diff) / state.budget) * 100)}%`, background: headroom }} />
            </div>
          </div>
        </div>
      </article>

      <div className="span-12 kpis">
        <article className="card kpi" style={vi(2)}>
          <div className="kpi-top">
            <span className="label">Monthly estimate</span>
            <span className="kpi-ic">
              <Icon name="calendar" size={16} />
            </span>
          </div>
          <div className="kpi-row">
            <div>
              <div className="kpi-v">
                <CountMoney n={c.monthlyEstimate} animate={animate} />
              </div>
            </div>
            <Sparkline values={c.series.map((s) => s.v)} />
          </div>
          <div className="kpi-h">Daily spend trend · based on {c.days} days</div>
        </article>
        <article className="card kpi" style={vi(3)}>
          <div className="kpi-top">
            <span className="label">Daily pace</span>
            <span className="kpi-ic">
              <Icon name="activity" size={16} />
            </span>
          </div>
          <div className="kpi-v">
            <CountMoney n={c.dailyPace} animate={animate} />
          </div>
          <div className="kpi-h">Budget allows {fmtPlain(state.budget / 30)}/day</div>
        </article>
        <article className="card kpi" style={vi(4)}>
          <div className="kpi-top">
            <span className="label">Weekly pace</span>
            <span className="kpi-ic">
              <Icon name="trend" size={16} />
            </span>
          </div>
          <div className="kpi-v">
            <CountMoney n={c.weeklyPace} animate={animate} />
          </div>
          <div className="kpi-h">Daily pace × 7</div>
        </article>
        <article className="card kpi" style={vi(5)}>
          <div className="kpi-top">
            <span className="label">Transactions</span>
            <span className="kpi-ic">
              <Icon name="receipt" size={16} />
            </span>
          </div>
          <div className="kpi-v">
            <CountInt n={c.count} animate={animate} />
          </div>
          <div className="kpi-h">Avg ticket {fmtPlain(c.avgTicket)}</div>
        </article>
      </div>

      <article className="card span-5 md-12" style={vi(6)}>
        <div className="card-head">
          <div>
            <div className="card-title">Category breakdown</div>
            <div className="card-sub">Share of {fmtPlain(c.total)}</div>
          </div>
          <a className="card-link" href="#analytics">
            Details <Icon name="chevR" size={14} />
          </a>
        </div>
        <div className="cat-rows">
          {c.ranked.map((k, i) => (
            <div key={k} className={`cat-row${c.byCat[k] ? '' : ' zero'}`}>
              <span className="glyph" style={catStyle(k)} aria-hidden="true">
                {CAT[k].glyph}
              </span>
              <div>
                <div className="cr-top">
                  <span className="cr-name">
                    {k}
                    <span className="cr-cnt">
                      {c.counts[k]} txn{c.counts[k] === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="cr-amt">{c.byCat[k] ? <Money n={c.byCat[k]} cls="cur-sm" /> : '—'}</span>
                </div>
                <div className="cr-bar">
                  <i className="a-barx" style={{ ...vars({ '--i': i }), width: `${((c.byCat[k] / catMax) * 100).toFixed(1)}%`, background: CAT[k].color }} />
                </div>
              </div>
              <span className="cr-share">{pct(c.share[k])}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="card span-7 md-12 tx-card" style={vi(7)}>
        <div className="card-head">
          <div>
            <div className="card-title">Recent transactions</div>
            <div className="card-sub">
              {rows.length} of {list.length}
            </div>
          </div>
          <a className="card-link" href="#analytics">
            View all <Icon name="chevR" size={14} />
          </a>
        </div>
        <div className="tx-wrap">
          {q && (
            <div className="search-hit">
              <span>
                <Icon name="search" size={13} />
              </span>
              <span>{`${rows.length} match${rows.length === 1 ? '' : 'es'} for `}</span>
              <b>“{search.trim()}”</b>
              <button type="button" className="card-link" style={{ marginLeft: 'auto' }} onClick={() => setSearch('')}>
                Clear
              </button>
            </div>
          )}
          <table className="tx">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Date</th>
                <th className="num">Amount</th>
                <th>
                  <span className="sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((e) => <TxRow key={e.id} e={e} />)
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="mini-empty">
                      <Icon name="search" size={28} />
                      <span>{q ? 'No transactions match that search.' : 'No transactions in this range.'}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
