import assert from 'node:assert/strict';
import type { ClassItem, StudentRecord, TeacherProfile } from '../src/types';
import type { ReportIncident, ReportLesson } from '../src/lib/incidentReportPeriods';
import { operationalReportDatasets } from '../src/lib/operationalReportDatasets';
import { allReportDatasets } from '../src/lib/allReportDatasets';
import { buildCustomReport, defaultReportConfig, type ReportDataset } from '../src/lib/customReports';
import { alignComparisonRows } from '../src/lib/reportComparison';

const lookups = { subjects: [{ code: 'M', name: 'Toán' }, { code: 'E', name: 'Anh' }], models: [{ code: '1-1', name: 'Một kèm một' }, { code: '1-5', name: 'Nhóm năm' }],
  timeSlots: [{ id: 'early', timeRange: '18:00 - 19:00' }, { id: 'late', timeRange: '20:00 - 21:00' }] };
const classes = [
  { id: 'C1', code: 'L01', name: 'Lớp một', subject: 'M', model: '1-1', grade: 'Khối 1', studentIds: ['S1'], maxStudents: 1, created_at: '2026-10-01' },
  { id: 'C2', code: 'L02', name: 'Lớp nhóm', subject: 'E', model: '1-5', grade: 'Khối 6', studentIds: [], maxStudents: 5, created_at: '2026-09-01' }
] as ClassItem[];
const teachers = [
  { id: 'T1', name: 'Giáo viên A', subject: 'M', grades: ['Khối 1', 'Khối 2'], created_at: '2026-10-01', status: 'DANG_DAY' },
  { id: 'T2', name: 'Giáo viên B', subject: 'E', grades: ['Khối 6'], created_at: '2026-09-01', status: 'DANG_DAY' }
] as TeacherProfile[];
const lessons: ReportLesson[] = [
  { id: 'A', displayCode: 'BH-01', date: '2026-10-01', classId: 'C1', timeSlotId: 'early', primaryTeacherId: 'T1', status: 'DA_HOC' },
  { id: 'B', displayCode: 'BH-02', date: '2026-10-02', classId: 'C1', timeSlotId: 'early', primaryTeacherId: 'T1', status: 'DA_HOC' },
  { id: 'C', date: '2026-10-03', classId: 'C2', timeSlotId: 'late', primaryTeacherId: 'T1', coverTeacherId: 'T2', status: 'DA_HOC' },
  { id: 'D', date: '2026-09-01', classId: 'C1', timeSlotId: 'early', status: 'DA_HOC' },
  { id: 'orphan', date: '2026-10-04', classId: 'missing', startsAt: '2026-10-04T11:00:00Z', endsAt: '2026-10-04T12:00:00Z' }
];
const incidents: ReportIncident[] = [
  { lessonId: 'A', incidentName: 'Mất mạng', urgency: 'EMERGENCY', status: 'DA_XU_LY', reportedAt: '2026-09-30' },
  { lessonId: 'A', incidentName: 'Mất mạng', urgency: 'EMERGENCY', status: 'DA_XU_LY' },
  { lessonId: 'A', incidentName: 'Vào trễ', urgency: 'ADVANCED', status: 'DANG_XU_LY' },
  { lessonId: 'C', incidentName: 'Vào trễ', urgency: 'ADVANCED', status: 'DANG_XU_LY' },
  { lessonId: 'unknown-lesson', incidentName: 'Mất mạng' }
];
const evaluate = (dataset: ReportDataset, filters: Record<string, string> = {}, groupBy = 'subject', from = '2026-10-01', to = '2026-10-31') =>
  buildCustomReport(dataset, { ...defaultReportConfig(dataset), metricIds: dataset.metrics.map(metric => metric.id), datePreset: 'custom', from, to, filters, groupBy });
const [incidentData, inspectionData, lessonData] = operationalReportDatasets(lessons, incidents, [
  { id: 'E1', teacherId: 'T1', lessonId: 'A', evaluationDate: '2026-10-01', overallScore: 8, status: 'DA_DUYET' },
  { id: 'E2', teacherId: 'T1', evaluationDate: '2026-10-02', overallScore: 6, status: 'DA_DUYET' },
  { id: 'draft', teacherId: 'T1', lessonId: 'C', evaluationDate: '2026-10-03', overallScore: 10, status: 'NHAP' }
], teachers, classes, lookups);
const math = evaluate(incidentData, { subject: 'Toán' });
assert.equal(math.totals.total, 2);
assert.equal(math.totals.incidents, 1); // Duplicate events and two types on A count as one affected lesson.
assert.equal(math.totals.rate, 50);
assert.equal(evaluate(incidentData, { model: 'Nhóm năm', timeSlot: '20:00 - 21:00' }).totals.rate, 100);
assert.equal(evaluate(incidentData, { teacher: 'Giáo viên B' }).totals.total, 1); // Actual cover teacher.
const cause = evaluate(incidentData, { subject: 'Toán', cause: 'Mất mạng' }, 'cause');
assert.equal(cause.totals.total, 2); // Type filter preserves unaffected lessons in denominator.
assert.equal(cause.totals.rate, 50);
assert.equal(cause.rows.length, 1);
assert.equal(evaluate(incidentData, { subject: 'Toán', urgency: 'Không khẩn cấp' }).totals.rate, 50);
assert.equal(evaluate(incidentData, { subject: 'Toán', incidentStatus: 'does-not-exist' }).totals.rate, 0);
const september = evaluate(incidentData, { subject: 'Toán', cause: 'Mất mạng' }, 'cause', '2026-09-01', '2026-09-30');
assert.equal(september.totals.total, 1);
assert.equal(september.rows[0].values.rate, 0); // No matching event in previous period means zero, with a real denominator.
const compared = alignComparisonRows(cause.rows, september.rows, cause.metrics, { start: '2026-10-01', end: '2026-10-31' }, { start: '2026-09-01', end: '2026-09-30' }, 'cause');
assert.equal(compared[0].previous.rate, 0);
assert.equal(compared[0].previous.total, 1);
const causes = evaluate(incidentData, { subject: 'Toán' }, 'cause');
assert.equal(causes.totals.incidents, 1);
assert.equal(causes.rows.reduce((sum, row) => sum + row.values.incidents!, 0), 2); // Overlapping types must never be summed into the global total.
assert.ok(incidentData.nonAdditiveGroups?.includes('cause'));
const orphan = incidentData.records.find(row => row.id === 'orphan')!;
assert.equal(orphan.subject, 'Chưa xác định');
assert.equal(orphan.model, 'Chưa xác định');
assert.equal(orphan.timeSlot, '18:00 – 19:00'); // UTC timestamps converted to Bangkok time.
assert.equal(evaluate(inspectionData, { model: 'Một kèm một' }).totals.sessions, 1);
assert.equal(evaluate(inspectionData, { model: 'Chưa xác định' }).totals.sessions, 1);
assert.equal(evaluate(inspectionData).totals.score, 7);
assert.equal(evaluate(lessonData, { teacher: 'Giáo viên B' }).totals.cover, 1);
assert.equal(evaluate(lessonData).totals.count, 2); // Orphan/unassigned lessons do not create a fictional teacher.

