# PAYAT BOOK — Native Android App (Claude Code build spec)

## Goal
Build **Payat Book** as a native Android app using **Expo (React Native) + SQLite**, replacing the PWA. Same design, same features, same two languages. Data must live in the app's own SQLite database (survives browser clearing, phone cleaners, restarts — only uninstalling the app removes it).

Repo: this repo (`payat-book`). The current PWA files (`index.html`, `sw.js`, `manifest.webmanifest`, logos, icons) are the **reference implementation** — read `index.html` fully before writing any code: it contains the working balance logic, all screens, and the complete EN/ML translation tables. Port them faithfully.

## Repo restructure
1. Create `docs/` and move the PWA files into it (`index.html`, `sw.js`, `manifest.webmanifest`, `logo-h.png`, `icon-*.png`, `apple-touch-icon.png`). GitHub Pages will be repointed to `/docs` so the web version stays alive for iPhone.
2. Initialize the Expo app at repo root (`npx create-expo-app@latest . --template blank`), JavaScript or TypeScript (TS preferred).
3. Copy `docs/logo-h.png` and `docs/icon-512.png` into `assets/` for the app icon, splash, and header logo.

## Stack
- Expo SDK (latest stable), React Native
- `expo-sqlite` — database
- `@react-navigation/native` + bottom-tabs + native-stack
- `@expo-google-fonts/baloo-chettan-2` (weights 400/500/600/700) — matches the brand and renders Malayalam natively
- `expo-sharing` + `expo-file-system` — backup export
- `expo-document-picker` — backup restore
- `Linking` — WhatsApp share
- No state library needed; simple React context or hooks around the DB layer

## Database (SQLite)
```sql
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  created TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT,
  status TEXT DEFAULT 'open'      -- 'open' | 'closed'
);
CREATE TABLE IF NOT EXISTS txns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personId INTEGER NOT NULL,
  eventId INTEGER,                 -- NULL for quick "Pay a payat" entries
  dir TEXT NOT NULL,               -- 'in' = they gave me, 'out' = I gave them
  amount INTEGER NOT NULL,
  date TEXT,
  note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
```

## Balance logic (the heart — port exactly from the PWA)
Per person, one running balance:
`balance = SUM(out amounts) − SUM(in amounts)`
- **Positive (green)** → they should give me (To receive)
- **Negative (red)** → I should give them (To give)
- Example: Riyas gives ₹1,000 at my payat (`in`) → balance −1,000. At his payat I give ₹2,000 (`out`) → balance +1,000.
- Amount-entry suggestion chips when a prior balance exists in the payer's direction: `₹B · close balance` and `₹2B · double`, with the explanatory hint line (see i18n keys `hintOwesYou`, `hintYouOwe`, `hintDouble`).

## Design — port the kasavu identity exactly
Read the `<style>` block in `docs/index.html` and reproduce it in RN styles:
- Colors: cotton `#FAF7F0`, paper `#FFFFFF`, ink `#20291F`, ink-soft `#5C6657`, green `#0E5A3C`, green-deep `#0A3F2A`, green-tint `#E7F0EA`, gold `#C9A227`, gold-soft `#EFE3BC`, red `#A63A2B`, red-tint `#F6E7E2`, line `#E7E1D2`
- Font: Baloo Chettan 2 everywhere; tabular numerals for amounts (`fontVariant: ['tabular-nums']`)
- **Signature elements to keep:** the double gold "kasavu" stripe under the header (4px gold bar + 1px gold hairline); the Home "book spread" card — To Receive | To Give side by side with a gold spine line between them
- Header: white background, `logo-h.png` at left (~38px tall) on root tabs; title + back arrow on sub-screens
- Cards: white, 1px `line` border, 16px radius, soft shadow; balance chips: green tint = to receive, red tint = to give, outline = settled
- Buttons: full-width, 14px radius, green primary / gold-outline secondary / WhatsApp green `#1FAF5A` for share
- Big touch targets (min 48px), base font 17 — the primary user is a 60+ uncle

## i18n
Copy the full `STR` object (both `en` and `ml` maps, every key) **verbatim** from `docs/index.html` into `src/i18n.js` with the same `t(key)` / `tp(key, vars)` helpers. Language stored in `meta` table, default `en`, toggle in Settings (segmented English / മലയാളം). Date formatting via `toLocaleDateString('ml-IN' | 'en-IN', {day:'numeric',month:'short',year:'numeric'})`.

