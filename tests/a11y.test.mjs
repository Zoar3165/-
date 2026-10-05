// בדיקות נגישות אוטומטיות (axe-core) + מקלדת + הגדלה + CSP.
// שימוש: python3 tests/serve-with-headers.py 8765 &   ואז   BASE=http://127.0.0.1:8765/ CHROME=/usr/bin/google-chrome node tests/a11y.test.mjs
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const PAGES = ['index.html', 'times.html', 'donate.html', 'accessibility.html', 'page.html?p=updates', 'page.html?p=missing', '404.html'];
const MODES = {
  default: {},
  contrast: { contrast: true },
  'large-text+readable-font+links': { fs: 4, font: true, links: true },
  'grayscale+still': { gray: true, still: true },
};
let fail = 0;
const report = [];
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' – ' + extra : ''}`); };

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });

async function open(url, prefs = {}, vp = { width: 1280, height: 900 }) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/missing')) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.evaluateOnNewDocument((p) => { if (!sessionStorage.getItem('__t')) { localStorage.setItem('a11y-prefs', JSON.stringify(p)); sessionStorage.setItem('__t', '1'); } }, prefs);
  await page.setViewport(vp);
  await page.goto(BASE + url, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  return { page, errors };
}
async function axe(page) {
  await page.evaluate(AXE); // הזרקה דרך DevTools – לא דרך <script>, ולכן ה-CSP נשאר פעיל
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { preload: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes.slice(0, 3).map((x) => x.target.join(' ')).join(' | ') })), passes: r.passes.length, incomplete: r.incomplete.map((v) => v.id) };
  });
}

// 1) axe בכל עמוד ובכל מצב תצוגה
for (const p of PAGES) {
  for (const [mode, prefs] of Object.entries(MODES)) {
    const { page, errors } = await open(p, prefs);
    const pageErrors = [...errors]; // לפני הזרקת axe
    const r = await axe(page);
    report.push({ page: p, mode, violations: r.violations.length, passes: r.passes });
    ok(`axe ${p} [${mode}]: ${r.passes} rules passed`, r.violations.length === 0, r.violations.map((v) => `${v.id}(${v.impact}) x${v.n}: ${v.target}`).join('; '));
    ok(`console clean ${p} [${mode}]`, pageErrors.length === 0, pageErrors.join('; '));
    await page.close();
  }
  // תפריט נגישות פתוח
  const { page } = await open(p);
  await page.click('#a11y-toggle');
  const r = await axe(page);
  ok(`axe ${p} [toolbar open]`, r.violations.length === 0, r.violations.map((v) => `${v.id} x${v.n}: ${v.target}`).join('; '));
  await page.close();
}

// 2) מקלדת: קישור דילוג, תפריט נגישות, Escape
{
  const { page } = await open('times.html');
  await page.keyboard.press('Tab');
  ok('first Tab focuses skip link', await page.evaluate(() => document.activeElement.classList.contains('skip')));
  ok('skip link visible when focused', await page.evaluate(() => document.activeElement.getBoundingClientRect().left >= 0));
  await page.keyboard.press('Enter');
  ok('skip link moves focus to <main>', await page.evaluate(() => document.activeElement.id === 'main' || location.hash === '#main'));
  await page.focus('#a11y-toggle');
  await page.keyboard.press('Enter');
  ok('toolbar opens with keyboard, focus moves inside', await page.evaluate(() => !document.getElementById('a11y-panel').hidden && !!document.activeElement.closest('#a11y-panel')));
  // הפעלת ניגודיות במקלדת
  await page.focus('[data-a11y="contrast"]'); await page.keyboard.press('Enter');
  ok('contrast toggle via keyboard sets aria-pressed + class', await page.evaluate(() => document.querySelector('[data-a11y="contrast"]').getAttribute('aria-pressed') === 'true' && document.documentElement.classList.contains('a11y-contrast')));
  ok('preference persisted to localStorage', await page.evaluate(() => JSON.parse(localStorage.getItem('a11y-prefs')).contrast === true));
  await page.keyboard.press('Escape');
  ok('Escape closes toolbar & returns focus to toggle', await page.evaluate(() => document.getElementById('a11y-panel').hidden && document.activeElement.id === 'a11y-toggle'));
  await page.reload({ waitUntil: 'networkidle0' });
  ok('preference applied after reload', await page.evaluate(() => document.documentElement.classList.contains('a11y-contrast')));
  await page.click('#a11y-toggle'); await page.click('[data-a11y="reset"]');
  ok('reset clears all preferences', await page.evaluate(() => !document.documentElement.className.includes('a11y-') && localStorage.getItem('a11y-prefs') === '{}'));
  // מיקוד נראה
  await page.keyboard.press('Escape'); await page.focus('.site-nav a');
  ok('visible focus indicator (outline) on links', await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }));
  // השעון אינו אזור חי
  ok('clock is role=timer and not inside aria-live=polite/assertive', await page.evaluate(() => { const c = document.getElementById('clock'); return c.closest('[role=timer]') && !c.closest('[aria-live="polite"],[aria-live="assertive"],[role=status],[role=alert]'); }));
  await page.close();
}
// עצירת אנימציות → השעון ללא שניות
{
  const { page } = await open('times.html', { still: true });
  ok('"still" mode: clock shows HH:MM without seconds', await page.evaluate(() => /^\d\d:\d\d$/.test(document.getElementById('clock').textContent)));
  await page.close();
}

// 3) הגדלה: 200% (640px) ו-400% (320px) ללא גלילה אופקית; גם עם טקסט מוגדל
for (const [w, prefs, label] of [[640, {}, '200% zoom'], [320, {}, '400% zoom / 320px reflow'], [390, { fs: 4 }, 'mobile + text 175%']]) {
  for (const p of PAGES) {
    const { page } = await open(p, prefs, { width: w, height: 800 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${label}: ${p} no horizontal scroll`, over <= 1, `overflow ${over}px`);
    await page.close();
  }
}

