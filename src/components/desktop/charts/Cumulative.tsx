'use client';
import { useMemo, useState, type MouseEvent } from 'react';
import { addDays, clamp, fmtDay, fmtPlain, iso, relDate, todayD } from '@/lib/format';
import { useDesk } from '../ctx';
import { monotonePath, niceStep, ticks, useSize } from './util';
import { YGrid } from './Axis';

const P = { l: 44, r: 14, t: 14, b: 28 };

/** Hero: cumulative spend area with budget-pace reference + crosshair. */
export function Cumulative({ N, daily, budget }: { N: number; daily: Record<string, number>; budget: number }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const { showTip, hideTip } = useDesk();
  const [hover, setHover] = useState<number | null>(null);
  const W = Math.max(320, size.w), H = size.h || 236;

  const pts = useMemo(() => {
    const t = todayD(), out: { k: string; v: number; day: number; pace: number }[] = [];
    let cum = 0;
    for (let i = 0; i < N; i++) {
      const k = iso(addDays(t, -(N - 1 - i)));
      cum += daily[k] || 0;
      out.push({ k, v: cum, day: daily[k] || 0, pace: (budget / 30) * (i + 1) });
    }
    return out;
  }, [N, daily, budget]);

  const maxV = Math.max(pts[N - 1].v, pts[N - 1].pace, 1);
  const step = niceStep(maxV / 4), top = step * Math.ceil(maxV / step);
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const x = (i: number) => P.l + (N === 1 ? iw / 2 : (i * iw) / (N - 1));
  const y = (v: number) => P.t + ih * (1 - v / top);
  const line = monotonePath(pts.map((p, i) => [x(i), y(p.v)]));
  const area = `${line}L${x(N - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const labelEvery = N <= 7 ? 1 : N <= 14 ? 2 : 5;
  const xl: number[] = [];
  for (let i = N - 1; i >= 0; i -= labelEvery) xl.push(i);

  const onMove = (ev: MouseEvent<SVGRectElement>) => {
    const svg = ev.currentTarget.ownerSVGElement;
    if (!svg) return;
    const r = svg.getBoundingClientRect(), mx = ev.clientX - r.left;
    const i = clamp(Math.round((mx - P.l) / (N === 1 ? 1 : iw / (N - 1))), 0, N - 1), p = pts[i];
    setHover(i);
    showTip(
      <>
        <div className="t-h">
          {relDate(p.k)} · {fmtDay(p.k, { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
        <div className="t-v">{fmtPlain(p.v)}</div>
        <div className="t-r">
          <span>
            <i className="sw" style={{ background: '#FF7A1A' }} />
            Spent that day
          </span>
          <b>{fmtPlain(p.day)}</b>
        </div>
        <div className="t-r">
          <span>
            <i className="sw" style={{ background: 'var(--text-2)' }} />
            Budget pace
          </span>
          <b>{fmtPlain(p.pace)}</b>
        </div>
      </>,
      r.left + x(i),
      r.top + y(p.v),
    );
  };
  const hp = hover != null ? pts[hover] : null;

  return (
    <div className="chart hero-chart" ref={ref}>
      {size.w > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cumulative spend over the last ${N} days`}>
          <defs>
            <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF7A1A" stopOpacity=".38" />
              <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gLine" x1="0" x2="1">
              <stop offset="0" stopColor="#FF7A1A" />
              <stop offset="1" stopColor="#FFB169" />
            </linearGradient>
          </defs>
          <YGrid vals={ticks(step, top)} y={y} left={P.l} right={W - P.r} />
          {xl.map((i) => (
            <text key={i} className="axis-t" x={x(i)} y={H - 6} textAnchor={i === N - 1 ? 'end' : 'middle'}>
              {i === N - 1 ? 'Today' : fmtDay(pts[i].k)}
            </text>
          ))}
          <path className="a-fade" d={`M${x(0)},${y(pts[0].pace)}L${x(N - 1)},${y(pts[N - 1].pace)}`} stroke="var(--text-2)" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" fill="none" opacity=".7" />
          <text className="axis-t a-fade" x={x(N - 1) - 4} y={y(pts[N - 1].pace) - 8} textAnchor="end" style={{ fill: 'var(--text-2)' }}>
            Budget pace
          </text>
          <path className="a-fade" d={area} fill="url(#gArea)" />
          <path className="a-line" d={line} pathLength={1} fill="none" stroke="url(#gLine)" strokeWidth="2.25" strokeLinecap="round" />
          <g className="xh" style={{ opacity: hp ? 1 : 0, transition: 'opacity .15s' }}>
            {hp && hover != null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={y(0)} stroke="var(--line-2)" strokeWidth="1" />
                <circle cx={x(hover)} cy={y(hp.pace)} r="4.5" fill="var(--text-2)" stroke="var(--surface)" strokeWidth="2" />
                <circle cx={x(hover)} cy={y(hp.v)} r="5.5" fill="#FF7A1A" stroke="var(--surface)" strokeWidth="2.5" />
              </>
            )}
          </g>
          <rect
            className="hit"
            x={P.l}
            y={0}
            width={iw}
            height={H - P.b}
            onMouseMove={onMove}
            onMouseLeave={() => {
              setHover(null);
              hideTip();
            }}
          />
        </svg>
      )}
    </div>
  );
}

/** Tiny area sparkline (KPI tile). */
export function Sparkline({ values }: { values: number[] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const W = Math.max(60, size.w), H = size.h || 40, n = values.length;
  let content = null;
  if (size.w > 0 && n >= 2) {
    const max = Math.max(...values, 1);
    const pts = values.map((v, i): [number, number] => [(i * (W - 4)) / (n - 1) + 2, H - 3 - ((H - 8) * v) / max]);
    const d = monotonePath(pts);
    content = (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="gSpark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF7A1A" stopOpacity=".28" />
            <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="a-fade" d={`${d}L${W - 2},${H}L2,${H}Z`} fill="url(#gSpark)" />
        <path className="a-line" d={d} pathLength={1} fill="none" stroke="#FF7A1A" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="3" fill="#FFB169" className="a-fade" />
      </svg>
    );
  }
  return (
    <div className="kpi-spark" ref={ref} title="Daily spend">
      {content}
    </div>
  );
}
