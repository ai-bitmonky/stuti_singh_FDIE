'use client';
/** PLACEHOLDER — to be replaced by the full desktop app. */
import { useMemo } from 'react';
import type { AppProps } from '../AppSwitch';
import { compute } from '@/lib/engine';
import { fmtPlain } from '@/lib/format';
import { useFDIE } from '@/lib/store';

export default function DesktopApp({ onSwitch }: AppProps) {
  const { state } = useFDIE();
  const c = useMemo(() => compute(state.expenses, state.budget), [state]);
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 28, maxWidth: 360, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Desktop app · coming soon</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, margin: '12px 0' }}>{fmtPlain(c.monthlyEstimate)}</h1>
        <p style={{ color: 'var(--text-2)' }}>
          {state.user} · {c.count} expenses · {c.status}
        </p>
        <button type="button" onClick={() => onSwitch('mobile')} style={{ marginTop: 18, padding: '8px 14px', borderRadius: 99, border: '1px solid var(--line-2)', background: 'var(--surface-2)' }}>
          Switch to mobile
        </button>
      </div>
    </main>
  );
}
