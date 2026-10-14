'use client';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useReducedMotion';

export interface CountUpOptions {
  /** Animation length in ms (default 700, per spec). */
  duration?: number;
  /** Animate from 0 on first mount (default true). Later changes animate from the previous value. */
  fromZero?: boolean;
  /** Delay before starting, ms (default 0). */
  delay?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated number that eases toward `target` whenever it changes.
 * Returns the current (unrounded) value — format it yourself (`fmtN`).
 * Jumps straight to `target` when the user prefers reduced motion.
 */
export function useCountUp(target: number, { duration = 700, fromZero = true, delay = 0 }: CountUpOptions = {}): number {
  const [value, setValue] = useState(() => (fromZero ? 0 : target));
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const from = valueRef.current;
    if (prefersReducedMotion() || from === target || duration <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
