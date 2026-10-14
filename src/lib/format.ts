/**
 * FDIE — formatting & date helpers shared by the desktop and mobile apps.
 * Pure functions, no DOM / window access (safe on server and client).
 * All dates are LOCAL calendar dates in `YYYY-MM-DD` form.
 */

const NF = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Indian grouping, rounded: `124500.4 → "1,24,500"`. Nullish/NaN → "0". */
export const fmtN = (n: number): string => NF.format(Math.round(Number(n) || 0));

/** Plain-text money: `fmtPlain(-1200) → "−₹1,200"`. Use where markup is not possible (reports, aria, titles). */
export const fmtPlain = (n: number): string => (n < 0 ? '−₹' : '₹') + fmtN(Math.abs(n));

/** Compact money for charts/axes: `≥1L → "1.2L"`, `≥1k → "12.4k"`, else integer. Negative gets "−". */
export const fmtK = (n: number): string => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (a >= 1e5) return s + (a / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
  if (a >= 1e3) return s + (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return s + Math.round(a);
};

/** Ratio → percent string: `pct(0.4123) → "41%"`, `pct(0.4123, 1) → "41.2%"`. */
export const pct = (x: number, d = 0): string => (x * 100).toFixed(d) + '%';

/** Clamp `v` into `[a, b]`. */
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Escape text for inclusion in an HTML string (used by the HTML report only — React escapes for you). */
export const escapeHTML = (s: unknown): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/* ------------------------------------------------------------------ dates */

/** Zero-pad to 2 digits. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');
/** Date → local `YYYY-MM-DD`. */
export const iso = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
/** Local `YYYY-MM-DD` → Date at local midnight. */
export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
/** New Date `n` calendar days after `d` (negative = before). */
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** Today at local midnight. */
export const todayD = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
/** Today as `YYYY-MM-DD`. */
export const todayISO = (): string => iso(new Date());

const asDate = (x: Date | string): Date => (typeof x === 'string' ? parseISO(x) : x);
/** Whole calendar days from `a` to `b` (DST-safe). Accepts Dates or ISO strings. */
export const dayDiff = (a: Date | string, b: Date | string): number => {
  const A = asDate(a), B = asDate(b);
  return Math.round(
    (Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 864e5,
  );
};
/** Saturday or Sunday. */
export const isWeekend = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;

/** `fmtDay("2026-10-14") → "14 Oct"` (en-GB; pass Intl options to customise). */
export const fmtDay = (s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string =>
  parseISO(s).toLocaleDateString('en-GB', opts);

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Relative label: "Today", "Yesterday", else "Mon 12 Oct" (+ year if not this year). */
export function relDate(s: string): string {
  const diff = dayDiff(parseISO(s), todayD());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = parseISO(s);
  const y = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}${y}`;
}
/** Alias used by the mobile prototype. */
export const relDay = relDate;

/** `"Wednesday, 14 Oct 2026"` (mobile detail screen). */
export const longDate = (s: string): string => {
  const x = parseISO(s);
  return `${DOWL[x.getDay()]}, ${x.getDate()} ${MON[x.getMonth()]} ${x.getFullYear()}`;
};

/** `"18:05" → "6:05 PM"`; empty/undefined → "". */
export const fmtTime = (t?: string): string => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Current local time `HH:MM`. */
export const nowHM = (): string => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * Time-of-day greeting. Before 05:00 the desktop says "Good evening";
 * the mobile app passes `{ night: true }` to get "Good night".
 */
export function greeting(opts: { night?: boolean; date?: Date } = {}): string {
  const h = (opts.date ?? new Date()).getHours();
  if (h < 5) return opts.night ? 'Good night' : 'Good evening';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Two-letter avatar initials: "Pramod Kumar" → "PK", "Pramod" → "PR", "" → "··". */
export const initials = (name: string | null | undefined): string => {
  const p = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '··';
  return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase();
};

/** `#RRGGBB` + alpha → `rgba(r,g,b,a)`. */
export const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
