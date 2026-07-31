import React from 'react';
import { Alert, View } from 'react-native';
import { useData } from '../data';
import { exportBackup, pickBackup } from '../backup';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Btn, Seg, Txt } from '../components/UI';
import { toast } from '../components/Toast';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, tp, lang, setLang, people, events, txns, meta, setMeta, restoreAll } = useData();

  const doExport = async () => {
    try {
      await exportBackup(people, events, txns);
      await setMeta('lastBackup', String(Date.now()));
      onClose();
      toast(t('tBackupSaved'));
    } catch {
      /* user cancelled share */
    }
  };

  const doRestore = async () => {
    const picked = await pickBackup();
    if (picked === 'cancelled') return;
    if (!picked) {
      toast(t('tBadFile'));
      return;
    }
    Alert.alert(
      t('restore'),
      tp('qRestore', { p: picked.people.length, t: picked.txns.length }),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            await restoreAll(picked.people, picked.events, picked.txns);
            onClose();
            toast(t('tRestored'));
          },
        },
      ]
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('settingsT')}>
      <View style={{ marginBottom: 14 }}>
        <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
          {t('language')}
        </Txt>
        <Seg
          options={[
            { value: 'en', label: 'English' },
            { value: 'ml', label: 'മലയാളം' },
          ]}
          value={lang}
          onChange={(v) => setLang(v as 'en' | 'ml')}
        />
      </View>
      <Txt size={13.5} color={C.inkSoft} style={{ marginBottom: 6 }}>
        {t('backupHint')}
      </Txt>
      <Btn label={t('saveBackup')} onPress={doExport} />
      <Btn label={t('restore')} kind="ghost" onPress={doRestore} />
      <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 14 }}>
        {meta.lastBackup
          ? tp('lastBackup', { d: new Date(Number(meta.lastBackup)).toLocaleDateString('en-IN') })
          : t('noBackup')}
      </Txt>
    </Sheet>
  );
}
