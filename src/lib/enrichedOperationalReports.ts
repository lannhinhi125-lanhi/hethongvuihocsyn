import { matchesReportFilter, matchesReportField, reportFilterValues, type ReportDataset, type ReportDimension, type ReportRecord } from './customReports';
import type { ReportLesson, ReportIncident } from './incidentReportPeriods';
import { inspectionDate, type InspectionEvaluation } from './inspectionReport';
import { evaluationRating } from './evaluationScoring';

export interface ReportLookups {
  incidentCategories?: { id: string; name: string; subIncidents: { code: string; name: string }[] }[];
  teachingCategories?: { id: string; name: string; options: { id: string; label: string; parentId?: string }[] }[];
  levels?: { code: string; name: string }[];
  subjects?: { code: string; name: string }[];
  models?: { code: string; name: string }[];
  timeSlots?: { id: string; timeRange: string }[];
}
type ReportingClass = { id: string; name: string; code?: string; subject?: string; model?: string; grade?: string; categoryId?: string; level?: string };
const unknown = 'Chưa xác định';
const lessonStatus = (value?: string) => ({ DA_HOC: 'Đã học', HOAN_THANH: 'Hoàn thành', DA_HUY: 'Đã hủy', HUY: 'Đã hủy', NGHI_HOC: 'Nghỉ học', CHUA_HOC: 'Chưa học', CHUA_DIEN_RA: 'Chưa diễn ra', DANG_HOC: 'Đang học', DA_HOC_CU: 'Đã học (lịch sử)', DAY_THAY_CU: 'Dạy thay (lịch sử)' }[value || ''] || value || unknown);
const incidentStatus = (value?: string | null) => ({ DA_GIAI_QUYET: 'Đã giải quyết', DA_XU_LY: 'Đã xử lý', DANG_XU_LY: 'Đang xử lý', HUY_CA: 'Hủy ca' }[value || ''] || value || unknown);
const field = (id: string, label: string): ReportDimension => ({ id, label });
const time = [field('day', 'Ngày'), field('week', 'Tuần'), field('month', 'Tháng')];
const localTime = (value?: string) => !value || !Number.isFinite(Date.parse(value)) ? '' : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
const eventList = (record: ReportRecord): ReportIncident[] => JSON.parse(String(record.__selectedEvents || '[]'));
const withEvents = (record: ReportRecord, events: ReportIncident[]): ReportRecord => {
  const urgent = events.some(event => event.urgency === 'EMERGENCY');
  return { ...record, incidents: events.length ? 1 : 0, urgent: urgent ? 1 : 0, notice: events.length && !urgent ? 1 : 0,
    cause: [...new Set(events.map(event => event.incidentName || unknown))].sort().join('; ') || 'Chưa ghi nhận sự cố',
    incidentState: [...new Set(events.map(event => incidentStatus(event.status)))].join('; ') || 'Không có sự cố',
    urgencyLabel: events.length ? urgent ? 'Có sự cố khẩn cấp' : 'Không khẩn cấp' : 'Không có sự cố', __selectedEvents: JSON.stringify(events) };
};

