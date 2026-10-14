'use client';
import { useMemo } from 'react';
import { CAT, SIM_CATS, compute, simulate, viewByRange, type SimCategory, type State } from '@/lib/engine';
import { fmtPlain, pct } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useDesk } from '../ctx';
import { SimBars } from '../charts/SimBars';
import { Icon } from '../ui/Icon';
import { Money } from '../ui/Money';
import { StatusPill } from '../ui/StatusPill';
import { budgetTextColor, catStyle, vars, vi } from '../ui/util';

const PRESETS: [string, number][] = [['Reset', 0], ['Gentle 10%', 10], ['Moderate 25%', 25], ['Aggressive 50%', 50]];

export function Simulate({ state }: { state: State }) {
  const { setSim } = useFDIE();
  const { range, openDrawer } = useDesk();
  const c = useMemo(() => compute(viewByRange(state, range), state.budget), [state, range]);
  const s = useMemo(() => simulate(c, state.sim), [c, state.sim]);

  if (c.empty) {
    return (
      <article className="card flat">
        <div className="empty">
          <Icon name="sliders" size={40} style={{ color: 'var(--text-3)' }} />
          <h3>Nothing to simulate yet</h3>
          <p>Scenarios work on your current pace, so add a few expenses (or widen the date range) first.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => openDrawer()}>
            <Icon name="plus" size={16} />
            Add an expense
          </button>
        </div>
      </article>
    );
  }

  const vals = SIM_CATS.map((k) => state.sim[k]);
  const simUsed = s.simMonthly / c.budget;

  return (
    <div className="grid">
      <article className="card span-5 md-12 flat" style={vi(0)}>
        <div className="card-head">
          <div>
            <div className="card-title">Adjust spending</div>
            <div className="card-sub">Cut each category by a percentage of its current pace</div>
          </div>
        </div>
        <div className="presets" role="group" aria-label="Presets">
          {PRESETS.map(([l, v]) => (
            <button
              key={l}
              type="button"
              className={vals.every((x) => x === v) ? 'on' : undefined}
              onClick={() => setSim(Object.fromEntries(SIM_CATS.map((k) => [k, v])) as Record<SimCategory, number>)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="sliders">
          {s.rows
            .filter((r) => !r.fixed)
            .map((r) => {
              const k = r.cat as SimCategory, p = r.pct;
              const saved = Math.round(((r.current - r.simulated) / Math.max(1, c.days)) * 30);
              return (
                <div key={k} className="sl">
                  <div className="sl-top">
                    <span className="glyph sm" style={catStyle(k)} aria-hidden="true">
                      {CAT[k].glyph}
                    </span>
                    <div>
                      <div className="sl-name">{k}</div>
                      <div className="sl-cur">
                        {p ? (
                          <>
                            {fmtPlain(r.current)} → <b style={{ color: 'var(--text)' }}>{fmtPlain(r.simulated)}</b>
                          </>
                        ) : (
                          `${fmtPlain(r.current)} spent`
                        )}
                      </div>
                    </div>
                    <span className={`sl-save${saved ? '' : ' zero'}`}>{saved ? `−${fmtPlain(saved)}/mo` : 'no change'}</span>
                  </div>
                  <div className="range-wrap">
                    <span className={`bubble${p > 0 ? ' on' : ''}`} style={{ left: `calc(${p}% + ${(10 - p * 0.2).toFixed(1)}px)` }}>
                      {p ? `−${p}%` : '0%'}
                    </span>
                    <input
                      className="range"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={state.sim[k]}
                      style={vars({ '--p': p + '%' })}
                      aria-label={`Reduce ${k} by percent`}
                      onChange={(e) => setSim({ [k]: Number(e.target.value) })}
                    />
                  </div>
                  <div className="ticks">
                    <span>0%</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100%</span>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="fixed-row">
          <Icon name="lock" size={15} />
          <span className="glyph sm" style={catStyle('Education')} aria-hidden="true">
            {CAT.Education.glyph}
          </span>
          <span>
            <b style={{ color: 'var(--text)' }}>Education fixed</b> (not simulated) · {fmtPlain(c.byCat.Education)} stays as is
          </span>
        </div>
      </article>
      <div className="span-7 md-12 stack">
        <article className="card flat" style={vi(1)}>
          <div className="sim-summary">
            <div className="ss-col">
              <div className="label">Current est.</div>
              <div className="ss-v dim">
                <Money n={c.monthlyEstimate} />
              </div>
            </div>
            <span className="ss-arrow">
              <Icon name="arrowR" size={22} />
            </span>
            <div className="ss-col">
              <div className="label">Simulated est.</div>
              <div className="ss-v">
                <Money n={s.simMonthly} />
              </div>
            </div>
            <div className="ss-save">
              <div className="label" style={{ color: 'var(--green)' }}>
                You&apos;d save
              </div>
              <div className="big">
                <span>
                  <Money n={Math.max(0, s.savingsMonthly)} />
                </span>
                <span style={{ fontSize: 15, color: 'var(--text-2)', fontWeight: 600, letterSpacing: 0 }}>/month</span>
              </div>
              <div className="yr">≈ {fmtPlain(Math.max(0, s.savingsYear))} a year</div>
            </div>
          </div>
          <div className="sim-status">
            <StatusPill status={c.status} />
            <span className="imp-arrow">
              <Icon name="arrowR" size={16} />
            </span>
            <StatusPill status={s.simStatus} />
            <span>
              Budget used <b className="num" style={{ color: 'var(--text)' }}>{pct(c.used)}</b> →{' '}
              <b className="num" style={{ color: budgetTextColor(simUsed) }}>
                {pct(simUsed)}
              </b>
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {s.simDiff >= 0 ? `${fmtPlain(s.simDiff)} headroom` : `${fmtPlain(-s.simDiff)} over`} · based on {c.days} days
            </span>
          </div>
        </article>
        <article className="card flat" style={vi(2)}>
          <div className="card-head">
            <div>
              <div className="card-title">Current vs simulated</div>
              <div className="card-sub">Spend in range, per category</div>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: '#5F6879' }} />
                Current
              </span>
              <span>
                <i style={{ background: 'linear-gradient(#FFB169,#FF7A1A)' }} />
                Simulated
              </span>
              <span>
                <i style={{ background: 'repeating-linear-gradient(45deg,#FBBF24 0 3px,#7a5c12 3px 5px)' }} />
                Fixed
              </span>
            </div>
          </div>
          <SimBars s={s} />
          <p className="caption" style={{ marginTop: 12 }}>
            <Icon name="info" size={13} />
            Scenarios are arithmetic on your current pace, not predicted behaviour.
          </p>
        </article>
      </div>
    </div>
  );
}
