import React from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import { backupSignature, dstrFromMillis, serializeBackup } from '../lib';
import { exportBackup, pickBackup } from '../backup';
import {
  driveConnect,
  driveCurrentEmail,
  driveDisconnect,
  driveIsConnected,
  driveRestoreSession,
  driveSupported,
  driveBackup,
} from '../drive';
import { DRIVE_AUTO_INTERVAL_MS } from '../config/google';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { Btn, Field, Seg, Txt } from '../components/UI';
import { InfoIcon } from '../components/Icons';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import { getPermissionGranted, notificationsSupported, requestPermission } from '../notifications';
import { appVersionLabel } from '../appVersion';
import { DriveRestoreSheet } from './DriveRestoreSheet';
import type { RootNav } from '../nav';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, setLang, people, events, txns, invitations, meta, setMeta, restoreAll } = useData();
  const [permGranted, setPermGranted] = React.useState(true);

  React.useEffect(() => {
    if (visible && notificationsSupported) getPermissionGranted().then(setPermGranted);
  }, [visible]);

  /* retry path when reminders were denied: re-ask, else open OS settings */
  const retryNotifications = async () => {
    const granted = await requestPermission();
    setPermGranted(granted);
    if (!granted) Linking.openSettings().catch(() => {});
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
      await exportBackup(people, events, txns, invitations);
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
    await restoreAll(picked.people, picked.events, picked.txns, picked.invitations);
    onClose();
    toast(t('tRestored'));
  };

  /* ---------- Google Drive backup (optional; native only) ---------- */
  const [driveConnected, setDriveConnected] = React.useState(false);
  const [driveEmail, setDriveEmail] = React.useState('');
  const [driveBusy, setDriveBusy] = React.useState(false);
  const [driveRestoreOpen, setDriveRestoreOpen] = React.useState(false);

  /* On open, restore any prior Google session silently so the account and
     tokens are ready, then reflect connection state. Fails closed (offline →
     shows whatever was last cached, no crash). */
  React.useEffect(() => {
    if (!visible || !driveSupported) return;
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
  }, [visible]);

  const driveStale = React.useMemo(() => {
    if (!driveConnected) return false;
    const last = Number(meta.driveLastBackup || 0);
    if (!last) return false; // never backed up → shown as its own line, not "stale"
    const changed = meta.driveLastSig !== backupSignature(people, events, txns, invitations);
    return changed || Date.now() - last > DRIVE_AUTO_INTERVAL_MS;
  }, [driveConnected, meta.driveLastBackup, meta.driveLastSig, people, events, txns, invitations]);

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

  return (
    <>
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

      {driveSupported ? (
        <View style={{ marginTop: 20 }}>
          <Txt w={700} size={13} color={C.inkSoft} style={{ letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            {t('driveSection')}
          </Txt>
          {driveConnected ? (
            <>
              <Txt size={13.5} color={C.inkSoft} num numberOfLines={1} style={{ marginBottom: 4 }}>
                {tp('driveConnectedAs', { email: driveEmail })}
              </Txt>
              <Txt size={13} color={driveStale ? C.gold : C.inkSoft} num style={{ marginBottom: 8 }}>
                {driveStale
                  ? t('driveStale')
                  : meta.driveLastBackup
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

      {notificationsSupported && !permGranted ? (
        <View style={{ marginTop: 10 }}>
          <Txt size={13.5} color={C.inkSoft}>
            {t('notifOff')}
          </Txt>
          <Btn label={t('notifExplain')} kind="gold" onPress={retryNotifications} />
        </View>
      ) : null}
      <Btn
        label={t('about')}
        kind="ghost"
        icon={<InfoIcon color={C.greenDeep} />}
        onPress={() => {
          onClose();
          nav.navigate('About');
        }}
      />
      <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 14 }}>
        {meta.lastBackup
          ? tp('lastBackup', { d: dstrFromMillis(Number(meta.lastBackup)) })
          : t('noBackup')}
      </Txt>
      <Txt size={12} color={C.inkSoft} num style={{ textAlign: 'center', marginTop: 18, opacity: 0.7 }}>
        {appVersionLabel()}
      </Txt>
    </Sheet>
    <DriveRestoreSheet
      visible={driveRestoreOpen}
      folderId={meta.driveFolderId}
      onClose={() => setDriveRestoreOpen(false)}
    />
    </>
  );
}
