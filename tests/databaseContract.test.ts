
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { APP_DATABASE_FIELDS, DATABASE_NAMES } from '../src/lib/databaseNames';
import { fromSupabaseRow, toSupabaseRow, type SupabaseDataset } from '../src/lib/supabaseMapper';

// TypeScript 7 in this project does not expose the old compiler AST API.
// Read only top-level properties in these exported interface declarations.
const groups: [string, Record<string, SupabaseDataset>][] = [
 ['src/types/index.ts', { UserAccount:'users',SystemRoleGroup:'role_groups',SubjectItem:'subjects',LevelItem:'levels',TimeSlotItem:'time_slots',ClassModelItem:'class_models',IncidentCategory:'incident_categories',TeacherProfile:'teachers',StudentRecord:'students',ClassItem:'classes',CriteriaCategory:'criteria_categories',SOPDocument:'sop_documents',RAGBotConfig:'rag_bot_config',MonthPayrollData:'monthly_payroll',EvaluationRecord:'teacher_evaluations' }],
 ['src/components/CategoryMultiFilter.tsx', {CategoryGroup:'teaching_categories'}],
 ['src/views/Module5_OperationsMonitoring.tsx', {MonitoringSession:'teaching_sessions'}],
 ['src/lib/customReports.ts', {SavedReportTemplate:'report_templates'}]
];
let fieldCount=0;
for (const [file, interfaces] of groups) {
 const source=readFileSync(file,'utf8');
 for (const [name,dataset] of Object.entries(interfaces)) {
  const start=source.indexOf('export interface '+name+' {');
  assert.ok(start>=0,name);
  const open=source.indexOf('{',start); let depth=1,end=open+1;
  for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  const body=source.slice(open+1,end-1);
  const fields=body.includes('\n')?[...body.matchAll(/^  (\w+)\??:/gm)].map(m=>m[1]):[...body.matchAll(/(?:^|;)\s*(\w+)\??:/g)].map(m=>m[1]);
  assert.ok(fields.length>0,name);
  for(const field of fields){fieldCount++;assert.ok(field==='passwordRaw'||field in APP_DATABASE_FIELDS[dataset],name+'.'+field);}
 }
}
const modulePath=process.env.PGLITE_MODULE_PATH;
assert.ok(modulePath,'Set PGLITE_MODULE_PATH to the installed @electric-sql/pglite directory.');
const {PGlite}=await import(pathToFileURL(modulePath.replace(/[/\\]$/,'')+'/dist/index.js').href);
const db=new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $uid$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $uid$;`);
 const sql=readFileSync('supabase/schema.sql','utf8');
 await db.exec(sql); await db.exec(sql);
 const tables=await db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='vuihoc'");
 assert.equal(tables.rows[0].n,32);
 let rowCount=0,columnCount=0;
 for(const dataset of Object.keys(APP_DATABASE_FIELDS) as SupabaseDataset[]){
  const table=DATABASE_NAMES[dataset].table;
  const columns=await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['vuihoc',table]);
  const actual=new Set(columns.rows.map((r: {column_name:string})=>r.column_name));
  for(const column of Object.values(APP_DATABASE_FIELDS[dataset])){assert.ok(actual.has(column),table+'.'+column);columnCount++;}
  const {rows}=await db.query('SELECT * FROM vuihoc."'+table+'"');
  if (Object.keys(APP_DATABASE_FIELDS).indexOf(dataset)<22) assert.ok(rows.length>0,table+' seeded example');
  for(const row of rows){
   const encoded=toSupabaseRow(dataset,fromSupabaseRow(dataset,row));
   for(const [column,value] of Object.entries(encoded))assert.deepEqual(value,row[column],table+'.'+column);
   rowCount++;
  }
 }
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='vuihoc' AND tablename='GOI_HOC'")).rows[0].n,0);
 await db.exec("SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; UPDATE vuihoc.\"GIAO_VIEN\" SET lichranh=lichranh || '{\"TEST-SLOT\":[\"free\"]}'::jsonb WHERE madinhdanh='GV-001';");
 const audit=(await db.query('SELECT * FROM vuihoc."NHAT_KY_NGHIEP_VU" ORDER BY thoigian DESC LIMIT 1')).rows[0];
 assert.equal(audit.maxacthuc,'11111111-1111-4111-8111-111111111111');
 assert.ok(audit.truongthaydoi.includes('lichranh'));
 assert.notDeepEqual(audit.dulieutruoc.lichranh,audit.dulieusau.lichranh);
 const count=async()=>Number((await db.query('SELECT count(*)::int n FROM vuihoc."NHAT_KY_NGHIEP_VU"')).rows[0].n);
 const before=await count();
 await db.exec('UPDATE vuihoc."GIAO_VIEN" SET hoten=hoten; UPDATE vuihoc."TUY_CHON_NGUOI_DUNG" SET phanhedangchon=2;');
 assert.equal(await count(),before,'No-op and navigation should not create business history');
 await db.exec('BEGIN; UPDATE vuihoc."GIAO_VIEN" SET hoten=\'rollback\' WHERE madinhdanh=\'GV-001\'; ROLLBACK;');
 assert.equal(await count(),before);
 await db.exec('BEGIN');
 await assert.rejects(db.exec('UPDATE vuihoc."HOC_SINH" SET mamonhoc=\'MISSING\' WHERE madinhdanh=\'HS-2026-001\'; SET CONSTRAINTS ALL IMMEDIATE;'));
 await db.exec('ROLLBACK');
 await db.exec(readFileSync('supabase/verify_schema.sql','utf8'));
 console.log(JSON.stringify({tables:32,interfaceFields:fieldCount,mappedFields:columnCount,seedRowsRoundTripped:rowCount,audit:'passed',foreignKeyRejection:'passed'}));
 console.log('This verifies the database contract, not live UI persistence or Supabase Auth/RLS integration.');
} finally { await db.close(); }
