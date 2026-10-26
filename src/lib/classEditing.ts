import type {ClassItem} from '../types';

type TeachingContext=Pick<ClassItem,'subject'|'grade'|'model'|'schedule'>;
type StudentContext=TeachingContext & Pick<ClassItem,'level'|'studentIds'>;
const normalizedSchedule=(value:string)=>value.replace(/\s/g,'').toLocaleLowerCase('vi');

export function classHasVacancy(item:ClassItem) {
 return !['Dừng lớp','Đã kết thúc'].includes(item.status||'') && item.maxStudents>item.studentIds.length;
}

export function classEditUpdates(item:ClassItem,draft:Partial<ClassItem>):Partial<ClassItem> {
 const updates:Partial<ClassItem>={};
 for(const key of ['name','roomLink','durationMonths','durationCatalogGroupId','durationCatalogId','customEndDate','endDate'] as const){
  if(Object.hasOwn(draft,key))(updates as Record<string,unknown>)[key]=draft[key];
 }
 const additions=[...new Set(draft.studentIds||[])].filter(id=>!item.studentIds.includes(id));
 if(additions.length){
  if(!classHasVacancy(item) || item.studentIds.length+additions.length>item.maxStudents)throw new Error('Lớp đã đủ sĩ số. Hãy tải lại dữ liệu.');
  updates.studentIds=[...item.studentIds,...additions];
 }
 return updates;
}

export function classBindingEditIssue(before:ClassItem,after:ClassItem):string|undefined {
 if(['Dừng lớp','Đã kết thúc'].includes(before.status||'') || ['Dừng lớp','Đã kết thúc'].includes(after.status||''))return;
 if((before.teacherId && before.teacherId!==after.teacherId) ||
  before.studentIds.some(id=>!after.studentIds.includes(id)) ||
  ((before.teacherId || before.studentIds.length) && normalizedSchedule(before.schedule)!==normalizedSchedule(after.schedule))) {
  return `Chưa thể cập nhật phân công: lớp ${before.code} còn hoạt động. Dừng hoạt động lớp trước khi đổi giáo viên, đổi lịch hoặc rút học sinh để giải phóng ca.`;
 }
}

/** Existing assignments do not need to be newly recruited for a metadata edit. */
export function canKeepAssignedTeacher(existing:ClassItem|undefined,draft:TeachingContext,teacherId:string) {
 return Boolean(existing && teacherId && existing.teacherId===teacherId &&
  existing.subject===draft.subject && existing.grade===draft.grade && existing.model===draft.model &&
  normalizedSchedule(existing.schedule)===normalizedSchedule(draft.schedule));
}

export function studentsNeedingClassValidation(existing:ClassItem|undefined,draft:StudentContext):string[] {
 if(!existing || existing.subject!==draft.subject || existing.grade!==draft.grade ||
  existing.model!==draft.model || existing.level!==draft.level)return draft.studentIds;
 return draft.studentIds.filter(id=>!existing.studentIds.includes(id));
}

export function studentsNeedingScheduleValidation(existing:ClassItem|undefined,draft:Pick<ClassItem,'subject'|'schedule'|'studentIds'>):string[] {
 if(!existing || existing.subject!==draft.subject || normalizedSchedule(existing.schedule)!==normalizedSchedule(draft.schedule))return draft.studentIds;
 return draft.studentIds.filter(id=>!existing.studentIds.includes(id));
}

/** Editing must never silently replace the assigned teacher with a suggestion. */
export function nextClassTeacherSelection(current:string,eligible:string[],editing:boolean) {
 if(eligible.includes(current))return current;
 return editing ? '' : eligible[0] || '';
}
