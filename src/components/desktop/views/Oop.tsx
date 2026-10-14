'use client';
import { useEffect, useRef } from 'react';
import { makeSnapshot, viewByRange, type Snapshot, type State } from '@/lib/engine';
import { fmtN } from '@/lib/format';
import { CPP, CPP_TABS, GENERATORS, ReportGenerator, downloadText, hlCpp, openInNewTab, type CppKey, type GeneratorKey, type TokenType } from '@/lib/reports';
import { useDesk } from '../ctx';
import { Uml } from '../charts/Uml';
import { Icon } from '../ui/Icon';
import { vi } from '../ui/util';

/** Concrete stand-in for "calling generate() on the abstract base": it throws like the JS prototype did. */
class AbstractBaseProbe extends ReportGenerator {
  generate(): string {
    throw new Error('ReportGenerator.generate() not implemented — override it in a subclass');
  }
}

export type RunKind = GeneratorKey | 'base';
export interface Output {
  kind: RunKind;
  n: number;
  out?: string;
  error?: string;
  fname?: string;
  mime?: string;
  stats?: string;
}

/** Real class names (constructor.name is unreliable after minification). */
const CLASS: Record<RunKind, string> = { html: 'HTMLReportGenerator', text: 'TextReportGenerator', csv: 'CSVReportGenerator', base: 'ReportGenerator' };
const TOK: Record<TokenType, string | undefined> = { kw: 't-kw', type: 't-ty', str: 't-str', com: 't-com', num: 't-num', pre: 't-pre', fn: 't-fn', plain: undefined };
const GENS: [GeneratorKey, string, string, string][] = [
  ['html', 'HTML', 'HTMLReportGenerator', 'Styled document · opens in a tab'],
  ['text', 'TXT', 'TextReportGenerator', 'Box-drawing plain text'],
  ['csv', 'CSV', 'CSVReportGenerator', 'Spreadsheet rows, escaped'],
];
const CHIPS: [string, string][] = [
  ['Inheritance', 'var(--blue)'],
  ['Method overriding', 'var(--accent)'],
  ['Runtime polymorphism', 'var(--violet)'],
  ['Interface vs implementation', 'var(--green)'],
];

export function run(kind: RunKind, snap: Snapshot): Output {
  const gen: ReportGenerator = kind === 'base' ? new AbstractBaseProbe() : GENERATORS[kind];
  const t0 = performance.now();
  try {
    const out = gen.generate(snap);
    const ms = performance.now() - t0, bytes = new Blob([out]).size;
    return { kind, n: snap.expenses.length, out, fname: gen.filename(snap), mime: gen.mime, stats: `✓ ${fmtN(bytes)} bytes · ${out.split('\n').length} lines · ${ms.toFixed(1)} ms` };
  } catch (err) {
    return { kind, n: snap.expenses.length, error: err instanceof Error ? err.message : String(err) };
  }
}

function Code({ k }: { k: CppKey }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [k]);
  return (
    <pre ref={ref} className="code" style={{ flex: 1 }} tabIndex={0} aria-label="C++ source">
      {hlCpp(CPP[k].code).map((line, i) => (
        <span key={i} className="ln">
          {line.length
            ? line.map((t, j) =>
                TOK[t.type] ? (
                  <span key={j} className={TOK[t.type]}>
                    {t.text}
                  </span>
                ) : (
                  t.text
                ),
              )
            : ' '}
        </span>
      ))}
    </pre>
  );
}

function Dispatch({ o }: { o: Output | null }) {
  if (!o) return <span style={{ color: 'var(--text-3)' }}>{'// dispatch log appears here'}</span>;
  const cls = CLASS[o.kind];
  return (
    <>
      <span className="hl">const</span> gen: ReportGenerator = <span className="hl">new</span> {cls}()
      {'\n'}
      <span className="hl">gen</span>.generate(snapshot){'   '}
      <span style={{ color: 'var(--text-3)' }}>{`// ${o.n} expenses`}</span>
      {'\n'}
      {`  ↳ dispatched to ${cls}.prototype.generate\n`}
      {o.error ? <span className="er">✗ Error: {o.error}</span> : <span className="ok">{o.stats}</span>}
    </>
  );
}

export interface OopProps {
  state: State;
  tab: CppKey;
  gen: GeneratorKey;
  output: Output | null;
  set: (p: { tab?: CppKey; gen?: GeneratorKey; output?: Output | null }) => void;
}

