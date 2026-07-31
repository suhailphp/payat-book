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
  assert.strictEqual(parsed.version, 3);
  assert.deepStrictEqual(parsed.people, people);
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
  assert.ok(lines[3].includes('You gave ₹1,000'));
  assert.ok(lines[4].includes('I gave ₹2,000 (wedding payat)'));
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

/* ---------- v4: backup payload format ---------- */

ok('backup payload keeps v2 key order with invitations appended (v3)', () => {
  const raw = serializeBackup(people, events, txns);
  const d = JSON.parse(raw);
  assert.deepStrictEqual(Object.keys(d), ['app', 'version', 'exported', 'people', 'events', 'txns', 'invitations']);
  assert.strictEqual(d.app, 'payat-book');
  assert.strictEqual(d.version, 3);
  assert.ok(!Number.isNaN(Date.parse(d.exported)), 'exported must be an ISO timestamp');
  // the PWA-side validation (app check + people array) still accepts it
  assert.ok(d.app === 'payat-book' && Array.isArray(d.people));
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

console.log(`\n${n} checks passed`);
