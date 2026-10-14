'use client';
import { useId } from 'react';
import { clamp } from '@/lib/format';
import { useDrawIn } from '../hooks/useDrawIn';
import { usedColor } from '../device';

/** Smooth (horizontal-tangent cubic) path through `vals` scaled into w×h. */
export function sparkPath(vals: number[], w: number, h: number, padY = 4): { line: string; area: string } {
  if (!vals.length) return { line: '', area: '' };
  const max = Math.max(...vals, 1), n = vals.length;
  const pts = vals.map((v, i) => [n === 1 ? w / 2 : (i / (n - 1)) * w, h - padY - (v / max) * (h - padY * 2)]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = ((x0 + x1) / 2).toFixed(1);
    d += ` C${cx},${y0.toFixed(1)} ${cx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return { line: d, area: `${d} L${w},${h} L0,${h} Z` };
}

/** Hero sparkline: gradient area fades in, line draws in. */
export function Spark({ vals }: { vals: number[] }) {
  const id = useId().replace(/:/g, '');
  const sp = sparkPath(vals, 329, 56);
  return (
    <svg className="spark" viewBox="0 0 329 56" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7A1A" stopOpacity=".32" />
          <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="fade-in" d={sp.area} fill={`url(#spg${id})`} />
      <path className="draw" pathLength={1} d={sp.line} fill="none" stroke="#FF7A1A" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Budget-used ring; arc sweeps in from empty. */
export function Ring({ used, size = 44, sw = 5 }: { used: number; size?: number; sw?: number }) {
  const on = useDrawIn();
  const r = (size - sw) / 2, c = 2 * Math.PI * r, f = clamp(used, 0, 1);
  return (
    <svg className="ring" viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={sw} />
      <circle
        className="arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={usedColor(used)} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={on ? c * (1 - f) : c}
      />
    </svg>
  );
}
