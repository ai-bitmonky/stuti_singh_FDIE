'use client';
import { useEffect, useState } from 'react';

/** Desktop layout from this width up. */
export const DESKTOP_BREAKPOINT = 1024;

export interface Viewport {
  width: number;
  height: number;
  /** width < 1024 */
  isMobile: boolean;
}

const read = (): Viewport => {
  if (typeof window === 'undefined') return { width: DESKTOP_BREAKPOINT, height: 800, isMobile: false };
  const width = window.innerWidth;
  return { width, height: window.innerHeight, isMobile: width < DESKTOP_BREAKPOINT };
};

/**
 * Current viewport size, updated on resize (debounced, default 120ms).
 * On the server / first render returns a 1024×800 desktop default.
 */
export function useViewport(debounceMs = 120): Viewport {
  const [vp, setVp] = useState<Viewport>(read);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      clearTimeout(t);
      t = setTimeout(() => setVp(read()), debounceMs);
    };
    setVp(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, [debounceMs]);
  return vp;
}
