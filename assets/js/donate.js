// עמוד התרומות: מילוי הפרטים מתוך config.js / settings.json
import { ready, content, el, copyButton, newWin } from './main.js';
import { isPlaceholder } from './config.js';

const SOON = 'יעודכן בקרוב';

function kvRow(label, value, copy = true) {
  const ph = isPlaceholder(value);
  return el('li', {}, el('span', { class: 'k', text: label }),
    el('span', { class: 'kv-val' }, el('span', { class: ph ? 'v placeholder' : (/^[\d\s+-]+$/.test(value) ? 'v ltr' : 'v'), text: ph ? SOON : value }), copy && !ph ? copyButton(value) : null));
}
function linkBtn(href, text, cls) {
  const ok = href && !isPlaceholder(href) && /^https:\/\//i.test(href);
  return ok ? el('a', { class: `btn ${cls}`, href, target: '_blank', rel: 'noopener noreferrer' }, text, newWin())
    : el('span', { class: `btn ${cls}`, 'aria-disabled': 'true', text: `${text} – ${SOON}` });
}

Promise.all([ready, content]).then(([cfg, c]) => {
  const D = cfg.donate;
  document.getElementById('bit-body').replaceChildren(
    el('ul', { class: 'kv' }, kvRow('מספר לתרומה בביט', D.bit.phone)),
    el('div', { class: 'actions' },
      D.bit.link ? linkBtn(D.bit.link, 'תרומה בביט', 'btn-gold')
        : (isPlaceholder(D.bit.phone)
          ? el('span', { class: 'btn btn-gold', 'aria-disabled': 'true', text: `תרומה בביט – ${SOON}` })
          : copyButton(D.bit.phone.replace(/\D/g, ''), 'העתקת המספר לביט'))));

  document.getElementById('paybox-body').replaceChildren(
    el('p', { class: 'muted small', text: c.donate?.payboxBody || 'תרומה מהירה דרך קבוצת PayBox של בית הכנסת.' }),
    el('div', { class: 'actions' }, linkBtn(D.paybox.link, 'מעבר ל-PayBox', 'btn-gold')));

  const B = D.bank;
  const all = `${B.bankName} (${B.bankNumber}), סניף ${B.branch}, חשבון ${B.account}, שם המוטב: ${B.beneficiary}`;
  document.getElementById('bank-body').replaceChildren(
    el('ul', { class: 'kv' },
      kvRow('בנק', `${B.bankName} (${B.bankNumber})`, false),
      kvRow('מספר בנק', B.bankNumber),
      kvRow('סניף', B.branch),
      kvRow('מספר חשבון', B.account),
      kvRow('שם המוטב', B.beneficiary)),
    el('div', { class: 'actions' }, copyButton(all, 'העתקת כל הפרטים')));
});
