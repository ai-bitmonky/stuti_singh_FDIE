'use client';
/** Popover bodies: settings, alerts and delete confirmation. */
import { useMemo, useState, type KeyboardEvent } from 'react';
import { compute, insights, viewByRange, type Expense, type Severity } from '@/lib/engine';
import { fmtPlain, relDate } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useDesk } from './ctx';
import { Icon } from './ui/Icon';
import { Segments } from './ui/Segments';

export function SettingsPop() {
  const { state, setUser, reset } = useFDIE();
  const { closePop, applyBudget, toast, exportCSV } = useDesk();
  const [name, setName] = useState(state.user);
  const [bud, setBud] = useState(String(state.budget));
  const [armed, setArmed] = useState(false);

  const save = () => {
    const n = name.trim().slice(0, 40);
    if (!n) {
      document.getElementById('dk-setName')?.focus();
      toast('Name can’t be empty.', { type: 'error' });
      return;
    }
    if (!applyBudget(bud)) return;
    if (n !== state.user) setUser(n);
    closePop();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') save();
  };

  return (
    <div>
      <h4>Settings</h4>
      <p>Personalise the dashboard.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <label className="field">
          <span className="field-label">Display name</span>
          <input className="input" id="dk-setName" maxLength={40} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
        </label>
        <label className="field">
          <span className="field-label">Monthly budget (₹)</span>
          <input className="input" inputMode="numeric" value={bud} onChange={(e) => setBud(e.target.value)} onKeyDown={onKey} />
        </label>
      </div>
      <div className="pop-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={closePop}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}>
          Save
        </button>
      </div>
      <div className="pop-sep" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCSV}>
          <Icon name="download" size={14} />
          <span>Export CSV</span>
        </button>
        <button
          type="button"
          className={`btn ${armed ? 'btn-danger' : 'btn-ghost'} btn-sm`}
          onClick={() => {
            if (!armed) return setArmed(true);
            reset();
            closePop();
            toast('Demo data restored — 38 seeded expenses.', { type: 'info' });
          }}
        >
          <Icon name="reset" size={14} />
          <span>{armed ? 'Click again to confirm' : 'Reset demo data'}</span>
        </button>
      </div>
      <div className="pop-sep" />
      <p style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <Icon name="lock" size={14} />
        Data stays in this browser. Nothing is uploaded.
      </p>
    </div>
  );
}

const SEV_COLOR: Partial<Record<Severity, string>> = { warn: 'var(--amber)', bad: 'var(--red)', good: 'var(--green)', tip: 'var(--accent)' };

export function AlertsPop() {
  const { state } = useFDIE();
  const { range, closePop } = useDesk();
  const items = useMemo(() => {
    const list = viewByRange(state, range);
    return insights(compute(list, state.budget), list).filter((i) => i.sev !== 'info').slice(0, 4);
  }, [state, range]);
  return (
    <div>
      <h4>Alerts</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
        {items.length ? (
          items.map((i) => (
            <a key={i.id} href="#insights" onClick={closePop} className="notif" style={{ display: 'flex', gap: 10, padding: '9px 8px', borderRadius: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: SEV_COLOR[i.sev] }} />
              <span>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{i.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <Segments segs={i.msg} />
                </div>
              </span>
            </a>
          ))
        ) : (
          <p>Nothing needs your attention.</p>
        )}
      </div>
      <a href="#insights" className="card-link" style={{ marginTop: 8 }} onClick={closePop}>
        All insights <Icon name="chevR" size={14} />
      </a>
    </div>
  );
}

export function ConfirmDeletePop({ e }: { e: Expense }) {
  const { closePop, deleteExpense } = useDesk();
  return (
    <div>
      <h4>Delete this expense?</h4>
      <p>
        <span className="pop-note">{e.note || e.category}</span>
        {`${fmtPlain(e.amount)} · ${e.category} · ${relDate(e.date)}`}
      </p>
      <div className="pop-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={closePop}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            closePop();
            deleteExpense(e.id);
          }}
        >
          <Icon name="trash" size={14} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
