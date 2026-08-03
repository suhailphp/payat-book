import React, { useEffect, useState } from 'react';
import { useData } from '../data';
import { today, Person } from '../lib';
import { Sheet } from '../components/Sheet';
import { DateField } from '../components/DateField';
import { Btn, Field } from '../components/UI';

/* Second step of "Add invitation": the host is already picked, this sheet
   takes the payat date (default today) and an optional note. */
export function InvitationSheet({
  host,
  onClose,
  onSave,
}: {
  host: Person | null;
  onClose: () => void;
  onSave: (date: string, note: string) => void;
}) {
  const { t, lang } = useData();
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (host) {
      setDate(today());
      setNote('');
    }
  }, [host]);

  return (
    <Sheet
      visible={!!host}
      onClose={onClose}
      title={host ? `${t('addInvitation')} — ${host.name}` : undefined}
      footer={<Btn label={t('addInvitation')} onPress={() => onSave(date, note.trim())} />}
    >
      <DateField label={t('invDate')} value={date} onChange={setDate} lang={lang} />
      <Field label={t('fNote')} value={note} onChangeText={setNote} placeholder={t('notePH')} />
    </Sheet>
  );
}
