'use client';
/** Add / edit form shared by the Add view and the slide-over drawer. */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { CAT, CATEGORIES, validate, type Category, type Expense, type FieldErrors } from '@/lib/engine';
import { addDays, fmtN, fmtPlain, iso, todayD, todayISO } from '@/lib/format';
import { useFDIE } from '@/lib/store';
import { useDesk } from './ctx';
import { Icon } from './ui/Icon';
import { catStyle } from './ui/util';

export interface RawForm {
  amount: string;
  category: Category | null;
  date: string;
  note: string;
}

export interface ExpenseFormProps {
  mode?: 'add' | 'edit';
  expense?: Expense | null;
  compact?: boolean;
  autoFocus?: boolean;
  onChange?: (raw: RawForm) => void;
  onSaved?: (e: Expense) => void;
  onDelete?: (anchor: HTMLElement) => void;
}

const fmtAmt = (e: Expense) => (Number.isInteger(e.amount) ? fmtN(e.amount) : String(e.amount));
const ARROWS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };

function Err({ id, msg }: { id?: string; msg?: string }) {
  return (
    <div className="err-msg" id={id} role={id ? 'alert' : undefined}>
      <Icon name="alert" size={14} />
      <span>{msg || ''}</span>
    </div>
  );
}

export function ExpenseForm({ mode = 'add', expense = null, compact = false, autoFocus, onChange, onSaved, onDelete }: ExpenseFormProps) {
  const p = useId();
  const { add, update } = useFDIE();
  const { toast } = useDesk();
  const today = todayISO(), yday = iso(addDays(todayD(), -1));
  const [amount, setAmount] = useState(expense ? fmtAmt(expense) : '');
  const [category, setCategory] = useState<Category | null>(expense ? expense.category : null);
  const [date, setDate] = useState(expense ? expense.date : today);
  const [note, setNote] = useState(expense ? expense.note || '' : '');
  const [touched, setTouched] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  const raw: RawForm = { amount, category, date, note };
  const errors: FieldErrors = touched ? validate(raw).errors : {};

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.({ amount, category, date, note });
  }, [amount, category, date, note]);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => amtRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const reset = () => {
    setAmount('');
    setCategory(null);
    setDate(todayISO());
    setNote('');
    setTouched(false);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    const v = validate(raw);
    if (!v.ok || !v.value) {
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLElement>('.field.err');
        first?.querySelector<HTMLElement>('input,button')?.focus();
        first?.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
          { duration: 320, easing: 'ease-out' },
        );
      });
      return;
    }
    let saved: Expense | null;
    if (mode === 'edit' && expense) {
      saved = update(expense.id, v.value);
      if (saved) toast(`Saved changes · ${fmtPlain(saved.amount)} in ${saved.category}`);
    } else {
      saved = add(v.value);
      toast(`Added ${fmtPlain(saved.amount)} to ${saved.category}`);
      reset();
    }
    if (saved) onSaved?.(saved);
  };

  const onGridKey = (e: KeyboardEvent) => {
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    const i = Math.max(0, category ? CATEGORIES.indexOf(category) : 0);
    const k = CATEGORIES[(i + d + 6) % 6];
    setCategory(k);
    formRef.current?.querySelector<HTMLElement>(`[data-cat="${k}"]`)?.focus();
  };

  const n = note.length;
  return (
    <form ref={formRef} className="form" noValidate autoComplete="off" onSubmit={submit}>
      <div className={`field${errors.amount ? ' err' : ''}`}>
        <div className="field-row">
          <label className="field-label" htmlFor={`${p}-amt`}>
            Amount
          </label>
          <span className="counter">up to ₹10,00,000</span>
        </div>
        <div className="amount-field">
          <span className="sym">₹</span>
          <input
            ref={amtRef}
            id={`${p}-amt`}
            name="amount"
            inputMode="decimal"
            placeholder="0"
            aria-describedby={`${p}-amt-e`}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            onFocus={() => setAmount((a) => a.replace(/,/g, ''))}
            onBlur={() => {
              const v = amount.replace(/,/g, '');
              if (/^\d+$/.test(v) && v.length < 9) setAmount(fmtN(Number(v)));
            }}
          />
          {!compact && <span className="af-hint">INR</span>}
        </div>
        <Err id={`${p}-amt-e`} msg={errors.amount} />
      </div>

      <div className={`field${errors.category ? ' err' : ''}`}>
        <span className="field-label" id={`${p}-cat-l`}>
          Category
        </span>
        <div className="cat-grid" role="radiogroup" aria-labelledby={`${p}-cat-l`} onKeyDown={onGridKey}>
          {CATEGORIES.map((k) => (
            <button
              key={k}
              type="button"
              className={`cat-tile${category === k ? ' sel' : ''}`}
              role="radio"
              aria-checked={category === k}
              data-cat={k}
              style={catStyle(k)}
              onClick={() => setCategory(k)}
            >
              <span className="glyph" aria-hidden="true">
                {CAT[k].glyph}
              </span>
              {k}
              <span className="tick">
                <Icon name="check" size={11} />
              </span>
            </button>
          ))}
        </div>
        <Err msg={errors.category} />
      </div>

      <div className={`field${errors.date ? ' err' : ''}`}>
        <label className="field-label" htmlFor={`${p}-date`}>
          Date
        </label>
        <div className="date-row">
          <input className="input" type="date" id={`${p}-date`} name="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="quick">
            <button type="button" className={date === today ? 'on' : ''} onClick={() => setDate(today)}>
              Today
            </button>
            <button type="button" className={date === yday ? 'on' : ''} onClick={() => setDate(yday)}>
              Yesterday
            </button>
          </div>
        </div>
        <Err msg={errors.date} />
      </div>

      <div className={`field${errors.note ? ' err' : ''}`}>
        <div className="field-row">
          <label className="field-label" htmlFor={`${p}-note`}>
            Note{' '}
            <span className="faint" style={{ fontWeight: 500 }}>
              · merchant or detail
            </span>
          </label>
          <span className={`counter${n > 80 ? ' over' : ''}`}>{n}/80</span>
        </div>
        <input className="input" id={`${p}-note`} name="note" placeholder="e.g. Swiggy — dinner with friends" value={note} onChange={(e) => setNote(e.target.value)} />
        <Err msg={errors.note} />
      </div>

      <div className="form-actions">
        {mode === 'edit' ? (
          <button type="button" className="btn btn-danger" onClick={(e) => onDelete?.(e.currentTarget)}>
            <Icon name="trash" size={15} />
            Delete
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset();
              amtRef.current?.focus();
            }}
          >
            Clear
          </button>
        )}
        <span className="grow" />
        <button type="submit" className={`btn btn-primary${compact ? '' : ' btn-lg'}`}>
          <Icon name={mode === 'edit' ? 'check' : 'plus'} size={16} />
          {mode === 'edit' ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
