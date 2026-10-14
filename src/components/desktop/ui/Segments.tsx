import type { Segment } from '@/lib/engine';

/** Insight message: bold segments render as <b>, everything as escaped text. */
export function Segments({ segs }: { segs: Segment[] }) {
  return (
    <>
      {segs.map((s, i) => (s.bold ? <b key={i}>{s.text}</b> : <span key={i}>{s.text}</span>))}
    </>
  );
}
