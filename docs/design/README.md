# Payat Book — Panapayattu ledger PWA (v2)

Serverless, offline-first, bilingual (English / മലയാളം). All data lives in the phone's own storage (IndexedDB). No backend, no accounts, no cost.

## How it works
- `index.html` — the whole app (UI + logic + both languages)
- `sw.js` — service worker: caches everything so it works with zero internet
- `manifest.webmanifest` + icons — makes it installable as an app
- **Database** = IndexedDB, built into the browser, stored inside the phone. Stores: `people`, `events` (hostings), `txns` (entries), `meta` (language, last backup).

## Deploy to YOUR repo (github.com/suhailphp/payat-book)
From the cloned repo folder:
```bash
# copy these files into the repo root, then:
git add .
git commit -m "Payat Book v2 - bilingual PWA"
git push origin main
```
Then on GitHub: **Settings → Pages → Source: main branch, / (root) → Save**
App goes live at: **https://suhailphp.github.io/payat-book/**

## Install as an app
- **Android:** open the link in Chrome → ⋮ menu → **Install app** (or Add to Home screen)
- **iPhone:** open in Safari → Share → **Add to Home Screen**
- Later, for Google Play: wrap this same URL with Bubblewrap (TWA) — no code changes:
  `npx @bubblewrap/cli init --manifest https://suhailphp.github.io/payat-book/manifest.webmanifest`

## v2 features
- **Language toggle** (⚙ → Language): English / മലയാളം — every screen translated
- **Host a payat**: creates a hosting page with
  - **Paid** list (add people live as they give; new person can be added on the spot)
  - **Have balance — yet to come** list (everyone who owes and hasn't paid at this payat, with one-tap Add)
  - **Finish payat** status — and late payments still allowed after finishing ("Add late payment")
- **Pay a payat**: quick flow — pick the person → amount (with *close balance / double* suggestion chips) → save. No event name needed.
- **WhatsApp share** of any person's statement, in the selected language
- **Backup/restore** JSON via share sheet (⚙)

## Balance rule
One running balance per person. They gave me → I owe them. I gave them → reduces my debt; extra becomes their debt to me. Green = to receive, red = to give.
