import assert from 'node:assert/strict';
import {workbenchAnalytics} from '../src/lib/workbenchAnalytics';
import type {ClassItem,StudentRecord,StudentClassTrace} from '../src/types';
const range={start:'2026-10-01',end:'2026-10-31'};
const trace=(id:string,to:string,from:string|null=null,date='2026-10-05',baseline=false):StudentClassTrace=>({traceId:id,toClassId:to,fromClassId:from,toClassCode:to,fromClassCode:from,occurredAt:date,isInitial:!from,isBaseline:baseline,actorId:null,actorName:null,subject:'ENG'});
const profiles=[
 {id:'new',created_at:'2026-10-02',classHistory:[trace('1','A')]},
 {id:'old',created_at:'2026-09-01',registrations:[{subject:'ENG',registeredAt:'2026-10-02'}],classHistory:[trace('2','B'),trace('3','B','OLD'),trace('4','B','OLD')]},
 {id:'new-move',created_at:'2026-10-02',classHistory:[trace('5','D','OTHER')]},
 {id:'baseline',created_at:'2026-10-02',classHistory:[trace('6','E',null,'2026-10-05',true)]}
] as unknown as StudentRecord[];
const classes=['A','B','C','D','E'].map(id=>({id,code:id,name:id,subject:'ENG',created_at:'2026-10-03',studentIds:id==='C'?[]:[id==='A'?'new':id==='B'?'old':id==='D'?'new-move':'baseline']})) as ClassItem[];
const result=workbenchAnalytics(classes,profiles,[],[],[],range);
assert.equal(result.newClasses,5);
assert.equal(result.growthClasses,1,'created class with old or transferred students is not growth');
assert.equal(result.oldTransferred,1,'repeat moves count one existing student');
assert.equal(result.newTransferred,1,'new student who moves remains a new identity but not an initial placement');
assert.equal(result.newStudents,3,'new subject registration does not create a new profile');
assert.equal(result.classKinds.reduce((n,k)=>n+k.count,0),5);
assert.equal(result.classifiedClasses.find(c=>c.id==='E')?.kind,'UNKNOWN');
assert.equal(result.classifiedClasses.find(c=>c.id==='C')?.kind,'EMPTY');
assert.equal(result.growth.reduce((n,g)=>n+g.classes,0),1);
const olderClass=workbenchAnalytics([{...classes[0],created_at:'2026-09-01'}],profiles,[],[],[],range);
assert.equal(olderClass.growthClasses,0,'old class receiving new pupils is not a new class');
console.log('PASS: growth requires new class and new identities, transfer deduplication, old subject registrations, unknown history and chart totals');
