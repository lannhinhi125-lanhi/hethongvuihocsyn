import assert from 'node:assert/strict';
import {fromSupabaseRow,toSupabaseRow} from '../src/lib/supabaseMapper';
const progress={total:2,completed:1,state:'CHUA_DU',studentIds:['S1','S2']};
const decoded=fromSupabaseRow('dated_lessons',{madinhdanh:'STATE-1',trangthai:'DA_HOC',tiendonhanxet:progress});
assert.deepEqual(decoded.feedbackProgress,progress);
assert.deepEqual(toSupabaseRow('dated_lessons',decoded),{madinhdanh:'STATE-1',trangthai:'DA_HOC'});
console.log('PASS: feedback progress is read-only');
