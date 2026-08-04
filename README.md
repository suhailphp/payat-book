# Payat Book

Native Android app for keeping a payat (പയറ്റ്) ledger — who gave, who received, and the running balance with each person. Built with Expo (React Native) + SQLite, in English and Malayalam.

Data lives in the app's own SQLite database, so it survives phone cleaners, browser clearing, and reboots — only uninstalling the app removes it. Backup files are JSON and fully compatible with the web (PWA) version.

## Project structure

```
App.tsx               Navigation (bottom tabs + stack), fonts, splash
src/
  db.ts               expo-sqlite layer: schema + CRUD + restore
  data.tsx            React context: in-memory state refreshed after each write
  lib.ts              Pure logic: balances, ₹ formatting, backup (de)serialization
  i18n.ts             Full EN/ML translation tables (ported verbatim from the PWA)
  theme.ts            Kasavu design tokens (cotton, green, gold, red…)
  share.ts            WhatsApp statement text + deep link
  backup.ts           Backup export (share sheet) / restore (document picker)
  components/         Header (kasavu stripe), BrandLogo, Sheet, Toast, MonthChart, cards, chips, buttons, icons
  screens/            Onboarding, Book dashboard, People, Person, Payatts (hosting), Payments, Event (Hosting)
  sheets/             Person form, amount entry, person picker, host payat, settings
tests/                Node test suite for the pure logic (npm test)
assets/               App icon / adaptive icon / splash (Logo.png), header logo
docs/design/          The PWA reference implementation (live web version for iPhone)
docs/PAYAT-ANDROID.md The build spec
```

## Run (development)

```bash
npm install
npx expo start
```

Logic tests: `npm test` (compiles the pure modules and runs the node suite).

