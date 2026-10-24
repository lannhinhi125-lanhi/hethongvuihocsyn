import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
const file=p=>readFileSync(p,'utf8');
try {
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 await db.exec(file('supabase/schema.sql').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(file('supabase/seed_test_data.sql'));
 for(const path of ['supabase/upgrade_incident_payroll.sql','supabase/migrations/20261013_teacher_live_payroll.sql','supabase/migrations/20261014_report_creation_dates.sql'])await db.exec(file(path));
 await db.exec(file('supabase/setup_admin.sql').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 await db.exec(file('supabase/apply_relational_update.sql'));
 for(const name of ['20261015_remove_remaining_json','20261016_complete_foreign_keys','20261017_session_workflow','20261018_auto_checkout','20261020_remove_general_audit','20261021_manual_student_feedback','20261022_document_categories','20261023_inspection_session_queries','20261026_student_subject_enrollments','20261027_standardize_inspection_scores','20261028_document_drive_catalog'])await db.exec(file('supabase/migrations/'+name+'.sql'));
 await db.exec(file('supabase/fix_profile_class_updates.sql'));
 await db.exec(file('supabase/cleanup_unused_tables.sql'));
 await db.exec(file('supabase/setup_teacher_question_history.sql'));
 await db.exec(file('supabase/reset_demo_dataset.sql'));
 await db.exec(file('supabase/migrations/20261109_reenrollment_class_duration.sql'));
 await db.exec(file('supabase/migrations/20261109_reenrollment_class_duration.sql'));
 console.log('PASS migration applies twice');
 await db.exec(file('supabase/migrations/20261110_temporary_class_pause.sql'));
 await db.exec(file('supabase/migrations/20261110_temporary_class_pause.sql'));
 for (const name of ['20261111_class_pause_reason','20261112_class_pause_reason_catalog','20261113_class_pause_reporting','20261114_catalog_query_consistency']) {
  await db.exec(file('supabase/migrations/'+name+'.sql'));
  await db.exec(file('supabase/migrations/'+name+'.sql'));
 }
 const {readdirSync}=await import('node:fs');
 await db.exec(file('supabase/migrations/20261111_custom_class_end_date.sql'));
 await db.exec(file('supabase/migrations/20261113_end_classes_material_guard.sql'));
 for(const name of readdirSync('supabase/migrations').filter(n=>n>='20261115'&&n<'20261213'&&n.endsWith('.sql')).sort()){
  if(name.startsWith('20261205')){await db.exec(file('supabase/apply_documents_ai_update.sql'));await db.exec(file('supabase/migrations/20261207_stable_grade_catalog_writes.sql'));}
  await db.exec(file('supabase/migrations/'+name));
  console.log('Applied '+name);
 }
 const token=(await db.query("SELECT public.vuihoc_login('admin.tong','234567') v")).rows[0].v.token;
 await (await import('./profileImportDatabaseCases.mjs')).verifyProfileOnlyImport(db,token);
 assert.ok((await db.query(file('supabase/diagnostics/final_3nf_schema_review.sql'))).rows.every(r=>r.status==='KHOP_CAU_TRUC_DA_RA'));
 const data=(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const teacher=data.teachers.find(t=>t.danhsachkhoi?.length&&t.danhsachmohinh?.length);assert.ok(teacher);
 const created=(await db.query('SELECT public.vuihoc_create_teacher($1,$2::jsonb) v',[token,JSON.stringify({hoten:'Giáo viên Excel SQL',thudientu:'excel-sql@example.test',sodienthoai:'0901234567',mamonhoc:teacher.mamonhoc,macaphoc:teacher.macaphoc,danhsachkhoi:teacher.danhsachkhoi,danhsachmohinh:teacher.danhsachmohinh,bangcap:''})])).rows[0].v;
 assert.ok(created.id&&created.username&&created.password);
 assert.ok((await db.query('SELECT public.vuihoc_login($1,$2) v',[created.username,created.password])).rows[0].v.token);
 console.log('PASS actual normalized migration chain, 50-table schema contract, imported teacher automatically creates a usable login');
}catch(e){console.error(JSON.stringify({message:e.message,detail:e.detail,where:e.where}));process.exitCode=1;}finally{await db.close();}
