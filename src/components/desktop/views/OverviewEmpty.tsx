'use client';
import { useFDIE } from '@/lib/store';
import { useDesk } from '../ctx';
import { Icon } from '../ui/Icon';

/** Empty state: no expenses at all, or none in the selected range. */
export function OverviewEmpty({ hasAny }: { hasAny: boolean }) {
  const { reset } = useFDIE();
  const { openDrawer, setRange, toast } = useDesk();
  return (
    <div className="grid">
      <article className="card span-12 flat">
        <div className="empty">
          <svg width="148" height="112" viewBox="0 0 148 112" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="eg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FF7A1A" />
                <stop offset="1" stopColor="#FFB169" />
              </linearGradient>
            </defs>
            <rect x="24" y="26" width="100" height="70" rx="16" fill="#171D28" stroke="rgba(255,255,255,.12)" />
            <rect x="24" y="26" width="100" height="20" rx="10" fill="#1F2633" />
            <rect x="92" y="54" width="40" height="26" rx="10" fill="#11161F" stroke="rgba(255,255,255,.12)" />
            <circle cx="104" cy="67" r="5" fill="url(#eg)" />
            <path d="M36 62h36M36 74h24" stroke="#5F6879" strokeWidth="3" strokeLinecap="round" />
            <path d="M118 8l2.6 7.4L128 18l-7.4 2.6L118 28l-2.6-7.4L108 18l7.4-2.6z" fill="url(#eg)" />
            <circle cx="20" cy="18" r="3" fill="#60A5FA" opacity=".7" />
            <circle cx="138" cy="44" r="2" fill="#A78BFA" />
          </svg>
          <h3>{hasAny ? 'Nothing in this range' : 'No expenses yet'}</h3>
          <p>
            {hasAny
              ? 'No expenses fall inside the selected window. Widen the range or log something new.'
              : 'Log your first expense and FDIE will project your month, check your budget and surface insights.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => openDrawer()}>
              <Icon name="plus" size={16} />
              Add your first expense
            </button>
            {hasAny ? (
              <button type="button" className="btn btn-lg" onClick={() => setRange('all')}>
                Show all data
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-lg"
                onClick={() => {
                  reset();
                  toast('Demo data loaded');
                }}
              >
                Load demo data
              </button>
            )}
          </div>
        </div>
      </article>
      <div className="span-12 kpis">
        {['Monthly estimate', 'Daily pace', 'Weekly pace', 'Transactions'].map((l) => (
          <div key={l} className="ghost-tile">
            <div className="label">{l}</div>
            <div className="g-bar w2" />
            <div className="g-bar w1" />
          </div>
        ))}
      </div>
    </div>
  );
}
