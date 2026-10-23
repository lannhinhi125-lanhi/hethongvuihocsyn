// Focused fixture for uploader RPC behavior; latest-schema coverage also runs
// in reenrollmentClassDuration.test.mjs after all normalization migrations.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyDocumentUploaders} from './documentUploaderCases.mjs';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
const file=p=>readFileSync(p,'utf8');
try{
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 await db.exec(file('supabase/schema.sql').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(file('supabase/seed_test_data.sql'));
 await db.exec(file('supabase/upgrade_incident_payroll.sql'));
 await db.exec(file('supabase/migrations/20261013_teacher_live_payroll.sql'));
 await db.exec(file('supabase/migrations/20261014_report_creation_dates.sql'));
 await db.exec(file('supabase/setup_admin.sql').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 await db.exec(file('supabase/apply_relational_update.sql'));
 await db.exec(file('supabase/migrations/20261015_remove_remaining_json.sql'));
 for(const name of ['20261016_complete_foreign_keys','20261017_session_workflow','20261018_auto_checkout','20261020_remove_general_audit','20261021_manual_student_feedback','20261022_document_categories','20261028_document_drive_catalog','20261030_update_existing_business_rows'])await db.exec(file('supabase/migrations/'+name+'.sql'));
 const token=(await db.query("SELECT public.vuihoc_login('admin.tong','234567') v")).rows[0].v.token;
 await verifyDocumentUploaders(db,token);
 for(const name of ['20261106_teacher_chat_questions','20261107_teacher_question_history','20261108_chat_history_accounts'])await db.exec(file('supabase/migrations/'+name+'.sql'));
 await (await import('./aiConfigurationChatCases.mjs')).verifyAIConfigurationChat(db,token);
 // This focused fixture predates report-template 20261202; the bundle must stop.
 const assert=(await import('node:assert/strict')).default;
 await assert.rejects(()=>db.exec(file('supabase/apply_documents_ai_update.sql')),/hoàn tất migration 20261202/);
 await db.exec('ROLLBACK');
 await (await import('./teacherGradeNormalizationCases.mjs')).verifyTeacherGradeNormalization(db,token);
}catch(e){console.error(e);process.exitCode=1;}finally{await db.close();}
