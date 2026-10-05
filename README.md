# אתר בית הכנסת אגודת שלום

אתר סטטי בעברית (RTL), ללא שלב בנייה. אפשר להעלות את התיקייה כמו שהיא ל-Netlify, ל-GitHub Pages או לכל אחסון סטטי.

## מבנה הקבצים
| קובץ | תפקיד |
|---|---|
| `index.html` | דף הבית: היסטוריה, פעילות, ווידג'ט זמני היום, צור קשר |
| `times.html` | זמני תפילות – מחושבים חי בדפדפן (תאריך עברי, פרשה, נץ/שקיעה/צאת, שבת קרובה, תצוגת שבוע) |
| `donate.html` | תרומות: ביט, PayBox, העברה בנקאית (עם כפתורי העתקה) |
| `accessibility.html` | הצהרת נגישות (תקנה 35, ת״י 5568, WCAG 2.1 AA) |
| `page.html` | תבנית לעמודים כלליים מהמערכת: `page.html?p=<slug>` |
| `404.html` | דף שגיאה |
| `assets/js/config.js` | **כל ההגדרות במקום אחד** – פרטי קשר, תרומות, מיקום, כללי הזמנים |
| `assets/data/settings.json` | ערכים שנערכים מממשק הניהול (`/admin`) ודורסים את `config.js` (ערך ריק/ממלא-מקום לא דורס) |
| `assets/data/content/*.json` | כל הטקסטים של העמודים (נערכים ב-/admin → „טקסטים באתר”) |
| `assets/data/pages.json` | עמודים נוספים (נערכים ב-/admin → „עמודים נוספים”; `nav: true` = נוסף אוטומטית לתפריט) |
| `assets/uploads/` | תיקיית העלאת תמונות וקבצים מהמערכת |
| `assets/js/a11y.js`, `a11y-init.js` | תפריט הנגישות (נשמר ב-localStorage) |
| `assets/js/md.js` | ממיר Markdown בטוח (ללא innerHTML) לתוכן מהמערכת |
| `assets/js/schedule.js` | לוגיקת חישוב הזמנים (טהורה, נבדקת ב-Node) |
| `assets/vendor/hebcal-core.min.js` | ‏@hebcal/core v6.11.1 מאוחסן מקומית (GPL-2.0) |
| `assets/fonts/` | Frank Ruhl Libre ו-Heebo מאוחסנים מקומית (OFL) – ללא Google Fonts חיצוני |
| `admin/` | ממשק ניהול Decap CMS v3.16.3 + Netlify Identity widget v2.0.3 (מקומי, עם SRI) |
| `netlify.toml` | כותרות אבטחה (CSP, HSTS, וכו') |
| `tests/` | בדיקת חישוב הזמנים + שרת מקומי שמחיל את הכותרות |

## עדכון פרטים
עורכים את `assets/js/config.js` (או את `assets/data/settings.json`, או דרך `/admin`).
ערך שמתחיל ב-`[` (למשל `[יעודכן]`) מוצג כ"יעודכן בקרוב" והכפתור מושבת.

* **עיר בית הכנסת:** ברירת המחדל – תל אביב (32.0853, 34.7818). משנים `location.name/hebcalCity/latitude/longitude`. `candleLightingMins: null` = לפי מנהג העיר של hebcal (ירושלים 40, חיפה/זכרון יעקב 30, שאר הערים – כולל תל אביב – 20); מספר = ערך קבוע.
* **קיץ/חורף:** `season: 'auto'` = לפי שעון הקיץ הישראלי; אפשר `'summer'` / `'winter'`.
* **קישורי תשלום** חייבים להתחיל ב-`https://`.

## כללי החישוב
* חול: שחרית = נץ − 40 דק׳ (עיגול למטה); מנחה גדולה קיץ 13:15 / חורף 12:30; מנחה קטנה = שקיעה − 25 (למטה); ערבית = שקיעה (למטה), ואחריה שיעור.
  קיץ: שיעור שעה לפני מנחה (קטנה). חורף: שיעורים לאחר מנחה ולאחר ערבית.
* שבת (וגם יום טוב, חוץ מיום כיפור – `yomTovAsShabbat`): שחרית 08:00 (מהודו); מנחה גדולה קיץ 13:15 / חורף 12:45; מנחה קטנה = שקיעה − 50; שיעור שעה לפני מנחה קטנה; ערבית = צאת השבת (הבדלה של hebcal, 8.5°, עיגול למעלה).
* ערב שבת/חג: מוצגת שעת הדלקת נרות בלבד; מנחה וקבלת שבת – "לפי הודעה" (לא הומצאה שעה).
* נץ מעוגל למעלה, שקיעה למטה. התאריך העברי מוצג לפי היום האזרחי (מתחלף בחצות).

## בדיקות
```bash
npm i                                      # תלויות לבדיקות בלבד (האתר עצמו ללא תלויות)
node tests/schedule.test.mjs               # חישובי הזמנים (תל אביב; קיץ/חורף/שבת/מעבר שעון; עקיפת ירושלים)
node tests/content.test.mjs                # תוכן, תצורת Decap, אין inline/סודות
python3 tests/serve-with-headers.py 8765 & # שרת מקומי עם כותרות ה-CSP
node tests/a11y.test.mjs                   # axe-core בכל העמודים × 4 מצבי תצוגה + תפריט פתוח, מקלדת, הגדלה 200%/400%
```
בדיקת Decap מקומית (ללא Netlify): `npx decap-server` בתיקייה שהיא מאגר git, ו-`python3 tests/serve-with-headers.py 8766 --local-cms`, ואז http://localhost:8766/admin/.

## נגישות
* קישור דילוג, ניווט מקלדת מלא עם טבעת מיקוד כפולה, כותרות היררכיות, אזורי ניווט, טקסט חלופי, ניגודיות AA, סימון קישורים לחלון חדש, תמיכה ב-200%/400% ללא גלילה אופקית, `prefers-reduced-motion`.
* השעון החי מסומן `role="timer"` (לא מוקרא שוב ושוב). במצב „עצירת אנימציות” או `prefers-reduced-motion` – ללא שניות.
* תפריט נגישות עצמאי (ללא סקריפט צד שלישי): גודל טקסט, ניגודיות גבוהה, גווני אפור, הדגשת קישורים, גופן קריא, עצירת אנימציות, איפוס.
* בהצהרת הנגישות יש לעדכן: **הסדרי הנגישות הפיזית**, **דוא״ל רכז הנגישות** ו**תאריך הבדיקה האחרונה** (ב-/admin → טקסטים באתר → הצהרת נגישות).
* תמונות שמועלות לעמודים – חובה למלא טקסט חלופי (alt). קובצי PDF שמועלים צריכים להיות נגישים.

## אבטחה
* אין סקריפטים, גופנים או שירותים חיצוניים בעמודים הציבוריים: CSP של `'self'` בלבד, ללא inline, ללא טפסים, ללא אנליטיקס/מעקב.
* כותרות ב-`netlify.toml`: CSP (כולל `frame-ancestors 'none'`), HSTS עם preload, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy חוסם מצלמה/מיקרופון/מיקום ועוד, COOP/CORP.
  ה-CSP מוגדר לכל נתיב ציבורי בנפרד ולא `/*`, כי Netlify ממזג כותרות מכמה כללים, ושני CSP היו שוברים את `/admin`.
* בכל עמוד יש גם `<meta>` CSP זהה (גיבוי ל-GitHub Pages, שלא תומך בכותרות מותאמות. ב-GitHub Pages אין HSTS/X-Frame-Options מותאמים, ולכן Netlify עדיף).
* `/admin`: ‏`noindex` (meta + `X-Robots-Tag`), חסום ב-`robots.txt`, CSP נפרד ומקל (Decap דורש `unsafe-eval` ו-inline styles), סקריפטים מקומיים עם SRI.
* HTTPS: ב-Netlify מופעל אוטומטית (Let's Encrypt) עם הפניה מ-HTTP. **HSTS preload** אפשרי רק עם דומיין משלכם: אחרי שכל תתי-הדומיינים זמינים ב-HTTPS, מגישים ב-hstspreload.org (פעולה שקשה לבטל).

### הגדרת ממשק הניהול (חד-פעמי, ב-Netlify)
1. Site configuration → Identity → **Enable Identity**.
2. Registration preferences → **Invite only** (הרשמה סגורה). External providers – לא להפעיל.
3. Identity → **Invite users** → להזמין רק את כתובת המנהל.
4. Identity → Services → **Enable Git Gateway** (הערה: Netlify סימנה את Git Gateway כ-deprecated – ממשיך לעבוד, אבל לא מומלץ להגדרות חדשות. חלופות: DecapBridge, או ה-backend של GitHub ב-Decap עם OAuth).
5. **להפעיל 2FA** בחשבון GitHub (או ספק ה-Git) ובחשבון Netlify. ל-Netlify Identity עצמו אין 2FA – לבחור סיסמה חזקה וייחודית.
6. קישור ההזמנה במייל מגיע לדף הבית ומועבר אוטומטית ל-`/admin/` (‏`assets/js/identity-redirect.js`).

### עדכון ספריות (אופציונלי)
```bash
npm i @hebcal/core esbuild
echo "export {HDate, HebrewCalendar, Location, Zmanim, Sedra, flags} from '@hebcal/core';" > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --minify --legal-comments=inline --outfile=assets/vendor/hebcal-core.min.js
```
אחרי עדכון קבצי `admin/vendor` צריך לחשב מחדש את ה-SRI ב-`admin/index.html`:
`openssl dgst -sha384 -binary admin/vendor/decap-cms.js | base64`.
