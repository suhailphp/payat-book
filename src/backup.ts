import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Backup, parseBackup, PayatEvent, Person, serializeBackup, today, Txn } from './lib';

/* Backup export, v2 JSON (same format as the PWA's doExport, so files move
   between web and app).

   Web: expo-file-system/legacy is a stub in browsers (cacheDirectory null,
   writeAsStringAsync missing → throws) and Sharing is navigator.share-only,
   so the web path is a Blob + <a download> click, like the PWA.
   Native: legacy write to cacheDirectory + the system share sheet.
   Errors propagate to the caller — never swallow them silently. */
export async function exportBackup(people: Person[], events: PayatEvent[], txns: Txn[]): Promise<void> {
  const json = serializeBackup(people, events, txns);
  const fname = `payat-backup-${today()}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }

  const uri = FileSystem.cacheDirectory + fname;
  await FileSystem.writeAsStringAsync(uri, json);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing unavailable');
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Payat Book backup' });
}

/* Web file picker via a hidden <input type="file"> — the legacy FS read
   used before is a stub in browsers. */
function pickFileWeb(): Promise<string | null | 'cancelled'> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    let settled = false;
    const done = (v: string | null | 'cancelled') => {
      if (!settled) {
        settled = true;
        input.remove();
        resolve(v);
      }
    };
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) {
        done('cancelled');
        return;
      }
      f.text().then(done, () => done(null));
    };
    input.addEventListener('cancel', () => done('cancelled'));
    document.body.appendChild(input);
    input.click();
  });
}

/* Returns the parsed backup, null for an invalid file, or 'cancelled'. */
export async function pickBackup(): Promise<Backup | null | 'cancelled'> {
  if (Platform.OS === 'web') {
    const raw = await pickFileWeb();
    if (raw === 'cancelled' || raw === null) return raw;
    return parseBackup(raw);
  }

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
