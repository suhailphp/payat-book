import React from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { backupSignature, dstrFromMillis, serializeBackup } from '../lib';
import { exportBackup, pickBackup } from '../backup';
import {
  driveBackup,
  driveConnect,
  driveCurrentEmail,
  driveDisconnect,
  driveIsConnected,
  driveRestoreSession,
  driveSupported,
} from '../drive';
import { DRIVE_AUTO_INTERVAL_MS } from '../config/google';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Btn, Txt } from '../components/UI';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { DriveRestoreSheet } from '../sheets/DriveRestoreSheet';
import type { RootNav } from '../nav';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Txt
    w={700}
    size={13}
    color={C.inkSoft}
    style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}
  >
    {children}
  </Txt>
);

/* Full-screen backup page (reached from Settings). Everything backup-related
   lives here: local file Save/Restore and the optional Google Drive backup.
   The top status line tells the owner at a glance whether his book is safe. */
export function BackupScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, people, events, txns, invitations, meta, setMeta, restoreAll } = useData();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  /* ---------- local (this phone) ---------- */
  const doExport = async () => {
    try {
      await exportBackup(people, events, txns, invitations);
      await setMeta('lastBackup', String(Date.now()));
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
    await restoreAll(picked.people, picked.events, picked.txns, picked.invitations);
    toast(t('tRestored'));
  };

  /* ---------- Google Drive ---------- */
  const [driveConnected, setDriveConnected] = React.useState(false);
  const [driveEmail, setDriveEmail] = React.useState('');
  const [driveBusy, setDriveBusy] = React.useState(false);
  const [driveRestoreOpen, setDriveRestoreOpen] = React.useState(false);

  React.useEffect(() => {
    if (!driveSupported) return;
    let alive = true;
    (async () => {
      await driveRestoreSession();
      if (!alive) return;
      setDriveConnected(driveIsConnected());
      setDriveEmail(driveCurrentEmail() ?? meta.driveEmail ?? '');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const doConnect = async () => {
    if (driveBusy) return;
    setDriveBusy(true);
    try {
      const res = await driveConnect();
      if (res.ok) {
        await setMeta('driveEmail', res.email);
        setDriveConnected(true);
        setDriveEmail(res.email);
        toast(t('driveConnected'));
      } else if (res.reason !== 'cancelled') {
        toast(t('driveConnectFailed'));
      }
    } finally {
      setDriveBusy(false);
    }
  };

  const doDisconnect = async () => {
    if (driveBusy) return;
    setDriveBusy(true);
    try {
      await driveDisconnect();
      await setMeta('driveEmail', '');
      setDriveConnected(false);
      setDriveEmail('');
      toast(t('driveDisconnected'));
    } finally {
      setDriveBusy(false);
    }
  };

  const doDriveBackup = async () => {
    if (driveBusy) return;
    setDriveBusy(true);
    toast(t('driveBackingUp'));
    try {
      const json = serializeBackup(people, events, txns, invitations);
      const { folderId } = await driveBackup(json, people.length, meta.driveFolderId);
      await setMeta('driveFolderId', folderId);
      await setMeta('driveLastBackup', String(Date.now()));
      await setMeta('driveLastSig', backupSignature(people, events, txns, invitations));
      toast(t('driveBackedUp'));
    } catch {
      toast(t('driveBackupFailed'));
    } finally {
      setDriveBusy(false);
    }
  };

  /* ---------- glanceable protection status ---------- */
  const driveDays = meta.driveLastBackup
    ? Math.floor((Date.now() - Number(meta.driveLastBackup)) / DRIVE_AUTO_INTERVAL_MS)
    : null;
  let statusText: string;
  let statusOk = false;
  if (!driveSupported || !driveConnected) statusText = t('statusNotConnected');
  else if (driveDays == null) statusText = t('statusNever');
  else if (driveDays <= 0) {
    statusText = t('statusToday');
    statusOk = true;
  } else if (driveDays === 1) statusText = t('statusStaleDay');
  else statusText = tp('statusStaleDays', { n: driveDays });

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onBack={() => nav.goBack()} onGear={() => setSettingsOpen(true)} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 20, paddingBottom: 48 }}>
        {/* one line he can read at a glance */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: statusOk ? C.greenTint : C.goldSoft,
            borderColor: statusOk ? C.green : C.gold,
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 22,
          }}
        >
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: statusOk ? C.green : C.gold }} />
          <Txt w={700} size={15.5} color={statusOk ? C.greenDeep : C.ink} style={{ flex: 1 }}>
            {statusText}
          </Txt>
        </View>

        {/* a) this phone */}
        <SectionTitle>{t('backupThisPhone')}</SectionTitle>
        <Txt size={13.5} color={C.inkSoft} style={{ marginBottom: 8 }}>
          {t('backupHint')}
        </Txt>
        <Btn label={t('saveBackup')} onPress={doExport} />
        <Btn label={t('restore')} kind="ghost" onPress={doRestore} />
        <Txt size={13} color={C.inkSoft} num style={{ marginTop: 4 }}>
          {meta.lastBackup ? tp('lastBackup', { d: dstrFromMillis(Number(meta.lastBackup)) }) : t('noBackup')}
        </Txt>

        {/* b) google drive */}
        {driveSupported ? (
          <View style={{ marginTop: 28 }}>
            <SectionTitle>{t('backupDriveTitle')}</SectionTitle>
            {driveConnected ? (
              <>
                <Txt size={13.5} color={C.inkSoft} num numberOfLines={1} style={{ marginBottom: 4 }}>
                  {tp('driveConnectedAs', { email: driveEmail })}
                </Txt>
                <Txt size={13} color={C.inkSoft} num style={{ marginBottom: 8 }}>
                  {meta.driveLastBackup
                    ? tp('driveLastBackup', { d: dstrFromMillis(Number(meta.driveLastBackup)) })
                    : t('driveNever')}
                </Txt>
                <Btn label={t('driveBackupNow')} onPress={doDriveBackup} />
                <Btn label={t('driveRestore')} kind="ghost" onPress={() => setDriveRestoreOpen(true)} />
                <Btn label={t('driveDisconnect')} kind="ghost" onPress={doDisconnect} />
              </>
            ) : (
              <>
                <Btn label={t('driveConnect')} kind="gold" onPress={doConnect} />
                <Txt size={12.5} color={C.inkSoft} style={{ marginTop: 6 }}>
                  {t('driveScopeNote')}
                </Txt>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DriveRestoreSheet
        visible={driveRestoreOpen}
        folderId={meta.driveFolderId}
        onClose={() => setDriveRestoreOpen(false)}
      />
    </View>
  );
}
