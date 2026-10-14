/**
 * FDIE — domain engine. ALL business logic lives here, pure and typed.
 * No React, no DOM, no storage: the store (`store.ts`) owns persistence.
 *
 * Ported from the `FDIE` object in `fdie-desktop.html` (with the mobile
 * prototype's extras — expense `time`, sanitize, series/last7/weekend stats —
 * folded in so both apps can share one engine).
 */
import {
  addDays, clamp, dayDiff, fmtDay, fmtPlain, hexA, isWeekend, iso, nowHM, pad2, parseISO, pct, relDate, todayD, todayISO,
} from './format';

/* ===================================================================== types */

export type Category = 'Food' | 'Shopping' | 'Travel' | 'Entertainment' | 'Health' | 'Education';
/** Categories that can be cut in the simulator (Education is fixed). */
export type SimCategory = Exclude<Category, 'Education'>;

export interface Expense {
  id: string;
  /** Local date `YYYY-MM-DD`. */
  date: string;
  category: Category;
  /** Rupees, > 0, ≤ MAX_AMOUNT, max 2 decimals. */
  amount: number;
  /** ≤ 80 chars; may be empty. */
  note: string;
  /** Optional local time `HH:MM` (mobile shows it). */
  time?: string;
}

/** Fields the user supplies when adding/editing (output of `validate().value`). */
export type ExpenseInput = Pick<Expense, 'date' | 'category' | 'amount' | 'note'> & { time?: string };

/** Percent cut (0–100) per simulated category. */
export type SimMap = Record<SimCategory, number>;

export interface State {
  v: 1;
  user: string;
  budget: number;
  expenses: Expense[];
  sim: SimMap;
}

export type Range = '7' | '30' | 'all';
export type Status = 'On track' | 'Over budget';

/** Result of `compute()` — every derived number the UI shows. */
export interface Computed {
  empty: boolean;
  total: number;
  /** Observed days = (maxDate − minDate) + 1; 0 when empty. */
  days: number;
  dailyPace: number;
  weeklyPace: number;
  monthlyEstimate: number;
  byCat: Record<Category, number>;
  counts: Record<Category, number>;
  share: Record<Category, number>;
  /** Categories sorted by spend, descending. */
  ranked: Category[];
  topCategory: Category | null;
  topShare: number;
  budget: number;
  /** budget − monthlyEstimate. */
  diff: number;
  status: Status;
  /** monthlyEstimate / budget. */
  used: number;
  /** total / budget (spent so far vs budget). */
  spentPct: number;
  count: number;
  avgTicket: number;
  minDate: string | null;
  maxDate: string | null;
  /** date → total that day. */
  byDate: Record<string, number>;
  /** One entry per observed day from minDate..maxDate (zeros included). */
  series: { date: string; v: number }[];
  /** Spend in the last 7 days ending today, and the 7 before that. */
  last7: number;
  prev7: number;
  /** (last7 − prev7) / prev7, or null when prev7 is 0. */
  delta: number | null;
  biggest: Expense | null;
  wkendAvg: number;
  wkdayAvg: number;
  wkendDays: number;
  wkdayDays: number;
}

export interface SimRow {
  cat: Category;
  pct: number;
  current: number;
  simulated: number;
  /** true for Education (not simulated). */
  fixed: boolean;
}

export interface SimResult {
  rows: SimRow[];
  simulated: Record<Category, number>;
  simTotal: number;
  simMonthly: number;
  savingsMonthly: number;
  savingsYear: number;
  simDiff: number;
  simStatus: Status;
}

/** A run of insight text; `bold` replaces the prototype's `<b>` markup. */
export interface Segment {
  text: string;
  bold?: boolean;
}

export type Severity = 'info' | 'warn' | 'good' | 'bad' | 'tip';
/** Icon names match the desktop prototype's ICONS map. */
export type InsightIcon = 'info' | 'clock' | 'alert' | 'target' | 'check' | 'activity' | 'scissors' | 'trophy' | 'sun';

export interface Insight {
  id: string;
  sev: Severity;
  icon: InsightIcon;
  title: string;
  msg: Segment[];
  /** Multi-line arithmetic explaining the rule (render in a <pre>/mono block). */
  basis: string;
}

export type FieldErrors = Partial<Record<'amount' | 'category' | 'date' | 'note', string>>;

