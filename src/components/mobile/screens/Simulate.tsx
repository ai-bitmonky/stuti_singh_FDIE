'use client';
/** Simulate tab: presets, per-category cut sliders, fixed Education, sticky savings summary. */
import { useMemo, useRef } from 'react';
import { SIM_CATS, simulate, type SimCategory } from '@/lib/engine';
import { fmtK, fmtN, pct } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useM } from '../ctx';
import { haptic } from '../device';
import { Icon } from '../icons';
import MiniBars from '../charts/MiniBars';
import { EmptyCard, Glyph, LargeTitle, useMountCountUp } from '../ui';
import { TabScreen } from './Screens';

const PRESETS: [string, number, string][] = [['Reset', 0, 'all 0%'], ['Gentle', 10, '10%'], ['Moderate', 25, '25%'], ['Aggressive', 50, '50%']];

function Summary() {
  const { c, state } = useM();
  const s = useMemo(() => simulate(c, state.sim), [c, state.sim]);
  const save = Math.max(0, s.savingsMonthly);
  const shown = useMountCountUp(save);
  return (
    <div className="sim-sum">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ss-k">You&apos;d save</div>
        <div className={'ss-v' + (save ? '' : ' zero')}>
          <span className="cur">₹</span><span className="tnum">{fmtN(shown)}</span><small>/mo</small>
        </div>
        <div className="ss-s">
          <span>₹{fmtN(save * 12)}/yr · est. ₹{fmtK(c.monthlyEstimate)} → ₹{fmtK(s.simMonthly)}</span>
          {s.simStatus === 'On track' ? <span className="pill good">On track</span> : <span className="pill bad">Over budget</span>}
        </div>
      </div>
      <MiniBars c={c} s={s} />
    </div>
  );
}

function Body() {
  const m = useM();
  const { c, state } = m;
  const { setSim } = useFDIE();
  const ticks = useRef<Partial<Record<SimCategory, number>>>({});
  const s = useMemo(() => simulate(c, state.sim), [c, state.sim]);
  if (c.empty) {
    return (
      <>
        <LargeTitle cap="What-if scenarios" title="Simulate" />
        <EmptyCard title="Nothing to simulate yet" text="Scenarios are built on your real spending pace — add an expense first." onAdd={m.openAdd} />
      </>
    );
  }
  const vals = SIM_CATS.map((k) => state.sim[k] || 0);
  const same = vals.every((v) => v === vals[0]) ? vals[0] : -1;
  return (
    <>
      <LargeTitle cap="What-if scenarios" title="Simulate" />
      <p className="lt-sub">Scenarios are arithmetic on your current pace, not predicted behaviour.</p>
      <div className="presets">
        {PRESETS.map(([n, v, sub]) => (
          <button
            key={n}
            type="button"
            className={'preset pressable' + (v === same ? ' on' : '')}
            onClick={() => {
              haptic(8);
              setSim(Object.fromEntries(SIM_CATS.map((k) => [k, v])));
            }}
          >
            {n}<small>{sub}</small>
          </button>
        ))}
      </div>
      <div className="sec-h">Reduce spending by</div>
      <div className="sim-list">
        {SIM_CATS.map((k) => {
          const v = state.sim[k] || 0;
          return (
            <div key={k} className="card sim-card">
              <div className="sim-top">
                <Glyph cat={k} />
                <div style={{ minWidth: 0 }}>
                  <div className="sim-name">{k}</div>
                  <div className="sim-amts">
                    {v ? (
                      <>₹{fmtN(c.byCat[k])}<span className="arr">→</span><b style={{ color: 'var(--accent)' }}>₹{fmtN(s.simulated[k])}</b></>
                    ) : (
                      <>₹{fmtN(c.byCat[k])} <span style={{ color: 'var(--text-3)' }}>· {pct(c.share[k])} of spend</span></>
                    )}
                  </div>
                </div>
                <div className={'sim-pct' + (v > 0 ? ' on' : '')}>{v ? `−${v}%` : '0%'}</div>
              </div>
              <input
                className="rng"
                type="range"
                min={0}
                max={100}
                step={1}
                value={v}
                aria-label={`Reduce ${k} by percent`}
                style={{ ['--p' as string]: v + '%' }}
                onChange={(e) => {
                  const nv = Number(e.target.value);
                  const step = Math.floor(nv / 10);
                  if (ticks.current[k] !== step) { ticks.current[k] = step; haptic(3); }
                  setSim({ [k]: nv });
                }}
              />
              <div className="sim-ticks"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
            </div>
          );
        })}
        <div className="card fixed-card">
          <Glyph cat="Education" />
          <div>
            <div className="sim-name">Education</div>
            <div className="sim-amts">₹{fmtN(c.byCat.Education)} · Education fixed (not simulated)</div>
          </div>
          <span className="lock"><Icon name="lock" size={18} sw={2} /></span>
        </div>
      </div>
      <div className="foot" style={{ paddingTop: 12 }}>Monthly figures use your pace over {c.days} observed days × 30.</div>
    </>
  );
}

export default function Simulate({ active, visit }: { active: boolean; visit: number }) {
  const { c } = useM();
  return (
    <TabScreen title="Simulate" active={active} scrollClass="sim-scroll" overlay={c.empty ? null : <Summary key={visit} />}>
      <Body key={visit} />
    </TabScreen>
  );
}
