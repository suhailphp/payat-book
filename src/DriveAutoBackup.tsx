import React from 'react';
import { useData } from './data';
import { backupSignature, serializeBackup } from './lib';
import { driveAutoBackup, driveRestoreSession, driveSupported } from './drive';
import { autoFreqMs, DEFAULT_AUTO_FREQ } from './config/google';

/* Quiet automatic Drive backup, once per app launch. Runs only when connected,
   the user's chosen cadence (meta.autoBackupFreq, default weekly) has elapsed
   since the last backup, AND the data changed since then. It updates this
   month's single payat-auto-YYYY-MM.json in place — no new file per run. Never
   blocks the UI; every failure is swallowed (the Settings staleness line is the
   only visible signal). Renders nothing. Native only. */
export function DriveAutoBackup() {
  const { ready, people, events, txns, invitations, meta, setMeta } = useData();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (!driveSupported || !ready || ran.current) return;
    ran.current = true; // at most once per launch, regardless of re-renders
    if (people.length === 0 && txns.length === 0 && events.length === 0) return;

    const interval = autoFreqMs(meta.autoBackupFreq ?? DEFAULT_AUTO_FREQ);
    if (interval == null) return; // frequency set to Never

    (async () => {
      try {
        const email = await driveRestoreSession();
        if (!email) return; // not connected → do nothing

        const last = Number(meta.driveLastBackup || 0);
        if (last && Date.now() - last < interval) return; // not due yet

        const sig = backupSignature(people, events, txns, invitations);
        if (last && sig === meta.driveLastSig) return; // nothing changed since last

        const json = serializeBackup(people, events, txns, invitations);
        const { folderId } = await driveAutoBackup(json, people.length, meta.driveFolderId);
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