export interface Validation {
  ok: boolean;
  errors: FieldErrors;
  value: ExpenseInput | null;
}

/** Raw (string-y) form input accepted by `validate()`. */
export interface RawExpenseInput {
  amount?: string | number | null;
  category?: string | null;
  date?: string | null;
  note?: string | null;
}

/** Immutable data handed to report generators. */
export interface Snapshot {
  user: string;
  generatedAt: Date;
  /** Human label, e.g. "Last 30 days" / "All data". */
  range: string;
  budget: number;
  c: Computed;
  expenses: Expense[];
  insights: Insight[];
}

/* ================================================================= constants */

export const CATEGORIES: readonly Category[] = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Health', 'Education'];
export const SIM_CATS: readonly SimCategory[] = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Health'];

export interface CatMeta {
  color: string;
  glyph: string;
  /** color at 14% alpha — chip background. */
  tint: string;
}
const mk = (color: string, glyph: string): CatMeta => ({ color, glyph, tint: hexA(color, 0.14) });
export const CAT: Readonly<Record<Category, CatMeta>> = {
  Food: mk('#FF7A1A', '🍜'),
  Shopping: mk('#A78BFA', '🛍️'),
  Travel: mk('#60A5FA', '✈️'),
  Entertainment: mk('#F472B6', '🎬'),
  Health: mk('#34D399', '💊'),
  Education: mk('#FBBF24', '📚'),
};

export const MAX_AMOUNT = 1_000_000;
export const STORAGE_KEY = 'fdie.v1';
/** Number of insight rules the engine evaluates (shown in the UI). */
export const RULES = 7;
export const DEFAULT_USER = 'Pramod';
export const DEFAULT_BUDGET = 45000;

export const isCategory = (x: unknown): x is Category => typeof x === 'string' && (CATEGORIES as readonly string[]).includes(x);
export const emptySim = (): SimMap => ({ Food: 0, Shopping: 0, Travel: 0, Entertainment: 0, Health: 0 });
const zeroCats = (): Record<Category, number> => ({ Food: 0, Shopping: 0, Travel: 0, Entertainment: 0, Health: 0, Education: 0 });

/* ====================================================================== seed */

type SeedRow = [daysAgo: number, cat: Category, amount: number, note: string];
const SEED_ROWS: SeedRow[] = [
  [23, 'Travel', 1050, 'BMTC monthly pass'], [23, 'Food', 120, 'Chai at FOLK canteen'],
  [22, 'Education', 465, 'Amazon — notebooks & pens'], [22, 'Food', 240, 'Vidyarthi Bhavan dosa'],
  [21, 'Education', 499, 'Udemy — Python for data science'],
  [20, 'Food', 1980, 'Blinkit groceries'], [20, 'Travel', 340, 'Uber to Majestic'],
  [19, 'Entertainment', 119, 'Spotify Premium'],
  [18, 'Food', 640, 'Starbucks Church St'], [18, 'Entertainment', 760, 'PVR Koramangala — 2 tickets'],
  [17, 'Food', 2450, 'Team dinner at Toit, Indiranagar'], [17, 'Travel', 160, 'Ola auto to Jayanagar'],
  [16, 'Health', 486, 'Apollo Pharmacy'],
  [15, 'Travel', 500, 'Namma Metro card recharge'], [15, 'Food', 420, 'Third Wave Coffee'],
  [14, 'Shopping', 2499, 'Flipkart — boAt earbuds'],
  [13, 'Education', 650, 'Blossom Book House'], [13, 'Food', 380, 'MTR breakfast, Lalbagh'],
  [12, 'Food', 1640, 'Zomato — family order'],
  [11, 'Health', 1799, 'Cult.fit monthly'],
  [10, 'Shopping', 3299, 'Decathlon running shoes'], [10, 'Entertainment', 300, 'Gaming café, Jayanagar'],
  [9, 'Food', 480, 'Swiggy — late-night order'],
  [8, 'Food', 2140, 'Blinkit weekly groceries'], [8, 'Travel', 85, 'Rapido bike to college'],
  [7, 'Entertainment', 199, 'Netflix'], [7, 'Education', 725, 'Engineering Maths textbook'],
  [6, 'Food', 980, 'Swiggy — Truffles'],
  [5, 'Health', 500, 'Practo consultation'], [5, 'Shopping', 749, 'Nykaa skincare'],
  [4, 'Entertainment', 1499, 'BookMyShow — live gig'], [4, 'Food', 1250, 'Swiggy Instamart top-up'],
  [3, 'Travel', 1180, 'Uber to Kempegowda airport'],
  [2, 'Shopping', 999, 'Lenskart — computer glasses'], [2, 'Education', 180, 'Print & spiral binding'],
  [1, 'Food', 560, 'Zomato — paneer biryani'], [1, 'Travel', 300, 'Namma Metro card recharge'],
  [0, 'Food', 90, 'Chai at FOLK canteen'],
];
/** Plausible times for the mobile list (deterministic, cycled by row). */
const SEED_TIMES = ['08:15', '13:10', '19:30', '21:05', '11:20', '17:35', '09:48', '20:42', '16:30', '12:18'];