export function Oop({ state, tab, gen, output, set }: OopProps) {
  const { range, toast } = useDesk();
  const count = viewByRange(state, range).length;
  const pick = (k: CppKey) => set(k in GENERATORS ? { tab: k, gen: k as GeneratorKey } : { tab: k });
  const exec = (k: RunKind) => set({ output: run(k, makeSnapshot(state, range)) });

  // re-run the last successful generator with fresh data when the view opens
  const first = useRef(true);
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    if (output && !output.error) set({ output: run(output.kind, makeSnapshot(state, range)) });
  }, [output, set, state, range]);

  const o = output;
  return (
    <>
      <div className="oop-chips">
        {CHIPS.map(([t, c]) => (
          <span key={t} className="oop-chip">
            <i style={{ background: c }} />
            {t}
          </span>
        ))}
      </div>
      <div className="grid">
        <article className="card span-5 md-12 flat" style={vi(0)}>
          <div className="card-head">
            <div>
              <div className="card-title">Class hierarchy</div>
              <div className="card-sub">Click a class to see its code</div>
            </div>
            <span className="kpi-ic">
              <Icon name="layers" size={16} />
            </span>
          </div>
          <Uml sel={CPP[tab].box} onPick={pick} />
          <div className="uml-legend">
            <span>
              <svg width="18" height="12" aria-hidden="true">
                <path d="M1 6h10" stroke="var(--text-3)" strokeWidth="1.5" />
                <path d="M17 6l-7-5v10z" fill="none" stroke="var(--text-3)" strokeWidth="1.5" />
              </svg>
              inherits from
            </span>
            <span>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--violet)', display: 'inline-block' }} />
              virtual (declared in base)
            </span>
            <span>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-2)', display: 'inline-block' }} />
              override (subclass body)
            </span>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 16, lineHeight: 1.6 }}>
            The engine only ever holds a <b style={{ color: 'var(--text)' }}>ReportGenerator</b>. Which{' '}
            <code style={{ fontFamily: 'var(--font-code)', color: 'var(--accent-2)' }}>generate()</code> runs is decided at runtime by the object&apos;s real class — adding
            a PDF report means one new subclass, zero changes to callers.
          </p>
        </article>
        <article className="card span-7 md-12 flat" style={vi(1, { display: 'flex', flexDirection: 'column' })}>
          <div className="code-tabs" role="tablist">
            {CPP_TABS.map((t) => (
              <button key={t.key} type="button" role="tab" className={t.key === tab ? 'on' : undefined} aria-selected={t.key === tab} onClick={() => pick(t.key)}>
                {t.filename}
              </button>
            ))}
          </div>
          <Code k={tab} />
        </article>
        <article className="card span-12 flat" style={vi(2)}>
          <div className="card-head">
            <div>
              <div className="card-title">Live demo — the same call, three behaviours</div>
              <div className="card-sub">
                These are real JavaScript classes on this page, mirroring the C++ above. Output uses your current data ({count} expenses).
              </div>
            </div>
            <span className="pill info">
              <Icon name="code" size={14} />
              runs in your browser
            </span>
          </div>
          <div className="demo">
            <div className="demo-ctrl">
              {GENS.map(([k, ext, name, sub]) => (
                <button key={k} type="button" className={`gen-opt${gen === k ? ' on' : ''}`} onClick={() => pick(k)}>
                  <span className="go-ic">{ext}</span>
                  <span>
                    <div className="go-n">{name}</div>
                    <div className="go-s">{sub}</div>
                  </span>
                </button>
              ))}
              <button type="button" className="btn btn-primary btn-lg" onClick={() => exec(gen)}>
                <Icon name="play" size={15} />
                Generate
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Call generate() on the abstract base"
                onClick={() => {
                  set({ tab: 'base', output: run('base', makeSnapshot(state, range)) });
                }}
              >
                Try the abstract base class
              </button>
              <div className="dispatch">
                <Dispatch o={o} />
              </div>
            </div>
            <div className="preview">
              <div className="preview-bar">
                <span className="dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="pb-t">{!o ? 'output preview' : o.error ? 'ReportGenerator · abstract' : `${o.fname} · ${o.mime}`}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {o && !o.error && o.out != null && (
                    <>
                      {o.kind === 'html' ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            if (!openInNewTab(o.out ?? '')) toast('Pop-up blocked — allow pop-ups to open the report', { type: 'error' });
                          }}
                        >
                          <Icon name="external" size={14} />
                          Open
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(o.out ?? '');
                              toast('Copied to clipboard', { type: 'info' });
                            } catch {
                              toast('Clipboard not available here', { type: 'error' });
                            }
                          }}
                        >
                          <Icon name="copy" size={14} />
                          Copy
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          downloadText(o.out ?? '', o.fname ?? 'report.txt', o.mime ?? 'text/plain');
                          toast(`Downloaded ${o.fname}`, { type: 'info' });
                        }}
                      >
                        <Icon name="download" size={14} />
                        Download
                      </button>
                    </>
                  )}
                </span>
              </div>
              <div className="preview-body">
                {!o ? (
                  <div className="mini-empty">
                    <Icon name="play" size={28} />
                    <span>
                      Pick a generator and press <b style={{ color: 'var(--text)' }}>Generate</b>.
                    </span>
                  </div>
                ) : o.error ? (
                  <div className="err-box">
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Error thrown — as designed</div>
                    {o.error}
                    <div style={{ color: 'var(--text-2)', marginTop: 10 }}>
                      The base class only declares the interface. In C++ this would not even compile: you cannot instantiate a class with a pure virtual function.
                    </div>
                  </div>
                ) : o.kind === 'html' ? (
                  <iframe title="HTML report preview" sandbox="" srcDoc={o.out} />
                ) : (
                  <pre>{o.out}</pre>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
