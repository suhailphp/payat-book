/* Pure helpers ported from the PWA (docs/design/index.html) — kept free of
   native imports so they can be unit-tested in plain node. */

export type Person = { id: number; name: string; phone: string; ref: string; created: string | null };
export type PayatEvent = { id: number; title: string; date: string | null; type: string; status: string };
export type Txn = {
  id: number;
  personId: number;
  eventId: number | null;
  dir: 'in' | 'out';
  amount: number;
  date: string | null;
  note: string;
};

/* Indian digit grouping (1,00,000) done by hand so output is identical on
   every JS engine, matching the PWA's toLocaleString("en-IN"). */
const groupINR = (n: number): string => {
  const s = String(n);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
};

export const fmt = (n: number): string => '₹' + groupINR(Math.abs(Math.round(n)));

export const today = (): string => new Date().toISOString().slice(0, 10);

export const initials = (n: string): string =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/* balance: out = I gave them (they owe me, +).  in = they gave me (I owe them, −) */
export const bal = (txns: Txn[], pid: number): number =>
  txns.filter((x) => x.personId === pid).reduce((s, x) => s + (x.dir === 'out' ? x.amount : -x.amount), 0);

export const eventTotal = (txns: Txn[], eid: number): number =>
  txns.filter((x) => x.eventId === eid).reduce((s, x) => s + x.amount, 0);

/* A person's opening-balance entry — the txn whose note matches obNote (passed
   in both languages so a language switch doesn't hide it); earliest first when
   there are several. Used to prefill and update it in the edit-person sheet. */
export const findOpeningTxn = (txns: Txn[], personId: number, openingNotes: string[]): Txn | undefined =>
  txns
    .filter((x) => x.personId === personId && openingNotes.includes(x.note))
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.id - b.id)[0];

/* Display format is DD/MM/YYYY in both languages. Storage stays the
   normalized YYYY-MM-DD ISO string; lang is accepted for call-site
   compatibility but no longer affects the output. */
export const dstr = (iso: string | null | undefined, _lang?: string): string => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
};

/* DD/MM/YYYY from a millisecond timestamp, using local date parts
   (for the last-backup line, which stores Date.now()). */
export const dstrFromMillis = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/* Amount-suggestion chips: only offered when the prior balance runs in the
   payer's direction (they owe you and are giving, or you owe them and are paying). */
export const owedFor = (balance: number, dir: 'in' | 'out'): number =>
  dir === 'in' ? (balance > 0 ? balance : 0) : balance < 0 ? -balance : 0;

/* ---- v3 dashboard / payments helpers ---- */

export const monthKey = (iso: string | null | undefined): string => (iso || '').slice(0, 7);

export type MonthBucket = { key: string; in: number; out: number };

/* Last n calendar months ending at endIso's month, oldest first. */
export const monthBuckets = (txns: Txn[], endIso: string, n = 6): MonthBucket[] => {
  const [ey, em] = [Number(endIso.slice(0, 4)), Number(endIso.slice(5, 7))];
  const buckets: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m0 = em - 1 - i;
    const y = ey + Math.floor(m0 / 12);
    const m = ((m0 % 12) + 12) % 12;
    buckets.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, in: 0, out: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const x of txns) {
    const b = byKey.get(monthKey(x.date));
    if (b) b[x.dir === 'in' ? 'in' : 'out'] += x.amount;
  }
  return buckets;
};

export const monthTotals = (txns: Txn[], key: string): { in: number; out: number } =>
  txns.reduce(
    (s, x) => {
      if (monthKey(x.date) === key) s[x.dir === 'in' ? 'in' : 'out'] += x.amount;
      return s;
    },
    { in: 0, out: 0 }
  );

/* Overall position: totals to receive/give, people counts, and the net. */
export const totals = (
  people: Person[],
  txns: Txn[]
): { recv: number; give: number; cr: number; cg: number; net: number } => {
  let recv = 0,
    give = 0,
    cr = 0,
    cg = 0;
  for (const p of people) {
    const b = bal(txns, p.id);
    if (b > 0) {
      recv += b;
      cr++;
    } else if (b < 0) {
      give -= b;
      cg++;
    }
  }
  return { recv, give, cr, cg, net: recv - give };
};

export type RankedBalance = { person: Person; b: number };

/* Top positive balances (desc) and top negative balances (most owed first). */
export const topBalances = (
  people: Person[],
  txns: Txn[],
  n = 5
): { receive: RankedBalance[]; give: RankedBalance[] } => {
  const ranked = people.map((person) => ({ person, b: bal(txns, person.id) }));
  return {
    receive: ranked.filter((r) => r.b > 0).sort((a, b) => b.b - a.b).slice(0, n),
    give: ranked.filter((r) => r.b < 0).sort((a, b) => a.b - b.b).slice(0, n),
  };
};