/** Demo state: 38 expenses over the last 24 days ending today (total ₹32,712). */
export function seed(): State {
  const t = todayD();
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  return {
    v: 1,
    user: DEFAULT_USER,
    budget: DEFAULT_BUDGET,
    expenses: SEED_ROWS.map(([ago, category, amount, note], i) => {
      let time = SEED_TIMES[i % SEED_TIMES.length];
      if (ago === 0) {
        const [h, m] = time.split(':').map(Number);
        if (h * 60 + m > nowM) {
          const mm = Math.max(0, nowM - 25);
          time = `${pad2(Math.floor(mm / 60))}:${pad2(mm % 60)}`;
        }
      }
      return { id: 's' + String(i + 1).padStart(2, '0'), date: iso(addDays(t, -ago)), category, amount, note, time };
    }),
    sim: emptySim(),
  };
}

/** Validate untrusted (e.g. localStorage) data into a State, or `null` if unusable. */
export function sanitize(raw: unknown): State | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.expenses)) return null;
  const simIn = (s.sim && typeof s.sim === 'object' ? s.sim : {}) as Record<string, unknown>;
  const sim = emptySim();
  for (const c of SIM_CATS) sim[c] = clamp(Math.round(Number(simIn[c]) || 0), 0, 100);
  const expenses: Expense[] = [];
  const seen = new Set<string>();
  for (const x of s.expenses as unknown[]) {
    if (!x || typeof x !== 'object') continue;
    const e = x as Record<string, unknown>;
    if (!isCategory(e.category)) continue;
    const amount = Number(e.amount);
    if (!(amount > 0) || amount > MAX_AMOUNT) continue;
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    let id = typeof e.id === 'string' && e.id ? e.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    const out: Expense = { id, date: e.date, category: e.category, amount, note: String(e.note ?? '').slice(0, 80) };
    if (typeof e.time === 'string' && /^\d{2}:\d{2}$/.test(e.time)) out.time = e.time;
    expenses.push(out);
  }
  const budget = Number(s.budget);
  return {
    v: 1,
    user: typeof s.user === 'string' && s.user.trim() ? s.user.slice(0, 30) : DEFAULT_USER,
    budget: budget > 0 ? Math.round(budget) : DEFAULT_BUDGET,
    expenses,
    sim,
  };
}

/** Unique expense id. */
export function newId(): string {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Build a new Expense from validated input (stamps id and current time if missing). */
export function makeExpense(x: ExpenseInput): Expense {
  return { id: newId(), time: x.time ?? nowHM(), ...x };
}

/* ============================================================ views of data */

/** Newest date first; same day → later time first, then most recently added first. */
export function sortedExpenses(state: State, list: Expense[] = state.expenses): Expense[] {
  const order = new Map(state.expenses.map((e, i) => [e.id, i]));
  return [...list].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.time ?? '').localeCompare(a.time ?? '') ||
      (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0),
  );
}

/** Expenses in the window ending today: last 7 / 30 days, or all. */
export function viewByRange(state: State, range: Range): Expense[] {
  if (range === 'all') return state.expenses;
  const start = iso(addDays(todayD(), -(Number(range) - 1)));
  return state.expenses.filter((e) => e.date >= start);
}

