import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { findOpeningTxn, today, type Person } from '../lib';
import { STR } from '../i18n';
import { Sheet } from '../components/Sheet';
import { Btn, Field, Seg } from '../components/UI';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';

/* An opening balance is stored as a txn noted obNote; match either language so
   a language switch doesn't hide an existing one. */
const OB_NOTES = [STR.en.obNote, STR.ml.obNote];

/* Add / edit person sheet. `quiet` suppresses the "Person added" toast when
   the sheet is part of a picker chain (PWA's sheetAfterAdd behavior). */
export function PersonFormSheet({
  visible,
  onClose,
  person,
  quiet,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  person?: Person | null;
  quiet?: boolean;
  onSaved?: (id: number, isNew: boolean) => void;
  onDeleted?: () => void;
}) {
  const { t, txns, addPerson, editPerson, removePerson, addTxn, editTxn, removeTxn } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ref, setRef] = useState('');
  /* opening balance — offered on both create and edit */
  const [obAmount, setObAmount] = useState('');
  const [obDir, setObDir] = useState<'receive' | 'give'>('receive');

  useEffect(() => {
    if (visible) {
      setName(person?.name ?? '');
      setPhone(person?.phone ?? '');
      setRef(person?.ref ?? '');
      /* prefill from the person's existing opening txn, if any */
      const ot = person ? findOpeningTxn(txns, person.id, OB_NOTES) : undefined;
      setObAmount(ot ? String(ot.amount) : '');
      setObDir(ot && ot.dir === 'in' ? 'give' : 'receive');
    }
  }, [visible, person]);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast(t('tEnterName'));
      return;
    }
    /* "I should receive" runs in the out direction; "I should give" in the in. */
    const ob = parseInt((obAmount || '').replace(/[^\d]/g, ''), 10);
    const obTxnDir = obDir === 'receive' ? 'out' : 'in';
    if (person) {
      await editPerson(person.id, n, phone.trim(), ref.trim());
      /* update the existing opening txn, create one, or clear it — never touch
         the person's other entries. */
      const ot = findOpeningTxn(txns, person.id, OB_NOTES);
      if (ob) {
        if (ot) {
          await editTxn(ot.id, { dir: obTxnDir, amount: ob, date: ot.date, note: ot.note });
        } else {
          await addTxn({ personId: person.id, eventId: null, dir: obTxnDir, amount: ob, date: today(), note: t('obNote') });
        }
      } else if (ot) {
        await removeTxn(ot.id);
      }
      onClose();
      toast(t('tSaved'));
      onSaved?.(person.id, false);
    } else {
      const id = await addPerson(n, phone.trim(), ref.trim());
      /* record the opening balance as a dated entry so balance stays = Σ txns. */
      if (ob) {
        await addTxn({ personId: id, eventId: null, dir: obTxnDir, amount: ob, date: today(), note: t('obNote') });
      }
      onClose();
      if (!quiet) toast(t('tPersonAdded'));
      onSaved?.(id, true);
    }
  };

  const del = async () => {
    if (!person) return;
    if (!(await confirmSheet({ message: t('qDelPerson'), destructive: true }))) return;
    await removePerson(person.id);
    onClose();
    toast(t('tDeleted'));
    onDeleted?.();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={person ? t('editPerson') : t('addPerson')}
      footer={
        <>
          <Btn label={person ? t('saveChanges') : t('addPerson')} onPress={save} />
          {person ? <Btn label={t('delPerson')} kind="danger" onPress={del} /> : null}
        </>
      }
    >
      <Field label={t('fName')} value={name} onChangeText={setName} autoCorrect={false} />
      <Field
        label={t('fPhone')}
        hint={t('phoneHint')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
      />
      <Field
        label={t('reference')}
        value={ref}
        onChangeText={setRef}
        autoCorrect={false}
        placeholder={t('refPlaceholder')}
      />
      <Field
        label={t('openingBalance')}
        value={obAmount}
        onChangeText={setObAmount}
        keyboardType="number-pad"
        placeholder="0"
      />
      <View style={{ marginTop: -4, marginBottom: 14 }}>
        <Seg
          options={[
            { value: 'receive', label: t('obReceive') },
            { value: 'give', label: t('obGive') },
          ]}
          value={obDir}
          onChange={(v) => setObDir(v as 'receive' | 'give')}
        />
      </View>
    </Sheet>
  );
}
