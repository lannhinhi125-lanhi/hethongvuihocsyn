import type { ClassItem, SessionPayrollRecord, TeacherPayrollSummary } from '../types';
import { workHandoffRows } from './workCredits';

export interface WorkTeachingContext {
  classes?: Pick<ClassItem, 'id' | 'code' | 'subject' | 'model' | 'level' | 'grade' | 'categoryId'>[];
  lessons?: { id: string; classId?: string }[];
  subjects?: { code: string; name: string }[];
  models?: { code: string; name: string }[];
  levels?: { code: string; name: string }[];
  teachingCategories?: { id: string; name: string; options: { id: string; label: string }[] }[];
}
const unknown = 'Chưa xác định';
const catalogName = (catalog: { code: string; name: string }[] | undefined, code?: string) => {
  if (!code) return unknown;
  const row = catalog?.find(item => item.code === code);
  return row ? row.name + (catalog!.filter(item => item.name === row.name).length > 1 ? ` (${code})` : '') : code;
};

/** Group work, never duplicate it across the teacher's possible teaching assignments. */
export function workTeachingGroups(staff: TeacherPayrollSummary[], context: WorkTeachingContext = {}) {
  const classesById = new Map(context.classes?.map(row => [row.id, row]));
  const lessonsById = new Map(context.lessons?.map(row => [row.id, row]));
  const groups: Array<ReturnType<typeof workHandoffRows>[number] & { modelName: string; programName: string; categoryName: string; groupKey: string }> = [];
  for (const person of staff) {
    const map = new Map<string, { sessions: SessionPayrollRecord[]; subjectCode: string; modelCode?: string; programCode?: string; categoryId?: string }>();
    for (const session of person.sessions || []) {
      const lesson = lessonsById.get(session.lessonId || session.id);
      // A saved lesson link is authoritative; don't guess from another class if its class is missing.
      const matches = context.classes?.filter(row => row.code === session.classCode) || [];
      const cls = lesson?.classId ? classesById.get(lesson.classId) : matches.length === 1 ? matches[0] : undefined;
      const candidates = context.teachingCategories?.filter(row => row.options.some(option => option.id === cls?.grade)) || [];
      const categoryId = cls?.categoryId || (candidates.length === 1 ? candidates[0].id : undefined);
      const modelCode = session.model || cls?.model, programCode = cls?.level;
      const subjectCode = cls?.subject || person.subject;
      const key = JSON.stringify([subjectCode, modelCode || '', programCode || '', categoryId || '']);
      const group = map.get(key) || { sessions: [], subjectCode, modelCode, programCode, categoryId };
      group.sessions.push(session); map.set(key, group);
    }
    for (const [key, group] of map) {
      const summary = workHandoffRows([{ ...person, sessions: group.sessions }])[0];
      groups.push({ ...summary, subjectName: catalogName(context.subjects, group.subjectCode),
        modelName: catalogName(context.models, group.modelCode), programName: catalogName(context.levels, group.programCode),
        categoryName: context.teachingCategories?.find(row => row.id === group.categoryId)?.name || unknown,
        groupKey: JSON.stringify([person.teacherId, key]) });
    }
  }
  return groups;
}
