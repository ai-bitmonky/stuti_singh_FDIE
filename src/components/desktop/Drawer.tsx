'use client';
/** 440px slide-over for quick add / edit, with live impact and a focus trap. */
import { useMemo, useState, type KeyboardEvent } from 'react';
import { relDate, todayISO } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useDesk } from './ctx';
import { ExpenseForm, type RawForm } from './ExpenseForm';
import { DrawerImpact, impactModel } from './Impact';
import { Icon } from './ui/Icon';

export interface DrawerState {
  open: boolean;
  editId?: string;
  seq: number;
}

function DrawerBody({ editId, seq }: { editId?: string; seq: number }) {
  const { state } = useFDIE();
  const { closeDrawer, confirmDelete } = useDesk();
  // freeze the expense being edited at open time (the form owns the draft)
  const [exp] = useState(() => (editId ? state.expenses.find((e) => e.id === editId) ?? null : null));
  const [raw, setRaw] = useState<RawForm>({ amount: '', category: null, date: todayISO(), note: '' });
  const m = useMemo(() => impactModel(state, raw, exp?.id), [state, raw, exp]);
  return (
    <>
      <div className="drawer-head">
        <div>
          <h3 id="dk-drawerTitle">{exp ? 'Edit expense' : 'New expense'}</h3>
          <div className="card-sub">{exp ? `Added ${relDate(exp.date)} · changes recalculate everything` : 'Press N anywhere to open · Esc to close'}</div>
        </div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={closeDrawer}>
          <Icon name="x" size={18} />
        </button>
      </div>
      <div className="drawer-body">
        <div className="label" style={{ marginBottom: 10 }}>
          Live impact
        </div>
        <DrawerImpact m={m} />
        <div style={{ height: 22 }} />
        <ExpenseForm
          key={seq}
          mode={exp ? 'edit' : 'add'}
          expense={exp}
          compact
          autoFocus
          onChange={setRaw}
          onSaved={closeDrawer}
          onDelete={(anchor) => exp && confirmDelete(anchor, exp)}
        />
      </div>
    </>
  );
}

export function Drawer({ st, onClose }: { st: DrawerState; onClose: () => void }) {
  const trap = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return;
    const f = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button,input,[href]')).filter(
      (x) => !(x as HTMLButtonElement).disabled && x.offsetParent,
    );
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault();
      f[f.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
      e.preventDefault();
      f[0].focus();
    }
  };
  return (
    <>
      <div className={`scrim${st.open ? ' open' : ''}`} onClick={onClose} />
      <aside
        className={`drawer${st.open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dk-drawerTitle"
        aria-hidden={!st.open}
        onKeyDown={trap}
      >
        {st.seq > 0 && <DrawerBody key={st.seq} editId={st.editId} seq={st.seq} />}
      </aside>
    </>
  );
}
