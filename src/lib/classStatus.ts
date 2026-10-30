import type { ClassItem } from '../types';
import { reportToday } from './customReports';

export function effectiveClassStatus(item: Pick<ClassItem, 'status' | 'endDate'>, today = reportToday()): NonNullable<ClassItem['status']> {
  if (item.status === 'Dừng lớp' || item.status === 'Đã kết thúc') return item.status;
  return item.endDate && item.endDate < today ? 'Đã kết thúc' : item.status || 'Đang học';
}

export function materialClassStatusLabel(item: Pick<ClassItem, 'status' | 'paused' | 'endDate'>, today = reportToday()): string {
  const status = effectiveClassStatus(item, today);
  if (status === 'Đã kết thúc') return item.endDate && item.endDate < today ? 'Dừng lớp · Hết hạn' : 'Dừng lớp · Đã kết thúc';
  if (status === 'Dừng lớp') return 'Dừng lớp';
  return classStatusLabel({...item, status});
}
export function classStatusLabel(item: Pick<ClassItem, 'status' | 'paused'>): string {
  if (item.status === 'Dừng lớp') return 'Dừng hẳn';
  if (item.status === 'Đã kết thúc') return item.status;
  return item.paused ? 'Tạm dừng tạm thời' : item.status || 'Đang học';
}
