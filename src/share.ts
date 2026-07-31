import { Linking } from 'react-native';
import { Lang, tFor, tpFor } from './i18n';
import { bal, dstr, fmt, Person, Txn } from './lib';

/* Statement text built exactly like the PWA's shareBalance(): full dated
   history (oldest first) then the bold balance line, in the current language.
   With an owner name the title line becomes "{owner} — Payat Book". */
export function buildShareText(p: Person, txns: Txn[], lang: Lang, owner?: string): string {
  const t = tFor(lang);
  const tp = tpFor(lang);
  const b = bal(txns, p.id);
  const hist = txns
    .filter((x) => x.personId === p.id)
    .sort((a, b2) => (a.date || '').localeCompare(b2.date || '') || a.id - b2.id)
    .map(
      (x) =>
        `${dstr(x.date, lang)} — ${x.dir === 'in' ? t('shareYouGave') : t('shareIGave')} ${fmt(x.amount)}${
          x.note ? ' (' + x.note + ')' : ''
        }`
    );
  const balLine =
    b > 0
      ? `*${tp('shareBalGive', { a: fmt(b) })}*`
      : b < 0
        ? `*${tp('shareBalMine', { a: fmt(b) })}*`
        : `*${t('shareBalZero')}*`;
  const title = owner ? tp('shareTitleOwner', { n: owner }) : tp('shareTitle', { n: p.name });
  return `📒 *${title}*\n${tp('shareFor', { n: p.name })}\n\n${hist.join('\n')}\n\n${balLine}`;
}

export async function shareOnWhatsApp(p: Person, txns: Txn[], lang: Lang, owner?: string): Promise<void> {
  const text = buildShareText(p, txns, lang, owner);
  const phone = (p.phone || '').replace(/[^\d]/g, '');
  const url = phone
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  try {
    await Linking.openURL(url);
  } catch {
    /* WhatsApp not installed and no browser handler — nothing to do */
  }
}
