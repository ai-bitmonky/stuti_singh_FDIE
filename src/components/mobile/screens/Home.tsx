'use client';
/** Home tab: greeting, hero spend card, quick actions, category tiles, grouped recent list. */
import { useEffect, useRef, useState } from 'react';
import { CAT, sortedExpenses, type Expense } from '@/lib/engine';
import { fmtK, fmtN, greeting, initials, pct, relDate } from '@/lib/format';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { useM, useSticky } from '../ctx';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { Icon } from '../icons';
import { Ring, Spark } from '../charts/Spark';
import { CountMoney, Glyph, Money, Privacy, StatusPill } from '../ui';
import { TabScreen } from './Screens';
import SwipeRow from './SwipeRow';

const LIMIT = 14;

function Skeleton() {
  return (
    <>
      <div className="lt">
        <div>
          <div className="skel" style={{ width: 110, height: 16, marginBottom: 8 }} />
          <div className="skel" style={{ width: 150, height: 34 }} />
        </div>
        <div className="skel" style={{ width: 44, height: 44, borderRadius: '50%' }} />
      </div>
      <div className="skel mx" style={{ height: 236, borderRadius: 18 }} />
      <div className="qa">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
            <div className="skel" style={{ width: 56, height: 56, borderRadius: '50%' }} />
            <div className="skel" style={{ width: 40, height: 10 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '30px var(--gut) 0' }}>
        {[0, 1, 2].map((i) => <div key={i} className="skel" style={{ width: 138, height: 150, borderRadius: 18, flex: 'none' }} />)}
      </div>
      <div className="skel mx" style={{ height: 180, marginTop: 30, borderRadius: 14 }} />
    </>
  );
}

