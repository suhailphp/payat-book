import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { bal, fmt, owedFor, today, Txn } from '../lib';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { DateField } from '../components/DateField';
import { Btn, ChipBtn, Field, Seg, Txt } from '../components/UI';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';

/* `txn` present → edit an existing entry; otherwise add a new one in `dir`. */
export type EntryCtx = { personId: number; dir: 'in' | 'out'; eventId?: number; txn?: Txn };

/* Amount sheet: amount + close-balance/double suggestion chips, date, note.
   In edit mode it prefills the entry and adds a direction toggle + delete. */
export function EntrySheet({
  ctx,
  onClose,
  onSaved,
}: {
  ctx: EntryCtx | null;
  onClose: () => void;
  onSaved?: (txnId: number) => void;
}) {
  const { t, tp, lang, people, txns, addTxn, editTxn, removeTxn } = useData();
  const editing = !!ctx?.txn;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  /* editable direction (in = they gave me, out = I gave them); for a new entry
     it's fixed by which button opened the sheet, so the toggle only shows here. */
  const [dir, setDir] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (ctx) {
      if (ctx.txn) {
        setAmount(String(ctx.txn.amount));
        setDate(ctx.txn.date || today());
        setNote(ctx.txn.note);
        setDir(ctx.txn.dir);
      } else {
        setAmount('');
        setDate(today());
        setNote('');
        setDir(ctx.dir);
      }
    }
  }, [ctx]);

  const p = ctx ? people.find((x) => x.id === ctx.personId) : null;
  if (!ctx || !p) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  /* suggestion chips only help when adding: the balance already includes the
     entry being edited, so they'd be misleading in edit mode. */
  const owed = editing ? 0 : owedFor(bal(txns, p.id), ctx.dir);

  const save = async () => {
    const amt = parseInt((amount || '').replace(/[^\d]/g, ''), 10);
    if (!amt) {
      toast(t('tEnterAmount'));
      return;
    }
    if (ctx.txn) {
      await editTxn(ctx.txn.id, { dir, amount: amt, date: date || today(), note: note.trim() });
      onClose();
      toast(t('tEdited'));
      onSaved?.(ctx.txn.id);
    } else {
      const txnId = await addTxn({
        personId: ctx.personId,
        eventId: ctx.eventId ?? null,
        dir: ctx.dir,
        amount: amt,
        date: date || today(),
        note: note.trim(),
      });
      onClose();
      toast(t('tEntry'));
      onSaved?.(txnId);
    }
  };

  const del = async () => {
    if (!ctx.txn) return;
    if (!(await confirmSheet({ message: t('qDelEntry'), destructive: true }))) return;
    await removeTxn(ctx.txn.id);
    onClose();
    toast(t('tDeleted'));
  };

  const title = editing
    ? t('editEntry')
    : ctx.dir === 'in'
      ? `${p.name} — ${t('theyGave')}`
      : `${t('iGave')} — ${p.name}`;

  return (
    <Sheet
      visible={!!ctx}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn label={editing ? t('saveEdit') : t('saveEntry')} onPress={save} />
          {editing ? <Btn label={t('qDelete')} kind="danger" onPress={del} /> : null}
        </>
      }
    >
      <Field
        label={t('fAmount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder="0"
        autoFocus={!editing}
      />
      {editing ? (
        <View style={{ marginTop: -4, marginBottom: 14 }}>
          <Seg
            options={[
              { value: 'in', label: t('theyGave') },
              { value: 'out', label: t('iGave') },
            ]}
            value={dir}
            onChange={(v) => setDir(v as 'in' | 'out')}
          />
        </View>
      ) : null}
      {owed > 0 ? (
        <View style={{ marginTop: -6, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <ChipBtn label={`${fmt(owed)} · ${t('closeBal')}`} onPress={() => setAmount(String(owed))} />
            <ChipBtn label={`${fmt(owed * 2)} · ${t('double')}`} onPress={() => setAmount(String(owed * 2))} />
          </View>
          <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 8 }}>
            {ctx.dir === 'in'
              ? tp('hintOwesYou', { n: p.name, a: fmt(owed) })
              : tp('hintYouOwe', { n: p.name, a: fmt(owed) })}{' '}
            {t('hintDouble')}
          </Txt>
        </View>
      ) : null}
      <DateField label={t('fDate')} value={date} onChange={setDate} lang={lang} />
      <Field label={t('fNote')} value={note} onChangeText={setNote} placeholder={t('notePH')} />
    </Sheet>
  );
}
