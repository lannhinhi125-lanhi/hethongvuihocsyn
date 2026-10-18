import assert from 'node:assert/strict';
import type { ClassItem, StudentRecord, TeacherProfile } from '../src/types';
import { allReportDatasets } from '../src/lib/allReportDatasets';
import { buildCustomReport, defaultReportConfig, normalizeReportConfig, reportFilterLabel, type ReportFilters } from '../src/lib/customReports';

const lookups = {
  teachingCategories: [
    { id: 'primary', name: 'Tiểu học', options: [{ id: 'g1', label: 'Lớp 1' }, { id: 'g2', label: 'Lớp 2' }, { id: 'unused', label: 'Lớp chưa có dữ liệu' }] },
    { id: 'secondary', name: 'THCS', options: [{ id: 'g6', label: 'Lớp 6' }] },
    { id: 'other', name: 'Cấp học chưa có dữ liệu', options: [] }
  ],
  subjects: [{ code: 'M', name: 'Toán' }, { code: 'E', name: 'Anh' }, { code: 'M2', name: 'Toán' }],
  models: [{ code: 'solo', name: 'Cá nhân' }, { code: 'group', name: 'Nhóm' }],
  levels: [{ code: 'basic', name: 'Cơ bản' }, { code: 'advanced', name: 'Nâng cao' }],
  timeSlots: [{ id: 'early', timeRange: '18:00 - 19:00' }, { id: 'late', timeRange: '20:00 - 21:00' }],
  incidentCategories: [{ id: 'tech', name: 'Kỹ thuật', subIncidents: [{ code: 'net', name: 'Mất mạng' }, { code: 'unused', name: 'Chưa xảy ra' }] },
    { id: 'other', name: 'Khác', subIncidents: [{ code: 'net', name: 'Mất mạng' }] }]
};
const classes = [
  { id: 'c1', code: 'C1', name: 'Lớp A', categoryId: 'primary', grade: 'g1', subject: 'M', model: 'solo', level: 'basic', studentIds: [], maxStudents: 5, created_at: '2026-10-01' },
  { id: 'c2', code: 'C2', name: 'Lớp B', categoryId: 'secondary', grade: 'g6', subject: 'E', model: 'group', level: 'advanced', studentIds: [], maxStudents: 5, created_at: '2026-10-01' },
  { id: 'c3', code: 'C3', name: 'Lớp C', categoryId: 'primary', grade: 'g2', subject: 'M2', model: 'solo', level: 'basic', studentIds: [], maxStudents: 5, created_at: '2026-10-01' }
] as unknown as ClassItem[];
const students = [{ id: 's1', name: 'A', grade: 'g1', subject: 'M', model: 'solo', level: 'basic', status: 'active', scheduleSlots: [], created_at: '2026-10-01', registrations: [
  { subject: 'M', model: 'solo', level: 'basic', status: 'active', scheduleSlots: [] },
  { subject: 'E', model: 'group', level: 'advanced', status: 'active', scheduleSlots: [] }
] }] as unknown as StudentRecord[];
const teachers = [{ id: 't1', name: 'GV', subject: 'M', levelId: 'primary', grades: ['g1', 'g2'], status: 'active', created_at: '2026-10-01' }] as unknown as TeacherProfile[];
const datasets = allReportDatasets({ classes, students, teachers, lookups, evaluations: [],
  lessons: [{ id: 'l1', classId: 'c1', date: '2026-10-01', timeSlotId: 'early' }, { id: 'l2', classId: 'c1', date: '2026-10-02', timeSlotId: 'early' }, { id: 'l3', classId: 'c2', date: '2026-10-01', timeSlotId: 'late' }],
  incidents: [{ lessonId: 'l1', categoryId: 'tech', incidentCode: 'net', incidentName: 'Mất mạng' }, { lessonId: 'l1', categoryId: 'other', incidentCode: 'net', incidentName: 'Mất mạng' }]
}).detail;
const run = (id: string, filters: ReportFilters = {}, groupBy = 'all') => {
  const dataset = datasets.find(item => item.id === id)!;
  return buildCustomReport(dataset, { ...defaultReportConfig(dataset), datePreset: 'all', metricIds: dataset.metrics.map(metric => metric.id), filters, groupBy });
};
const classData = datasets.find(item => item.id === 'classes')!;
assert.equal(classData.filters.find(item => item.id === 'category')!.choices!.length, 3);
assert.ok(classData.filters.find(item => item.id === 'grade')!.choices!.some(item => item.value === 'unused'));
assert.equal(run('classes', { category: ['primary', 'secondary'], grade: ['g1', 'g6'] }).totals.count, 2);
assert.equal(run('classes', { category: ['primary'], grade: ['g6'] }).totals.count, 0);
assert.equal(run('classes', { subject: ['M'] }).totals.count, 1); // Equal names must not merge catalog identities.
assert.deepEqual(run('classes', {}, 'subject').rows.map(row => row.key).sort(), ['E', 'M', 'M2']);
assert.equal(run('classes', { grade: ['unused'] }).totals.count, 0);
assert.equal(run('classes', { grade: [] }).totals.count, 3);
assert.equal(run('classes', { grade: ['deleted'] }).totals.count, 0);
assert.equal(run('classes', {}, 'grade').rows.find(row => row.key === 'g1')!.label, 'Lớp 1');
assert.equal(run('students', { subject: ['M'], model: ['group'] }).totals.count, 0);
assert.equal(run('students', { subject: ['M', 'E'], model: ['group'], program: ['advanced'] }).totals.count, 1);
assert.equal(run('student_registrations', { subject: ['E'], program: ['advanced'] }).totals.count, 1);
assert.equal(run('student_registrations', { subject: ['E'], program: ['basic'] }).totals.count, 0);
assert.equal(run('teachers', { category: ['primary'], grade: ['g1', 'g2'] }).totals.count, 1);
assert.equal(run('teachers', { category: ['secondary'] }).totals.count, 0);
assert.deepEqual(run('teachers', { grade: ['g1'] }, 'grade').rows.map(row => row.key), ['g1']);
assert.equal(run('incidents', { category: ['primary'], timeSlot: ['early'] }).totals.total, 2);
const tech = JSON.stringify(['tech', 'net']), other = JSON.stringify(['other', 'net']);
const causes = run('incidents', { category: ['primary'], cause: [tech, other] }, 'cause');
assert.equal(causes.totals.incidents, 1);
assert.equal(causes.totals.total, 2);
assert.equal(causes.totals.rate, 50);
assert.equal(causes.rows.length, 2);
assert.ok(datasets.find(item => item.id === 'incidents')!.filters.find(item => item.id === 'cause')!.choices!.some(item => item.value === JSON.stringify(['tech', 'unused'])));
assert.equal(run('incidents', { cause: [JSON.stringify(['tech', 'unused'])] }).totals.incidents, 0);
const config = normalizeReportConfig({ ...defaultReportConfig(classData), filters: { grade: ['g1', 'g6', 'g1'], category: [] } }, datasets);
assert.deepEqual(config.filters, { grade: ['g1', 'g6'] });
assert.equal(reportFilterLabel(classData.filters.find(item => item.id === 'grade'), config.filters.grade), 'Lớp 1, Lớp 6');
console.log('PASS: full catalogs, stable IDs, multi-select OR/AND, empty/stale filters, same-registration joins and incident denominators');
