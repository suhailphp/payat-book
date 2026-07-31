import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from './db';
import { Lang, tFor, tpFor } from './i18n';
import type { PayatEvent, Person, Txn } from './lib';
import { today } from './lib';

type Data = {
  ready: boolean;
  people: Person[];
  events: PayatEvent[];
  txns: Txn[];
  meta: Record<string, string>;
  lang: Lang;
  t: (k: string) => string;
  tp: (k: string, vars: Record<string, string | number>) => string;
  setLang: (l: Lang) => Promise<void>;
  addPerson: (name: string, phone: string) => Promise<number>;
  editPerson: (id: number, name: string, phone: string) => Promise<void>;
  removePerson: (id: number) => Promise<void>;
  addEvent: (title: string, date: string) => Promise<number>;
  setEventStatus: (id: number, status: 'open' | 'closed') => Promise<void>;
  removeEvent: (id: number) => Promise<void>;
  addTxn: (t: Omit<Txn, 'id'>) => Promise<number>;
  removeTxn: (id: number) => Promise<void>;
  setMeta: (k: string, v: string) => Promise<void>;
  restoreAll: (people: Person[], events: PayatEvent[], txns: Txn[]) => Promise<void>;
  /* re-read everything from SQLite (used by the dev seed tool) */
  reload: () => Promise<void>;
};

const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<PayatEvent[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [meta, setMetaState] = useState<Record<string, string>>({});
  const [lang, setLangState] = useState<Lang>('en');

  const refresh = useCallback(async () => {
    const all = await db.loadAll();
    setPeople(all.people);
    setEvents(all.events);
    setTxns(all.txns);
    setMetaState(all.meta);
    return all;
  }, []);

  useEffect(() => {
    (async () => {
      await db.openDB();
      const all = await refresh();
      setLangState(all.meta.lang === 'ml' ? 'ml' : 'en');
      setReady(true);
    })();
  }, [refresh]);

  const value = useMemo<Data>(
    () => ({
      ready,
      people,
      events,
      txns,
      meta,
      lang,
      t: tFor(lang),
      tp: tpFor(lang),
      setLang: async (l) => {
        await db.setMetaValue('lang', l);
        setLangState(l);
        setMetaState((m) => ({ ...m, lang: l }));
      },
      addPerson: async (name, phone) => {
        const id = await db.insertPerson(name, phone, today());
        await refresh();
        return id;
      },
      editPerson: async (id, name, phone) => {
        await db.updatePerson(id, name, phone);
        await refresh();
      },
      removePerson: async (id) => {
        await db.deletePerson(id);
        await refresh();
      },
      addEvent: async (title, date) => {
        const id = await db.insertEvent(title, date);
        await refresh();
        return id;
      },
      setEventStatus: async (id, status) => {
        await db.setEventStatus(id, status);
        await refresh();
      },
      removeEvent: async (id) => {
        await db.deleteEvent(id);
        await refresh();
      },
      addTxn: async (t) => {
        const id = await db.insertTxn(t);
        await refresh();
        return id;
      },
      removeTxn: async (id) => {
        await db.deleteTxn(id);
        await refresh();
      },
      setMeta: async (k, v) => {
        await db.setMetaValue(k, v);
        setMetaState((m) => ({ ...m, [k]: v }));
      },
      restoreAll: async (p, e, x) => {
        await db.replaceAll(p, e, x);
        await refresh();
      },
      reload: async () => {
        await refresh();
      },
    }),
    [ready, people, events, txns, meta, lang, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const d = useContext(Ctx);
  if (!d) throw new Error('useData outside DataProvider');
  return d;
}
