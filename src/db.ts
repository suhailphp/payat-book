import * as SQLite from 'expo-sqlite';
import type { Invitation, PayatEvent, Person, Txn } from './lib';

let db: SQLite.SQLiteDatabase | null = null;

export async function openDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('payatbook.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      created TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT,
      type TEXT DEFAULT 'hosted',
      status TEXT DEFAULT 'open'
    );
    CREATE TABLE IF NOT EXISTS txns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personId INTEGER NOT NULL,
      eventId INTEGER,
      dir TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT,
      note TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostId INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      notifIds TEXT DEFAULT '[]',
      paidTxnId INTEGER
    );
  `);
  return db;
}

const need = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error('DB not opened');
  return db;
};

export async function loadAll(): Promise<{
  people: Person[];
  events: PayatEvent[];
  txns: Txn[];
  invitations: Invitation[];
  meta: Record<string, string>;
}> {
  const d = need();
  const people = await d.getAllAsync<Person>('SELECT * FROM people');
  const events = await d.getAllAsync<PayatEvent>('SELECT * FROM events');
  const txns = await d.getAllAsync<Txn>('SELECT * FROM txns');
  const invitations = await d.getAllAsync<Invitation>('SELECT * FROM invitations');
  const metaRows = await d.getAllAsync<{ k: string; v: string }>('SELECT * FROM meta');
  const meta: Record<string, string> = {};
  metaRows.forEach((r) => (meta[r.k] = r.v));
  return { people, events, txns, invitations, meta };
}

export async function insertPerson(name: string, phone: string, created: string): Promise<number> {
  const r = await need().runAsync('INSERT INTO people (name, phone, created) VALUES (?, ?, ?)', name, phone, created);
  return r.lastInsertRowId;
}

export async function updatePerson(id: number, name: string, phone: string): Promise<void> {
  await need().runAsync('UPDATE people SET name = ?, phone = ? WHERE id = ?', name, phone, id);
}

export async function deletePerson(id: number): Promise<void> {
  await need().runAsync('DELETE FROM txns WHERE personId = ?', id);
  await need().runAsync('DELETE FROM invitations WHERE hostId = ?', id);
  await need().runAsync('DELETE FROM people WHERE id = ?', id);
}

export async function insertInvitation(hostId: number, date: string, note: string, notifIds: string): Promise<number> {
  const r = await need().runAsync(
    "INSERT INTO invitations (hostId, date, note, status, notifIds) VALUES (?, ?, ?, 'pending', ?)",
    hostId,
    date,
    note,
    notifIds
  );
  return r.lastInsertRowId;
}

export async function updateInvitation(
  id: number,
  fields: { status?: string; notifIds?: string; paidTxnId?: number | null }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (fields.status !== undefined) {
    sets.push('status = ?');
    args.push(fields.status);
  }
  if (fields.notifIds !== undefined) {
    sets.push('notifIds = ?');
    args.push(fields.notifIds);
  }
  if (fields.paidTxnId !== undefined) {
    sets.push('paidTxnId = ?');
    args.push(fields.paidTxnId);
  }
  if (!sets.length) return;
  await need().runAsync(`UPDATE invitations SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
}

export async function deleteInvitation(id: number): Promise<void> {
  await need().runAsync('DELETE FROM invitations WHERE id = ?', id);
}

export async function insertEvent(title: string, date: string): Promise<number> {
  const r = await need().runAsync(
    "INSERT INTO events (title, date, type, status) VALUES (?, ?, 'hosted', 'open')",
    title,
    date
  );
  return r.lastInsertRowId;
}

export async function setEventStatus(id: number, status: 'open' | 'closed'): Promise<void> {
  await need().runAsync('UPDATE events SET status = ? WHERE id = ?', status, id);
}

export async function deleteEvent(id: number): Promise<void> {
  await need().runAsync('DELETE FROM txns WHERE eventId = ?', id);
  await need().runAsync('DELETE FROM events WHERE id = ?', id);
}

export async function insertTxn(t: Omit<Txn, 'id'>): Promise<number> {
  const r = await need().runAsync(
    'INSERT INTO txns (personId, eventId, dir, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)',
    t.personId,
    t.eventId,
    t.dir,
    t.amount,
    t.date,
    t.note
  );
  return r.lastInsertRowId;
}

/* Correct an existing entry in place — keeps its id, personId and eventId so
   event links, ordering and balances stay consistent. */
export async function updateTxn(
  id: number,
  fields: { dir: 'in' | 'out'; amount: number; date: string | null; note: string }
): Promise<void> {
  await need().runAsync(
    'UPDATE txns SET dir = ?, amount = ?, date = ?, note = ? WHERE id = ?',
    fields.dir,
    fields.amount,
    fields.date,
    fields.note,
    id
  );
}

export async function deleteTxn(id: number): Promise<void> {
  await need().runAsync('DELETE FROM txns WHERE id = ?', id);
}

export async function setMetaValue(k: string, v: string): Promise<void> {
  await need().runAsync('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', k, v);
}

/* Restore: replace every table, keeping the backup's ids so txn → person/event
   references stay intact. */
export async function replaceAll(
  people: Person[],
  events: PayatEvent[],
  txns: Txn[],
  invitations: Invitation[] = []
): Promise<void> {
  const d = need();
  await d.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync('DELETE FROM txns; DELETE FROM events; DELETE FROM people; DELETE FROM invitations;');
    for (const p of people) {
      await tx.runAsync(
        'INSERT INTO people (id, name, phone, created) VALUES (?, ?, ?, ?)',
        p.id,
        p.name,
        p.phone ?? '',
        p.created ?? null
      );
    }
    for (const e of events) {
      await tx.runAsync(
        'INSERT INTO events (id, title, date, type, status) VALUES (?, ?, ?, ?, ?)',
        e.id,
        e.title,
        e.date ?? null,
        e.type ?? 'hosted',
        e.status ?? 'open'
      );
    }
    for (const x of txns) {
      await tx.runAsync(
        'INSERT INTO txns (id, personId, eventId, dir, amount, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
        x.id,
        x.personId,
        x.eventId ?? null,
        x.dir,
        x.amount,
        x.date ?? null,
        x.note ?? ''
      );
    }
    for (const i of invitations) {
      await tx.runAsync(
        'INSERT INTO invitations (id, hostId, date, note, status, notifIds, paidTxnId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        i.id,
        i.hostId,
        i.date,
        i.note ?? '',
        i.status ?? 'pending',
        i.notifIds ?? '[]',
        i.paidTxnId ?? null
      );
    }
  });
}
