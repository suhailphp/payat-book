# PAYAT BOOK — v7 Updates (Claude Code spec)

Two features. Kasavu tokens throughout; new strings in BOTH i18n tables from §3 only.

---

## 1. "If I host now" — collection forecast card

### The idea
When Hameed hosts a payat, he invites the people who **owe him** (positive balance). Each guest typically gives back roughly **double** what they owe — that's the tradition: the debt is settled and a new one is started in the other direction. Some give only the same amount ("closing"). So a host can estimate his collection before deciding to host.

**Important: this is a collection estimate, NOT a net position.** Only people with a POSITIVE balance (they should give Hameed) are counted. People Hameed owes are excluded entirely — never subtract them.

### The maths (pure, tested functions in `lib.ts`)

**Measured from Hameed's real book (42 observed payments):** people pay back a mean of **2.03×** what they owe — 71% pay almost exactly 2×, 19% pay more (up to 3×), 9% pay less (down to 1×). So the multiple is NOT the main uncertainty. The real uncertainty is **attendance** — how many of the invited actually turn up. The card must reflect that.

For each person `p` with `balance(p) > 0` (people Hameed OWES are excluded entirely — never subtract them):

```
expected(p) = balance(p) × multiplier(p)
```

`multiplier(p)`, in priority order:
1. **Learned** — walk that person's txns oldest→newest tracking the running balance; each time they gave money (`dir==='in'`) while they owed him, record `amount / balanceBefore`. Use the mean of their ratios, clamped to [1, 3]. Mark `fromHistory: true`.
2. **Global** — the mean of all such observations across all people, when this person has none.
3. **Default 2.03** when there are no observations anywhere (the state right after the book import).

**Attendance factor** — a user-controlled rate `attendance` (0.1–1.0), persisted in `meta.attendanceRate`, default **0.8**. The headline figure is:

```
expected = round( Σ expected(p) × attendance )
```

**Range** comes from the measured spread of multiples (sd ≈ 0.35), not from a 1×/2× guess:

```
low  = round( Σ balance(p) × 1.70 × attendance )
high = round( Σ balance(p) × 2.40 × attendance )
```

Return:
```
{ expected, low, high, peopleCount, attendance, observed,
  perPerson: [{ personId, name, balance, multiplier, expected, fromHistory }] }
```

### The card
Position: on the dashboard, directly **above** the Balance Bubbles card.
ONE hero number, with the range as a single quiet supporting line. The card must be readable at a glance by a 60+ user — the big figure is the answer, the range is context, not competition.

Layout, top to bottom:
- Full-width card, paper background, **gold border** (2px, `--gold`) and a subtle gold-tinted header strip, echoing the kasavu motif. Not green: green means actual money, this is an estimate.
- Title row: `forecastTitle` with a small house/host icon.
- **Hero number**: `expected`, large (32px), tabular, green-deep, count-up on mount (reuse the dashboard count-up, honour reduce-motion).
- One line under it: `forecastFrom` — "from {n} people who owe you".
- **Range line**, directly beneath, 13px ink-soft, centred: `forecastRangeLbl` — "Likely between {low} and {high}". Plain text, no bar or chart — it must read as a footnote to the hero number, never rival it.
- **Attendance stepper**: a compact `–  If 80% come  +` control, 10% steps, range 10–100%. Tapping ± recomputes the hero number live and persists to `meta.attendanceRate` (debounced). Tap targets ≥44px.
- Footer: `forecastNote` (or `forecastNoteLearned` once `observed > 0`), 12.5px ink-soft.
- Whole card tappable → detail sheet.
- Hidden entirely when `peopleCount === 0`.


### Detail sheet
Title `forecastTitle`. Lists `perPerson` sorted by `expected` desc, via the existing SearchableList (search + Show more). Row: avatar initials, name, `balance` chip, and on the right the expected amount with a small `×2.0` multiplier tag — tag styled gold when `fromHistory` is true, plain grey when it's a fallback, so he can see which numbers are informed. Tapping a row → that Person screen.
Sheet header repeats `forecastRangeLbl` and the attendance stepper, so the estimate can be adjusted from here too.

---

## 2. Rename "Book" tab → Dashboard, and add a real Book page

### 2a. Rename
The current first tab (`tabBook`, "Book" / "ബുക്ക്") becomes `tabDashboard` — "Dashboard" / "ഡാഷ്ബോർഡ്". Same screen, same icon, only the label and key change. Free up the word "Book" for the new page.

### 2b. New Book page (5th tab)
A ledger view of every person, styled like his real handwritten book. Tab label `tabBookPage` ("Book" / "ബുക്ക്"), open-book icon (reuse the existing one from the old Book tab).

**Table columns**, left to right:

| # | Name | Opening | last 5 entries (oldest→newest) | Balance |

- `#` — serial number, 1..N in the current sort order (NOT the ref field). Narrow, gold-tinted background column, like the S.No column in his book.
- `Name` — person name; if `ref` exists, show it under the name in 11px ink-soft.
- `Opening` — the opening-balance txn amount if the person has one (use the existing `findOpeningTxn`), signed by its direction; blank when none.
- Then up to **5 transaction cells**, the person's most recent five entries EXCLUDING the opening one, ordered oldest→newest so it reads like a running ledger. Each cell shows the amount coloured by direction (green = they gave / receivable side, red = he gave), with the date in 10px under it. Empty cells stay blank so columns line up.
- `Balance` — current balance, bold, green when positive, red when negative, "settled" chip when zero. This column is **sticky to the right edge** so it stays visible while scrolling horizontally.

