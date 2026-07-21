import dayjs from 'dayjs';
import jalaliday from 'jalaliday';

dayjs.extend(jalaliday);

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert Latin digits in any string/number to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format a date to Jalali (Shamsi). Default: 1403/05/30 style with Persian digits. */
export function formatJalali(date: Date | string | number, template = 'YYYY/MM/DD'): string {
  const formatted = dayjs(date).calendar('jalali').locale('fa').format(template);
  return toPersianDigits(formatted);
}

/** Jalali date + time, e.g. for chat message timestamps. */
export function formatJalaliDateTime(date: Date | string | number): string {
  return formatJalali(date, 'YYYY/MM/DD HH:mm');
}

/** Short time only (HH:mm) — used inside chat bubbles. */
export function formatTime(date: Date | string | number): string {
  return toPersianDigits(dayjs(date).format('HH:mm'));
}

/** Relative-ish label for chat/order lists: "امروز"، "دیروز"، else Jalali date. */
export function formatDayLabel(date: Date | string | number): string {
  const d = dayjs(date);
  const today = dayjs();
  if (d.isSame(today, 'day')) return 'امروز';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'دیروز';
  return formatJalali(date);
}
