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
 const lessonsBefore=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows;
 const migration=file('supabase/migrations/20261023_inspection_session_queries.sql');
 await db.exec(migration);await db.exec(migration);
 const data=await rpc('vuihoc_business_data',[admin.token]);
 for(const lesson of data.dated_lessons){
  const expectedStudents=(await db.query('SELECT mahocsinh FROM vuihoc."DIEM_DANH_BUOI_HOC" WHERE mabuoi=$1 UNION SELECT mahocsinh FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=$1 ORDER BY mahocsinh',[lesson.madinhdanh])).rows.map(r=>r.mahocsinh);
  assert.deepEqual(lesson.thongtindugio.studentIds,expectedStudents);
  const attendance=(await db.query('SELECT mahocsinh,trangthai FROM vuihoc."DIEM_DANH_BUOI_HOC" WHERE mabuoi=$1',[lesson.madinhdanh])).rows;
  assert.deepEqual(lesson.thongtindugio.attendance,Object.fromEntries(attendance.map(r=>[r.mahocsinh,r.trangthai])));
  const feedback=(await db.query('SELECT mahocsinh,noidung FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=$1',[lesson.madinhdanh])).rows;
  assert.deepEqual(lesson.thongtindugio.feedback,Object.fromEntries(feedback.map(r=>[r.mahocsinh,r.noidung])));
 }
 assert.ok(data.dated_lessons.some(b=>Object.keys(b.thongtindugio.feedback).length),'Fixture must include actual student feedback');
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows,lessonsBefore,'Migration and SELECT must not mutate teaching sessions');
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 const lesson=data.dated_lessons[0];
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'dated_lessons',before:lesson,after:lesson}]]),/chỉ được truy vấn/);
 console.log('PASS: exact lesson FK joins for attendance, feedback and roster; read-only API; idempotent migration; no stored JSON.');
 if(process.env.TEST_REMOVE_SAMPLE_LESSONS){
  const cleanup=file('supabase/migrations/20261024_remove_sample_lessons.sql');
  assert.ok(cleanup.includes('DO $cleanup$'));
  assert.ok(!cleanup.includes('CREATE TEMP TABLE'),'Cleanup must run in one SQL statement without temporary tables');
  const reports=(await db.query('SELECT madinhdanh FROM vuihoc."BIEN_BAN_DU_GIO" ORDER BY madinhdanh')).rows;
  const classesBefore=(await db.query('SELECT madinhdanh FROM vuihoc."LOP_HOC" ORDER BY madinhdanh')).rows;
  const studentsBefore=(await db.query('SELECT * FROM vuihoc."HOC_SINH" ORDER BY madinhdanh')).rows;
  // An actual lesson in an originally seeded class must survive cleanup.
  const base=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" WHERE malop=$1 LIMIT 1',['CLS-002'])).rows[0];
  await db.query('INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,lienketphonghoc) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
   ['REAL-LESSON',base.malop,'2026-11-02',base.makhunggio,base.batdau,base.ketthuc,base.magiaovienchinh,'https://zoom.us/j/real']);
  await db.exec("UPDATE vuihoc.\"BANG_CONG_THANG\" SET dakhoa=true WHERE kycong='2026-10'");
  await assert.rejects(db.exec(cleanup),/đã khóa/);await db.exec('ROLLBACK');
  await db.exec("UPDATE vuihoc.\"BANG_CONG_THANG\" SET dakhoa=false WHERE kycong='2026-10'");
  await db.exec(cleanup);await db.exec(cleanup);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',['REAL-LESSON'])).rows[0].n,1);
  assert.equal((await db.query("SELECT count(*)::int n FROM vuihoc.\"BUOI_HOC\" WHERE lienketphonghoc LIKE 'https://example.com/%'")).rows[0].n,0);
  assert.deepEqual((await db.query('SELECT madinhdanh FROM vuihoc."BIEN_BAN_DU_GIO" ORDER BY madinhdanh')).rows,reports);
  assert.deepEqual((await db.query('SELECT madinhdanh FROM vuihoc."LOP_HOC" ORDER BY madinhdanh')).rows,classesBefore);
  assert.deepEqual((await db.query('SELECT * FROM vuihoc."HOC_SINH" ORDER BY madinhdanh')).rows,studentsBefore);
  console.log('PASS: sample lesson cleanup; real lesson and reports preserved; locked payroll rollback; safe rerun.');
  await db.exec(`INSERT INTO vuihoc."BIEN_BAN_DU_GIO"
   SELECT (jsonb_populate_record(NULL::vuihoc."BIEN_BAN_DU_GIO",to_jsonb(e)||jsonb_build_object(
    'madinhdanh','REAL-EVALUATION','mabienban','REAL-EVALUATION','nhanxetchung','Actual evaluation'))).*
   FROM vuihoc."BIEN_BAN_DU_GIO" e WHERE e.magiaovien='GV-001' LIMIT 1`);
  const realEvaluation=(await db.query('SELECT * FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh=$1',['REAL-EVALUATION'])).rows;
  assert.equal(realEvaluation.length,1);
  const cleanupEvaluations=file('supabase/migrations/20261025_remove_sample_evaluations.sql');
  await db.exec(cleanupEvaluations);await db.exec(cleanupEvaluations);
  assert.deepEqual((await db.query('SELECT * FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh=$1',['REAL-EVALUATION'])).rows,realEvaluation);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh IN ($1,$2)',['EVAL-GV-001','EVAL-GV-002'])).rows[0].n,0);
  const summary=(await db.query('SELECT trangthaidanhgia,diemdanhgia,nhanxetdanhgia,diemtc1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=$1',['GV-002'])).rows[0];
  assert.deepEqual(summary,{trangthaidanhgia:'UNSCORED',diemdanhgia:null,nhanxetdanhgia:'',diemtc1:null});
  console.log('PASS: sample evaluations removed; real evaluation preserved; stale status/score cleared; safe rerun.');
 }
} catch(error) { console.error(error.message, error.detail || '', error.where || ''); process.exitCode=1; }
finally {await db.close();}
