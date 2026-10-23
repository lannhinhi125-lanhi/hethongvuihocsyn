import { APP_DATABASE_FIELDS, DATABASE_NAMES } from './databaseNames';
import { inspectionDate } from './inspectionReport';
export type SupabaseDataset = keyof typeof APP_DATABASE_FIELDS;
type DataRow = Record<string, unknown>;
export const DERIVED_DATABASE_FIELDS: Partial<Record<SupabaseDataset, readonly string[]>> = {
  time_slots: ['timeRange', 'durationMinutes'],
  users: ['role', 'subject', 'avatarInitials'],
  role_groups: ['userCount'],
  lesson_incidents: ['fromClassPause', 'incidentName'],
  dated_lessons: ['displayCode', 'feedbackProgress', 'inspectionData', 'pausedByClass', 'pauseReason', 'pauseCategoryId', 'pauseNote', 'startsAt', 'endsAt'],
  // Student scalar study fields are a read projection; only registrations writes study data.
  students: ['classHistory','registrationHistory','subject','model','level','status','currentClassCode','scheduleSlots'],
  sop_documents: ['category', 'uploadedBy', 'uploaderName'],
  rag_bot_config: ['quickPrompts'],
  teachers: ['subjectName', 'levelName', 'statusLabel', 'successfulSessions', 'freeSlots', 'busySlots', 'isFull', 'evalStatus', 'evalScore', 'evalComment', 'evalCriteriaScores', 'scheduleEffectiveFrom', 'scheduleHistory'],
  "classes": [
    "teacherName", "maxStudents", "durationMonths", "endDate"
  ],
  "teacher_evaluations": [
    "teacherId", "classCode", "recipientUserId", "sessionDate", "sessionCode",
    "sessionNum", "sessionName", "timeSlot", "model", "overallScore", "rank", "roomLink", "recordLink",
    "evaluatorName",
    "evaluatorRole",
    "className"
  ]
};
const STATUS_CODES = {
  "students": {
    "Chờ xếp lớp": "CHO_XEP_LOP",
    "Đang học": "DANG_HOC",
    "Bảo lưu": "BAO_LUU",
    "Đã thôi học": "DA_THOI_HOC"
  },
  "classes": {
    "Chờ khai giảng": "CHO_KHAI_GIANG",
    "Đang học": "DANG_HOC",
    "Dừng lớp": "TAM_DUNG",
    "Đã kết thúc": "DA_KET_THUC"
  }
} as const;

