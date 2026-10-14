'use client';
import type { CSSProperties } from 'react';
import { CAT, type SimResult } from '@/lib/engine';
import { fmtK, fmtPlain } from './data';
import { YGrid } from './Axis';
import { niceStep, ticks, useSize } from './util';
import { vars } from '../ui/util';

const P = { l: 44, r: 8, t: 24, b: 46 };

/** Current (grey) vs simulated (orange; Education hatched) per category. Sim bars glide on change. */
export function SimBars({ s }: { s: SimResult }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const W = Math.max(380, size.w), H = size.h || 300;
  const max = Math.max(...s.rows.map((r) => r.current), 1), step = niceStep(max / 4), top = step * Math.ceil(max / step);
  const iw = W - P.l - P.r, ih = H - P.t - P.b, sx = iw / s.rows.length, bw = Math.min(30, sx * 0.3);
  const y = (v: number) => P.t + ih * (1 - v / top);
  const y0 = y(0);

  return (
    <div className="chart sim-chart" ref={ref}>
      {size.w > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Current versus simulated spend by category">
          <defs>
            <linearGradient id="gSim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFB169" />
              <stop offset="1" stopColor="#FF7A1A" />
            </linearGradient>
            <pattern id="pFixed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#FBBF24" opacity=".55" />
              <rect width="2.5" height="6" fill="#11161F" opacity=".5" />
            </pattern>
          </defs>
          <YGrid vals={ticks(step, top)} y={y} left={P.l} right={W - P.r} />
          {s.rows.map((r, i) => {
            const cx = P.l + sx * i + sx / 2;
            const hc = Math.max(2, (ih * r.current) / top);
            const ys = Math.min(y(r.simulated), y0 - 2), hs = y0 - ys;
            const simStyle = { ...vars({ '--i': i * 2 + 1, y: ys + 'px', height: hs + 'px' }), transition: 'y .35s var(--ease),height .35s var(--ease)' } as CSSProperties;
            const lblStyle = {
              ...vars({ y: ys - 8 + 'px' }),
              fill: 'var(--text)',
              font: '600 11px var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
              transition: 'y .35s var(--ease)',
            } as CSSProperties;
            return (
              <g key={r.cat}>
                <rect className="a-bar" style={vars({ '--i': i * 2 })} x={cx - bw - 2} y={y0 - hc} width={bw} height={hc} rx="4" fill="#5F6879">
                  <title>{`${r.cat} current ${fmtPlain(r.current)}`}</title>
                </rect>
                <rect className="a-bar sim-bar" style={simStyle} x={cx + 2} y={ys} width={bw} height={hs} rx="4" fill={r.fixed ? 'url(#pFixed)' : 'url(#gSim)'} />
                <text className="sim-lbl" x={cx + 2 + bw / 2} y={ys - 8} textAnchor="middle" style={lblStyle}>
                  {fmtK(r.simulated)}
                </text>
                <text x={cx} y={H - 24} textAnchor="middle" style={{ fontSize: 15 }}>
                  {CAT[r.cat].glyph}
                </text>
                <text className="axis-t" x={cx} y={H - 6} textAnchor="middle" style={r.fixed ? { fontStyle: 'italic' } : undefined}>
                  {r.cat}
                  {r.fixed ? ' · fixed' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
