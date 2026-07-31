import React from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { exportBackup, pickBackup } from '../backup';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Btn, Field, Seg, Txt } from '../components/UI';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, tp, lang, setLang, people, events, txns, meta, setMeta, restoreAll, reload } = useData();
  const [seeding, setSeeding] = React.useState(false);

  /* dev-only: seed sample data so pagination/search/bubbles can be verified */
  const doSeed = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const { seedSampleData } = await import('../dev/seed');
      await seedSampleData();
      await reload();
      toast('Seeded 30 people + entries');
    } finally {
      setSeeding(false);
    }
  };
  const [name, setName] = React.useState(meta.ownerName ?? '');

  React.useEffect(() => {
    if (visible) setName(meta.ownerName ?? '');
  }, [visible, meta.ownerName]);

  const saveName = async () => {
    const n = name.trim();
    if (!n || n === meta.ownerName) return;
    await setMeta('ownerName', n);
    toast(t('tSaved'));
  };

  const doExport = async () => {
    try {
      await exportBackup(people, events, txns);
      await setMeta('lastBackup', String(Date.now()));
      onClose();
      toast(t('tBackupSaved'));
    } catch (e) {
      toast(tp('backupFailed', { e: String((e as Error)?.message ?? e) }));
    }
  };

  const doRestore = async () => {
    const picked = await pickBackup();
    if (picked === 'cancelled') return;
    if (!picked) {
      toast(t('tBadFile'));
      return;
    }
    const ok = await confirmSheet({
      message: tp('qRestore', { p: picked.people.length, t: picked.txns.length }),
      confirmLabel: t('qRestoreBtn'),
      destructive: false,
    });
    if (!ok) return;
    await restoreAll(picked.people, picked.events, picked.txns);
    onClose();
    toast(t('tRestored'));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('settingsT')}>
      <Field
        label={t('yourName')}
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        onSubmitEditing={saveName}
        autoCorrect={false}
      />
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
      {__DEV__ ? (
        <Btn label={seeding ? 'Seeding…' : 'Seed 30 sample people + entries'} kind="gold" onPress={doSeed} />
      ) : null}
      <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 14 }}>
        {meta.lastBackup
          ? tp('lastBackup', { d: new Date(Number(meta.lastBackup)).toLocaleDateString('en-IN') })
          : t('noBackup')}
      </Txt>
    </Sheet>
  );
}
