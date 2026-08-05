import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  Backup,
  beforeRestoreFilename,
  Invitation,
  parseBackup,
  parseBeforeRestoreName,
  PayatEvent,
  Person,
  serializeBackup,
  today,
  Txn,
} from './lib';

/* Backup export, v2 JSON (same format as the PWA's doExport, so files move
   between web and app).

   Web: expo-file-system/legacy is a stub in browsers (cacheDirectory null,
   writeAsStringAsync missing → throws) and Sharing is navigator.share-only,
   so the web path is a Blob + <a download> click, like the PWA.
   Native: legacy write to cacheDirectory + the system share sheet.
   Errors propagate to the caller — never swallow them silently. */
export async function exportBackup(
  people: Person[],
  events: PayatEvent[],
  txns: Txn[],
  invitations: Invitation[] = []
): Promise<void> {
  const json = serializeBackup(people, events, txns, invitations);
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

/* ---------- silent "before restore" safety snapshots (native app storage) ----

   Before any restore replaces the book, we quietly save the current data to a
   file in the app's own document storage (no share sheet, no user step), keep
   the newest 3, and surface them as "Recover previous book". Never throws — a
   snapshot failure must not block the restore the user asked for. */

const BEFORE_RESTORE_KEEP = 3;

export type RecoverFile = { uri: string; name: string; ms: number; people: number | null };

const docDir = (): string | null =>
  Platform.OS === 'web' ? null : FileSystem.documentDirectory ?? null;

export async function writeBeforeRestore(
  people: Person[],
  events: PayatEvent[],
  txns: Txn[],
  invitations: Invitation[]
): Promise<void> {
  const dir = docDir();
  if (!dir) return; // web / no storage → skip silently
  try {
    const json = serializeBackup(people, events, txns, invitations);
    await FileSystem.writeAsStringAsync(dir + beforeRestoreFilename(new Date()), json);
    /* prune to the newest 3 — names sort chronologically, so lexical desc works */
    const names = (await FileSystem.readDirectoryAsync(dir)).filter((n) => parseBeforeRestoreName(n) != null);
    const doomed = names.sort().reverse().slice(BEFORE_RESTORE_KEEP);
    for (const n of doomed) await FileSystem.deleteAsync(dir + n, { idempotent: true }).catch(() => {});
  } catch {
    /* best effort */
  }
}

export async function listBeforeRestore(): Promise<RecoverFile[]> {
  const dir = docDir();
  if (!dir) return [];
  try {
    const names = (await FileSystem.readDirectoryAsync(dir)).filter((n) => parseBeforeRestoreName(n) != null);
    const files = await Promise.all(
      names.map(async (name) => {
        let people: number | null = null;
        try {
          const b = parseBackup(await FileSystem.readAsStringAsync(dir + name));
          people = b ? b.people.length : null;
        } catch {
          /* leave people null */
        }
        return { uri: dir + name, name, ms: parseBeforeRestoreName(name) ?? 0, people };
      })
    );
    return files.sort((a, b) => b.ms - a.ms);
  } catch {
    return [];
  }
}

export async function readBeforeRestore(uri: string): Promise<Backup | null> {
  try {
    return parseBackup(await FileSystem.readAsStringAsync(uri));
  } catch {
    return null;
  }
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
