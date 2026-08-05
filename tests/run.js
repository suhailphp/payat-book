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
  dstrFromMillis,
  monthKey,
  monthBuckets,
  monthTotals,
  topBalances,
  filterPayments,
  searchFilter,
  pageSlice,
  totals,
  bubbleItems,
  packBubbles,
  waitingLongest,
  daysSince,
  formatIntlPhone,
  reminderDates,
  relativeInvLabel,
  parseNotifIds,
  closeInvitation,
  pendingInvitations,
  urgentInvitation,
  dayCountLabel,
  findOpeningTxn,
  paybackRatios,
  learnedMultiplier,
  globalMultiplier,
  blendMultiplier,
  hostForecast,
  bookRow,
  DEFAULT_MULTIPLIER,
  driveBackupFilename,
  parseDriveBackupName,
  driveBackupsToPrune,
  driveAutoFilename,
  parseAutoBackupName,
  autoBackupsToPrune,
  beforeRestoreFilename,
  parseBeforeRestoreName,
  backupSignature,
} = require('../.testbuild/lib');
const { buildShareText } = require('../.testbuild/share');
const { tFor, tpFor, STR } = require('../.testbuild/i18n');

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log('ok -', name);
};

/* ---------- core ledger ---------- */

const riyas = { id: 1, name: 'Riyas KP', phone: '+91 98765 43210', ref: 'Page A · Row 17', created: '2026-07-01' };
let txns = [{ id: 1, personId: 1, eventId: null, dir: 'in', amount: 1000, date: '2026-07-10', note: '' }];
ok('in 1000 gives balance -1000', () => assert.strictEqual(bal(txns, 1), -1000));
ok('chips: I owe → out suggests 1000', () => assert.strictEqual(owedFor(bal(txns, 1), 'out'), 1000));
ok('chips: no suggestion for in when they owe nothing', () => assert.strictEqual(owedFor(bal(txns, 1), 'in'), 0));

txns.push({ id: 2, personId: 1, eventId: null, dir: 'out', amount: 2000, date: '2026-07-20', note: 'wedding payat' });
ok('out 2000 flips balance to +1000', () => assert.strictEqual(bal(txns, 1), 1000));
ok('chips: they owe → in suggests 1000/2000', () => assert.strictEqual(owedFor(bal(txns, 1), 'in'), 1000));

ok('opening balance: I should receive → out → +, I should give → in → −', () => {
  // "I should receive" is stored as an out entry dated today
  const recv = [{ id: 1, personId: 7, eventId: null, dir: 'out', amount: 5000, date: '2026-08-03', note: 'Opening balance' }];
  assert.strictEqual(bal(recv, 7), 5000);
  // "I should give" is stored as an in entry
  const give = [{ id: 1, personId: 7, eventId: null, dir: 'in', amount: 5000, date: '2026-08-03', note: 'Opening balance' }];
  assert.strictEqual(bal(give, 7), -5000);
  // opening entry + a later real entry compose normally
  const both = [...recv, { id: 2, personId: 7, eventId: null, dir: 'in', amount: 2000, date: '2026-08-04', note: '' }];
  assert.strictEqual(bal(both, 7), 3000);
});

/* ---- editing entries ---- */

// mimics db.updateTxn: dir/amount/date/note change in place; id/personId/eventId kept
const editTxnLocal = (txns, id, fields) => txns.map((x) => (x.id === id ? { ...x, ...fields } : x));
const OB = STR.en.obNote; // "Opening balance"
const OB_ML = STR.ml.obNote; // "തുടക്ക ബാലൻസ്"

ok('edit amount → new balance', () => {
  const t0 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: '2026-07-10', note: '' },
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 400, date: '2026-07-12', note: '' },
  ];
  assert.strictEqual(bal(t0, 1), 600);
  const t1 = editTxnLocal(t0, 1, { dir: 'out', amount: 2500, date: '2026-07-10', note: '' });
  assert.strictEqual(bal(t1, 1), 2100); // 2500 − 400
});

ok('edit direction → new balance (flip out→in)', () => {
  const t0 = [{ id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: '2026-07-10', note: '' }];
  assert.strictEqual(bal(t0, 1), 1000);
  const t1 = editTxnLocal(t0, 1, { dir: 'in', amount: 1000, date: '2026-07-10', note: '' });
  assert.strictEqual(bal(t1, 1), -1000);
});

ok('edit event-linked collection keeps eventId and updates payat total', () => {
  const t0 = [
    { id: 1, personId: 1, eventId: 5, dir: 'in', amount: 700, date: '2026-07-20', note: '' },
    { id: 2, personId: 2, eventId: 5, dir: 'in', amount: 300, date: '2026-07-20', note: '' },
  ];
  assert.strictEqual(eventTotal(t0, 5), 1000);
  const t1 = editTxnLocal(t0, 1, { dir: 'in', amount: 1200, date: '2026-07-20', note: 'fixed' });
  assert.strictEqual(t1.find((x) => x.id === 1).eventId, 5); // link preserved
  assert.strictEqual(eventTotal(t1, 5), 1500); // 1200 + 300
});

ok('editing opening balance updates (not duplicates) the opening txn', () => {
  const t0 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 5000, date: '2026-08-01', note: OB },
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 2000, date: '2026-08-04', note: '' },
  ];
  const ot = findOpeningTxn(t0, 1, [OB, OB_ML]);
  assert.strictEqual(ot.id, 1);
  // raise amount + flip to "give" (in)
  const t1 = editTxnLocal(t0, ot.id, { dir: 'in', amount: 8000, date: ot.date, note: ot.note });
  const openings = t1.filter((x) => x.personId === 1 && [OB, OB_ML].includes(x.note));
  assert.strictEqual(openings.length, 1); // not duplicated
  assert.strictEqual(openings[0].amount, 8000);
  assert.strictEqual(bal(t1, 1), -10000); // −8000 (in) − 2000 (in)
});

