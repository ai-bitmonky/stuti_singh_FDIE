'use client';
import { useEffect, type RefObject } from 'react';
import { clamp } from '@/lib/format';

/**
 * Collapsing large title: as the scroller passes the large title, fade in the
 * compact blurred nav bar by driving its `--c` custom property (0..1).
 */
export function useCollapse(scroller: RefObject<HTMLElement>, navbar: RefObject<HTMLElement>): void {
  useEffect(() => {
    const sc = scroller.current, nb = navbar.current;
    if (!sc || !nb) return;
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        nb.style.setProperty('--c', clamp((sc.scrollTop - 30) / 14, 0, 1).toFixed(3));
      });
    };
    sc.addEventListener('scroll', on, { passive: true });
    on();
    return () => {
      sc.removeEventListener('scroll', on);
      cancelAnimationFrame(raf);
    };
  }, [scroller, navbar]);
}
