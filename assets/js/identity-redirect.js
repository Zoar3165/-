// קישורי הזמנה/שחזור של Netlify Identity מגיעים לדף הבית – מעבירים אותם לממשק הניהול.
// (ללא טעינת סקריפט צד שלישי בעמודי האתר הציבוריים)
if (/(invite|recovery|confirmation|email_change)_token=/.test(location.hash)) {
  location.replace(`admin/${location.hash}`);
}