Scan the QR code with [Expo Go](https://expo.dev/go) on an Android phone.

## Versioning (bump before every release build)

The version shown in **About** and **Settings** is read at runtime from the
installed binary (`expo-application`'s `nativeApplicationVersion` /
`nativeBuildVersion`), so it always matches the APK — there is no version
string to edit in the source. The single source of truth is `app.json`:

```jsonc
"version": "1.3.0",        // user-facing version → "v1.3.0"
"android": { "versionCode": 4 }   // integer build number → "(4)"; MUST increase each release
```

Before a release build:

1. Bump `expo.version` (e.g. `1.2.0` → `1.3.0`) and increment
   `expo.android.versionCode` by 1. Play Store rejects an APK whose
   `versionCode` is not higher than the last upload.
2. `npx expo prebuild -p android` regenerates `android/` from `app.json`, so
   `versionName` / `versionCode` in `android/app/build.gradle` follow
   automatically. (If you build the existing `android/` without re-running
   prebuild, update those two lines by hand to match.)
3. Build (below). About/Settings will then show `v<version> (<versionCode>)`.

## Build an APK

**Option A — EAS build (cloud, no local Android SDK needed):**

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

The `preview` profile in `eas.json` produces an installable `.apk` (rather than an `.aab`). Download the artifact link when the build finishes and install it on the phone.

**Option B — local build (no Expo account; needs Android Studio):**

```bash
npx expo prebuild -p android          # generates android/ (gitignored)
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Use Android Studio's bundled JDK: `JAVA_HOME="/Applications/Android
Studio.app/Contents/jbr/Contents/Home"`.

**Build-tools fix (automatic).** Some RN community libraries (e.g.
`@react-native-community/datetimepicker`) don't declare a
`buildToolsVersion`, so AGP falls back to its bundled default (35.0.0)
which the installed SDK can't parse (repository XML v4 vs v3) and can't
auto-download — `assembleRelease` then fails during that module's
config. The Expo config plugin `plugins/withBuildToolsFix.js` (registered
in `app.json`) injects a `subprojects` block into `android/build.gradle`
that forces every Android module onto the project's build tools (36.0.0),
so this survives `expo prebuild`. No manual step needed.

**Release signing.** The release keystore and its credentials live
**outside `android/`** so they survive a prebuild:

- Keystore: `~/Documents/PayatBook-keys/payat-release.keystore` (alias `payat`).
- Credentials: `PAYAT_RELEASE_*` in **`~/.gradle/gradle.properties`** (user-level,
  not in the repo) — `PAYAT_RELEASE_STORE_FILE` is the absolute path above,
  plus `PAYAT_RELEASE_STORE_PASSWORD` / `PAYAT_RELEASE_KEY_ALIAS` /
  `PAYAT_RELEASE_KEY_PASSWORD`.

Both are the app's signing identity — **back them up in a password manager.**
There is no other copy; if lost, the key cannot be recovered and existing
installs can no longer be updated in place.

> ⚠️ **`expo prebuild` wipes `android/` entirely** — it deletes and regenerates
> the whole folder, including anything gitignored inside it (a previous
> in-tree keystore, `gradle.properties`, `local.properties`). That is why the
> keystore now lives outside `android/`. **Before any prebuild, make sure your
> signing files are backed up outside the repo.** After a prebuild you must
> re-add, in the regenerated `android/app/build.gradle`:
>
> - the `signingConfigs.release { … }` block referencing the `PAYAT_RELEASE_*`
>   properties, and `signingConfig signingConfigs.release` under
>   `buildTypes.release`;
> - `android/local.properties` with `sdk.dir=<your Android SDK path>`.
>
> (`withBuildToolsFix` re-applies automatically as a config plugin; only
> signing and the SDK path need re-adding by hand.)

> ⚠️ **New signing key ≠ old installs.** The release key was regenerated on
> 2026-08-04 (new SHA-1), so a new build **cannot install over an older
> differently-signed build** — Android rejects it with a signature mismatch.
> On each affected phone/emulator: **Save a backup file first, uninstall the
> old app, install the new APK, then Restore from the backup JSON.**

## Balance model

One running balance per person: `balance = SUM(out) − SUM(in)`.

- `in` = they gave me → I owe them (red, "To give")
- `out` = I gave them → they owe me (green, "To receive")

Example: Riyas gives ₹1,000 at my payat → balance −1,000. At his payat I give ₹2,000 → balance +1,000. When recording an amount, the app suggests `close balance` and `double` chips whenever a prior balance exists in the payer's direction.

## Backup

Settings (gear) → **Save backup file** shares a JSON file:

```json
{ "app": "payat-book", "version": 2, "exported": "…", "people": […], "events": […], "txns": […] }
```

**Restore from backup** replaces all data with the file's contents (after confirmation). The format is identical to the PWA's, so backups move freely between the web version and this app in both directions.

### Optional Google Drive backup

Entirely optional — the app is fully usable offline with no account. When the
user connects Google Drive (Settings → **Connect Google Drive**), the app keeps
automatic backups in a visible **Payat Book** folder in their My Drive, so a
lost phone doesn't mean a lost book.

- **Scope:** `drive.file` only — the app can see and touch just the files it
  created, never the rest of the user's Drive. Non-sensitive; no Google
  verification needed. Do not broaden it.
- **Auth:** `@react-native-google-signin/google-signin` with the native Play
  Services account picker. Tokens are held and refreshed by Play Services — the
  app stores **no** refresh token, so a shared backup JSON can never leak Drive
  access. The uploaded file is byte-identical to the local export.
- **Automatic:** on app open, if connected and the last Drive backup is older
  than 24h and the data changed, one quiet background upload. Never blocks the
  UI; failures are silent apart from a staleness line in Settings.
- **Retention:** the newest 10 backups are kept; older ones are pruned.
- **Config:** the Web OAuth client ID lives in `src/config/google.ts` (not a
  secret). The Android OAuth clients (release + debug SHA-1s) only need to
  exist in the Cloud project — they're matched by the app's signing cert and
  are never referenced in code. OAuth client JSON files are gitignored and kept
  outside the repo.

> ⚠️ **Publish the OAuth consent screen to "In production."** While it sits in
> "Testing", Google **expires the refresh grant after 7 days** and the auto-backup
> silently stops. Because only the non-sensitive `drive.file` scope is used,
> moving to Production needs **no** verification — do it before handing over the
> phone (Google Cloud Console → OAuth consent screen → **Publish App**).

## Web (iPhone) version

The original PWA lives in `docs/design/` and remains the way to use Payat Book on iPhone (via GitHub Pages / Add to Home Screen). This app supersedes it on Android.

## Acceptance checklist

Logic-level items are covered by node tests against `src/lib.ts` / `src/share.ts` (balance math, suggestion chips, pending-list rule, backup round-trip incl. PWA-format files, share text in both languages). Device-level items to verify on a phone:

- [ ] Fresh install → add person → they gave ₹1,000 → red ₹1,000 "To give"; Home totals correct
- [ ] I gave ₹2,000 → flips to green ₹1,000; chips suggested ₹1,000/₹2,000
- [ ] Host payat → pending shows only positive-balance people not yet paid; adding moves them to Paid
- [ ] Finish payat → button becomes "Add late payment" and still works
- [ ] Language toggle switches every string incl. share text; Malayalam renders correctly
- [ ] Backup exports via share sheet; restore on clean install reproduces data; PWA file imports
- [ ] Kill app / reboot → data intact (SQLite)
- [ ] WhatsApp share opens chat with the formatted statement
