import React from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { dstrFromMillis } from '../lib';
import { listBeforeRestore, readBeforeRestore, type RecoverFile } from '../backup';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Empty, Row, Txt } from '../components/UI';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';

/* Picker over the silent "before restore" snapshots kept in app storage.
   Restores the chosen one through the normal restore path (which itself first
   snapshots the current book), so a recover can also be undone. */
export function RecoverSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, tp, people, txns, restoreAll } = useData();
  const [items, setItems] = React.useState<RecoverFile[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;
    let alive = true;
    listBeforeRestore().then((f) => {
      if (alive) setItems(f);
    });
    return () => {
      alive = false;
    };
  }, [visible]);

  const pick = async (item: RecoverFile) => {
    if (busy) return;
    setBusy(true);
    try {
      const backup = await readBeforeRestore(item.uri);
      if (!backup) {
        toast(t('tBadFile'));
        return;
      }
      const ok = await confirmSheet({
        message: tp('restoreConfirmWarn', {
          p: people.length,
          t: txns.length,
          bp: backup.people.length,
          bt: backup.txns.length,
        }),
        confirmLabel: t('restoreConfirmBtn'),
        destructive: true,
      });
      if (!ok) return;
      await restoreAll(backup.people, backup.events, backup.txns, backup.invitations);
      onClose();
      toast(t('tRestored'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('recoverPrev')}>
      {items.length === 0 ? (
        <Empty desc={t('driveNoBackup')} />
      ) : (
        items.map((it, i) => (
          <Row key={it.uri} last={i === items.length - 1} onPress={() => pick(it)}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt w={600} size={16} num>
                {it.people != null ? tp('driveBackupItem', { d: dstrFromMillis(it.ms), n: it.people }) : dstrFromMillis(it.ms)}
              </Txt>
            </View>
          </Row>
        ))
      )}
    </Sheet>
  );
}
