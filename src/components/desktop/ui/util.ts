/** Small shared helpers for the desktop app (styles, colours, labels). */
import type { CSSProperties } from 'react';
import { CAT, type Category, type Range } from '@/lib/engine';

/** Style object with CSS custom properties (`--i`, `--c`, …). */
export const vars = (o: Record<string, string | number>): CSSProperties => o as CSSProperties;

/** `--c` / `--ct` for a category chip, glyph or tile. */
export const catStyle = (c: Category): CSSProperties => vars({ '--c': CAT[c].color, '--ct': CAT[c].tint });

/** Animation-order index for `.view.anim .card` stagger. */
export const vi = (i: number, extra?: CSSProperties): CSSProperties => ({ ...vars({ '--i': i }), ...extra });

/** Budget colour thresholds: <80% accent, 80–100% amber, >100% red. */
export const budgetColor = (u: number): string => (u > 1 ? 'var(--red)' : u >= 0.8 ? 'var(--amber)' : 'var(--accent)');

/** Same, but the brighter accent for text. */
export const budgetTextColor = (u: number): string => budgetColor(u).replace('var(--accent)', 'var(--accent-2)');

/** "last 30 days" style phrase used in subtitles. */
export const rangePhrase = (range: Range, days: number, empty: boolean): string => {
  if (range !== 'all') return `last ${range} days`;
  return empty ? 'no expenses in range' : `last ${days} day${days === 1 ? '' : 's'}`;
};

export const plural = (n: number, w: string, suffix = 's') => `${n} ${w}${n === 1 ? '' : suffix}`;