function Recent() {
  const { state, c } = useM();
  const [all, setAll] = useSticky('home.showAll', false);
  const list = sortedExpenses(state);
  const shown = all ? list : list.slice(0, LIMIT);
  const groups: { date: string; items: Expense[] }[] = [];
  for (const e of shown) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }
  return (
    <div>
      <div className="sec-h"><span>Recent</span></div>
      {groups.map((g, gi) => (
        <div key={g.date}>
          <div className="group-h" style={gi ? undefined : { paddingTop: 2 }}>
            <span>{relDate(g.date)}</span>
            <span>₹{fmtN(c.byDate[g.date] || 0)}</span>
          </div>
          <div className="tx-list">
            {g.items.map((e) => <SwipeRow key={e.id} e={e} />)}
            {gi === groups.length - 1 && list.length > LIMIT && (
              <button type="button" className="more-btn pressable" onClick={() => setAll(!all)}>
                <span>{all ? 'Show less' : `Show all ${list.length}`}</span>
                <Icon name="chevR" size={16} sw={2.2} style={all ? { transform: 'rotate(-90deg)' } : undefined} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeBody() {
  const m = useM();
  const { state, c } = m;
  const head = (
    <div className="lt">
      <div>
        <div className="lt-greet">{greeting({ night: true })},</div>
        <h1 className="lt-title">{state.user}</h1>
      </div>
      <button type="button" className="avatar pressable" aria-label="Profile and settings" onClick={m.openProfile}>
        {initials(state.user)}
      </button>
    </div>
  );
  if (c.empty) {
    return (
      <>
        {head}
        <div className="card empty">
          <svg className="ill" viewBox="0 0 120 96" fill="none" aria-hidden="true">
            <rect x="18" y="14" width="84" height="68" rx="14" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.12)" />
            <path d="M34 62l14-14 10 10 18-20 12 12" stroke="#FF7A1A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
            <circle cx="92" cy="22" r="14" fill="#FF7A1A" opacity=".15" />
            <path d="M92 16v12M86 22h12" stroke="#FFB169" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h3>No expenses yet</h3>
          <p>Log what you spend and FDIE will project your month, check your budget and spot patterns.</p>
          <button type="button" className="btn-primary pressable" onClick={m.openAdd}>
            <Icon name="plus" size={20} sw={2.4} />Add your first expense
          </button>
        </div>
        <Privacy>Data stays in this browser. Nothing is uploaded.</Privacy>
      </>
    );
  }
  const tiles = c.ranked.filter((k) => c.byCat[k] > 0);
  return (
    <>
      {head}
      <div className="card hero">
        <div className="hero-lbl"><span className="dot" />Spent · last {c.days} day{c.days === 1 ? '' : 's'}</div>
        <div className="hero-row"><div className="hero-amt"><CountMoney v={c.total} /></div></div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.delta != null && (
            <span className={'pill ' + (c.delta > 0 ? 'bad' : 'good')}>
              <Icon name={c.delta > 0 ? 'up' : 'down'} size={13} sw={2.4} />{pct(Math.abs(c.delta))} vs prev. week
            </span>
          )}
          <span className="pill neutral">{c.count} transactions</span>
        </div>
        <Spark vals={c.series.map((s) => s.v)} />
        <div className="budget-row">
          <Ring used={c.used} />
          <div className="br-main">
            <div className="br-t">
              <span className="cur">₹</span>{fmtK(c.monthlyEstimate)} est.{' '}
              <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>of <span className="cur">₹</span>{fmtK(c.budget)}</span>
            </div>
            <div className="br-s">{pct(c.used)} of budget · {c.days}-day pace</div>
          </div>
          <StatusPill status={c.status} />
        </div>
      </div>
      <div className="qa">
        <button type="button" className="qa-btn primary pressable" onClick={m.openAdd}><span className="c"><Icon name="plus" size={24} sw={2.4} /></span>Add</button>
        <button type="button" className="qa-btn pressable" onClick={() => m.switchTab('simulate')}><span className="c"><Icon name="sliders" /></span>Simulate</button>
        <button type="button" className="qa-btn pressable" onClick={() => m.switchTab('insights')}><span className="c"><Icon name="bulb" /></span>Insights</button>
        <button type="button" className="qa-btn pressable" onClick={() => m.openOOP(true)}><span className="c"><Icon name="file" /></span>Report</button>
      </div>
      <div className="sec-h">
        <span>Spending by category</span>
        <button type="button" className="link" onClick={() => m.switchTab('analytics')}>See all</button>
      </div>
      <div className="hscroll">
        {tiles.map((k, i) => (
          <button key={k} type="button" className="card cat-tile pressable" style={{ ['--c' as string]: CAT[k].color }} onClick={() => m.switchTab('analytics')}>
            <Glyph cat={k} />
            <div className="ct-name">{k}</div>
            <div className="ct-amt"><Money v={c.byCat[k]} /></div>
            <div className="ct-bar"><i style={{ width: `${(c.share[k] * 100).toFixed(1)}%`, animationDelay: `${i * 40}ms` }} /></div>
            <div className="ct-share">{pct(c.share[k])} · {c.counts[k]} txn{c.counts[k] === 1 ? '' : 's'}</div>
          </button>
        ))}
      </div>
      <Recent />
      <button type="button" className="card oop-card pressable" onClick={() => m.openOOP()}>
        <div className="oop-ic"><Icon name="code" size={26} /></div>
        <div>
          <div className="oop-t">OOP Concepts</div>
          <div className="oop-s">How one <b style={{ color: 'var(--text)', fontWeight: 600 }}>generate()</b> call becomes HTML, text or CSV reports.</div>
        </div>
        <Icon name="chevR" size={20} sw={2.2} className="chev" />
      </button>
      <Privacy>Data stays in this browser. Nothing is uploaded. Heuristics, not financial advice.</Privacy>
    </>
  );
}

export default function Home({ active, visit }: { active: boolean; visit: number }) {
  const [ready, setReady] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const sc = useRef<HTMLDivElement>(null);
  const ct = useRef<HTMLDivElement>(null);
  const sp = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), prefersReducedMotion() ? 0 : 500);
    return () => clearTimeout(t);
  }, []);
  usePullToRefresh(sc, ct, sp, () => setRefresh((n) => n + 1));

  const spinner = (
    <div className="ptr" ref={sp} aria-hidden="true">
      <svg viewBox="0 0 28 28">
        <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <line x1="14" y1="3" x2="14" y2="8" opacity="1" />
          <line x1="21.8" y1="6.2" x2="18.2" y2="9.8" opacity=".88" />
          <line x1="25" y1="14" x2="20" y2="14" opacity=".76" />
          <line x1="21.8" y1="21.8" x2="18.2" y2="18.2" opacity=".64" />
          <line x1="14" y1="25" x2="14" y2="20" opacity=".52" />
          <line x1="6.2" y1="21.8" x2="9.8" y2="18.2" opacity=".4" />
          <line x1="3" y1="14" x2="8" y2="14" opacity=".3" />
          <line x1="6.2" y1="6.2" x2="9.8" y2="9.8" opacity=".2" />
        </g>
      </svg>
    </div>
  );
  return (
    <TabScreen title="Home" active={active} before={spinner} scrollRef={sc} contentRef={ct}>
      {ready ? <HomeBody key={`${visit}.${refresh}`} /> : <Skeleton />}
    </TabScreen>
  );
}
