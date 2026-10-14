'use client';
import { useCountUp } from '@/hooks/useCountUp';
import { fmtN } from '@/lib/format';

/** Money with a smaller, muted ₹ (`cur` for big numbers, `cur-sm` inline). */
export function Money({ n, cls = 'cur' }: { n: number; cls?: 'cur' | 'cur-sm' }) {
  return (
    <>
      {n < 0 ? '−' : ''}
      <span className={cls}>₹</span>
      {fmtN(Math.abs(n))}
    </>
  );
}

/** Money that counts up on mount (when `animate`) and eases between later values. */
export function CountMoney({ n, cls = 'cur', animate }: { n: number; cls?: 'cur' | 'cur-sm'; animate: boolean }) {
  const v = useCountUp(n, { fromZero: animate });
  return <Money n={Math.abs(v - n) < 0.5 ? n : v} cls={cls} />;
}

/** Integer that counts up. */
export function CountInt({ n, animate }: { n: number; animate: boolean }) {
  const v = useCountUp(n, { fromZero: animate });
  return <>{fmtN(v)}</>;
}
