import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { bal, fmt, owedFor, today } from '../lib';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { DateField } from '../components/DateField';
import { Btn, ChipBtn, Field, Txt } from '../components/UI';
import { toast } from '../components/Toast';

export type EntryCtx = { personId: number; dir: 'in' | 'out'; eventId?: number };

/* Amount sheet: amount + close-balance/double suggestion chips, date, note. */
export function EntrySheet({
  ctx,
  onClose,
  onSaved,
}: {
  ctx: EntryCtx | null;
  onClose: () => void;
  onSaved?: (txnId: number) => void;
}) {
  const { t, tp, lang, people, txns, addTxn } = useData();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (ctx) {
      setAmount('');
      setDate(today());
      setNote('');
    }
  }, [ctx]);

  const p = ctx ? people.find((x) => x.id === ctx.personId) : null;
  if (!ctx || !p) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const b = bal(txns, p.id);
  const owed = owedFor(b, ctx.dir);

  const save = async () => {
    const amt = parseInt((amount || '').replace(/[^\d]/g, ''), 10);
    if (!amt) {
      toast(t('tEnterAmount'));
      return;
    }
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
  };

  return (
    <Sheet
      visible={!!ctx}
      onClose={onClose}
      title={ctx.dir === 'in' ? `${p.name} — ${t('theyGave')}` : `${t('iGave')} — ${p.name}`}
      footer={<Btn label={t('saveEntry')} onPress={save} />}
    >
      <Field
        label={t('fAmount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder="0"
        autoFocus
      />
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
