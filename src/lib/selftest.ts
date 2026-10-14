/**
 * Engine self-test. Run: `npx tsx src/lib/selftest.ts` (exits 1 on failure).
 * Not imported by the app.
 */
import { compute, insights, makeSnapshot, seed, simulate, validate, type Category } from './engine';
import { addDays, iso, todayD } from './format';
import { CSVReportGenerator, GENERATORS, hlCpp, CPP } from './reports';

export function runSelfTest(): { passed: number; failed: string[] } {
  const failed: string[] = [];
  let passed = 0;
  const check = (name: string, cond: boolean, info = '') => {
    if (cond) { passed++; console.log(`  ok   ${name}${info ? ' — ' + info : ''}`); }
    else { failed.push(name); console.log(`  FAIL ${name}${info ? ' — ' + info : ''}`); }
  };

  const s = seed();
  const c = compute(s.expenses, s.budget);
  check('seed has 38 expenses', s.expenses.length === 38, String(s.expenses.length));
  check('seed total = 32,712', c.total === 32712, String(c.total));
  check('observed days = 24', c.days === 24, String(c.days));
  check('monthlyEstimate = 40,890', c.monthlyEstimate === 40890, String(c.monthlyEstimate));
  check('Food share ≈ 0.41', Math.abs(c.share.Food - 0.41) < 0.01, c.share.Food.toFixed(4));
  check('top category Food', c.topCategory === 'Food');
  check("status 'On track'", c.status === 'On track', `diff ${c.diff}`);

  const sim = simulate(c, { Food: 25 });
  check('simulate Food 25% → savings > 0', sim.savingsMonthly > 0, `₹${sim.savingsMonthly}/mo`);
  check('Education fixed in sim', sim.rows.find((r) => r.cat === 'Education')?.fixed === true);

  const ins = insights(c, s.expenses);
  const conc = ins.find((i) => i.id === 'conc');
  check('concentration warning fires', conc?.sev === 'warn');
  check('insight msg uses bold segments', !!conc?.msg.some((x) => x.bold) && !conc?.msg.some((x) => /<\/?b>/.test(x.text)));

  check('CSV plain cell', CSVReportGenerator.cell('abc') === 'abc');
  check('CSV comma cell', CSVReportGenerator.cell('a,b') === '"a,b"');
  check('CSV quote cell', CSVReportGenerator.cell('say "hi"') === '"say ""hi"""');
  check('CSV newline cell', CSVReportGenerator.cell('a\nb') === '"a\nb"');

  const snap = makeSnapshot(s, 'all');
  const csv = GENERATORS.csv.generate(snap);
  check('CSV has header + 38 rows', csv.split('\r\n').length === 39);
  const html = GENERATORS.html.generate(makeSnapshot({ ...s, user: '<script>x</script>' }, '30'));
  check('HTML report escapes user', !html.includes('<script>x') && html.includes('&lt;script&gt;'));
  check('Text report renders', GENERATORS.text.generate(snap).startsWith('╔'));

  const base = { amount: '250', category: 'Food' as Category, date: iso(todayD()), note: 'ok' };
  check('validate accepts good input', validate(base).ok);
  check('validate rejects future date', !!validate({ ...base, date: iso(addDays(todayD(), 1)) }).errors.date);
  check('validate rejects blank amount', !!validate({ ...base, amount: '' }).errors.amount);
  check('validate rejects negative', !!validate({ ...base, amount: '-5' }).errors.amount);
  check('validate rejects 81-char note', !!validate({ ...base, note: 'x'.repeat(81) }).errors.note);
  check('validate rejects bad category', !!validate({ ...base, category: 'Rent' }).errors.category);

  const lines = hlCpp(CPP.base.code);
  check('hlCpp line count matches', lines.length === CPP.base.code.split('\n').length);
  check('hlCpp finds keywords + comments', lines.flat().some((t) => t.type === 'kw' && t.text === 'class') && lines[0][0].type === 'com');

  const empty = compute([], 45000);
  check('empty compute safe', empty.empty && empty.monthlyEstimate === 0 && insights(empty, [])[0].id === 'none');
  return { passed, failed };
}

const r = runSelfTest();
console.log(`\n${r.passed} passed, ${r.failed.length} failed`);
if (r.failed.length) process.exit(1);
