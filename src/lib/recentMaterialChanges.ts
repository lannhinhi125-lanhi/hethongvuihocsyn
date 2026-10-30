import type { ClassItem } from '../types';
import { teachingScheduleEntries } from './teachingSessionDetails';

export function recentMaterialChanges(classes: ClassItem[], classIds: string[], materials: ClassItem['materials']) {
  return classes.filter(cls => classIds.includes(cls.id)).flatMap(cls => materials.flatMap(material => {
    const previous = cls.materials.find(old => old.month === material.month && old.week === material.week && old.session === material.session);
    if (previous && (['title', 'slide', 'lms'] as const).every(key => (previous[key] || '') === (material[key] || ''))) return [];
    const range = material.week.match(/Từ ngày (\d{2})\/(\d{2})\/(\d{4}) đến ngày (\d{2})\/(\d{2})\/(\d{4})/);
    const from = material.fromDate || (range ? `${range[3]}-${range[2]}-${range[1]}` : '');
    const entry = teachingScheduleEntries(cls).find(row => row.session === material.session);
    let date = '';
    if (from && entry) {
      const day = new Date(`${from}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() + (entry.dayIndex - (day.getUTCDay() + 6) % 7 + 7) % 7);
      date = day.toISOString().slice(0, 10);
      const to = material.toDate || (range ? `${range[6]}-${range[5]}-${range[4]}` : '');
      if ((to && date > to) || (cls.startDate && date < cls.startDate) || (cls.endDate && date > cls.endDate)) date = '';
    }
    return [{ classId: cls.id, code: cls.code, name: cls.name, material: {...material}, date, time: entry?.time || '', kind: previous ? 'updated' as const : 'added' as const }];
  }));
}

export type RecentMaterialChange = ReturnType<typeof recentMaterialChanges>[number];
