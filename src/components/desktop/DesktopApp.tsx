'use client';
/**
 * FDIE desktop dashboard (≥1024px): sidebar + top bar + six hash-routed views,
 * slide-over drawer, popovers, toasts and chart tooltips. Port of fdie-desktop.html.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppProps } from '../AppSwitch';
import { compute, insights, makeSnapshot, viewByRange, type Expense, type Range } from '@/lib/engine';
import { greeting, fmtPlain } from '@/lib/format';
import { GENERATORS, downloadText, type CppKey, type GeneratorKey } from '@/lib/reports';
import { useFDIE } from '@/lib/store';
import { VIEWS, useHash, type View } from '@/hooks/useHash';
import { DeskCtx, type DeskApi } from './ctx';
import { Drawer, type DrawerState } from './Drawer';
import { ConfirmDeletePop } from './Popovers';
import { NAV, Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Icon } from './ui/Icon';
import { Popover, type PopHandle } from './ui/Popover';
import { Tip, type TipHandle } from './ui/Tip';
import { Toasts, type ToastHandle } from './ui/Toasts';
import { rangePhrase } from './ui/util';
import { AddView } from './views/AddView';
import { Analytics, type AnTab } from './views/Analytics';
import { Insights } from './views/Insights';
import { Oop, type Output } from './views/Oop';
import { Overview } from './views/Overview';
import { Simulate } from './views/Simulate';
import './desktop.css';

interface UiState {
  chartRange: number;
  anTab: AnTab;
  oopTab: CppKey;
  gen: GeneratorKey;
  output: Output | null;
}

export default function DesktopApp({ onSwitch }: AppProps) {
  const store = useFDIE();
  const { state } = store;
  const [view] = useHash();
  const [range, setRangeState] = useState<Range>('all');
  const [search, setSearch] = useState('');
  const [anim, setAnim] = useState({ on: true, key: 0 });
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, seq: 0 });
  const [ui, setUi] = useState<UiState>({ chartRange: 30, anTab: 'categories', oopTab: 'base', gen: 'html', output: null });

  const pop = useRef<PopHandle>(null);
  const tip = useRef<TipHandle>(null);
  const toasts = useRef<ToastHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const drawerOpen = useRef(false);
  drawerOpen.current = drawer.open;

  /* ---- entrance motion: on for ~1.4s after a view / range change ---- */
  const replay = useCallback(() => setAnim((a) => ({ on: true, key: a.key })), []);
  useEffect(() => {
    if (!anim.on) return;
    const t = setTimeout(() => setAnim((a) => ({ ...a, on: false })), 1400);
    return () => clearTimeout(t);
  }, [anim]);

  /* ---- route change ---- */
  useEffect(() => {
    pop.current?.close();
    tip.current?.hide();
    setAnim((a) => ({ on: true, key: a.key + 1 }));
    window.scrollTo({ top: 0 });
  }, [view]);

  const toast = useCallback<DeskApi['toast']>((m, o) => toasts.current?.push(m, o), []);
  const closePop = useCallback(() => pop.current?.close(), []);

  const openDrawer = useCallback((editId?: string) => {
    if (editId && !store.state.expenses.some((e) => e.id === editId)) return;
    pop.current?.close();
    returnFocus.current = document.activeElement as HTMLElement | null;
    setDrawer((d) => ({ open: true, editId, seq: d.seq + 1 }));
  }, [store.state.expenses]);

  const closeDrawer = useCallback(() => {
    if (!drawerOpen.current) return;
    setDrawer((d) => ({ ...d, open: false }));
    pop.current?.close();
    const f = returnFocus.current;
    if (f && document.contains(f) && f !== document.body) f.focus({ preventScroll: true });
    else if (document.activeElement instanceof HTMLElement && document.activeElement.closest('.drawer')) document.activeElement.blur();
  }, []);

  const applyBudget = useCallback(
    (raw: string) => {
      const v = Number(String(raw).replace(/[,\s₹]/g, ''));
      if (!Number.isFinite(v) || v < 100 || v > 100000000) {
        toast('Budget must be between ₹100 and ₹10,00,00,000.', { type: 'error' });
        return false;
      }
      if (Math.round(v) !== store.state.budget) {
        store.setBudget(Math.round(v));
        toast(`Monthly budget set to ${fmtPlain(v)}`, { type: 'info' });
      }
      return true;
    },
    [store, toast],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const index = store.state.expenses.findIndex((e) => e.id === id);
      const removed = store.remove(id);
      if (!removed) return;
      closeDrawer();
      toast(`Deleted ${fmtPlain(removed.amount)} · ${removed.note || removed.category}`, {
        type: 'info',
        action: {
          label: 'Undo',
          fn: () => {
            store.restore(removed, index);
            toast('Expense restored');
          },
        },
      });
    },
    [store, toast, closeDrawer],
  );

  const setRange = useCallback((r: Range) => {
    setRangeState(r);
    setAnim((a) => ({ on: true, key: a.key + 1 }));
  }, []);

  const api = useMemo<DeskApi>(
    () => ({
      range,
      setRange,
      animate: anim.on,
      replay,
      toast,
      openPop: (a, c, o) => pop.current?.open(a, c, o),
      closePop,
      popFor: (el) => !!pop.current?.isFor(el),
      showTip: (c, x, y) => tip.current?.show(c, x, y),
      hideTip: () => tip.current?.hide(),
      openDrawer,
      closeDrawer,
      applyBudget,
      confirmDelete: (anchor: HTMLElement, e: Expense) => pop.current?.open(anchor, <ConfirmDeletePop e={e} />, { width: 270 }),
      deleteExpense,
      exportCSV: () => {
        const gen = GENERATORS.csv, snap = makeSnapshot(store.state, range);
        downloadText(gen.generate(snap), gen.filename(snap), gen.mime);
        toast(`Exported ${snap.expenses.length} rows as CSV`, { type: 'info' });
      },
      search,
      setSearch,
    }),
    [range, setRange, anim.on, replay, toast, closePop, openDrawer, closeDrawer, applyBudget, deleteExpense, store.state, search],
  );

  /* ---- derived shell data ---- */
  const list = useMemo(() => viewByRange(state, range), [state, range]);
  const c = useMemo(() => compute(list, state.budget), [list, state.budget]);
  const warn = useMemo(() => insights(c, list).some((i) => i.sev === 'warn' || i.sev === 'bad'), [c, list]);
  const nav = NAV.find((n) => n[0] === view);
  const title = nav ? nav[3] : 'Overview';
  const rp = rangePhrase(range, c.days, c.empty);
  const name = state.user.trim() || 'there';
  const sub: Record<View, string> = {
    overview: `${greeting()}, ${name} — ${rp}`,
    add: 'Log a purchase and preview its impact before saving',
    analytics: `Where the money goes — ${c.count || 0} transactions · ${rp}`,
    simulate: 'What-if scenarios on your current pace',
    insights: `Rule-based and explainable — ${rp}`,
    oop: 'Polymorphic report generators, running live',
  };

  useEffect(() => {
    document.title = `${title} · FDIE Decision Engine`;
  }, [title]);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === 'Escape') {
        if (pop.current?.isOpen()) return pop.current.close();
        if (drawerOpen.current) closeDrawer();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-6]$/.test(e.key)) {
        window.location.hash = '#' + VIEWS[Number(e.key) - 1];
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openDrawer();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openDrawer, closeDrawer]);

  const onSearchInput = (q: string) => {
    setSearch(q);
    if (view !== 'overview') window.location.hash = '#overview';
  };
  const setOop = useCallback((p: Partial<Pick<UiState, 'gen' | 'output'>> & { tab?: CppKey }) => {
    setUi((u) => ({ ...u, ...(p.tab ? { oopTab: p.tab } : {}), ...(p.gen ? { gen: p.gen } : {}), ...('output' in p ? { output: p.output ?? null } : {}) }));
  }, []);

  let body: React.ReactNode = null;
  if (view === 'overview') body = <Overview state={state} chartRange={ui.chartRange} setChartRange={(n) => setUi((u) => ({ ...u, chartRange: n }))} />;
  else if (view === 'add') body = <AddView state={state} />;
  else if (view === 'analytics') body = <Analytics state={state} tab={ui.anTab} setTab={(t) => setUi((u) => ({ ...u, anTab: t }))} />;
  else if (view === 'simulate') body = <Simulate state={state} />;
  else if (view === 'insights') body = <Insights state={state} />;
  else body = <Oop state={state} tab={ui.oopTab} gen={ui.gen} output={ui.output} set={setOop} />;

  return (
    <DeskCtx.Provider value={api}>
      <div className="dk">
        <Sidebar view={view} c={c} state={state} onSwitch={onSwitch} />
        <div className="main">
          <Topbar ref={searchRef} title={title} sub={sub[view]} warn={warn} onSearchInput={onSearchInput} />
          <main className="content">
            <section key={`${view}-${anim.key}`} className={`view active${anim.on ? ' anim' : ''}`} aria-label={title}>
              {body}
            </section>
            <p className="privacy-line">
              <Icon name="lock" size={14} />
              Data stays in this browser. Nothing is uploaded.
            </p>
          </main>
        </div>
        <Drawer st={drawer} onClose={closeDrawer} />
        <Toasts ref={toasts} />
        <Popover ref={pop} />
        <Tip ref={tip} />
      </div>
    </DeskCtx.Provider>
  );
}