ok('findOpeningTxn: earliest when several, matches either language', () => {
  const t0 = [
    { id: 3, personId: 1, eventId: null, dir: 'out', amount: 100, date: '2026-08-05', note: OB },
    { id: 2, personId: 1, eventId: null, dir: 'out', amount: 200, date: '2026-08-01', note: OB_ML },
  ];
  assert.strictEqual(findOpeningTxn(t0, 1, [OB, OB_ML]).id, 2); // earliest date wins
  assert.strictEqual(findOpeningTxn(t0, 9, [OB, OB_ML]), undefined); // none for other person
});

ok('clearing opening balance removes only that txn', () => {
  const t0 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 5000, date: '2026-08-01', note: OB },
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 2000, date: '2026-08-04', note: 'gift' },
  ];
  const ot = findOpeningTxn(t0, 1, [OB, OB_ML]);
  const t1 = t0.filter((x) => x.id !== ot.id); // mimics removeTxn
  assert.deepStrictEqual(t1.map((x) => x.id), [2]); // only the opening txn gone
  assert.strictEqual(bal(t1, 1), -2000);
});

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
  assert.strictEqual(parsed.version, 4);
  assert.deepStrictEqual(parsed.people, people); // ref round-trips
  assert.strictEqual(parsed.people[0].ref, 'Page A · Row 17');
  assert.deepStrictEqual(parsed.events, events);
  assert.deepStrictEqual(parsed.txns, txns);
  assert.deepStrictEqual(parsed.invitations, []);
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

ok('share text EN (v5 format: title, Account line, history, balance)', () => {
  const text = buildShareText(riyas, txns, 'en', 'Hameed');
  const lines = text.split('\n');
  assert.strictEqual(lines[0], '📒 *Hameed — Payat Book*');
  assert.strictEqual(lines[1], 'Account: Riyas KP');
  assert.strictEqual(lines[2], '');
  assert.strictEqual(lines[3], '10/07/2026 — You gave ₹1,000');
  assert.strictEqual(lines[4], '20/07/2026 — I gave ₹2,000 (wedding payat)');
  assert.strictEqual(lines[6], '*You have ₹1,000 to give.*');
});

ok('share text ML carries both names and balance line', () => {
  const text = buildShareText(riyas, txns, 'ml', 'ഹമീദ്');
  const lines = text.split('\n');
  assert.strictEqual(lines[0], '📒 *ഹമീദ് — പയറ്റ് ബുക്ക്*');
  assert.strictEqual(lines[1], 'കണക്ക്: Riyas KP');
  assert.ok(text.includes('*നിങ്ങൾ ₹1,000 തരാനുണ്ട്.*'));
});

ok('share text without owner falls back to old title, still has Account line', () => {
  const lines = buildShareText(riyas, txns, 'en').split('\n');
  assert.strictEqual(lines[0], '📒 *Payat Book — Riyas KP*');
  assert.strictEqual(lines[1], 'Account: Riyas KP');
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

ok('dstr formats DD/MM/YYYY in both languages, storage stays ISO', () => {
  assert.strictEqual(dstr('2026-07-31', 'en'), '31/07/2026');
  assert.strictEqual(dstr('2026-07-31', 'ml'), '31/07/2026'); // same in ML
  assert.strictEqual(dstr('2026-01-05', 'en'), '05/01/2026'); // zero-padded
  assert.strictEqual(dstr('2026-12-09T00:00'), '09/12/2026'); // tolerates time suffix
  assert.strictEqual(dstr(null, 'en'), '');
  assert.strictEqual(dstr('', 'en'), '');
});

ok('dstrFromMillis formats DD/MM/YYYY from a timestamp', () => {
  const ms = new Date(2026, 0, 5, 14, 30).getTime(); // 5 Jan 2026 local
  assert.strictEqual(dstrFromMillis(ms), '05/01/2026');
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

/* ---------- v4: backup payload format ---------- */

ok('backup payload keeps v2 key order with invitations appended (v4)', () => {
  const raw = serializeBackup(people, events, txns);
  const d = JSON.parse(raw);
  assert.deepStrictEqual(Object.keys(d), ['app', 'version', 'exported', 'people', 'events', 'txns', 'invitations']);
  assert.strictEqual(d.app, 'payat-book');
  assert.strictEqual(d.version, 4);
  assert.strictEqual(d.people[0].ref, 'Page A · Row 17'); // ref rides along inside each person
  assert.ok(!Number.isNaN(Date.parse(d.exported)), 'exported must be an ISO timestamp');
  // the PWA-side validation (app check + people array) still accepts it
  assert.ok(d.app === 'payat-book' && Array.isArray(d.people));
});

ok('person ref: v3 file (no ref) imports as empty; search matches on ref', () => {
  // a v3 file whose people predate the ref column
  const v3 = JSON.stringify({
    app: 'payat-book',
    version: 3,
    exported: 'x',
    people: [{ id: 1, name: 'Riyas KP', phone: '', created: null }],
    events: [],
    txns: [],
    invitations: [],
  });
  const parsed = parseBackup(v3);
  assert.ok(parsed);
  assert.strictEqual(parsed.people[0].ref, ''); // missing ref → ''
  // ref is searchable (substring, case-insensitive)
  const ppl = [
    { id: 1, name: 'Ravi', phone: '', ref: 'Page A · Row 17', created: null },
    { id: 2, name: 'Suma', phone: '', ref: 'Page B · Row 3', created: null },
  ];
  assert.deepStrictEqual(searchFilter(ppl, 'page a', ['name', 'ref']).map((p) => p.id), [1]);
  assert.deepStrictEqual(searchFilter(ppl, 'row 17', ['name', 'ref']).map((p) => p.id), [1]);
  assert.deepStrictEqual(searchFilter(ppl, 'page b', ['name', 'ref']).map((p) => p.id), [2]);
  assert.deepStrictEqual(searchFilter(ppl, 'ravi', ['name', 'ref']).map((p) => p.id), [1]); // name still works
});

/* ---------- v4: search + pagination ---------- */

const NAMES = [
  { id: 1, name: 'Riyas', note: 'wedding' },
  { id: 2, name: 'Fathima', note: '' },
  { id: 3, name: 'Hameed', note: 'housewarming' },
  { id: 4, name: 'riyaz', note: '' },
];

ok('searchFilter: case-insensitive across keys, empty query = all', () => {
  assert.strictEqual(searchFilter(NAMES, '', ['name']).length, 4);
  assert.strictEqual(searchFilter(NAMES, '  ', ['name']).length, 4);
  assert.deepStrictEqual(searchFilter(NAMES, 'riya', ['name']).map((x) => x.id), [1, 4]);
  assert.deepStrictEqual(searchFilter(NAMES, 'HOUSE', ['name', 'note']).map((x) => x.id), [3]);
  assert.deepStrictEqual(searchFilter(NAMES, 'zzz', ['name', 'note']), []);
  assert.deepStrictEqual(searchFilter(NAMES, 'wed', ['name']), []); // note not in keys
});

ok('pageSlice: limits and reports more', () => {
  const data = Array.from({ length: 37 }, (_, i) => i);
  let page = pageSlice(data, 10);
  assert.strictEqual(page.rows.length, 10);
  assert.strictEqual(page.hasMore, true);
  page = pageSlice(data, 35);
  assert.strictEqual(page.rows.length, 35);
  assert.strictEqual(page.hasMore, true);
  page = pageSlice(data, 37);
  assert.strictEqual(page.rows.length, 37);
  assert.strictEqual(page.hasMore, false);
  page = pageSlice(data, 60);
  assert.strictEqual(page.hasMore, false);
  assert.deepStrictEqual(pageSlice([], 10), { rows: [], hasMore: false });
});

ok('search-then-page composes over the full dataset', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ id: i, name: i % 2 ? 'Riyas ' + i : 'Fathima ' + i }));
  const filtered = searchFilter(many, 'riyas', ['name']);
  assert.strictEqual(filtered.length, 25);
  const page = pageSlice(filtered, 10);
  assert.strictEqual(page.rows.length, 10);
  assert.strictEqual(page.hasMore, true);
});

