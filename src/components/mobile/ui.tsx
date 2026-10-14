'use client';
/** Small presentational building blocks shared by the mobile screens. */
import { useEffect, useState, type ReactNode } from 'react';
import { CAT, type Category, type Status } from '@/lib/engine';
import { fmtN } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import { haptic } from './device';
import { Icon } from './icons';

/** `₹` + Indian-grouped number (prototype's `money()`). */
export function Money({ v }: { v: number }) {
  return (
    <>
      <span className="cur">₹</span>
      {fmtN(v)}
    </>
  );
}

/** Count-up number (eases on mount and whenever the value changes). */
export function Num({ v, duration }: { v: number; duration?: number }) {
  const x = useCountUp(Math.round(v), { duration });
  return <span className="tnum">{fmtN(x)}</span>;
}

/** `₹` + count-up number (prototype's `numSpan()`). */
export function CountMoney({ v, duration }: { v: number; duration?: number }) {
  return (
    <>
      <span className="cur">₹</span>
      <Num v={v} duration={duration} />
    </>
  );
}

/** Count-up that animates once on mount, then tracks the value instantly (for sliders). */
export function useMountCountUp(v: number): number {
  const [dur, setDur] = useState(700);
  useEffect(() => {
    const t = setTimeout(() => setDur(0), 760);
    return () => clearTimeout(t);
  }, []);
  return useCountUp(Math.round(v), { duration: dur });
}

export function StatusPill({ status }: { status: Status }) {
  return status === 'On track' ? (
    <span className="pill good"><Icon name="check" size={13} sw={2.6} />On track</span>
  ) : (
    <span className="pill bad"><Icon name="alert" size={13} sw={2.4} />Over budget</span>
  );
}

export function Glyph({ cat, className, style }: { cat: Category; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={'glyph' + (className ? ' ' + className : '')} style={{ ['--c' as string]: CAT[cat].color, ...style }}>
      {CAT[cat].glyph}
    </div>
  );
}

/** iOS segmented control with a sliding thumb. */
export function SegControl<K extends string>({ items, value, onPick }: {
  items: readonly (readonly [K, string])[];
  value: K;
  onPick: (k: K) => void;
}) {
  const idx = Math.max(0, items.findIndex((i) => i[0] === value));
  return (
    <div className="seg-wrap">
      <div className="seg" role="tablist">
        <div className="seg-thumb" style={{ width: `calc((100% - 4px) / ${items.length})`, transform: `translateX(${idx * 100}%)` }} />
        {items.map(([k, label], i) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={i === idx}
            className={i === idx ? 'on' : ''}
            onClick={() => {
              if (i === idx) return;
              haptic(5);
              onPick(k);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmptyCard({ title, text, onAdd }: { title: string; text: string; onAdd: () => void }) {
  return (
    <div className="card empty mx" style={{ marginTop: 4 }}>
      <svg className="ill" viewBox="0 0 120 96" fill="none" aria-hidden="true">
        <circle cx="60" cy="48" r="30" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
        <path d="M60 18a30 30 0 0 1 30 30" stroke="#FF7A1A" strokeWidth="10" strokeLinecap="round" opacity=".8" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      <button type="button" className="btn-primary pressable" onClick={onAdd}>
        <Icon name="plus" size={20} sw={2.4} />Add expense
      </button>
    </div>
  );
}

export function Privacy({ icon = 'lock', children, style }: { icon?: 'lock' | 'info'; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="privacy" style={style}>
      <Icon name={icon} size={15} sw={2} />
      <span>{children}</span>
    </div>
  );
}

/** Large-title header block used at the top of every tab. */
export function LargeTitle({ cap, title }: { cap: string; title: string }) {
  return (
    <div className="lt">
      <div>
        <div className="lt-cap">{cap}</div>
        <h1 className="lt-title">{title}</h1>
      </div>
    </div>
  );
}
