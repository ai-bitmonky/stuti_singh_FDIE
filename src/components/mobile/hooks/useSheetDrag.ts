'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { clamp } from '@/lib/format';
import { dev, haptic } from '../device';

/**
 * Drag-to-dismiss for a bottom sheet. Dragging any of `handles` moves the
 * sheet 1:1 (rubber-band upward), scales the app behind via `--sp`, and on
 * release either dismisses (past 30% of height, or a downward flick
 * > 0.55 px/ms) or springs back.
 */
export function useSheetDrag(
  sheet: RefObject<HTMLElement>,
  handles: RefObject<HTMLElement>[],
  open: boolean,
  onClose: () => void,
): void {
  const openRef = useRef(open);
  openRef.current = open;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const sh = sheet.current;
    if (!sh) return;
    let sy = 0, dy = 0, id: number | null = null, active = false, lt = 0, ly = 0, v = 0, H = 1;
    const cleanups: (() => void)[] = [];

    for (const ref of handles) {
      const hd = ref.current;
      if (!hd) continue;
      const down = (e: PointerEvent) => {
        const t = e.target as Element;
        if (e.button > 0 || !openRef.current || t.closest('button:not(.handle), input, .key')) return;
        id = e.pointerId; sy = ly = e.clientY; dy = 0; v = 0; lt = performance.now(); active = false; H = sh.offsetHeight;
        try { hd.setPointerCapture(id); } catch { /* ignore */ }
      };
      const move = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        const m = (e.clientY - sy) / dev.fit;
        if (!active) {
          if (Math.abs(m) < 4) return;
          active = true;
          dev.el?.classList.add('dragging');
        }
        const now = performance.now();
        v = (e.clientY - ly) / dev.fit / Math.max(1, now - lt);
        ly = e.clientY; lt = now;
        dy = m < 0 ? m * 0.15 : m;
        sh.style.transform = `translateY(${dy}px)`;
        dev.el?.style.setProperty('--sp', clamp(1 - dy / H, 0, 1).toFixed(3));
      };
      const end = (e: PointerEvent) => {
        if (e.pointerId !== id) return;
        id = null;
        if (!active) return;
        active = false;
        dev.el?.classList.remove('dragging');
        sh.style.transform = '';
        if (dy > H * 0.3 || (v > 0.55 && dy > 20)) {
          haptic(6);
          closeRef.current();
        } else {
          dev.el?.style.setProperty('--sp', '1');
        }
      };
      hd.addEventListener('pointerdown', down);
      hd.addEventListener('pointermove', move);
      hd.addEventListener('pointerup', end);
      hd.addEventListener('pointercancel', end);
      cleanups.push(() => {
        hd.removeEventListener('pointerdown', down);
        hd.removeEventListener('pointermove', move);
        hd.removeEventListener('pointerup', end);
        hd.removeEventListener('pointercancel', end);
      });
    }
    return () => cleanups.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);
}
