import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
// The historical schema fixture has a stray quote in its incident RPC body.
// Repair that fixture in memory only; do not modify the deployed schema.
const file=p=>readFileSync(p,'utf8').replace("END IF;'\n SELECT * INTO cls", "END IF;\n SELECT * INTO cls");
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
 const runVerification=async()=>process.argv.includes('--reporting-fixture')?(await import('./demoReportingEnrichmentCases.mjs')).verifyDemoReportingEnrichment(db):process.argv.includes('--completed-credit')?(await import('./completedLessonCreditCases.mjs')).verifyCompletedLessonCredit(db):verify();
 if(process.argv.includes('--legacy')) { await runVerification(); } else {
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
 await db.exec(file('supabase/migrations/20261213_profile_only_student_import.sql'));


 await runVerification();
 }
}catch(e){console.error(JSON.stringify({message:e.message,detail:e.detail,where:e.where,position:e.position}));process.exitCode=1;}finally{await db.close();}

async function verify() {
 const scalar=async sql=>(await db.query(sql)).rows[0].n;
 // Retained classes may still point to teachers being removed by the reset.
 await db.exec(`INSERT INTO vuihoc."LOP_HOC"
  SELECT (jsonb_populate_record(NULL::vuihoc."LOP_HOC",to_jsonb(l)||
   jsonb_build_object('madinhdanh','KEEP-CLASS','malophoc','KEEP-CLASS'))).*
  FROM vuihoc."LOP_HOC" l ORDER BY l.madinhdanh LIMIT 1;
  INSERT INTO vuihoc."LICH_LOP" SELECT 'KEEP-CLASS',thutu,thutrongtuan,makhunggio
   FROM vuihoc."LICH_LOP" WHERE malop=(SELECT madinhdanh FROM vuihoc."LOP_HOC" WHERE madinhdanh<>'KEEP-CLASS' ORDER BY madinhdanh LIMIT 1)`);
 const keptSchedule=(await db.query(`SELECT * FROM vuihoc."LICH_LOP" WHERE malop='KEEP-CLASS' ORDER BY thutu`)).rows;
 const adminSql=`SELECT u.* FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' ORDER BY u.madinhdanh`;
 const admins=(await db.query(adminSql)).rows;
 const catalogs=['MON_HOC','TRINH_DO','KHUNG_GIO','MO_HINH_LOP','NHOM_QUYEN'];
 const snapshots=new Map();for(const t of catalogs)snapshots.set(t,(await db.query('SELECT * FROM vuihoc."'+t+'" ORDER BY 1')).rows);
 const retained=(await db.query(`SELECT madinhdanh FROM vuihoc."LOP_HOC" WHERE madinhdanh !~ '^DEMO-LOP-[0-9]{3}$' ORDER BY 1`)).rows;
 const run=()=>db.exec(file('supabase/reset_demo_aug_nov_2026.sql'));
 await run();
 assert.equal(await scalar('SELECT count(*)::int n FROM vuihoc."GIAO_VIEN"'),24);
 assert.equal(await scalar('SELECT count(*)::int n FROM vuihoc."HOC_SINH"'),120);
 assert.equal(await scalar('SELECT count(DISTINCT hoten)::int n FROM vuihoc."HOC_SINH"'),120);
 assert.equal(await scalar(`SELECT count(*)::int n FROM vuihoc."LOP_HOC" WHERE madinhdanh LIKE 'DEMO-LOP-%'`),24);
 assert.deepEqual((await db.query(`SELECT madinhdanh FROM vuihoc."LOP_HOC" WHERE madinhdanh !~ '^DEMO-LOP-[0-9]{3}$' ORDER BY 1`)).rows,retained);
 assert.deepEqual((await db.query(`SELECT * FROM vuihoc."LICH_LOP" WHERE malop='KEEP-CLASS' ORDER BY thutu`)).rows,keptSchedule);
 assert.equal((await db.query(`SELECT magiaovien FROM vuihoc."LOP_HOC" WHERE madinhdanh='KEEP-CLASS'`)).rows[0].magiaovien,null);
 assert.equal(await scalar(`SELECT count(DISTINCT to_char(ngayhoc,'YYYY-MM'))::int n FROM vuihoc."BUOI_HOC" WHERE ngayhoc BETWEEN '2026-08-01' AND '2026-11-30'`),4);
 assert.equal(await scalar(`SELECT count(*)::int n FROM vuihoc."TRUY_VET_XEP_LOP" WHERE malopcu IS NOT NULL AND malopmoi IS NOT NULL`),4);
 assert.equal(await scalar(`SELECT count(*)::int n FROM vuihoc."BANG_CONG_THANG" WHERE kycong IN ('2026-08','2026-09') AND dakhoa`),2);
 assert.equal(await scalar(`SELECT count(DISTINCT trangthai)::int n FROM vuihoc."GIAI_TRINH_CONG_DAY"`),3);
 assert.equal(await scalar(`SELECT count(DISTINCT trangthai)::int n FROM vuihoc."SU_CO_BUOI_HOC"`),2);
 assert.ok(await scalar(`SELECT count(*)::int n FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" WHERE kycong='2026-10' AND NOT dagui`)>0);
 assert.ok(await scalar(`SELECT count(*)::int n FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" WHERE kycong='2026-10' AND dagui`)>0);
 const slotSource=(await db.query(`SELECT to_regclass('vuihoc."V_KHUNG_GIO"') IS NOT NULL yes`)).rows[0].yes?'V_KHUNG_GIO':'KHUNG_GIO';
 assert.equal(await scalar(`WITH duties AS (
  SELECT b.madinhdanh,b.ngayhoc,b.magiaovienchinh teacher,k.khoanggio FROM vuihoc."BUOI_HOC" b JOIN vuihoc."${slotSource}" k ON k.madinhdanh=b.makhunggio
  UNION ALL SELECT b.madinhdanh,b.ngayhoc,b.magiaoviendaythay,k.khoanggio FROM vuihoc."BUOI_HOC" b JOIN vuihoc."${slotSource}" k ON k.madinhdanh=b.makhunggio WHERE b.magiaoviendaythay IS NOT NULL)
  SELECT count(*)::int n FROM duties a JOIN duties b ON a.teacher=b.teacher AND a.ngayhoc=b.ngayhoc AND a.madinhdanh<b.madinhdanh
  WHERE split_part(a.khoanggio,'-',1)::time<split_part(b.khoanggio,'-',2)::time AND split_part(b.khoanggio,'-',1)::time<split_part(a.khoanggio,'-',2)::time`),0,'teachers have no overlapping main/cover lessons');
 assert.equal(await scalar(`SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE b.ngayhoc>=(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date`),0);
 const moved=(await db.query(`SELECT mahocsinh,malopcu,malopmoi FROM vuihoc."TRUY_VET_XEP_LOP" WHERE malopcu IS NOT NULL AND malopmoi IS NOT NULL`)).rows;
 for(const t of moved) {
  for(const [op,cls] of [['<',t.malopcu],['>=',t.malopmoi]]) {
   assert.ok((await db.query(`SELECT count(*)::int n FROM vuihoc."NHAN_XET_BUOI_HOC" n JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi WHERE n.mahocsinh=$1 AND b.malop=$2 AND b.ngayhoc `+op+` date '2026-09-15'`,[t.mahocsinh,cls])).rows[0].n>0,'history follows transfer date');
  }
  assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."NHAN_XET_BUOI_HOC" n JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi WHERE n.mahocsinh=$1 AND b.malop=$2 AND b.ngayhoc>=date '2026-09-15'`,[t.mahocsinh,t.malopcu])).rows[0].n,0);
 }
 const counts=(await db.query(`SELECT (SELECT count(*) FROM vuihoc."BUOI_HOC") lessons,(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC") work,(SELECT count(*) FROM vuihoc."SU_CO_BUOI_HOC") incidents,(SELECT count(*) FROM vuihoc."GIAI_TRINH_CONG_DAY") disputes`)).rows[0];
 console.log('COUNTS',JSON.stringify(counts));
 const loads=(await db.query(`SELECT g.madinhdanh,count(c.madinhdanh)::int n FROM vuihoc."GIAO_VIEN" g LEFT JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.magiaovien=g.madinhdanh GROUP BY g.madinhdanh`)).rows.map(r=>r.n);
 assert.ok(Math.max(...loads)>Math.min(...loads)+20);
 for(const t of catalogs)assert.deepEqual((await db.query('SELECT * FROM vuihoc."'+t+'" ORDER BY 1')).rows,snapshots.get(t),t+' preserved');
 assert.deepEqual((await db.query(adminSql)).rows,admins);
 const modes=(await db.query('SELECT tgrelid,tgname,tgenabled FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgrelid,tgname')).rows;
 await run();
 assert.deepEqual((await db.query('SELECT tgrelid,tgname,tgenabled FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgrelid,tgname')).rows,modes);
 assert.equal(await scalar('SELECT count(*)::int n FROM vuihoc."BUOI_HOC"'),Number(counts.lessons));
 assert.equal(await scalar('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC"'),Number(counts.work));
 await db.exec('BEGIN');
 await assert.rejects(db.exec(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=hesocong+1,ghichu='attempt locked edit' WHERE madinhdanh=(SELECT c.madinhdanh FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE b.ngayhoc<date '2026-10-01' LIMIT 1)`),/kh\u00f3a/i);
 await db.exec('ROLLBACK');
 const session=(await db.query("SELECT public.vuihoc_login('admin.tong','234567') v")).rows[0].v;
 const business=(await db.query('SELECT public.vuihoc_business_data($1) v',[session.token])).rows[0].v;
 assert.equal(business.students.length,120);assert.equal(business.teachers.length,24);
 await db.exec(`CREATE TABLE public.rich_demo_dependency(id text REFERENCES vuihoc."BUOI_HOC"(madinhdanh)); INSERT INTO public.rich_demo_dependency SELECT madinhdanh FROM vuihoc."BUOI_HOC" LIMIT 1`);
 await assert.rejects(run(),/foreign key|constraint/i);
 assert.equal(await scalar('SELECT count(*)::int n FROM vuihoc."BUOI_HOC"'),Number(counts.lessons));
 console.log('PASS rich demo: historical transfers, future scheduling, generated work, locks, preservation, rerun, atomic rollback');
}