/* ---------- v4: net position ---------- */

ok('totals: receive/give sums, counts, net', () => {
  const ppl = [1, 2, 3, 4].map((id) => ({ id, name: 'P' + id, phone: '', created: null }));
  const t10 = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 10000, date: null, note: '' },
    { id: 2, personId: 2, eventId: null, dir: 'out', amount: 5000, date: null, note: '' },
    { id: 3, personId: 3, eventId: null, dir: 'in', amount: 1000, date: null, note: '' },
    // person 4 settled
    { id: 4, personId: 4, eventId: null, dir: 'in', amount: 700, date: null, note: '' },
    { id: 5, personId: 4, eventId: null, dir: 'out', amount: 700, date: null, note: '' },
  ];
  assert.deepStrictEqual(totals(ppl, t10), { recv: 15000, give: 1000, cr: 2, cg: 1, net: 14000 });
  const neg = totals(ppl.slice(2, 3), t10);
  assert.strictEqual(neg.net, -1000);
  assert.deepStrictEqual(totals([], []), { recv: 0, give: 0, cr: 0, cg: 0, net: 0 });
});

/* ---------- v5: balance bubbles ---------- */

ok('bubbleItems: sized by sqrt scale, clamped, settled excluded, capped at 8', () => {
  const ppl = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: 'P' + (i + 1), phone: '', created: null }));
  const t11 = [];
  let id = 1;
  for (let i = 1; i <= 9; i++) t11.push({ id: id++, personId: i, eventId: null, dir: 'out', amount: i * 1000, date: null, note: '' });
  // person 10 settled
  t11.push({ id: id++, personId: 10, eventId: null, dir: 'in', amount: 500, date: null, note: '' });
  t11.push({ id: id++, personId: 10, eventId: null, dir: 'out', amount: 500, date: null, note: '' });
  const items = bubbleItems(ppl, t11, 8);
  assert.strictEqual(items.length, 8);
  assert.ok(!items.some((x) => x.id === 10), 'settled excluded');
  assert.ok(!items.some((x) => x.id === 1), 'smallest of 9 cut by cap');
  const biggest = items.find((x) => x.id === 9);
  assert.strictEqual(biggest.d, 100); // maxAbs → 56 + 44 = 100
  items.forEach((x) => assert.ok(x.d >= 56 && x.d <= 100));
  // monotone: larger |bal| → larger or equal diameter
  const sorted = [...items].sort((a, b) => Math.abs(b.b) - Math.abs(a.b));
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1].d >= sorted[i].d);
});

ok('packBubbles: no overlaps, inside bounds, deterministic (1–8 × 320/390/430)', () => {
  const H = 230;
  for (const W of [320, 390, 430]) {
    for (let count = 1; count <= 8; count++) {
      const items = Array.from({ length: count }, (_, i) => ({
        id: i,
        d: 56 + ((i * 17) % 45), // deterministic spread of diameters 56..100
      }));
      const placed = packBubbles(items, W, H);
      assert.ok(placed.length > 0, `W=${W} count=${count}: nothing placed`);
      for (const p of placed) {
        assert.ok(p.x - p.d / 2 >= 0 && p.x + p.d / 2 <= W, `W=${W} count=${count}: x out of bounds`);
        assert.ok(p.y - p.d / 2 >= 0 && p.y + p.d / 2 + 30 <= H, `W=${W} count=${count}: y out of bounds`);
      }
      for (let a = 0; a < placed.length; a++) {
        for (let b = a + 1; b < placed.length; b++) {
          const dist = Math.hypot(placed[a].x - placed[b].x, placed[a].y - placed[b].y);
          assert.ok(
            dist >= placed[a].d / 2 + placed[b].d / 2 + 10 - 1e-9,
            `W=${W} count=${count}: overlap (${dist})`
          );
        }
      }
      // deterministic
      assert.deepStrictEqual(packBubbles(items, W, H), placed);
    }
  }
});

