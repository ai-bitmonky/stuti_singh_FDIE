'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT, CATEGORIES, compute, viewByRange, type Category, type Computed, type Expense, type State } from '@/lib/engine';
import { fmtPlain, pct } from '@/lib/format';
import { useDesk } from '../ctx';
import { DailyBars, dailyDays } from '../charts/DailyBars';
import { Donut } from '../charts/Donut';
import { Heatmap } from '../charts/Heatmap';
import { Weekly, weekBuckets } from '../charts/Weekly';
import { Icon } from '../ui/Icon';
import { CountMoney, Money } from '../ui/Money';
import { Seg } from '../ui/Seg';
import { vars, vi } from '../ui/util';

export type AnTab = 'categories' | 'daily' | 'weekly';
const TABS = [['categories', 'Categories'], ['daily', 'Daily'], ['weekly', 'Weekly']] as const;

interface Merchant { name: string; total: number; n: number; cat: Category }
function topMerchants(list: Expense[]): Merchant[] {
  const m = new Map<string, { name: string; total: number; n: number; cats: Partial<Record<Category, number>> }>();
  list.forEach((e) => {
    const name = (e.note || '').trim() || '(no note)', key = name.toLowerCase();
    const r = m.get(key) || { name, total: 0, n: 0, cats: {} };
    r.total += e.amount;
    r.n++;
    r.cats[e.category] = (r.cats[e.category] || 0) + e.amount;
    m.set(key, r);
  });
  return [...m.values()]
    .map((r) => ({ name: r.name, total: r.total, n: r.n, cat: (Object.entries(r.cats) as [Category, number][]).sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

function Categories({ c }: { c: Computed }) {
  const { animate } = useDesk();
  const [hover, setHover] = useState<Category | null>(null);
  if (c.empty) {
    return (
      <div className="mini-empty" style={{ padding: 60 }}>
        <Icon name="pie" size={28} />
        <span>No expenses in this range.</span>
        <a className="card-link" href="#add">
          Add one <Icon name="chevR" size={14} />
        </a>
      </div>
    );
  }
  return (
    <>
      <div className="card-head">
        <div>
          <div className="card-title">Spending by category</div>
          <div className="card-sub">Hover a segment or a row to focus it</div>
        </div>
      </div>
      <div className="donut-layout">
        <div className={`donut-wrap${hover ? ' hovering' : ''}`}>
          <Donut c={c} hover={hover} onHover={setHover} />
          <div className="donut-center">
            {hover ? (
              <>
                <div className="dc-l">
                  {CAT[hover].glyph} {hover}
                </div>
                <div className="dc-v">
                  <Money n={c.byCat[hover]} />
                </div>
                <div className="dc-s">
                  {pct(c.share[hover], 1)} · {c.counts[hover]} txn{c.counts[hover] === 1 ? '' : 's'}
                </div>
              </>
            ) : (
              <>
                <div className="dc-l">Total</div>
                <div className="dc-v">
                  <CountMoney n={c.total} animate={animate} />
                </div>
                <div className="dc-s">
                  {c.ranked.filter((x) => c.byCat[x]).length} categories · {c.count} txns
                </div>
              </>
            )}
          </div>
        </div>
        <table className={`legend-table${hover ? ' hovering' : ''}`}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Share</th>
              <th>Txns</th>
              <th>Avg ticket</th>
            </tr>
          </thead>
          <tbody>
            {c.ranked.map((k) => (
              <tr
                key={k}
                className={hover === k ? 'hl' : undefined}
                style={c.byCat[k] ? undefined : { opacity: 0.4 }}
                onMouseEnter={() => c.byCat[k] && setHover(k)}
                onMouseLeave={() => setHover(null)}
              >
                <td>
                  <span className="lt-name">
                    <span className="sw" style={{ background: CAT[k].color }} />
                    <span aria-hidden="true">{CAT[k].glyph}</span>
                    {k}
                  </span>
                </td>
                <td>{c.byCat[k] ? <Money n={c.byCat[k]} cls="cur-sm" /> : '—'}</td>
                <td>{pct(c.share[k], 1)}</td>
                <td>{c.counts[k]}</td>
                <td>{c.counts[k] ? fmtPlain(c.byCat[k] / c.counts[k]) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>
                <Money n={c.total} cls="cur-sm" />
              </td>
              <td>100%</td>
              <td>{c.count}</td>
              <td>{fmtPlain(c.avgTicket)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export function Analytics({ state, tab, setTab }: { state: State; tab: AnTab; setTab: (t: AnTab) => void }) {
  const { range, replay } = useDesk();
  const [shown, setShown] = useState<AnTab>(tab);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const list = useMemo(() => viewByRange(state, range), [state, range]);
  const c = useMemo(() => compute(list, state.budget), [list, state.budget]);
  const merchants = useMemo(() => topMerchants(list), [list]);
  const rangeTxt = range === 'all' ? `all ${c.days} days` : `last ${range} days`;

  let meta = '';
  if (shown === 'categories') meta = `${fmtPlain(c.total)} across ${c.count} transactions · ${rangeTxt}`;
  else if (shown === 'daily') {
    const r = dailyDays(state.expenses);
    meta = `${fmtPlain(r.total)} in the last 30 days · average ${fmtPlain(r.avg)}/day`;
  } else {
    const wk = weekBuckets(state.expenses), cur = wk[wk.length - 1], prev = wk[wk.length - 2];
    meta = `This week ${fmtPlain(cur.total)}${prev && prev.total ? ` · ${cur.total >= prev.total ? '+' : '−'}${Math.abs((cur.total / prev.total - 1) * 100).toFixed(0)}% vs last week` : ''}`;
  }

  return (
    <>
      <div className="an-head">
        <Seg<AnTab>
          options={TABS}
          value={tab}
          className="lg"
          onChange={(v) => {
            if (v === tab) return;
            setTab(v);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              setShown(v);
              replay();
            }, 180);
          }}
        />
        <span className="an-meta">{meta}</span>
      </div>
      <div className="grid">
        <article key={shown} className="card span-12 flat" style={vi(0)}>
          {shown === 'categories' && <Categories c={c} />}
          {shown === 'daily' && (
            <>
              <div className="card-head">
                <div>
                  <div className="card-title">Daily spend</div>
                  <div className="card-sub">Last 30 days · all data · striped bars are weekends</div>
                </div>
                <div className="legend">
                  <span>
                    <i style={{ background: 'linear-gradient(#FFB169,#FF7A1A)' }} />
                    Weekday
                  </span>
                  <span>
                    <i style={{ background: 'repeating-linear-gradient(45deg,#FF7A1A 0 3px,#FFC79A 3px 5px)' }} />
                    Weekend
                  </span>
                  <span>
                    <i className="dash" />
                    30-day average
                  </span>
                </div>
              </div>
              <DailyBars expenses={state.expenses} />
            </>
          )}
          {shown === 'weekly' && (
            <>
              <div className="card-head">
                <div>
                  <div className="card-title">Weekly spend by category</div>
                  <div className="card-sub">7-day buckets ending today · all data</div>
                </div>
                <div className="legend">
                  {CATEGORIES.map((k) => (
                    <span key={k}>
                      <i style={{ background: CAT[k].color }} />
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <Weekly expenses={state.expenses} />
            </>
          )}
        </article>
        <article className="card span-6 md-12" style={vi(1)}>
          <div className="card-head">
            <div>
              <div className="card-title">Top merchants</div>
              <div className="card-sub">Grouped by note · {rangeTxt}</div>
            </div>
            <span className="kpi-ic">
              <Icon name="receipt" size={16} />
            </span>
          </div>
          <div className="merchants">
            {merchants.length ? (
              merchants.map((r, i) => (
                <div key={r.name.toLowerCase()} className="mer">
                  <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span aria-hidden="true">{CAT[r.cat].glyph}</span>
                      <span className="m-name" title={r.name}>
                        {r.name}
                      </span>
                    </div>
                    <div className="m-bar">
                      <i className="a-barx" style={{ ...vars({ '--i': i }), width: `${((r.total / merchants[0].total) * 100).toFixed(1)}%`, background: CAT[r.cat].color }} />
                    </div>
                  </div>
                  <div>
                    <div className="m-amt">
                      <Money n={r.total} cls="cur-sm" />
                    </div>
                    <div className="m-sub" style={{ textAlign: 'right' }}>
                      {r.n} visit{r.n === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="mini-empty">
                <Icon name="receipt" size={28} />
                <span>No merchants yet.</span>
              </div>
            )}
          </div>
        </article>
        <article className="card span-6 md-12" style={vi(2)}>
          <div className="card-head">
            <div>
              <div className="card-title">Spending heatmap</div>
              <div className="card-sub">Last 28 days · darker = more spent</div>
            </div>
            <span className="kpi-ic">
              <Icon name="calendar" size={16} />
            </span>
          </div>
          <Heatmap expenses={state.expenses} />
          <div className="heat-legend">
            Less <i style={{ background: 'var(--surface-3)' }} />
            <i style={{ background: 'rgba(255,122,26,.3)' }} />
            <i style={{ background: 'rgba(255,122,26,.55)' }} />
            <i style={{ background: 'rgba(255,122,26,.8)' }} />
            <i style={{ background: '#FF7A1A' }} /> More
          </div>
        </article>
      </div>
    </>
  );
}
