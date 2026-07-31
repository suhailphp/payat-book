const assert = require('assert');
const {
  bal,
  eventTotal,
  fmt,
  owedFor,
  initials,
  serializeBackup,
  parseBackup,
  dstr,
  monthKey,
  monthBuckets,
  monthTotals,
  topBalances,
  filterPayments,
} = require('../.testbuild/lib');
const { buildShareText } = require('../.testbuild/share');

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('ok -', name);
};

/* ---------- core ledger ---------- */

const riyas = { id: 1, name: 'Riyas KP', phone: '+91 98765 43210', created: '2026-07-01' };
let txns = [{ id: 1, personId: 1, eventId: null, dir: 'in', amount: 1000, date: '2026-07-10', note: '' }];
ok('in 1000 gives balance -1000', () => assert.strictEqual(bal(txns, 1), -1000));
ok('chips: I owe → out suggests 1000', () => assert.strictEqual(owedFor(bal(txns, 1), 'out'), 1000));
ok('chips: no suggestion for in when they owe nothing', () => assert.strictEqual(owedFor(bal(txns, 1), 'in'), 0));

txns.push({ id: 2, personId: 1, eventId: null, dir: 'out', amount: 2000, date: '2026-07-20', note: 'wedding payat' });
ok('out 2000 flips balance to +1000', () => assert.strictEqual(bal(txns, 1), 1000));
ok('chips: they owe → in suggests 1000/2000', () => assert.strictEqual(owedFor(bal(txns, 1), 'in'), 1000));

ok('fmt Indian grouping', () => {
  assert.strictEqual(fmt(1000), '₹1,000');
  assert.strictEqual(fmt(100000), '₹1,00,000');
  assert.strictEqual(fmt(12345678), '₹1,23,45,678');
  assert.strictEqual(fmt(-1000), '₹1,000');
  assert.strictEqual(fmt(500), '₹500');
});

ok('eventTotal sums event txns only', () => {
  const t2 = [
    { id: 1, personId: 1, eventId: 5, dir: 'in', amount: 700, date: null, note: '' },
    { id: 2, personId: 2, eventId: 5, dir: 'in', amount: 300, date: null, note: '' },
    { id: 3, personId: 1, eventId: null, dir: 'out', amount: 999, date: null, note: '' },
  ];
  assert.strictEqual(eventTotal(t2, 5), 1000);
});

ok('initials', () => {
  assert.strictEqual(initials('Riyas KP'), 'RK');
  assert.strictEqual(initials('  fathima  '), 'F');
});

/* ---------- backup ---------- */

const people = [riyas];
const events = [{ id: 3, title: 'Wedding of Fathima', date: '2026-07-20', type: 'hosted', status: 'open' }];
ok('backup round-trip preserves data', () => {
  const parsed = parseBackup(serializeBackup(people, events, txns));
  assert.ok(parsed);
  assert.strictEqual(parsed.app, 'payat-book');
  assert.strictEqual(parsed.version, 2);
  assert.deepStrictEqual(parsed.people, people);
  assert.deepStrictEqual(parsed.events, events);
  assert.deepStrictEqual(parsed.txns, txns);
});

ok('PWA-format backup imports', () => {
  const pwa = JSON.stringify(
    {
      app: 'payat-book',
      version: 2,
      exported: '2026-07-30T10:00:00.000Z',
      people: [{ name: 'Riyas KP', phone: '+91 98765 43210', created: '2026-07-01', id: 1 }],
      events: [{ title: 'Wedding of Fathima', date: '2026-07-20', type: 'hosted', status: 'open', id: 3 }],
      txns: [
        { personId: 1, dir: 'in', amount: 1000, date: '2026-07-10', note: '', eventId: null, id: 1 },
        { personId: 1, dir: 'in', amount: 700, date: '2026-07-20', note: '', eventId: 3, id: 2 },
      ],
    },
    null,
    1
  );
  const parsed = parseBackup(pwa);
  assert.ok(parsed);
  assert.strictEqual(parsed.people[0].name, 'Riyas KP');
  assert.strictEqual(parsed.txns[1].eventId, 3);
  assert.strictEqual(parsed.txns[0].eventId, null);
  assert.strictEqual(bal(parsed.txns, 1), -1700);
});

ok('non-backup files rejected', () => {
  assert.strictEqual(parseBackup('{"app":"other"}'), null);
  assert.strictEqual(parseBackup('not json'), null);
  assert.strictEqual(parseBackup('{"app":"payat-book"}'), null);
});

