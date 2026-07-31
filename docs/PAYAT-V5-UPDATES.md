# PAYAT BOOK — v5 Updates (Claude Code spec)

Implement in order. Kasavu design tokens as always. New strings in BOTH tables from §6 only.

## 1. Remove Quick actions
Delete the Quick-actions grid from the dashboard entirely (the four flows already live in the tabs). Everything else on the dashboard keeps its current order, with §2 and §3 inserted where Quick actions was.

## 2. Balance Bubbles — the dashboard centerpiece (the ONE creative animation)
A card titled `bubblesTitle` directly under the book-spread/net line.

**Content:** up to 8 bubbles = the people with the largest absolute balances. Each bubble: circle with the person's initials (bold, centered), name under the circle (11px), amount under the name (bold, tabular). Colors: balance > 0 (they should give you) → green-tint fill, green-deep text, 2px green border; balance < 0 → red-tint fill, red text, 2px red border. Settled people never appear.

**Sizing:** diameter = 56 + 44 × sqrt(|bal| / maxAbsBal), clamped 56–100px.

**Layout:** deterministic greedy circle packing inside the card (~230px tall, full width): sort by diameter desc, place on a coarse candidate grid choosing the highest position with no overlap (≥10px gap). Pure function `packBubbles(items, width, height)` + node test asserting no overlaps and all-inside-bounds for 1–8 bubbles at 320/390/430px widths.

**Animation (RN Animated only, per-bubble independent loops):**
- Entrance: staggered pop-in (scale 0→1, soft spring, 70ms stagger, once)
- Float: translateY oscillates ±7px, duration randomized 2400–3600ms per bubble, easeInOut, mirrored loop; translateX ±4px on a different randomized period so paths feel organic, phases offset per bubble
- Tap: quick scale 0.94 press feedback, then navigate to that Person
- Reduced motion: bubbles render static at final positions, tap still works
**Empty state:** hide the whole card when no one has a balance.

## 3. "Waiting longest" card
Small card titled `pendingLong` under the bubbles: the 3 unsettled people whose most recent txn date is oldest. Row: avatar initials, name, balance chip, and `daysAgo` (days since their last entry, from txn dates). Tap → Person. Hide when fewer than 1 qualifies. Pure helper `waitingLongest(people, txns, n)` + node test (ordering, excludes settled, ties by amount desc).

## 4. WhatsApp share — include the other person's name
Statement currently opens with only the owner. New format, both languages:
```
📒 *{owner} — Payat Book*
{shareFor with the person's name}        ← new line, e.g. "Account: Riyas" / "കണക്ക്: Riyas"

{history lines}

*{balance line}*
```
Update the share node test.

## 5. Verify pagination + dev seed tool
- Confirm thresholds: search input appears when a list's full dataset > 10; Show more appears whenever hidden rows exist (initial 10, +25 per press); search always scans the full dataset. Fix if any list deviates.
- Add a dev-only tool (visible only when `__DEV__`): in Settings, a button **"Seed 30 sample people + entries"** that inserts 30 people with Kerala-style names, randomized balances across both directions, entries spread over the last 6 months, and 2 hostings (1 open). Idempotent-ish is fine (append). This exists so pagination, search, bubbles, chart, and waiting-longest can be verified visually. Must be stripped from production builds automatically by the `__DEV__` guard.

## 6. New i18n keys
| key | en | ml |
|---|---|---|
| bubblesTitle | Balances at a glance | ബാലൻസ് ഒറ്റനോട്ടത്തിൽ |
| pendingLong | Waiting the longest | കൂടുതൽ നാളായി ബാക്കിയുള്ളവർ |
| daysAgo | {d} days ago | {d} ദിവസം മുൻപ് |
| shareFor | Account: {n} | കണക്ക്: {n} |
(Seed button is dev-only — English literal is fine, no key needed.)

## 7. Verify before finishing
- tsc clean, web export clean, node tests extended (packBubbles, waitingLongest, share format) — all green
- Manual: seed data → bubbles float and are tappable, sizes scale with balance, colors by direction; reduce-motion freezes them; waiting-longest orders correctly; People/Payments/Payatts/history show search + Show more with 30+ records; WhatsApp text carries both names; dashboard has NO quick-actions grid
- Commit in logical steps, push to origin main, report with the manual checklist
