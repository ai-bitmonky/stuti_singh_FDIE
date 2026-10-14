/**
 * FDIE — report generators (runtime polymorphism made real) + the C++
 * reference source shown on the OOP screen, with a token-based highlighter.
 * Browser-only helpers (`downloadText`, `openInNewTab`) must be called from
 * event handlers, never at module scope / during render.
 */
import { CAT, segmentsText, type Snapshot } from './engine';
import { escapeHTML, fmtN, fmtPlain, iso, pct } from './format';

export type GeneratorKey = 'html' | 'text' | 'csv';

/* ============================================================ generators */

/** Abstract base — mirrors the C++ pure-virtual interface. */
export abstract class ReportGenerator {
  formatName(): string { return 'Base'; }
  get extension(): string { return 'txt'; }
  get mime(): string { return 'text/plain'; }
  /** Every subclass must override. */
  abstract generate(s: Snapshot): string;
  /** `fdie-report-YYYY-MM-DD.<ext>` */
  filename(s: Snapshot): string { return `fdie-report-${iso(s.generatedAt)}.${this.extension}`; }
}

/** Light, printable HTML document (all user text escaped). */
export class HTMLReportGenerator extends ReportGenerator {
  formatName() { return 'HTML'; }
  get extension() { return 'html'; }
  get mime() { return 'text/html'; }
  generate(s: Snapshot): string {
    const c = s.c, e = escapeHTML;
    const rows = s.expenses.map((x) => `<tr><td>${e(x.date)}</td><td><span class="cat" style="--c:${CAT[x.category].color}">${e(x.category)}</span></td><td>${e(x.note || '—')}</td><td class="r">₹${fmtN(x.amount)}</td></tr>`).join('');
    const cats = c.ranked.filter((k) => c.byCat[k] > 0).map((k) => `<div class="bar"><span>${k}</span><i style="width:${(c.share[k] * 100).toFixed(1)}%;background:${CAT[k].color}"></i><b>₹${fmtN(c.byCat[k])} · ${pct(c.share[k])}</b></div>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FDIE report — ${e(s.user)}</title>
<style>
*{box-sizing:border-box}body{margin:0;font:14px/1.55 Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#141821;background:#F6F4F1}
.wrap{max-width:760px;margin:0 auto;padding:40px 28px}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #141821;padding-bottom:16px}
h1{font:800 28px/1.1 Manrope,Inter,sans-serif;letter-spacing:-.02em;margin:0}.sub{color:#6B7280;font-size:13px}
.mark{display:inline-block;width:12px;height:12px;border-radius:4px;background:linear-gradient(135deg,#FF7A1A,#FFB169);margin-right:8px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}
.k{background:#fff;border:1px solid #E7E3DD;border-radius:12px;padding:14px}.k small{display:block;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.k b{display:block;font:800 20px Manrope,Inter,sans-serif;margin-top:4px;font-variant-numeric:tabular-nums}
.status{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;background:${c.diff >= 0 ? '#D1FAE5;color:#065F46' : '#FFE4E6;color:#9F1239'}}
h2{font:700 15px Manrope,Inter,sans-serif;margin:28px 0 12px}
.bar{display:grid;grid-template-columns:110px 1fr 140px;align-items:center;gap:12px;margin:6px 0;font-size:13px}.bar i{display:block;height:8px;border-radius:8px}.bar b{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #E7E3DD;border-radius:12px;overflow:hidden;font-size:13px}
th{background:#F1EEE9;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;padding:9px 12px}
td{padding:9px 12px;border-top:1px solid #EFECE7}.r{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.cat{font-size:12px;font-weight:600;color:var(--c)}
ul{padding-left:18px}li{margin:4px 0}
footer{margin-top:28px;color:#9CA3AF;font-size:12px}
@media (max-width:600px){.kpis{grid-template-columns:repeat(2,1fr)}.bar{grid-template-columns:90px 1fr 110px}}
</style></head><body><div class="wrap">
<header><div><div class="sub"><span class="mark"></span>FDIE · Financial Decision Engine</div><h1>Spending report — ${e(s.user)}</h1></div>
<div class="sub" style="text-align:right">${e(s.range)} · ${c.days} observed days<br>Generated ${s.generatedAt.toLocaleString('en-IN')}</div></header>
<div class="kpis"><div class="k"><small>Total spent</small><b>₹${fmtN(c.total)}</b></div><div class="k"><small>Monthly estimate</small><b>₹${fmtN(c.monthlyEstimate)}</b></div><div class="k"><small>Budget</small><b>₹${fmtN(s.budget)}</b></div><div class="k"><small>Daily pace</small><b>₹${fmtN(c.dailyPace)}</b></div></div>
<p><span class="status">${c.status}</span>&nbsp; ${c.diff >= 0 ? `₹${fmtN(c.diff)} under` : `₹${fmtN(-c.diff)} over`} budget at the current pace, based on ${c.days} days.</p>
<h2>By category</h2>${cats || '<p class="sub">No expenses.</p>'}
<h2>Insights</h2><ul>${s.insights.map((i) => `<li><b>${e(i.title)}.</b> ${e(segmentsText(i.msg))}</li>`).join('')}</ul>
<h2>Transactions (${s.expenses.length})</h2><table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<footer>Generated locally by HTMLReportGenerator.generate(). Heuristics, not financial advice. Data stays in this browser.</footer>
</div></body></html>`;
  }
}

/** 56-column box-drawing plain-text report. */
export class TextReportGenerator extends ReportGenerator {
  formatName() { return 'Text'; }
  get extension() { return 'txt'; }
  get mime() { return 'text/plain'; }
  generate(s: Snapshot): string {
    const c = s.c, W = 56;
    const line = (l = '', r = '') => {
      const space = W - 4 - l.length - r.length;
      return '║ ' + l + ' '.repeat(Math.max(1, space)) + r + ' ║';
    };
    const cut = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
    const top = '╔' + '═'.repeat(W - 2) + '╗', mid = '╠' + '═'.repeat(W - 2) + '╣', thin = '╟' + '─'.repeat(W - 2) + '╢', bot = '╚' + '═'.repeat(W - 2) + '╝';
    const out = [top, line('FDIE · SPENDING REPORT', s.generatedAt.toLocaleDateString('en-GB')), line(cut(s.user, 26), `${s.range} · ${c.days}d`), mid,
      line('Total spent', fmtPlain(c.total)), line('Daily pace', fmtPlain(c.dailyPace)), line('Weekly pace', fmtPlain(c.weeklyPace)),
      line('Monthly estimate', fmtPlain(c.monthlyEstimate)), line('Budget', fmtPlain(s.budget)),
      line('Status', `${c.status.toUpperCase()} (${c.diff >= 0 ? '+' : '−'}${fmtPlain(Math.abs(c.diff)).replace('−', '')})`), mid, line('BY CATEGORY'), thin];
    for (const k of c.ranked) {
      if (!c.byCat[k]) continue;
      const bar = '█'.repeat(Math.round(c.share[k] * 16)).padEnd(16, '░');
      out.push(line(`${k.padEnd(13)} ${bar}`, `${fmtPlain(c.byCat[k]).padStart(8)} ${pct(c.share[k]).padStart(4)}`));
    }
    out.push(mid, line(`TRANSACTIONS (${s.expenses.length})`), thin);
    for (const x of s.expenses) out.push(line(`${x.date.slice(5)}  ${cut(x.note || x.category, 30)}`, fmtPlain(x.amount)));
    out.push(mid, line('Heuristics, not advice · generated locally'), bot);
    return out.join('\n');
  }
}

/** RFC 4180 CSV of the snapshot's expenses. */
export class CSVReportGenerator extends ReportGenerator {
  formatName() { return 'CSV'; }
  get extension() { return 'csv'; }
  get mime() { return 'text/csv'; }
  /** Quote if the cell has a quote, comma or newline; double inner quotes. */
  static cell(v: unknown): string {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  generate(s: Snapshot): string {
    const head = ['id', 'date', 'category', 'amount', 'note'];
    const rows = s.expenses.map((x) => [x.id, x.date, x.category, x.amount, x.note].map(CSVReportGenerator.cell).join(','));
    return [head.join(','), ...rows].join('\r\n');
  }
}

/** One instance per format — callers only ever hold a `ReportGenerator`. */
export const GENERATORS: Readonly<Record<GeneratorKey, ReportGenerator>> = {
  html: new HTMLReportGenerator(),
  text: new TextReportGenerator(),
  csv: new CSVReportGenerator(),
};

/** Trigger a file download via Blob + temporary anchor (browser only). */
export function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Open an HTML string in a new tab via a Blob URL. Returns false if the popup was blocked. */
export function openInNewTab(html: string): boolean {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const w = window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return w !== null;
}

/* ======================================================== C++ reference */

export type CppKey = 'base' | 'html' | 'text' | 'csv' | 'main';
/** UML box highlighted for a tab (null = none). */
export type UmlBox = 'base' | 'html' | 'text' | 'csv' | null;
export interface CppFile { file: string; box: UmlBox; code: string }

/** C++ source per tab (verbatim from the prototype). */
export const CPP: Readonly<Record<CppKey, CppFile>> = {
  base: { file: 'ReportGenerator.h', box: 'base', code: `// ReportGenerator.h — the abstract base class (the interface)
#pragma once
#include <string>
#include <vector>

struct Expense { std::string date, category, note; double amount; };

struct Snapshot {
    std::string user;
    double total, monthlyEstimate, budget;
    int days;
    std::vector<Expense> expenses;
};

class ReportGenerator {
public:
    virtual ~ReportGenerator() = default;

    // Every report has a human-readable format name...
    virtual std::string formatName() const = 0;

    // ...and must know how to render a snapshot.
    // Pure virtual: no body here — subclasses MUST override.
    virtual std::string generate(const Snapshot& s) const = 0;
};` },
  html: { file: 'HTMLReportGenerator.h', box: 'html', code: `// HTMLReportGenerator.h — inherits the interface, overrides generate()
#include "ReportGenerator.h"
#include <sstream>

class HTMLReportGenerator : public ReportGenerator {
public:
    std::string formatName() const override { return "HTML"; }

    std::string generate(const Snapshot& s) const override {
        std::ostringstream out;
        out << "<!doctype html><h1>Spending report</h1>"
            << "<p>Total: " << rupees(s.total)
            << " · Estimate: " << rupees(s.monthlyEstimate) << "</p><table>";
        for (const auto& e : s.expenses)
            out << "<tr><td>" << e.date << "</td><td>"
                << escapeHtml(e.note) << "</td><td>"
                << rupees(e.amount) << "</td></tr>";
        out << "</table>";
        return out.str();
    }
};` },
  text: { file: 'TextReportGenerator.h', box: 'text', code: `// TextReportGenerator.h — same interface, box-drawing output
#include "ReportGenerator.h"
#include <sstream>

class TextReportGenerator : public ReportGenerator {
public:
    std::string formatName() const override { return "Text"; }

    std::string generate(const Snapshot& s) const override {
        std::ostringstream out;
        out << "╔══════════════════════════════╗\\n"
            << "║  FDIE · SPENDING REPORT      ║\\n"
            << "╠══════════════════════════════╣\\n";
        out << "║ Total     " << pad(rupees(s.total), 19) << "║\\n";
        out << "║ Estimate  " << pad(rupees(s.monthlyEstimate), 19) << "║\\n";
        for (const auto& e : s.expenses)
            out << "║ " << pad(e.note, 20) << pad(rupees(e.amount), 8) << "║\\n";
        out << "╚══════════════════════════════╝\\n";
        return out.str();
    }
};` },
  csv: { file: 'CSVReportGenerator.h', box: 'csv', code: `// CSVReportGenerator.h — machine-readable, RFC 4180 escaping
#include "ReportGenerator.h"
#include <sstream>

class CSVReportGenerator : public ReportGenerator {
    static std::string cell(const std::string& v) {
        if (v.find_first_of("\\",\\r\\n") == std::string::npos) return v;
        std::string q = "\\"";
        for (char c : v) { if (c == '"') q += '"'; q += c; }   // double the quotes
        return q + "\\"";
    }
public:
    std::string formatName() const override { return "CSV"; }

    std::string generate(const Snapshot& s) const override {
        std::ostringstream out;
        out << "date,category,amount,note\\r\\n";
        for (const auto& e : s.expenses)
            out << e.date << ',' << e.category << ','
                << e.amount << ',' << cell(e.note) << "\\r\\n";
        return out.str();
    }
};` },
  main: { file: 'main.cpp', box: null, code: `// main.cpp — runtime polymorphism through a base-class pointer
#include <memory>
#include <vector>
#include "HTMLReportGenerator.h"
#include "TextReportGenerator.h"
#include "CSVReportGenerator.h"

int main() {
    Snapshot snap = loadSnapshot();          // totals, pace, expenses

    std::vector<std::unique_ptr<ReportGenerator>> gens;
    gens.push_back(std::make_unique<HTMLReportGenerator>());
    gens.push_back(std::make_unique<TextReportGenerator>());
    gens.push_back(std::make_unique<CSVReportGenerator>());

    for (const auto& g : gens) {
        // Same call site, different behaviour: the vtable picks the override.
        std::string report = g->generate(snap);
        save("report." + g->formatName(), report);
    }
    // ReportGenerator r;   // error: cannot instantiate an abstract class
    return 0;
}` },
};

/** Tab metadata in display order. */
export const CPP_TABS: readonly { key: CppKey; label: string; filename: string }[] = [
  { key: 'base', label: 'Base', filename: CPP.base.file },
  { key: 'html', label: 'HTML', filename: CPP.html.file },
  { key: 'text', label: 'Text', filename: CPP.text.file },
  { key: 'csv', label: 'CSV', filename: CPP.csv.file },
  { key: 'main', label: 'main', filename: CPP.main.file },
];

export type TokenType = 'kw' | 'type' | 'str' | 'com' | 'num' | 'pre' | 'fn' | 'plain';
export interface Token { type: TokenType; text: string }

const CPP_KW = new Set('class public private protected virtual const override return struct for if auto int double char static default include pragma once new delete true false nullptr using namespace this'.split(' '));
const CPP_TY = new Set(['std', 'string', 'vector', 'ostringstream', 'unique_ptr']);

/**
 * Tokenise C++ source for highlighting. Returns one token array per line
 * (an empty line yields `[]`). Render each token as a span with class `t-<type>`.
 */
export function hlCpp(src: string): Token[][] {
  const re = /(\/\/.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)')|(#\w+)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b/gm;
  const flat: Token[] = [];
  let last = 0;
  for (const m of src.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) flat.push({ type: 'plain', text: src.slice(last, idx) });
    let type: TokenType = 'plain';
    if (m[1]) type = 'com';
    else if (m[2]) type = 'str';
    else if (m[3]) type = 'pre';
    else if (m[4]) type = 'num';
    else {
      const w = m[5], next = src[idx + w.length];
      if (CPP_KW.has(w)) type = 'kw';
      else if (/^[A-Z]/.test(w) || CPP_TY.has(w)) type = 'type';
      else if (next === '(') type = 'fn';
    }
    flat.push({ type, text: m[0] });
    last = idx + m[0].length;
  }
  if (last < src.length) flat.push({ type: 'plain', text: src.slice(last) });

  // split into lines (tokens never span lines except 'plain' whitespace runs)
  const lines: Token[][] = [[]];
  for (const t of flat) {
    const parts = t.text.split('\n');
    parts.forEach((p, i) => {
      if (i > 0) lines.push([]);
      if (p) {
        const cur = lines[lines.length - 1];
        const prev = cur[cur.length - 1];
        if (prev && prev.type === t.type) prev.text += p;
        else cur.push({ type: t.type, text: p });
      }
    });
  }
  return lines;
}
