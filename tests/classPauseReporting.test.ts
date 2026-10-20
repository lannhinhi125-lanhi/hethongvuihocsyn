import assert from 'node:assert/strict';
import test from 'node:test';
import { operationalReportDatasets } from '../src/lib/operationalReportDatasets';
import { buildCustomReport, defaultReportConfig } from '../src/lib/customReports';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabaseMapper';
import { lessonPauseLabel } from '../src/lib/classPause';

const lessons = [
  {id:'pause',classId:'C1',date:'2026-10-21',status:'NGHI_HOC',pausedByClass:true,pauseReason:'R1',pauseNote:'Thông báo trường'},
  {id:'done',classId:'C1',date:'2026-10-22',status:'DA_HOC'}
];
const catalogs = [{code:'CLASS_PAUSE_REASON',entries:[{id:'R1',name:'Nghỉ lễ',status:true}]}];
const sources = (customCatalogs = catalogs) => operationalReportDatasets(lessons, [], [], [], [], {customCatalogs});

test('pause metadata is read from Supabase but not written by lesson edits', () => {
  const decoded = fromSupabaseRow('dated_lessons',{madinhdanh:'pause',tamhoandolop:true,lydotamdung:'R1',ghichutamdung:'Ghi chú'});
  assert.equal(decoded.pausedByClass,true);
  assert.equal(decoded.pauseReason,'R1');
  assert.equal(decoded.pauseNote,'Ghi chú');
  assert.deepEqual(toSupabaseRow('dated_lessons',decoded),{madinhdanh:'pause'});
});

test('class pauses do not become incidents and remain distinguishable from completed lessons', () => {
  const [incidents,,sessions] = sources();
  const report = buildCustomReport(incidents,{...defaultReportConfig(incidents),datePreset:'all',groupBy:'all',metricIds:['incidents']});
  assert.equal(report.totals.incidents,0);
  const counts = buildCustomReport(sessions,{...defaultReportConfig(sessions),datePreset:'all',groupBy:'all',metricIds:['paused','completed']});
  assert.equal(counts.totals.paused,1);
  assert.equal(counts.totals.completed,1);
  assert.equal(sessions.records[0].lessonStatus,'Tạm dừng lớp');
  assert.equal(sessions.records[0].pauseReasonName,'Nghỉ lễ');
});

test('catalog renames and inactive entries update labels across reports and teacher schedule', () => {
  const renamed = [{...catalogs[0],entries:[{id:'R1',name:'Nghỉ theo lịch trường',status:false}]}];
  assert.equal(sources(renamed)[2].records[0].pauseReasonName,'Nghỉ theo lịch trường');
  assert.equal(lessonPauseLabel(lessons[0],renamed),'Tạm dừng lớp · Nghỉ theo lịch trường');
  assert.equal(sources(renamed)[2].filters.find(field => field.id === 'pauseReason')?.choices?.find(choice => choice.value === 'R1')?.label,'Nghỉ theo lịch trường');
});

test('pause reports filter by catalog ID rather than the mutable display name', () => {
  const sessions = sources()[2];
  const report = buildCustomReport(sessions,{...defaultReportConfig(sessions),datePreset:'all',groupBy:'all',filters:{pauseReason:['R1']},metricIds:['paused','completed']});
  assert.deepEqual(report.records.map(record => record.id),['pause']);
  assert.equal(report.totals.paused,1);
  assert.equal(report.totals.completed,0);
});
