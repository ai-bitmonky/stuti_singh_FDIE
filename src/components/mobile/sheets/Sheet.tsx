'use client';
/**
 * Generic iOS bottom sheet: grabber + header, spring open, drag-to-dismiss
 * with velocity snap (see useSheetDrag). The scrim, app scale-down and
 * rounded corners are driven from MobileApp via `--sp` and `.sheet-open`.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useSheetDrag } from '../hooks/useSheetDrag';

interface Props {
  open: boolean;
  label: string;
  title: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  half?: boolean;
  bodyClass?: string;
  onClose: () => void;
  /** Extra drag handles inside the body (e.g. the amount display). */
  handles?: RefObject<HTMLElement>[];
  children: ReactNode;
}

export default function Sheet({ open, label, title, left, right, half, bodyClass, onClose, handles = [], children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const grab = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // open → closed: keep it visible while it slides away
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setClosing(true);
  }
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setClosing(false), 400);
    return () => clearTimeout(t);
  }, [closing]);
  useEffect(() => {
    const sh = ref.current;
    if (!sh) return;
    sh.style.transform = '';
    if (!open && document.activeElement instanceof HTMLElement && sh.contains(document.activeElement)) document.activeElement.blur();
  }, [open]);

  useSheetDrag(ref, [grab, ...handles], open, onClose);

  const cls = 'sheet' + (half ? ' half' : '') + (open ? ' open' : '') + (closing && !open ? ' closing' : '');
  return (
    <section ref={ref} className={cls} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open}>
      <div className="sheet-grab" ref={grab}>
        <div className="handle" />
        <div className="sheet-head">
          {left ?? <span />}
          <div className="sh-title">{title}</div>
          {right ?? <span />}
        </div>
      </div>
      <div className={'sheet-body' + (bodyClass ? ' ' + bodyClass : '')}>{children}</div>
    </section>
  );
}
