import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
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
import { C, SHADOW } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Txt } from '../components/UI';
import { CheckIcon, PhoneIcon } from '../components/Icons';
import { GoogleDriveIcon, GoogleGIcon } from '../components/GoogleLogos';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { DriveRestoreSheet } from '../sheets/DriveRestoreSheet';
import type { RootNav } from '../nav';

/* Google brand tokens — used only where we present Google's own identity. */
const G_BLUE = '#4285F4';
const G_CARD_BG = '#F5F9FF';
const G_BTN_BORDER = '#DADCE0';
const G_BTN_TEXT = '#3C4043';

const card = {
  backgroundColor: C.paper,
  borderWidth: 1,
  borderColor: C.line,
  borderRadius: 16,
  padding: 16,
  ...SHADOW,
} as const;

/* Header of a card: a round badge, a title and a small caption beneath. */
const CardHead = ({
  badge,
  title,
  caption,
}: {
  badge: React.ReactNode;
  title: string;
  caption: string;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
    {badge}
    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
      <Txt w={700} size={17} numberOfLines={1}>
        {title}
      </Txt>
      <Txt size={12.5} color={C.inkSoft} numberOfLines={2}>
        {caption}
      </Txt>
    </View>
  </View>
);

/* Full-screen backup page. Two clearly separate destination cards — "This
   phone" (local file) and "Google Drive" (branded, account-based) — under a
   one-glance status banner. */
export function BackupScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, people, events, txns, invitations, meta, setMeta, restoreAll } = useData();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const driveCardY = React.useRef(0);

  /* ---------- this phone ---------- */
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

  /* ---------- google drive ---------- */
  const [connected, setConnected] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [restoreOpen, setRestoreOpen] = React.useState(false);

  React.useEffect(() => {
    if (!driveSupported) return;
    let alive = true;
    (async () => {
      await driveRestoreSession();
      if (!alive) return;
      setConnected(driveIsConnected());
      setEmail(driveCurrentEmail() ?? meta.driveEmail ?? '');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const doConnect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await driveConnect();
      if (res.ok) {
        await setMeta('driveEmail', res.email);
        setConnected(true);
        setEmail(res.email);
      } else if (res.reason !== 'cancelled') {
        toast(t('driveUnreachable'));
      }
    } finally {
      setBusy(false);
    }
  };

  const doDisconnect = async () => {
    if (busy) return;
    const ok = await confirmSheet({
      message: t('qDisconnect'),
      confirmLabel: t('driveDisconnect'),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await driveDisconnect();
      await setMeta('driveEmail', '');
      setConnected(false);
      setEmail('');
      toast(t('driveDisconnected'));
    } finally {
      setBusy(false);
    }
  };

  const doDriveBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const json = serializeBackup(people, events, txns, invitations);
      const { folderId } = await driveBackup(json, people.length, meta.driveFolderId);
      await setMeta('driveFolderId', folderId);
      await setMeta('driveLastBackup', String(Date.now()));
      await setMeta('driveLastSig', backupSignature(people, events, txns, invitations));
      toast(t('driveBackedUp'));
    } catch {
      toast(t('driveFailed'));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- glanceable status ---------- */
  const last = Number(meta.driveLastBackup || 0);
  const days = last ? Math.floor((Date.now() - last) / DRIVE_AUTO_INTERVAL_MS) : null;
  const statusOk = connected && !!last && Date.now() - last < DRIVE_AUTO_INTERVAL_MS;
  const statusText = statusOk
    ? t('driveStatusOk')
    : connected && days != null
      ? tp('driveStatusStale', { d: days })
      : t('driveStatusNone');

  const scrollToDrive = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, driveCardY.current - 12), animated: true });

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onBack={() => nav.goBack()} onGear={() => setSettingsOpen(true)} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, paddingTop: 20, paddingBottom: 48 }}>
        {/* status banner — tap scrolls to the Drive card */}
        <Pressable
          onPress={scrollToDrive}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: statusOk ? C.greenTint : C.goldSoft,
            borderColor: statusOk ? C.green : C.gold,
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
          }}
        >
          {statusOk ? (
            <CheckIcon size={18} color={C.green} />
          ) : (
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.gold }} />
          )}
          <Txt w={700} size={15.5} color={statusOk ? C.greenDeep : C.ink} style={{ flex: 1 }}>
            {statusText}
          </Txt>
        </Pressable>

        {/* Card A — this phone */}
        <View style={card}>
          <CardHead
            badge={
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.greenTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PhoneIcon size={20} color={C.green} />
              </View>
            }
            title={t('backupLocal')}
            caption={t('backupLocalCaption')}
          />
          <Txt size={13.5} color={C.inkSoft} style={{ marginBottom: 6 }}>
            {t('backupHint')}
          </Txt>
          <Txt size={13} color={C.inkSoft} num style={{ marginBottom: 12 }}>
            {meta.lastBackup ? tp('lastBackup', { d: dstrFromMillis(Number(meta.lastBackup)) }) : t('noBackup')}
          </Txt>
          <Btn label={t('saveBackup')} onPress={doExport} />
          <Btn label={t('restore')} kind="ghost" onPress={doRestore} />
        </View>

        {/* Card B — google drive */}
        {driveSupported ? (
          <View
            onLayout={(e) => {
              driveCardY.current = e.nativeEvent.layout.y;
            }}
            style={[card, { marginTop: 14, borderColor: G_BLUE, backgroundColor: G_CARD_BG }]}
          >
            <CardHead
              badge={
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: C.paper,
                    borderWidth: 1,
                    borderColor: C.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GoogleDriveIcon size={22} />
                </View>
              }
              title={t('backupDrive')}
              caption={t('backupDriveCaption')}
            />

            {connected ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={email || '?'} />
                  <Txt size={14} num numberOfLines={1} style={{ flex: 1, marginLeft: 10 }}>
                    {email}
                  </Txt>
                  <CheckIcon size={18} color={C.green} />
                </View>
                <Txt size={13} color={C.inkSoft} num style={{ marginBottom: 12 }}>
                  {meta.driveLastBackup
                    ? tp('driveLastBackup', { d: dstrFromMillis(Number(meta.driveLastBackup)) })
                    : t('driveNoBackup')}
                </Txt>
                <Btn label={t('driveBackupNow')} onPress={doDriveBackup} />
                <Btn label={t('driveRestore')} kind="ghost" onPress={() => setRestoreOpen(true)} />
                <Pressable onPress={doDisconnect} style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <Txt w={600} size={14} color={C.inkSoft}>
                    {t('driveDisconnect')}
                  </Txt>
                </Pressable>
              </>
            ) : (
              <>
                <Txt size={13.5} color={C.inkSoft} style={{ marginBottom: 14 }}>
                  {t('driveExplain')}
                </Txt>
                {/* standard Google sign-in button — keep Google's white styling */}
                <Pressable
                  onPress={doConnect}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    height: 48,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: G_BTN_BORDER,
                    backgroundColor: pressed ? '#F7F8F8' : '#FFFFFF',
                  })}
                >
                  <GoogleGIcon size={20} />
                  <Txt w={600} size={15} color={G_BTN_TEXT}>
                    {t('driveConnect')}
                  </Txt>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DriveRestoreSheet
        visible={restoreOpen}
        folderId={meta.driveFolderId}
        onClose={() => setRestoreOpen(false)}
      />
    </View>
  );
}
