# PAYAT BOOK — v6.1 Updates (Claude Code spec)

Two refinements. Kasavu tokens; new strings in BOTH tables from §3.

## 1. About page v2 — proper author page
Replace the current basic About screen with this structure (single scroll view, generous spacing):

1. **Portrait hero** — `assets/author-bw.jpg` (provided; 600×600 B&W). Render as a 132px circle with the kasavu double ring: 3px gold ring, 4px gap, 1px gold hairline ring (mirror of the header stripe motif). Soft shadow. Centered.
2. **Identity block**, centered:
   - `Suhail M` — 22px, weight 700, ink
   - `Software Developer` — 15px, ink-soft
   - `Sharjah Police Science Academy` — 14px, ink-soft
   (These three are literal strings, same in both languages.)
3. **Contact card** — one card, two rows (this replaces the two big buttons). Each row: leading icon in a green-tint circle (WhatsApp glyph / mail glyph), label above value:
   - Row 1: label `contactWhatsApp`, value = the actual number from `author.ts` formatted readably (e.g. +971 5X XXX XXXX). Whole row tappable → wa.me deep link.
   - Row 2: label `contactEmailLbl`, value = the actual email address. Row tappable → mailto.
   - Values are REAL TEXT on screen (user asked to see them), 16px, weight 600; chevron at row end signals tappability. Long-press copies the value to clipboard with a toast (`copied`).
4. **Divider** — a short centered kasavu stripe (60px wide, the double-gold motif).
5. **App block**, centered: existing square logo at 72px, `Payat Book` + version, tagline line: `aboutTagline` (localized — it's the brand tagline from the logos).
6. **Footer line**: `aboutFooter`, 13px ink-soft, centered, comfortable bottom padding.

Entrance: reuse the dashboard's stagger pattern (portrait → identity → contact → app block), respecting reduce-motion. No other animation.

## 2. Dashboard — invitations first
- Move the invitations/upcoming-payat presentation ABOVE the Balance Bubbles card: order becomes greeting → book spread + net line → **Invitations** → bubbles → waiting-longest → this month → chart → top balances → recent.
- Show up to 5 pending invitations (overdue first, then soonest), same row design as the Payments tab (host, date, relative chip; tap → Payments tab). If more than 5 exist, a `showMore` ghost button navigates to the Payments tab. If zero pending, the section disappears entirely (no header, no gap).
- This replaces the previous single "most urgent" card — remove it.

## 3. New i18n keys
| key | en | ml |
|---|---|---|
| contactWhatsApp | WhatsApp | വാട്സ്ആപ്പ് |
| contactEmailLbl | Email | ഇമെയിൽ |
| copied | Copied | കോപ്പി ചെയ്തു |
| aboutTagline | Our Tradition. Our Trust. | നമ്മുടെ പാരമ്പര്യം. നമ്മുടെ വിശ്വാസം. |
| aboutFooter | Built for the payattu tradition of Malabar. | മലബാറിന്റെ പണപ്പയറ്റ് പാരമ്പര്യത്തിനായി നിർമ്മിച്ചത്. |

## 4. Verify
- Portrait renders crisply in the gold ring on web + Android; rows open WhatsApp/mail; long-press copies; ML mode translates labels/tagline/footer, identity stays literal
- Dashboard: with 7 pending invitations → 5 shown above bubbles + Show more → Payments; with 0 → section absent; ordering correct on first open with no interaction needed
- tsc clean, web export clean, tests still green (update any dashboard-order snapshot/test)
- Commit, push, report + manual checklist
