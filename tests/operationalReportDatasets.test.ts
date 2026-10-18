import assert from 'node:assert/strict';
import test from 'node:test';
import {operationalReportDatasets} from '../src/lib/operationalReportDatasets';
import {buildCustomReport,defaultReportConfig} from '../src/lib/customReports';
import {incidentReportPeriods} from '../src/lib/incidentReportPeriods';

const lessons=[{id:'L1',classId:'C1',date:'2026-09-30'},{id:'L2',classId:'C1',date:'2026-10-01'}];
const incidents=[{lessonId:'L1',reportedAt:'2026-10-01',urgency:'EMERGENCY'},
 {lessonId:'L1',reportedAt:'2026-10-01',urgency:'ADVANCED'},{lessonId:'L2',reportedAt:'2026-10-02',urgency:'ADVANCED'}];
const evaluations=[{id:'E1',teacherId:'T1',evaluationDate:'2026-09-30',overallScore:9,status:'DA_DUYET'},
 {id:'E2',teacherId:'T1',evaluationDate:'2026-10-01',overallScore:8,status:'DA_DUYET'},
 {id:'E3',teacherId:'T1',evaluationDate:'2026-10-01',overallScore:6,status:'DA_DUYET'},
 {id:'E4',teacherId:'T2',evaluationDate:'2026-10-01',overallScore:2,status:'NHAP'}];
const [incidentSource,inspectionSource]=operationalReportDatasets(lessons,incidents,evaluations,[{id:'T1',name:'Teacher',subject:'Math'}],[{id:'C1',name:'Class'}]);
test('dynamic incident report uses actual lessons and exact days, matching detail report',()=>{
 const config={...defaultReportConfig(incidentSource),datePreset:'custom' as const,from:'2026-10-01',to:'2026-10-01',groupBy:'all',metricIds:['total','incidents','rate','urgent','notice']};
 const result=buildCustomReport(incidentSource,config);
 assert.deepEqual(result.records.map(row=>row.id),['L2']);
 assert.deepEqual(result.totals,{total:1,incidents:1,rate:100,urgent:0,notice:1});
 const [detail]=incidentReportPeriods(lessons,incidents,{start:config.from,end:config.to},'lesson');
 assert.equal(detail.incidents,result.totals.incidents);
 assert.equal(detail.rate,result.totals.rate);
 const all=buildCustomReport(incidentSource,{...config,datePreset:'all'});
 assert.equal(all.totals.incidents,2,'duplicate incidents never double count a lesson');
});
test('dynamic inspection filters actual evaluation dates and counts distinct teachers',()=>{
 const result=buildCustomReport(inspectionSource,{...defaultReportConfig(inspectionSource),datePreset:'custom',from:'2026-10-01',to:'2026-10-01',groupBy:'rank'});
 assert.deepEqual(result.records.map(row=>row.id),['E2','E3']);
 assert.equal(result.totals.count,1,'same teacher in two ranks counts once in total');
 assert.equal(result.totals.sessions,2);
 assert.equal(result.totals.score,7);
 assert.equal(result.rows.length,2);
});
test('empty Supabase sources produce no fabricated records',()=>{
 for(const source of operationalReportDatasets([],[],[],[],[])){
  const result=buildCustomReport(source,{...defaultReportConfig(source),datePreset:'all'});
  assert.equal(result.records.length,0);
  assert.equal(result.rows.length,0);
  assert.equal(result.totals.score??null,null);
 }
});