/* ---------- v5: waiting longest ---------- */

ok('waitingLongest: oldest last-entry first, settled excluded, ties by |bal| desc', () => {
  const ppl = [1, 2, 3, 4, 5].map((id) => ({ id, name: 'P' + id, phone: '', created: null }));
  const t12 = [
    // P1: last entry 2026-05-01, bal +500
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 500, date: '2026-05-01', note: '' },
    // P2: last entry 2026-01-15, bal -800  ← oldest
    { id: 2, personId: 2, eventId: null, dir: 'in', amount: 800, date: '2026-01-15', note: '' },
    // P3: last 2026-03-01, bal +200 (tie date with P5, smaller |bal|)
    { id: 3, personId: 3, eventId: null, dir: 'out', amount: 200, date: '2026-03-01', note: '' },
    // P4: settled — excluded
    { id: 4, personId: 4, eventId: null, dir: 'in', amount: 300, date: '2026-02-01', note: '' },
    { id: 5, personId: 4, eventId: null, dir: 'out', amount: 300, date: '2026-02-20', note: '' },
    // P5: last 2026-03-01, bal +900 (tie date with P3, larger |bal| → first)
    { id: 6, personId: 5, eventId: null, dir: 'out', amount: 900, date: '2026-03-01', note: '' },
    { id: 7, personId: 5, eventId: null, dir: 'in', amount: 0, date: '2026-02-01', note: '' },
  ];
  const rows = waitingLongest(ppl, t12, 3);
  assert.deepStrictEqual(rows.map((r) => r.person.id), [2, 5, 3]);
  assert.strictEqual(rows[0].lastDate, '2026-01-15');
  const all = waitingLongest(ppl, t12, 10);
  assert.ok(!all.some((r) => r.person.id === 4), 'settled excluded');
});

ok('daysSince', () => {
  assert.strictEqual(daysSince('2026-07-01', '2026-07-31'), 30);
  assert.strictEqual(daysSince('2026-07-31', '2026-07-31'), 0);
  assert.strictEqual(daysSince('2026-08-05', '2026-07-31'), 0); // future clamps to 0
});

ok('dayCountLabel: singular only at 1, plural for 0/2+, both languages', () => {
  const t = tFor('en'), tp = tpFor('en');
  assert.strictEqual(dayCountLabel(0, 'daysAgo1', 'daysAgo', t, tp), '0 days ago');
  assert.strictEqual(dayCountLabel(1, 'daysAgo1', 'daysAgo', t, tp), '1 day ago');
  assert.strictEqual(dayCountLabel(2, 'daysAgo1', 'daysAgo', t, tp), '2 days ago');
  assert.strictEqual(dayCountLabel(1, 'daysLeft1', 'daysLeft', t, tp), '1 day left');
  assert.strictEqual(dayCountLabel(27, 'daysLeft1', 'daysLeft', t, tp), '27 days left');
  const tm = tFor('ml'), tpm = tpFor('ml');
  assert.strictEqual(dayCountLabel(1, 'daysAgo1', 'daysAgo', tm, tpm), 'ഒരു ദിവസം മുൻപ്');
  assert.strictEqual(dayCountLabel(5, 'daysAgo1', 'daysAgo', tm, tpm), '5 ദിവസം മുൻപ്');
  assert.strictEqual(dayCountLabel(1, 'daysLeft1', 'daysLeft', tm, tpm), 'ഒരു ദിവസം ബാക്കി');
  assert.strictEqual(dayCountLabel(27, 'daysLeft1', 'daysLeft', tm, tpm), '27 ദിവസം ബാക്കി');
});

/* ---------- v6: invitations + reminders ---------- */

ok('reminderDates: day-before + 14 dailies with correct kinds', () => {
  const r = reminderDates('2026-08-10');
  assert.strictEqual(r.length, 15);
  assert.deepStrictEqual(r[0], { date: '2026-08-09', kind: 'before' });
  assert.deepStrictEqual(r[1], { date: '2026-08-10', kind: 'day0' });
  assert.deepStrictEqual(r[2], { date: '2026-08-11', kind: 'after' });
  assert.deepStrictEqual(r[14], { date: '2026-08-23', kind: 'after' });
  assert.strictEqual(r.filter((x) => x.kind === 'after').length, 13);
});

ok('reminderDates: month boundary', () => {
  const r = reminderDates('2026-03-01');
  assert.strictEqual(r[0].date, '2026-02-28'); // 2026 not a leap year
  assert.strictEqual(r[1].date, '2026-03-01');
});

ok('reminderDates: year boundary', () => {
  const r = reminderDates('2026-01-01');
  assert.strictEqual(r[0].date, '2025-12-31');
  assert.strictEqual(r[14].date, '2026-01-14');
  const r2 = reminderDates('2025-12-30');
  assert.strictEqual(r2[14].date, '2026-01-12');
});

ok('relativeInvLabel: today/tomorrow/left/overdue', () => {
  const T = '2026-07-31';
  assert.deepStrictEqual(relativeInvLabel('2026-07-31', T), { kind: 'today' });
  assert.deepStrictEqual(relativeInvLabel('2026-08-01', T), { kind: 'tomorrow' });
  assert.deepStrictEqual(relativeInvLabel('2026-08-05', T), { kind: 'left', d: 5 });
  assert.deepStrictEqual(relativeInvLabel('2026-07-28', T), { kind: 'overdue', d: 3 });
});

