import assert from 'node:assert/strict';
import type {ClassItem} from '../src/types';
import {canAssignClassMaterials} from '../src/lib/classMaterialEligibility';

const cls={status:'Chờ khai giảng',startDate:'2026-12-01',endDate:'2027-01-01'} as ClassItem;
const today='2026-11-03';
assert.equal(canAssignClassMaterials(cls,today),true,'Prepare materials before the opening date');
assert.equal(canAssignClassMaterials({...cls,status:'Đang học'},today),true);
assert.equal(canAssignClassMaterials({...cls,endDate:today},today),true);
assert.equal(canAssignClassMaterials({...cls,endDate:undefined},today),true);
for(const status of ['Chờ khai giảng','Đang học'] as const){
 assert.equal(canAssignClassMaterials({...cls,status,paused:true},today),false);
 assert.equal(canAssignClassMaterials({...cls,status,endDate:'2026-11-02'},today),false);
}
for(const status of ['Dừng lớp','Đã kết thúc',undefined] as const)
 assert.equal(canAssignClassMaterials({...cls,status},today),false);
console.log('PASS material eligibility: prepare before opening; active allowed; paused, stopped and expired blocked.');