## Screens (port behavior 1:1 from the PWA)
Bottom tabs: **Book · People · Payatts** (icons: open book, people, envelope — simple line SVGs via react-native-svg, same as PWA).

1. **Book (Home)** — spread card with To Receive / To Give totals + person counts; backup reminder banner when entries exist and last backup > 7 days; Recent entries list (8, tappable → person).
2. **People** — search field, alphabetical list (avatar initials, phone, balance chip), FAB ＋ → Add person sheet (name + optional WhatsApp number with country-code hint). Tap → Person.
3. **Person** — hero card: name, phone, state line ("X should give you" / "You should give X" / "All settled"), big colored balance, **Share on WhatsApp**, two buttons: *They gave me* / *I gave them* → amount sheet (amount + suggestion chips, date, note). History list with delete-per-entry. Edit person (pencil in header) incl. delete person (confirm; cascades their txns).
4. **Payatts** — two big buttons: **Host a payat** (green) and **Pay a payat** (gold). Below: "My payatts" list (title, date, Open/Finished, total chip).
   - **Pay a payat:** person picker sheet (search + "New person" inline) → amount sheet (`dir:'out'`, no event, no name required) → save.
   - **Host a payat:** name + date → creates event `status:'open'` → opens Hosting screen.
5. **Hosting screen** — hero: title, date, big total, "collected from N people", status chip, **Add collection** button (person picker → amount sheet with `dir:'in'`, `eventId`), **Finish payat** / **Reopen payat** toggle. When finished, the add button label becomes **Add late payment** but stays fully functional (late payers like "Riyas two days later" is a core requirement).
   Sections: **Have balance — yet to come** (people with balance > 0 who have no txn in this event, sorted by balance desc, each with a one-tap ＋ add button) and **Paid** (this event's collections with date/note, delete-per-entry). Delete payat (trash in header, cascades its txns).
6. **Settings sheet** (gear on root headers) — Language toggle; backup hint; **Save backup file** (JSON `{app:'payat-book',version:2,people,events,txns}` via expo-sharing share sheet; update `meta.lastBackup`); **Restore from backup** (document picker, validate `app==='payat-book'`, confirm with counts, replace all tables). Backup JSON format must stay byte-compatible with the PWA's so files move between web and app.

## WhatsApp share
Build the statement text exactly as the PWA's `shareBalance()` (full dated history lines + bold balance line, in the current language). Then:
`Linking.openURL('https://api.whatsapp.com/send?phone=<digits>&text=' + encodeURIComponent(text))` — omit `phone=` when no number saved.

## Modals
Use bottom sheets (Modal + animated translateY, drag handle bar, scrim) matching the PWA feel — not centered dialogs.

## App identity
- App name: **Payat Book**, package `com.suhailphp.payatbook`
- Icon + adaptive icon from `assets/icon-512.png` (white background), splash: logo on `#FAF7F0`

## Build & deliver
1. `npx expo install` all deps; app must run with `npx expo start` (Expo Go) for quick testing.
2. Produce an installable APK: configure EAS (`eas build -p android --profile preview`) **or** local `npx expo run:android` — document both in README.
3. Update README: project structure, how to run, how to build APK, note that `/docs` is the live web (iPhone) version.
4. Commit in logical steps and push to `origin main`.

## Acceptance checklist
- [ ] Fresh install → add person → they gave ₹1,000 → balance shows red ₹1,000 To give; Home totals correct
- [ ] I gave ₹2,000 → balance flips to green ₹1,000; chips suggested ₹1,000/₹2,000 correctly
- [ ] Host payat → pending list shows only people with positive balance not yet paid; adding moves them to Paid
- [ ] Finish payat → button becomes Add late payment and still works
- [ ] Language toggle switches every visible string incl. share text; Malayalam renders correctly
- [ ] Backup file exports via share sheet; restoring it on a clean install reproduces all data; PWA backup file also imports
- [ ] Kill app / reboot phone → all data intact (SQLite)
- [ ] WhatsApp share opens chat with formatted statement
