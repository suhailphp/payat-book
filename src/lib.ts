/* Pure helpers ported from the PWA (docs/design/index.html) — kept free of
   native imports so they can be unit-tested in plain node. */

export type Person = { id: number; name: string; phone: string; created: string | null };
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

export const dstr = (iso: string | null | undefined, lang: string): string => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00');
  try {
    return d.toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
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

export type Backup = {
  app: string;
  version: number;
  exported: string;
  people: Person[];
  events: PayatEvent[];
  txns: Txn[];
};

/* Same shape and field order as the PWA's doExport() so files move freely
   between the web app and this app. */
export const serializeBackup = (people: Person[], events: PayatEvent[], txns: Txn[]): string =>
  JSON.stringify({ app: 'payat-book', version: 2, exported: new Date().toISOString(), people, events, txns }, null, 1);

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
    };
  } catch {
    return null;
  }
};
