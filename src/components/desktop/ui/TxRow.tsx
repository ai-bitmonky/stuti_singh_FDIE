'use client';
import { CAT, type Expense } from '@/lib/engine';
import { relDate } from '@/lib/format';
import { useDesk } from '../ctx';
import { Icon } from './Icon';
import { Money } from './Money';
import { catStyle } from './util';

/** Hover-revealed edit / delete buttons for an expense row. */
export function RowActions({ e }: { e: Expense }) {
  const { openDrawer, confirmDelete } = useDesk();
  return (
    <div className="row-actions">
      <button type="button" className="icon-btn sm" aria-label="Edit expense" title="Edit" onClick={() => openDrawer(e.id)}>
        <Icon name="pencil" size={15} />
      </button>
      <button type="button" className="icon-btn sm danger" aria-label="Delete expense" title="Delete" onClick={(ev) => confirmDelete(ev.currentTarget, e)}>
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}

/** Overview transactions table row. */
export function TxRow({ e }: { e: Expense }) {
  const label = e.note || e.category;
  return (
    <tr>
      <td>
        <div className="tx-main">
          <span className="glyph" style={catStyle(e.category)} aria-hidden="true">
            {CAT[e.category].glyph}
          </span>
          <div className="tx-text">
            <div className="tx-note" title={label}>
              {label}
            </div>
            <span className="chip" style={catStyle(e.category)}>
              {e.category}
            </span>
          </div>
        </div>
      </td>
      <td className="tx-date">{relDate(e.date)}</td>
      <td className="num tx-amt">
        <Money n={e.amount} cls="cur-sm" />
      </td>
      <td className="tx-act">
        <RowActions e={e} />
      </td>
    </tr>
  );
}
