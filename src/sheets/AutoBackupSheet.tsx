import React from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { type AutoFreq, DEFAULT_AUTO_FREQ } from '../config/google';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Row, Txt } from '../components/UI';
import { CheckIcon } from '../components/Icons';

const OPTIONS: { value: AutoFreq; key: string }[] = [
  { value: 'off', key: 'autoOff' },
  { value: 'daily', key: 'autoDaily' },
  { value: 'weekly', key: 'autoWeekly' },
  { value: 'monthly', key: 'autoMonthly' },
];

/* Single-select cadence picker for the automatic Drive backup. */
export function AutoBackupSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, meta, setMeta } = useData();
  const current = (meta.autoBackupFreq as AutoFreq) ?? DEFAULT_AUTO_FREQ;

  const choose = async (v: AutoFreq) => {
    await setMeta('autoBackupFreq', v);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('autoBackupLbl')}>
      {OPTIONS.map((o, i) => (
        <Row key={o.value} last={i === OPTIONS.length - 1} onPress={() => choose(o.value)}>
          <Txt w={current === o.value ? 700 : 500} size={16.5} style={{ flex: 1 }}>
            {t(o.key)}
          </Txt>
          {current === o.value ? <CheckIcon size={20} color={C.green} /> : <View style={{ width: 20 }} />}
        </Row>
      ))}
    </Sheet>
  );
}
