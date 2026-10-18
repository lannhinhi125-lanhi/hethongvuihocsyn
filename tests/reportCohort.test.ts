import assert from 'node:assert/strict';
import test from 'node:test';
import {createdInReportRange} from '../src/lib/reportCohort';
import {fromSupabaseRow} from '../src/lib/supabaseMapper';
import {inspectionReportRows} from '../src/lib/inspectionReport';

test('saved database creation dates drive class, student and teacher cohorts',()=>{
  for(const dataset of ['classes','students','teachers'] as const){
    const row=fromSupabaseRow(dataset,{madinhdanh:'DEMO-1',ngaytao:'2026-08-28'});
    assert.equal(row.created_at,'2026-08-28');
    assert.equal(createdInReportRange(row.created_at as string,{start:'',end:''}),true);
    assert.equal(createdInReportRange(row.created_at as string,{start:'2026-10-01',end:'2026-10-31'}),false);
    assert.equal(createdInReportRange(row.created_at as string,{start:'2026-08-01',end:'2026-08-31'}),true);
  }
});
test('unknown dates are not invented and timezone boundaries are inclusive',()=>{
  assert.equal(createdInReportRange(undefined,{start:'',end:''}),true);
  assert.equal(createdInReportRange(undefined,{start:'2026-10-01',end:''}),false);
  assert.equal(createdInReportRange('2026-09-30T18:00:00Z',{start:'2026-10-01',end:'2026-10-01'}),true);
  assert.equal(createdInReportRange('2026-08-28',{start:'',end:'2026-08-28'}),true);
});
test('draft or rejected inspections never influence approved results',()=>{
  const teachers=[{id:'GV1',name:'Teacher',subject:'MATH'}];
  const rows=inspectionReportRows(teachers,[
    {teacherId:'GV1',evaluationDate:'2026-10-01',overallScore:8,status:'DA_DUYET'},
    {teacherId:'GV1',evaluationDate:'2026-10-01',overallScore:2,status:'NHAP'},
    {teacherId:'GV1',evaluationDate:'2026-10-01',overallScore:4,status:'TU_CHOI'}
  ],[]);
  assert.equal(rows[0].avg,8);
  assert.equal(rows[0].total,1);
});
