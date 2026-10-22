import { allReportDatasets } from '../src/lib/allReportDatasets';
import type { ClassItem } from '../src/types';
import assert from 'node:assert/strict';
import test from 'node:test';
import { operationalReportDatasets } from '../src/lib/operationalReportDatasets';
import { buildCustomReport, defaultReportConfig, normalizeReportConfig } from '../src/lib/customReports';
import { fromSupabaseRow, toSupabaseRow } from '../src/lib/supabaseMapper';
import { lessonPauseLabel, classPauseReasons, pauseReasonKey } from '../src/lib/classPause';

const lessons = [
  {id:'pause',classId:'C1',date:'2026-10-21',status:'NGHI_HOC',pausedByClass:true,pauseReason:'R1',pauseCategoryId:'BREAK',pauseNote:'Thông báo trường'},
  {id:'done',classId:'C1',date:'2026-10-22',status:'DA_HOC'}
];
const catalogs = [{id:'BREAK',name:'Nghỉ theo lịch',code:'GRP-BREAK',subIncidents:[{id:'R1',code:'R1',name:'Nghỉ lễ',status:true,allowClassPause:true,isScheduledBreak:true}]}];
const sources = (incidentCategories = catalogs) => operationalReportDatasets(lessons, [], [], [], [], {incidentCategories});

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
  const renamed = [{...catalogs[0],subIncidents:[{id:'R1',code:'R1',name:'Nghỉ theo lịch trường',status:false,allowClassPause:true,isScheduledBreak:true}]}];
  assert.equal(sources(renamed)[2].records[0].pauseReasonName,'Nghỉ theo lịch trường');
  assert.equal(lessonPauseLabel(lessons[0],renamed),'Tạm dừng lớp · Nghỉ theo lịch trường');
  assert.equal(sources(renamed)[2].filters.find(field => field.id === 'cause')?.choices?.find(choice => choice.value === JSON.stringify(['BREAK','R1']))?.label,'Nghỉ theo lịch trường');
});

test('pause reports filter by catalog ID rather than the mutable display name', () => {
  const sessions = sources()[2];
  const report = buildCustomReport(sessions,{...defaultReportConfig(sessions),datePreset:'all',groupBy:'all',filters:{pauseReason:[JSON.stringify(['BREAK','R1'])]},metricIds:['paused','completed']});
  assert.deepEqual(report.records.map(record => record.id),['pause']);
  assert.equal(report.totals.paused,1);
  assert.equal(report.totals.completed,0);
});

test('teacher-leave linked incidents count once alongside scheduled breaks without inventing holiday incidents', () => {
  const categories=[...catalogs,{id:'TEACHER',name:'Sự cố giáo viên',code:'GRP-TCH',subIncidents:[{id:'LEAVE',code:'LEAVE',name:'Giáo viên xin nghỉ',status:true,allowClassPause:true,isScheduledBreak:false}]}];
  const rows=[...lessons,{...lessons[0],id:'teacher-leave',pauseReason:'LEAVE',pauseCategoryId:'TEACHER'}];
  const events=[{id:'linked',lessonId:'teacher-leave',categoryId:'TEACHER',incidentCode:'LEAVE',incidentName:'Tên cũ',status:'DA_GIAI_QUYET',urgency:'ADVANCED'}];
  const [source]=operationalReportDatasets(rows,events,[],[],[],{incidentCategories:categories});
  const result=buildCustomReport(source,{...defaultReportConfig(source),datePreset:'all',groupBy:'all',metricIds:['incidents']});
  assert.equal(result.totals.incidents,1);
  assert.equal(source.records.find(row=>row.id==='teacher-leave')?.cause,'Giáo viên xin nghỉ');
  assert.equal(source.records.find(row=>row.id==='pause')?.incidents,0);
});

test('group-scoped IDs distinguish shared item IDs and retain retired labels in reports', () => {
  const categories=[...catalogs,{id:'OTHER',name:'Nhóm khác',subIncidents:[{id:'R1',code:'OTHER-R1',name:'Lý do khác',status:true,allowClassPause:true}]}];
  assert.equal(new Set(classPauseReasons(categories,true).map(item=>item.key)).size,2);
  assert.notEqual(pauseReasonKey('BREAK','R1'),pauseReasonKey('OTHER','R1'));
  const retired=[{...catalogs[0],subIncidents:[{...catalogs[0].subIncidents[0],status:false,allowClassPause:false}]}];
  assert.equal(classPauseReasons(retired,true).length,0);
  const dataset=sources(retired)[2];
  assert.equal(dataset.records[0].pauseReasonName,'Nghỉ lễ');
  assert.equal(dataset.filters.find(field=>field.id==='cause')?.choices?.find(choice=>choice.value===pauseReasonKey('BREAK','R1'))?.label,'Nghỉ lễ');
});

test('migrated template filters decode grouped IDs without changing the server conflict snapshot', () => {
  const key=pauseReasonKey('BREAK','R1');
  const row={madinhdanh:'T1',cauhinh:{filters:{pauseReason:JSON.stringify([key,'__NONE__'])}}};
  const before=JSON.stringify(row);
  const decoded=fromSupabaseRow('report_templates',row) as {config:{filters:{pauseReason:string[]}}};
  assert.deepEqual(decoded.config.filters.pauseReason,[key,'__NONE__']);
  assert.equal(JSON.stringify(row),before);
});


