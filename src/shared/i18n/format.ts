import { intlTag, type Locale } from './config';

const TIME_ZONE = 'Asia/Kolkata';

const priceFormatters = new Map<Locale, Intl.NumberFormat>();
function priceFormatter(locale: Locale): Intl.NumberFormat {
  let f = priceFormatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(intlTag[locale], {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      numberingSystem: 'latn',
    });
    priceFormatters.set(locale, f);
  }
  return f;
}

/** Whole rupees, e.g. ₹1,250 (Latin digits, Indian grouping) in both languages. */
export function formatPrice(rupees: number, locale: Locale): string {
  return priceFormatter(locale).format(rupees);
}

const englishTime = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
  numberingSystem: 'latn',
});

// CLDR's standard Kannada time pattern prints a Latin "AM/PM"; flexible day periods
// (ಬೆಳಗ್ಗೆ, ಮಧ್ಯಾಹ್ನ, ಸಂಜೆ, ರಾತ್ರಿ) keep the whole string in Kannada (research R3).
const kannadaTime = new Intl.DateTimeFormat('kn-IN', {
  hour: 'numeric',
  minute: '2-digit',
  dayPeriod: 'short',
  timeZone: TIME_ZONE,
  numberingSystem: 'latn',
});

/** A clock time in IST: "1:30 pm" or "ಮಧ್ಯಾಹ್ನ 1:30". */
export function formatTime(instant: Date, locale: Locale): string {
  if (locale === 'en') return englishTime.format(instant).replace(/\s?(am|pm)$/i, (m) => m.toLowerCase());
  const parts = kannadaTime.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${value('dayPeriod')} ${value('hour')}:${value('minute')}`.trim();
}

/** ISO weekday (1 = Monday) as a full day name. */
export function formatWeekday(weekday: number, locale: Locale, style: 'long' | 'short' = 'long'): string {
  // 2026-10-12 is a Monday.
  const reference = new Date(Date.UTC(2026, 9, 11 + weekday));
  return new Intl.DateTimeFormat(intlTag[locale], { weekday: style, timeZone: 'UTC' }).format(reference);
}

const dayMonth = new Map<Locale, Intl.DateTimeFormat>();
/** "12 Oct, 1:30 pm" style date and time in IST. */
export function formatDayTime(instant: Date, locale: Locale): string {
  let f = dayMonth.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(intlTag[locale], {
      day: 'numeric',
      month: 'short',
      timeZone: TIME_ZONE,
      numberingSystem: 'latn',
    });
    dayMonth.set(locale, f);
  }
  return `${f.format(instant)}, ${formatTime(instant, locale)}`;
}

/** A 10-digit Indian mobile number grouped for reading: "90000 01001". */
export function formatPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}