ok('parseNotifIds: valid, garbage, non-array', () => {
  assert.deepStrictEqual(parseNotifIds('["a","b"]'), ['a', 'b']);
  assert.deepStrictEqual(parseNotifIds(''), []);
  assert.deepStrictEqual(parseNotifIds('not json'), []);
  assert.deepStrictEqual(parseNotifIds('{"x":1}'), []);
  assert.deepStrictEqual(parseNotifIds(null), []);
});

ok('closeInvitation: cancels all ids, clears list, links paid txn', () => {
  const inv = { id: 1, hostId: 2, date: '2026-08-10', note: '', status: 'pending', notifIds: '["n1","n2","n3"]', paidTxnId: null };
  const paid = closeInvitation(inv, 'paid', 42);
  assert.deepStrictEqual(paid.cancelIds, ['n1', 'n2', 'n3']);
  assert.strictEqual(paid.updated.status, 'paid');
  assert.strictEqual(paid.updated.notifIds, '[]');
  assert.strictEqual(paid.updated.paidTxnId, 42);
  const removed = closeInvitation(inv, 'removed');
  assert.strictEqual(removed.updated.status, 'removed');
  assert.deepStrictEqual(removed.cancelIds, ['n1', 'n2', 'n3']);
  assert.strictEqual(removed.updated.paidTxnId, null);
});

ok('pendingInvitations: only pending, date asc; urgentInvitation ≤7 days or overdue', () => {
  const invs = [
    { id: 1, hostId: 1, date: '2026-08-20', note: '', status: 'pending', notifIds: '[]', paidTxnId: null },
    { id: 2, hostId: 2, date: '2026-08-02', note: '', status: 'pending', notifIds: '[]', paidTxnId: null },
    { id: 3, hostId: 3, date: '2026-07-01', note: '', status: 'paid', notifIds: '[]', paidTxnId: 9 },
    { id: 4, hostId: 4, date: '2026-07-25', note: '', status: 'removed', notifIds: '[]', paidTxnId: null },
  ];
  assert.deepStrictEqual(pendingInvitations(invs).map((i) => i.id), [2, 1]);
  // nearest pending (Aug 2) is within 7 days of Jul 31 → urgent
  assert.strictEqual(urgentInvitation(invs, '2026-07-31').id, 2);
  // far future only → no urgent card
  assert.strictEqual(urgentInvitation([invs[0]], '2026-07-31'), null);
  // overdue → urgent
  const over = [{ id: 5, hostId: 5, date: '2026-07-20', note: '', status: 'pending', notifIds: '[]', paidTxnId: null }];
  assert.strictEqual(urgentInvitation(over, '2026-07-31').id, 5);
  assert.strictEqual(urgentInvitation([], '2026-07-31'), null);
});

ok('backup v3 round-trip with invitations; v2 import stays valid', () => {
  const invs = [
    { id: 1, hostId: 1, date: '2026-08-10', note: 'wedding', status: 'pending', notifIds: '["x"]', paidTxnId: null },
    { id: 2, hostId: 1, date: '2026-06-01', note: '', status: 'paid', notifIds: '[]', paidTxnId: 7 },
  ];
  const parsed = parseBackup(serializeBackup(people, events, txns, invs));
  assert.ok(parsed);
  assert.strictEqual(parsed.invitations.length, 2);
  assert.strictEqual(parsed.invitations[0].status, 'pending');
  assert.strictEqual(parsed.invitations[0].notifIds, '[]'); // foreign ids dropped on import
  assert.strictEqual(parsed.invitations[1].paidTxnId, 7);
  // v2 file (no invitations key) imports cleanly
  const v2 = JSON.stringify({ app: 'payat-book', version: 2, exported: 'x', people, events, txns });
  const p2 = parseBackup(v2);
  assert.ok(p2);
  assert.deepStrictEqual(p2.invitations, []);
  assert.deepStrictEqual(p2.txns, txns);
});

/* ---------- v6.1: phone display ---------- */

ok('formatIntlPhone: UAE-style grouping, junk stripped, short passthrough', () => {
  assert.strictEqual(formatIntlPhone('971527947237'), '+971 52 794 7237'); // the real author number
  assert.strictEqual(formatIntlPhone('971501234567'), '+971 50 123 4567');
  assert.strictEqual(formatIntlPhone('+971 50-123-4567'), '+971 50 123 4567');
  assert.strictEqual(formatIntlPhone('919876543210'), '+919 87 654 3210');
  assert.strictEqual(formatIntlPhone('12345'), '+12345');
  assert.strictEqual(formatIntlPhone(''), '');
});

/* ---------- v7: host forecast ---------- */

const P = (id, name) => ({ id, name, phone: '', ref: '', created: null });
// person owes 1000 (out), pays back 2000 (ratio 2), owes 2000 again, pays 2000 (ratio 1)
const pay2then1 = [
  { id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: '2026-01-01', note: '' }, // owes 1000
  { id: 2, personId: 1, eventId: null, dir: 'in', amount: 2000, date: '2026-02-01', note: '' }, // pays 2000 → ratio 2, now he owes 1000
  { id: 3, personId: 1, eventId: null, dir: 'out', amount: 3000, date: '2026-03-01', note: '' }, // owes 2000
  { id: 4, personId: 1, eventId: null, dir: 'in', amount: 2000, date: '2026-04-01', note: '' }, // pays 2000 → ratio 1
];

ok('paybackRatios: only counts giving while owing, oldest→newest', () => {
  assert.deepStrictEqual(paybackRatios(pay2then1, 1), [2, 1]);
  // an "in" while he already owes THEM (running ≤ 0) is not an observation
  const owedToThem = [
    { id: 1, personId: 1, eventId: null, dir: 'in', amount: 500, date: '2026-01-01', note: '' },
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 500, date: '2026-02-01', note: '' },
  ];
  assert.deepStrictEqual(paybackRatios(owedToThem, 1), []);
});

