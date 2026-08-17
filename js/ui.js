/* ui.js — shared UI helpers (toast, modal/sheet, formatting)
   Phase 0 extract: no logic changes.
*/
// ---------- small utilities ----------
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function faToEnDigits(str){
  if(str===null || str===undefined) return '';
  const map = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
               '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
               '٫':'.','،':'','٬':'',',':''};
  // ارقام فارسی/عربی + جداکننده‌های هزار (٬ و ,) و اعشار فارسی
  return String(str).replace(/[۰-۹٠-٩٫،٬,]/g, ch=>map[ch]!==undefined?map[ch]:ch);
}
function enToFaDigits(str){
  const map = {'0':'۰','1':'۱','2':'۲','3':'۳','4':'۴','5':'۵','6':'۶','7':'۷','8':'۸','9':'۹'};
  return String(str).replace(/[0-9]/g, ch=>map[ch]||ch);
}
function numVal(el){
  if(!el) return 0;
  // faToEnDigits جداکننده‌ها را حذف می‌کند تا parseFloat روی "4,000,000" مقدار 4000000 بدهد
  return parseFloat(faToEnDigits(el.value))||0;
}

/**
 * فرمت زنده مبلغ هنگام تایپ: جداکننده سه‌رقمی، حفظ سبک رقم (فارسی/انگلیسی).
 * فقط رشته نمایش را می‌سازد؛ مقدار عددی از طریق numVal/faToEnDigits خوانده می‌شود.
 */
function formatLiveAmount(str){
  if(str===null || str===undefined) return '';
  const raw = String(str);
  if(!raw) return '';
  const preferFa = /[۰-۹]/.test(raw);
  let cleaned = faToEnDigits(raw).replace(/[^\d.]/g, '');
  if(!cleaned) return '';
  const dot = cleaned.indexOf('.');
  let intPart = dot >= 0 ? cleaned.slice(0, dot) : cleaned;
  let fracPart = dot >= 0 ? cleaned.slice(dot + 1).replace(/\./g, '') : null;
  intPart = intPart.replace(/^0+(?=\d)/, '');
  if(intPart === '' && fracPart !== null) intPart = '0';
  if(intPart === '') return '';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let out = fracPart !== null ? (grouped + '.' + fracPart) : grouped;
  if(preferFa) out = enToFaDigits(out).replace(/,/g, '٬');
  return out;
}

/** تعداد ارقام (و نقطه اعشار) قبل از موقعیت cursor برای حفظ محل مکان‌نما */
function _countNumericChars(str){
  return faToEnDigits(str).replace(/[^\d.]/g, '').length;
}

function reformatAmountInputEl(el){
  if(!el || el.tagName !== 'INPUT') return;
  const oldVal = el.value;
  const sel = (typeof el.selectionStart === 'number') ? el.selectionStart : oldVal.length;
  const digitsBefore = _countNumericChars(oldVal.slice(0, sel));
  const formatted = formatLiveAmount(oldVal);
  if(formatted === oldVal) return;
  el.value = formatted;
  // مکان‌نما را بعد از همان تعداد رقم قرار بده
  let pos = formatted.length;
  let seen = 0;
  for(let i = 0; i < formatted.length; i++){
    if(/[\d۰-۹٠-٩.]/.test(formatted[i])){
      seen++;
      if(seen >= digitsBefore){
        pos = i + 1;
        break;
      }
    }
  }
  try{ el.setSelectionRange(pos, pos); }catch(e){}
}

/** آیا این input باید فرمت مبلغ زنده بگیرد؟ */
function isLiveAmountInput(el){
  if(!el || el.tagName !== 'INPUT') return false;
  if(el.type === 'date' || el.type === 'time' || el.type === 'checkbox' || el.type === 'file') return false;
  if(el.getAttribute('inputmode') !== 'decimal') return false;
  // فیلدهای تعداد/موجودی/وزن را فرمت مبلغی نکن (جداکننده روی qty معمولاً لازم نیست و ریسک UX دارد)
  const id = (el.id || '').toLowerCase();
  const cls = (el.className && String(el.className)) || '';
  if(/qty|stock|minstock|pkgw|weight|adjust/.test(id)) return false;
  if(/\b(row-qty|ret-qty|mi-qty)\b/.test(cls)) return false;
  return true;
}

