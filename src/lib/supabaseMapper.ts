import { APP_DATABASE_FIELDS, DATABASE_NAMES } from './databaseNames';
export type SupabaseDataset = keyof typeof APP_DATABASE_FIELDS;
type DataRow = Record<string, unknown>;
export const DERIVED_DATABASE_FIELDS: Partial<Record<SupabaseDataset, readonly string[]>> = {
  dated_lessons: ['displayCode', 'feedbackProgress', 'inspectionData'],
  students: ['classHistory','registrationHistory'],
  sop_documents: ['category'],
  rag_bot_config: ['quickPrompts'],
  teachers: ['subjectName', 'levelName', 'statusLabel', 'successfulSessions', 'freeSlots', 'busySlots', 'isFull'],
  "classes": [
    "teacherName"
  ],
  "teacher_evaluations": [
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
    "Tạm dừng": "TAM_DUNG",
    "Đã kết thúc": "DA_KET_THUC"
  }
} as const;

/** Chuyển object UI sang cột SQL. Không gọi API, không tự lưu dữ liệu. */
export function toSupabaseRow(dataset: SupabaseDataset, value: object): DataRow {
  if (dataset === 'teaching_sessions') throw new Error('CA_HOC đã bỏ; sử dụng dated_lessons và các bảng nghiệp vụ theo mã buổi.');
  const fields = APP_DATABASE_FIELDS[dataset] as Record<string,string>;
  const result: DataRow = {};
  for (const [field,content] of Object.entries(value)) {
    if (DERIVED_DATABASE_FIELDS[dataset]?.includes(field)) continue;
    if (dataset === 'weekly_availability' && field === 'weekEnd') continue;
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
    // Nhãn hiển thị cũ không phải mã lớp hợp lệ; học sinh chưa ghép lớp lưu NULL.
    if (dataset === 'students' && field === 'currentClassCode' && content === 'Chưa xếp lớp') {
      result[fields[field]] = null;
      continue;
    }
    // Undefined trong trường có mặt nghĩa là người dùng xóa giá trị tùy chọn.
    const foreignKey = ['roleGroupId','teacherId','parentId','user_id','auth_user_id','active_tone_key','currentClassCode','categoryId','coverTeacherId','updatedBy','checkinUserId','checkoutUserId','reportedBy','handledBy','submittedBy','reviewedBy','toneId','recipientUserId','evaluatorUserId','lessonId'].includes(field);
    const codes = STATUS_CODES[dataset as keyof typeof STATUS_CODES] as Record<string,string> | undefined;
    const normalized = field === 'status' && codes ? codes[String(content)] || content : content;
    let stored = normalized;
    if (dataset === 'dated_lessons' && ['startsAt','endsAt'].includes(field) && typeof stored === 'string') {
      stored = stored.includes('T')
        ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(stored))
        : stored;
    }
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
  if (dataset === 'students' && Array.isArray(result.registrations)) {
    result.registrations = result.registrations.map(item => ({ ...item,
      status: Object.entries(STATUS_CODES.students).find(([, code]) => code === item.status)?.[0] || item.status,
      currentClassCode: item.currentClassCode || undefined }));
  }
  // UI timing calculations use an instant; the database stores date and time separately.
  if (dataset === 'dated_lessons') {
    for (const field of ['startsAt','endsAt']) {
      if (typeof result[field] === 'string' && /^\d{2}:\d{2}/.test(result[field] as string)) {
        result[field] = `${result.date}T${result[field]}+07:00`;
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
    if (Array.isArray(result.evaluationReports) && result.evaluationReports.length) {
      const latest = result.evaluationReports[0];
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
