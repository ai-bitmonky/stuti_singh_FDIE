'use client';
import { clamp } from '@/lib/format';
import { vars } from './util';

/** Progress ring (budget used). `frac` is clamped to 0–1. */
export function Ring({ size, stroke, frac, color }: { size: number; stroke: number; frac: number; color: string }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, p = clamp(frac, 0, 1), cx = size / 2;
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      {p > 0 && (
        <circle
          className="a-ring"
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C.toFixed(2)}
          strokeDashoffset={(C * (1 - p)).toFixed(2)}
          style={{
            ...vars({ '--c': C.toFixed(2) }),
            filter: `drop-shadow(0 0 6px ${color === 'var(--accent)' ? 'rgba(255,122,26,.35)' : 'transparent'})`,
          }}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      )}
    </svg>
  );
}
