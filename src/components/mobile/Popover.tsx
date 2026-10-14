'use client';
/** Long-press context menu: blurred backdrop, lifted row clone, spring-in menu. */
import { useEffect, useState } from 'react';
import type { Expense } from '@/lib/engine';
import { dev, type DevRect } from './device';
import { Icon } from './icons';
import { RowVisual } from './screens/SwipeRow';

export interface PopState { e: Expense; rect: DevRect; n: number }

export default function Popover({ pop, onClose, onEdit, onDelete }: {
  pop: PopState | null;
  onClose: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState<PopState | null>(null);

  useEffect(() => {
    if (pop) {
      setShown(pop);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setOn(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setOn(false);
    const t = setTimeout(() => setShown(null), 230);
    return () => clearTimeout(t);
  }, [pop]);

  if (!shown) return <div className="pop-layer" />;
  const r = shown.rect;
  const deviceW = dev.el?.offsetWidth ?? 393, deviceH = dev.el?.offsetHeight ?? 852;
  const below = r.y + r.h + 10 + 96 < deviceH - 100;
  const act = (fn: () => void) => () => { onClose(); fn(); };
  return (
    <div className={'pop-layer show' + (on ? ' on' : '')}>
      <div className="pop-back" onClick={onClose} />
      <div className="pop-row" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
        <RowVisual e={shown.e} />
      </div>
      <div
        className="pop-menu"
        role="menu"
        style={{
          left: Math.min(r.x + 6, deviceW - 236 - 12),
          top: below ? r.y + r.h + 10 : r.y - 10 - 92,
          transformOrigin: below ? 'top left' : 'bottom left',
        }}
      >
        <button type="button" role="menuitem" className="pop-item" onClick={act(() => setTimeout(() => onEdit(shown.e), 120))}>
          <span>Edit</span><Icon name="pencil" size={20} />
        </button>
        <button type="button" role="menuitem" className="pop-item danger" onClick={act(() => setTimeout(() => onDelete(shown.e), 200))}>
          <span>Delete</span><Icon name="trash" size={20} />
        </button>
      </div>
    </div>
  );
}