const students = [{ id: 'S1', name: 'Học sinh A', grade: 'Khối 1', subject: 'M', model: '1-1', level: '', status: 'Đang học', scheduleSlots: [], created_at: '2026-10-01',
  registrations: [
    { subject: 'M', model: '1-1', status: 'Đang học', level: '', scheduleSlots: [], registeredAt: '2026-10-01' },
    { subject: 'E', model: '1-5', status: 'Chờ xếp lớp', level: '', scheduleSlots: [], registeredAt: '2026-10-02' }
  ], classHistory: [{ traceId: 'trace', subject: 'M', fromClassId: null, toClassId: 'C1', fromClassCode: null, toClassCode: 'L01', occurredAt: '2026-10-01', actorId: null, actorName: null, isInitial: true, isBaseline: false }] }] as StudentRecord[];
const all = allReportDatasets({ classes, students, teachers, lessons, incidents, evaluations: [
  { id: 'S1', teacherId: 'T1', evaluationDate: '2026-10-01', overallScore: 10, status: 'DA_DUYET' },
  { id: 'S2', teacherId: 'T1', evaluationDate: '2026-10-02', overallScore: 6, status: 'DA_DUYET' },
  { id: 'S3', teacherId: 'T2', evaluationDate: '2026-10-03', overallScore: 6, status: 'DA_DUYET' },
  { id: 'S4', teacherId: 'T1', evaluationDate: '2026-09-03', overallScore: 4, status: 'DA_DUYET' }
], lookups });
const profiles = all.custom.find(dataset => dataset.id === 'students')!;
const profilesResult = evaluate(profiles);
assert.equal(profilesResult.totals.count, 1);
assert.equal(profilesResult.rows.length, 2);
assert.equal(evaluate(profiles, { subject: 'Toán', model: 'Nhóm năm' }).totals.count, 0); // Must match the same registration.
assert.equal(evaluate(profiles, { subject: 'Anh', model: 'Nhóm năm' }).totals.count, 1);
assert.equal(evaluate(all.custom.find(dataset => dataset.id === 'student_registrations')!).totals.count, 2);
const teacherSource = all.custom.find(dataset => dataset.id === 'teachers')!;
assert.equal(evaluate(teacherSource, { grade: 'Khối 2' }).totals.count, 1);
assert.equal(evaluate(teacherSource, {}, 'grade').totals.count, 1); // Multi-grade groups do not duplicate total profiles.
const classSource = all.custom.find(dataset => dataset.id === 'classes')!;
const classResult = evaluate(classSource);
assert.equal(classResult.totals.growth, 1);
assert.equal(classResult.records[0].newStudents, 1);
assert.equal(evaluate(classSource, {}, 'subject', '2026-09-01', '2026-09-30').totals.count, 1);
assert.equal(evaluate(classSource, {}, 'subject', '2026-10-31', '2026-10-01').invalidRange, true);
const inspectionTeachers = all.detail.find(dataset => dataset.id === 'inspection_teachers')!;
assert.equal(evaluate(inspectionTeachers, {}, 'rank').totals.score, 7); // Average per teacher: (8 + 6)/2, not 22/3 evaluations.
assert.equal(evaluate(inspectionTeachers, {}, 'rank').totals.sessions, 3);
assert.equal(evaluate(inspectionTeachers, {}, 'rank', '2026-09-01', '2026-09-30').totals.score, 4);
assert.equal(evaluate(inspectionTeachers, {}, 'rank', '2026-10-31', '2026-10-01').invalidRange, true);
assert.ok(all.detail.every(dataset => dataset.filters.length && dataset.dimensions.length && dataset.detailFields.length));
const rebuilt = allReportDatasets({ classes, students, teachers, lessons: [], incidents: [], evaluations: [], lookups });
assert.equal(rebuilt.custom.find(dataset => dataset.id === 'classes')!.metrics.filter(metric => metric.id === 'growth').length, 1); // No shared metadata mutation across builds.
assert.equal(rebuilt.custom.find(dataset => dataset.id === 'classes')!.filters.find(field => field.id === 'subject')!.options, undefined);
console.log('PASS: all report filters, incident denominators/types/comparison, linked inspection context, multi-subject profiles, teacher grades, growth history and period-specific teacher scores');