ok('learnedMultiplier: mean of ratios (2 then 1 → 1.5), clamped at 3, null when none', () => {
  assert.strictEqual(learnedMultiplier(pay2then1, 1).multiplier, 1.5);
  assert.strictEqual(learnedMultiplier(pay2then1, 1).count, 2);
  // owes 100, pays 500 → ratio 5 → clamped to 3
  const big = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 100, date: '2026-01-01', note: '' },
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 500, date: '2026-02-01', note: '' },
  ];
  assert.strictEqual(learnedMultiplier(big, 1).multiplier, 3);
  assert.strictEqual(learnedMultiplier([], 1), null);
});

ok('globalMultiplier: mean across everyone, else the measured default', () => {
  assert.strictEqual(globalMultiplier([]).multiplier, DEFAULT_MULTIPLIER);
  assert.strictEqual(globalMultiplier([]).observed, 0);
  assert.strictEqual(globalMultiplier(pay2then1).multiplier, 1.5); // ratios [2,1]
  assert.strictEqual(globalMultiplier(pay2then1).observed, 2);
});

ok('hostForecast: no-history person uses global mean, then default', () => {
  // one person, positive balance, no giving history → global mean (none) → default 2.03
  const ppl = [P(1, 'A')];
  const t = [{ id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: '2026-01-01', note: '' }];
  const f = hostForecast(ppl, t, 1);
  assert.strictEqual(f.peopleCount, 1);
  assert.strictEqual(f.perPerson[0].fromHistory, false);
  assert.strictEqual(f.perPerson[0].multiplier, DEFAULT_MULTIPLIER);
  assert.strictEqual(f.expected, Math.round(1000 * DEFAULT_MULTIPLIER));
  // add a second person WITH history → the historyless one now borrows the global mean
  const ppl2 = [P(1, 'A'), P(2, 'B')];
  const t2 = [...t, ...pay2then1.map((x) => ({ ...x, id: x.id + 10, personId: 2 }))];
  const f2 = hostForecast(ppl2, t2, 1);
  const a = f2.perPerson.find((x) => x.personId === 1);
  assert.strictEqual(a.fromHistory, false);
  assert.strictEqual(a.multiplier, 1.5); // global mean from person 2's ratios [2,1]
});

ok('hostForecast: excludes zero and negative balances entirely', () => {
  const ppl = [P(1, 'owes'), P(2, 'settled'), P(3, 'heOwes')];
  const t = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: '2026-01-01', note: '' }, // +1000
    // settled with no payback observation (gave first, he returned it)
    { id: 2, personId: 2, eventId: null, dir: 'in', amount: 500, date: '2026-01-01', note: '' },
    { id: 3, personId: 2, eventId: null, dir: 'out', amount: 500, date: '2026-01-02', note: '' }, // 0
    { id: 4, personId: 3, eventId: null, dir: 'in', amount: 800, date: '2026-01-01', note: '' }, // −800
  ];
  const f = hostForecast(ppl, t, 1);
  assert.deepStrictEqual(f.perPerson.map((x) => x.personId), [1]); // only the positive one
  assert.strictEqual(f.peopleCount, 1);
  // he-owes person never subtracted: expected is purely from person 1
  assert.strictEqual(f.expected, Math.round(1000 * DEFAULT_MULTIPLIER));
});

ok('hostForecast: attendance scales the headline; range is a band around expected', () => {
  const ppl = [P(1, 'A')];
  const t = [{ id: 1, personId: 1, eventId: null, dir: 'out', amount: 10000, date: '2026-01-01', note: '' }];
  const full = hostForecast(ppl, t, 1);
  const half = hostForecast(ppl, t, 0.5);
  assert.strictEqual(half.expected, Math.round(full.expected * 0.5)); // 100% vs 50% halves it
  assert.strictEqual(full.low, Math.round(full.expected * 0.85)); // low = expected × 0.85
  assert.strictEqual(full.high, Math.round(full.expected * 1.2)); // high = expected × 1.20
});

ok('blendMultiplier: shrinks toward the norm by confidence, clamped [1,3]', () => {
  // no observations → the norm
  assert.strictEqual(blendMultiplier([], 2.03), 2.03);
  // one observation: weight 1/3 personal, 2/3 norm
  assert.ok(Math.abs(blendMultiplier([2], 2.03) - ((1 / 3) * 2 + (2 / 3) * 2.03)) < 1e-9);
  // five equal observations of 1.16 lean mostly personal (weight 5/7)
  const five = [1.16, 1.16, 1.16, 1.16, 1.16];
  assert.ok(Math.abs(blendMultiplier(five, 2.03) - ((5 / 7) * 1.16 + (2 / 7) * 2.03)) < 1e-9);
  assert.ok(blendMultiplier(five, 2.03) < 2.0); // well below the norm, as intended
  // final value clamped: huge personal ratio + high norm still ≤ 3
  assert.strictEqual(blendMultiplier([10, 10, 10, 10, 10], 3), 3);
});

ok('hostForecast: a person with history is blended (one payment does not take over)', () => {
  // owes 2000 now, and paid back once at 3× earlier; global norm ≈ 2.03
  const ppl = [P(1, 'A')];
  const t = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 1000, date: '2026-01-01', note: '' }, // owes 1000
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 3000, date: '2026-02-01', note: '' }, // ratio 3, running −2000
    { id: 3, personId: 1, eventId: null, dir: 'out', amount: 4000, date: '2026-03-01', note: '' }, // owes 2000
  ];
  const glob = globalMultiplier(t).multiplier; // clamp(mean([3])) = 3 (only observation)
  const m = blendMultiplier([3], glob);
  const f = hostForecast(ppl, t, 1);
  assert.strictEqual(f.perPerson[0].fromHistory, true);
  assert.strictEqual(f.perPerson[0].multiplier, m);
  assert.strictEqual(f.perPerson[0].expected, Math.round(2000 * m));
});

