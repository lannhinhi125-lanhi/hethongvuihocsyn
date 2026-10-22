import { incidentCatalogFields } from './reportIncidentCatalog';
import type { ClassItem, StudentRecord, TeacherProfile } from '../types';
import { pauseReasonName, pauseReasonKey } from './classPause';
import {studentMultiEnrollmentReport} from './studentMultiEnrollmentReport';
import { makeReportDatasets } from './reportDatasets';
import { operationalReportDatasets, type ReportLookups } from './operationalReportDatasets';
import { reportCreationDate } from './reportCreationDate';
import { studentProfileRows, studentRegistrationRows, studentRegistrations } from './studentRegistrations';
import { classifyClassGrowth, classGrowthLabels } from './classGrowth';
import { inspectionReportRows, type InspectionEvaluation } from './inspectionReport';
import type { ReportIncident, ReportLesson } from './incidentReportPeriods';
import { matchesReportFilter, matchesReportField, reportFilterValues, type ReportDataset, type ReportRecord } from './customReports';
import { attachReportCatalogs, reportGradeKey } from './reportCatalogs';
import {reportToday} from './customReports';

const unknown = 'Chưa xác định';
const multiGroups = (records: ReportRecord[], groupBy: string, values: (record: ReportRecord) => string[]) => {
  const groups = new Map<string, ReportRecord[]>();
  records.forEach(record => [...new Set(values(record))].forEach(key => groups.set(key, [...(groups.get(key) || []), record])));
  return groups;
};
export function allReportDatasets({ classes, students, teachers, lessons, incidents, evaluations, lookups }: {
  classes: ClassItem[]; students: StudentRecord[]; teachers: TeacherProfile[]; lessons: ReportLesson[];
  incidents: ReportIncident[]; evaluations: InspectionEvaluation[]; lookups: ReportLookups;
}) {
  const subject = (code?: string) => lookups.subjects?.find(row => row.code === code)?.name || code || unknown;
  const model = (code?: string) => lookups.models?.find(row => row.code === code)?.name || code || unknown;
  const mappedClasses = classes.map(row => ({ code: row.code, name: row.name, date: reportCreationDate(row.created_at), subject: subject(row.subject), grade: row.grade || unknown,
    model: model(row.model), students: `${row.studentIds.length} / ${row.maxStudents}`, status: row.studentIds.length >= row.maxStudents ? 'Đã đủ sĩ số' : 'Còn chỗ' }));
  const profiles = studentProfileRows(students);
  const registrationRows = studentRegistrationRows(students).map(row => ({ id: row.id, registrationKey: row.registrationKey, name: row.name,
    date: reportCreationDate(row.created_at), subject: subject(row.subject), grade: row.grade || unknown, model: model(row.model), status: row.status || unknown }));
  const basics = makeReportDatasets({ classes: mappedClasses,
    students: profiles.map(row => ({ id: row.id, name: row.name, date: reportCreationDate(row.created_at), grade: row.grade || unknown,
      subject: [...new Set(studentRegistrations(row).map(reg => subject(reg.subject)))].join(', '),
      model: [...new Set(studentRegistrations(row).map(reg => model(reg.model)))].join(', '),
      status: [...new Set(studentRegistrations(row).map(reg => reg.status))].join(', ') })), registrations: registrationRows,
    teachers: teachers.map(row => ({ id: row.id, name: row.name, date: reportCreationDate(row.created_at), subject: subject(row.subject), grades: row.grades.join(', ') || unknown,
      status: row.statusLabel || row.status || unknown, assigned: 0 })), incidents: [], inspections: []
  }).filter(dataset => !['incidents', 'inspection'].includes(dataset.id)).map(dataset => ({ ...dataset,
    metrics: dataset.metrics.map(metric => ({ ...metric })), dimensions: dataset.dimensions.map(item => ({ ...item })),
    filters: dataset.filters.map(item => ({ ...item })), detailFields: dataset.detailFields.map(item => ({ ...item })) }));
  const studentsById = new Map(students.map(row => [row.id, row]));
  const classesByCode = new Map(classes.map(row => [row.code, row]));
  const classesDataset = basics.find(dataset => dataset.id === 'classes')!;
  classesDataset.records = classesDataset.records.map(record => {
    const cls = classesByCode.get(String(record.id));
    const category=lookups.incidentCategories?.find(row=>row.id===cls?.pauseCategoryId);
    const item=category?.subIncidents.find(row=>(row.id||row.code)===cls?.pauseReason);
    return {...record, incidentGroup:cls?.paused ? cls.pauseCategoryId || '__MISSING__' : '__NONE__',
      incidentGroupName:cls?.paused ? category?.name || cls.pauseCategoryId || 'Chưa xác định' : 'Không có sự cố',
      causeKey:cls?.paused ? cls.pauseReason && cls.pauseCategoryId ? pauseReasonKey(cls.pauseCategoryId,item?.code || cls.pauseReason) : '__MISSING__' : '__NONE__',
      cause:cls?.paused ? item?.name || cls.pauseReason || 'Chưa xác định' : 'Không có sự cố', classStatus:cls?.paused ? 'Tạm dừng' : cls?.status || 'Đang học',
      pauseReason:cls?.paused ? cls.pauseReason && cls.pauseCategoryId ? pauseReasonKey(cls.pauseCategoryId,cls.pauseReason) : '__MISSING__' : '__NONE__',
      pauseReasonName:cls?.paused ? pauseReasonName(cls.pauseReason, lookups.incidentCategories || [], cls.pauseCategoryId) : 'Không tạm dừng'};
  });
  const classStatus = {id:'classStatus',label:'Trạng thái hoạt động lớp'};
  const classification = incidentCatalogFields(lookups.incidentCategories || []);
  const incidentType = {...classification.type,recordField:'causeKey'};
  classesDataset.dimensions.push(classStatus,classification.group,incidentType);
  classesDataset.filters.push(classStatus,classification.group,incidentType);
  classesDataset.detailFields.push(classStatus,{id:'incidentGroupName',label:'Nhóm sự cố'},{id:'cause',label:'Loại sự cố'});
  const growthField = { id: 'growthKind', label: 'Phân loại tăng trưởng', options: Object.values(classGrowthLabels) };
  classesDataset.metrics.push({ id: 'growth', label: 'Lớp mới tăng trưởng', mode: 'sum', field: 'growth' });
  classesDataset.defaultMetricIds = ['count', 'growth', 'available'];
  classesDataset.dimensions.push(growthField);
  classesDataset.filters.push(growthField);
  classesDataset.detailFields.push(growthField, { id: 'newStudents', label: 'Học sinh mới trong kỳ' }, { id: 'oldStudents', label: 'Học sinh cũ / chuyển lớp' }, { id: 'unknownStudents', label: 'Học sinh chưa đủ dữ liệu' });
  classesDataset.note += ' Phân loại tăng trưởng dùng lịch sử ghép/chuyển lớp trong kỳ; thiếu lịch sử thì ghi chưa đủ dữ liệu. Chọn một kỳ cụ thể để phân loại học sinh mới/cũ.';
  classesDataset.prepareRange = range => ({ ...classesDataset, prepareRange: undefined, records: classesDataset.records.map(record => {
    const cls = classesByCode.get(String(record.id));
    const growth = cls ? classifyClassGrowth(cls.studentIds, studentsById, range, cls.id, cls.subject) : null;
    return { ...record, growthKind: growth?.label || classGrowthLabels.UNKNOWN, growth: growth?.kind === 'NEW' ? 1 : 0,
      newStudents: growth?.newStudents, oldStudents: growth?.oldStudents, unknownStudents: growth?.unknownStudents };
  }) });

  const profileDataset = basics.find(dataset => dataset.id === 'students')!;
  profileDataset.records = profileDataset.records.map(record => {
    const student = profiles.find(row => row.id === record.id)!;
    return { ...record, __registrations: JSON.stringify(studentRegistrations(student).map(reg => ({ subject: lookups.subjects?.length ? reg.subject : subject(reg.subject), model: lookups.models?.length ? reg.model : model(reg.model), program: reg.level || unknown, status: reg.status || unknown }))) };
  });
  const regs = (record: ReportRecord): Array<Record<string, string>> => JSON.parse(String(record.__registrations || '[]'));
  ['subject', 'model', 'status'].forEach(id => {
    const item = profileDataset.filters.find(field => field.id === id)!;
    item.options = [...new Set(profileDataset.records.flatMap(record => regs(record).map(reg => reg[id])))].sort();
  });
  profileDataset.filterRecords = (records, filters) => records.flatMap(record => {
    if (!profileDataset.filters.filter(field => !['subject', 'model', 'status', 'program'].includes(field.id)).every(field => matchesReportField(record, field, filters[field.id]))) return [];
    const selected = regs(record).filter(reg => ['subject', 'model', 'status', 'program'].every(id => matchesReportFilter(reg[id], filters[id])));
    if (!selected.length && ['subject', 'model', 'status', 'program'].some(id => reportFilterValues(filters[id]).length)) return [];
    return [{ ...record, __registrations: JSON.stringify(selected), ...Object.fromEntries(['subject', 'model', 'status'].map(id => [id, [...new Set(selected.map(reg => profileDataset.filters.find(field => field.id === id)?.choices?.find(choice => choice.value === reg[id])?.label || reg[id]))].join(', ') || unknown])) }];
  });
  profileDataset.groupRecords = (records, groupBy) => ['subject', 'model', 'status', 'program'].includes(groupBy)
    ? multiGroups(records, groupBy, record => regs(record).length ? regs(record).map(reg => reg[groupBy]) : [unknown]) : null;
  profileDataset.nonAdditiveGroups = ['subject', 'model', 'status', 'program'];
  profileDataset.note += ' Khi lọc môn, mô hình và trạng thái, các điều kiện phải cùng một đăng ký. Một hồ sơ có thể xuất hiện ở nhiều nhóm môn nhưng tổng vẫn đếm một người.';

  const teacherDataset = basics.find(dataset => dataset.id === 'teachers')!;
  const teacherGrades = new Map(teachers.map(row => [row.id, row.grades.length ? row.grades.map(grade => reportGradeKey(grade, row.levelId, lookups)) : [unknown]]));
  teacherDataset.filters.find(field => field.id === 'grade')!.options = [...new Set([...teacherGrades.values()].flat())].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  teacherDataset.filterRecords = (records, filters) => records.filter(record => (!reportFilterValues(filters.grade).length || teacherGrades.get(String(record.id))?.some(grade => matchesReportFilter(grade, filters.grade)))
    && teacherDataset.filters.filter(field => field.id !== 'grade').every(field => matchesReportField(record, field, filters[field.id])));
  teacherDataset.groupRecords = (records, groupBy, filters) => groupBy === 'grade' ? multiGroups(records, groupBy, record => (teacherGrades.get(String(record.id)) || [unknown]).filter(grade => matchesReportFilter(grade, filters.grade))) : null;
  teacherDataset.nonAdditiveGroups = ['grade'];
  teacherDataset.note += ' Một giáo viên phụ trách nhiều khối có thể có mặt ở nhiều nhóm; tổng hồ sơ không cộng trùng.';

  const operational = operationalReportDatasets(lessons, incidents, evaluations, teachers.map(row => ({ id: row.id, name: row.name, subject: row.subject })), classes, lookups);
  const teacherInspection: ReportDataset = {
    id: 'inspection_teachers', label: 'Giáo viên & xếp hạng dự giờ', dateKind: 'event',
    note: 'Chỉ tính biên bản đã duyệt theo ngày dự giờ. Mỗi giáo viên một dòng, điểm và xếp hạng tính lại trong kỳ. Điểm tổng hợp là trung bình theo giáo viên, khác trung bình theo biên bản.',
    records: [], metrics: [{ id: 'count', label: 'Giáo viên được dự giờ', mode: 'count' }, { id: 'score', label: 'Điểm trung bình giáo viên', mode: 'average', field: 'score', format: 'score' },
      { id: 'sessions', label: 'Biên bản đã duyệt', mode: 'sum', field: 'sessions' }], defaultMetricIds: ['count', 'score', 'sessions'],
    dimensions: [{ id: 'rank', label: 'Xếp hạng giáo viên' }, { id: 'subject', label: 'Môn học' }], filters: [{ id: 'subject', label: 'Môn học' }, { id: 'rank', label: 'Xếp hạng giáo viên', options: ['Hạng A', 'Hạng B', 'Hạng C', 'Hạng D'] }],
    detailFields: [{ id: 'id', label: 'Mã giáo viên' }, { id: 'name', label: 'Giáo viên' }, { id: 'subject', label: 'Môn học' }, { id: 'rank', label: 'Xếp hạng' }, { id: 'score', label: 'Điểm trung bình' }, { id: 'sessions', label: 'Biên bản đã duyệt' }]
  };
  teacherInspection.prepareRange = range => ({ ...teacherInspection, prepareRange: undefined, dateKind: 'snapshot',
    records: inspectionReportRows(teachers.map(row => ({ ...row, evaluationReports: undefined })), evaluations.filter(row => row.status === 'DA_DUYET'), lessons, range)
      .map(row => ({ id: row.id, name: row.name, subject: subject(row.subjectCode), rank: row.rank, score: row.avg, sessions: row.total })) });
  teacherInspection.records = teacherInspection.prepareRange({ start: '', end: '' }).records;
  const today=reportToday();
  const endingClasses:ReportDataset={
    id:'classes_ending',label:'Lớp sắp kết thúc',dateKind:'event',
    note:'Lớp đang học hoặc chờ khai giảng có ngày kết thúc trong 30 ngày tới (kể cả hôm nay). Lọc thời gian theo ngày kết thúc; lớp chưa có thời hạn không được suy đoán ngày kết thúc.',
    records:classes.filter(row=>row.endDate && !['Đã kết thúc','Dừng lớp'].includes(row.status||'')).flatMap(row=>{
      const remaining=Math.round((Date.parse(row.endDate!+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
      return remaining>=0&&remaining<=30?[{id:row.code,name:row.name,date:row.endDate!,startDate:row.startDate||'',remaining,subject:subject(row.subject),grade:row.grade,model:model(row.model),status:row.status||'Đang học',teacher:row.teacherName,students:row.studentIds.length}]:[];
    }),metrics:[{id:'count',label:'Lớp sắp kết thúc',mode:'count'}],defaultMetricIds:['count'],
    dimensions:[{id:'subject',label:'Môn học'},{id:'status',label:'Trạng thái'}],filters:[{id:'subject',label:'Môn học'},{id:'status',label:'Trạng thái'}],
    detailFields:[{id:'id',label:'Mã lớp'},{id:'name',label:'Tên lớp'},{id:'startDate',label:'Ngày bắt đầu'},{id:'date',label:'Ngày kết thúc'},{id:'remaining',label:'Số ngày còn lại'},{id:'teacher',label:'Giáo viên'},{id:'students',label:'Sĩ số'}]
  };
  const kinds:Record<string,string>={FIRST:'Đăng ký lần đầu',ADDITIONAL:'Đăng ký thêm môn',RETURNING:'Đăng ký học lại'};
  const registrationPeriods:ReportDataset={
    id:'student_registration_periods',label:'Các đợt đăng ký học',dateKind:'event',
    note:'Mỗi dòng là một đợt đăng ký môn, kể cả đợt cũ trước khi học lại. Học lại giữ nguyên mã học sinh. Dữ liệu trước nâng cấp chưa phân loại được đánh dấu Chưa xác định.',
    records:profiles.flatMap(student=>[...(student.registrationHistory||[]),...studentRegistrations(student)].map(reg=>({
      id:student.id,name:student.name,date:reportCreationDate(reg.registeredAt),subject:subject(reg.subject),model:model(reg.model),grade:'grade' in reg?String(reg.grade):student.grade,
      status:reg.status,kind:kinds[reg.registrationKind||'']||'Chưa xác định',period:reg.periodNumber||1,endedAt:'endedAt' in reg&&reg.endedAt?String(reg.endedAt).slice(0,10):'',
    }))),metrics:[{id:'count',label:'Lượt đăng ký',mode:'count'}],defaultMetricIds:['count'],
    dimensions:[{id:'kind',label:'Loại đăng ký'},{id:'subject',label:'Môn học'}],filters:[{id:'kind',label:'Loại đăng ký'},{id:'subject',label:'Môn học'}],
    detailFields:[{id:'id',label:'Mã học sinh'},{id:'name',label:'Học sinh'},{id:'date',label:'Ngày đăng ký'},{id:'period',label:'Đợt'},{id:'kind',label:'Loại đăng ký'},{id:'subject',label:'Môn học'},{id:'status',label:'Trạng thái'}]
  };
  const detail = [...basics, endingClasses, registrationPeriods, ...operational, teacherInspection];
  attachReportCatalogs(detail, { classes, students, teachers, lookups });
  const multiEnrollment=studentMultiEnrollmentReport(students,classes,lookups.subjects || [],lookups.teachingCategories?.flatMap(category=>category.options) || []);
  detail.push(multiEnrollment);
  return { custom: [...basics, endingClasses, registrationPeriods, multiEnrollment, ...operational], detail };
}
