# PAYAT BOOK — v6 Updates (Claude Code spec)

Two features. Kasavu tokens as always; new strings in BOTH tables from §4 only.

## 1. Payat invitations + reminders (the forget-proofing feature)
Real-world flow being modeled: a future host prints envelopes and visits homes announcing "payat on <date>". The user adds that invitation in the app; the app then reminds him — with system push notifications, even when the app is closed — from one day before the payat until he has paid.

### Data
New table (CREATE TABLE IF NOT EXISTS — safe migration):
```sql
CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostId INTEGER NOT NULL,        -- person hosting
  date TEXT NOT NULL,             -- payat date YYYY-MM-DD
  note TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',  -- 'pending' | 'paid' | 'removed'
  notifIds TEXT DEFAULT '[]',     -- JSON array of scheduled notification ids
  paidTxnId INTEGER
);
```
Backup: include `invitations`, bump payload `version` to 3; restore must still accept v2 files (no invitations) without error.

### Notifications (expo-notifications, LOCAL scheduling — no server)
- Investigate first and report: exact behavior on SDK 57 in Expo Go vs a standalone APK for locally scheduled notifications on Android; Android 13+ `POST_NOTIFICATIONS` runtime permission; notification channel setup. Implement per findings.
- Permission flow: first time an invitation is saved, show our themed sheet explaining why (`notifExplain`), then request the OS permission. If denied, invitations still work as a visible list — show a small hint that reminders are off (`notifOff`), with a path to retry from Settings.
- Schedule per pending invitation, all at 09:00 local: one on (date − 1 day), then daily from the payat date for 14 days max. Store all ids in `notifIds`.
- Content localized via current language: day-before → `notifTomorrow` title, day-of → `notifToday`, after → `notifOverdue`; body `notifBody` (+ note when present).
- Cancel ALL of an invitation's scheduled notifications when it becomes paid or removed, and when the person is deleted (cascade).
- Tapping a notification opens the app on the Payments tab (response listener → navigate).
- Web: scheduling is a no-op — the invitations list still fully works; reminder rows show `notifWebHint`. No crashes on web.

### UI
- **Payments tab**: new section **Invitations** above Recent payments — `addInvitation` button + list of pending invitations sorted overdue-first then by date. Row: host avatar/name, payat date, relative chip: `today` / `tomorrow` / `daysLeft` (gold) / overdue in red using existing `daysAgo`. Tap → action sheet: **Pay now** (opens the pay amount sheet prefilled with the host; on save → status 'paid', link `paidTxnId`, cancel notifications, toast), **Mark as paid** (no entry recorded — for cash recorded elsewhere; confirm first), **Remove** (themed confirm). Uses SearchableList past 10.
- **Add invitation sheet**: person picker for the host (with inline new-person chain), date field (default today), optional note. Saving schedules the reminders.
- **Dashboard**: when a pending invitation is overdue or within the next 7 days, a gold card `upcomingPayat` under the Waiting-longest card: host name + relative chip, tap → Payments tab. Show at most 1 (the most urgent).

## 2. About / author page
- Settings sheet: new row `about` (info icon) → opens an About screen (full screen, back arrow + logo header like other detail screens):
  - Vertical brand logo (`assets/` — reuse existing square logo), app name + version (from app config), tagline in the current language
  - `developedBy` with the author name
  - Two buttons: `contactWA` → `https://wa.me/<AUTHOR_WHATSAPP>` via Linking; `contactEmail` → `mailto:<AUTHOR_EMAIL>`
- Author constants in ONE file `src/config/author.ts`:
  ```ts
  export const AUTHOR_NAME = "Suhail";
  export const AUTHOR_WHATSAPP = "<REPLACE_ME>";   // digits with country code
  export const AUTHOR_EMAIL = "<REPLACE_ME>";
  ```
  If the values are provided in the task prompt, put them in; otherwise leave the placeholders and say so in the report.

## 3. Tests & verification
- Node tests: reminder schedule computation as a pure function (dates list given an invitation date: day-before + 14 dailies, correct across month/year boundaries), relative-label logic (today/tomorrow/left/overdue), backup v3 round-trip + v2 import, invitation status transitions cancel-list correctness.
- Manual: add invitation for tomorrow → permission sheet → OS prompt; notification arrives at 9:00 day-before (or use a short test offset in __DEV__ to observe one quickly); pay → reminders stop; overdue chip turns red; dashboard urgent card appears/disappears; About page opens WhatsApp and email; web build unaffected.
- tsc clean, web export clean, all tests green. Commit in logical steps, push, report findings (especially the Expo Go vs APK notification behavior) + manual checklist.

## 4. New i18n keys
| key | en | ml |
|---|---|---|
| invitations | Invitations | ക്ഷണങ്ങൾ |
| addInvitation | Add invitation | ക്ഷണം ചേർക്കുക |
| invHost | Who is hosting? | ആരാണ് പയറ്റ് നടത്തുന്നത്? |
| invDate | Payat date | പയറ്റ് തീയതി |
| payNow | Pay now | ഇപ്പോൾ കൊടുക്കുക |
| markPaid | Mark as paid | കൊടുത്തു എന്ന് അടയാളപ്പെടുത്തുക |
| qMarkPaid | Mark this invitation as paid? | ഈ ക്ഷണം കൊടുത്തതായി അടയാളപ്പെടുത്തണോ? |
| qRemoveInv | Remove this invitation? | ഈ ക്ഷണം ഒഴിവാക്കണോ? |
| today | Today | ഇന്ന് |
| tomorrow | Tomorrow | നാളെ |
| daysLeft | {d} days left | {d} ദിവസം ബാക്കി |
| upcomingPayat | Upcoming payat | വരാനുള്ള പയറ്റ് |
| notifTomorrow | Payat tomorrow — {n} | നാളെ പയറ്റ് — {n} |
| notifToday | Payat today — {n} | ഇന്ന് പയറ്റ് — {n} |
| notifOverdue | Payat pending — {n} | പയറ്റ് ബാക്കി — {n} |
| notifBody | Don't forget to pay at the payat — {n} | പയറ്റിന് കൊടുക്കാൻ മറക്കരുത് — {n} |
| notifExplain | Allow notifications so you never miss a payat you were invited to. | ക്ഷണിച്ച പയറ്റ് മറക്കാതിരിക്കാൻ നോട്ടിഫിക്കേഷൻ അനുവദിക്കുക. |
| notifOff | Reminders are off — allow notifications in phone settings. | റിമൈൻഡർ ഓഫാണ് — ഫോൺ സെറ്റിംഗ്സിൽ നോട്ടിഫിക്കേഷൻ അനുവദിക്കുക. |
| notifWebHint | Reminders work in the phone app. | റിമൈൻഡർ ഫോൺ ആപ്പിൽ പ്രവർത്തിക്കും. |
| about | About | ആപ്പിനെക്കുറിച്ച് |
| developedBy | Developed by {n} | നിർമ്മിച്ചത്: {n} |
| contactWA | Message on WhatsApp | വാട്സ്ആപ്പിൽ മെസേജ് ചെയ്യുക |
| contactEmail | Send email | ഇമെയിൽ അയയ്ക്കുക |