/** One source row per lesson; filtering an incident type changes the numerator, not the lesson population. */
export function enrichedOperationalReports(lessons: ReportLesson[], incidents: ReportIncident[], evaluations: InspectionEvaluation[],
  teachers: { id: string; name: string; subject: string }[], classes: ReportingClass[], lookups: ReportLookups = {}): ReportDataset[] {
  const classesById = new Map(classes.map(row => [row.id, row]));
  const lessonsById = new Map(lessons.map(row => [row.id, row]));
  const teachersById = new Map(teachers.map(row => [row.id, row]));
  const causeChoices = lookups.incidentCategories?.flatMap(category => category.subIncidents.map(item => ({ value: JSON.stringify([category.id, item.code]), label: item.name, group: category.name }))) || [];
  const causeKey = (event: ReportIncident) => {
    if (lookups.incidentCategories && event.categoryId && event.incidentCode) return JSON.stringify([event.categoryId, event.incidentCode]);
    const candidates = causeChoices.filter(item => item.label === event.incidentName && (!event.categoryId || JSON.parse(item.value)[0] === event.categoryId));
    return candidates.length === 1 ? candidates[0].value : event.incidentName || unknown;
  };
  const allCauses = [...causeChoices, ...[...new Set(incidents.map(causeKey))].filter(key => !causeChoices.some(item => item.value === key)).map(key => ({ value: key, label: incidents.find(event => causeKey(event) === key)?.incidentName || unknown }))];
  const causeField: ReportDimension = { ...field('cause', 'Loại sự cố'), ...(lookups.incidentCategories ? { choices: allCauses.map(choice => ({ ...choice, label: allCauses.filter(item => item.label === choice.label).length > 1 ? choice.label + ' (' + ('group' in choice ? choice.group : choice.value) + ')' : choice.label })) } : {}) };
  const incidentsByLesson = new Map<string, ReportIncident[]>();
  incidents.forEach(event => incidentsByLesson.set(event.lessonId, [...(incidentsByLesson.get(event.lessonId) || []), event]));
  const context = (lesson?: ReportLesson) => {
    const cls = classesById.get(lesson?.classId || ''), tutor = teachersById.get(lesson?.coverTeacherId || lesson?.primaryTeacherId || '');
    const slot = lookups.timeSlots?.find(row => row.id === lesson?.timeSlotId), start = localTime(lesson?.startsAt), end = localTime(lesson?.endsAt);
    return { classId: cls?.id || lesson?.classId || unknown, classCode: cls?.code || cls?.name || unknown, name: cls?.name || unknown,
      subject: lookups.subjects?.find(row => row.code === cls?.subject)?.name || cls?.subject || unknown,
      __subject: cls?.subject, __model: cls?.model, __timeSlot: lesson?.timeSlotId, category: cls?.categoryId || lookups.teachingCategories?.find(cat => cat.options.some(opt => opt.id === cls?.grade))?.id, program: cls?.level,
      model: lookups.models?.find(row => row.code === cls?.model)?.name || cls?.model || unknown, grade: cls?.grade || unknown,
      timeSlot: slot?.timeRange || (start ? start + (end ? ' – ' + end : '') : unknown),
      teacherId: tutor?.id || lesson?.coverTeacherId || lesson?.primaryTeacherId || undefined, teacher: tutor?.name || unknown, lessonStatus: lessonStatus(lesson?.status),
      weekday: lesson?.date && Number.isFinite(Date.parse(lesson.date)) ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(lesson.date + 'T00:00:00Z').getUTCDay()] : unknown };
  };
  const subject = field('subject', 'Môn học'), model = field('model', 'Mô hình'), grade = field('grade', 'Khối lớp');
  const slot = field('timeSlot', 'Khung giờ'), teacher = field('teacher', 'Giáo viên thực dạy'), className = field('name', 'Lớp học');
  const shared = [subject, model, grade, slot, field('weekday', 'Ngày trong tuần'), teacher, className, field('lessonStatus', 'Trạng thái buổi học')];
  const incidentDataset: ReportDataset = {
    id: 'incidents', label: 'Sự cố vận hành', dateKind: 'event', nonAdditiveGroups: ['cause'],
    note: 'Tỷ lệ = buổi có sự cố / tổng buổi học trong cùng kỳ và cùng môn, mô hình, khung giờ đã lọc. Chọn loại sự cố chỉ đổi tử số. Một buổi có nhiều sự cố chỉ tính một lần ở tổng; các nhóm loại sự cố có thể trùng buổi, không cộng các nhóm để suy ra tổng. Môn/mô hình theo lớp hiện có; thiếu liên kết ghi “Chưa xác định”.',
    records: lessons.map(lesson => withEvents({ id: lesson.id, code: lesson.displayCode || 'Chưa cấp mã', date: lesson.date, period: lesson.date.slice(0, 7), ...context(lesson), total: 1 }, incidentsByLesson.get(lesson.id) || [])),
    metrics: [{ id: 'incidents', label: 'Buổi có sự cố', mode: 'sum', field: 'incidents' },
      { id: 'rate', label: 'Tỷ lệ buổi có sự cố', mode: 'ratio', field: 'incidents', denominator: 'total', format: 'percent' },
      { id: 'total', label: 'Tổng buổi học', mode: 'sum', field: 'total' }, { id: 'urgent', label: 'Buổi có sự cố khẩn cấp', mode: 'sum', field: 'urgent' },
      { id: 'notice', label: 'Buổi có sự cố không khẩn cấp', mode: 'sum', field: 'notice' }],
    defaultMetricIds: ['total', 'incidents', 'rate'], dimensions: [subject, model, slot, grade, teacher, className, causeField, ...time, field('weekday', 'Ngày trong tuần'), field('period', 'Tháng (mã)')],
    filters: [...shared, { ...causeField, options: [...new Set(incidents.map(event => event.incidentName || unknown))].sort() },
      { ...field('urgency', 'Mức độ sự cố'), options: ['Khẩn cấp', 'Không khẩn cấp'] },
      { ...field('incidentStatus', 'Trạng thái xử lý sự cố'), options: [...new Set(incidents.map(event => incidentStatus(event.status)))].sort() }],
    detailFields: [field('code', 'Mã buổi'), field('date', 'Ngày học'), className, subject, model, grade, slot, teacher, field('lessonStatus', 'Trạng thái buổi'), field('incidents', 'Có sự cố (1/0)'), field('cause', 'Sự cố ghi nhận'), field('urgencyLabel', 'Mức độ'), field('incidentState', 'Trạng thái xử lý')],
    filterRecords: (records, filters) => records.filter(record => incidentDataset.filters.filter(item => !['cause', 'urgency', 'incidentStatus'].includes(item.id)).every(item => matchesReportField(record, item, filters[item.id]))).map(record => withEvents(record,
      eventList(record).filter(event => matchesReportFilter(causeKey(event), filters.cause)
        && matchesReportFilter(event.urgency === 'EMERGENCY' ? 'Khẩn cấp' : 'Không khẩn cấp', filters.urgency)
        && matchesReportFilter(incidentStatus(event.status), filters.incidentStatus)))),
    groupRecords: (records, groupBy, filters) => {
      if (groupBy !== 'cause') return null;
      const causes = reportFilterValues(filters.cause).length ? reportFilterValues(filters.cause) : allCauses.map(item => item.value);
      return new Map(causes.map(cause => [cause, records.map(record => withEvents(record, eventList(record).filter(event => causeKey(event) === cause)))]));
    }
  };
  const inspectionDataset: ReportDataset = {
    id: 'inspection', label: 'Biên bản dự giờ đã duyệt', dateKind: 'event',
    note: 'Lọc theo ngày dự giờ. Điểm trung bình theo biên bản đã duyệt; giáo viên đếm mã duy nhất. Mô hình, khối và khung giờ chỉ có khi biên bản liên kết đúng buổi học, không suy từ lớp khác của giáo viên.',
    records: evaluations.flatMap(evaluation => {
      const score = evaluation.overallScore == null ? NaN : Number(evaluation.overallScore);
      if (evaluation.status !== 'DA_DUYET' || !evaluation.teacherId || !evaluationRating(score)) return [];
      const tutor = teachersById.get(evaluation.teacherId), lesson = lessonsById.get(evaluation.lessonId || ''), related = context(lesson);
      return [{ ...related, id: evaluation.id, lessonCode: lesson?.displayCode || (lesson ? 'Chưa cấp mã' : 'Chưa liên kết buổi'), teacherId: evaluation.teacherId,
        teacher: tutor?.name || evaluation.teacherId, name: tutor?.name || evaluation.teacherId, className: related.name, date: inspectionDate(evaluation.evaluationDate),
        __subject: lesson && related.__subject ? related.__subject : tutor?.subject,
        subject: lesson && related.subject !== unknown ? related.subject : lookups.subjects?.find(row => row.code === tutor?.subject)?.name || tutor?.subject || unknown,
        rank: evaluationRating(score)!.label, score, sessions: 1 }];
    }),
    metrics: [{ id: 'count', label: 'Giáo viên được dự giờ', mode: 'distinct', field: 'teacherId' },
      { id: 'score', label: 'Điểm trung bình biên bản', mode: 'average', field: 'score', format: 'score' }, { id: 'sessions', label: 'Biên bản đã duyệt', mode: 'sum', field: 'sessions' }],
    defaultMetricIds: ['count', 'score', 'sessions'], dimensions: [field('rank', 'Xếp loại biên bản'), subject, model, grade, slot, field('teacherId', 'Mã giáo viên'), ...time],
    filters: [subject, model, grade, slot, field('teacher', 'Giáo viên'), field('rank', 'Xếp loại biên bản'), field('className', 'Lớp học')],
    detailFields: [field('id', 'Mã biên bản'), field('teacherId', 'Mã giáo viên'), field('name', 'Giáo viên'), field('date', 'Ngày dự giờ'), subject, model, field('className', 'Lớp'), field('lessonCode', 'Mã buổi'), slot, field('rank', 'Xếp loại'), field('score', 'Điểm')]
  };
  const lessonDataset: ReportDataset = {
    id: 'lessons', label: 'Ca dạy & phân bổ', dateKind: 'event',
    note: 'Theo ngày học; giáo viên thực dạy ưu tiên người dạy thay. Buổi hoàn thành theo trạng thái lưu, không suy từ lịch dự kiến. Môn và mô hình theo lớp hiện có.',
    records: lessons.map(lesson => ({ ...context(lesson), id: lesson.id, code: lesson.displayCode || 'Chưa cấp mã', date: lesson.date,
      total: 1, completed: ['DA_HOC', 'HOAN_THANH', 'DA_HOC_CU', 'DAY_THAY_CU'].includes(lesson.status || '') ? 1 : 0, cover: lesson.coverTeacherId ? 1 : 0 })),
    metrics: [{ id: 'total', label: 'Buổi học được ghi nhận', mode: 'sum', field: 'total' }, { id: 'completed', label: 'Buổi đã hoàn thành', mode: 'sum', field: 'completed' },
      { id: 'cover', label: 'Buổi có dạy thay', mode: 'sum', field: 'cover' }, { id: 'count', label: 'Giáo viên thực dạy', mode: 'distinct', field: 'teacherId' }],
    defaultMetricIds: ['total', 'completed', 'cover'], dimensions: [...shared, ...time], filters: shared,
    detailFields: [field('code', 'Mã buổi'), field('date', 'Ngày học'), className, subject, model, grade, slot, teacher, field('lessonStatus', 'Trạng thái'), field('cover', 'Dạy thay (1/0)')]
  };
  return [incidentDataset, inspectionDataset, lessonDataset];
}
