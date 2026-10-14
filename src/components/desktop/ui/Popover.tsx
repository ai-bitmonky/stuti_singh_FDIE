'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { clamp } from '@/lib/format';

export type Placement = 'bottom-end' | 'bottom-start' | 'top-start' | 'top-end';
export interface PopOpts {
  placement?: Placement;
  width?: number;
}
export interface PopHandle {
  open: (anchor: HTMLElement, content: ReactNode, opts?: PopOpts) => void;
  close: () => void;
  isOpen: () => boolean;
  /** Is the popover currently anchored to `el`? (used for toggle buttons) */
  isFor: (el: HTMLElement | null) => boolean;
}
interface PopState {
  anchor: HTMLElement;
  content: ReactNode;
  placement: Placement;
  width?: number;
  key: number;
}

/** Single popover at a time; closes on outside mousedown (Esc handled by the app). */
export const Popover = forwardRef<PopHandle>(function Popover(_, ref) {
  const [st, setSt] = useState<PopState | null>(null);
  const stRef = useRef<PopState | null>(null);
  stRef.current = st;
  const el = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const close = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    cur.anchor.closest('.row-actions')?.classList.remove('pin');
    stRef.current = null;
    setSt(null);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open(anchor, content, { placement = 'bottom-end', width } = {}) {
        stRef.current?.anchor.closest('.row-actions')?.classList.remove('pin');
        const next = { anchor, content, placement, width, key: ++seq.current };
        stRef.current = next;
        setSt(next);
        anchor.closest('.row-actions')?.classList.add('pin');
      },
      close,
      isOpen: () => !!stRef.current,
      isFor: (x) => !!x && stRef.current?.anchor === x,
    }),
    [close],
  );

  // position before paint
  useLayoutEffect(() => {
    const p = el.current;
    if (!st || !p) return;
    const a = st.anchor.getBoundingClientRect(), r = p.getBoundingClientRect();
    let left = st.placement.endsWith('end') ? a.right - r.width : a.left;
    let top = st.placement.startsWith('top') ? a.top - r.height - 8 : a.bottom + 8;
    if (top + r.height > window.innerHeight - 8) top = a.top - r.height - 8;
    left = clamp(left, 8, window.innerWidth - r.width - 8);
    top = Math.max(8, top);
    p.style.left = left + 'px';
    p.style.top = top + 'px';
    const t = setTimeout(() => p.querySelector<HTMLElement>('input,button.btn-danger,button.btn-primary')?.focus(), 30);
    return () => clearTimeout(t);
  }, [st]);

  useEffect(() => {
    if (!st) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (el.current?.contains(t) || st.anchor.contains(t)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [st, close]);

  if (!st) return null;
  return (
    <div key={st.key} ref={el} className="pop" role="dialog" style={{ width: st.width, left: -9999, top: -9999 }}>
      {st.content}
    </div>
  );
});
