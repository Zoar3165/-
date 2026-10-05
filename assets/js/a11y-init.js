/* החלת העדפות הנגישות לפני ציור העמוד (מונע הבהוב). קובץ חיצוני – תואם CSP. */
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('a11y-prefs') || '{}');
    var c = document.documentElement.classList;
    if (p.fs) c.add('a11y-fs-' + p.fs);
    ['contrast', 'gray', 'links', 'font', 'still'].forEach(function (k) { if (p[k]) c.add('a11y-' + k); });
  } catch (e) { /* localStorage חסום – ממשיכים בלי העדפות */ }
})();
