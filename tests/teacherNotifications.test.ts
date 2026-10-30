import assert from 'node:assert/strict';
import { teacherNotifications, notificationDateText } from '../src/lib/teacherNotifications';
import type { ClassItem, MonthPayrollData, TeacherProfile, UserAccount } from '../src/types';

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
assert.equal(notifications.find(item=>item.key.startsWith('evaluation:'))?.date,'2026-10-12T09:00:00Z');
assert.equal(notifications.find(item=>item.key.startsWith('dispute:'))?.date,undefined,'payroll month is not a notification timestamp');
assert.match(notificationDateText('2026-10-12T20:30:00Z'),/03:30.*13\/10\/2026|13\/10\/2026.*03:30/);
assert.equal(notificationDateText('2026-10-12'),'12/10/2026');
assert.equal(notificationDateText('invalid'),'');
assert.equal(notificationDateText(undefined),'');
assert.ok(notifications.some(item => item.key.startsWith('evaluation:report-a:')));
assert.ok(notifications.some(item => item.key.includes('dispute:2026-10:reviewed:DA_DUYET')));
assert.equal(teacherNotifications({ ...user, id: 'user-b' }, teachers, users, payrollStore).length, 0);

const classes = [
 {id:'class-a',code:'TOAN-01',name:'Toán lớp 3',teacherId:'teacher-a',status:'Đang học',schedule:'T2 (18:00 - 19:30)',created_at:'2026-10-18'},
 {id:'class-b',code:'TOAN-02',name:'Toán lớp 4',teacherId:'teacher-b',status:'Đang học'},
 {id:'class-c',code:'TOAN-03',name:'Toán lớp 5',teacherId:'teacher-a',status:'Dừng lớp'},
 {id:'class-d',code:'TOAN-04',name:'Toán lớp 2',teacherId:'teacher-a',status:'Đã kết thúc'}
] as ClassItem[];
const lessons = [
 {id:'cover-a',classId:'class-b',date:'2026-10-20',coverTeacherId:'teacher-a',startsAt:'2026-10-20T18:00:00+07:00',endsAt:'2026-10-20T19:30:00+07:00'},
 {id:'other',classId:'class-b',date:'2026-10-20',coverTeacherId:'teacher-b'},
 {id:'cancelled',classId:'class-b',date:'2026-10-21',coverTeacherId:'teacher-a',status:'NGHI_HOC'},
 {id:'stopped',classId:'class-c',date:'2026-10-22',coverTeacherId:'teacher-a'},
 {id:'missing-class',classId:'missing',date:'2026-10-23',coverTeacherId:'teacher-a'}
];
const all=teacherNotifications(user,teachers,users,payrollStore,classes,lessons);
assert.equal(all.length,6,'existing notices plus owned classes and one valid cover');
assert.ok(all.some(item=>item.title==='Bạn được phân công lớp học' && item.detail.includes('TOAN-01')));
assert.ok(all.some(item=>item.title==='Lớp học đã dừng' && item.detail.includes('TOAN-03')));
assert.ok(all.some(item=>item.title==='Lớp học đã kết thúc' && item.detail.includes('TOAN-04')));
const cover=all.find(item=>item.key.startsWith('cover:'))!;
assert.equal(cover.tab,'schedule');assert.ok(cover.detail.includes('20/10/2026'));assert.ok(cover.detail.includes('18:00–19:30'));
assert.ok(!all.some(item=>item.key.includes('cancelled')||item.key.includes('stopped')||item.key.includes('missing-class')));
assert.deepEqual(teacherNotifications(user,teachers,users,payrollStore,classes,lessons),all,'refresh retains stable read keys');
const stopped=teacherNotifications(user,teachers,users,{},classes.map(cls=>cls.id==='class-a'?{...cls,status:'Dừng lớp'}:cls),[]);
assert.ok(!stopped.some(item=>item.key==='class:class-a:teacher-a:assigned'));
assert.ok(stopped.some(item=>item.key==='class:class-a:teacher-a:Tạm dừng'),'stop produces a new unread key');
const rescheduled=teacherNotifications(user,teachers,users,{},classes,[{...lessons[0],date:'2026-10-27'}]);
assert.notEqual(rescheduled.find(item=>item.key.startsWith('cover:'))?.key,cover.key);
assert.equal(teacherNotifications({...user,id:'user-b'},teachers,users,payrollStore,classes,lessons).length,0);
console.log('PASS: teacher-scoped class assignment, stop/end and cover notices, stable read keys, changed schedule and existing notices');
