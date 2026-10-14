'use client';
/** Profile & settings: name, monthly budget, OOP link, CSV export, reset / clear (two-tap confirm), view switch. */
import { useEffect, useRef, useState } from 'react';
import { makeSnapshot } from '@/lib/engine';
import { fmtN, initials } from '@/lib/format';
import { GENERATORS, downloadText } from '@/lib/reports';
import { useFDIE } from '@/lib/store';
import { useM } from '../ctx';
import { haptic } from '../device';
import { Icon, type IconName } from '../icons';
import { Privacy } from '../ui';
import Sheet from './Sheet';

/** A destructive row that needs a second tap within 3s. */
function TwoStep({ icon, bg, label, confirm, onConfirm }: { icon: IconName; bg: string; label: string; confirm: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <button
      type="button"
      className={'cell has-ic pressable' + (armed ? ' confirm' : '')}
      style={{ width: '100%' }}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          haptic(8);
          t.current = setTimeout(() => setArmed(false), 3000);
          return;
        }
        clearTimeout(t.current);
        setArmed(false);
        onConfirm();
      }}
    >
      <span className="ic" style={{ background: bg }}><Icon name={icon} size={18} sw={2} /></span>
      <span className="lbl" style={{ color: 'var(--red)' }}>{armed ? confirm : label}</span>
    </button>
  );
}

export default function ProfileSheet({ open, nonce, onClose, onDesktop }: { open: boolean; nonce: number; onClose: () => void; onDesktop: () => void }) {
  const m = useM();
  const { state, setUser, setBudget, reset, clearAll, setExpenses } = useFDIE();
  const [name, setName] = useState(state.user);
  const [bud, setBud] = useState(String(state.budget));
  const [err, setErr] = useState('');
  const [seen, setSeen] = useState(nonce);
  if (seen !== nonce) {
    setSeen(nonce);
    setName(state.user); setBud(String(state.budget)); setErr('');
  }

  const commitBudget = () => {
    const v = Number(bud);
    if (v === state.budget) return;
    if (!(v > 0) || v > 10_000_000) {
      setErr('Budget must be between ₹1 and ₹1,00,00,000');
      setBud(String(state.budget));
      return;
    }
    setErr('');
    setBudget(v);
    m.toast(`Budget set to ₹${fmtN(v)}`, { raise: true });
  };

  return (
    <Sheet
      open={open}
      label="Profile and settings"
      title="Profile"
      right={<button type="button" className="sh-btn r" onClick={onClose}>Done</button>}
      onClose={onClose}
    >
      <div className="prof-head">
        <div className="avatar">{initials(state.user)}</div>
        <div className="prof-name">{state.user}</div>
        <div className="prof-sub">Bengaluru · INR · Local profile</div>
      </div>
      <div className="sec-h" style={{ paddingTop: 4 }}>Profile</div>
      <div className="inset">
        <label className="cell">
          <span className="lbl" style={{ flex: 'none' }}>Name</span>
          <input
            className="field-in" maxLength={30} autoComplete="off" aria-label="Name" value={name}
            onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setUser(e.target.value); }}
          />
        </label>
        <label className="cell">
          <span className="lbl" style={{ flex: 'none' }}>Monthly budget (₹)</span>
          <input
            className="field-in" inputMode="numeric" autoComplete="off" aria-label="Monthly budget" value={bud}
            onChange={(e) => setBud(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitBudget}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </label>
      </div>
      <div className="err" role="alert">{err}</div>
      <div className="sec-h">Data</div>
      <div className="inset">
        <button type="button" className="cell has-ic pressable" style={{ width: '100%' }} onClick={() => { onClose(); setTimeout(() => m.openOOP(), 260); }}>
          <span className="ic" style={{ background: 'linear-gradient(145deg,#FF7A1A,#A78BFA)' }}><Icon name="code" size={18} sw={2} /></span>
          <span className="lbl">OOP Concepts</span>
          <Icon name="chevR" size={18} sw={2.2} className="chev" />
        </button>
        <button
          type="button" className="cell has-ic pressable" style={{ width: '100%' }}
          onClick={() => {
            const g = GENERATORS.csv, s = makeSnapshot(state, 'all');
            downloadText(g.generate(s), g.filename(s), g.mime);
            haptic(10);
            m.toast('CSV exported', { icon: 'download', raise: true });
          }}
        >
          <span className="ic" style={{ background: '#34D399' }}><Icon name="download" size={18} sw={2} /></span>
          <span className="lbl">Export CSV</span>
          <span className="val">{state.expenses.length} rows</span>
        </button>
        <TwoStep
          icon="refresh" bg="#FB7185" label="Reset demo data" confirm="Tap again to reset"
          onConfirm={() => { reset(); onClose(); setTimeout(() => m.toast('Demo data restored'), 250); }}
        />
        <TwoStep
          icon="trash" bg="#5F6879" label="Clear all expenses" confirm="Tap again to clear"
          onConfirm={() => {
            const prev = clearAll();
            onClose();
            setTimeout(() => m.toast('All expenses cleared', { icon: 'trash', tone: 'bad', action: 'Undo', onAction: () => setExpenses(prev) }), 250);
          }}
        />
      </div>
      <div className="sec-h">View</div>
      <div className="inset">
        <button type="button" className="cell has-ic pressable" style={{ width: '100%' }} onClick={() => { onClose(); setTimeout(onDesktop, 200); }}>
          <span className="ic" style={{ background: '#60A5FA' }}><Icon name="monitor" size={18} sw={2} /></span>
          <span className="lbl">Switch to desktop view</span>
          <Icon name="chevR" size={18} sw={2.2} className="chev" />
        </button>
      </div>
      <Privacy style={{ marginTop: 14 }}>
        Data stays in this browser (localStorage key <b style={{ fontWeight: 600, color: 'var(--text-2)' }}>fdie.v1</b>). Nothing is uploaded. Heuristics, not financial advice.
      </Privacy>
      <div className="foot" style={{ textAlign: 'center', padding: '18px 0 8px' }}>FDIE · Financial Decision Engine · OOP version</div>
    </Sheet>
  );
}
