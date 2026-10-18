import assert from 'node:assert/strict';
import {studentMultiEnrollmentReport} from '../src/lib/studentMultiEnrollmentReport';
import {buildCustomReport,defaultReportConfig} from '../src/lib/customReports';
import type {ClassItem,StudentRecord} from '../src/types';
const student={id:'S1',name:'An',grade:'G3',subject:'M',status:'Đang học',model:'1-3',level:'BASIC',scheduleSlots:[],registrations:[
 {subject:'M',status:'Đang học',currentClassCode:'M1',model:'1-3',level:'BASIC',scheduleSlots:[]},
 {subject:'E',status:'Đang học',currentClassCode:'E1',model:'1-3',level:'BASIC',scheduleSlots:[]},
 {subject:'X',status:'Đã thôi học',currentClassCode:'X1',model:'1-3',level:'BASIC',scheduleSlots:[]}
]} as StudentRecord;
const cls={id:'M1',code:'M1',name:'Toán',subject:'M',studentIds:['S1','S2'],status:'Đang học',startDate:'2026-01-01',endDate:'2026-12-31'} as ClassItem;
const classes=[cls,{...cls,id:'E1',code:'E1',name:'Anh',subject:'E',paused:true,studentIds:['S1']},
 {...cls,id:'X1',code:'X1',subject:'X'}, {...cls,id:'closed',code:'closed',status:'Dừng lớp'} as ClassItem,
 {...cls,id:'expired',code:'expired',endDate:'2026-01-31'}];
const second={...student,id:'S2',name:'Bình',registrations:[student.registrations![0]]};
const dataset=studentMultiEnrollmentReport([student,student,second],classes,[{code:'M',name:'Toán'},{code:'E',name:'Anh'}],[{id:'G3',label:'Lớp 3'}],'2026-10-18');
assert.equal(dataset.records.length,2,'duplicate student profiles do not inflate totals');
assert.equal(dataset.records[0].subjectCount,2);assert.equal(dataset.records[0].classCount,2,'paused class retained; closed/expired/withdrawn excluded');
assert.equal(dataset.records[1].subjectCount,1);
assert.equal(dataset.filterRecords!(dataset.records,{subjects:['E']}).length,1);
assert.equal(dataset.filterRecords!(dataset.records,{classes:['E1']})[0].subjectCount,2,'filters select pupils without reducing their total subjects');
assert.equal(dataset.filterRecords!(dataset.records,{subjectCount:['2'],grade:['Lớp 3']}).length,1);
const report=buildCustomReport(dataset,{...defaultReportConfig(dataset),groupBy:'all'});
assert.equal(report.totals.count,2);assert.equal(report.totals.multiSubject,1);assert.equal(report.totals.multiClass,1);assert.equal(report.totals.rate,50);
console.log('PASS multi-enrollment report: unique pupils, active registrations, paused classes, closed/expired exclusions, membership filters and correct ratio');
