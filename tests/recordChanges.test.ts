import assert from 'node:assert/strict';
import {recordChanges} from '../src/lib/recordChanges';
const first={madinhdanh:'A',name:'Original',description:'Keep',teacherName:'Query only'};
const other={madinhdanh:'B',name:'Other'};
const change=recordChanges('classes',[first,other],[{...first,name:'Renamed'},other],[first,other]);
assert.deepEqual(change,[{dataset:'classes',before:{madinhdanh:'A',name:'Original'},after:{madinhdanh:'A',name:'Renamed'}}]);
assert.deepEqual(recordChanges('classes',[first],[{...first,description:undefined}],[first]),[
 {dataset:'classes',before:{madinhdanh:'A',description:'Keep'},after:{madinhdanh:'A',description:null}},
]);
assert.deepEqual(recordChanges('classes',[first],[],[first]),[{dataset:'classes',before:first,after:null}]);
assert.deepEqual(recordChanges('classes',[],[first],[]),[{dataset:'classes',before:null,after:first}]);
assert.throws(()=>recordChanges('classes',[first],[first,first],[first]),/Trùng mã/);
assert.throws(()=>recordChanges('classes',[],[{name:'Missing id'}],[]),/thiếu mã/);
console.log('PASS: stable ID, changed fields only, explicit clear, create/delete distinction and duplicate-ID guard');
