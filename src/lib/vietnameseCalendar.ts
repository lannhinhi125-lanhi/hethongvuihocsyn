import { validReportDate } from './customReports';

export const displayVietnameseDate = (iso: string): string => validReportDate(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
export function parseVietnameseDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const value = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return validReportDate(value) ? value : null;
}
const dateAt = (year: number, month: number, day: number) => { const date = new Date(0); date.setUTCFullYear(year, month - 1, day); return date; };
export const calendarDate = (year: number, month: number, day: number) => dateAt(year, month, day).toISOString().slice(0, 10);
export function vietnameseCalendarDays(month: string): string[] {
  const [year, number] = month.split('-').map(Number);
  const start = dateAt(year, number, 1);
  const offset = (start.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => calendarDate(year, number, 1 - offset + index));
}
export function moveCalendarDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return calendarDate(year, month, day + days);
}
export function moveCalendarMonth(iso: string, amount: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const first = dateAt(year, month + amount, 1);
  const lastDay = dateAt(first.getUTCFullYear(), first.getUTCMonth() + 2, 0).getUTCDate();
  return calendarDate(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(day, lastDay));
}
export const calendarDateAllowed = (value: string, min?: string, max?: string) => validReportDate(value) && (!min || value >= min) && (!max || value <= max);