/* ---------- share text ---------- */

ok('share text EN', () => {
  const text = buildShareText(riyas, txns, 'en');
  const lines = text.split('\n');
  assert.strictEqual(lines[0], '📒 *Payat Book — Riyas KP*');
  assert.ok(lines[2].includes('You gave ₹1,000'));
  assert.ok(lines[3].includes('I gave ₹2,000 (wedding payat)'));
  assert.strictEqual(lines[5], '*You have ₹1,000 to give.*');
});

ok('share text ML balance line', () => {
  const text = buildShareText(riyas, txns, 'ml');
  assert.ok(text.startsWith('📒 *പയറ്റ് ബുക്ക് — Riyas KP*'));
  assert.ok(text.includes('*നിങ്ങൾ ₹1,000 തരാനുണ്ട്.*'));
});

ok('share text with owner name (v3)', () => {
  assert.ok(buildShareText(riyas, txns, 'en', 'Hameed').startsWith('📒 *Hameed — Payat Book*'));
  assert.ok(buildShareText(riyas, txns, 'ml', 'ഹമീദ്').startsWith('📒 *ഹമീദ് — പയറ്റ് ബുക്ക്*'));
});

ok('share text settled + I-owe variants', () => {
  const t0 = [
    { id: 1, personId: 1, eventId: null, dir: 'in', amount: 500, date: '2026-07-01', note: '' },
    { id: 2, personId: 1, eventId: null, dir: 'out', amount: 500, date: '2026-07-02', note: '' },
  ];
  assert.ok(buildShareText(riyas, t0, 'en').includes('*Our balance is settled.*'));
  const tNeg = [{ id: 1, personId: 1, eventId: null, dir: 'in', amount: 500, date: '2026-07-01', note: '' }];
  assert.ok(buildShareText(riyas, tNeg, 'en').includes('*I have ₹500 to give you.*'));
});

/* ---------- home totals / pending ---------- */

ok('home totals split receive/give', () => {
  const t3 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 1500, date: null, note: '' },
    { id: 2, personId: 2, eventId: null, dir: 'in', amount: 800, date: null, note: '' },
  ];
  assert.strictEqual(bal(t3, 1), 1500);
  assert.strictEqual(bal(t3, 2), -800);
});

ok('pending: positive balance, not yet paid in event', () => {
  const ppl = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const t4 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: null, note: '' },
    { id: 2, personId: 2, eventId: null, dir: 'out', amount: 2000, date: null, note: '' },
    { id: 3, personId: 2, eventId: 9, dir: 'in', amount: 2000, date: null, note: '' },
    { id: 4, personId: 3, eventId: null, dir: 'in', amount: 300, date: null, note: '' },
  ];
  const paidIds = new Set(t4.filter((x) => x.eventId === 9).map((x) => x.personId));
  const pending = ppl.filter((p) => bal(t4, p.id) > 0 && !paidIds.has(p.id));
  assert.deepStrictEqual(pending.map((p) => p.id), [1]);
});

ok('dstr formats', () => {
  assert.strictEqual(dstr('2026-07-31', 'en'), '31 Jul 2026');
  assert.ok(dstr('2026-07-31', 'ml').length > 0);
  assert.strictEqual(dstr(null, 'en'), '');
});

/* ---------- v3: month bucketing ---------- */

ok('monthKey', () => {
  assert.strictEqual(monthKey('2026-07-31'), '2026-07');
  assert.strictEqual(monthKey(null), '');
});

ok('monthBuckets: 6 months ending at given month, oldest first', () => {
  const b = monthBuckets([], '2026-07-15', 6);
  assert.deepStrictEqual(
    b.map((x) => x.key),
    ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']
  );
});

ok('monthBuckets: crosses year boundary', () => {
  const b = monthBuckets([], '2026-02-01', 6);
  assert.deepStrictEqual(
    b.map((x) => x.key),
    ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
  );
});

