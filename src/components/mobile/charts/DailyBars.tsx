'use client';
/** 30-day daily bars (weekends striped, dashed daily-average line) with press-and-drag scrub. */
import { useId, useRef, useState } from 'react';
import type { Computed } from '@/lib/engine';
import { addDays, clamp, isWeekend, iso, parseISO, relDate, todayD } from '@/lib/format';
import { haptic } from '../device';
import { Money } from '../ui';

export const lastNDays = (n: number): string[] => {
  const t = todayD();
  return Array.from({ length: n }, (_, i) => iso(addDays(t, i - n + 1)));
};

const W = 329, H = 150, N = 30;

export default function DailyBars({ c }: { c: Computed }) {
  const pid = 'stripe' + useId().replace(/:/g, '');
  const days = lastNDays(N);
  const vals = days.map((d) => c.byDate[d] || 0);
  const max = Math.max(...vals, 1);
  const slot = W / N, bw = Math.max(4, slot - 4.5);
  const ay = H - (c.dailyPace / max) * (H - 8);
  const box = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const barH = (v: number) => (v ? Math.max(4, (v / max) * (H - 8)) : 3);

  const at = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const i = Math.floor(clamp((e.clientX - r.left) / r.width, 0, 0.9999) * N);
    if (last.current !== i) {
      last.current = i;
      haptic(3);
      setSel(i);
    }
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== pointer.current) return;
    pointer.current = null;
    last.current = null;
    setSel(null);
  };

  return (
    <div className="card chart-card">
      <div className="cc-h">
        <div>
          <div className="cc-k">Daily spend · 30 days</div>
          <div className="cc-v"><Money v={c.dailyPace} /><span style={{ font: '500 13px var(--font)', color: 'var(--text-2)' }}> /day avg</span></div>
        </div>
        <div className="cc-n">Press &amp; drag<br />to scrub</div>
      </div>
      <div
        className="bars"
        ref={box}
        onPointerDown={(e) => {
          pointer.current = e.pointerId;
          try { box.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          at(e);
        }}
        onPointerMove={(e) => { if (e.pointerId === pointer.current) at(e); }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <svg viewBox={`0 0 ${W} ${H}`} height={H} preserveAspectRatio="none" role="img" aria-label="Daily spending, last 30 days">
          <defs>
            <pattern id={pid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="#FF7A1A" />
              <rect width="2" height="5" fill="#FFB169" opacity=".55" />
            </pattern>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H - f * (H - 8)} y2={H - f * (H - 8)} stroke="rgba(255,255,255,.05)" />
          ))}
          {days.map((d, i) => {
            const v = vals[i], h = barH(v), wk = isWeekend(parseISO(d));
            return (
              <rect
                key={d}
                className={'bar' + (sel != null && sel !== i ? ' dim' : '')}
                x={(i * slot + (slot - bw) / 2).toFixed(1)} y={(H - h).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} rx={(bw / 2).toFixed(1)}
                fill={v ? (wk ? `url(#${pid})` : '#FF7A1A') : 'rgba(255,255,255,.08)'}
                style={{ animationDelay: `${i * 18}ms` }}
              />
            );
          })}
          <line x1="0" x2={W} y1={ay} y2={ay} stroke="#FFB169" strokeDasharray="3 4" strokeWidth="1.2" opacity=".8" />
        </svg>
        <div
          className={'tip' + (sel != null ? ' show' : '')}
          style={sel != null ? { left: `${clamp(((sel + 0.5) / N) * 100, 9, 91)}%`, top: H - barH(vals[sel]) - 8 } : undefined}
        >
          {sel != null && (<><Money v={vals[sel]} /><small>{relDate(days[sel])}</small></>)}
        </div>
      </div>
      <div className="axis"><span>{relDate(days[0])}</span><span>{relDate(days[15])}</span><span>Today</span></div>
      <div className="legend-chips">
        <span><i style={{ ['--c' as string]: '#FF7A1A' }} />Weekday</span>
        <span><i style={{ background: 'repeating-linear-gradient(45deg,#FF7A1A 0 3px,#FFB169 3px 5px)' }} />Weekend</span>
        <span><i style={{ background: 'transparent', borderTop: '1.5px dashed #FFB169', borderRadius: 0, height: 0, width: 12 }} />Daily avg</span>
      </div>
    </div>
  );
}
