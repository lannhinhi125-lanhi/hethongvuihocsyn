import assert from 'node:assert/strict';
import { payrollLockIssue, schedulesOverlap, resolveActiveAccount } from '../src/lib/workflow';
import { resolveAccountTeacher } from '../src/lib/evaluation';
import type { MonthPayrollData, TeacherProfile, UserAccount } from '../src/types';

assert.equal(schedulesOverlap('T3 (18:00 - 19:30)', 'T3 (19:00 - 20:00)'), true);
assert.equal(schedulesOverlap('T3 (18:00 - 19:30)', 'T3 (19:30 - 21:00)'), false);
assert.equal(schedulesOverlap('T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)'), false);
assert.equal(schedulesOverlap('CN (8:00 - 9:30)', 'Chủ nhật (09:00 - 10:00)'), true);
const period: MonthPayrollData = {
  isLocked: false, adminSentNotice: false, disputes: [],
  teachers: [{
    teacherId: 'GV-1', teacherName: 'Teacher', subject: 'TOAN', subjectName: 'Toán',
    standardSessions: 1, coverSessions: 0, studentCanceledSessions: 0, lateSessions: 0,
    emergencySessions: 0, approvedExplanations: 0, reconcileStatus: 'DA_GUI', payrollSent: true,
    sessions: [{
      id: 'S1', week: 'W1', date: '2026-10-06', dateStr: '06/10/2026', dayOfWeek: 'T3',
      time: '18:00 - 19:30', classCode: 'C1', className: 'Class', studentName: 'Student',
      type: 'STANDARD', statusText: 'Dạy chuẩn', checkin: '17:55', checkout: '19:30',
      hasAiReview: false, creditCoeff: 1, hrPayNote: '', dispute: null
    }]
  }]
};
assert.equal(payrollLockIssue(period), undefined);
assert.ok(payrollLockIssue(undefined));
assert.ok(payrollLockIssue({ ...period, teachers: [] }));
assert.ok(payrollLockIssue({ ...period, isLocked: true }));
assert.ok(payrollLockIssue({ ...period, disputes: [{ status: 'CHO_DUYET' }] } as MonthPayrollData));
assert.ok(payrollLockIssue({ ...period, teachers: [{ ...period.teachers[0], payrollSent: false }] }));
const user = { id: 'USR-1', role: 'Giáo viên Giảng dạy', status: 'active', email: 'a@example.com', username: 'teacher' } as UserAccount;
const teacher = { id: 'GV-1', email: user.email } as TeacherProfile;
assert.equal(resolveActiveAccount([user], user.id), user);
assert.equal(resolveActiveAccount([user], null), undefined);
assert.equal(resolveActiveAccount([user], 'missing'), undefined);
assert.equal(resolveActiveAccount([{ ...user, status: 'locked' }], user.id), undefined);
assert.equal(resolveActiveAccount([user, { ...user }], user.id), undefined);
assert.equal(resolveAccountTeacher(user, [teacher], [user]), teacher);
assert.equal(resolveAccountTeacher(user, [{ ...teacher, email: 'other@example.com' }], [user]), undefined);
assert.equal(resolveAccountTeacher(user, [teacher, { ...teacher, id: 'GV-2' }], [user]), undefined);
assert.equal(resolveAccountTeacher({ ...user, status: 'locked' }, [teacher], [user]), undefined);
console.log('Passed: overlapping schedules, payroll lock prerequisites and unambiguous teacher identity.');
