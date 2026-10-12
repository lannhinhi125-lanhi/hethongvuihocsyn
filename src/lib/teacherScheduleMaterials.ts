import type { ClassSessionMaterial } from '../types';

export const teachingWeekForDate = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const format = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { from: format(start), to: format(end), label: `Tuần: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}` };
};

export const materialForSessionDate = (materials: ClassSessionMaterial[], session: number, date: string) =>
  materials.find(material => {
    if (material.session !== session) return false;
    const range = material.week.match(/Từ ngày (\d{2})\/(\d{2})\/(\d{4}) đến ngày (\d{2})\/(\d{2})\/(\d{4})/);
    if (!range) return false;
    const start = `${range[3]}-${range[2]}-${range[1]}`;
    const end = `${range[6]}-${range[5]}-${range[4]}`;
    return start <= date && date <= end;
  });