ok('monthBuckets: sums in/out per month, ignores out-of-range', () => {
  const t5 = [
    { id: 1, personId: 1, eventId: null, dir: 'in', amount: 100, date: '2026-07-01', note: '' },
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 200, date: '2026-07-30', note: '' },
    { id: 3, personId: 1, eventId: null, dir: 'out', amount: 50, date: '2026-06-15', note: '' },
    { id: 4, personId: 1, eventId: null, dir: 'out', amount: 999, date: '2025-12-31', note: '' },
  ];
  const b = monthBuckets(t5, '2026-07-15', 6);
  const jul = b.find((x) => x.key === '2026-07');
  const jun = b.find((x) => x.key === '2026-06');
  assert.deepStrictEqual(jul, { key: '2026-07', in: 300, out: 0 });
  assert.deepStrictEqual(jun, { key: '2026-06', in: 0, out: 50 });
  assert.strictEqual(b.reduce((s, x) => s + x.in + x.out, 0), 350);
});

ok('monthTotals: current month only', () => {
  const t6 = [
    { id: 1, personId: 1, eventId: null, dir: 'in', amount: 100, date: '2026-07-01', note: '' },
    { id: 2, personId: 1, eventId: null, dir: 'out', amount: 40, date: '2026-07-02', note: '' },
    { id: 3, personId: 1, eventId: null, dir: 'in', amount: 999, date: '2026-06-30', note: '' },
  ];
  assert.deepStrictEqual(monthTotals(t6, '2026-07'), { in: 100, out: 40 });
});

/* ---------- v3: top balances ---------- */

ok('topBalances: sorted, capped, settled excluded', () => {
  const ppl = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id, name: 'P' + id, phone: '', created: null }));
  const t7 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 500, date: null, note: '' },
    { id: 2, personId: 2, eventId: null, dir: 'out', amount: 3000, date: null, note: '' },
    { id: 3, personId: 3, eventId: null, dir: 'out', amount: 1000, date: null, note: '' },
    { id: 4, personId: 4, eventId: null, dir: 'out', amount: 100, date: null, note: '' },
    { id: 5, personId: 5, eventId: null, dir: 'out', amount: 200, date: null, note: '' },
    { id: 6, personId: 6, eventId: null, dir: 'out', amount: 700, date: null, note: '' },
    { id: 7, personId: 7, eventId: null, dir: 'in', amount: 900, date: null, note: '' },
    // person 8 settled: in 100 + out 100
    { id: 8, personId: 8, eventId: null, dir: 'in', amount: 100, date: null, note: '' },
    { id: 9, personId: 8, eventId: null, dir: 'out', amount: 100, date: null, note: '' },
  ];
  const top = topBalances(ppl, t7, 5);
  assert.deepStrictEqual(
    top.receive.map((r) => r.person.id),
    [2, 3, 6, 1, 5] // top 5 of 6 positive, desc — id 4 (₹100) cut
  );
  assert.deepStrictEqual(top.give.map((r) => [r.person.id, r.b]), [[7, -900]]);
});

/* ---------- v3: payments filtering ---------- */

ok('filterPayments: only out, newest first', () => {
  const ppl = [
    { id: 1, name: 'Riyas', phone: '', created: null },
    { id: 2, name: 'Fathima', phone: '', created: null },
  ];
  const t8 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 100, date: '2026-01-01', note: '' },
    { id: 2, personId: 1, eventId: 4, dir: 'in', amount: 500, date: '2026-05-05', note: '' },
    { id: 3, personId: 2, eventId: null, dir: 'out', amount: 200, date: '2026-03-01', note: 'wedding' },
    { id: 4, personId: 1, eventId: null, dir: 'out', amount: 300, date: '2026-03-01', note: '' },
  ];
  const all = filterPayments(t8, ppl, '');
  assert.deepStrictEqual(all.map((x) => x.id), [4, 3, 1]); // no 'in', date desc then id desc
});

ok('filterPayments: matches person name and note, case-insensitive', () => {
  const ppl = [
    { id: 1, name: 'Riyas', phone: '', created: null },
    { id: 2, name: 'Fathima', phone: '', created: null },
  ];
  const t9 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 100, date: '2026-01-01', note: 'housewarming' },
    { id: 2, personId: 2, eventId: null, dir: 'out', amount: 200, date: '2026-02-01', note: 'wedding' },
  ];
  assert.deepStrictEqual(filterPayments(t9, ppl, 'RIY').map((x) => x.id), [1]);
  assert.deepStrictEqual(filterPayments(t9, ppl, 'wedd').map((x) => x.id), [2]);
  assert.deepStrictEqual(filterPayments(t9, ppl, 'house').map((x) => x.id), [1]);
  assert.deepStrictEqual(filterPayments(t9, ppl, 'zzz').map((x) => x.id), []);
});

console.log(`\n${n} checks passed`);
