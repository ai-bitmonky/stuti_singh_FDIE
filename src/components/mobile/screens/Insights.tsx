'use client';
/** Insights tab: rule-based cards with an expandable "How is this calculated?" basis. */
import { useMemo, useState } from 'react';
import { RULES, insights, sortedExpenses, type Insight, type InsightIcon, type Severity } from '@/lib/engine';
import { useM } from '../ctx';
import { haptic } from '../device';
import { Icon, type IconName } from '../icons';
import { LargeTitle, Privacy } from '../ui';
import { TabScreen } from './Screens';

const SEV: Record<Severity, [string, string]> = {
  warn: ['var(--amber)', 'Heads-up'],
  bad: ['var(--red)', 'Attention'],
  good: ['var(--green)', 'Good'],
  info: ['var(--blue)', 'Info'],
  tip: ['var(--teal)', 'Tip'],
};
/** Engine icon names → the mobile prototype's glyphs. */
const ICON: Record<InsightIcon, IconName> = {
  info: 'info', clock: 'clock', alert: 'alert', target: 'target', check: 'check',
  activity: 'trend', scissors: 'coffee', trophy: 'receipt', sun: 'calendar',
};

function Card({ n, i }: { n: Insight; i: number }) {
  const [open, setOpen] = useState(false);
  const [col, lab] = SEV[n.sev];
  return (
    <div className={'card ins' + (open ? ' open' : '')} style={{ ['--sc' as string]: col, animationDelay: `${i * 40}ms` }}>
      <div className="ins-main">
        <div className="ins-ic"><Icon name={ICON[n.icon]} size={21} sw={2} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="ins-sev">{lab}</div>
          <div className="ins-t">{n.title}</div>
          <div className="ins-m">
            {n.msg.map((s, k) => (s.bold ? <b key={k}>{s.text}</b> : <span key={k}>{s.text}</span>))}
          </div>
        </div>
      </div>
      <button type="button" className="how" aria-expanded={open} onClick={() => { haptic(4); setOpen(!open); }}>
        <span>How is this calculated?</span>
        <Icon name="chevD" size={18} sw={2.2} />
      </button>
      <div className="basis"><div><p>{n.basis}</p></div></div>
    </div>
  );
}

function Body() {
  const m = useM();
  const { c, state } = m;
  const list = useMemo(() => insights(c, sortedExpenses(state)), [c, state]);
  return (
    <>
      <LargeTitle cap="Insight engine" title="Insights" />
      <div className="ins-meta">
        <span className="live" />
        <span>Rule-based · {RULES} rules evaluated · {list.length} insight{list.length === 1 ? '' : 's'}{c.empty ? '' : ` · based on ${c.days} days`}</span>
      </div>
      <div className="ins-list">
        {list.map((n, i) => <Card key={n.id} n={n} i={i} />)}
      </div>
      <Privacy icon="info">Every insight shows its arithmetic. Heuristics, not financial advice.</Privacy>
      {c.empty && (
        <div style={{ padding: '16px var(--gut)' }}>
          <button type="button" className="btn-primary pressable" onClick={m.openAdd}><Icon name="plus" size={20} sw={2.4} />Add expense</button>
        </div>
      )}
    </>
  );
}

export default function Insights({ active, visit }: { active: boolean; visit: number }) {
  return (
    <TabScreen title="Insights" active={active}>
      <Body key={visit} />
    </TabScreen>
  );
}
