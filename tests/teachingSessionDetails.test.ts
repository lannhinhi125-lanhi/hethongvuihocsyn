import assert from 'node:assert/strict';
import type { ClassItem } from '../src/types';
import { teachingSessionDetails, teachingSessionsInWeek } from '../src/lib/teachingSessionDetails';

const cls = {
  id: 'C1', code: 'MATH', schedule: 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)',
  roomLink: 'https://zoom.us/j/class-room', startDate: '2026-10-13',
  materials: [{ month: '10/2026', week: 'Tuần 2: Từ ngày 12/10/2026 đến ngày 18/10/2026', session: 1,
    title: 'Bài tuần này', slide: 'https://example.com/current-slide', lms: 'https://example.com/exercise' }],
  activeSessions: { 1: { sessionNum: 1, dateStr: '2026-10-06 18:00 - 19:30', title: 'Bài tuần trước',
    materialGv: 'https://example.com/old-slide', materialHs: '', exerciseLms: '', status: 'Đã hoàn thành', feedback: { S1: 'Old feedback' } } }
} as unknown as ClassItem;
const lessons = [{ classId: 'C1', date: '2026-10-13', timeSlotId: 'T1', roomUrl: 'https://zoom.us/j/ops-room',
  recordingUrl: 'https://zoom.us/rec/share/ops-recording', diary: 'Nhật ký ca này' }];
const slots = [{ id: 'T1', timeRange: '18:00 - 19:30' }];
const detailAt = (time: string) => teachingSessionDetails(cls, 1, '2026-10-13', '18:00 - 19:30', lessons, slots, new Date(`2026-10-13T${time}:00+07:00`));
for (const time of ['17:59', '18:00', '19:29']) {
  const detail = detailAt(time);
  assert.equal(detail.actionLabel, 'Vào học');
  assert.equal(detail.actionUrl, lessons[0].roomUrl);
}
assert.equal(detailAt('19:30').actionLabel, 'Xem lại bản ghi');
assert.equal(detailAt('19:30').actionUrl, lessons[0].recordingUrl);
assert.equal(detailAt('18:00').slide, cls.materials[0].slide);
assert.equal(detailAt('18:00').exercise, cls.materials[0].lms);
assert.equal(detailAt('18:00').active, undefined, 'Do not display attendance/reviews from the previous week');
assert.equal(detailAt('18:00').lesson?.diary, lessons[0].diary);
const fallback = teachingSessionDetails(cls, 1, '2026-10-13', '18:00 - 19:30', [], slots, new Date('2026-10-13T19:30:00+07:00'));
assert.equal(fallback.actionUrl, '', 'A room URL must not be presented as a recording URL');
const exactLessons=[{...lessons[0],id:'OTHER',title:'Wrong lesson'}, {...lessons[0],id:'EXACT',title:'Selected lesson',inspectionData:{sessionNum:1,studentIds:['S1'],attendance:{S1:'present'},feedback:{S1:'Hidden in inspection'}}}];
assert.equal(teachingSessionDetails(cls,1,'2026-10-13','18:00 - 19:30',exactLessons,slots,new Date('2026-10-13T19:30:00+07:00'),'EXACT').title,'Selected lesson');
assert.deepEqual(teachingSessionsInWeek(cls, '2026-10-13').map(item => item.date), ['2026-10-13', '2026-10-15']);
assert.equal(teachingSessionsInWeek(cls, '2026-10-06').length, 0);
assert.equal(teachingSessionDetails(cls, 1, '2026-10-20', '18:00 - 19:30', [], slots, new Date('2026-10-20T18:00:00+07:00')).slide, '', 'No stale weekly materials');
console.log('PASS: shared teaching details, weekly materials, assigned room/recording links and time boundaries.');
