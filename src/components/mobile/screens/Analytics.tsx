'use client';
/** Analytics tab: Categories / Daily / Weekly panels, at-a-glance stats, 28-day heatmap. */
import { useState } from 'react';
import type { Category } from '@/lib/engine';
import { fmtN, pct } from '@/lib/format';
import { useM, useSticky } from '../ctx';
import DailyBars from '../charts/DailyBars';
import Donut from '../charts/Donut';
import Heat from '../charts/Heat';
import WeeklyStacked from '../charts/WeeklyStacked';
import { CountMoney, EmptyCard, LargeTitle, Num, SegControl } from '../ui';
import { TabScreen } from './Screens';

type Seg = 'cat' | 'daily' | 'weekly';
const SEGS = [['cat', 'Categories'], ['daily', 'Daily'], ['weekly', 'Weekly']] as const;

function Body() {
  const m = useM();
  const { c, state } = m;
  const [seg, setSeg] = useSticky<Seg>('ana.seg', 'cat');
  const [sel, setSel] = useState<Category | null>(null);
  if (c.empty) {
    return (
      <>
        <LargeTitle cap="No data" title="Analytics" />
        <EmptyCard title="Nothing to analyse yet" text="Charts appear as soon as you log your first expense." onAdd={m.openAdd} />
      </>
    );
  }
  return (
    <>
      <LargeTitle cap={`Last ${c.days} days`} title="Analytics" />
      <SegControl items={SEGS} value={seg} onPick={(k) => { setSeg(k); setSel(null); }} />
      <div className="panel" key={seg}>
        {seg === 'cat' ? <Donut c={c} sel={sel} onSel={setSel} /> : seg === 'daily' ? <DailyBars c={c} /> : <WeeklyStacked expenses={state.expenses} />}
      </div>
      <div className="sec-h">At a glance</div>
      <div className="stat-grid">
        <div className="card stat"><div className="k">Monthly estimate</div><div className="v"><CountMoney v={c.monthlyEstimate} /></div><div className="h">based on {c.days} days</div></div>
        <div className="card stat"><div className="k">Daily pace</div><div className="v"><CountMoney v={c.dailyPace} /></div><div className="h">₹{fmtN(c.weeklyPace)} / week</div></div>
        <div className="card stat"><div className="k">Transactions</div><div className="v"><Num v={c.count} /></div><div className="h">avg ticket ₹{fmtN(c.avgTicket)}</div></div>
        <div className="card stat"><div className="k">Spent vs budget</div><div className="v"><span className="tnum">{pct(c.spentPct)}</span></div><div className="h">₹{fmtN(c.total)} of ₹{fmtN(c.budget)}</div></div>
      </div>
      <div className="sec-h">Calendar heat · last 28 days</div>
      <Heat c={c} expenses={state.expenses} />
    </>
  );
}

export default function Analytics({ active, visit }: { active: boolean; visit: number }) {
  return (
    <TabScreen title="Analytics" active={active}>
      <Body key={visit} />
    </TabScreen>
  );
}
