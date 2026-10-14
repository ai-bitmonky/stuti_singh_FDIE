import type { Status } from '@/lib/engine';
import { Icon } from './Icon';

/** Green "On track" / red "Over budget" pill. `mini` is the compact impact-panel variant. */
export function StatusPill({ status, mini }: { status: Status; mini?: boolean }) {
  const ok = status === 'On track';
  return (
    <span className={`pill ${ok ? 'good' : 'bad'}`} style={mini ? { height: 22, fontSize: 11.5 } : undefined}>
      <Icon name={ok ? 'check' : 'alert'} size={mini ? 12 : 14} />
      {status}
    </span>
  );
}
