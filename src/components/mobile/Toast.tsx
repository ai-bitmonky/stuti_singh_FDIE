'use client';
import type { ToastOpts } from './ctx';
import { Icon } from './icons';

export interface ToastState extends ToastOpts {
  msg: string;
  show: boolean;
  /** Bumps on every toast so React re-keys the action button. */
  n: number;
}

const TONE: Record<string, React.CSSProperties | undefined> = {
  bad: { background: 'rgba(251,113,133,.18)', color: 'var(--red)' },
  info: { background: 'rgba(96,165,250,.18)', color: 'var(--blue)' },
};

/** Frosted snackbar; sits above the tab bar, or lower when a sheet / pushed screen is up. */
export default function Toast({ t, raise, onAction }: { t: ToastState; raise: boolean; onAction: () => void }) {
  return (
    <div className={'toast' + (t.show ? ' show' : '') + (raise ? ' raise' : '')} role="status" aria-live="polite">
      <div className="t-ic" style={t.tone ? TONE[t.tone] : undefined}>
        <Icon name={t.icon ?? 'check'} size={16} sw={2.6} />
      </div>
      <div className="t-msg">{t.msg}</div>
      {t.action && (
        <button key={t.n} type="button" className="t-act pressable" onClick={onAction}>
          {t.action}
        </button>
      )}
    </div>
  );
}
