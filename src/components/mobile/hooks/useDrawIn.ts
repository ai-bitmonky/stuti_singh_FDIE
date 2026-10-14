'use client';
import { useEffect, useState } from 'react';

/**
 * `false` on the first paint, `true` two frames later — lets an SVG render
 * in its "empty" state and then transition to its real geometry (ring arcs,
 * donut segments). Re-arms when `key` changes.
 */
export function useDrawIn(key?: unknown): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setOn(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [key]);
  return on;
}
