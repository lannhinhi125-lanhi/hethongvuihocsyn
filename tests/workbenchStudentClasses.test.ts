import assert from 'node:assert/strict';
import test from 'node:test';
import {workbenchAnalytics} from '../src/lib/workbenchAnalytics';
import {fromSupabaseRow} from '../src/lib/supabaseMapper';
import type {ClassItem,StudentRecord} from '../src/types';

const student=(id:string,status:string,date?:string)=>fromSupabaseRow('students',{
 madinhdanh:id,hoten:id,trangthai:status,ngaytao:date,
 dangkymonhoc:[{subject:'MATH',status,model:'1-3',level:'BASIC',scheduleSlots:[]}]
}) as unknown as StudentRecord;
const classes=[
 {madinhdanh:'C1',tenlophoc:'Class 1',mamonhoc:'MATH',trangthai:'DANG_HOC',ngaytao:'2026-08-25'},
 {madinhdanh:'C2',tenlophoc:'Class 2',mamonhoc:'ENG',trangthai:'CHO_KHAI_GIANG',ngaytao:'2026-10-15'},
 {madinhdanh:'C3',tenlophoc:'Class 3',mamonhoc:'MATH',trangthai:'DA_KET_THUC'}
].map(row=>fromSupabaseRow('classes',row) as unknown as ClassItem);
const students=[student('S1','DANG_HOC','2026-08-28'),student('S2','CHO_XEP_LOP','2026-10-15'),student('S3','BAO_LUU')];

test('current totals include existing Supabase profiles independently of creation period',()=>{
 const data=workbenchAnalytics(classes,students,[],[],[],{start:'2026-10-12',end:'2026-10-18'});
 assert.equal(data.totalStudents,3);
 assert.equal(data.totalClasses,3);
 assert.equal(data.activeStudents,1);
 assert.equal(data.activeClasses,1);
 assert.equal(data.newStudents,1);
 assert.equal(data.newClasses,1);
 assert.equal(data.waiting,1);
 assert.equal(data.currentSubjects.reduce((n,item)=>n+item.count,0),3);
 const later=workbenchAnalytics(classes,students,[],[],[],{start:'2026-11-01',end:'2026-11-30'});
 assert.equal(later.newStudents,0);
 assert.equal(later.newClasses,0);
 assert.equal(later.totalStudents,3);
 assert.equal(later.totalClasses,3);
});
test('multiple registrations and duplicate profile rows never inflate totals',()=>{
 const dual={...students[0],registrations:[
  {subject:'MATH',status:'Đang học',model:'1-3',level:'BASIC',scheduleSlots:[]},
  {subject:'ENG',status:'Chờ xếp lớp',model:'1-3',level:'BASIC',scheduleSlots:[]}
 ]} as StudentRecord;
 const data=workbenchAnalytics([...classes,classes[0]],[dual,dual],[],[],[],{start:'2026-08-01',end:'2026-08-31'});
 assert.equal(data.totalStudents,1);
 assert.equal(data.activeStudents,1);
 assert.equal(data.waiting,1);
 assert.equal(data.newStudents,1);
 assert.equal(data.totalClasses,3);
 assert.equal(data.currentSubjects.reduce((n,item)=>n+item.count,0),3);
});
