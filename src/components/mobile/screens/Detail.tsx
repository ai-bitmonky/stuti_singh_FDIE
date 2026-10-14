'use client';
/** Transaction detail (pushed): header, editable inset fields, category chips, save / delete. */
import { useRef, useState } from 'react';
import { CAT, CATEGORIES, validate, type Category, type Expense } from '@/lib/engine';
import { fmtTime, longDate, relDate, todayISO } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useM } from '../ctx';
import { haptic, replayClass } from '../device';
import { Icon } from '../icons';
import { Glyph, Money } from '../ui';

export default function Detail({ e }: { e: Expense }) {
  const m = useM();
  const { update } = useFDIE();
  const [amt, setAmt] = useState(String(e.amount));
  const [date, setDate] = useState(e.date);
  const [note, setNote] = useState(e.note);
  const [cat, setCat] = useState<Category>(e.category);
  const [err, setErr] = useState('');
  const saveBtn = useRef<HTMLButtonElement>(null);
  const dirty = amt !== String(e.amount) || date !== e.date || note !== e.note || cat !== e.category;

  const save = () => {
    const r = validate({ amount: amt, category: cat, date, note });
    if (!r.ok || !r.value) {
      setErr(Object.values(r.errors)[0] ?? '');
      replayClass(saveBtn.current, 'shake');
      haptic([10, 40, 10]);
      return;
    }
    update(e.id, r.value);
    haptic(10);
    m.pop();
    m.toast('Changes saved');
  };

  return (
    <>
      <div className="dt-head">
        <Glyph cat={e.category} />
        <div className="dt-amt"><Money v={e.amount} /></div>
        <div className="dt-t">{e.note || e.category}</div>
        <div className="dt-s">{e.category} · {relDate(e.date)}</div>
      </div>
      <div className="sec-h" style={{ paddingTop: 4 }}>Edit details</div>
      <div className="inset">
        <label className="cell">
          <span className="lbl">Amount (₹)</span>
          <input className="field-in" inputMode="decimal" autoComplete="off" aria-label="Amount" value={amt} onChange={(ev) => { setAmt(ev.target.value); setErr(''); }} />
        </label>
        <label className="cell">
          <span className="lbl">Date</span>
          <input className="field-in" type="date" aria-label="Date" max={todayISO()} value={date} onChange={(ev) => { setDate(ev.target.value); setErr(''); }} />
        </label>
        <label className="cell">
          <span className="lbl" style={{ flex: 'none' }}>Note</span>
          <input className="field-in" maxLength={80} placeholder="Optional" aria-label="Note" value={note} onChange={(ev) => { setNote(ev.target.value); setErr(''); }} />
        </label>
      </div>
      <div className="err" role="alert">{err}</div>
      <div className="sec-h">Category</div>
      <div className="chips">
        {CATEGORIES.map((k) => (
          <button
            key={k}
            type="button"
            className={'chip pressable' + (k === cat ? ' on' : '')}
            style={{ ['--c' as string]: CAT[k].color }}
            aria-pressed={k === cat}
            onClick={() => { setCat(k); haptic(5); setErr(''); }}
          >
            <span className="e">{CAT[k].glyph}</span>{k}
          </button>
        ))}
      </div>
      <div className="dt-actions">
        <button ref={saveBtn} type="button" className="btn-primary pressable" disabled={!dirty} onClick={save}>
          <Icon name="check" size={20} sw={2.4} />Save changes
        </button>
        <button type="button" className="btn-plain btn-danger pressable" onClick={() => { m.pop(); setTimeout(() => m.deleteWithUndo(e.id), 300); }}>
          <Icon name="trash" size={20} />Delete expense
        </button>
      </div>
      <div className="foot" style={{ textAlign: 'center', paddingTop: 16 }}>
        Logged {longDate(e.date)}{e.time ? ' at ' + fmtTime(e.time) : ''}
      </div>
    </>
  );
}