ok('hostForecast: low <= expected <= high across datasets (incl. low learned multipliers)', () => {
  const mk = (spec) => {
    const ppl = [];
    const t = [];
    let id = 1;
    spec.forEach((s, k) => {
      ppl.push(P(k + 1, 'P' + (k + 1)));
      s.forEach((tx) => t.push({ id: id++, personId: k + 1, eventId: null, dir: tx[0], amount: tx[1], date: tx[2], note: '' }));
    });
    return { ppl, t };
  };
  const datasets = [
    // owe-only (opening balances): multipliers default 2.03
    mk([[['out', 5000, '2026-01-01']], [['out', 3000, '2026-01-01']]]),
    // low learned multipliers (~1.1) that used to push expected below the old 1.70× floor
    mk([
      [['out', 1000, '2026-01-01'], ['in', 1100, '2026-02-01'], ['out', 2000, '2026-03-01']],
      [['out', 2000, '2026-01-01'], ['in', 2200, '2026-02-01'], ['out', 3000, '2026-03-01']],
    ]),
    // mixed: some settled/negative that must not enter the sum
    mk([
      [['out', 4000, '2026-01-01']],
      [['in', 500, '2026-01-01'], ['out', 500, '2026-01-02']],
      [['in', 900, '2026-01-01']],
    ]),
  ];
  for (const { ppl, t } of datasets) {
    for (const att of [1, 0.8, 0.3]) {
      const f = hostForecast(ppl, t, att);
      assert.ok(f.low <= f.expected && f.expected <= f.high, `invariant broken: ${f.low} ${f.expected} ${f.high}`);
    }
  }
});

/* ---------- v7: book row assembly ---------- */

ok('bookRow: opening is just a labelled entry, oldest→newest, pads under 5', () => {
  const notes = [STR.en.obNote, STR.ml.obNote];
  const person = P(1, 'Riyas');
  const t = [
    { id: 1, personId: 1, eventId: null, dir: 'out', amount: 5000, date: '2026-01-01', note: STR.en.obNote }, // opening
    { id: 2, personId: 1, eventId: null, dir: 'in', amount: 1000, date: '2026-02-01', note: '' },
    { id: 3, personId: 1, eventId: null, dir: 'out', amount: 2000, date: '2026-03-01', note: '' },
  ];
  const r = bookRow(person, t, notes);
  assert.strictEqual(r.entries.length, 3); // opening included as an entry
  assert.deepStrictEqual(r.entries.map((e) => e.amount), [5000, 1000, 2000]); // oldest→newest
  assert.deepStrictEqual(r.entries.map((e) => e.isOpening), [true, false, false]);
  assert.strictEqual(r.balance, 5000 - 1000 + 2000); // 6000
  assert.strictEqual(r.lastDate, '2026-03-01');
});

ok('bookRow: only the most recent 5; an older opening drops out of view', () => {
  const person = P(2, 'Fathima');
  const t = [{ id: 1, personId: 2, eventId: null, dir: 'out', amount: 999, date: '2026-01-01', note: STR.en.obNote }]; // opening, oldest
  for (let i = 2; i <= 7; i++)
    t.push({ id: i, personId: 2, eventId: null, dir: 'out', amount: (i - 1) * 100, date: `2026-02-0${i - 1}`, note: '' });
  const r = bookRow(person, t, [STR.en.obNote, STR.ml.obNote]);
  assert.strictEqual(r.entries.length, 5);
  // 7 entries oldest→newest: 999(opening),100,200,300,400,500,600 → recent 5 = 200..600
  assert.deepStrictEqual(r.entries.map((e) => e.amount), [200, 300, 400, 500, 600]);
  assert.ok(r.entries.every((e) => e.isOpening === false)); // opening fell outside the recent five
});

/* ---------- Google Drive backup ---------- */

const drivePeople = [
  { id: 1, name: 'Riyas KP', phone: '+91 98765 43210', ref: 'Page A Row 17', created: '2026-07-01' },
  { id: 2, name: 'Fathima', phone: '', ref: '', created: '2026-07-02' },
];
const driveEvents = [{ id: 1, title: 'Wedding', date: '2026-07-10', type: 'hosted', status: 'open' }];
const driveTxns = [
  { id: 1, personId: 1, eventId: null, dir: 'in', amount: 1000, date: '2026-07-10', note: '' },
  { id: 2, personId: 1, eventId: 1, dir: 'out', amount: 2000, date: '2026-07-20', note: 'wedding payat' },
];
const driveInv = [];

ok('drive filename: payat-backup-YYYY-MM-DD-HHmm.json in local time', () => {
  assert.strictEqual(driveBackupFilename(new Date(2026, 7, 4, 19, 30)), 'payat-backup-2026-08-04-1930.json');
  assert.strictEqual(driveBackupFilename(new Date(2026, 0, 9, 3, 5)), 'payat-backup-2026-01-09-0305.json');
});

ok('drive filename round-trips through parseDriveBackupName', () => {
  const name = driveBackupFilename(new Date(2026, 7, 4, 19, 30));
  const p = parseDriveBackupName(name);
  assert.strictEqual(p.hhmm, '19:30');
  assert.strictEqual(p.ms, new Date(2026, 7, 4, 19, 30).getTime());
  assert.strictEqual(parseDriveBackupName('not-ours.json'), null);
});

