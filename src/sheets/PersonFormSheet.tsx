import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useData } from '../data';
import type { Person } from '../lib';
import { Sheet } from '../components/Sheet';
import { Btn, Field } from '../components/UI';
import { toast } from '../components/Toast';

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
  const { t, addPerson, editPerson, removePerson } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (visible) {
      setName(person?.name ?? '');
      setPhone(person?.phone ?? '');
    }
  }, [visible, person]);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      toast(t('tEnterName'));
      return;
    }
    if (person) {
      await editPerson(person.id, n, phone.trim());
      onClose();
      toast(t('tSaved'));
      onSaved?.(person.id, false);
    } else {
      const id = await addPerson(n, phone.trim());
      onClose();
      if (!quiet) toast(t('tPersonAdded'));
      onSaved?.(id, true);
    }
  };

  const del = () => {
    if (!person) return;
    Alert.alert(t('delPerson'), t('qDelPerson'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('delPerson'),
        style: 'destructive',
        onPress: async () => {
          await removePerson(person.id);
          onClose();
          toast(t('tDeleted'));
          onDeleted?.();
        },
      },
    ]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={person ? t('editPerson') : t('addPerson')}>
      <Field label={t('fName')} value={name} onChangeText={setName} autoCorrect={false} />
      <Field
        label={t('fPhone')}
        hint={t('phoneHint')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
      />
      <Btn label={person ? t('saveChanges') : t('addPerson')} onPress={save} />
      {person ? <Btn label={t('delPerson')} kind="danger" onPress={del} /> : null}
    </Sheet>
  );
}
