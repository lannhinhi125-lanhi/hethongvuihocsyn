import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite(mkdtempSync(join(tmpdir(),'vuihoc-fk-')),{extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
const file=p=>readFileSync(p,'utf8');
const rpc=async(name,args)=>(await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
try {
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 await db.exec(file('supabase/schema.sql').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(file('supabase/seed_test_data.sql'));
 await db.exec(file('supabase/upgrade_incident_payroll.sql'));
 await db.exec(file('supabase/migrations/20261013_teacher_live_payroll.sql'));
 await db.exec(file('supabase/migrations/20261014_report_creation_dates.sql'));
 await db.exec(file('supabase/setup_admin.sql').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 await db.exec(file('supabase/apply_relational_update.sql'));
 await db.exec(file('supabase/migrations/20261015_remove_remaining_json.sql'));
 const admin=await rpc('vuihoc_login',['admin.tong','234567']);
 await db.exec(file('supabase/migrations/20261016_complete_foreign_keys.sql'));

 await db.exec(file('supabase/migrations/20261017_session_workflow.sql'));

 await db.exec(file('supabase/migrations/20261018_auto_checkout.sql'));

 await db.exec(file('supabase/migrations/20261020_remove_general_audit.sql'));
 const before=(await db.query('SELECT mabuoi,mahocsinh,noidung FROM vuihoc."NHAN_XET_BUOI_HOC" ORDER BY mabuoi,mahocsinh')).rows;
 const migration=file('supabase/migrations/20261021_manual_student_feedback.sql');
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual((await db.query('SELECT mabuoi,mahocsinh,noidung FROM vuihoc."NHAN_XET_BUOI_HOC" ORDER BY mabuoi,mahocsinh')).rows,before);
 for(const table of ['TIEU_CHI_NHAN_XET','NHOM_TIEU_CHI','TIEU_CHI','LUA_CHON_TIEU_CHI'])assert.equal((await db.query('SELECT to_regclass($1) r',['vuihoc."'+table+'"'])).rows[0].r,null);
 const data=await rpc('vuihoc_business_data',[admin.token]);assert.equal(data.criteria_categories,undefined);
 for(const cls of data.classes)for(const session of Object.values(cls.chitietcahoc || {}))assert.ok(!('feedbackCriteria' in session));
 assert.ok(data.sop_documents.length>0,'Chatbot documents remain');
 const {lichsulophoc,ngaytao,...student}=data.students[0];
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'students',before:student,after:{...student,hoten:student.hoten+' updated'}}]]);
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'criteria_categories',before:null,after:{madinhdanh:'REMOVED'}}]]));
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 console.log('PASS: criteria removed; existing handwritten feedback preserved; read/write API works; no JSON; chatbot retained; migration rerun');
} catch(error){console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;} finally {await db.close();}
