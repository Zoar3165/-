// בדיקת תוכן ותצורת Decap: node tests/content.test.mjs   (דורש: npm i)
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' – ' + extra : ''}`); };
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

// 1) כל המפתחות שבקובצי ה-HTML קיימים בקובצי התוכן
const content = Object.fromEntries(readdirSync('assets/data/content').map((f) => [f.replace('.json', ''), json(`assets/data/content/${f}`)]));
for (const f of readdirSync('.').filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(f, 'utf8');
  const keys = [...html.matchAll(/data-(?:t|md|t-wa)="([^"]+)"/g)].map((m) => m[1]);
  const missing = keys.filter((k) => { const [p, kk] = k.split('.'); return !(content[p] && kk in content[p]); });
  ok(`${f}: ${keys.length} editable keys present in content JSON`, missing.length === 0, missing.join(', '));
  ok(`${f}: has skip link, lang/dir, main landmark, a11y toolbar, accessibility link`,
    /class="skip" href="#main"/.test(html) && /<html lang="he" dir="rtl">/.test(html) && /<main id="main"/.test(html) && /id="a11y-toggle"/.test(html) && /href="accessibility.html"/.test(html));
  ok(`${f}: no inline scripts/styles (CSP)`, !/<script(?![^>]*\bsrc=)[^>]*>/.test(html) && !/\sstyle="/.test(html) && !/\son[a-z]+="/.test(html));
}

// 2) תצורת Decap
const cfg = yaml.load(readFileSync('admin/config.yml', 'utf8'));
ok('decap: backend git-gateway', cfg.backend?.name === 'git-gateway');
ok('decap: media folder exists in repo', cfg.media_folder === 'assets/uploads' && readdirSync('assets/uploads').length >= 0);
const names = cfg.collections.map((c) => c.name);
ok('decap: collections settings/texts/pages', ['settings', 'texts', 'pages'].every((n) => names.includes(n)), names.join(','));
for (const col of cfg.collections) {
  for (const file of col.files) {
    const data = json(file.file);
    const fieldNames = file.fields.map((f) => f.name);
    const extra = Object.keys(data).filter((k) => !fieldNames.includes(k));
    ok(`decap: ${col.name}/${file.name} → ${file.file} fields cover JSON keys`, extra.length === 0, extra.join(', '));
  }
}
const texts = cfg.collections.find((c) => c.name === 'texts');
ok('decap: every content JSON has a texts entry', Object.keys(content).every((p) => texts.files.some((f) => f.file === `assets/data/content/${p}.json`)));

// 3) עמודים כלליים
const pages = json('assets/data/pages.json').pages;
const slugs = pages.map((p) => p.slug);
ok('pages: slugs valid & unique', slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) && new Set(slugs).size === slugs.length, slugs.join(','));

// 4) אין פרטים רגישים
const all = ['assets/js/config.js', 'assets/data/settings.json', 'admin/config.yml', 'netlify.toml', ...readdirSync('.').filter((f) => f.endsWith('.html'))].map((f) => readFileSync(f, 'utf8')).join('\n');
ok('no email addresses / secrets in repo files', !/[\w.+-]+@[\w-]+\.[\w.]+/.test(all) && !/(password|secret|api[_-]?key)\s*[:=]/i.test(all));

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