// یک‌بار روی document: فرمت هنگام تایپ برای inputهای مبلغ (بدون نیاز به تغییر app.js)
(function bindLiveAmountFormatting(){
  function onInput(e){
    const el = e.target;
    if(!isLiveAmountInput(el)) return;
    reformatAmountInputEl(el);
  }
  if(typeof document !== 'undefined'){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){
        document.addEventListener('input', onInput, true);
      });
    }else{
      document.addEventListener('input', onInput, true);
    }
  }
})();
function esc(s){
  return String(s===undefined||s===null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toman(n){ return (Math.round(n||0)).toLocaleString('fa-IR'); }
function balanceStatusWord(balance){
  if(balance>0) return 'بدهکار';
  if(balance<0) return 'بستانکار';
  return 'تسویه شده';
}
function balanceStatusText(balance, amountText){
  return balance===0 ? balanceStatusWord(balance) : (balanceStatusWord(balance)+': '+amountText);
}
/** Local calendar date as YYYY-MM-DD (not UTC — avoids Iran midnight offset). */
function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function nowHHMM(){ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

/* ---------- Shamsi/Jalali helpers (UI + period only; storage stays Gregorian YYYY-MM-DD) ---------- */
const SHAMSI_MONTH_NAMES = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

/** Parse YYYY-MM-DD without UTC shift. Returns {y,m,d} or null. */
function parseISODateParts(iso){
  if(!iso) return null;
  const m = String(iso).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if(!(y>=1200 && y<=3500) || !(mo>=1 && mo<=12) || !(d>=1 && d<=31)) return null;
  return { y, m: mo, d };
}
function isoFromParts(y, m, d){
  return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
}

/** Gregorian Y/M/D → Jalali [jy, jm, jd] (standard civil algorithm). */
function gregorianToJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if(days > 365){
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

/** Jalali Y/M/D → Gregorian [gy, gm, gd]. */
function jalaliToGregorian(jy, jm, jd){
  jy = parseInt(jy, 10); jm = parseInt(jm, 10); jd = parseInt(jd, 10);
  const jy2 = jy + 1595;
  let days = -355668 + (365 * jy2) + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + jd
    + ((jm < 7) ? ((jm - 1) * 31) : (((jm - 7) * 30) + 186));
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if(days > 36524){
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if(days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if(days > 365){
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0,31,((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  let gm = 1;
  for(; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

function isJalaliLeap(jy){
  const r = jy % 33;
  return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
}
function jalaliMonthLength(jy, jm){
  if(jm <= 6) return 31;
  if(jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

/** YYYY-MM-DD → [jy,jm,jd] or null */
function isoToJalali(iso){
  const p = parseISODateParts(iso);
  if(!p) return null;
  return gregorianToJalali(p.y, p.m, p.d);
}
/** jy,jm,jd → YYYY-MM-DD */
function jalaliToISO(jy, jm, jd){
  const g = jalaliToGregorian(+jy, +jm, +jd);
  return isoFromParts(g[0], g[1], g[2]);
}

function faDate(iso){
  if(!iso) return '—';
  // Prefer pure conversion so date-only ISO never shifts via UTC midnight
  const j = isoToJalali(String(iso).slice(0, 10));
  if(j){
    return enToFaDigits(j[0] + '/' + j[1] + '/' + j[2]);
  }
  try{ return new Date(iso).toLocaleDateString('fa-IR'); }catch(e){ return iso; }
}

/**
 * Shamsi month equality for period filters («این ماه»).
 * iso: YYYY-MM-DD string; ref: Date (usually new Date()).
 */
function isSameJalaliMonth(iso, ref){
  const p = parseISODateParts(iso);
  if(!p || !ref || isNaN(ref.getTime())) return false;
  const a = gregorianToJalali(p.y, p.m, p.d);
  const b = gregorianToJalali(ref.getFullYear(), ref.getMonth() + 1, ref.getDate());
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * HTML for a Shamsi date field. Hidden input keeps Gregorian YYYY-MM-DD (same id as before)
 * so existing getElementById(...).value readers keep working.
 */
function shamsiDateInputHTML(id, valueISO){
  const iso = (valueISO && parseISODateParts(valueISO)) ? String(valueISO).slice(0,10) : todayISO();
  const j = isoToJalali(iso) || gregorianToJalali(
    new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate()
  );
  const jy = j[0], jm = j[1], jd = j[2];
  const y0 = jy - 15, y1 = jy + 5;
  let yOpts = '';
  for(let y = y1; y >= y0; y--){
    yOpts += `<option value="${y}" ${y===jy?'selected':''}>${enToFaDigits(String(y))}</option>`;
  }
  let mOpts = '';
  for(let m = 1; m <= 12; m++){
    mOpts += `<option value="${m}" ${m===jm?'selected':''}>${SHAMSI_MONTH_NAMES[m-1]}</option>`;
  }
  const dim = jalaliMonthLength(jy, jm);
  let dOpts = '';
  for(let d = 1; d <= dim; d++){
    dOpts += `<option value="${d}" ${d===jd?'selected':''}>${enToFaDigits(String(d))}</option>`;
  }
  return `<div class="shamsi-date" data-shamsi-root="1">
    <input type="hidden" id="${esc(id)}" value="${esc(iso)}" data-shamsi-hidden="1">
    <div class="shamsi-date-row">
      <select class="shamsi-y" aria-label="سال شمسی" data-shamsi-part="y">${yOpts}</select>
      <select class="shamsi-m" aria-label="ماه شمسی" data-shamsi-part="m">${mOpts}</select>
      <select class="shamsi-d" aria-label="روز شمسی" data-shamsi-part="d">${dOpts}</select>
    </div>
  </div>`;
}

/** Rebuild day options + sync hidden Gregorian value for one .shamsi-date root. */
function syncShamsiDateRoot(root){
  if(!root) return;
  const hid = root.querySelector('[data-shamsi-hidden]');
  const yEl = root.querySelector('.shamsi-y');
  const mEl = root.querySelector('.shamsi-m');
  const dEl = root.querySelector('.shamsi-d');
  if(!hid || !yEl || !mEl || !dEl) return;
  let jy = parseInt(yEl.value, 10);
  let jm = parseInt(mEl.value, 10);
  let jd = parseInt(dEl.value, 10);
  if(!jy || !jm) return;
  const dim = jalaliMonthLength(jy, jm);
  if(jd > dim) jd = dim;
  if(jd < 1) jd = 1;
  if(dEl.options.length !== dim || parseInt(dEl.options[dEl.options.length-1].value,10) !== dim){
    let dOpts = '';
    for(let d = 1; d <= dim; d++){
      dOpts += `<option value="${d}" ${d===jd?'selected':''}>${enToFaDigits(String(d))}</option>`;
    }
    dEl.innerHTML = dOpts;
  } else {
    dEl.value = String(jd);
  }
  const iso = jalaliToISO(jy, jm, jd);
  const prev = hid.value;
  hid.value = iso;
  if(prev !== iso){
    try{
      hid.dispatchEvent(new Event('input', { bubbles: true }));
      hid.dispatchEvent(new Event('change', { bubbles: true }));
    }catch(e){}
  }
}

/** One-time document delegation for Shamsi selects (safe across openSheet re-renders). */
(function bindShamsiDateDelegation(){
  if(typeof document === 'undefined') return;
  function onChange(e){
    const t = e.target;
    if(!t || !t.getAttribute || !t.getAttribute('data-shamsi-part')) return;
    const root = t.closest('[data-shamsi-root]');
    if(root) syncShamsiDateRoot(root);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      document.addEventListener('change', onChange, true);
    });
  } else {
    document.addEventListener('change', onChange, true);
  }
})();

function daysAgo(iso){
  if(!iso) return Infinity;
  const p = parseISODateParts(iso);
  if(p){
    const t = new Date(p.y, p.m - 1, p.d).getTime();
    if(!isNaN(t)) return Math.floor((Date.now() - t) / 86400000);
  }
  const d = new Date(iso);
  if(isNaN(d)) return Infinity;
  return Math.floor((Date.now()-d.getTime())/86400000);
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(()=>t.classList.remove('show'), 2000);
}


// ---------- modals ----------
function closeModal(){
  const root = document.getElementById('modalRoot');
  root.innerHTML = '';
  if(window.scrollX) window.scrollTo(0, window.scrollY);
}

function openSheet(html){
  const root = document.getElementById('modalRoot');
  // مطمئن شو هر Modal قبلی کاملاً پاک شده (نه فقط مخفی) قبل از ساختن Modal جدید،
  // و یک reflow اجباری بین پاک‌شدن و رندر جدید انجام بده تا ظاهر (گوشه‌های گرد و غیره) بعد از باز/بسته‌شدن‌های مکرر خراب نشه
  closeModal();
  void root.offsetHeight;
  root.innerHTML = `
    <div class="overlay" id="overlay">
      <div class="sheet" style="position:relative;">
        <button class="close-x" id="closeX">×</button>
        ${html}
      </div>
    </div>`;
  document.getElementById('overlay').addEventListener('click', (e)=>{ if(e.target.id==='overlay') closeModal(); });
  document.getElementById('closeX').addEventListener('click', closeModal);
}

