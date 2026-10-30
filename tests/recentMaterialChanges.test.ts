import assert from 'node:assert/strict';
import { recentMaterialChanges } from '../src/lib/recentMaterialChanges';
import type { ClassItem, ClassSessionMaterial } from '../src/types';

const material = (session: number, title: string): ClassSessionMaterial => ({session,title,month:'11/2026',week:'Tuần 1: Từ ngày 02/11/2026 đến ngày 08/11/2026',slide:'https://example.test/slides',lms:''});
const cls = (id: string, materials: ClassSessionMaterial[] = []): ClassItem => ({id,code:id,name:`Lớp ${id}`,schedule:'T5 (16:15 - 17:45), T2 (16:15 - 17:45)',materials,startDate:'2026-01-01',endDate:'2026-12-31',grade:'',subject:'',level:'',model:'1-3',maxStudents:3,studentIds:[],roomLink:'',teacherName:''});
const input = [material(1,'Bài 1'),material(2,'Bài 2')];
const classes = [cls('A'),cls('B',[{...input[0],id:20,fromDate:'2026-11-02',toDate:'2026-11-08'},material(2,'Bài cũ')]),cls('C')];
const before = JSON.stringify(classes);
const rows = recentMaterialChanges(classes,['A','B'],input);
assert.equal(rows.length,3);
assert.deepEqual(rows.map(row=>[row.classId,row.material.session,row.date,row.kind]),[
  ['A',1,'2026-11-02','added'],['A',2,'2026-11-05','added'],['B',2,'2026-11-05','updated']
]);
assert.equal(rows[0].time,'16:15 - 17:45');
assert.equal(JSON.stringify(classes),before,'computing receipt must not mutate class data');
assert.equal(recentMaterialChanges([cls('A',input)],['A'],input).length,0,'identical content is not a recent change');
assert.equal(recentMaterialChanges([{...cls('A'),schedule:'CN (09:00 - 10:00)'}],['A'],[input[0]])[0].date,'2026-11-08');
assert.equal(recentMaterialChanges([{...cls('A'),schedule:''}],['A'],[input[0]])[0].date,'','do not invent a date without a schedule');
assert.equal(recentMaterialChanges([{...cls('A'),startDate:'2026-11-04'}],['A'],[input[0]])[0].date,'','respect the class start date');
assert.equal(recentMaterialChanges([{...cls('A'),endDate:'2026-11-03'}],['A'],[input[1]])[0].date,'','respect the class end date');
const newYear={...input[0],month:'12/2026',week:'Tuần 4: Từ ngày 28/12/2026 đến ngày 03/01/2027'};
assert.equal(recentMaterialChanges([{...cls('A'),endDate:null,schedule:'CN (09:00 - 10:00)'}],['A'],[newYear])[0].date,'2027-01-03');
console.log('Recent materials: added/updated/unchanged, selected classes, chronological sessions, missing schedule, class dates and year boundary passed.');
