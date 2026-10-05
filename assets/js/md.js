// ממיר Markdown מצומצם ובטוח ל-DOM (ללא innerHTML) – לתוכן שנערך במערכת הניהול.
// נתמך: כותרות (#..####), פסקאות, שבירת שורה, רשימות (- / 1.), **מודגש**, [קישור](url), ![תמונה](src).
// קישורים: http(s), mailto, tel ונתיבים יחסיים בלבד. תמונות: נתיבים מהאתר בלבד.

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
export function safeHref(url) {
  const u = String(url || '').trim();
  if (!u || /^\/\//.test(u)) return null;
  if (SCHEME.test(u)) return /^(https?:|mailto:|tel:)/i.test(u) ? u : null;
  return u; // יחסי / עוגן
}
export function safeSrc(url) {
  const u = String(url || '').trim();
  return u && !SCHEME.test(u) && !/^\/\//.test(u) ? u : null;
}
export const isExternal = (href) => /^https?:/i.test(href);

const INLINE = /(\*\*([^*]+)\*\*)|(!\[([^\]]*)\]\(([^)\s]+)\))|(\[([^\]]+)\]\(([^)\s]+)\))/g;

export function inline(text, doc = document) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(doc.createTextNode(text.slice(last, m.index)));
    if (m[1]) { const b = doc.createElement('strong'); b.textContent = m[2]; out.push(b); }
    else if (m[3]) {
      const src = safeSrc(m[5]);
      if (src) { const i = doc.createElement('img'); i.src = src; i.alt = m[4]; i.loading = 'lazy'; out.push(i); }
    } else if (m[6]) {
      const href = safeHref(m[8]);
      if (!href) out.push(doc.createTextNode(m[7]));
      else {
        const a = doc.createElement('a'); a.href = href; a.textContent = m[7];
        if (isExternal(href)) {
          a.target = '_blank'; a.rel = 'noopener noreferrer';
          const s = doc.createElement('span'); s.className = 'sr-only'; s.textContent = ' (נפתח בחלון חדש)'; a.append(s);
        }
        out.push(a);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(doc.createTextNode(text.slice(last)));
  return out;
}

function withBreaks(lines, doc) {
  const out = [];
  lines.forEach((l, i) => { if (i) out.push(doc.createElement('br')); out.push(...inline(l, doc)); });
  return out;
}

export function renderMarkdown(src, doc = document) {
  const frag = doc.createDocumentFragment();
  const blocks = String(src || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  for (const raw of blocks) {
    const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    const h = /^(#{1,4})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) {
      const lvl = Math.min(4, Math.max(2, h[1].length === 1 ? 2 : h[1].length));
      const el = doc.createElement(`h${lvl}`); el.append(...inline(h[2], doc)); frag.append(el); continue;
    }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l)) || lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      const ordered = /^\s*\d/.test(lines[0]);
      const list = doc.createElement(ordered ? 'ol' : 'ul');
      for (const l of lines) { const li = doc.createElement('li'); li.append(...inline(l.replace(/^\s*([-*]|\d+[.)])\s+/, ''), doc)); list.append(li); }
      frag.append(list); continue;
    }
    const p = doc.createElement('p'); p.append(...withBreaks(lines.map((l) => l.trim()), doc)); frag.append(p);
  }
  return frag;
}
