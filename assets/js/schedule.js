/**
 * חישוב לוח הזמנים היומי – לוגיקה טהורה (ללא DOM), כך שניתן לבדוק אותה גם ב-Node.
 * הפונקציות מקבלות את ספריית @hebcal/core כפרמטר (hc).
 */

const MIN = 60 * 1000;

/* ---------- עזרי תאריך / אזור זמן ---------- */

/** התאריך הנוכחי (שנה/חודש/יום) באזור הזמן הנתון */
export function ymdInTz(date, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day };
}

export function addDays(ymd, n) {
  const t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export const ymdKey = (o) => `${o.y}-${String(o.m).padStart(2, '0')}-${String(o.d).padStart(2, '0')}`;

/** הפרש אזור הזמן (בדקות) ברגע נתון */
export function tzOffsetMinutes(date, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / MIN);
}

/** שעה מקומית (HH:MM) בתאריך נתון באזור הזמן -> Date */
export function zonedDate(ymd, hhmm, tz) {
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(ymd.y, ymd.m - 1, ymd.d, h, mi);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let res = new Date(guess - off * MIN);
  const off2 = tzOffsetMinutes(res, tz);
  if (off2 !== off) res = new Date(guess - off2 * MIN);
  return res;
}

export const floorMin = (d) => new Date(Math.floor(d.getTime() / MIN) * MIN);
export const ceilMin = (d) => new Date(Math.ceil(d.getTime() / MIN) * MIN);
const minus = (d, mins) => new Date(d.getTime() - mins * MIN);

export function fmtTime(date, tz, seconds = false) {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    ...(seconds ? { second: '2-digit' } : {}),
  }).format(date);
}

/** קיץ = שעון קיץ ישראלי בתוקף (נבדק בצהרי היום) */
export function isSummer(ymd, cfg) {
  if (cfg.season === 'summer') return true;
  if (cfg.season === 'winter') return false;
  const tz = cfg.location.tzid;
  const noon = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 10, 0));
  const jan = new Date(Date.UTC(ymd.y, 0, 1, 10, 0));
  return tzOffsetMinutes(noon, tz) > tzOffsetMinutes(jan, tz);
}

const DAY_NAMES = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'];

/* ---------- חישוב יום ---------- */

export function makeLocation(hc, cfg) {
  const L = cfg.location;
  return new hc.Location(L.latitude, L.longitude, true, L.tzid, L.hebcalCity || L.name, 'IL', undefined, L.elevation || 0);
}

/**
 * מחזיר את כל נתוני היום: תאריך עברי, זמני היום ותפילות.
 * @param hc   מודול @hebcal/core
 * @param cfg  CONFIG
 * @param ymd  {y,m,d} – תאריך אזרחי (לפי שעון ישראל)
 */
