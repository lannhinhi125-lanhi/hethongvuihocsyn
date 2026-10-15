export interface InspectionTeacher {
  id: string;
  name: string;
  subject: string;
  evaluationReports?: InspectionEvaluation[];
}

export interface InspectionEvaluation {
  teacherId?: string;
  evaluationDate?: string;
  overallScore?: number;
  recommendations?: string;
}

export interface InspectionLesson {
  primaryTeacherId?: string;
  coverTeacherId?: string | null;
  startsAt?: string;
  checkinAt?: string | null;
  status?: string;
}

export const inspectionDate = (value?: string): string => {
  if (!value) return '';
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : value.slice(0, 10);
};

export function inspectionReportRows(
  teachers: InspectionTeacher[],
  evaluations: InspectionEvaluation[],
  lessons: InspectionLesson[],
  range: { start: string; end: string } = { start: '', end: '' }
) {
  return teachers.flatMap(teacher => {
    const normalized = evaluations.filter(record => record.teacherId === teacher.id);
    const records = (normalized.length ? normalized : teacher.evaluationReports || [])
      .filter(record => {
        const date = inspectionDate(record.evaluationDate);
        return date && (!range.start || date >= range.start) && (!range.end || date <= range.end) &&
          Number.isFinite(Number(record.overallScore));
      });
    if (!records.length) return [];
    const avg = Number((records.reduce((sum, record) => sum + Number(record.overallScore), 0) / records.length).toFixed(2));
    const rankCode = avg >= 9 ? 'A' : avg >= 8 ? 'B' : avg >= 7 ? 'C' : 'D';
    const taught = lessons.filter(lesson =>
      (lesson.coverTeacherId || lesson.primaryTeacherId) === teacher.id && ['DA_HOC','HOAN_THANH','DA_HOC_CU','DAY_THAY_CU'].includes(lesson.status || '') &&
      (!range.start || reportCreationDate(lesson.startsAt) >= range.start) &&
      (!range.end || reportCreationDate(lesson.startsAt) <= range.end)
    );
    const onTime = taught.filter(lesson => lesson.checkinAt && lesson.startsAt &&
      new Date(lesson.checkinAt).getTime() <= new Date(lesson.startsAt).getTime() + 60_000).length;
    const punctualityPct = taught.length ? Number((onTime / taught.length * 100).toFixed(1)) : 0;
    const newest = [...records].sort((a, b) => inspectionDate(b.evaluationDate).localeCompare(inspectionDate(a.evaluationDate)))[0];
    return [{
      id: teacher.id, name: teacher.name, subjectCode: teacher.subject, avg,
      rank: 'Hạng ' + rankCode, rankCode, total: records.length,
      punctualityPct, punctuality: taught.length ? punctualityPct + '%' : 'Chưa có dữ liệu',
      plan: newest.recommendations || ''
    }];
  });
}
import { reportCreationDate } from './reportCreationDate';