/** Total spent between `toOffset` and `fromOffset` days ago, inclusive (e.g. `(0, 6)` = last 7 days). */
export function windowTotal(state: State, fromOffset: number, toOffset: number): number {
  const t = todayD();
  const a = iso(addDays(t, -toOffset)), b = iso(addDays(t, -fromOffset));
  return state.expenses.filter((e) => e.date >= a && e.date <= b).reduce((s, e) => s + e.amount, 0);
}

/** `date → total` for a list. */
export function dailyMap(list: Expense[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of list) m[e.date] = (m[e.date] || 0) + e.amount;
  return m;
}

/* ============================================================== computation */

/** Every derived figure for a list of expenses against a monthly budget. */
export function compute(list: Expense[], budget: number): Computed {
  const byCat = zeroCats(), counts = zeroCats();
  let total = 0;
  for (const e of list) {
    total += e.amount;
    byCat[e.category] += e.amount;
    counts[e.category]++;
  }
  const byDate = dailyMap(list);
  const ranked = [...CATEGORIES].sort((a, b) => byCat[b] - byCat[a]);
  const share = zeroCats();
  for (const c of CATEGORIES) share[c] = total ? byCat[c] / total : 0;

  // last 7 vs previous 7 (relative to today)
  const t = todayISO();
  let last7 = 0, prev7 = 0;
  for (const e of list) {
    const dd = dayDiff(e.date, t);
    if (dd >= 0 && dd < 7) last7 += e.amount;
    else if (dd >= 7 && dd < 14) prev7 += e.amount;
  }

  if (!list.length) {
    return {
      empty: true, total: 0, days: 0, dailyPace: 0, weeklyPace: 0, monthlyEstimate: 0, byCat, counts, share, ranked: [],
      topCategory: null, topShare: 0, budget, diff: budget, status: 'On track', used: 0, spentPct: 0, count: 0, avgTicket: 0,
      minDate: null, maxDate: null, byDate, series: [], last7, prev7, delta: null, biggest: null,
      wkendAvg: 0, wkdayAvg: 0, wkendDays: 0, wkdayDays: 0,
    };
  }

  const dates = Object.keys(byDate).sort();
  const minDate = dates[0], maxDate = dates[dates.length - 1];
  const days = Math.max(1, dayDiff(minDate, maxDate) + 1);
  const dailyPace = total / days;
  const weeklyPace = dailyPace * 7;
  const monthlyEstimate = Math.round(dailyPace * 30);
  const topCategory = ranked[0];
  const diff = budget - monthlyEstimate;

  const series: { date: string; v: number }[] = [];
  let we = 0, wd = 0, wkendDays = 0, wkdayDays = 0;
  const start = parseISO(minDate);
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i), k = iso(d), v = byDate[k] || 0;
    series.push({ date: k, v });
    if (isWeekend(d)) { we += v; wkendDays++; } else { wd += v; wkdayDays++; }
  }
  const biggest = list.reduce((m, e) => (e.amount > m.amount ? e : m), list[0]);

  return {
    empty: false, total, days, dailyPace, weeklyPace, monthlyEstimate, byCat, counts, share, ranked,
    topCategory, topShare: share[topCategory], budget, diff, status: diff >= 0 ? 'On track' : 'Over budget',
    used: budget ? monthlyEstimate / budget : 0, spentPct: budget ? total / budget : 0,
    count: list.length, avgTicket: total / list.length, minDate, maxDate, byDate, series,
    last7, prev7, delta: prev7 ? (last7 - prev7) / prev7 : null, biggest,
    wkendAvg: wkendDays ? we / wkendDays : 0, wkdayAvg: wkdayDays ? wd / wkdayDays : 0, wkendDays, wkdayDays,
  };
}

/** What-if: cut each simulated category by `sim[cat]` %. Education is fixed. */
export function simulate(c: Computed, sim: Partial<SimMap>): SimResult {
  const simulated = zeroCats();
  const rows: SimRow[] = CATEGORIES.map((cat) => {
    const fixed = !(SIM_CATS as readonly string[]).includes(cat);
    const p = fixed ? 0 : clamp(Number(sim[cat as SimCategory]) || 0, 0, 100);
    const current = c.byCat[cat] || 0;
    const s = Math.max(0, Math.round(current * (1 - p / 100)));
    simulated[cat] = s;
    return { cat, pct: p, current, simulated: s, fixed };
  });
  const simTotal = rows.reduce((s, r) => s + r.simulated, 0);
  const days = Math.max(1, c.days);
  const simMonthly = c.empty ? 0 : Math.round((simTotal / days) * 30);
  const savingsMonthly = c.monthlyEstimate - simMonthly;
  const simDiff = c.budget - simMonthly;
  return {
    rows, simulated, simTotal, simMonthly, savingsMonthly, savingsYear: savingsMonthly * 12, simDiff,
    simStatus: simDiff >= 0 ? 'On track' : 'Over budget',
  };
}

