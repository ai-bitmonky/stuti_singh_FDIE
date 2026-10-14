'use client';
/**
 * Shared mutable facts about the simulated device. The phone frame is
 * CSS-scaled by `fit` on wide screens, so every gesture divides pointer
 * deltas by `dev.fit` to work in device (unscaled) pixels.
 */
export const dev: { fit: number; el: HTMLDivElement | null } = { fit: 1, el: null };

export interface DevRect { x: number; y: number; w: number; h: number }

/** Rect of `node` in device (unscaled) coordinates. */
export function devRect(node: Element): DevRect {
  const r = node.getBoundingClientRect();
  const d = dev.el ? dev.el.getBoundingClientRect() : { left: 0, top: 0 };
  const f = dev.fit || 1;
  return { x: (r.left - d.left) / f, y: (r.top - d.top) / f, w: r.width / f, h: r.height / f };
}

/** Taptic-style feedback where supported (Android Chrome); silently no-op elsewhere. */
export function haptic(ms: number | number[] = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* unsupported */
  }
}

/** Restart a one-shot CSS animation class (e.g. `shake`) on an element. */
export function replayClass(el: Element | null, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

/** Colour for a "budget used" ratio. */
export const usedColor = (u: number): string => (u > 1 ? 'var(--red)' : u >= 0.8 ? 'var(--amber)' : 'var(--accent)');
