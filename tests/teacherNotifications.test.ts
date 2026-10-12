import assert from 'node:assert/strict';
import { teacherNotifications } from '../src/lib/teacherNotifications';
import type { MonthPayrollData, TeacherProfile, UserAccount } from '../src/types';

const user = { id: 'user-a', role: 'Giáo viên Giảng dạy', status: 'active' } as UserAccount;
const users = [user];
const teachers = [{
  id: 'teacher-a', user_id: user.id,
  evaluationReports: [
    { id: 'report-a', recipientUserId: user.id, status: 'DA_DUYET', classCode: 'LOP-1', overallScore: 8.5, rank: 'Tốt', sentAt: '2026-10-12T09:00:00Z' },
    { id: 'report-other', recipientUserId: 'user-b', status: 'DA_DUYET', classCode: 'LOP-2', overallScore: 9, rank: 'Xuất sắc' }
  ]
}] as TeacherProfile[];
const payrollStore = {
  '2026-10': {
    disputes: [
      { id: 'pending', teacherId: 'teacher-a', status: 'CHO_DUYET' },
      { id: 'reviewed', teacherId: 'teacher-a', status: 'DA_DUYET', sessionId: 'CA-1' },
      { id: 'other', teacherId: 'teacher-b', status: 'TU_CHOI', sessionId: 'CA-2' }
    ]
  }
} as unknown as Record<string, MonthPayrollData>;

const notifications = teacherNotifications(user, teachers, users, payrollStore);
assert.equal(notifications.length, 2);
assert.ok(notifications.some(item => item.key.startsWith('evaluation:report-a:')));
assert.ok(notifications.some(item => item.key.includes('dispute:2026-10:reviewed:DA_DUYET')));
assert.equal(teacherNotifications({ ...user, id: 'user-b' }, teachers, users, payrollStore).length, 0);
