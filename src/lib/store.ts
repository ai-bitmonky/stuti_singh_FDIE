'use client';
/**
 * FDIE — localStorage-backed external store + `useFDIE()` hook.
 *
 * - Module-level state, lazily loaded from `localStorage['fdie.v1']` on first
 *   client read (never at import time, so it is SSR-safe).
 * - Every action produces a NEW state object (required by useSyncExternalStore),
 *   persists it (try/catch — private mode keeps working in memory) and notifies.
 * - Changes made in another tab are picked up via the `storage` event.
 */
import { useSyncExternalStore } from 'react';
import {
  STORAGE_KEY, emptySim, makeExpense, sanitize, seed,
  type Expense, type ExpenseInput, type SimMap, type State,
} from './engine';
import { clamp } from './format';

let state: State | null = null;
let serverState: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = sanitize(JSON.parse(raw));
      if (s) return s;
    }
  } catch {
    /* corrupt or unavailable — fall back to seed */
  }
  const s = seed();
  persist(s);
  return s;
}

function persist(s: State): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

function commit(next: State): void {
  state = next;
  persist(next);
  listeners.forEach((fn) => fn());
}

/** Current state (client). On the server returns a stable seed. */
export function getState(): State {
  if (typeof window === 'undefined') return getServerState();
  if (!state) state = load();
  return state;
}

/** Stable snapshot for SSR / hydration (computed once). */
export function getServerState(): State {
  if (!serverState) serverState = seed();
  return serverState;
}

let storageBound = false;
/** Subscribe to changes; returns an unsubscribe function. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  if (!storageBound && typeof window !== 'undefined') {
    storageBound = true;
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const s = e.newValue ? sanitize(JSON.parse(e.newValue)) : null;
        state = s ?? seed();
      } catch {
        return;
      }
      listeners.forEach((l) => l());
    });
  }
  return () => {
    listeners.delete(fn);
  };
}

/* ================================================================== actions */

/** Add a validated expense (id + current time stamped). Returns the new Expense. */
export function add(x: ExpenseInput): Expense {
  const s = getState();
  const e = makeExpense(x);
  commit({ ...s, expenses: [...s.expenses, e] });
  return e;
}

/** Patch an expense by id. Returns the updated Expense or null if not found. */
export function update(id: string, patch: Partial<Omit<Expense, 'id'>>): Expense | null {
  const s = getState();
  const i = s.expenses.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const out: Expense = { ...s.expenses[i], ...patch, id };
  const expenses = [...s.expenses];
  expenses[i] = out;
  commit({ ...s, expenses });
  return out;
}

/** Remove by id. Returns the removed Expense (keep it for an "Undo" → `restore`). */
export function remove(id: string): Expense | null {
  const s = getState();
  const i = s.expenses.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const e = s.expenses[i];
  commit({ ...s, expenses: s.expenses.filter((_, j) => j !== i) });
  return e;
}

/** Put a removed expense back (at `index` if given, else appended). No-op if the id already exists. */
export function restore(e: Expense, index?: number): void {
  const s = getState();
  if (s.expenses.some((x) => x.id === e.id)) return;
  const expenses = [...s.expenses];
  if (index == null) expenses.push(e);
  else expenses.splice(clamp(index, 0, expenses.length), 0, e);
  commit({ ...s, expenses });
}

/** Set the monthly budget (rounded, must be > 0). */
export function setBudget(v: number): void {
  const n = Math.round(Number(v));
  if (!(n > 0)) return;
  commit({ ...getState(), budget: n });
}

/** Set the display name (trimmed, ≤ 30 chars; blank falls back to "Pramod"). */
export function setUser(n: string): void {
  const name = String(n || '').trim().slice(0, 30) || 'Pramod';
  commit({ ...getState(), user: name });
}

/** Merge simulator percentages (each clamped 0–100). */
export function setSim(partial: Partial<SimMap>): void {
  const s = getState();
  const sim = { ...s.sim };
  for (const [k, v] of Object.entries(partial) as [keyof SimMap, number][]) {
    if (k in sim) sim[k] = clamp(Math.round(Number(v) || 0), 0, 100);
  }
  commit({ ...s, sim });
}

/** Restore the demo seed data. */
export function reset(): void {
  commit(seed());
}

/** Delete every expense (keeps user, budget; resets simulator). Returns the old list for undo. */
export function clearAll(): Expense[] {
  const s = getState();
  commit({ ...s, expenses: [], sim: emptySim() });
  return s.expenses;
}

/** Replace the whole expense list (e.g. undo of `clearAll`). */
export function setExpenses(expenses: Expense[]): void {
  commit({ ...getState(), expenses: [...expenses] });
}

export const actions = { add, update, remove, restore, setBudget, setUser, setSim, reset, clearAll, setExpenses } as const;
export type FDIEActions = typeof actions;

/**
 * React hook: `{ state, add, update, remove, restore, setBudget, setUser, setSim, reset, clearAll, setExpenses }`.
 * Re-renders on every store change. Derive figures with `useMemo(() => compute(...), [state])`.
 */
export function useFDIE(): { state: State } & FDIEActions {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  return { state: s, ...actions };
}
