import React, { useEffect, useState } from 'react';
import { useData } from '../data';
import { today } from '../lib';
import { Sheet } from '../components/Sheet';
import { DateField } from '../components/DateField';
import { Btn, Field } from '../components/UI';
import { toast } from '../components/Toast';

/* "Host a payat": name + date → creates an open event. */
export function HostSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (eventId: number) => void;
}) {
  const { t, lang, addEvent } = useData();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDate(today());
    }
  }, [visible]);

  const save = async () => {
    const name = title.trim();
    if (!name) {
      toast(t('tNamePayat'));
      return;
    }
    const id = await addEvent(name, date || today());
    onClose();
    toast(t('tPayatAdded'));
    onCreated(id);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('hostBtn')} footer={<Btn label={t('create')} onPress={save} />}>
      <Field label={t('fPayatName')} value={title} onChangeText={setTitle} placeholder={t('payatNamePH')} autoFocus />
      <DateField label={t('fDate')} value={date} onChange={setDate} lang={lang} />
    </Sheet>
  );
}
