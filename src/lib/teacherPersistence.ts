import { teacherSessionRequest } from './accountSession';
import { fromSupabaseRow } from './supabaseMapper';
import type { TeacherProfile, SubjectItem, LevelItem, TimeSlotItem, ClassModelItem } from '../types';
import type { CategoryGroup } from '../components/CategoryMultiFilter';
type Row = Record<string,unknown>;
export async function loadTeacherData() {
  const data = await teacherSessionRequest('vuihoc_teacher_data');
  const refs = {subjects:data.subjects as Row[], teaching_categories:data.teaching_categories as Row[]};
  return {
    teachers:data.teachers.map((row:Row)=>fromSupabaseRow('teachers',row,refs)) as TeacherProfile[],
    subjects:data.subjects.map((row:Row)=>fromSupabaseRow('subjects',row)) as SubjectItem[],
    teachingCategories:data.teaching_categories.map((row:Row)=>fromSupabaseRow('teaching_categories',row)) as CategoryGroup[],
    levels:data.levels.map((row:Row)=>fromSupabaseRow('levels',row)) as LevelItem[],
    timeSlots:data.time_slots.map((row:Row)=>fromSupabaseRow('time_slots',row)) as TimeSlotItem[],
    models:data.class_models.map((row:Row)=>fromSupabaseRow('class_models',row)) as ClassModelItem[],
  };
}
export async function persistTeacher(profile: Omit<TeacherProfile,'id'|'username'|'passwordRaw'>) {
  const data = await teacherSessionRequest('vuihoc_create_teacher',{p_profile:{
    hoten:profile.name,thudientu:profile.email,sodienthoai:profile.phone,mamonhoc:profile.subject,macaphoc:profile.levelId,
    danhsachkhoi:profile.grades,danhsachmohinh:profile.models,bangcap:profile.degree,ngaybatdau:profile.startDate,ngayketthuc:profile.endDate,
  }});
  const teacher = fromSupabaseRow('teachers',data.teacher) as unknown as TeacherProfile;
  return {id:data.id as string,username:data.username as string,password:data.password as string,teacher:{...teacher,subjectName:profile.subjectName,levelName:profile.levelName}};
}
