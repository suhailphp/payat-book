import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Backup, parseBackup, PayatEvent, Person, serializeBackup, today, Txn } from './lib';

/* Writes the v2 JSON (same format as the PWA's doExport, so files move
   between web and app) and hands it to the Android share sheet. */
export async function exportBackup(people: Person[], events: PayatEvent[], txns: Txn[]): Promise<void> {
  const json = serializeBackup(people, events, txns);
  const uri = FileSystem.cacheDirectory + `payat-backup-${today()}.json`;
  await FileSystem.writeAsStringAsync(uri, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Payat Book backup' });
  }
}

/* Returns the parsed backup, null for an invalid file, or 'cancelled'. */
export async function pickBackup(): Promise<Backup | null | 'cancelled'> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return 'cancelled';
  try {
    const raw = await FileSystem.readAsStringAsync(res.assets[0].uri);
    return parseBackup(raw);
  } catch {
    return null;
  }
}
