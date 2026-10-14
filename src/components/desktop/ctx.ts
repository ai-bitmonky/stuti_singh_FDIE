'use client';
/** Desktop app context: global UI services (toasts, popover, tooltip, drawer, range). */
import { createContext, useContext, type ReactNode } from 'react';
import type { Expense, Range } from '@/lib/engine';
import type { PopOpts } from './ui/Popover';
import type { ToastOpts } from './ui/Toasts';

export interface DeskApi {
  range: Range;
  setRange: (r: Range) => void;
  /** true right after a view/range change — drives `.view.anim` entrance motion. */
  animate: boolean;
  /** Re-trigger entrance motion for the current view (e.g. chart range / tab change). */
  replay: () => void;
  toast: (msg: string, opts?: ToastOpts) => void;
  openPop: (anchor: HTMLElement, content: ReactNode, opts?: PopOpts) => void;
  closePop: () => void;
  /** Toggle helper: true if the popover is currently anchored to `el`. */
  popFor: (el: HTMLElement | null) => boolean;
  showTip: (content: ReactNode, x: number, y: number) => void;
  hideTip: () => void;
  openDrawer: (editId?: string) => void;
  closeDrawer: () => void;
  /** Validate + apply a budget string; toasts on error. Returns true when valid. */
  applyBudget: (raw: string) => boolean;
  confirmDelete: (anchor: HTMLElement, e: Expense) => void;
  deleteExpense: (id: string) => void;
  exportCSV: () => void;
  /** Search query from the top bar (filters the Overview transactions table). */
  search: string;
  setSearch: (q: string) => void;
}

export const DeskCtx = createContext<DeskApi | null>(null);

export function useDesk(): DeskApi {
  const v = useContext(DeskCtx);
  if (!v) throw new Error('useDesk() outside <DesktopApp>');
  return v;
}