/** Chuyển object UI sang cột SQL. Không gọi API, không tự lưu dữ liệu. */
export function toSupabaseRow(dataset: SupabaseDataset, value: object): DataRow {
  if (dataset === 'teaching_sessions') throw new Error('CA_HOC đã bỏ; sử dụng dated_lessons và các bảng nghiệp vụ theo mã buổi.');
  if (dataset === 'availability_versions' || dataset === 'availability_version_slots') throw new Error('Cập nhật schedule của giáo viên để tạo phiên bản lịch rảnh đầy đủ.');
  const fields = APP_DATABASE_FIELDS[dataset] as Record<string,string>;
  const result: DataRow = {};
  for (const [field,content] of Object.entries(value)) {
    if (DERIVED_DATABASE_FIELDS[dataset]?.includes(field)) continue;
    if (field === 'auth_user_id' || field === 'passwordRaw' || field === 'created_at' || field === 'updated_at') continue;
    if (!Object.hasOwn(fields,field)) throw new Error('Chưa ánh xạ trường ' + dataset + '.' + field);
    if (dataset === 'students' && field === 'registrations') {
      result[fields[field]] = (content as any[]).map(item => ({ ...item,
        status: STATUS_CODES.students[item.status as keyof typeof STATUS_CODES.students] || item.status,
        currentClassCode: item.currentClassCode || null }));
      continue;
    }
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
    const codes = STATUS_CODES[dataset as keyof typeof STATUS_CODES] as Record<string,string> | undefined;
    const normalized = field === 'status' && codes ? codes[String(content)] || content : content;
    let stored = normalized;
    if (dataset === 'time_slots' && ['startTime','endTime'].includes(field) && typeof stored === 'string' && /^\d{2}:\d{2}$/.test(stored)) stored += ':00';
    if (dataset === 'lesson_incidents' && ['reportedAt','handledAt'].includes(field) && typeof stored === 'string' && stored) {
      stored = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(stored));
    }
    result[fields[field]] = stored === undefined || (foreignKey && stored === '') ? null : stored;
  }
  if (typeof result.madinhdanh === 'string' && result.madinhdanh.startsWith('PREVIEW-')) throw new Error('Tài khoản mẫu chỉ dùng xem trước, không ghi vào database.');
  return result;
}
/** Chuyển kết quả truy vấn SQL về object UI, gồm các danh sách từ bảng liên quan. */
export function fromSupabaseRow(dataset: SupabaseDataset, row: DataRow, references: Partial<Record<SupabaseDataset, DataRow[]>> = {}): DataRow {
  if (dataset === 'teaching_sessions') throw new Error('CA_HOC đã bỏ; sử dụng dated_lessons và các bảng nghiệp vụ theo mã buổi.');
  const result: DataRow = {};
  for (const [field,column] of Object.entries(APP_DATABASE_FIELDS[dataset])) {
    if (Object.hasOwn(row,column)) result[field] = row[column];
  }
  if (dataset === 'users') result.passwordRaw = '';
  if (dataset === 'report_templates') {
    const config = result.config as {filters?:Record<string,unknown>} | undefined;
    const value = config?.filters?.pauseReason;
    if (typeof value === 'string') {
      try {
        const keys:unknown = JSON.parse(value);
        if (Array.isArray(keys) && keys.every(key => typeof key === 'string' && (key.startsWith('[') || key.startsWith('__')))) result.config = {...config,filters:{...config!.filters,pauseReason:keys}};
      } catch { /* A scalar filter remains a scalar. */ }
    }
  }
  if (dataset === 'students' && Array.isArray(result.registrations)) {
    result.registrations = result.registrations.map(item => ({ ...item,
      status: Object.entries(STATUS_CODES.students).find(([, code]) => code === item.status)?.[0] || item.status,
      currentClassCode: item.currentClassCode || undefined }));
  }
  // UI timing calculations use an instant; the database stores date and time separately.
  if (dataset === 'dated_lessons') {
    for (const field of ['startsAt','endsAt']) {
      if (typeof result[field] === 'string' && /^\d{2}:\d{2}/.test(result[field] as string)) {
        let date = String(result.date);
        if (field === 'endsAt' && typeof row.batdau === 'string' && typeof row.ketthuc === 'string' && row.ketthuc < row.batdau) {
          const next = new Date(date + 'T00:00:00Z');
          next.setUTCDate(next.getUTCDate() + 1);
          date = next.toISOString().slice(0, 10);
        }
        result[field] = `${date}T${result[field]}+07:00`;
      }
    }
  }
  const codes = STATUS_CODES[dataset as keyof typeof STATUS_CODES];
  if (codes && result.status != null) result.status = Object.entries(codes).find(([,code])=>code===result.status)?.[0] || result.status;
  const find = (table: SupabaseDataset, key: string, value: unknown) => value == null ? undefined : references[table]?.find(item=>item[key]===value);
  if (dataset === 'teachers') {
    result.subjectName = find('subjects','mamonhoc',row.mamonhoc)?.tenmonhoc ?? '';
    result.levelName = find('teaching_categories','madinhdanh',row.macaphoc)?.tencaphoc ?? '';
    result.statusLabel = ({DANG_DAY:'Đang dạy',CHO_LOP:'Chờ lớp',TAM_NGUNG:'Tạm ngưng'} as Record<string,string>)[String(result.status)] ?? '';
    // Inspection summaries come from the queried reports; saving a report does not edit the teacher.
    result.evalStatus = 'UNSCORED';
    result.evalScore = null;
    result.evalComment = '';
    result.evalCriteriaScores = undefined;
    const latest = Array.isArray(result.evaluationReports) ? result.evaluationReports
      .filter(report => report.status === 'DA_DUYET' && report.overallScore != null && Number.isFinite(Number(report.overallScore)))
      .sort((a,b) => inspectionDate(b.evaluationDate).localeCompare(inspectionDate(a.evaluationDate)) || String(b.id || '').localeCompare(String(a.id || '')))[0] : undefined;
    if (latest) {
      result.evalStatus = 'SCORED';
      result.evalScore = Number(latest.overallScore).toFixed(2);
      result.evalComment = latest.generalComment || '';
      result.evalCriteriaScores = latest.criteriaScores;
    }
  }
  if (dataset === 'classes') result.teacherName = find('teachers','madinhdanh',row.magiaovien)?.hoten ?? '';
  if (dataset === 'teacher_evaluations') {
    const user = find('users','madinhdanh',row.manguoidanhgia);
    result.evaluatorName = user?.hoten ?? '';
    result.evaluatorRole = user?.vaitro ?? '';
    result.className = find('classes','malophoc',row.malophoc)?.tenlophoc ?? '';
  }
  return result;
}
export function supabaseTable(dataset: SupabaseDataset): string {
  if (dataset === 'teaching_sessions') throw new Error('Dùng dated_lessons thay cho CA_HOC.');
  return DATABASE_NAMES[dataset].table;
}
