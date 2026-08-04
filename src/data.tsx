import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from './db';
import { Lang, tFor, tpFor } from './i18n';
import type { Invitation, PayatEvent, Person, Txn } from './lib';
import { closeInvitation, today } from './lib';
import { cancelReminders, scheduleInvitationReminders } from './notifications';

type Data = {
  ready: boolean;
  people: Person[];
  events: PayatEvent[];
  txns: Txn[];
  invitations: Invitation[];
  meta: Record<string, string>;
  lang: Lang;
  t: (k: string) => string;
  tp: (k: string, vars: Record<string, string | number>) => string;
  setLang: (l: Lang) => Promise<void>;
  addPerson: (name: string, phone: string, ref: string) => Promise<number>;
  editPerson: (id: number, name: string, phone: string, ref: string) => Promise<void>;
  removePerson: (id: number) => Promise<void>;
  addEvent: (title: string, date: string) => Promise<number>;
  setEventStatus: (id: number, status: 'open' | 'closed') => Promise<void>;
  removeEvent: (id: number) => Promise<void>;
  addTxn: (t: Omit<Txn, 'id'>) => Promise<number>;
  editTxn: (id: number, fields: { dir: 'in' | 'out'; amount: number; date: string | null; note: string }) => Promise<void>;
  removeTxn: (id: number) => Promise<void>;
  addInvitation: (hostId: number, date: string, note: string) => Promise<number>;
  /* paid (with optional linked txn) or removed — cancels all reminders */
  closeInv: (id: number, status: 'paid' | 'removed', paidTxnId?: number | null) => Promise<void>;
  setMeta: (k: string, v: string) => Promise<void>;
  restoreAll: (people: Person[], events: PayatEvent[], txns: Txn[], invitations: Invitation[]) => Promise<void>;
};

const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<PayatEvent[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [meta, setMetaState] = useState<Record<string, string>>({});
  const [lang, setLangState] = useState<Lang>('en');

  const refresh = useCallback(async () => {
    const all = await db.loadAll();
    setPeople(all.people);
    setEvents(all.events);
    setTxns(all.txns);
    setInvitations(all.invitations);
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
      invitations,
      meta,
      lang,
      t: tFor(lang),
      tp: tpFor(lang),
      setLang: async (l) => {
        await db.setMetaValue('lang', l);
        setLangState(l);
        setMetaState((m) => ({ ...m, lang: l }));
      },
      addPerson: async (name, phone, ref) => {
        const id = await db.insertPerson(name, phone, ref, today());
        await refresh();
        return id;
      },
      editPerson: async (id, name, phone, ref) => {
        await db.updatePerson(id, name, phone, ref);
        await refresh();
      },
      removePerson: async (id) => {
        /* cancel this person's invitation reminders before the cascade */
        for (const inv of invitations.filter((i) => i.hostId === id)) {
          await cancelReminders(inv.notifIds);
        }
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
      editTxn: async (id, fields) => {
        await db.updateTxn(id, fields);
        await refresh();
      },
      removeTxn: async (id) => {
        await db.deleteTxn(id);
        await refresh();
      },
      addInvitation: async (hostId, date, note) => {
        const hostName = people.find((p) => p.id === hostId)?.name ?? '';
        let notifIds: string[] = [];
        try {
          notifIds = await scheduleInvitationReminders(date, hostName, note, lang);
        } catch {
          /* permission missing or scheduling unavailable — invitation still saved */
        }
        const id = await db.insertInvitation(hostId, date, note, JSON.stringify(notifIds));
        await refresh();
        return id;
      },
      closeInv: async (id, status, paidTxnId = null) => {
        const inv = invitations.find((i) => i.id === id);
        if (!inv) return;
        const { updated, cancelIds } = closeInvitation(inv, status, paidTxnId);
        await cancelReminders(JSON.stringify(cancelIds));
        await db.updateInvitation(id, {
          status: updated.status,
          notifIds: updated.notifIds,
          paidTxnId: updated.paidTxnId,
        });
        await refresh();
      },
      setMeta: async (k, v) => {
        await db.setMetaValue(k, v);
        setMetaState((m) => ({ ...m, [k]: v }));
      },
      restoreAll: async (p, e, x, inv) => {
        /* cancel reminders belonging to the data being replaced */
        for (const old of invitations) {
          await cancelReminders(old.notifIds);
        }
        await db.replaceAll(p, e, x, inv);
        /* restored pending invitations get fresh reminders on this device */
        for (const i of inv.filter((v) => v.status === 'pending')) {
          try {
            const hostName = p.find((pp) => pp.id === i.hostId)?.name ?? '';
            const ids = await scheduleInvitationReminders(i.date, hostName, i.note, lang);
            await db.updateInvitation(i.id, { notifIds: JSON.stringify(ids) });
          } catch {
            /* reminders off — list still works */
          }
        }
        await refresh();
      },
    }),
    [ready, people, events, txns, invitations, meta, lang, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): Data {
  const d = useContext(Ctx);
  if (!d) throw new Error('useData outside DataProvider');
  return d;
}
