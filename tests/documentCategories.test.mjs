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

 await db.exec(file('supabase/migrations/20261021_manual_student_feedback.sql'));
 const before=(await db.query('SELECT madinhdanh,phanloai,noidung,ngaycapnhat FROM vuihoc."TAI_LIEU_QUY_TRINH"')).rows;
 const migration=file('supabase/migrations/20261022_document_categories.sql');await db.exec(migration);await db.exec(migration);
 const driveMigration=file('supabase/migrations/20261028_document_drive_catalog.sql');
 await db.exec(driveMigration);await db.exec(driveMigration);
 const config=(await db.query('SELECT vuihoc.business_config() config')).rows[0].config;
 assert.equal(config.document_categories.module,'PH2');
 assert.equal(config.document_categories.feature,'Quản lý danh mục loại tài liệu');
 let data=await rpc('vuihoc_business_data',[admin.token]);
 assert.equal(data.document_categories.length,new Set(before.map(row=>row.phanloai)).size);
 for(const old of before){const saved=data.sop_documents.find(doc=>doc.madinhdanh===old.madinhdanh);assert.equal(saved.tenloaitailieu,old.phanloai);assert.equal(saved.noidung,old.noidung);assert.equal(saved.ngaycapnhat,old.ngaycapnhat);}
 const category={madinhdanh:'NEW-TYPE',tenloai:'New category',mota:'User created',danghoatdong:true};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'document_categories',before:null,after:category}]]);
 const {tenloaitailieu,ngaytao,...source}=data.sop_documents[0];
 let doc={...source,madinhdanh:'NEW-TYPE-DOC',maloaitailieu:category.madinhdanh,linkdrive:'https://drive.google.com/file/d/example/view'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'sop_documents',before:null,after:doc}]]);
 data=await rpc('vuihoc_business_data',[admin.token]);assert.equal(data.sop_documents.find(row=>row.madinhdanh===doc.madinhdanh).tenloaitailieu,category.tenloai);
 assert.equal(data.sop_documents.find(row=>row.madinhdanh===doc.madinhdanh).linkdrive,doc.linkdrive);
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'sop_documents',before:null,after:{...doc,madinhdanh:'BAD-URL',linkdrive:'javascript:alert(1)'}}]]),/tai_lieu_drive_url_check/);
 const renamed={...category,tenloai:'Renamed category'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'document_categories',before:category,after:renamed}]]);
 data=await rpc('vuihoc_business_data',[admin.token]);assert.equal(data.sop_documents.find(row=>row.madinhdanh===doc.madinhdanh).tenloaitailieu,renamed.tenloai);
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'document_categories',before:renamed,after:null}]]),/foreign key/);
 const inactive={...renamed,danghoatdong:false};await rpc('vuihoc_save_business',[admin.token,[{dataset:'document_categories',before:renamed,after:inactive}]]);
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'sop_documents',before:null,after:{...doc,madinhdanh:'BAD-INACTIVE'}}]]),/hoạt động/);
 data=await rpc('vuihoc_business_data',[admin.token]);const {tenloaitailieu:label,ngaytao:date,...existing}=data.sop_documents.find(row=>row.madinhdanh===doc.madinhdanh);
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'sop_documents',before:existing,after:{...existing,tieude:'Edit existing inactive category document'}}]]);
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'sop_documents',before:null,after:{...doc,madinhdanh:'BAD-FK',maloaitailieu:'NONEXISTENT'}}]]));
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'sop_documents',before:null,after:{...doc,madinhdanh:'BAD-LABEL',tenloaitailieu:'Injected label'}}]]),/truy/);
 const unused={madinhdanh:'UNUSED-TYPE',tenloai:'Unused',mota:'',danghoatdong:true};await rpc('vuihoc_save_business',[admin.token,[{dataset:'document_categories',before:null,after:unused}]]);
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'document_categories',before:unused,after:null}]]);
 const account=(await db.query('SELECT tendangnhap,matkhau FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=(SELECT manguoidung FROM vuihoc."GIAO_VIEN" WHERE manguoidung IS NOT NULL LIMIT 1)')).rows[0];
 const teacher=await rpc('vuihoc_login',[account.tendangnhap,account.matkhau]);
 await assert.rejects(rpc('vuihoc_save_business',[teacher.token,[{dataset:'document_categories',before:null,after:{...unused,madinhdanh:'TEACHER-TYPE'}}]]),/quyền/);
 assert.equal((await db.query("SELECT has_table_privilege('anon','vuihoc.\"LOAI_TAI_LIEU\"','SELECT') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 console.log('PASS: dynamic document type CRUD, FK, legacy preservation, rename SELECT, inactive validation, teacher permissions, no JSON, migration rerun');
} catch(error){console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;} finally {await db.close();}
