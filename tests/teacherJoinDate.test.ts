import assert from 'node:assert/strict';
import {fromSupabaseRow} from '../src/lib/supabaseMapper';

assert.equal(fromSupabaseRow('teachers', {ngaytao:'2026-11-02T18:00:00Z'}).startDate, '2026-11-03');
assert.equal(fromSupabaseRow('teachers', {ngaytao:'2026-11-02T16:00:00Z', ngaybatdau:''}).startDate, '2026-11-02');
assert.equal(fromSupabaseRow('teachers', {ngaytao:'2026-11-02T18:00:00Z', ngaybatdau:'2026-10-01'}).startDate, '2026-10-01');
assert.equal(fromSupabaseRow('teachers', {ngaytao:'invalid'}).startDate, undefined);
console.log('PASS teacher join date: Bangkok date boundaries, empty dates, preserved dates and invalid timestamps');