export function computeDay(hc, cfg, ymd, loc = makeLocation(hc, cfg)) {
  const tz = cfg.location.tzid;
  const L = cfg.location;
  const civil = new Date(ymd.y, ymd.m - 1, ymd.d); // hebcal משתמש בשדות התאריך המקומיים
  const dow = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
  const hd = new hc.HDate(civil);
  const zm = new hc.Zmanim(loc, civil, !!L.useElevation);
  const sunrise = zm.sunrise();
  const sunset = zm.sunset();
  const summer = isSummer(ymd, cfg);

  const calOpts = {
    start: civil, end: civil, location: loc, il: true,
    candlelighting: true, sedrot: true, noModern: true,
  };
  // מספר דקות מפורש, או ברירת המחדל של hebcal לפי העיר (מנהג ישראל)
  if (typeof L.candleLightingMins === 'number' && L.candleLightingMins > 0) calOpts.candleLightingMins = L.candleLightingMins;
  if (L.havdalahMins > 0) calOpts.havdalahMins = L.havdalahMins; else calOpts.havdalahDeg = L.havdalahDeg;
  const events = hc.HebrewCalendar.calendar(calOpts);
  const F = hc.flags;

  let candle = null, havdalah = null, parasha = null;
  const holidays = [];
  let isYomTov = false, isYomKippur = false;
  for (const e of events) {
    const desc = e.getDesc();
    const fl = e.getFlags();
    if (desc === 'Candle lighting') candle = e.eventTime;
    else if (desc === 'Havdalah') havdalah = e.eventTime;
    else if (fl & F.PARSHA_HASHAVUA) parasha = e.render('he-x-NoNikud');
    else {
      if (fl & F.CHAG) isYomTov = true;
      if (desc === 'Yom Kippur') isYomKippur = true;
      holidays.push(e.render('he-x-NoNikud'));
    }
  }

  // צאת שבת/חג: לפי אירוע ההבדלה של hebcal; אם אין (חג הנמשך למחרת) – לפי אותו חישוב
  let tzeit = havdalah;
  if (!tzeit) tzeit = L.havdalahMins > 0 ? new Date(sunset.getTime() + L.havdalahMins * MIN) : zm.tzeit(L.havdalahDeg);
  tzeit = ceilMin(tzeit);

  const isShabbat = dow === 6;
  const shabbatMode = isShabbat || (isYomTov && cfg.yomTovAsShabbat && !isYomKippur);
  const isErev = !!candle && !shabbatMode && !isYomKippur; // ערב שבת / ערב חג
  const seasonKey = summer ? 'summer' : 'winter';
  const at = (hhmm) => zonedDate(ymd, hhmm, tz);

  const prayers = [];
  const lessons = [];
  const notes = [];

  if (isYomKippur) {
    notes.push('יום הכיפורים – סדר התפילות יפורסם בבית הכנסת.');
  } else if (shabbatMode) {
    const R = cfg.rules.shabbat;
    const minchaK = floorMin(minus(sunset, R.minchaKetanaBeforeShkiaMins));
    const lessonT = floorMin(minus(minchaK, R.lessonBeforeMinchaKetanaMins));
    prayers.push({ key: 'shacharit', label: 'שחרית', date: at(R.shacharit), note: R.shacharitNote });
    prayers.push({ key: 'minchaG', label: 'מנחה גדולה', date: at(R.minchaGedola[seasonKey]) });
    lessons.push({ key: 'lessonShabbat', label: `שיעור עם ${R.lessonTeacher}`, date: lessonT, note: 'שעה לפני מנחה קטנה' });
    prayers.push({ key: 'minchaK', label: 'מנחה קטנה', date: minchaK, note: `${R.minchaKetanaBeforeShkiaMins} דק׳ לפני השקיעה` });
    prayers.push({ key: 'arvit', label: isShabbat ? 'ערבית מוצאי שבת' : 'ערבית', date: tzeit, note: isShabbat ? 'בצאת השבת' : 'בצאת החג' });
  } else {
    const R = cfg.rules.weekday;
    const shacharit = floorMin(minus(sunrise, R.shacharitBeforeNetzMins));
    const minchaK = floorMin(minus(sunset, R.minchaKetanaBeforeShkiaMins));
    prayers.push({ key: 'shacharit', label: 'שחרית', date: shacharit, note: `${R.shacharitBeforeNetzMins} דק׳ לפני הנץ` });
    prayers.push({ key: 'minchaG', label: 'מנחה גדולה', date: at(R.minchaGedola[seasonKey]) });
    if (isErev) {
      notes.push(dow === 5
        ? 'מנחה של ערב שבת וקבלת שבת – לפי הודעה בבית הכנסת.'
        : 'מנחה של ערב החג וערבית – לפי הודעה בבית הכנסת.');
    } else {
      if (summer) lessons.push({ key: 'lessonBefore', label: 'שיעור תורה', date: floorMin(minus(minchaK, R.lessonBeforeMinchaMins)), note: 'שעה לפני מנחה' });
      prayers.push({ key: 'minchaK', label: 'מנחה קטנה', date: minchaK, note: `${R.minchaKetanaBeforeShkiaMins} דק׳ לפני השקיעה` });
      if (!summer) lessons.push({ key: 'lessonAfterMincha', label: 'שיעור תורה (כשעה)', after: 'לאחר מנחה' });
      prayers.push({ key: 'arvit', label: 'ערבית', date: floorMin(sunset), note: 'בשקיעה, ולאחריה שיעור' });
      lessons.push({ key: 'lessonAfterArvit', label: summer ? 'שיעור תורה' : 'שיעור תורה (כשעה)', after: 'לאחר ערבית' });
      if (dow === 3) lessons.push({ key: 'wednesday', label: 'שיעור הרב אליהו שליט"א – סעודה, שירים וניגונים', after: 'ביום רביעי', special: true });
    }
  }

  const k = cfg.kollel;
  const kollel = (!shabbatMode && !isYomKippur && k.days.includes(dow))
    ? { title: k.title, start: k[seasonKey].start, end: k[seasonKey].end } : null;

  const timeline = [...prayers, ...lessons.filter((l) => l.date)].sort((a, b) => a.date - b.date);
  for (const it of [...prayers, ...lessons]) if (it.date) it.time = fmtTime(it.date, tz);

  return {
    ymd, key: ymdKey(ymd), dow, dayName: DAY_NAMES[dow],
    gregLabel: new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d))),
    hebrewDate: hd.renderGematriya(true),
    season: seasonKey, seasonLabel: summer ? 'שעון קיץ' : 'שעון חורף',
    isShabbat, isYomTov, isYomKippur, shabbatMode, isErev,
    parasha, holidays,
    zmanim: {
      sunrise: ceilMin(sunrise), sunset: floorMin(sunset),
      sunriseStr: fmtTime(ceilMin(sunrise), tz), sunsetStr: fmtTime(floorMin(sunset), tz),
      candle, candleStr: candle ? fmtTime(candle, tz) : null,
      candleMinsBeforeSunset: candle ? Math.round((floorMin(sunset) - candle) / MIN) : null,
      tzeit, tzeitStr: fmtTime(tzeit, tz), hasHavdalah: !!havdalah,
    },
    prayers, lessons, notes, kollel, timeline,
  };
}

/** השבת הקרובה (היום אם היום שבת) */
export function nextShabbatYmd(ymd) {
  const dow = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
  return addDays(ymd, (6 - dow + 7) % 7);
}

/** הפריט הבא בלוח (תפילה/שיעור) אחרי הרגע now */
export function nextItem(day, now) {
  return day.timeline.find((it) => it.date > now) || null;
}
