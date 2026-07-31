# PAYAT BOOK — v3 Updates (Claude Code spec)

Read this fully, then implement in order. Reference for design language stays `docs/design/index.html`. All new user-facing strings MUST be added to BOTH language tables — exact EN/ML pairs are given at the bottom; do not invent Malayalam.

## 1. Navigation restructure — 4 tabs
Replace the current 3-tab layout. New bottom tabs:

1. **Book** (dashboard — see §5)
2. **People** (unchanged)
3. **Payatts** — HOSTING ONLY. Dedicated page:
   - Top: primary button **Host a payat** (existing hostForm flow)
   - Search field (filters payatts by title)
   - List of my payatts (title, date, Open/Finished, total chip) → Hosting screen (unchanged)
   - Remove the "Pay a payat" button from this page entirely
4. **Payments** — NEW dedicated page for paying at others' payatts:
   - Top: primary button **Pay a payat** (existing payPick → amount flow)
   - Section **Recent payments**: last 5 `dir='out'` txns (person, amount, date, note)
   - Section **All payments**: every `dir='out'` txn, newest first, with a search field (matches person name and note). Rows tappable → Person screen. Delete-per-entry kept.
   - Tab icon: hands/giving icon (line style, consistent with the others)

## 2. Search everywhere (target scale: 1000+ people)
Add a search field to every list that can grow:
- People (exists), person picker sheets (exists — verify)
- Payatts list (new), Payments history (new)
- Hosting screen: **Paid** list and **Have balance — yet to come** list each get a search field when they contain more than 10 rows
- All searches: case-insensitive substring on name (and note where noted), instant filter, no button. For 1000+ rows use FlatList (virtualized) everywhere — no .map() rendering of long lists.

## 3. Logo on every screen + language-aware logo
- Header shows the horizontal logo on EVERY screen, root and detail alike. Detail screens: back arrow left, logo next to it, action icons right. Screen titles live in the content hero (already the pattern) — where a detail screen currently shows only a header title (e.g. person name), keep the name in the hero card only.
- Language-aware asset: EN → `assets/logo-h.png`, ML → `assets/logo-h-ml.png` (file is provided in the repo root or Downloads — copy into `assets/`). One `<BrandLogo/>` component that reads the current language and swaps the source. If `logo-h-ml.png` is missing at build time, fall back to the EN logo without crashing.

## 4. Onboarding — owner name
- On first launch (no `ownerName` in `meta`), before the tabs, show a one-time welcome screen: logo centered, title `welcome`, text field labeled `whatsYourName`, hint `nameHint`, button `getStarted`. Saves `meta.ownerName`, then enters the app. Language toggle (English / മലയാളം) also on this screen so the very first screen can be read.
- Settings sheet: add field `yourName` (editable, persists to meta).
- Use the name:
  - Dashboard greeting (see §5)
  - WhatsApp statement: title line becomes `*{owner} — Payat Book*` / `*{owner} — പയറ്റ് ബുക്ക്*`, and keep the rest of the statement as is. Anywhere else the app says "me/my" in shared text, prefer the owner's name.

## 5. Dashboard (Book tab) upgrade
Top to bottom:
1. Greeting row: `greeting` with owner name ("Salam, Hameed" / "സലാം, ഹമീദ്"), today's date under it (localized)
2. The book-spread card (To receive | To give) — keep exactly as is, it's the signature
3. NEW **This month** mini-stats row: two small cards — `statReceived` (sum of `in` this calendar month, green) and `statGiven` (sum of `out` this month, red)
4. NEW **Last 6 months** bar chart: grouped bars per month (received=green, given=gold), month initials as x labels, Indian-formatted totals on tap or above bars. Implement with react-native-svg directly (no chart library — keeps web build safe). Bars rounded 4px, axis lines `--line` color, height ~160.
5. NEW **Top balances**: two compact lists side by side or stacked — `topToReceive` (top 5 positive balances) and `topToGive` (top 5 negative), each row: name + amount chip, tappable → Person
6. Backup banner + Recent entries (keep)
Empty states: if no data, show the existing empty-book state instead of empty charts.

## 6. Small fixes
- The "Pay a payat" button icon on the old Payatts screen rendered as an odd glyph — replace with a clean give/hands line icon in the new Payments tab.
- Keep all touch targets ≥48px; FlatList `keyboardShouldPersistTaps="handled"` on search screens.

## 7. New i18n keys (add to BOTH tables verbatim)
| key | en | ml |
|---|---|---|
| tabPayments | Payments | കൊടുത്തത് |
| payBtn (verify exists) | Pay a payat | പയറ്റ് കൊടുക്കുക |
| recentPayments | Recent payments | പുതിയ പേയ്മെന്റുകൾ |
| allPayments | All payments | എല്ലാ പേയ്മെന്റുകളും |
| searchPayments | Search payments… | പേയ്മെന്റ് തിരയുക… |
| searchPayatts | Search payatts… | പയറ്റ് തിരയുക… |
| emptyPayT | No payments yet | പേയ്മെന്റുകൾ ഇല്ല |
| emptyPayD | What you give at others' payatts shows here. | മറ്റുള്ളവരുടെ പയറ്റിന് കൊടുക്കുന്നത് ഇവിടെ കാണാം. |
| welcome | Welcome to Payat Book | പയറ്റ് ബുക്കിലേക്ക് സ്വാഗതം |
| whatsYourName | What's your name? | നിങ്ങളുടെ പേര് എന്താണ്? |
| nameHint | Shown on your book and in WhatsApp statements. | നിങ്ങളുടെ ബുക്കിലും വാട്സ്ആപ്പ് സ്റ്റേറ്റ്മെന്റിലും കാണിക്കും. |
| getStarted | Start | തുടങ്ങുക |
| yourName | Your name | നിങ്ങളുടെ പേര് |
| greeting | Salam, {n} | സലാം, {n} |
| thisMonth | This month | ഈ മാസം |
| statReceived | Received | കിട്ടിയത് |
| statGiven | Given | കൊടുത്തത് |
| last6Months | Last 6 months | കഴിഞ്ഞ 6 മാസം |
| topToReceive | To receive — top | കൂടുതൽ കിട്ടാനുള്ളവർ |
| topToGive | To give — top | കൂടുതൽ കൊടുക്കാനുള്ളവർ |

## 8. Verify before finishing
- tsc clean, web bundle (`npx expo export -p web`) clean
- Node tests: extend existing suite — month bucketing for the chart, top-balance selection, payments filtering
- Manual list: onboarding appears only once; name edit in settings reflects on dashboard + share text; ML mode shows ML logo on every screen; search filters on People/Payatts/Payments; Payments tab shows only `out` txns; hosting flow unchanged
- Commit in logical steps, push to origin main