// 4) עמודים כלליים: נוספו לתפריט; Markdown בטוח
{
  const { page } = await open('index.html');
  ok('generic page "updates" auto-added to main nav & footer', await page.evaluate(() => document.querySelectorAll('a[href="page.html?p=updates"]').length >= 2));
  const xss = await page.evaluate(async () => {
    const { renderMarkdown } = await import('./assets/js/md.js');
    const d = document.createElement('div');
    d.append(renderMarkdown('## כותרת\n\n<script>alert(1)</script> <img src=x onerror=alert(1)> [x](javascript:alert(1)) ![a](https://evil.example/x.png) [ok](https://example.com) **b**'));
    return { html: d.innerHTML, scripts: d.querySelectorAll('script,[onerror]').length, js: d.querySelectorAll('a[href^="javascript"]').length, extImg: d.querySelectorAll('img').length, ext: d.querySelector('a[target=_blank] .sr-only') != null };
  });
  ok('markdown renderer escapes HTML / drops javascript: & external images', xss.scripts === 0 && xss.js === 0 && xss.extImg === 0 && xss.ext, xss.html.slice(0, 160));
  await page.close();
  const { page: p2 } = await open('page.html?p=updates');
  ok('generic page renders title + body via template', await p2.evaluate(() => document.getElementById('page-title').textContent === 'הודעות ועדכונים' && document.querySelector('#page-body h2') != null && document.title.startsWith('הודעות')));
  ok('generic page marked aria-current in nav', await p2.evaluate(() => document.querySelector('#site-nav a[aria-current="page"]')?.getAttribute('href') === 'page.html?p=updates'));
  await p2.close();
}

await browser.close();
console.log('\nSUMMARY (axe violations per page/mode):');
console.table(report);
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
