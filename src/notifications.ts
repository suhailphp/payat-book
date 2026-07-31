import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Lang, tpFor } from './i18n';
import { parseNotifIds, reminderDates } from './lib';

/* Local reminder scheduling (no server).

   Platform notes (verified against expo-notifications 57.0.8 source):
   - The library's own AndroidManifest declares POST_NOTIFICATIONS and
     RECEIVE_BOOT_COMPLETED with a boot/package-replaced receiver, so in a
     standalone build scheduled reminders survive reboots and app updates.
   - Exact alarms are used when allowed (always < Android 12; on 12+ only if
     canScheduleExactAlarms), else it falls back to inexact
     setAndAllowWhileIdle — reminders may drift by minutes. Acceptable here.
   - In Expo Go local scheduling works for quick testing, but notifications
     are posted under Expo Go's identity/channels and don't survive reboots;
     push-token APIs throw on Android. Real verification needs an APK.
   - Web: everything here is a guarded no-op. */

export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'payat-reminders';

export async function setupNotifications(): Promise<void> {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Payat reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function getPermissionGranted(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

/* Android 13+ shows the POST_NOTIFICATIONS runtime prompt here. */
export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

/* Schedules the full reminder plan for one invitation, all at 09:00 local:
   day-before, day-of, then daily for up to 13 more days. Past datetimes are
   skipped. Returns the scheduled notification ids (store in notifIds). */
export async function scheduleInvitationReminders(
  dateIso: string,
  hostName: string,
  note: string,
  lang: Lang
): Promise<string[]> {
  if (!notificationsSupported) return [];
  const tp = tpFor(lang);
  const now = Date.now();
  const ids: string[] = [];
  const body = tp('notifBody', { n: hostName }) + (note ? ` (${note})` : '');

  for (const r of reminderDates(dateIso)) {
    const when = new Date(r.date + 'T09:00:00');
    if (+when <= now) continue;
    const title =
      r.kind === 'before'
        ? tp('notifTomorrow', { n: hostName })
        : r.kind === 'day0'
          ? tp('notifToday', { n: hostName })
          : tp('notifOverdue', { n: hostName });
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      })
    );
  }

  if (__DEV__) {
    /* dev-only: one observable reminder ~15s after saving, so the manual
       test doesn't have to wait for 09:00 */
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: tp('notifToday', { n: hostName }) + ' [dev]', body, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(now + 15000),
          channelId: CHANNEL_ID,
        },
      })
    );
  }

  return ids;
}

export async function cancelReminders(notifIdsJson: string): Promise<void> {
  if (!notificationsSupported) return;
  for (const id of parseNotifIds(notifIdsJson)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      /* already fired or unknown — nothing to cancel */
    }
  }
}
