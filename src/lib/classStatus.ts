import type { ClassItem } from '../types';
export function classStatusLabel(item: Pick<ClassItem, 'status' | 'paused'>): string {
  if (item.status === 'Dừng lớp') return 'Dừng hẳn';
  if (item.status === 'Đã kết thúc') return item.status;
  return item.paused ? 'Tạm dừng tạm thời' : item.status || 'Đang học';
}
