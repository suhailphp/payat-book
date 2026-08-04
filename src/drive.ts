import { Platform } from 'react-native';
import { driveBackupFilename, driveBackupsToPrune, type Backup, parseBackup } from './lib';
import { DRIVE_FOLDER_NAME, DRIVE_KEEP, DRIVE_SCOPE, GOOGLE_WEB_CLIENT_ID } from './config/google';

/* Optional Google Drive backup.

   Design rules baked into this module:
   - It is OPTIONAL. The app is fully usable offline with no account; nothing
     here runs unless the user connects, and every call fails gracefully.
   - Auth is @react-native-google-signin with the drive.file scope ONLY (files
     the app created). Play Services holds the credential and refreshes access
     tokens transparently — we store NO refresh token anywhere, so a shared
     backup JSON can never leak Drive access.
   - The uploaded file body is exactly serializeBackup(...), byte-identical to
     the local export. This module never rewrites the payload.
   - Native only. On web (and if the native module is missing) driveSupported
     is false and every function is a safe no-op / rejection. */

export const driveSupported = Platform.OS !== 'web';

export type DriveConnect =
  | { ok: true; email: string }
  | { ok: false; reason: 'cancelled' | 'unsupported' | 'error' };

export type DriveBackupItem = { id: string; name: string; ms: number; hhmm: string; people: number | null };

/* Lazily required so a missing native module or the web bundle can never crash
   startup — same guard the PDF export uses. configure() is idempotent. */
let GS: any = null;
function signin(): any {
  if (!driveSupported) throw new Error('drive-unsupported');
  if (!GS) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-google-signin/google-signin');
    GS = mod.GoogleSignin;
    GS.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: [DRIVE_SCOPE], offlineAccess: false });
  }
  return GS;
}

/* True only if a native module error is thrown — treat as "not connected". */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/* ---------- connection ---------- */

/* The signed-in account's email, synchronously, or null. Never throws. */
export function driveCurrentEmail(): string | null {
  if (!driveSupported) return null;
  return safe(() => signin().getCurrentUser()?.user?.email ?? null, null);
}

export function driveIsConnected(): boolean {
  if (!driveSupported) return false;
  return safe(() => signin().hasPreviousSignIn(), false);
}

/* Interactive connect: Play Services check + account picker. */
export async function driveConnect(): Promise<DriveConnect> {
  if (!driveSupported) return { ok: false, reason: 'unsupported' };
  try {
    const gs = signin();
    await gs.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await gs.signIn();
    if (res?.type === 'cancelled') return { ok: false, reason: 'cancelled' };
    const email = res?.data?.user?.email ?? gs.getCurrentUser()?.user?.email ?? '';
    return { ok: true, email };
  } catch (e: any) {
    // user-cancelled shows up as a thrown code on some devices too
    const code = String(e?.code ?? e?.message ?? '');
    if (/cancel|SIGN_IN_CANCELLED|12501/i.test(code)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'error' };
  }
}

/* Restore a prior session without any UI. Returns the email or null. Used on
   app open so the account and tokens are ready for a quiet auto-backup. */
export async function driveRestoreSession(): Promise<string | null> {
  if (!driveSupported) return null;
  try {
    const gs = signin();
    if (!gs.hasPreviousSignIn()) return null;
    const res = await gs.signInSilently();
    if (res?.type === 'success') return res.data?.user?.email ?? null;
    return null;
  } catch {
    return null;
  }
}

/* Revoke the token grant and clear the local session. Never throws. */
export async function driveDisconnect(): Promise<void> {
  if (!driveSupported) return;
  try {
    const gs = signin();
    await gs.revokeAccess().catch(() => {});
    await gs.signOut().catch(() => {});
  } catch {
    /* nothing to disconnect */
  }
}

/* A valid access token, refreshing/restoring silently as needed. Throws on
   failure so callers can decide whether to stay silent (auto) or toast. */
async function accessToken(): Promise<string> {
  const gs = signin();
  if (!gs.hasPreviousSignIn()) throw new Error('drive-not-connected');
  if (!gs.getCurrentUser()) {
    const res = await gs.signInSilently();
    if (res?.type !== 'success') throw new Error('drive-no-session');
  }
  const { accessToken: token } = await gs.getTokens();
  if (!token) throw new Error('drive-no-token');
  return token;
}

