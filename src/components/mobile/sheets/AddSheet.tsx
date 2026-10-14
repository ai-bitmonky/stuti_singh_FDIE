'use client';
/** "New expense" sheet: big amount + live budget impact, category chips, date chips, note, keypad. */
import { useEffect, useRef, useState } from 'react';
import { CAT, CATEGORIES, compute, validate, type Category, type FieldErrors } from '@/lib/engine';
import { addDays, fmtK, fmtN, iso, relDate, todayD, todayISO } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useM } from '../ctx';
import { haptic, replayClass } from '../device';
import { Icon } from '../icons';
import Keypad, { applyKey, flashKey, type Key } from './Keypad';
import Sheet from './Sheet';

type Mode = '0' | '1' | 'pick';

export default function AddSheet({ open, nonce, onClose }: { open: boolean; nonce: number; onClose: () => void }) {
  const m = useM();
  const { add } = useFDIE();
  const [amt, setAmt] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const [date, setDate] = useState(todayISO);
  const [mode, setMode] = useState<Mode>('0');
  const [note, setNote] = useState('');
  const [errs, setErrs] = useState<FieldErrors>({});
  const [seen, setSeen] = useState(nonce);
  const amtWrap = useRef<HTMLDivElement>(null);
  const disp = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const noteIn = useRef<HTMLInputElement>(null);
  const dateIn = useRef<HTMLInputElement>(null);

  // fresh form every time the sheet opens
  if (seen !== nonce) {
    setSeen(nonce);
    setAmt(''); setCat(null); setDate(todayISO()); setMode('0'); setNote(''); setErrs({});
  }
  useEffect(() => { if (open && chips.current) chips.current.scrollLeft = 0; }, [open, nonce]);

  const key = (k: Key) => {
    const next = applyKey(amt, k);
    if (next == null) { replayClass(disp.current, 'shake'); haptic([8, 30, 8]); return; }
    haptic(4);
    setAmt(next);
    setErrs((e) => ({ ...e, amount: undefined }));
  };

  const save = () => {
    const r = validate({ amount: amt, category: cat, date, note });
    setErrs(r.errors);
    if (!r.ok || !r.value) {
      replayClass(r.errors.amount ? disp.current : r.errors.category ? chips.current : saveBtn.current, 'shake');
      haptic([10, 40, 10]);
      return;
    }
    const e = add(r.value);
    onClose();
    haptic(10);
    setTimeout(() => m.toast(`Added ₹${fmtN(e.amount)} to ${e.category}`), 260);
  };

  // hardware keyboard while the sheet is up
  const live = useRef({ key, save, onClose });
  live.current = { key, save, onClose };
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => {
      const a = document.activeElement;
      if (a === noteIn.current || a === dateIn.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); live.current.key(e.key as Key); flashKey(pad.current, e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); live.current.key('del'); flashKey(pad.current, 'del'); }
      else if (e.key === 'Enter') { e.preventDefault(); live.current.save(); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [open]);

  const [ip, dp] = amt.split('.');
  const shownAmt = amt ? (ip ? fmtN(Number(ip)) : '0') + (dp != null ? '.' + dp : '') : '0';
  const v = Number(amt);
  let impact: React.ReactNode = null;
  if (v > 0) {
    const c1 = compute([...m.state.expenses, { id: '_', date, category: cat ?? 'Food', amount: v, note: '' }], m.state.budget);
    const tone = c1.diff >= 0 ? 'var(--green)' : 'var(--red)';
    impact = (
      <>Monthly est. <b>₹{fmtK(m.c.monthlyEstimate)}</b> → <b style={{ color: tone }}>₹{fmtK(c1.monthlyEstimate)}</b> · <span style={{ color: tone }}>{c1.status}</span></>
    );
  }
  const pickDay = (d: '0' | '1') => {
    setMode(d);
    setDate(iso(addDays(todayD(), -Number(d))));
    setErrs((e) => ({ ...e, date: undefined }));
    haptic(5);
  };

  return (
    <Sheet
      open={open}
      label="New expense"
      title="New expense"
      left={<button type="button" className="sh-btn" onClick={onClose}>Cancel</button>}
      bodyClass="add-body"
      onClose={onClose}
      handles={[amtWrap]}
    >
      <div className="amt-wrap" ref={amtWrap}>
        <div className={'amt-disp' + (amt ? '' : ' zero')} ref={disp} aria-live="polite" aria-label={`Amount ₹${shownAmt}`}>
          <span className="cur">₹</span><span className="amt-txt">{shownAmt}</span><i className="caret" />
        </div>
        <div className="err" role="alert">{errs.amount}</div>
        <div className="amt-impact">{impact}</div>
      </div>
      <div className="add-sec">
        <div className="chips" ref={chips}>
          {CATEGORIES.map((k) => (
            <button
              key={k}
              type="button"
              className={'chip pressable' + (k === cat ? ' on' : '')}
              style={{ ['--c' as string]: CAT[k].color }}
              aria-pressed={k === cat}
              onClick={() => { setCat(k); setErrs((e) => ({ ...e, category: undefined })); haptic(5); }}
            >
              <span className="e">{CAT[k].glyph}</span>{k}
            </button>
          ))}
        </div>
        <div className="err" role="alert">{errs.category}</div>
      </div>
      <div className="add-sec">
        <div className="date-row">
          <button type="button" className={'dchip pressable' + (mode === '0' ? ' on' : '')} onClick={() => pickDay('0')}>Today</button>
          <button type="button" className={'dchip pressable' + (mode === '1' ? ' on' : '')} onClick={() => pickDay('1')}>Yesterday</button>
          <label className={'dchip pressable' + (mode === 'pick' ? ' on' : '')}>
            <Icon name="calendar" size={17} sw={1.9} />
            <span>{mode === 'pick' ? relDate(date) : 'Pick'}</span>
            <input
              ref={dateIn}
              type="date"
              aria-label="Pick a date"
              max={todayISO()}
              value={mode === 'pick' ? date : ''}
              onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* unsupported */ } }}
              onChange={(e) => {
                if (!e.target.value) return;
                setDate(e.target.value); setMode('pick'); setErrs((x) => ({ ...x, date: undefined }));
              }}
            />
          </label>
        </div>
        <div className="err" role="alert">{errs.date}</div>
      </div>
      <div className="add-sec">
        <div className="note-row">
          <input
            ref={noteIn}
            className="note-in"
            maxLength={80}
            placeholder="Note — e.g. Swiggy dinner"
            autoComplete="off"
            enterKeyHint="done"
            aria-label="Note"
            value={note}
            onChange={(e) => { setNote(e.target.value); setErrs((x) => ({ ...x, note: undefined })); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
          <span className={'note-ct' + (note.length >= 70 ? ' lim' : '')}>{note.length}/80</span>
        </div>
        <div className="err" role="alert">{errs.note}</div>
      </div>
      <Keypad ref={pad} onKey={key} />
      <div className="add-cta">
        <button ref={saveBtn} type="button" className="btn-primary pressable" onClick={save}>Add expense</button>
      </div>
    </Sheet>
  );
}
