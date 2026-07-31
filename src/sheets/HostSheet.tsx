import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useData } from '../data';
import { dstr, today } from '../lib';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Btn, Field, Txt } from '../components/UI';
import { toast } from '../components/Toast';

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDate(today());
      setShowPicker(false);
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
    <Sheet visible={visible} onClose={onClose} title={t('hostBtn')}>
      <Field label={t('fPayatName')} value={title} onChangeText={setTitle} placeholder={t('payatNamePH')} autoFocus />
      <View style={{ marginBottom: 14 }}>
        <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
          {t('fDate')}
        </Txt>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={{
            backgroundColor: C.cotton,
            borderWidth: 1.5,
            borderColor: C.line,
            borderRadius: 12,
            paddingVertical: 13,
            paddingHorizontal: 14,
          }}
        >
          <Txt num>{dstr(date, lang)}</Txt>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={new Date(date + 'T00:00')}
            mode="date"
            onChange={(_e, d) => {
              setShowPicker(false);
              if (d) setDate(isoLocal(d));
            }}
          />
        ) : null}
      </View>
      <Btn label={t('create')} onPress={save} />
    </Sheet>
  );
}
