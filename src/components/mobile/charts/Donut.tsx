'use client';
/** Category donut + breakdown legend; tap a segment or row to focus it. */
import { CAT, type Category, type Computed } from '@/lib/engine';
import { fmtN, pct } from '@/lib/format';
import { haptic } from '../device';
import { useDrawIn } from '../hooks/useDrawIn';
import { CountMoney, Glyph, Money } from '../ui';

const R = 100, SW = 14, CIRC = 2 * Math.PI * R, GAP = 3 + SW;

export default function Donut({ c, sel, onSel }: { c: Computed; sel: Category | null; onSel: (k: Category | null) => void }) {
  const on = useDrawIn();
  const cats = c.ranked.filter((k) => c.byCat[k] > 0);
  const multi = cats.length > 1;
  let acc = 0;
  const arcs = cats.map((k, i) => {
    const len = c.share[k] * CIRC;
    const draw = Math.max(0.01, len - (multi ? GAP : 0));
    const off = -(acc + (multi ? GAP / 2 : 0));
    acc += len;
    return (
      <circle
        key={k}
        className={'seg-arc' + (sel === k ? ' on' : '')}
        cx="110" cy="110" r={R} fill="none" stroke={CAT[k].color} strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={on ? `${draw} ${CIRC}` : `0 ${CIRC}`} strokeDashoffset={off}
        style={{ transitionDelay: `${i * 60}ms` }}
        onClick={() => pick(k)}
      />
    );
  });
  function pick(k: Category) {
    haptic(6);
    onSel(sel === k ? null : k);
  }
  return (
    <>
      <div className="card donut-card">
        <div className={'donut' + (sel ? ' sel' : '')}>
          <svg viewBox="0 0 220 220" role="img" aria-label="Spending by category">
            <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={SW} />
            {arcs}
          </svg>
          <button type="button" className="donut-c" aria-label="Show total" onClick={() => sel && onSel(null)}>
            {sel ? (
              <>
                <div className="e">{CAT[sel].glyph}</div>
                <div className="k" style={{ color: CAT[sel].color }}>{sel}</div>
                <div className="v"><Money v={c.byCat[sel]} /></div>
                <div className="s">{pct(c.share[sel], 1)} of total</div>
              </>
            ) : (
              <>
                <div className="k">Total spent</div>
                <div className="v"><CountMoney v={c.total} /></div>
                <div className="s">{c.count} transactions</div>
              </>
            )}
          </button>
        </div>
        <div className="foot" style={{ padding: '12px 0 0', textAlign: 'center' }}>Tap a segment or row to focus a category</div>
      </div>
      <div className="sec-h">Breakdown</div>
      <div className="inset legend">
        {cats.map((k) => (
          <button
            key={k}
            type="button"
            className={'cell pressable' + (sel === k ? ' on' : '')}
            style={{ ['--c' as string]: CAT[k].color, width: '100%', textAlign: 'left' }}
            onClick={() => pick(k)}
          >
            <Glyph cat={k} />
            <div className="lbl">
              <div className="lg-t">{k}</div>
              <div className="lg-s">{c.counts[k]} txn{c.counts[k] === 1 ? '' : 's'} · avg ₹{fmtN(c.byCat[k] / c.counts[k])}</div>
            </div>
            <div className="lg-r">
              <div className="a"><Money v={c.byCat[k]} /></div>
              <div className="p">{pct(c.share[k], 1)}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
