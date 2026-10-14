'use client';
/**
 * Transaction row with native-feeling gestures:
 * - horizontal swipe reveals Delete (snaps open past 42px / flick), a long
 *   swipe (> 60% width or fast flick) deletes with a collapse animation;
 * - tap opens the detail screen; long-press (450ms) opens the context popover.
 */
import { useEffect, useRef } from 'react';
import type { Expense } from '@/lib/engine';
import { fmtTime } from '@/lib/format';
import { useM } from '../ctx';
import { dev, devRect, haptic } from '../device';
import { Icon } from '../icons';
import { Glyph, Money } from '../ui';

/** The row's visible content (also cloned into the long-press popover). */
export function RowVisual({ e, rowRef, tabIndex, onKeyDown }: {
  e: Expense;
  rowRef?: React.Ref<HTMLDivElement>;
  tabIndex?: number;
  onKeyDown?: (ev: React.KeyboardEvent) => void;
}) {
  return (
    <div className="row" ref={rowRef} role={tabIndex != null ? 'button' : undefined} tabIndex={tabIndex} onKeyDown={onKeyDown}>
      <Glyph cat={e.category} />
      <div className="row-main">
        <div className="row-t">{e.note || e.category}</div>
        <div className="row-s">{e.category}{e.time ? ' · ' + fmtTime(e.time) : ''}</div>
      </div>
      <div className="row-amt"><Money v={e.amount} /></div>
    </div>
  );
}

export default function SwipeRow({ e }: { e: Expense }) {
  const m = useM();
  const wrap = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const api = useRef(m);
  api.current = m;

  useEffect(() => {
    const w = wrap.current, r = row.current;
    if (!w || !r) return;
    const openRow = api.current.openRow;
    let sx = 0, sy = 0, dx = 0, axis: 'x' | 'y' | null = null, id: number | null = null, base = 0, fired = false, lt = 0, lx = 0, v = 0;
    let lp: ReturnType<typeof setTimeout> | undefined;

    const close = () => {
      r.style.transform = '';
      w.classList.remove('open');
      w.style.removeProperty('--dx');
      if (openRow.current?.el === w) openRow.current = null;
    };
    const closeOther = () => {
      if (openRow.current && openRow.current.el !== w) {
        openRow.current.close();
        openRow.current = null;
      }
    };
    const fullDelete = () => {
      haptic(15);
      w.style.setProperty('--dx', w.offsetWidth + 'px');
      r.style.transform = 'translateX(-100%)';
      w.style.height = w.offsetHeight + 'px';
      setTimeout(() => { w.style.height = '0px'; }, 180);
      setTimeout(() => api.current.deleteWithUndo(e.id), 440);
    };
    const reset = () => { clearTimeout(lp); r.classList.remove('pressing'); };

    const down = (ev: PointerEvent) => {
      if (ev.button > 0) return;
      closeOther();
      id = ev.pointerId; sx = lx = ev.clientX; sy = ev.clientY; axis = null; fired = false; dx = 0; lt = performance.now(); v = 0;
      base = w.classList.contains('open') ? -84 : 0;
      r.classList.add('pressing');
      lp = setTimeout(() => {
        if (!axis && id != null) {
          fired = true;
          r.classList.remove('pressing');
          haptic(12);
          api.current.longPress(e, devRect(w));
        }
      }, 450);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      const mx = (ev.clientX - sx) / dev.fit, my = (ev.clientY - sy) / dev.fit;
      if (!axis) {
        if (Math.abs(mx) > 8 || Math.abs(my) > 8) {
          reset();
          axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
          if (axis === 'x') {
            try { r.setPointerCapture(id); } catch { /* ignore */ }
            r.style.transition = 'none';
            w.style.transition = 'none';
          }
        }
        if (axis !== 'x') return;
      }
      if (axis !== 'x') return;
      const now = performance.now();
      v = (ev.clientX - lx) / dev.fit / Math.max(1, now - lt);
      lx = ev.clientX; lt = now;
      let x = base + mx;
      if (x > 0) x *= 0.25;
      dx = x;
      r.style.transform = `translateX(${x}px)`;
      w.style.setProperty('--dx', Math.max(0, -x) + 'px');
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      id = null;
      reset();
      if (axis === 'x') {
        r.style.transition = '';
        w.style.transition = '';
        const width = w.offsetWidth;
        if (-dx > width * 0.6 || (v < -1.2 && -dx > 100)) fullDelete();
        else if (-dx > 42 || (v < -0.35 && dx < 0)) {
          r.style.transform = 'translateX(-84px)';
          w.classList.add('open');
          w.style.setProperty('--dx', '84px');
          openRow.current = { el: w, close };
        } else close();
      } else if (!axis && !fired && ev.type === 'pointerup') {
        if (w.classList.contains('open')) close();
        else api.current.openDetail(e.id);
      }
      axis = null;
    };
    const ctx = (ev: Event) => ev.preventDefault();
    const del = w.querySelector('.row-del');
    r.addEventListener('pointerdown', down);
    r.addEventListener('pointermove', move);
    r.addEventListener('pointerup', up);
    r.addEventListener('pointercancel', up);
    r.addEventListener('contextmenu', ctx);
    del?.addEventListener('click', fullDelete);
    return () => {
      clearTimeout(lp);
      r.removeEventListener('pointerdown', down);
      r.removeEventListener('pointermove', move);
      r.removeEventListener('pointerup', up);
      r.removeEventListener('pointercancel', up);
      r.removeEventListener('contextmenu', ctx);
      del?.removeEventListener('click', fullDelete);
      if (openRow.current?.el === w) openRow.current = null;
    };
  }, [e]);

  return (
    <div className="row-wrap" ref={wrap} data-id={e.id}>
      <button type="button" className="row-del" aria-label="Delete">
        <Icon name="trash" size={22} sw={2} />
        <span>Delete</span>
      </button>
      <RowVisual e={e} rowRef={row} tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter') m.openDetail(e.id); }} />
    </div>
  );
}
