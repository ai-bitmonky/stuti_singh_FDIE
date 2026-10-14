'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { dev, devRect } from '../device';

/**
 * iOS interactive pop: a horizontal drag that starts within 20px of the
 * screen's left edge drags the pushed screen right while the screen below
 * parallaxes from −30% to 0 and its dim fades. Releases past 35% width or
 * with a rightward flick (> 0.5 px/ms) pop; otherwise it springs back.
 */
export function useEdgeSwipe(
  screen: RefObject<HTMLElement>,
  opts: { isTop: boolean; getBelow: () => HTMLElement | null; onPop: () => void },
): void {
  const o = useRef(opts);
  o.current = opts;

  useEffect(() => {
    const s = screen.current;
    if (!s) return;
    let sx = 0, sy = 0, dx = 0, id: number | null = null, active = false, lt = 0, lx = 0, v = 0;
    let below: HTMLElement | null = null;
    const dimOf = (el: HTMLElement | null) => (el ? (el.querySelector(':scope > .dim') as HTMLElement | null) : null);

    const down = (e: PointerEvent) => {
      if (!o.current.isTop || !dev.el) return;
      const r = devRect(s);
      const x = (e.clientX - dev.el.getBoundingClientRect().left) / dev.fit;
      if (x - r.x > 20) return;
      id = e.pointerId; sx = lx = e.clientX; sy = e.clientY; active = false; dx = 0; lt = performance.now(); v = 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const mx = (e.clientX - sx) / dev.fit, my = (e.clientY - sy) / dev.fit;
      if (!active) {
        if (mx > 8 && Math.abs(mx) > Math.abs(my)) {
          active = true;
          try { s.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          below = o.current.getBelow();
          s.classList.add('swiping');
          below?.classList.add('swiping');
        } else if (Math.abs(my) > 10) id = null;
        return;
      }
      const now = performance.now();
      v = (e.clientX - lx) / dev.fit / Math.max(1, now - lt);
      lx = e.clientX; lt = now;
      dx = Math.max(0, mx);
      const w = dev.el?.offsetWidth || 393;
      s.style.transform = `translateX(${dx}px)`;
      if (below) below.style.transform = `translateX(${-30 + (dx / w) * 30}%)`;
      const d = dimOf(below);
      if (d) d.style.opacity = String(0.35 * (1 - dx / w));
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      if (!active) return;
      active = false;
      s.classList.remove('swiping');
      below?.classList.remove('swiping');
      const d = dimOf(below);
      if (d) d.style.opacity = '';
      const w = dev.el?.offsetWidth || 393;
      // onPop clears the inline transforms and swaps classes synchronously,
      // so the release animates from the finger position (no snap-back frame).
      if (dx > w * 0.35 || v > 0.5) o.current.onPop();
      else {
        s.style.transform = '';
        if (below) below.style.transform = '';
      }
    };
    s.addEventListener('pointerdown', down);
    s.addEventListener('pointermove', move);
    s.addEventListener('pointerup', end);
    s.addEventListener('pointercancel', end);
    return () => {
      s.removeEventListener('pointerdown', down);
      s.removeEventListener('pointermove', move);
      s.removeEventListener('pointerup', end);
      s.removeEventListener('pointercancel', end);
    };
  }, [screen]);
}
