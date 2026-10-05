// @hebcal/core v6.11.1 מאוחסן מקומית (assets/vendor) – ללא תלות ב-CDN חיצוני,
// כך שמדיניות ה-CSP יכולה להתיר סקריפטים מהאתר עצמו בלבד.
let p;
export function loadHebcal() {
  if (!p) p = import('../vendor/hebcal-core.min.js');
  return p;
}
