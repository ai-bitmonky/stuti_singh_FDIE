'use client';
import { useEffect, useRef, useState } from 'react';
import type { AppMode } from '../AppSwitch';
import type { Computed, State } from '@/lib/engine';
import { fmtPlain, initials } from '@/lib/format';
import type { View } from '@/hooks/useHash';
import { useDesk } from './ctx';
import { Icon, type IconName } from './ui/Icon';
import { Money } from './ui/Money';
import { Ring } from './ui/Ring';
import { budgetColor } from './ui/util';
import { SettingsPop } from './Popovers';

export const NAV: readonly [View, string, IconName, string][] = [
  ['overview', 'Overview', 'grid', 'Overview'],
  ['add', 'Add Expense', 'plus', 'Add expense'],
  ['analytics', 'Analytics', 'pie', 'Analytics'],
  ['simulate', 'Simulate', 'sliders', 'Simulate'],
  ['insights', 'Insights', 'sparkles', 'Insights'],
  ['oop', 'OOP Concepts', 'code', 'OOP Concepts'],
];

function MiniBudget({ c, budget }: { c: Computed; budget: number }) {
  const { applyBudget } = useDesk();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const done = useRef(false);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      inp.current?.focus();
      inp.current?.select();
    }
  }, [editing]);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save && !applyBudget(val)) {
      done.current = false;
      inp.current?.focus();
      return;
    }
    setEditing(false);
  };
  const u = Math.round(c.used * 100);
  return (
    <div className="mini-budget">
      <div className="mb-ring">
        <Ring size={48} stroke={5} frac={c.used} color={budgetColor(c.used)} />
        <span>{u}%</span>
      </div>
      <div className="mb-text">
        <div className="mb-title">Budget {u}%</div>
        {editing ? (
          <input
            ref={inp}
            className="input mb-input"
            type="text"
            inputMode="numeric"
            aria-label="Monthly budget"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finish(true);
              if (e.key === 'Escape') {
                e.stopPropagation();
                finish(false);
              }
            }}
            onBlur={() => finish(true)}
          />
        ) : (
          <button
            type="button"
            className="mb-amt"
            title="Edit monthly budget"
            onClick={() => {
              done.current = false;
              setVal(String(budget));
              setEditing(true);
            }}
          >
            <Money n={budget} cls="cur-sm" />
            <Icon name="pencil" size={12} />
          </button>
        )}
        <div className="mb-est">
          est. {fmtPlain(c.monthlyEstimate)} · {c.status}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ view, c, state, onSwitch }: { view: View; c: Computed; state: State; onSwitch: (m: AppMode) => void }) {
  const { openPop, closePop, popFor } = useDesk();
  const chip = useRef<HTMLButtonElement>(null);
  const [anim, setAnim] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAnim(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <aside className={`sidebar${anim ? ' anim' : ''}`} aria-label="Primary">
      <div className="brand">
        <div className="logo" aria-hidden="true">
          <b>₹</b>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
          </svg>
        </div>
        <div>
          <div className="brand-name">FDIE</div>
          <div className="brand-sub">Financial Decision Engine · OOP version</div>
        </div>
      </div>
      <div className="nav-label">Workspace</div>
      <nav className="nav">
        {NAV.map(([id, label, ic], i) => (
          <a key={id} href={`#${id}`} className={view === id ? 'active' : undefined} aria-current={view === id ? 'page' : undefined}>
            <Icon name={ic} size={19} />
            <span>{label}</span>
            <span className="kbd">{i + 1}</span>
          </a>
        ))}
      </nav>
      <div className="side-bottom">
        <MiniBudget c={c} budget={state.budget} />
        <button
          ref={chip}
          type="button"
          className="user-chip"
          aria-haspopup="dialog"
          aria-label="Open settings"
          onClick={() => {
            if (popFor(chip.current)) return closePop();
            if (chip.current) openPop(chip.current, <SettingsPop />, { placement: 'top-start', width: 300 });
          }}
        >
          <span className="avatar">{initials(state.user)}</span>
          <span style={{ minWidth: 0 }}>
            <div className="uc-name">{state.user || 'Unnamed'}</div>
            <div className="uc-sub">Bengaluru · INR</div>
          </span>
          <span>
            <Icon name="settings" size={16} className="chev" />
          </span>
        </button>
        <div className="side-foot">
          <span className="priv">
            <Icon name="shield" size={13} />
            Privacy: local only
          </span>
          <span>Prototype · local data only · heuristics, not advice</span>
          <button type="button" className="side-switch" onClick={() => onSwitch('mobile')}>
            <Icon name="layers" size={13} />
            Switch to mobile view
          </button>
        </div>
      </div>
    </aside>
  );
}
