'use client';
import { useMemo, useState } from 'react';
import { RULES, compute, insights, viewByRange, type Insight, type Severity, type State } from '@/lib/engine';
import { useDesk } from '../ctx';
import { Icon } from '../ui/Icon';
import { CountInt } from '../ui/Money';
import { Segments } from '../ui/Segments';
import { vars } from '../ui/util';

const SEV: Record<Severity, [string, string, string]> = {
  warn: ['var(--amber)', 'rgba(251,191,36,.14)', 'Warning'],
  bad: ['var(--red)', 'rgba(251,113,133,.14)', 'Alert'],
  good: ['var(--green)', 'rgba(52,211,153,.14)', 'Good'],
  info: ['var(--blue)', 'rgba(96,165,250,.14)', 'Info'],
  tip: ['var(--accent)', 'rgba(255,122,26,.14)', 'Idea'],
};

function InsightCard({ i, idx }: { i: Insight; idx: number }) {
  const [open, setOpen] = useState(false);
  const [col, tint, label] = SEV[i.sev];
  const basisId = 'dk-basis-' + i.id;
  return (
    <article className="card insight" style={vars({ '--sev': col, '--sevt': tint, '--i': idx + 3 })}>
      <div className="ins-top">
        <span className="ins-ic">
          <Icon name={i.icon} size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ins-title">{i.title}</div>
          <p className="ins-msg">
            <Segments segs={i.msg} />
          </p>
        </div>
        <span className="ins-sev">{label}</span>
      </div>
      <button type="button" className="ins-how" aria-expanded={open} aria-controls={basisId} onClick={() => setOpen((o) => !o)}>
        <Icon name="chevD" size={14} />
        <span>How this is calculated</span>
      </button>
      <div className={`ins-basis${open ? ' open' : ''}`} id={basisId}>
        <div>
          <code>{i.basis}</code>
        </div>
      </div>
    </article>
  );
}

function Stat({ n, label, color, tint, icon, idx }: { n: number; label: string; color: string; tint: string; icon: 'alert' | 'check' | 'bulb'; idx: number }) {
  const { animate } = useDesk();
  return (
    <article className="card ins-stat" style={vars({ '--i': idx })}>
      <span className="ins-ic" style={vars({ '--sev': color, '--sevt': tint })}>
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="is-v">
          <CountInt n={n} animate={animate} />
        </div>
        <div className="is-l">{label}</div>
      </div>
    </article>
  );
}

export function Insights({ state }: { state: State }) {
  const { range } = useDesk();
  const { c, ins } = useMemo(() => {
    const list = viewByRange(state, range), c = compute(list, state.budget);
    return { c, ins: insights(c, list) };
  }, [state, range]);
  const n = (ks: Severity[]) => ins.filter((i) => ks.includes(i.sev)).length;
  return (
    <>
      <div className="ins-meta">
        <span className="mono">
          Insight engine · rule-based · <b>{RULES} rules evaluated</b> · {c.empty ? 0 : ins.length} fired
        </span>
        <span className="caption">
          <Icon name="shield" size={13} />
          No model, no upload — every number below shows its arithmetic.
        </span>
      </div>
      <div className="ins-hero">
        <Stat idx={0} n={n(['warn', 'bad'])} label="Need attention" color="var(--amber)" tint="rgba(251,191,36,.14)" icon="alert" />
        <Stat idx={1} n={n(['good'])} label="Looking good" color="var(--green)" tint="rgba(52,211,153,.14)" icon="check" />
        <Stat idx={2} n={n(['info', 'tip'])} label="Context & ideas" color="var(--accent)" tint="rgba(255,122,26,.14)" icon="bulb" />
      </div>
      <div className="masonry">
        {ins.map((i, idx) => (
          <InsightCard key={i.id} i={i} idx={idx} />
        ))}
      </div>
    </>
  );
}
