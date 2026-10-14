'use client';
/** OOP Concepts (pushed): concept chips, class hierarchy, C++ source tabs, live polymorphism demo. */
import { useEffect, type ReactNode } from 'react';
import { makeSnapshot, type Snapshot } from '@/lib/engine';
import { CPP, CPP_TABS, ReportGenerator, hlCpp, type CppKey, type GeneratorKey, type Token, type TokenType } from '@/lib/reports';
import { useM, useSticky } from '../ctx';
import { haptic } from '../device';
import { Icon } from '../icons';
import Hierarchy from '../charts/Hierarchy';
import { LargeTitle, SegControl } from '../ui';

type Concept = 'inherit' | 'override' | 'poly' | 'iface';
const CONCEPTS: Record<Concept, [string, ReactNode]> = {
  inherit: ['Inheritance', <><b>HTML</b>, <b>Text</b> and <b>CSV</b> generators all derive from <b>ReportGenerator</b>, so they share <b>filename()</b> and the same interface without copying code.</>],
  override: ['Method overriding', <>Each subclass supplies its own <b>generate()</b> and <b>formatName()</b> marked <b>override</b>; the base version is pure virtual (in TypeScript here it is <b>abstract</b>).</>],
  poly: ['Runtime polymorphism', <>The app holds a <b>ReportGenerator</b> reference and calls <b>gen.generate(snapshot)</b>. Which body runs is decided at runtime by the object’s real type — try the live demo below.</>],
  iface: ['Interface vs implementation', <>Callers depend only on the interface (<b>formatName</b>, <b>generate</b>). How HTML escapes text or CSV quotes commas stays hidden inside each implementation.</>],
};
export const CLASS_NAME: Record<GeneratorKey, string> = { html: 'HTMLReportGenerator', text: 'TextReportGenerator', csv: 'CSVReportGenerator' };
const TK: Record<TokenType, string | undefined> = { kw: 'tk-k', type: 'tk-t', fn: 'tk-f', str: 'tk-s', com: 'tk-c', num: 'tk-n', pre: 'tk-p', plain: undefined };
const GENS = [['html', 'HTML'], ['text', 'Text'], ['csv', 'CSV']] as const;
const TABS = CPP_TABS.map((t) => [t.key, t.label] as const);

/** Render highlighted tokens as spans (no innerHTML). */
export function Tokens({ line }: { line: Token[] }) {
  return <>{line.map((t, i) => (TK[t.type] ? <span key={i} className={TK[t.type]}>{t.text}</span> : t.text))}</>;
}

function Code({ src }: { src: string }) {
  const lines = hlCpp(src);
  return (
    <pre>
      {lines.map((l, i) => (
        <span key={i}><Tokens line={l} />{i < lines.length - 1 ? '\n' : ''}</span>
      ))}
    </pre>
  );
}

export default function OOP({ autoRun }: { autoRun?: boolean }) {
  const m = useM();
  const [concept, setConcept] = useSticky<Concept>('oop.concept', 'poly');
  const [tab, setTab] = useSticky<CppKey>('oop.tab', 'base');
  const [gen, setGen] = useSticky<GeneratorKey>('oop.gen', 'html');

  useEffect(() => {
    if (!autoRun) return;
    const t = setTimeout(() => m.showReport(gen), 480);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callBase = () => {
    // The abstract base has no generate() at runtime — calling it really fails.
    const proto = ReportGenerator.prototype as unknown as { generate?: (s: Snapshot) => string };
    try {
      if (typeof proto.generate !== 'function') throw new Error('ReportGenerator.generate(): not implemented (pure virtual)');
      proto.generate(makeSnapshot(m.state, 'all'));
    } catch (err) {
      haptic([10, 40, 10]);
      m.toast(err instanceof Error ? err.message : String(err), { icon: 'alert', tone: 'bad' });
    }
  };

  const box = CPP[tab].box;
  return (
    <>
      <LargeTitle cap="Report engine" title="OOP Concepts" />
      <p className="lt-sub">FDIE’s exports are built from real polymorphic classes. Same call, different behaviour.</p>
      <div className="concepts">
        {(Object.keys(CONCEPTS) as Concept[]).map((k) => (
          <button key={k} type="button" className={'concept pressable' + (k === concept ? ' on' : '')} onClick={() => { setConcept(k); haptic(4); }}>
            {CONCEPTS[k][0]}
          </button>
        ))}
      </div>
      <div className="concept-txt">{CONCEPTS[concept][1]}</div>
      <div className="sec-h">Class hierarchy</div>
      <div className="card hier">
        <Hierarchy on={box} onPick={(k) => { setTab(k); haptic(5); }} />
        <div className="foot" style={{ padding: '6px 4px 0', textAlign: 'center' }}>Tap a class to view its code</div>
      </div>
      <div className="sec-h">Source · C++</div>
      <SegControl items={TABS} value={tab} onPick={setTab} />
      <div className="code">
        <div className="code-h"><i /><i /><i /><span>{CPP[tab].file}</span></div>
        <Code src={CPP[tab].code} />
      </div>
      <div className="sec-h">Live demo · TypeScript classes</div>
      <div className="card demo">
        <SegControl items={GENS} value={gen} onPick={setGen} />
        <div className="demo-call">
          <Tokens line={hlCpp(`ReportGenerator gen = new ${CLASS_NAME[gen]}();  gen.generate(snapshot);`)[0]} />
        </div>
        <button type="button" className="btn-primary pressable" onClick={() => { haptic(8); m.showReport(gen); }}>
          <Icon name="spark" size={20} sw={2.2} />Generate report
        </button>
        <button type="button" className="btn-plain pressable" style={{ marginTop: 10, height: 44, fontSize: 15 }} onClick={callBase}>
          Call generate() on the base class
        </button>
      </div>
      <div className="foot" style={{ paddingTop: 12 }}>The demo runs the same classes that power Export CSV in Profile.</div>
    </>
  );
}