/* ================================================================= insights */

const B = (text: string): Segment => ({ text, bold: true });
const T = (text: string): Segment => ({ text });
const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** Flatten insight segments to plain text. */
export const segmentsText = (segs: Segment[]): string => segs.map((s) => s.text).join('');

/** Rule-based insights; each carries a transparent `basis` with its arithmetic. */
export function insights(c: Computed, list: Expense[]): Insight[] {
  if (c.empty || !c.topCategory || !c.minDate || !c.maxDate) {
    return [{
      id: 'none', sev: 'info', icon: 'info', title: 'No data in this range',
      msg: [T('Add an expense or widen the date range to evaluate the rules.')],
      basis: 'All rules need at least one expense in the selected range.',
    }];
  }
  const out: Insight[] = [];
  const sparse = c.days < 7, early = sparse ? 'Early read — ' : '';

  // 7. sparse-data guard (shown first)
  if (sparse) out.push({
    id: 'sparse', sev: 'warn', icon: 'clock', title: 'Projection is early',
    msg: [T('Only '), B(dayWord(c.days)), T(' observed — monthly figures are rough until a full week of data exists.')],
    basis: `Safeguard: projections are flagged until ≥ 7 days are observed.\nObserved days = (last date − first date) + 1\n             = ${fmtDay(c.maxDate)} − ${fmtDay(c.minDate)} + 1 = ${c.days}`,
  });

  // 1. concentration
  const top = c.topCategory, ts = c.topShare;
  const concBasis = `${top} ${fmtPlain(c.byCat[top])} ÷ total ${fmtPlain(c.total)} = ${pct(ts, 1)}\nThreshold 40% — heuristic, not a financial rule.`;
  if (ts > 0.4) out.push({
    id: 'conc', sev: 'warn', icon: 'alert', title: 'Spending is concentrated',
    msg: [B(top), T(' is '), B(pct(ts)), T(' of your spending.')], basis: concBasis,
  });
  else out.push({
    id: 'conc', sev: 'good', icon: 'target', title: 'Spending is well spread',
    msg: [T('No category is above 40% — the largest is '), B(top), T(' at '), B(pct(ts)), T('.')], basis: concBasis,
  });

  // 2. budget
  const ok = c.diff >= 0;
  out.push({
    id: 'budget', sev: ok ? 'good' : 'bad', icon: ok ? 'check' : 'alert',
    title: ok ? 'On track for the month' : 'Over budget at this pace',
    msg: [
      T(`${early}Estimated `), B(fmtPlain(c.monthlyEstimate)), T(' vs '), B(fmtPlain(c.budget)), T(' budget — '),
      ...(ok ? [B(fmtPlain(c.diff)), T(' to spare')] : [B(fmtPlain(-c.diff)), T(' over')]),
      T(`, based on ${dayWord(c.days)}.`),
    ],
    basis: `Monthly estimate = total ÷ days × 30\n                 = ${fmtPlain(c.total)} ÷ ${c.days} × 30 = ${fmtPlain(c.monthlyEstimate)}\nBudget − estimate = ${fmtPlain(c.budget)} − ${fmtPlain(c.monthlyEstimate)} = ${fmtPlain(c.diff)}\nStatus = ${c.status} (difference ${ok ? '≥' : '<'} 0). Based on ${dayWord(c.days)}.`,
  });

  // 3. pace
  out.push({
    id: 'pace', sev: 'info', icon: 'activity', title: 'Your spending pace',
    msg: [T(`${early}About `), B(fmtPlain(c.dailyPace)), T(' a day, or '), B(fmtPlain(c.weeklyPace)), T(' a week.')],
    basis: `Daily pace  = ${fmtPlain(c.total)} ÷ ${c.days} days = ${fmtPlain(c.dailyPace)}\nWeekly pace = daily × 7 = ${fmtPlain(c.weeklyPace)}`,
  });

  // 4. food (illustrative)
  if (c.byCat.Food > 0) {
    const foodMonthly = (c.byCat.Food / c.days) * 30, save = Math.round(foodMonthly * 0.2);
    out.push({
      id: 'food', sev: 'tip', icon: 'scissors', title: 'Illustrative: trim food',
      msg: [T('Cutting food by 20% saves ≈ '), B(`${fmtPlain(save)}/month`), T('.')],
      basis: `Food monthly pace = ${fmtPlain(c.byCat.Food)} ÷ ${c.days} × 30 = ${fmtPlain(foodMonthly)}\nSaving = 20% × ${fmtPlain(foodMonthly)} = ${fmtPlain(save)}\nIllustrative — assumes everything else stays the same.`,
    });
  }

  // 5. biggest single expense
  const big = list.reduce((m, e) => (e.amount > m.amount ? e : m), list[0]);
  out.push({
    id: 'big', sev: 'info', icon: 'trophy', title: 'Biggest single expense',
    msg: [B(fmtPlain(big.amount)), T(` on ${big.note || big.category} (${big.category}, ${relDate(big.date)}).`)],
    basis: `max(amount) over ${list.length} transactions = ${fmtPlain(big.amount)}\nThat is ${pct(big.amount / c.total, 1)} of total spending in this range.`,
  });

  // 6. weekend vs weekday
  if (c.wkendDays && c.wkdayDays) {
    const a = c.wkendAvg, b = c.wkdayAvg, r = b ? a / b : 0;
    const we = a * c.wkendDays, wd = b * c.wkdayDays;
    out.push({
      id: 'weekend', sev: r > 1.25 ? 'warn' : 'info', icon: 'sun', title: r >= 1 ? 'Weekends cost more' : 'Weekdays cost more',
      msg: [T('Weekends average '), B(fmtPlain(a)), T('/day vs '), B(fmtPlain(b)), T(` on weekdays (${r.toFixed(2)}×).`)],
      basis: `Weekend: ${fmtPlain(we)} over ${c.wkendDays} days = ${fmtPlain(a)}/day\nWeekday: ${fmtPlain(wd)} over ${c.wkdayDays} days = ${fmtPlain(b)}/day\nRatio = ${fmtPlain(a)} ÷ ${fmtPlain(b)} = ${r.toFixed(2)}×`,
    });
  }
  return out;
}

