import assert from 'node:assert/strict';
import type { ClassItem } from '../src/types';
import { teachingSessionDetails, teachingSessionsInWeek, scheduledMaterialForDate, teachingScheduleEntries } from '../src/lib/teachingSessionDetails';

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
assert.equal(scheduledMaterialForDate(cls,'2026-10-13','18:00-19:30'),cls.materials[0]);
assert.equal(scheduledMaterialForDate(cls,'2026-10-15','18:00-19:30'),undefined,'material for first session does not publish the second session');
assert.equal(scheduledMaterialForDate(cls,'2026-10-20','18:00-19:30'),undefined,'previous week material does not publish a later week');
assert.equal(scheduledMaterialForDate(cls,'2026-10-13','19:30-21:00'),undefined,'different time is not eligible');
assert.equal(scheduledMaterialForDate({...cls,materials:[]},'2026-10-13','18:00-19:30'),undefined);
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
const linked=teachingSessionDetails(cls,1,'2026-10-13','18:00 - 19:30',[{...lessons[0],id:'LINKED',materials:{title:'Linked plan title',materialGv:'https://example.com/actual',exerciseLms:'https://example.com/linked-lms'}}],slots,new Date('2026-10-13T18:00:00+07:00'),'LINKED');
assert.equal(linked.title,'Linked plan title');assert.equal(linked.slide,'https://example.com/actual');assert.equal(linked.exercise,'https://example.com/linked-lms');
const drive = 'https://drive.google.com/file/d/assigned-slide/view?usp=sharing';
const driveLms = 'https://drive.google.com/drive/folders/assigned-exercises?usp=sharing';
const updatedClass = {...cls, materials:[{...cls.materials[0], title:'Bài vừa phân phối', slide:drive, lms:driveLms}]};
const staleLesson = {...lessons[0], id:'STALE', title:'Bài cũ', materials:{materialGv:'https://example.com/old-slide',exerciseLms:'https://example.com/old-lms'}};
const beforeClass = new Date('2026-10-13T17:00:00+07:00');
const resolve = (row=staleLesson, selectedId?:string) => teachingSessionDetails(updatedClass,1,'2026-10-13','18:00 - 19:30',[row],slots,beforeClass,selectedId);
assert.equal(resolve().slide,drive,'unstarted teacher session shows the exact newly assigned Drive link');
assert.equal(resolve().exercise,driveLms);
assert.equal(resolve().title,'Bài vừa phân phối');
assert.equal(resolve(staleLesson,'STALE').slide,staleLesson.materials.materialGv,'exact lesson views retain explicit lesson materials');
assert.equal(resolve({...staleLesson,checkinAt:'2026-10-13T18:00:00+07:00'} as typeof staleLesson).slide,staleLesson.materials.materialGv,'started lessons retain historical materials');
const cleared = {...updatedClass,materials:[{...updatedClass.materials[0],slide:'',lms:''}]};
const clearedDetail = teachingSessionDetails(cleared,1,'2026-10-13','18:00 - 19:30',[staleLesson],slots,beforeClass);
assert.equal(clearedDetail.slide,'','cleared links do not fall back to stale URLs');assert.equal(clearedDetail.exercise,'');
// Each week owns two independent assignments, mapped by the class weekday/time.
const twoWeeks = {...cls, schedule:'T5 (18:00 - 19:30), T3 (18:00 - 19:30)', materials:[
  {...cls.materials[0],slide:'https://drive.google.com/file/d/week-1-session-1/view'},
  {...cls.materials[0],session:2,slide:'https://drive.google.com/file/d/week-1-session-2/view'},
  {...cls.materials[0],week:'Tuần 3: Từ ngày 19/10/2026 đến ngày 25/10/2026',slide:'https://drive.google.com/file/d/week-2-session-1/view'},
  {...cls.materials[0],week:'Tuần 3: Từ ngày 19/10/2026 đến ngày 25/10/2026',session:2,slide:'https://drive.google.com/file/d/week-2-session-2/view'}
]};
for (const [date,session,index] of [['2026-10-13',1,0],['2026-10-15',2,1],['2026-10-20',1,2],['2026-10-22',2,3]] as const) {
  const detail=teachingSessionDetails(twoWeeks,session,date,'18:00 - 19:30',[],slots,beforeClass);
  assert.equal(detail.slide,twoWeeks.materials[index].slide,`${date}: correct week and session`);
}
assert.equal(teachingSessionDetails(twoWeeks,1,'2026-10-15','18:00 - 19:30',[],slots,beforeClass).slide,twoWeeks.materials[1].slide,'actual weekday/time resolves session 2 even if a caller supplies a stale index');
assert.equal(teachingSessionDetails(twoWeeks,1,'2026-10-27','18:00 - 19:30',[],slots,beforeClass).slide,'','never reuse another week');
assert.equal(teachingSessionDetails(twoWeeks,1,'2026-10-15','20:00 - 21:30',[],slots,beforeClass).slide,'','never reuse another time slot');
assert.deepEqual(teachingScheduleEntries({...cls,schedule:'T3 (16:00 - 17:00), T3 (9:00 - 10:00)'}).map(row=>row.time),['9:00 - 10:00','16:00 - 17:00']);
assert.deepEqual(teachingSessionsInWeek(cls, '2026-10-13').map(item => item.date), ['2026-10-13', '2026-10-15']);
assert.equal(teachingSessionsInWeek(cls, '2026-10-06').length, 0);
assert.equal(teachingSessionDetails(cls, 1, '2026-10-20', '18:00 - 19:30', [], slots, new Date('2026-10-20T18:00:00+07:00')).slide, '', 'No stale weekly materials');
console.log('PASS: shared teaching details, weekly materials, assigned room/recording links and time boundaries.');
