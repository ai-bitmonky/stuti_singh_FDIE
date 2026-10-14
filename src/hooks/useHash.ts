'use client';
import { useCallback, useSyncExternalStore } from 'react';

/** Desktop views, addressed as `#overview`, `#add`, … */
export const VIEWS = ['overview', 'add', 'analytics', 'simulate', 'insights', 'oop'] as const;
export type View = (typeof VIEWS)[number];
export const DEFAULT_VIEW: View = 'overview';

const isView = (x: string): x is View => (VIEWS as readonly string[]).includes(x);

function readHash(): View {
  const h = window.location.hash.replace(/^#\/?/, '');
  return isView(h) ? h : DEFAULT_VIEW;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

/**
 * Desktop hash router. Returns `[view, setView]`; unknown/empty hash → 'overview'.
 * `setView` pushes a history entry so Back/Forward work.
 */
export function useHash(): [View, (v: View) => void] {
  const view = useSyncExternalStore(subscribe, readHash, () => DEFAULT_VIEW);
  const setView = useCallback((v: View) => {
    if (readHash() === v && window.location.hash) return;
    window.location.hash = v;
  }, []);
  return [view, setView];
}
