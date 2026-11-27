const num = new Intl.NumberFormat('ar');
const pct = new Intl.NumberFormat('ar', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const hh = new Intl.NumberFormat('ar', { minimumIntegerDigits: 2, useGrouping: false });
const stamp = new Intl.DateTimeFormat('ar-JO', {
  timeZone: 'Asia/Amman',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

export const formatCount = (n: number) => num.format(n);

export function formatExactTime(value: string | null): string {
  if (!value) return 'غير متوفر';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'غير متوفر';
  return `${stamp.format(d)} (بتوقيت عمّان)`;
}

export function formatChange(percent: number | null, current: number): string {
  if (percent === null) {
    return current > 0
      ? 'استخدام جديد — لا توجد فترة سابقة للمقارنة'
      : 'لا يوجد استخدام في الفترتين';
  }
  if (percent === 0) return 'بدون تغيير عن الأسبوع السابق';
  return `${pct.format(percent)}٪ عن الأسبوع السابق`;
}

export function formatHourRange(hour: number): string {
  return `${hh.format(hour)}:00 – ${hh.format(hour)}:59`;
}
