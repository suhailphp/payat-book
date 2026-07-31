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

## Build an APK

**Option A — EAS build (cloud, no local Android SDK needed):**

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

The `preview` profile in `eas.json` produces an installable `.apk` (rather than an `.aab`). Download the artifact link when the build finishes and install it on the phone.

**Option B — local build (needs Android SDK + JDK 17):**

```bash
npx expo run:android --variant release
```

This generates the native `android/` project and builds `android/app/build/outputs/apk/release/app-release.apk`.

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
