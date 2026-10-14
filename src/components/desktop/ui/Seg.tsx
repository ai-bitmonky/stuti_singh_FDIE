'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface SegProps<T extends string | number> {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label?: string;
}

/** Segmented control with a sliding thumb. */
export function Seg<T extends string | number>({ options, value, onChange, className = '', label }: SegProps<T>) {
  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    const on = root.current?.querySelector<HTMLButtonElement>('button.on');
    const th = thumb.current;
    if (!on || !th) return;
    th.style.width = on.offsetWidth + 'px';
    th.style.transform = `translateX(${on.offsetLeft}px)`;
  }, []);

  useLayoutEffect(() => {
    sync();
  }, [sync, value, options]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      clearTimeout(t);
      t = setTimeout(sync, 160);
    };
    window.addEventListener('resize', on);
    // fonts may load after first layout and change button widths
    document.fonts?.ready.then(sync).catch(() => undefined);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', on);
    };
  }, [sync]);

  return (
    <div ref={root} className={`seg ${className}${ready ? ' ready' : ''}`} role="group" aria-label={label}>
      <span ref={thumb} className="seg-thumb" />
      {options.map(([v, l]) => {
        const on = String(v) === String(value);
        return (
          <button key={String(v)} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => onChange(v)}>
            {l}
          </button>
        );
      })}
    </div>
  );
}
