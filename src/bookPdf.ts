import { Platform } from 'react-native';
import { dstr, fmt, today, type BookRow } from './lib';

type T = (k: string) => string;
type TP = (k: string, v: Record<string, string | number>) => string;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* amount cell coloured by direction (green = receivable/out, red = in); the
   opening entry is labelled instead of dated. */
const moneyCell = (
  cell: { amount: number; dir: 'in' | 'out'; date?: string | null; isOpening?: boolean } | null,
  lang: string,
  openingLabel: string
): string => {
  if (!cell) return '<td class="m"></td>';
  const cls = cell.dir === 'out' ? 'g' : 'r';
  const sub = cell.isOpening
    ? `<span class="op">${openingLabel}</span>`
    : cell.date
      ? `<span class="dt">${dstr(cell.date, lang)}</span>`
      : '';
  return `<td class="m ${cls}">${fmt(cell.amount)}${sub}</td>`;
};

/* Build the ledger HTML by streaming rows into an array (never a giant literal),
   so a 450-row book stays cheap on memory. Mirrors the on-screen kasavu styling;
   A4 landscape, the table header repeats on every page. */
export function bookHtml(
  rows: BookRow[],
  tot: { recv: number; give: number; count: number },
  owner: string,
  lang: string,
  t: T,
  tp: TP,
  autoPrint = false
): string {
  const parts: string[] = [];
  const net = tot.recv - tot.give;
  parts.push(`<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { size: A4 landscape; margin: 12mm; @bottom-right { content: counter(page) " / " counter(pages); font-size: 9px; color: #5C6657; } }
  * { box-sizing: border-box; }
  /* System fonts only — NO network stylesheet. A remote <link> made the print
     WebView block on the font download, so on the village network the export
     hung forever with the button stuck. "Noto Sans Malayalam" is built into
     Android and renders the ML labels/names. */
  body { font-family: "Noto Sans Malayalam", system-ui, -apple-system, Roboto, "Segoe UI", Georgia, serif; color: #20291F; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; }
  .brand { font-size: 22px; font-weight: 700; color: #0A3F2A; }
  .brand .p { color: #C9A227; }
  .sub { font-size: 11px; color: #5C6657; }
  .totstrip { text-align: right; font-size: 12px; color: #0A3F2A; font-weight: 600; }
  .kasavu { height: 4px; background: #C9A227; }
  .kasavu2 { height: 1px; background: #C9A227; margin-top: 2px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead { display: table-header-group; }
  th { background: #EFE3BC; color: #0A3F2A; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
       font-size: 10px; padding: 5px 6px; border-bottom: 3px solid #C9A227; text-align: center; }
  th.name { text-align: left; }
  td { padding: 4px 6px; border-bottom: 1px solid #E7E1D2; text-align: center; vertical-align: middle; }
  tr:nth-child(even) td { background: #FAF7F0; }
  tr { page-break-inside: avoid; }
  td.sno { background: #EFE3BC; border-right: 1px solid #C9A227; width: 34px; color: #5C6657; }
  td.name { text-align: left; }
  td.name .ref { display: block; font-size: 9px; color: #5C6657; }
  td.bal { border-left: 1px solid #C9A227; font-weight: 700; white-space: nowrap; }
  td.m { white-space: nowrap; }
  td.m .dt { display: block; font-size: 8px; color: #5C6657; }
  td.m .op { display: block; font-size: 8px; color: #C9A227; font-weight: 700; }
  .g { color: #0E5A3C; font-weight: 700; }
  .r { color: #A63A2B; font-weight: 700; }
  .settled { color: #5C6657; }
  tfoot td { border-top: 3px solid #C9A227; font-weight: 700; background: #EFE3BC; padding: 6px; }
  <\/style></head><body>
<div class="head">
  <div><div class="brand">Payat<span class="p"> Book<\/span><\/div>
  <div class="sub">${esc(tp('pdfTitle', { n: owner || '—' }))} · ${tp('pdfGenerated', { d: dstr(today(), lang) })}<\/div><\/div>
  <div class="totstrip">${esc(tp('totalsLine', { n: tot.count, r: fmt(tot.recv), g: fmt(tot.give) }))}<\/div>
</div>
<div class="kasavu"><\/div><div class="kasavu2"><\/div>
<table><thead><tr>
  <th>${t('bookSno')}<\/th><th class="name">${t('fName')}<\/th>
  <th>1<\/th><th>2<\/th><th>3<\/th><th>4<\/th><th>5<\/th><th>${t('bookBalance')}<\/th>
<\/tr><\/thead><tbody>`);

  const opLabel = t('bookOpening');
  rows.forEach((r, i) => {
    const ref = r.person.ref ? `<span class="ref">${esc(r.person.ref)}<\/span>` : '';
    const cells = Array.from({ length: 5 }, (_, k) => moneyCell(r.entries[k] ?? null, lang, opLabel)).join('');
    const bal =
      r.balance === 0
        ? `<td class="bal settled">${t('settled')}<\/td>`
        : `<td class="bal ${r.balance > 0 ? 'g' : 'r'}">${fmt(r.balance)}<\/td>`;
    parts.push(
      `<tr><td class="sno">${i + 1}<\/td><td class="name">${esc(r.person.name)}${ref}<\/td>${cells}${bal}<\/tr>`
    );
  });

  parts.push(`<\/tbody><tfoot><tr>
  <td colspan="7" style="text-align:right">${esc(tp('totalsLine', { n: tot.count, r: fmt(tot.recv), g: fmt(tot.give) }))}<\/td>
  <td class="${net >= 0 ? 'g' : 'r'}">${fmt(net)}<\/td>
<\/tr><\/tfoot><\/table>
${autoPrint ? '<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},400)})<\\/script>' : ''}
</body></html>`);
  return parts.join('');
}

/* Generate + share the PDF. Web: open the HTML in a new tab that auto-prints. */
export async function exportBookPdf(
  rows: BookRow[],
  tot: { recv: number; give: number; count: number },
  owner: string,
  lang: string,
  t: T,
  tp: TP
): Promise<void> {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('popup blocked');
    w.document.write(bookHtml(rows, tot, owner, lang, t, tp, true));
    w.document.close();
    return;
  }

  /* Loaded lazily so the print native module is only required when the user
     actually exports. Each step throws a clear message on failure — nothing is
     swallowed, so the caller can always toast the real reason and re-enable. */
  const Print = require('expo-print');
  if (!Print || typeof Print.printToFileAsync !== 'function') {
    throw new Error('expo-print is not available in this build');
  }
  const Sharing = require('expo-sharing');

  const { uri } = await Print.printToFileAsync({
    html: bookHtml(rows, tot, owner, lang, t, tp, false),
    base64: false,
  });
  if (!uri) throw new Error('PDF was not created');

  /* printToFileAsync returns a file:// URI in the app cache, which expo-sharing
     exposes to other apps via its FileProvider. Explicit mimeType + UTI so the
     Android/iOS share sheet offers PDF-capable apps. */
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('No app available to share the PDF');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `payat-book-${today()}.pdf`,
    UTI: 'com.adobe.pdf',
  });
}