test('reports expose one catalog group/type selector and can find holiday lessons without teacher incidents', () => {
  for (const dataset of [sources()[0],sources()[2]]) {
    assert.ok(dataset.filters.some(field=>field.id==='incidentGroup'));
    assert.ok(dataset.filters.some(field=>field.id==='cause'));
    assert.ok(!dataset.filters.some(field=>field.id==='pauseReason'));
    assert.ok(![...dataset.filters,...dataset.dimensions,...dataset.detailFields].some(field=>field.label==='Lý do tạm dừng'));
    const result=buildCustomReport(dataset,{...defaultReportConfig(dataset),datePreset:'all',groupBy:'cause',filters:{incidentGroup:['BREAK'],cause:[pauseReasonKey('BREAK','R1')]},metricIds:dataset.id==='incidents'?['breaks','incidents','total']:['paused','total']});
    assert.deepEqual(result.records.map(row=>row.id),['pause']);
    assert.equal(result.rows[0].label,'Nghỉ lễ');
    if(dataset.id==='incidents') {assert.equal(result.totals.breaks,1);assert.equal(result.totals.incidents,0);}
    else assert.equal(result.totals.paused,1);
  }
});

test('unified types include ordinary incidents and respect group/type on the same event', () => {
  const categories=[...catalogs,{id:'TEACHER',name:'Sự cố giáo viên',subIncidents:[{id:'LEAVE-ID',code:'LEAVE-CODE',name:'Giáo viên xin nghỉ',status:true,allowClassPause:true}]}];
  const rows=[...lessons,{...lessons[0],id:'teacher',pauseCategoryId:'TEACHER',pauseReason:'LEAVE-ID'}];
  const events=[{id:'linked',lessonId:'teacher',categoryId:'TEACHER',incidentCode:'LEAVE-CODE',incidentName:'Tên cũ'}];
  const datasets=operationalReportDatasets(rows,events,[],[],[],{incidentCategories:categories});
  const lessonSource=datasets[2];
  const report=buildCustomReport(lessonSource,{...defaultReportConfig(lessonSource),datePreset:'all',groupBy:'all',filters:{cause:[pauseReasonKey('TEACHER','LEAVE-CODE')]},metricIds:['total']});
  assert.deepEqual(report.records.map(row=>row.id),['teacher']);
  const mismatch=buildCustomReport(lessonSource,{...defaultReportConfig(lessonSource),datePreset:'all',groupBy:'all',filters:{incidentGroup:['BREAK'],cause:[pauseReasonKey('TEACHER','LEAVE-CODE')]},metricIds:['total']});
  assert.equal(mismatch.records.length,0);
  const old=normalizeReportConfig({...defaultReportConfig(lessonSource),groupBy:'pauseReason',filters:{pauseReason:[pauseReasonKey('TEACHER','LEAVE-ID')]}},datasets);
  assert.equal(old.groupBy,'cause');
  assert.deepEqual(old.filters,{cause:[pauseReasonKey('TEACHER','LEAVE-CODE')]});
});


test('class reports share incident group/type fields and ordinary lesson grouping retains unclassified lessons', () => {
  const cls={id:'C1',code:'CLASS1',name:'Lớp 1',studentIds:[],maxStudents:5,paused:true,pauseCategoryId:'BREAK',pauseReason:'R1'} as unknown as ClassItem;
  const datasets=allReportDatasets({classes:[cls],students:[],teachers:[],lessons,incidents:[],evaluations:[],lookups:{incidentCategories:catalogs}}).detail;
  const classes=datasets.find(dataset=>dataset.id==='classes')!;
  assert.ok(!classes.filters.some(field=>field.id==='pauseReason'));
  const result=buildCustomReport(classes,{...defaultReportConfig(classes),datePreset:'all',groupBy:'cause',filters:{incidentGroup:['BREAK'],cause:[pauseReasonKey('BREAK','R1')]},metricIds:['count']});
  assert.equal(result.totals.count,1);
  assert.equal(result.rows[0].label,'Nghỉ lễ');
  assert.equal(result.records[0].cause,'Nghỉ lễ');
  const sessions=sources()[2];
  const grouped=buildCustomReport(sessions,{...defaultReportConfig(sessions),datePreset:'all',groupBy:'incidentGroup',metricIds:['total']});
  assert.equal(grouped.rows.reduce((sum,row)=>sum+Number(row.values.total),0),2);
  const unclassified=buildCustomReport(sessions,{...defaultReportConfig(sessions),datePreset:'all',groupBy:'all',filters:{cause:['__NONE__']},metricIds:['total']});
  assert.deepEqual(unclassified.records.map(row=>row.id),['done']);
});


test('legacy item ID conversion does not reinterpret current incident codes', () => {
  const categories=[{id:'GROUP',name:'Nhóm',subIncidents:[{id:'SAME',code:'FIRST',name:'Loại 1'},{id:'SECOND',code:'SAME',name:'Loại 2'}]}];
  const datasets=operationalReportDatasets([],[],[],[],[],{incidentCategories:categories});
  const dataset=datasets[2], key=pauseReasonKey('GROUP','SAME');
  const current=normalizeReportConfig({...defaultReportConfig(dataset),filters:{cause:[key]}},datasets);
  assert.deepEqual(current.filters,{cause:[key]});
  const legacy=normalizeReportConfig({...defaultReportConfig(dataset),filters:{pauseReason:[key]}},datasets);
  assert.deepEqual(legacy.filters,{cause:[pauseReasonKey('GROUP','FIRST')]});
});


test('generated incident origin is read from the actual database column and remains read-only', () => {
  const incident=fromSupabaseRow('lesson_incidents',{madinhdanh:'AUTO',mabuoi:'LESSON',dotamdunglop:true});
  assert.equal(incident.fromClassPause,true);
  assert.deepEqual(toSupabaseRow('lesson_incidents',incident),{madinhdanh:'AUTO',mabuoi:'LESSON'});
});