/* ---------- Drive REST ---------- */

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/* One fetch with a short timeout (the village network is unreliable — never
   hang the UI or spin forever). Throws on !ok or network error; no retries. */
async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`drive-http-${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/* Find (by cached id, then by name) or create the visible "Payat Book" folder
   in My Drive. Returns its id. */
async function ensureFolder(token: string, cachedId?: string | null): Promise<string> {
  if (cachedId) {
    try {
      const r = await driveFetch(token, `${DRIVE}/files/${cachedId}?fields=id,trashed`);
      const j = await r.json();
      if (j.id && !j.trashed) return j.id;
    } catch {
      /* cached id stale — fall through to lookup/create */
    }
  }
  const q = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`
  );
  const found = await driveFetch(token, `${DRIVE}/files?q=${q}&spaces=drive&fields=files(id)`);
  const fj = await found.json();
  if (fj.files?.length) return fj.files[0].id;

  const created = await driveFetch(token, `${DRIVE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] }),
  });
  const cj = await created.json();
  return cj.id;
}

/* Multipart upload of the backup JSON (metadata + media in one request). The
   media part is `json` verbatim; people count rides along in appProperties so
   the restore list can show it without downloading each file. */
async function uploadBackup(
  token: string,
  folderId: string,
  json: string,
  filename: string,
  peopleCount: number
): Promise<void> {
  const boundary = 'payatbook-' + filename;
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: 'application/json',
    appProperties: { app: 'payat-book', people: String(peopleCount) },
  };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${json}\r\n` +
    `--${boundary}--`;
  await driveFetch(token, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

/* All Payat Book backups in the folder, newest first. */
export async function driveList(folderIdHint?: string | null): Promise<DriveBackupItem[]> {
  if (!driveSupported) return [];
  const token = await accessToken();
  const folderId = await ensureFolder(token, folderIdHint);
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and name contains 'payat-backup'`);
  const res = await driveFetch(
    token,
    `${DRIVE}/files?q=${q}&spaces=drive&orderBy=createdTime desc&fields=files(id,name,createdTime,appProperties)`
  );
  const j = await res.json();
  const items: DriveBackupItem[] = (j.files ?? []).map((f: any) => {
    const m = /^payat-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})\.json$/.exec(f.name ?? '');
    const ms = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : Date.parse(f.createdTime ?? '') || 0;
    const hhmm = m ? `${m[4]}:${m[5]}` : '';
    const p = f.appProperties?.people;
    return { id: f.id, name: f.name, ms, hhmm, people: p == null ? null : Number(p) };
  });
  return items.sort((a, b) => b.ms - a.ms);
}

/* Upload one backup and prune to the newest DRIVE_KEEP. Returns the folder id
   so the caller can cache it. Throws on any failure. */
export async function driveBackup(
  json: string,
  peopleCount: number,
  folderIdHint?: string | null
): Promise<{ folderId: string }> {
  if (!driveSupported) throw new Error('drive-unsupported');
  const token = await accessToken();
  const folderId = await ensureFolder(token, folderIdHint);
  await uploadBackup(token, folderId, json, driveBackupFilename(new Date()), peopleCount);

  /* prune older backups — best effort, never fail the backup over cleanup */
  try {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and name contains 'payat-backup'`);
    const res = await driveFetch(token, `${DRIVE}/files?q=${q}&spaces=drive&fields=files(id,name)`);
    const files = (await res.json()).files ?? [];
    const doomed = new Set(driveBackupsToPrune(files.map((f: any) => f.name), DRIVE_KEEP));
    for (const f of files) {
      if (doomed.has(f.name)) {
        await driveFetch(token, `${DRIVE}/files/${f.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  } catch {
    /* retention is opportunistic */
  }
  return { folderId };
}

/* Download and parse one backup for restore. Returns null if unreadable. */
export async function driveDownload(fileId: string): Promise<Backup | null> {
  if (!driveSupported) return null;
  const token = await accessToken();
  const res = await driveFetch(token, `${DRIVE}/files/${fileId}?alt=media`);
  const raw = await res.text();
  return parseBackup(raw);
}