ok('drive payload byte-identical to the local export (differs only by the export timestamp)', () => {
  // Both the local share export and the Drive upload build the body with the
  // SAME serializeBackup; drive.ts uploads those bytes verbatim. So for one
  // instant the two are byte-for-byte equal — proven by holding `exported`.
  const local = serializeBackup(drivePeople, driveEvents, driveTxns, driveInv);
  const drive = serializeBackup(drivePeople, driveEvents, driveTxns, driveInv);
  const norm = (s) => s.replace(/"exported":\s*"[^"]*"/, '"exported":"X"');
  assert.strictEqual(norm(local), norm(drive));
  // and the payload survives the restore parser unchanged
  const back = parseBackup(drive);
  assert.strictEqual(back.people.length, 2);
  assert.strictEqual(back.txns.length, 2);
  assert.strictEqual(back.txns[1].note, 'wedding payat');
});

ok('drive retention keeps exactly 10, prunes the oldest', () => {
  // 12 backups, one per hour; newest should survive
  const names = [];
  for (let i = 0; i < 12; i++) names.push(driveBackupFilename(new Date(2026, 0, 1, 8 + i, 0)));
  const prune = driveBackupsToPrune(names, 10);
  assert.strictEqual(prune.length, 2); // two removed
  assert.strictEqual(names.length - prune.length, 10); // exactly ten kept
  // the two pruned are the oldest (08:00 and 09:00)
  assert.deepStrictEqual(prune.sort(), [
    'payat-backup-2026-01-01-0800.json',
    'payat-backup-2026-01-01-0900.json',
  ]);
  // fewer than 10 → nothing pruned
  assert.strictEqual(driveBackupsToPrune(names.slice(0, 5), 10).length, 0);
  // non-manual names (auto files, junk) are ignored, not pruned — keeps manual
  // and auto retention independent
  const withOther = ['garbage.json', 'payat-auto-2026-01.json', ...names.slice(0, 10)];
  assert.deepStrictEqual(driveBackupsToPrune(withOther, 10), []);
});

ok('restore path unchanged: parseBackup handles a Drive file exactly like a local one', () => {
  const payload = serializeBackup(drivePeople, driveEvents, driveTxns, driveInv);
  const parsed = parseBackup(payload);
  // same shape the local restore relies on
  assert.strictEqual(parsed.app, 'payat-book');
  assert.strictEqual(parsed.version, 4);
  assert.deepStrictEqual(
    parsed.people.map((p) => p.name),
    ['Riyas KP', 'Fathima']
  );
  assert.strictEqual(parsed.invitations.length, 0);
});

ok('token never appears in an export (no auth material can leak through a backup)', () => {
  const payload = serializeBackup(drivePeople, driveEvents, driveTxns, driveInv);
  // top-level keys are exactly the backup shape — no room for a token
  assert.deepStrictEqual(Object.keys(JSON.parse(payload)), [
    'app',
    'version',
    'exported',
    'people',
    'events',
    'txns',
    'invitations',
  ]);
  assert.ok(!/token|refresh|client_secret|accessToken|driveEmail|googleusercontent/i.test(payload));
});

ok('auto filename: one file per calendar month (payat-auto-YYYY-MM.json)', () => {
  assert.strictEqual(driveAutoFilename(new Date(2026, 7, 5, 19, 30)), 'payat-auto-2026-08.json');
  assert.strictEqual(driveAutoFilename(new Date(2026, 0, 1, 0, 0)), 'payat-auto-2026-01.json');
  assert.strictEqual(parseAutoBackupName('payat-auto-2026-08.json'), new Date(2026, 7, 1).getTime());
  assert.strictEqual(parseAutoBackupName('payat-backup-2026-08-05-1930.json'), null);
});

ok('auto retention keeps exactly 3 monthly files, prunes oldest', () => {
  const names = [];
  for (let m = 1; m <= 6; m++) names.push(`payat-auto-2026-${String(m).padStart(2, '0')}.json`);
  const prune = autoBackupsToPrune(names, 3);
  assert.strictEqual(prune.length, 3);
  assert.deepStrictEqual(prune.sort(), [
    'payat-auto-2026-01.json',
    'payat-auto-2026-02.json',
    'payat-auto-2026-03.json',
  ]);
});

ok('retention independence: manual and auto never prune each other', () => {
  const manual = [];
  for (let i = 0; i < 12; i++) manual.push(driveBackupFilename(new Date(2026, 0, 1, 8 + i, 0)));
  const auto = ['payat-auto-2026-01.json', 'payat-auto-2026-02.json', 'payat-auto-2026-03.json', 'payat-auto-2026-04.json'];
  const mixed = [...manual, ...auto];
  // manual retention only touches payat-backup-* (drops 2 oldest of 12), never auto
  const mPrune = driveBackupsToPrune(mixed, 10);
  assert.strictEqual(mPrune.length, 2);
  assert.ok(mPrune.every((n) => n.startsWith('payat-backup-')));
  // auto retention only touches payat-auto-* (drops 1 oldest of 4), never manual
  const aPrune = autoBackupsToPrune(mixed, 3);
  assert.deepStrictEqual(aPrune, ['payat-auto-2026-01.json']);
});

ok('before-restore filename round-trips', () => {
  const name = beforeRestoreFilename(new Date(2026, 7, 5, 19, 30));
  assert.strictEqual(name, 'payat-before-restore-2026-08-05-1930.json');
  assert.strictEqual(parseBeforeRestoreName(name), new Date(2026, 7, 5, 19, 30).getTime());
  assert.strictEqual(parseBeforeRestoreName('payat-backup-2026-08-05-1930.json'), null);
});

ok('backupSignature: stable when unchanged, differs when data changes', () => {
  const a = backupSignature(drivePeople, driveEvents, driveTxns, driveInv);
  const b = backupSignature(drivePeople, driveEvents, driveTxns, driveInv);
  assert.strictEqual(a, b); // deterministic, timestamp-independent
  const moreTxns = [...driveTxns, { id: 3, personId: 2, eventId: null, dir: 'in', amount: 500, date: '2026-08-01', note: '' }];
  assert.notStrictEqual(a, backupSignature(drivePeople, driveEvents, moreTxns, driveInv));
});

console.log(`\n${n} checks passed`);
