'use client';
/** Generated report: format pill + size, sandboxed preview, Download / Share / Open in new tab. */
import { downloadText, GENERATORS, openInNewTab, type GeneratorKey } from '@/lib/reports';
import { useM } from '../ctx';
import { haptic } from '../device';
import { Icon } from '../icons';
import { CLASS_NAME } from '../screens/OOP';
import Sheet from './Sheet';

export interface Report { key: GeneratorKey; out: string; name: string; rows: number; n: number }

const PILL: Record<GeneratorKey, string> = { html: 'warn', text: 'info', csv: 'good' };

export default function ReportSheet({ open, report, onClose }: { open: boolean; report: Report | null; onClose: () => void }) {
  const m = useM();
  const gen = report ? GENERATORS[report.key] : null;

  const share = async () => {
    if (!report || !gen) return;
    try {
      const file = new File([report.out], report.name, { type: gen.mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'FDIE report' });
        return;
      }
      await navigator.clipboard.writeText(report.out);
      m.toast('Report copied to clipboard', { raise: true });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        m.toast('Sharing isn’t available here — use Download', { icon: 'info', tone: 'info', raise: true });
      }
    }
  };

  return (
    <Sheet
      open={open}
      label="Generated report"
      title={gen ? `${gen.formatName()} report` : 'Report'}
      right={<button type="button" className="sh-btn r" onClick={onClose}>Done</button>}
      onClose={onClose}
    >
      {report && gen && (
        <div key={report.n}>
          <div className="rep-meta">
            <span className={'pill ' + PILL[report.key]}>{gen.formatName()}</span>
            <span>{(new Blob([report.out]).size / 1024).toFixed(1)} KB · {report.rows} rows</span>
            <code>{CLASS_NAME[report.key]}.generate()</code>
          </div>
          <div className="rep-prev">
            {report.key === 'html' ? (
              <iframe sandbox="" title="HTML report preview" srcDoc={report.out} />
            ) : (
              <pre>{report.out}</pre>
            )}
          </div>
          <div className="rep-actions">
            <button
              type="button"
              className="btn-primary pressable"
              onClick={() => {
                downloadText(report.out, report.name, gen.mime);
                haptic(10);
                m.toast(`Saved ${report.name}`, { icon: 'download', raise: true });
              }}
            >
              <Icon name="download" size={20} sw={2.2} />Download
            </button>
            <button type="button" className="btn-plain pressable" onClick={share}>
              <Icon name="share" size={20} />Share
            </button>
            {report.key === 'html' && (
              <button
                type="button"
                className="btn-plain pressable wide"
                onClick={() => {
                  // window.open(…, 'noopener') always returns null, so its result can't detect a blocker
                  openInNewTab(report.out);
                  haptic(6);
                }}
              >
                <Icon name="up" size={20} />Open in new tab
              </button>
            )}
          </div>
          <div className="foot" style={{ textAlign: 'center', paddingTop: 14 }}>File: {report.name}</div>
        </div>
      )}
    </Sheet>
  );
}
