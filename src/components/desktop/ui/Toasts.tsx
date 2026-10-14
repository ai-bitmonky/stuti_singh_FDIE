'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';

export type ToastType = 'success' | 'info' | 'error';
export interface ToastOpts {
  type?: ToastType;
  action?: { label: string; fn: () => void };
  duration?: number;
}
export interface ToastHandle {
  push: (msg: string, opts?: ToastOpts) => void;
}
interface Item extends Required<Pick<ToastOpts, 'type' | 'duration'>> {
  id: number;
  msg: string;
  action?: ToastOpts['action'];
  out: boolean;
}

const IC: Record<ToastType, IconName> = { success: 'check', info: 'info', error: 'alert' };

function ToastView({ t, onClose }: { t: Item; onClose: (id: number) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const close = useCallback(() => {
    clearTimeout(timer.current);
    onClose(t.id);
  }, [onClose, t.id]);
  useEffect(() => {
    timer.current = setTimeout(close, t.duration);
    return () => clearTimeout(timer.current);
  }, [close, t.duration]);
  return (
    <div
      className={`toast ${t.type}${t.out ? ' out' : ''}`}
      role="status"
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(close, 2000);
      }}
    >
      <span className="t-ic">
        <Icon name={IC[t.type]} size={16} />
      </span>
      <span className="t-msg">{t.msg}</span>
      {t.action && (
        <button
          type="button"
          className="t-act"
          onClick={() => {
            t.action?.fn();
            close();
          }}
        >
          {t.action.label}
        </button>
      )}
      <button type="button" className="icon-btn sm" aria-label="Dismiss" onClick={close}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

/** Bottom-right toast stack (max 3 visible). */
export const Toasts = forwardRef<ToastHandle>(function Toasts(_, ref) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, out: true } : x)));
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 240);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      push(msg, { type = 'success', action, duration = 4200 } = {}) {
        const id = ++seq.current;
        setItems((xs) => {
          const next = [...xs, { id, msg, type, action, duration, out: false }];
          const live = next.filter((x) => !x.out);
          if (live.length > 3) {
            const first = live[0].id;
            setTimeout(() => setItems((ys) => ys.filter((y) => y.id !== first)), 240);
            return next.map((x) => (x.id === first ? { ...x, out: true } : x));
          }
          return next;
        });
      },
    }),
    [],
  );

  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <ToastView key={t.id} t={t} onClose={dismiss} />
      ))}
    </div>
  );
});
