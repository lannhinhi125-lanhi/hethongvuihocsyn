import assert from 'node:assert/strict';
import type { SessionPayrollRecord, TeacherPayrollSummary } from '../src/types';
import { workCreditBreakdown, workHandoffDocument, workHandoffExcel, workHandoffRows, workHandoffTotals, type WorkHandoffInfo } from '../src/lib/workReconciliationExport';
import { workTeachingGroups, type WorkTeachingContext } from '../src/lib/workTeachingGroups';
import { reportExcelBytes } from '../src/lib/reportExcel';
const session = (id: string, type: SessionPayrollRecord['type'], creditCoeff: number): SessionPayrollRecord => ({
  id, lessonId: 'lesson-' + id, week: 'W1', date: '2026-10-01', dateStr: '01/10/2026', dayOfWeek: 'T5', time: '18:00 - 19:00',
  classCode: 'ENG-prefix-is-not-subject', className: 'Lớp không được xuất', studentName: 'Học sinh', type, statusText: 'Đã ghi nhận', checkin: '', checkout: '', hasAiReview: false,
  creditCoeff, hrPayNote: '=private session note', dispute: null, reconcileStatus: 'CHO_DOI_SOAT'
});
const staff = [{ teacherId: '00001', teacherName: 'Nhân sự <A>', staffRole: 'GIAO_VIEN', subject: 'TOAN', subjectName: 'Toán', payrollSent: true, reconcileStatus: 'DA_CHOT',
  sessions: [session('a', 'STANDARD', 1), session('b', 'COVER', 0.5), session('c', 'LATE', 0.25), session('d', 'STUDENT_CANCELED', 0), session('e', 'APPROVED_EXPLANATION', 0.75)]
}, { teacherId: '00002', teacherName: 'Nhân sự B', staffRole: 'GIA_SU', subject: 'ANH', subjectName: 'Tiếng Anh', reconcileStatus: 'CHO_GUI', sessions: [session('f', 'STANDARD', 0.1), session('g', 'STANDARD', 0.2)] }] as TeacherPayrollSummary[];
const info: WorkHandoffInfo = { month: '2026-10', isLocked: false, scope: 'Nhân sự đã lọc', author: 'Người lập thật', organization: 'VUIHOC TUTOR', address: 'Địa chỉ <test>', reportNumber: '01/BC', receiver: 'Bộ phận tính lương', operationsSigner: '', receivingSigner: '', createdAt: '18/10/2026 10:00' };
const context: WorkTeachingContext = {
  classes: [
    { id: 'c1', code: 'ENG-prefix-is-not-subject', subject: 'TOAN', model: 'solo', level: 'basic', grade: 'g1' },
    { id: 'c2', code: 'C2', subject: 'TOAN', model: 'group', level: 'advanced', grade: 'g6', categoryId: 'secondary' },
    { id: 'c3', code: 'C3', subject: 'ANH', model: 'solo', level: 'basic', grade: 'g6', categoryId: 'secondary' }
  ], lessons: [{ id: 'lesson-a', classId: 'c1' }, { id: 'lesson-b', classId: 'c2' }, { id: 'lesson-c', classId: 'c1' }, { id: 'lesson-d', classId: 'c2' },
    { id: 'lesson-e', classId: 'deleted-class' }, { id: 'lesson-f', classId: 'c3' }, { id: 'lesson-g', classId: 'c3' }],
  subjects: [{ code: 'TOAN', name: 'Toán' }, { code: 'ANH', name: 'Tiếng Anh' }], models: [{ code: 'solo', name: 'Một kèm một' }, { code: 'group', name: 'Nhóm' }],
  levels: [{ code: 'basic', name: 'Cơ bản' }, { code: 'advanced', name: 'Nâng cao' }],
  teachingCategories: [{ id: 'primary', name: 'Tiểu học', options: [{ id: 'g1', label: 'Lớp 1' }] }, { id: 'secondary', name: 'THCS', options: [{ id: 'g6', label: 'Lớp 6' }] }]
};
assert.deepEqual(workCreditBreakdown(staff[0].sessions), { standardCredit: 1.5, incidentCredit: 1 });
assert.equal(workHandoffRows(staff)[0].standardSessions, 2);
assert.equal(workHandoffRows(staff)[0].incidentSessions, 3);
assert.equal(workHandoffRows(staff)[1].totalCredit, 0.3);
assert.deepEqual(workHandoffTotals(staff), { staff: 2, sessions: 7, standardSessions: 4, incidentSessions: 3, standardCredit: 1.8, incidentCredit: 1, totalCredit: 2.8 });
const grouped = workTeachingGroups(staff, context);
assert.equal(grouped.length, 4);
const primary = grouped.find(row => row.teacherId === '00001' && row.categoryName === 'Tiểu học')!;
assert.equal(primary.modelName, 'Một kèm một');
assert.equal(primary.programName, 'Cơ bản');
assert.equal(primary.totalCredit, 1.25);
assert.equal(primary.standardSessions, 1);
assert.equal(primary.incidentSessions, 1);
assert.equal(grouped.find(row => row.teacherId === '00001' && row.categoryName === 'THCS')!.totalCredit, 0.5);
const missing = grouped.find(row => row.teacherId === '00001' && row.categoryName === 'Chưa xác định')!;
assert.equal(missing.totalCredit, 0.75); // Missing linked class never falls back to another class with a matching code.
assert.equal(missing.modelName, 'Chưa xác định');
const snapshot = { ...staff[0], sessions: [{ ...session('b', 'COVER', 0.5), model: 'solo' }] };
assert.equal(workTeachingGroups([snapshot], context)[0].modelName, 'Một kèm một'); // Prefer saved work model.
const fallback = { ...staff[0], sessions: [{ ...session('unlinked', 'STANDARD', 1), lessonId: undefined }] };
assert.equal(workTeachingGroups([fallback], context)[0].categoryName, 'Tiểu học'); // Exact unique class code is a legacy fallback.
const ambiguous = { ...context, classes: [...context.classes!, { ...context.classes![0], id: 'other' }] };
assert.equal(workTeachingGroups([fallback], ambiguous)[0].categoryName, 'Chưa xác định');
const workbook = workHandoffExcel(staff, info, context);
assert.equal(workbook.sheets.length, 2);
assert.equal(workbook.filename, 'Doi-soat-cong-2026-10.xlsx');
assert.equal(workbook.sheets[0].name, 'Tổng hợp công dạy giáo viên');
assert.equal(workbook.sheets[1].name, 'Thông tin bàn giao');
assert.equal(workbook.sheets[0].rows.length, 5);
assert.ok(!workbook.sheets.some(sheet => sheet.name === 'Tổng hợp công'));
assert.ok(!JSON.stringify(workbook).includes('Chi tiết buổi dạy'));
assert.ok(!JSON.stringify(workbook).includes('Lớp không được xuất'));
assert.ok(!JSON.stringify(workbook).includes('private session note'));
assert.ok(!JSON.stringify(workbook).includes('Lớp 1'));
const groupHeaders = workbook.sheets[0].rows[0];
const metrics = { standardSessions: 'Buổi chuẩn', incidentSessions: 'Buổi sự cố', standardCredit: 'Công chuẩn', incidentCredit: 'Công sự cố', totalCredit: 'Tổng công' } as const;
for (const person of workHandoffRows(staff)) {
  const groups = workbook.sheets[0].rows.slice(1).filter(row => row[1] === person.teacherId);
  for (const [key, label] of Object.entries(metrics)) {
    assert.equal(person[key as keyof typeof metrics], Number(groups.reduce((sum, row) => sum + Number(row[groupHeaders.indexOf(label)]), 0).toFixed(6)));
  }
}
const html = workHandoffDocument([staff[0]], info);
assert.ok(html.includes('data:image/png;base64,'));
assert.ok(html.includes('size:A4 portrait'));
assert.ok(html.includes('counter(page)'));
assert.ok(html.includes('1 người'));
assert.ok(html.includes('5 buổi'));
assert.ok(!html.includes('Nhân sự B'));
assert.ok(!html.includes('Nhân sự &lt;A&gt;'));
assert.ok(!html.includes('Nhân sự <A>'));
assert.ok(!html.includes('Trần Quản Trị'));
assert.ok(html.includes('Người lập thật'));
assert.ok(html.includes('Chưa khóa kỳ'));
assert.ok(html.includes('thead{display:table-header-group}'));
assert.ok(html.includes('tfoot{display:table-row-group'));
assert.ok(!html.includes('staff-appendix'));
assert.ok(!html.includes('Phụ lục'));
assert.ok(html.includes('class="signatures"'));
assert.ok(html.includes(workbook.filename));
assert.ok(html.includes('Tổng hợp công dạy giáo viên'));
assert.ok(html.includes('Công chuẩn'));
assert.ok(html.includes('Công sự cố'));
assert.ok(html.includes('file Excel kèm theo'));
const many = Array.from({ length: 27 }, (_, index) => ({ ...staff[0], teacherId: 'NS-' + index, teacherName: 'Nhân sự dòng ' + index }));
const hundreds = Array.from({ length: 500 }, (_, index) => ({ ...staff[0], teacherId: 'NS-' + index, teacherName: 'Nhân sự dòng ' + index }));
const largeDocument = workHandoffDocument(hundreds, info);
assert.ok(!largeDocument.includes('Nhân sự dòng'));
assert.ok(largeDocument.includes('500 người'));
assert.ok(largeDocument.length < html.length + 1000);
assert.equal(workHandoffExcel(many, { ...info, isLocked: true }, context).sheets[0].rows.length, workTeachingGroups(many, context).length + 1);
assert.throws(() => workHandoffExcel([{ ...staff[0], sessions: [session('bad', 'STANDARD', NaN)] }], info), /hệ số công không hợp lệ/);
const archiveText = new TextDecoder().decode(reportExcelBytes(workbook));
assert.ok(archiveText.includes('t="inlineStr"><is><t xml:space="preserve">00001'));
assert.ok(!archiveText.includes('<f>'));
assert.ok(archiveText.includes('width="20"'));
console.log('PASS: staff and teaching-group Excel totals reconcile, exact model/program/category joins, no session/grade details, missing/ambiguous links and A4 handoff');
