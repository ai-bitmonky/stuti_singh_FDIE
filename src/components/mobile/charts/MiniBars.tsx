'use client';
import { SIM_CATS, type Computed, type SimResult } from '@/lib/engine';

/** Tiny "Now vs Sim" paired bars in the simulator summary. */
export default function MiniBars({ c, s }: { c: Computed; s: SimResult }) {
  const max = Math.max(...SIM_CATS.map((k) => c.byCat[k]), 1);
  return (
    <div className="mini">
      <svg viewBox="0 0 104 62" aria-hidden="true">
        <line x1="0" x2="104" y1="60.5" y2="60.5" stroke="rgba(255,255,255,.12)" />
        {SIM_CATS.map((k, i) => {
          const x = i * 21 + 1.5, h1 = (c.byCat[k] / max) * 58, h2 = (s.simulated[k] / max) * 58;
          return (
            <g key={k}>
              <rect x={x} y={60 - h1} width="8" height={h1} rx="2" fill="#5F6879" />
              <rect x={x + 9} y={60 - h2} width="8" height={h2} rx="2" fill="#FF7A1A" />
            </g>
          );
        })}
      </svg>
      <div className="lg">
        <span><i style={{ background: '#5F6879' }} />Now</span>
        <span><i style={{ background: '#FF7A1A' }} />Sim</span>
      </div>
    </div>
  );
}
