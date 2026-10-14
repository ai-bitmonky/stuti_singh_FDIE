'use client';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface TipHandle {
  show: (content: ReactNode, x: number, y: number) => void;
  hide: () => void;
}

/** Chart tooltip (fixed, follows the hovered point, flips at the viewport edges). */
export const Tip = forwardRef<TipHandle>(function Tip(_, ref) {
  const [st, setSt] = useState<{ content: ReactNode; x: number; y: number; show: boolean }>({ content: null, x: 0, y: 0, show: false });
  const el = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      show: (content, x, y) => setSt({ content, x, y, show: true }),
      hide: () => setSt((s) => (s.show ? { ...s, show: false } : s)),
    }),
    [],
  );

  useLayoutEffect(() => {
    const t = el.current;
    if (!t || !st.show) return;
    const r = t.getBoundingClientRect();
    let left = st.x + 14, top = st.y - r.height - 12;
    if (left + r.width > window.innerWidth - 8) left = st.x - r.width - 14;
    if (top < 8) top = st.y + 16;
    t.style.transform = 'none';
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }, [st]);

  return (
    <div ref={el} className={`tip${st.show ? ' show' : ''}`} role="tooltip">
      {st.content}
    </div>
  );
});
