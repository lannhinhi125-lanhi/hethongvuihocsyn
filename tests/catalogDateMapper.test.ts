import assert from 'node:assert/strict';
import {toSupabaseRow,fromSupabaseRow} from '../src/lib/supabaseMapper';
assert.deepEqual(toSupabaseRow('dated_lessons',{
 id:'B1',date:'2026-10-15',startsAt:'2026-10-15T11:00:00Z',endsAt:'2026-10-15T12:30:00Z'
}),{madinhdanh:'B1',ngayhoc:'2026-10-15',batdau:'18:00:00',ketthuc:'19:30:00'});
const lesson=fromSupabaseRow('dated_lessons',{madinhdanh:'B1',ngayhoc:'2026-10-15',batdau:'18:00:00',ketthuc:'19:30:00'});
assert.equal(lesson.startsAt,'2026-10-15T18:00:00+07:00');
assert.equal(lesson.endsAt,'2026-10-15T19:30:00+07:00');
const incident=toSupabaseRow('lesson_incidents',{id:'I1',reportedAt:'2026-10-15T18:30:00Z',handledAt:null});
assert.equal(incident.baoluc,'2026-10-16');
assert.equal(incident.xulyluc,null);
console.log('Passed: local lesson times, timestamp reconstruction and local incident dates.');