/* =============================================================== validation */

/** Validate add/edit form input. `value` is normalised (amount rounded to paise, note trimmed). */
export function validate(raw: RawExpenseInput): Validation {
  const errors: FieldErrors = {};
  const amtStr = String(raw.amount ?? '').replace(/[,\s₹]/g, '');
  const amount = Number(amtStr);
  if (!amtStr) errors.amount = 'Enter an amount.';
  else if (!/^\d*\.?\d{0,2}$/.test(amtStr) || !Number.isFinite(amount)) errors.amount = 'Use numbers only, up to 2 decimals.';
  else if (amount <= 0) errors.amount = 'Amount must be more than ₹0.';
  else if (amount > MAX_AMOUNT) errors.amount = 'Amount can be at most ₹10,00,000.';
  if (!isCategory(raw.category)) errors.category = 'Pick a category.';
  const date = String(raw.date || '');
  if (!date) errors.date = 'Pick a date.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || iso(parseISO(date)) !== date) errors.date = 'That date doesn’t look right.';
  else if (date > todayISO()) errors.date = 'Date can’t be in the future.';
  const note = String(raw.note || '').trim();
  if (note.length > 80) errors.note = 'Keep the note to 80 characters.';
  const ok = !Object.keys(errors).length;
  return {
    ok, errors,
    value: ok ? { amount: Math.round(amount * 100) / 100, category: raw.category as Category, date, note } : null,
  };
}

/* ================================================================= snapshot */

/** Immutable snapshot of a range, for report generators. */
export function makeSnapshot(state: State, range: Range): Snapshot {
  const list = sortedExpenses(state, viewByRange(state, range));
  const c = compute(list, state.budget);
  return {
    user: state.user, generatedAt: new Date(), range: range === 'all' ? 'All data' : `Last ${range} days`,
    budget: state.budget, c, expenses: list, insights: insights(c, list),
  };
}
