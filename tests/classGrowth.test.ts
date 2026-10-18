import assert from 'node:assert/strict';
import {classifyClassGrowth} from '../src/lib/classGrowth';
const students=new Map([['new',{created_at:'2026-10-02'}],['old',{created_at:'2026-09-30'}],['missing',{}],['future',{created_at:'2026-11-01'}],['boundary',{created_at:'2026-09-30T17:01:00Z'}]]);
const range={start:'2026-10-01',end:'2026-10-31'};
assert.equal(classifyClassGrowth(['new'],students,range).kind,'NEW');
assert.equal(classifyClassGrowth(['old'],students,range).kind,'TRANSFER');
assert.equal(classifyClassGrowth(['new','old'],students,range).kind,'MIXED');
assert.equal(classifyClassGrowth([],students,range).kind,'EMPTY');
assert.equal(classifyClassGrowth(['missing'],students,range).kind,'UNKNOWN');
assert.equal(classifyClassGrowth(['not-found'],students,range).kind,'UNKNOWN');
assert.equal(classifyClassGrowth(['future'],students,range).kind,'UNKNOWN');
assert.equal(classifyClassGrowth(['boundary'],students,range).kind,'NEW');
assert.equal(classifyClassGrowth(['new'],students,{start:'',end:''}).kind,'UNKNOWN');
assert.equal(classifyClassGrowth(['new','new'],students,range).newStudents,1);
const classes=[['new'],['old'],['old','new'],[],['missing']];
assert.equal(classes.filter(roster=>classifyClassGrowth(roster,students,range).kind==='NEW').length,1);
console.log('PASS: new-only classes count; transfers, mixed, empty and unknown excluded; Bangkok dates; no duplicate students');

const trace=(classId:string,occurredAt:string,isInitial:boolean)=>({traceId:occurredAt,fromClassId:null,toClassId:classId,fromClassCode:null,toClassCode:classId,occurredAt,actorId:null,actorName:null,isBaseline:false,isInitial});
const historical=new Map([['s',{created_at:'2026-10-02',classHistory:[trace('A','2026-10-02T10:00:00+07:00',true),trace('B','2026-11-03T10:00:00+07:00',false)]}]]);
assert.equal(classifyClassGrowth([],historical,range,'A').kind,'NEW','Moving away cannot erase original growth');
assert.equal(classifyClassGrowth(['s'],historical,{start:'2026-11-01',end:'2026-11-30'},'B').kind,'TRANSFER');
historical.get('s')!.classHistory.push(trace('A','2026-11-04T10:00:00+07:00',false));
assert.equal(classifyClassGrowth([],historical,range,'A').kind,'NEW','Future rejoin cannot alter October');
const samePeriod=new Map([['s',{created_at:'2026-10-02',classHistory:[trace('B','2026-10-03T10:00:00+07:00',false)]}]]);
assert.equal(classifyClassGrowth(['s'],samePeriod,range,'B').kind,'TRANSFER','Transfer within same month remains old');
const baseline=new Map([['s',{created_at:'2026-10-02',classHistory:[{...trace('A','2026-10-02T10:00:00+07:00',true),isBaseline:true}]}]]);
assert.equal(classifyClassGrowth(['s'],baseline,range,'A').kind,'UNKNOWN','Baseline is not invented growth');
console.log('PASS: historical growth survives moving, rejoining and same-period transfers; legacy baseline excluded');

const bySubject=new Map([['s',{created_at:'2026-08-01',registrations:[
 {subject:'MATH',registeredAt:'2026-08-01'}, {subject:'ENG',registeredAt:'2026-10-02'}
],classHistory:[
 {...trace('MATH-A','2026-08-01T10:00:00+07:00',true),subject:'MATH'},
 {...trace('ENG-A','2026-10-02T10:00:00+07:00',true),subject:'ENG'},
 {...trace('ENG-B','2026-10-10T10:00:00+07:00',false),subject:'ENG'}
]}]]);
assert.equal(classifyClassGrowth(['s'],bySubject,range,'ENG-A','ENG').kind,'TRANSFER','New subject registration of an existing student is not a new student identity');
assert.equal(classifyClassGrowth(['s'],bySubject,range,'ENG-B','ENG').kind,'TRANSFER','Another class of the same subject is a transfer');
const sameDay=new Map([['s',{created_at:'2026-10-02',registrations:[
 {subject:'MATH',registeredAt:'2026-10-02'}, {subject:'ENG',registeredAt:'2026-10-02'}
],classHistory:[
 {...trace('MATH-A','2026-10-02T10:00:00+07:00',true),subject:'MATH'},
 {...trace('ENG-A','2026-10-02T11:00:00+07:00',true),subject:'ENG'}
]}]]);
assert.equal(['MATH','ENG'].filter(subject=>classifyClassGrowth(['s'],sameDay,range,subject+'-A',subject).kind==='NEW').length,2,'Both first classes count when registered on the same day');
console.log('PASS: new subject registrations do not create new identities; first placements for genuinely new profiles can qualify by subject');