**Ledger styling** (this should feel like paper, not a spreadsheet):
- Alternating row backgrounds: `--paper` and `--cotton`.
- 1px `--line` rules between every row; a double gold rule (4px + 1px, the kasavu motif) under the header row.
- Header row: `--gold-soft` background, `--green-deep` bold labels, uppercase, letter-spaced.
- A thin vertical `--gold` rule separating the `#` column and another before the `Balance` column — mirroring the ruled columns in his book.
- Baloo Chettan 2 throughout, tabular numerals for all amounts.
- Horizontal scroll for the table body with the `#`+`Name` columns **frozen on the left** and `Balance` frozen right; vertical scroll virtualised (FlatList) — it must handle 450+ people smoothly.

**Controls above the table:**
- Search field (name + ref), reusing SearchableList's filter behaviour but rendering rows as table rows.
- A sort control (segmented): `sortName` (A→Z) / `sortBalance` (highest receivable first) / `sortRecent` (most recent entry first).
- A filter chip row: `filterAll` / `filterToReceive` / `filterToGive` / `filterSettled`.
- Totals strip pinned under the header: people count, total to receive, total to give — recomputed for the current filter.

### 2c. Export as PDF
Button in the Book page header (download icon) → generates a PDF of the **current filter and sort**.

- Use `expo-print`'s `printToFileAsync({ html })`, then `expo-sharing` to share it; on web fall back to opening the HTML in a new window and calling `window.print()`.
- HTML/CSS must reproduce the on-screen ledger styling: kasavu gold rules, alternating rows, green/red balances, Baloo Chettan 2 embedded via Google Fonts link (fall back to a serif if offline).
- Page setup: A4 **landscape**, repeating table header on every page (`thead { display: table-header-group }`), page numbers in the footer.
- Document header on page 1: the horizontal logo (inline base64 from assets, language-appropriate), `{owner}'s Payat Book`, generation date (DD/MM/YYYY), and the totals strip.
- Final row: a bold totals row (to receive / to give / net).
- Filename: `payat-book-YYYY-MM-DD.pdf`.
- Long books must not blow memory — build the HTML by streaming rows into a string, and test with 450 people.

---

## 3. New i18n keys (both tables, verbatim)

| key | en | ml |
|---|---|---|
| tabDashboard | Dashboard | ഡാഷ്ബോർഡ് |
| tabBookPage | Book | ബുക്ക് |
| forecastTitle | If you host a payat now | ഇപ്പോൾ പയറ്റ് നടത്തിയാൽ |
| forecastFrom | from {n} people who owe you | നിങ്ങൾക്ക് തരാനുള്ള {n} പേരിൽ നിന്ന് |
| forecastRangeLbl | Likely between {low} and {high} | {low}-നും {high}-നും ഇടയിൽ |
| forecastNote | Estimate — most people give about double their balance. | ഏകദേശ കണക്ക് — മിക്കവരും ബാലൻസിന്റെ ഇരട്ടി തരാറുണ്ട്. |
| forecastAttendance | If {p}% come | {p}% പേർ വന്നാൽ |
| forecastNoteLearned | Estimate — based on how people have paid you before. | ഏകദേശ കണക്ക് — മുൻപ് ആളുകൾ തന്ന രീതി അനുസരിച്ച്. |
| bookOpening | Opening | തുടക്കം |
| bookEntries | Entries | ഇടപാടുകൾ |
| bookBalance | Balance | ബാലൻസ് |
| bookSno | # | # |
| exportPdf | Export as PDF | PDF ആയി എടുക്കുക |
| pdfTitle | {n}'s Payat Book | {n}-ന്റെ പയറ്റ് ബുക്ക് |
| pdfGenerated | Generated {d} | തയ്യാറാക്കിയത് {d} |
| sortName | Name | പേര് |
| sortBalance | Balance | ബാലൻസ് |
| sortRecent | Recent | പുതിയത് |
| filterAll | All | എല്ലാം |
| filterToReceive | To receive | കിട്ടാനുള്ളത് |
| filterToGive | To give | കൊടുക്കാനുള്ളത് |
| filterSettled | Settled | തീർന്നത് |
| totalsLine | {n} people · {r} to receive · {g} to give | {n} പേർ · {r} കിട്ടാൻ · {g} കൊടുക്കാൻ |

---

## 4. Verify before finishing
- Node tests: multiplier learning (a person who paid 2× then 1× averages 1.5; clamped at 3; no-history falls back to global mean then 2.0); forecast excludes negative and zero balances entirely; low/high bounds; book row assembly (opening excluded from the 5 entry cells, oldest→newest order, fewer than 5 entries pads correctly).
- Node tests also cover: attendance scaling (same data at 100% vs 50% halves the figure), and that people with zero or negative balances never enter the sum.
- Manual: with the imported 447-person book and the default 80% attendance the forecast should read ≈ ₹8,31,000 from 140 people (range ≈ ₹6,96,000 – ₹9,82,000); at 100% it becomes ≈ ₹10,39,000. Add a real payat collection and confirm that person's multiplier switches to learned and its tag turns gold.
- Book page scrolls smoothly at 447 rows, frozen columns hold, filters and sort recompute the totals strip, PDF exports with repeating headers and correct colours.
- tsc clean, web export clean, all tests green. Commit in logical steps, push, report.