/* All dir='out' txns newest first, filtered by person name or note. */
export const filterPayments = (txns: Txn[], people: Person[], q: string): Txn[] => {
  const needle = q.trim().toLowerCase();
  const nameOf = new Map(people.map((p) => [p.id, p.name.toLowerCase()]));
  return txns
    .filter((x) => x.dir === 'out')
    .filter(
      (x) =>
        !needle ||
        (nameOf.get(x.personId) || '').includes(needle) ||
        (x.note || '').toLowerCase().includes(needle)
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
};

/* Readable international phone display: "9715XXXXXXXX" → "+971 5X XXX XXXX".
   Groups the last 9 digits as 2-3-4; everything before is the country code. */
export const formatIntlPhone = (raw: string): string => {
  const d = (raw || '').replace(/[^\d]/g, '');
  if (d.length < 10) return d ? '+' + d : '';
  const cc = d.slice(0, -9);
  return `+${cc} ${d.slice(-9, -7)} ${d.slice(-7, -4)} ${d.slice(-4)}`;
};

/* ---- v6: payat invitations + reminders ---- */

export type Invitation = {
  id: number;
  hostId: number;
  date: string;
  note: string;
  status: string; // 'pending' | 'paid' | 'removed'
  notifIds: string; // JSON array of scheduled notification ids
  paidTxnId: number | null;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoShift = (dateIso: string, days: number): string => {
  const d = new Date(dateIso + 'T00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export type ReminderSpec = { date: string; kind: 'before' | 'day0' | 'after' };

/* Reminder plan for one invitation: one the day before, then daily from the
   payat date for 14 days. Past dates are filtered at scheduling time. */
export const reminderDates = (dateIso: string, maxDaily = 14): ReminderSpec[] => {
  const out: ReminderSpec[] = [{ date: isoShift(dateIso, -1), kind: 'before' }];
  for (let i = 0; i < maxDaily; i++) {
    out.push({ date: isoShift(dateIso, i), kind: i === 0 ? 'day0' : 'after' });
  }
  return out;
};

export type RelativeLabel =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'left'; d: number }
  | { kind: 'overdue'; d: number };

export const relativeInvLabel = (dateIso: string, todayIso: string): RelativeLabel => {
  const diff = Math.round((+new Date(dateIso + 'T00:00') - +new Date(todayIso + 'T00:00')) / 864e5);
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'tomorrow' };
  if (diff > 1) return { kind: 'left', d: diff };
  return { kind: 'overdue', d: -diff };
};

export const parseNotifIds = (json: string | null | undefined): string[] => {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

/* Closing an invitation (paid or removed): every scheduled reminder must be
   cancelled and the stored id list emptied. */
export const closeInvitation = (
  inv: Invitation,
  status: 'paid' | 'removed',
  paidTxnId: number | null = null
): { updated: Invitation; cancelIds: string[] } => ({
  updated: { ...inv, status, notifIds: '[]', paidTxnId: status === 'paid' ? paidTxnId : inv.paidTxnId },
  cancelIds: parseNotifIds(inv.notifIds),
});

export const pendingInvitations = (invs: Invitation[]): Invitation[] =>
  invs.filter((i) => i.status === 'pending').sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

/* Most urgent pending invitation, but only when overdue or within 7 days. */
export const urgentInvitation = (invs: Invitation[], todayIso: string): Invitation | null => {
  const first = pendingInvitations(invs)[0];
  if (!first) return null;
  const rel = relativeInvLabel(first.date, todayIso);
  return rel.kind === 'left' && rel.d > 7 ? null : first;
};

/* ---- v5: balance bubbles ---- */

export type BubbleItem = { id: number; name: string; b: number; d: number };

/* Up to n people with the largest absolute balances, sized
   d = 56 + 44·√(|bal| / maxAbs), clamped 56–100. Settled people excluded. */
export const bubbleItems = (people: Person[], txns: Txn[], n = 8): BubbleItem[] => {
  const ranked = people
    .map((person) => ({ person, b: bal(txns, person.id) }))
    .filter((r) => r.b !== 0)
    .sort((a, b) => Math.abs(b.b) - Math.abs(a.b))
    .slice(0, n);
  const maxAbs = Math.max(1, ...ranked.map((r) => Math.abs(r.b)));
  return ranked.map((r) => ({
    id: r.person.id,
    name: r.person.name,
    b: r.b,
    d: Math.max(56, Math.min(100, 56 + 44 * Math.sqrt(Math.abs(r.b) / maxAbs))),
  }));
};

/* Deterministic greedy circle packing: biggest first, each bubble takes the
   highest free position (then closest to the horizontal center), keeping a
   ≥gap px ring between circles and staying inside width×height (textPad
   reserves room for the name/amount under each circle). Bubbles that cannot
   fit are dropped — they are the smallest, placed last. */
export const packBubbles = <T extends { d: number }>(
  items: T[],
  width: number,
  height: number,
  gap = 10,
  textPad = 30
): (T & { x: number; y: number })[] => {
  const sorted = [...items].sort((a, b) => b.d - a.d);
  const placed: (T & { x: number; y: number })[] = [];
  const step = 8;
  for (const it of sorted) {
    const r = it.d / 2;
    let best: { x: number; y: number } | null = null;
    outer: for (let y = r + 2; y + r + textPad <= height; y += step) {
      const xs: number[] = [];
      for (let x = r + 2; x + r <= width - 2; x += step) xs.push(x);
      xs.sort((a, b) => Math.abs(a - width / 2) - Math.abs(b - width / 2));
      for (const x of xs) {
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.d / 2 + r + gap)) {
          best = { x, y };
          break outer;
        }
      }
    }
    if (best) placed.push({ ...it, x: best.x, y: best.y });
  }
  return placed;
};

/* ---- v5: waiting longest ---- */

export type WaitingRow = { person: Person; b: number; lastDate: string };

/* Unsettled people whose most recent entry is oldest; ties broken by
   absolute balance (largest first). */
export const waitingLongest = (people: Person[], txns: Txn[], n = 3): WaitingRow[] => {
  const rows: WaitingRow[] = [];
  for (const person of people) {
    const list = txns.filter((x) => x.personId === person.id);
    const b = list.reduce((s, x) => s + (x.dir === 'out' ? x.amount : -x.amount), 0);
    const lastDate = list.reduce((m, x) => (x.date && x.date > m ? x.date : m), '');
    if (b !== 0 && lastDate) rows.push({ person, b, lastDate });
  }
  rows.sort((a, b) => a.lastDate.localeCompare(b.lastDate) || Math.abs(b.b) - Math.abs(a.b));
  return rows.slice(0, n);
};

export const daysSince = (iso: string, todayIso: string): number =>
  Math.max(0, Math.floor((+new Date(todayIso + 'T00:00') - +new Date(iso + 'T00:00')) / 864e5));

/* Grammatical day-count label: the singular key for exactly one day
   ("1 day ago" / "1 day left"), the plural key with {d} otherwise (incl. 0). */
export const dayCountLabel = (
  d: number,
  singularKey: string,
  pluralKey: string,
  t: (k: string) => string,
  tp: (k: string, vars: Record<string, string | number>) => string
): string => (d === 1 ? t(singularKey) : tp(pluralKey, { d }));

/* ---- v4: search + pagination (pure, shared by SearchableList and the
   hosting screen's sections) ---- */

export const searchFilter = <T,>(data: T[], q: string, keys: string[]): T[] => {
  const needle = q.trim().toLowerCase();
  if (!needle) return data;
  return data.filter((item) =>
    keys.some((k) =>
      String((item as Record<string, unknown>)[k] ?? '')
        .toLowerCase()
        .includes(needle)
    )
  );
};

export const pageSlice = <T,>(data: T[], shown: number): { rows: T[]; hasMore: boolean } => ({
  rows: data.slice(0, Math.max(0, shown)),
  hasMore: data.length > shown,
});

export type Backup = {
  app: string;
  version: number;
  exported: string;
  people: Person[];
  events: PayatEvent[];
  txns: Txn[];
  invitations: Invitation[];
};

/* v4 payload: v3 shape + a `ref` on each person; the top-level key order is
   unchanged (v2 shape + invitations appended last) so the PWA's importer
   (which only reads people/events/txns) still accepts these files, and v2/v3
   files still restore here (missing ref → ''). */
export const serializeBackup = (
  people: Person[],
  events: PayatEvent[],
  txns: Txn[],
  invitations: Invitation[] = []
): string =>
  JSON.stringify(
    { app: 'payat-book', version: 4, exported: new Date().toISOString(), people, events, txns, invitations },
    null,
    1
  );

export const parseBackup = (raw: string): Backup | null => {
  try {
    const d = JSON.parse(raw);
    if (d.app !== 'payat-book' || !Array.isArray(d.people)) return null;
    return {
      app: d.app,
      version: d.version ?? 2,
      exported: d.exported ?? '',
      people: (d.people as any[]).map((p) => ({
        id: Number(p.id),
        name: String(p.name ?? ''),
        phone: String(p.phone ?? ''),
        /* v2/v3 files have no ref → '' */
        ref: String(p.ref ?? ''),
        created: p.created ?? null,
      })),
      events: ((d.events ?? []) as any[]).map((e) => ({
        id: Number(e.id),
        title: String(e.title ?? ''),
        date: e.date ?? null,
        type: e.type ?? 'hosted',
        status: e.status ?? 'open',
      })),
      txns: ((d.txns ?? []) as any[]).map((x) => ({
        id: Number(x.id),
        personId: Number(x.personId),
        eventId: x.eventId == null ? null : Number(x.eventId),
        dir: x.dir === 'out' ? 'out' : 'in',
        amount: Number(x.amount),
        date: x.date ?? null,
        note: String(x.note ?? ''),
      })),
      /* v2 files have no invitations — accept them without error */
      invitations: (Array.isArray(d.invitations) ? (d.invitations as any[]) : []).map((i) => ({
        id: Number(i.id),
        hostId: Number(i.hostId),
        date: String(i.date ?? ''),
        note: String(i.note ?? ''),
        status: i.status === 'paid' || i.status === 'removed' ? i.status : 'pending',
        notifIds: '[]', // ids from another install are meaningless here
        paidTxnId: i.paidTxnId == null ? null : Number(i.paidTxnId),
      })),
    };
  } catch {
    return null;
  }
};
