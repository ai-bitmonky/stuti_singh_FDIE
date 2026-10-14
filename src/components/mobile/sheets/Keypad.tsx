'use client';
/** Custom rupee keypad (no system keyboard). Keys fire on pointerdown for instant response. */
import { forwardRef } from 'react';
import { Icon } from '../icons';

export type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'del';
const KEYS: Key[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

/** Apply one key to the amount string: max 7 integer digits, 2 decimals. Returns null if rejected. */
export function applyKey(a: string, k: Key): string | null {
  if (k === 'del') return a.slice(0, -1);
  if (k === '.') return a.includes('.') ? a : (a || '0') + '.';
  const [i, d] = a.split('.');
  if (d != null) return d.length < 2 ? a + k : a;
  if (a === '0') return k;
  if ((i || '').length < 7) return a + k;
  return null;
}

/** Briefly show the pressed state on a key (also used for hardware-keyboard input). */
export function flashKey(root: HTMLElement | null, k: string): void {
  const b = root?.querySelector(`[data-k="${k === 'Backspace' ? 'del' : k}"]`);
  if (!b) return;
  b.classList.add('hit');
  setTimeout(() => b.classList.remove('hit'), 90);
}

const Keypad = forwardRef<HTMLDivElement, { onKey: (k: Key) => void }>(function Keypad({ onKey }, ref) {
  return (
    <div className="keypad" ref={ref}>
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={'key' + (k === '.' || k === 'del' ? ' fn' : '')}
          data-k={k}
          aria-label={k === 'del' ? 'Delete digit' : k === '.' ? 'Decimal point' : k}
          onPointerDown={(e) => {
            if (e.button > 0) return;
            e.preventDefault();
            onKey(k);
            const b = e.currentTarget;
            b.classList.add('hit');
            setTimeout(() => b.classList.remove('hit'), 90);
          }}
          onClick={(e) => {
            // keyboard activation (Enter/Space) produces a click with detail 0
            if (e.detail === 0) onKey(k);
          }}
        >
          {k === 'del' ? <Icon name="backspace" size={26} /> : k}
        </button>
      ))}
    </div>
  );
});

export default Keypad;
