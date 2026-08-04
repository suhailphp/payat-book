/* Google Drive backup configuration.

   GOOGLE_WEB_CLIENT_ID is the *Web* OAuth client ID. It is NOT a secret — it
   only names the OAuth client so Google Play Services issues Drive tokens with
   the right audience. The Android OAuth clients (release + debug SHA-1s) are
   never referenced here; Google matches the running app by its signing
   certificate, so they only need to exist in the Cloud project.

   We request the drive.file scope ONLY — the app can see and touch just the
   files it created, never the rest of the user's Drive. That scope is
   non-sensitive and needs no Google verification. Do not broaden it. */
export const GOOGLE_WEB_CLIENT_ID =
  '587892939064-50uh3pmele6bf3bokvc4veltqh79ajnd.apps.googleusercontent.com';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/* Visible folder in the user's My Drive, so a lost phone's backups can be
   browsed and downloaded by hand. */
export const DRIVE_FOLDER_NAME = 'Payat Book';

/* Keep only the newest N backups in the folder; older ones are pruned so the
   user's Drive doesn't slowly fill up. */
export const DRIVE_KEEP = 10;

/* Auto-backup on app open only when the last Drive backup is older than this. */
export const DRIVE_AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000;
