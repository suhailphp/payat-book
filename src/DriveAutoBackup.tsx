import React from 'react';
import { useData } from './data';
import { backupSignature, serializeBackup } from './lib';
import { driveBackup, driveRestoreSession, driveSupported } from './drive';
import { DRIVE_AUTO_INTERVAL_MS } from './config/google';

/* Quiet automatic Drive backup, once per app launch. Runs only when the user is
   connected, the last Drive backup is older than 24h, AND the data changed
   since then. It never blocks the UI (no spinner over the book) and every
   failure is swallowed — the only visible signal of trouble is the staleness
   line in Settings. Renders nothing. Native only. */
export function DriveAutoBackup() {
  const { ready, people, events, txns, invitations, meta, setMeta } = useData();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (!driveSupported || !ready || ran.current) return;
    ran.current = true; // at most once per launch, regardless of re-renders
    if (people.length === 0 && txns.length === 0 && events.length === 0) return;

    (async () => {
      try {
        const email = await driveRestoreSession();
        if (!email) return; // not connected → do nothing

        const last = Number(meta.driveLastBackup || 0);
        if (last && Date.now() - last < DRIVE_AUTO_INTERVAL_MS) return; // still fresh

        const sig = backupSignature(people, events, txns, invitations);
        if (last && sig === meta.driveLastSig) return; // nothing changed since last

        const json = serializeBackup(people, events, txns, invitations);
        const { folderId } = await driveBackup(json, people.length, meta.driveFolderId);
        await setMeta('driveFolderId', folderId);
        await setMeta('driveLastBackup', String(Date.now()));
        await setMeta('driveLastSig', sig);
      } catch {
        /* offline / Drive unreachable — stay silent, try again next launch */
      }
    })();
  }, [ready]);

  return null;
}
