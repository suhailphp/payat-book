# PAYAT BOOK — v4 Updates (Claude Code spec)

Implement in order. Design language reference stays `docs/design/index.html` (kasavu tokens). Every new string goes into BOTH i18n tables — exact EN/ML pairs in §8. Do not write any Malayalam not listed there.

## 1. Themed confirm modal (replace ALL default confirms)
Build one reusable `ConfirmSheet` used everywhere `window.confirm` / `Alert.alert` currently appears (delete entry, delete person, delete payat, restore backup):
- Bottom sheet, same pattern as existing sheets: drag handle, scrim, 22px top radius, paper background
- Content: title (bold, 19px), message (ink-soft), then two buttons: destructive action (`.btn danger` style — red outline for deletes; green solid for non-destructive confirms like restore) and a plain cancel below it
- Promise-based API: `const ok = await confirmSheet({title, message, confirmLabel, destructive})` so call sites stay one-liners
- Works identically on web and native (it's pure RN — no platform branching)

## 2. Fix backup (investigate first, then repair both platforms)
Current state: backup does nothing. Diagnose before patching — add a visible error toast with the caught error (`backupFailed` string); silent catch is forbidden.
Likely causes to check, in order:
- **Web:** `expo-sharing` is unavailable in browsers → `Sharing.isAvailableAsync()` false, or `expo-file-system` throws on web. Web path must be: build the JSON string → `new Blob` → object URL → programmatic `<a download="payat-backup-YYYY-MM-DD.json">` click. Restore on web: hidden `<input type="file">` if expo-document-picker misbehaves.
- **Native:** verify the expo-file-system API used matches SDK 57 (legacy `writeAsStringAsync` vs the new File API — use whichever the installed version exports), write to cacheDirectory, then `Sharing.shareAsync(uri, {mimeType:'application/json'})`.
- Ensure `meta.lastBackup` only updates on success. Add a node test that the export payload round-trips and stays v2-format compatible.

## 3. Pagination + search everywhere (reusable)
Build one `SearchableList` component wrapping FlatList:
- Props: data, renderRow, searchKeys (e.g. name, note), initialLimit (default 10), pageSize (default 25), emptyState
- Renders: search field on top (only when data.length > initialLimit), the limited list, and a full-width **Show more** ghost button when more rows exist (increments by pageSize). Searching searches the FULL dataset, not just the visible page.
- `keyboardShouldPersistTaps="handled"`, virtualized, segmented-card row borders as already implemented
Apply it to: People, Payments (All payments), Payatts list, Hosting screen **Paid** and **Have balance — yet to come** sections, Person history, and both person pickers. Dashboard lists stay capped (they link into full pages).

## 4. Dashboard v2 — design brief
This app is a ledger (same family as udhaar/khata apps: the daily questions are "what's my position?", "who's pending?", "what happened recently?", "let me act fast"). Rebuild the Book tab top-to-bottom:

1. **Greeting**: `greeting` ("Welcome, {name}" / "സ്വാഗതം, {name}"), localized date under it
2. **Book spread** (unchanged — signature element) + one small line beneath it: net position — `netReceive`/`netGive` with the absolute difference, e.g. "Net to receive: ₹14,000"
3. **Quick actions** — a 4-button grid of large icon tiles (56px+ targets, green-tint background, green icon, label under): Host a payat · Pay a payat · Add person · Backup. These are the four things Hameedka actually does; reuse existing flows/sheets.
4. **Ongoing payat card** (only when a hosting has `status='open'`): gold-bordered card — title, running total, "collected from N", one **Add collection** button jumping straight into that hosting's picker. This is the killer feature during a live payat night.
5. **This month** stat cards (keep)
6. **Last 6 months** chart (keep; animate per §6; tap month → caption updates — keep)
7. **Top balances** to receive / to give (keep, rows via SearchableList capped at 5, "Show more" → People tab)
8. **Recent entries** (keep, capped 8)
9. Backup banner logic unchanged
Empty states: brand-new book shows greeting + spread + quick actions + the existing empty-book card only.

## 5. Logo → dashboard
Tapping the `BrandLogo` in ANY header navigates to the Book tab (root). Add generous hitSlop. Keep back-arrow behavior unchanged.

## 6. Animations (tasteful, to delight — not carnival)
Use the built-in RN `Animated` API only (no Reanimated dependency; must work on web):
- Dashboard mount: cards stagger in (opacity 0→1 + translateY 12→0, 260ms, ~70ms stagger)
- Amounts on the spread and This-month cards: count-up from 0 over ~600ms (tabular numerals prevent jitter)
- Chart bars grow from the baseline, staggered left→right, 420ms ease-out
- Kasavu header stripe: one subtle gold shimmer sweep on app open (2s, once, low opacity)
- Sheets already slide; keep timing consistent (~220ms)
- Respect `AccessibilityInfo.isReduceMotionEnabled()` — when true, skip all of the above (instant final states)

## 7. Header controls
- Welcome/onboarding screen: replace the language segmented control with a compact globe icon button (top-right) that toggles EN ⇄ ML instantly (`langToggle` accessibility label). Keep the rest of the screen.
- Every other screen: exactly one gear (settings) icon on the header right — consistent on root AND detail screens (detail screens: back left, logo, gear right, contextual action like trash/edit stays next to gear where it exists today). Language switching lives inside Settings as it does now.

## 8. New/changed i18n keys
| key | en | ml |
|---|---|---|
| greeting (CHANGE existing) | Welcome, {n} | സ്വാഗതം, {n} |
| qConfirmTitle | Are you sure? | ഉറപ്പാണോ? |
| qDelete | Delete | ഒഴിവാക്കുക |
| qCancel | Cancel | വേണ്ട |
| qRestoreBtn | Restore | തിരിച്ചെടുക്കുക |
| showMore | Show more | കൂടുതൽ കാണുക |
| quickActions | Quick actions | പെട്ടെന്നുള്ള കാര്യങ്ങൾ |
| netReceive | Net to receive: {a} | മൊത്തം കിട്ടാനുള്ളത്: {a} |
| netGive | Net to give: {a} | മൊത്തം കൊടുക്കാനുള്ളത്: {a} |
| ongoingPayat | Ongoing payat | നടക്കുന്ന പയറ്റ് |
| backupFailed | Backup failed: {e} | ബാക്കപ്പ് പരാജയപ്പെട്ടു: {e} |
| langToggle | Change language | ഭാഷ മാറ്റുക |
Existing confirm strings (qDelEntry, qDelPayat, qDelPerson, qRestore) become the ConfirmSheet messages.

## 9. Verify before finishing
- tsc clean; `npx expo export -p web` clean; extend node tests (SearchableList paging/search logic as pure functions, backup payload round-trip, net-position calc)
- Manual: every delete/restore shows the themed sheet on web AND lists the same on Android; backup downloads a JSON in Chrome and opens the share sheet on a device; search+Show more on People/Payments/Payatts/Hosting sections/history; logo tap returns to dashboard from every screen; greeting reads Welcome/സ്വാഗതം; animations play once and are skipped with reduce-motion on
- Commit in logical steps, push to origin main, report summary + manual checklist
