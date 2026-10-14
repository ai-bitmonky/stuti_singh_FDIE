'use client';
/** App-wide context for the mobile shell: navigation, sheets, toasts, gestures. */
import { createContext, useCallback, useContext, useState, type MutableRefObject } from 'react';
import type { Computed, Expense, State } from '@/lib/engine';
import type { GeneratorKey } from '@/lib/reports';
import type { IconName } from './icons';
import type { DevRect } from './device';

export type Tab = 'home' | 'analytics' | 'simulate' | 'insights';

export interface ToastOpts {
  icon?: IconName;
  tone?: 'good' | 'bad' | 'info';
  action?: string;
  onAction?: () => void;
  raise?: boolean;
  duration?: number;
}

export interface MobileCtx {
  state: State;
  c: Computed;
  tab: Tab;
  switchTab: (t: Tab) => void;
  /** Number of pushed screens (detail / OOP). */
  depth: number;
  pop: () => void;
  openAdd: () => void;
  openProfile: () => void;
  openDetail: (id: string) => void;
  openOOP: (autoRun?: boolean) => void;
  showReport: (k: GeneratorKey) => void;
  deleteWithUndo: (id: string) => void;
  toast: (msg: string, opts?: ToastOpts) => void;
  longPress: (e: Expense, rect: DevRect) => void;
  /** Closes the currently swiped-open row, if any. */
  openRow: MutableRefObject<{ el: HTMLElement; close: () => void } | null>;
}

export const Ctx = createContext<MobileCtx | null>(null);

export function useM(): MobileCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useM() outside <MobileApp>');
  return c;
}

/* ---- sticky UI state: survives screen remounts (like the prototype's module objects) ---- */
const sticky = new Map<string, unknown>();

/** `useState` whose value is remembered across unmounts for the session. */
export function useSticky<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (sticky.has(key) ? (sticky.get(key) as T) : init));
  const set = useCallback((x: T) => {
    sticky.set(key, x);
    setV(x);
  }, [key]);
  return [v, set];
}
