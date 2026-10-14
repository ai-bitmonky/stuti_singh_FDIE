'use client';
/**
 * FDIE mobile — a native-feeling iOS app (port of fdie-mobile.html).
 * Owns navigation (tabs + push stack), sheets, toast and the long-press
 * popover; screens read data through the `useM()` context.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppProps } from '../AppSwitch';
import { compute, makeSnapshot, type Expense } from '@/lib/engine';
import { GENERATORS, type GeneratorKey } from '@/lib/reports';
import { useFDIE } from '@/lib/store';
import { Ctx, type MobileCtx, type Tab, type ToastOpts } from './ctx';
import { dev, haptic, type DevRect } from './device';
import PhoneFrame from './PhoneFrame';
import Popover, { type PopState } from './Popover';
import StatusBar from './StatusBar';
import TabBar from './TabBar';
import Toast, { type ToastState } from './Toast';
import Analytics from './screens/Analytics';
import Detail from './screens/Detail';
import Home from './screens/Home';
import Insights from './screens/Insights';
import OOP from './screens/OOP';
import { PushScreen } from './screens/Screens';
import Simulate from './screens/Simulate';
import AddSheet from './sheets/AddSheet';
import ProfileSheet from './sheets/ProfileSheet';
import ReportSheet, { type Report } from './sheets/ReportSheet';
import './mobile.css';

type SheetName = 'add' | 'report' | 'profile';
interface Entry { key: number; kind: 'detail' | 'oop'; id?: string; auto?: boolean; back: string; in: boolean; leaving?: boolean }

export default function MobileApp({ onSwitch }: AppProps) {
  const { state, remove, restore } = useFDIE();
  const c = useMemo(() => compute(state.expenses, state.budget), [state]);
  const [tab, setTab] = useState<Tab>('home');
  const [visits, setVisits] = useState<Record<Tab, number>>({ home: 0, analytics: 0, simulate: 0, insights: 0 });
  const [stack, setStack] = useState<Entry[]>([]);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [nonce, setNonce] = useState({ add: 0, profile: 0 });
  const [report, setReport] = useState<Report | null>(null);
  const [toastS, setToastS] = useState<ToastState>({ msg: '', show: false, n: 0 });
  const [pop, setPop] = useState<PopState | null>(null);

  const deviceRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const screenEls = useRef(new Map<number, HTMLElement>());
  const openRow = useRef<{ el: HTMLElement; close: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const keySeq = useRef(0);
  const live = useRef({ state, stack, tab, sheet });
  live.current = { state, stack, tab, sheet };

  useEffect(() => {
    dev.el = deviceRef.current;
    return () => { dev.el = null; };
  }, []);

  const closeRow = useCallback(() => {
    openRow.current?.close();
    openRow.current = null;
  }, []);

  /* ---------------------------------------------------------------- toast */
  const hideToast = useCallback(() => setToastS((t) => ({ ...t, show: false })), []);
  const toast = useCallback((msg: string, opts: ToastOpts = {}) => {
    clearTimeout(toastTimer.current);
    setToastS((t) => ({ ...opts, msg, show: true, n: t.n + 1 }));
    toastTimer.current = setTimeout(hideToast, opts.duration ?? (opts.action ? 4500 : 2400));
  }, [hideToast]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* --------------------------------------------------------------- sheets */
  const openSheet = useCallback((s: SheetName) => {
    closeRow();
    setSheet(s);
    if (s === 'add' || s === 'profile') setNonce((n) => ({ ...n, [s]: n[s] + 1 }));
    haptic(6);
  }, [closeRow]);
  const closeSheet = useCallback(() => setSheet(null), []);

  /* ----------------------------------------------------------- navigation */
  const switchTab = useCallback((t: Tab) => {
    if (t === live.current.tab) {
      const sc = deviceRef.current?.querySelector('.tab-screen.active .scroller');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sc?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    closeRow();
    setTab(t);
    setVisits((v) => ({ ...v, [t]: v[t] + 1 }));
    haptic(5);
  }, [closeRow]);

  const push = useCallback((e: Omit<Entry, 'key' | 'in' | 'back'>) => {
    closeRow();
    const key = ++keySeq.current;
    const back = live.current.tab === 'home' ? 'Home' : 'Back';
    setStack((s) => [...s, { ...e, key, back, in: false }]);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setStack((s) => s.map((x) => (x.key === key ? { ...x, in: true } : x)));
    }));
  }, [closeRow]);

  const popScreen = useCallback(() => {
    const s = live.current.stack.filter((x) => !x.leaving);
    const top = s[s.length - 1];
    if (!top) return;
    const el = screenEls.current.get(top.key);
    const below = s.length > 1 ? screenEls.current.get(s[s.length - 2].key) : baseRef.current;
    // clear any edge-swipe transforms and swap classes in the same frame as the state change
    if (el) { el.style.transform = ''; el.classList.remove('in'); }
    if (below) { below.style.transform = ''; below.classList.remove('under'); }
    setStack((st) => st.map((x) => (x.key === top.key ? { ...x, in: false, leaving: true } : x)));
    setTimeout(() => setStack((st) => st.filter((x) => x.key !== top.key)), 380);
  }, []);

  /* -------------------------------------------------------------- actions */
  const deleteWithUndo = useCallback((id: string) => {
    const idx = live.current.state.expenses.findIndex((x) => x.id === id);
    const e = remove(id);
    openRow.current = null;
    if (!e) return;
    toast(`Deleted ${e.note || e.category}`, {
      icon: 'trash', tone: 'bad', action: 'Undo',
      onAction: () => { restore(e, idx); toast('Expense restored'); },
    });
  }, [remove, restore, toast]);

  const showReport = useCallback((k: GeneratorKey) => {
    const g = GENERATORS[k];
    const s = makeSnapshot(live.current.state, 'all');
    const out = g.generate(s); // ← polymorphic call: which generate() runs depends on the object
    setReport((r) => ({ key: k, out, name: g.filename(s), rows: s.expenses.length, n: (r?.n ?? 0) + 1 }));
    openSheet('report');
  }, [openSheet]);

  const ctx: MobileCtx = useMemo(() => ({
    state, c, tab, switchTab,
    depth: stack.filter((x) => !x.leaving).length,
    pop: popScreen,
    openAdd: () => openSheet('add'),
    openProfile: () => openSheet('profile'),
    openDetail: (id: string) => push({ kind: 'detail', id }),
    openOOP: (auto?: boolean) => push({ kind: 'oop', auto: auto === true }),
    showReport, deleteWithUndo, toast,
    longPress: (e: Expense, rect: DevRect) => setPop((p) => ({ e, rect, n: (p?.n ?? 0) + 1 })),
    openRow,
  }), [state, c, tab, switchTab, stack, popScreen, openSheet, push, showReport, deleteWithUndo, toast]);

  /* ------------------------------------------------- global listeners */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pop) setPop(null);
      else if (live.current.sheet) setSheet(null);
      else if (live.current.stack.some((x) => !x.leaving)) popScreen();
    };
    // focus()/scrollIntoView can scroll overflow-hidden ancestors; keep the shell pinned
    const pin = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.matches('.stage,.phone-wrap,.phone,.device,.app-root,.base-layer,.tab-screen,.push-layer,.push-screen,.sheet') && (t.scrollTop || t.scrollLeft)) {
        t.scrollTop = 0;
        t.scrollLeft = 0;
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', pin, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', pin, true);
    };
  }, [pop, popScreen]);

  const live2 = stack.filter((x) => !x.leaving);
  const depth = live2.length;
  const topKey = live2[depth - 1]?.key;
  const deviceClass = 'device' + (sheet ? ' sheet-open' : '') + (sheet === 'add' ? ' sheet-add-open' : '');

  return (
    <Ctx.Provider value={ctx}>
      <PhoneFrame ref={deviceRef} deviceClass={deviceClass} deviceStyle={{ ['--sp' as string]: sheet ? 1 : 0 }}>
        <StatusBar />
        <div className="app-root">
          <div className="app-bg" />
          <div className={'base-layer' + (depth ? ' under' : '')} ref={baseRef}>
            <Home active={tab === 'home'} visit={visits.home} />
            <Analytics active={tab === 'analytics'} visit={visits.analytics} />
            <Simulate active={tab === 'simulate'} visit={visits.simulate} />
            <Insights active={tab === 'insights'} visit={visits.insights} />
            <TabBar tab={tab} onTab={switchTab} onAdd={() => openSheet('add')} />
            <div className="dim" />
          </div>
          <div className="push-layer">
            {stack.map((x, i) => {
              const under = live2.some((y) => y.key > x.key) && !x.leaving;
              const e = x.kind === 'detail' ? state.expenses.find((y) => y.id === x.id) : undefined;
              return (
                <PushScreen
                  key={x.key}
                  ref={(el) => { if (el) screenEls.current.set(x.key, el); else screenEls.current.delete(x.key); }}
                  title={x.kind === 'detail' ? 'Expense' : 'OOP Concepts'}
                  back={x.back}
                  cls={'push-screen' + (x.in ? ' in' : '') + (under ? ' under' : '')}
                  isTop={x.key === topKey}
                  getBelow={() => (i > 0 ? screenEls.current.get(stack[i - 1].key) ?? null : baseRef.current)}
                  onPop={popScreen}
                >
                  {x.kind === 'oop' ? <OOP autoRun={x.auto} /> : e ? <Detail e={e} /> : null}
                </PushScreen>
              );
            })}
          </div>
        </div>

        <div className="scrim" onClick={closeSheet} />
        <AddSheet open={sheet === 'add'} nonce={nonce.add} onClose={closeSheet} />
        <ReportSheet open={sheet === 'report'} report={report} onClose={closeSheet} />
        <ProfileSheet open={sheet === 'profile'} nonce={nonce.profile} onClose={closeSheet} onDesktop={() => onSwitch('desktop')} />

        <Popover
          pop={pop}
          onClose={() => setPop(null)}
          onEdit={(e) => ctx.openDetail(e.id)}
          onDelete={(e) => deleteWithUndo(e.id)}
        />
        <Toast
          t={toastS}
          raise={!!toastS.raise || depth > 0 || !!sheet}
          onAction={() => { hideToast(); toastS.onAction?.(); }}
        />
      </PhoneFrame>
    </Ctx.Provider>
  );
}
