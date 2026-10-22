import assert from 'node:assert/strict';
import {fromSupabaseRow,toSupabaseRow} from '../src/lib/supabaseMapper';
const history=[{traceId:'e',fromClassId:'A',toClassId:'B',isInitial:false}];
const row=fromSupabaseRow('students',{madinhdanh:'S',malophientai:'B',lichsulophoc:history});
assert.deepEqual(row.classHistory,history);
assert.equal(row.currentClassCode,'B');
assert.deepEqual(toSupabaseRow('students',row),{madinhdanh:'S'});
console.log('PASS: class trace is SELECT-only in frontend mapper');
