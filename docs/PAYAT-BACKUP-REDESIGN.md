# PAYAT BOOK — Backup page redesign + Malayalam strings

## 1. The problem
The Backup page currently stacks five same-looking buttons in one flat column. Two of them say "back up" and two say "restore", so it isn't obvious which one goes to the phone and which to Drive. It needs clear visual separation and Google's own branding on the Drive half.

## 2. New structure — two cards

Wrap each destination in its own **card** (paper background, 1px `--line` border, 16px radius, the standard shadow, 16px internal padding, 14px gap between the two cards). The status banner stays above both.

### Card A — "This phone" (`backupLocal`)
- Header row: a phone line-icon in a `--green-tint` circle (36px), then the title, then a small ink-soft caption `backupLocalCaption` on the next line.
- Body: the existing explanation line, then the last-local-backup line (ink-soft, 13px).
- Actions: **Save backup file** (green primary) and **Restore from file** (ghost, green outline).
- This card is always available — it never depends on network or account.

### Card B — "Google Drive" (`backupDrive`)
Give it Google's visual identity so it reads as a different destination at a glance:
- Header row: the **Google Drive triangle logo** (see §3) in a white circle with a 1px `--line` ring, then the title, then caption `backupDriveCaption`.
- Card border uses Google blue `#4285F4` at 1px instead of `--line`, and a very light blue tint `#F5F9FF` as the card background — enough to separate it from the phone card without breaking the kasavu palette.
- **Not connected state**: the explanation line `driveExplain`, then a proper **Google sign-in button** — white background, 1px `#DADCE0` border, 8px radius, 48px tall, the multicolour Google "G" logo at the left, label `driveConnect` in `#3C4043`. This is the standard Google branding; don't restyle it green.
- **Connected state**: a row showing a small account avatar circle (initial), the email in 14px, and a green tick; then the last-Drive-backup line; then **Back up now** (green primary) and **Restore from Drive** (ghost). **Disconnect** goes last as a plain text button in ink-soft, NOT a full-width outlined button — it's a rare, mildly destructive action and shouldn't compete with the two it sits under.

### Status banner (keep, refine)
Above both cards. Three states, each with a leading dot/icon:
- Green tick + `driveStatusOk` when a Drive backup exists from the last 24h
- Gold dot + `driveStatusStale` when the newest Drive backup is older than that
- Gold dot + `driveStatusNone` when Drive isn't connected or has no backup
Tapping the banner scrolls to the Drive card.

## 3. Google Drive + Google "G" logos
Both must be inline SVG (react-native-svg) — no network images, no bundled PNGs.
- **Drive triangle**: the three-panel Drive mark in its official colours — blue `#4285F4`, green `#34A853`, yellow `#FBBC04`. 24px.
- **Google "G"**: the four-colour G — blue `#4285F4`, red `#EA4335`, yellow `#FBBC05`, green `#34A853`. 20px, inside the sign-in button.
Keep both simple and accurate; don't invent alternative colourways.

## 4. Malayalam strings
The Drive/backup keys are currently English placeholders in both tables. Replace the `ml` values with these exactly. Add any key below that doesn't exist yet, and if the app uses a different key name for the same string, map it rather than duplicating.

| key | en | ml |
|---|---|---|
| backupPage | Backup | ബാക്കപ്പ് |
| backupLocal | This phone | ഈ ഫോണിൽ |
| backupLocalCaption | Save a file you can keep or share | സൂക്ഷിക്കാനോ അയക്കാനോ ഒരു ഫയൽ |
| backupDrive | Google Drive | ഗൂഗിൾ ഡ്രൈവ് |
| backupDriveCaption | Automatic backup to your account | നിങ്ങളുടെ അക്കൗണ്ടിൽ സ്വയം ബാക്കപ്പ് |
| driveExplain | Connect your Google account. The app can only see the backup files it creates. | നിങ്ങളുടെ ഗൂഗിൾ അക്കൗണ്ട് ബന്ധിപ്പിക്കുക. ആപ്പ് ഉണ്ടാക്കുന്ന ബാക്കപ്പ് ഫയലുകൾ മാത്രമേ ആപ്പിന് കാണാൻ കഴിയൂ. |
| driveConnect | Sign in with Google | ഗൂഗിൾ ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക |
| driveConnectedAs | Connected as {e} | ബന്ധിപ്പിച്ചത്: {e} |
| driveBackupNow | Back up now | ഇപ്പോൾ ബാക്കപ്പ് ചെയ്യുക |
| driveRestore | Restore from Drive | ഡ്രൈവിൽ നിന്ന് തിരിച്ചെടുക്കുക |
| driveDisconnect | Disconnect | ബന്ധം വിച്ഛേദിക്കുക |
| driveStatusOk | Backed up to Google Drive | ഗൂഗിൾ ഡ്രൈവിൽ ബാക്കപ്പ് ചെയ്തു |
| driveStatusStale | Last Drive backup {d} days ago | അവസാന ഡ്രൈവ് ബാക്കപ്പ് {d} ദിവസം മുൻപ് |
| driveStatusNone | Not backed up to Google Drive yet | ഗൂഗിൾ ഡ്രൈവിൽ ഇതുവരെ ബാക്കപ്പ് ചെയ്തിട്ടില്ല |
| driveLastBackup | Last backup {d} | അവസാന ബാക്കപ്പ് {d} |
| driveNoBackup | No Drive backup yet | ഡ്രൈവ് ബാക്കപ്പ് ഇതുവരെ ഇല്ല |
| driveBackedUp | Backed up to Drive | ഡ്രൈവിൽ ബാക്കപ്പ് ചെയ്തു |
| driveFailed | Drive backup failed | ഡ്രൈവ് ബാക്കപ്പ് പരാജയപ്പെട്ടു |
| driveUnreachable | Could not reach Google Drive | ഗൂഗിൾ ഡ്രൈവിൽ എത്താനായില്ല |
| driveDisconnected | Disconnected from Google Drive | ഗൂഗിൾ ഡ്രൈവിൽ നിന്ന് വിച്ഛേദിച്ചു |
| drivePickBackup | Choose a backup | ഒരു ബാക്കപ്പ് തിരഞ്ഞെടുക്കുക |
| driveBackupItem | {d} · {n} people | {d} · {n} പേർ |
| qDriveRestore | Restore this backup? Your current book will be replaced. | ഈ ബാക്കപ്പ് തിരിച്ചെടുക്കണോ? ഇപ്പോഴുള്ള ബുക്ക് മാറ്റപ്പെടും. |
| qDisconnect | Disconnect Google Drive? Backups already saved stay in your Drive. | ഗൂഗിൾ ഡ്രൈവ് വിച്ഛേദിക്കണോ? സേവ് ചെയ്ത ബാക്കപ്പുകൾ ഡ്രൈവിൽ തന്നെ ഉണ്ടാകും. |

Sweep the whole file afterwards: no `ml` value anywhere should still be an English placeholder.

## 5. Verify
- tsc clean, node tests pass, web export clean.
- Both cards render in EN and ML; long Malayalam labels wrap without clipping buttons.
- No device or emulator testing needed — I'll do that myself.
- Commit and push. Do not bump the version; I'll ask when I want a build.
