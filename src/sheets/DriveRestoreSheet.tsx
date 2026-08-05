import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useData } from '../data';
import { dstrFromMillis } from '../lib';
import { driveDownload, driveList, type DriveBackupItem } from '../drive';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Empty, Row, Txt } from '../components/UI';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';

/* Lists the user's Drive backups (date + people count) and restores the chosen
   one through the EXISTING restore path (parseBackup → themed confirm →
   restoreAll) — the local restore logic is not forked. Every Drive call fails
   gracefully: a toast, never a crash or a blocking dialog. */
export function DriveRestoreSheet({
  visible,
  folderId,
  onClose,
}: {
  visible: boolean;
  folderId?: string | null;
  onClose: () => void;
}) {
  const { t, tp, people, txns, restoreAll } = useData();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<DriveBackupItem[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    setItems([]);
    driveList(folderId)
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch(() => {
        if (alive) {
          toast(t('driveUnreachable'));
          onClose();
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [visible, folderId]);

  const pick = async (item: DriveBackupItem) => {
    if (busy) return;
    setBusy(true);
    try {
      const backup = await driveDownload(item.id);
      if (!backup) {
        toast(t('driveUnreachable'));
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
    } catch {
      toast(t('driveUnreachable'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('drivePickBackup')}>
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={C.green} />
        </View>
      ) : items.length === 0 ? (
        <Empty desc={t('driveNoBackup')} />
      ) : (
        <>
          {items.map((it, i) => {
            const d = `${dstrFromMillis(it.ms)}${it.hhmm ? ` ${it.hhmm}` : ''}`;
            return (
              <Row key={it.id} last={i === items.length - 1} onPress={() => pick(it)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt w={600} size={16} num>
                    {it.people != null ? tp('driveBackupItem', { d, n: it.people }) : d}
                  </Txt>
                </View>
              </Row>
            );
          })}
        </>
      )}
    </Sheet>
  );
}
