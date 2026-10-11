import { APP_DATABASE_FIELDS, DATABASE_NAMES } from './databaseNames';
export type SupabaseDataset = keyof typeof APP_DATABASE_FIELDS;
type DataRow = Record<string, unknown>;

/** Chuyển object UI sang cột SQL. Không gọi API, không tự lưu dữ liệu. */
export function toSupabaseRow(dataset: SupabaseDataset, value: object): DataRow {
  const fields = APP_DATABASE_FIELDS[dataset] as Record<string,string>;
  const result: DataRow = {};
  for (const [field,content] of Object.entries(value)) {
    if (dataset === 'weekly_availability' && field === 'weekEnd') continue;
    if (field === 'auth_user_id' || field === 'passwordRaw' || field === 'created_at' || field === 'updated_at') continue;
    if (!Object.hasOwn(fields,field)) throw new Error('Chưa ánh xạ trường ' + dataset + '.' + field);
    if (dataset === 'teacher_evaluations' && ['evaluationDate','sessionDate'].includes(field) && content != null && content !== '') {
      const raw = String(content);
      const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const iso = dmy ? dmy[3] + '-' + dmy[2].padStart(2,'0') + '-' + dmy[1].padStart(2,'0') : raw;
      const parsed = new Date(iso + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== iso) throw new Error('Ngày dự giờ không hợp lệ: ' + raw);
      result[fields[field]] = iso;
      continue;
    }
    // Undefined trong trường có mặt nghĩa là người dùng xóa giá trị tùy chọn.
    const foreignKey = ['roleGroupId','teacherId','parentId','user_id','auth_user_id','active_tone_key','currentClassCode','categoryId','coverTeacherId','updatedBy','checkinUserId','checkoutUserId','reportedBy','handledBy','submittedBy','reviewedBy','toneId','recipientUserId','evaluatorUserId','lessonId'].includes(field);
    const normalized = dataset === 'teaching_sessions' && field === 'subject' ? ({ TOAN: 'SUB-MATH', ANH: 'SUB-ENG' } as Record<string,unknown>)[String(content)] || content : content;
    result[fields[field]] = normalized === undefined || (foreignKey && normalized === '') ? null : normalized;
  }
  if (typeof result.madinhdanh === 'string' && result.madinhdanh.startsWith('PREVIEW-')) throw new Error('Tài khoản mẫu chỉ dùng xem trước, không ghi vào database.');
  return result;
}
/** Chuyển hàng SQL về object UI; dữ liệu lồng JSONB giữ nguyên. */
export function fromSupabaseRow(dataset: SupabaseDataset, row: DataRow): DataRow {
  const result: DataRow = {};
  for (const [field,column] of Object.entries(APP_DATABASE_FIELDS[dataset])) {
    if (Object.hasOwn(row,column)) result[field] = row[column];
  }
  if (dataset === 'users') result.passwordRaw = '';
  if (dataset === 'teaching_sessions') result.subject = ({ 'SUB-MATH':'TOAN', 'SUB-ENG':'ANH' } as Record<string,string>)[String(result.subject)] || result.subject;
  return result;
}
export function supabaseTable(dataset: SupabaseDataset): string {
  return DATABASE_NAMES[dataset].table;
}
