# PAYAT BOOK — Malayalam search: ranking + letter index

## The real problem (measured on the live 447-name book)

Search is substring-anywhere, unranked, and capped at 10 rows. Typing one Malayalam letter gives:

| typed | names that START with it | names the search returns today |
|---|---|---|
| ക | 125 | **312** |
| മ | 46 | **288** |
| ന | 29 | **241** |
| ത | 21 | **230** |
| പ | 68 | **183** |
| വ | 32 | **164** |

So typing ക returns 312 of 447 people — nearly the whole book — with the 125 he actually wants scattered among them, and only the first 10 visible before "Show more". That is why it feels like names are missing: they are not missing, they are buried.

Three fixes, in order of impact.

---

## 1. Rank matches — prefix first (the main fix)

Stop treating every match equally. Score each match and sort:

1. **Name starts with the query** — highest
2. **Any word in the name starts with the query** (so `കുനിയിൽ` is found by typing കു even in `വടക്കെ കുനിയിൽ`)
3. **Name contains the query anywhere** — lowest
4. Matches on `nameAlt`, `ref` or `phone` rank below all name matches

Within the same tier, keep the current sort (alphabetical, or whatever the active sort is on the Book page). Apply this to every searchable list: People, Payments, Payatts, Book, both person pickers, hosting sections.

Implement as a pure, tested `rankMatches(rows, query)` in `lib.ts`.

## 2. Letter index — his book's tabs, in the app

His paper book is tabbed by letter and he navigates by flipping to a tab. Give him that.

A horizontal, scrollable strip of letter chips above the People list (and the Book page), built from the data rather than hardcoded. Tapping a chip filters to names **starting with** that letter; tapping again clears it. The chip shows the letter only; the count goes in the totals line.

**The non-obvious part — group by BASE letter, ignoring the vowel sign.** Malayalam names starting with കു, കൊ, കി and ക must all sit under one ക chip, exactly as they share one tab in his book. Grouping by the raw first character gives 46 fragmented buckets; grouping by base letter gives 19 and matches his book almost exactly:

| chip | names | his book's tab |
|---|---|---|
| ക | 125 | K (127 rows) |
| പ | 68 | P (70) |
| മ | 46 | M (50) |
| വ | 32 | V (32) |
| ന | 29 | N (22) |
| ച | 26 | C part |
| സ | 22 | C part |
| ത | 21 | T (28) |
| അ / ആ | 18 / 18 | A (36) |

Rule: take the first grapheme cluster of the folded name; if its first character is a dependent vowel sign or virama (ാ ി ീ ു ൂ ൃ െ േ ൈ ൊ ോ ൌ ൗ ്) keep the cluster, otherwise use its first character. Build the chip list from the distinct values present, sorted in Malayalam alphabetical order, and show it only when there are more than ~20 people.

In English mode, the same strip shows A–Z built the same way, so the feature is not Malayalam-only.

## 3. Do not hide search results behind "Show more"

When a query is active, the 10-row initial limit is actively harmful — the user is already narrowing. So:

- With a query present, raise the initial limit substantially (50) before "Show more" appears.
- Always show the match count next to the search field: `48 results` / `48 ഫലങ്ങൾ`, so he can see there is more below rather than assuming the rest are missing.
- Keep the 10-row limit for the unfiltered list as it is.

## 4. New i18n keys (both tables, verbatim)

| key | en | ml |
|---|---|---|
| nResults | {n} results | {n} ഫലങ്ങൾ |
| nResult1 | 1 result | 1 ഫലം |
| allLetters | All | എല്ലാം |

## 5. Tests

- `rankMatches`: a prefix match outranks a word-start match outranks a contains match; a `nameAlt`/`ref` match ranks below every name match; ties keep the incoming order.
- Base-letter grouping: കുനിയിൽ, കൊയിലോത്ത്, കിഴക്കയിൽ and കല്ലിൽ all land under ക; ആവുക്കൽ under ആ, not അ.
- Typing ക with the ക chip active returns exactly the names starting with ക (125 in the fixture), not 312.
- Result count is correct with and without a letter filter.
- Latin mode: A–Z grouping behaves the same way.

## 6. Verify
tsc clean, node tests green, web export clean. No device testing — I do that myself. Commit and push, no version bump.

> Note: this builds on the `foldSearch` work in PAYAT-ML-SEARCH.md. Ranking and grouping must both operate on the **folded** form, so chillu and zero-width variants do not split a letter group in two.
