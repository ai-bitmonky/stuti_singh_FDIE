'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { clamp } from '@/lib/format';
import { dev, haptic } from '../device';

/**
 * Pull-to-refresh on a scroller: pulling down from scrollTop 0 translates
 * `content` (half-resistance, max 110px) and fades/rotates the spinner;
 * releasing past 60px spins for 900ms then calls `onRefresh`.
 * Touch on devices, mouse drag in the desktop phone frame.
 */
export function usePullToRefresh(
  scroller: RefObject<HTMLElement>,
  content: RefObject<HTMLElement>,
  spinner: RefObject<HTMLElement>,
  onRefresh: () => void,
): void {
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const sc = scroller.current, ct = content.current, sp = spinner.current;
    if (!sc || !ct || !sp) return;
    let sy = 0, pull = 0, pulling = false, busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const setPull = (p: number) => {
      pull = p;
      ct.style.transform = p ? `translateY(${p}px)` : '';
      sp.style.opacity = String(clamp(p / 64, 0, 1));
      const svg = sp.firstElementChild as HTMLElement | null;
      if (svg) svg.style.transform = `rotate(${p * 4}deg)`;
    };
    const start = (y: number) => {
      if (busy || sc.scrollTop > 0) return;
      sy = y; pulling = true; ct.style.transition = 'none';
    };
    const move = (y: number, ev?: Event) => {
      if (!pulling) return;
      const d = (y - sy) / dev.fit;
      if (d <= 0) { setPull(0); return; }
      if (ev && ev.cancelable) ev.preventDefault();
      setPull(Math.min(110, d * 0.5));
    };
    const end = () => {
      if (!pulling) return;
      pulling = false;
      ct.style.transition = 'transform .4s var(--ease)';
      if (pull >= 60) {
        busy = true; haptic(10); setPull(56); sp.style.opacity = '1'; sp.classList.add('spin');
        timer = setTimeout(() => {
          sp.classList.remove('spin'); setPull(0); busy = false; cb.current();
        }, 900);
      } else setPull(0);
    };

    const ts = (e: TouchEvent) => start(e.touches[0].clientY);
    const tm = (e: TouchEvent) => move(e.touches[0].clientY, e);
    const md = (e: MouseEvent) => {
      if ((e.target as Element).closest('.row,.hscroll,button')) return;
      start(e.clientY);
      const mm = (ev: MouseEvent) => move(ev.clientY);
      const mu = () => {
        end();
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
      };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    };
    sc.addEventListener('touchstart', ts, { passive: true });
    sc.addEventListener('touchmove', tm, { passive: false });
    sc.addEventListener('touchend', end);
    sc.addEventListener('touchcancel', end);
    sc.addEventListener('mousedown', md);
    return () => {
      clearTimeout(timer);
      sc.removeEventListener('touchstart', ts);
      sc.removeEventListener('touchmove', tm);
      sc.removeEventListener('touchend', end);
      sc.removeEventListener('touchcancel', end);
      sc.removeEventListener('mousedown', md);
    };
  }, [scroller, content, spinner]);
}
