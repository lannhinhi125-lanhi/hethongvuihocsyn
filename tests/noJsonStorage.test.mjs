import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
if(!root)throw new Error('Set PGLITE_MODULE_PATH to an installed @electric-sql/pglite directory');
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite(mkdtempSync(join(tmpdir(),'vuihoc-no-json-')),{extensions:{pgcrypto},initialMemory:128*1024*1024,
 postgresqlconf:'shared_buffers=8MB'});
const file=p=>readFileSync(p,'utf8');
const rpc=async(name,args)=>(await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
try {
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 console.log('Installing baseline');
 await db.exec(file('supabase/schema.sql').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(file('supabase/seed_test_data.sql'));
 await db.exec(file('supabase/upgrade_incident_payroll.sql'));
 await db.exec(file('supabase/migrations/20261013_teacher_live_payroll.sql'));
 await db.exec(file('supabase/migrations/20261014_report_creation_dates.sql'));
 await db.exec(file('supabase/setup_admin.sql').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 await db.exec(file('supabase/apply_relational_update.sql'));
 const admin=await rpc('vuihoc_login',['admin.tong','234567']);
 const before=await rpc('vuihoc_business_data',[admin.token]);
 console.log('Applying migration');
 const migration=file('supabase/migrations/20261015_remove_remaining_json.sql');
 const sourceMaterials=(await db.query('SELECT hoclieu FROM vuihoc."LOP_HOC" WHERE madinhdanh=$1',['CLS-001'])).rows[0].hoclieu;
 await db.query('UPDATE vuihoc."LOP_HOC" SET hoclieu=$1 WHERE madinhdanh=$2',[[{month:'11/2026',week:'Week 1',session:1,title:'Unknown',slide:'',lms:'',unmapped:'preserve me'}],'CLS-001']);
 await assert.rejects(db.exec(migration),/ánh xạ/);
 await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type='jsonb'")).rows[0].n,6);
 await db.query('UPDATE vuihoc."LOP_HOC" SET hoclieu=$1 WHERE madinhdanh=$2',[sourceMaterials,'CLS-001']);
 await db.exec('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true');
 const creditsBefore=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
 await db.exec(migration);
 await db.exec(migration);
 if(process.env.TEST_FOREIGN_KEYS)await db.exec(file('supabase/migrations/20261016_complete_foreign_keys.sql'));
 if(process.env.TEST_MONITORING_STATE)await db.exec(file('supabase/migrations/20261017_session_workflow.sql'));
 if(process.env.TEST_AUTO_CHECKOUT)await db.exec(file('supabase/migrations/20261018_auto_checkout.sql'));
 if(process.env.TEST_CLASS_TRACE)await db.exec(file('supabase/migrations/20261019_student_class_trace.sql'));
 if(process.env.TEST_REMOVE_AUDIT)await db.exec(file('supabase/migrations/20261020_remove_general_audit.sql'));
 if(process.env.TEST_MANUAL_FEEDBACK)await db.exec(file('supabase/migrations/20261021_manual_student_feedback.sql'));
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows,creditsBefore,'Conversion must not change locked payroll');
 assert.ok((await db.query('SELECT bool_and(dakhoa) yes FROM vuihoc."BANG_CONG_THANG"')).rows[0].yes);
 await db.exec('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=false');
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 const after=await rpc('vuihoc_business_data',[admin.token]);
 for(const cls of before.classes){
  const next=after.classes.find(c=>c.madinhdanh===cls.madinhdanh);
  assert.deepEqual(next.hoclieu,cls.hoclieu);
  for(const [key,s] of Object.entries(cls.chitietcahoc||{})) {
   const saved=next.chitietcahoc[key];
   for(const [field,value] of Object.entries(s)) {
    if(['checkinAt','checkoutAt'].includes(field)) assert.equal(new Date(saved[field]).getTime(),new Date(value).getTime());
    else if(!(process.env.TEST_MANUAL_FEEDBACK && field==='feedbackCriteria') && field!=='coverTeacherName' && !(process.env.TEST_MONITORING_STATE && ['status','feedback'].includes(field))) assert.deepEqual(saved[field],value,`${cls.madinhdanh}.${key}.${field}`);
   }
  }
 }
 for(const teacher of before.teachers)assert.deepEqual(after.teachers.find(t=>t.madinhdanh===teacher.madinhdanh).diemtieuchi,teacher.diemtieuchi);
 const clean=row=>Object.fromEntries(Object.entries(row).filter(([k])=>!['ngaytao','tiendonhanxet','lichsulophoc'].includes(k)));
 let cls=clean(after.classes.find(c=>c.madinhdanh==='CLS-001'));
 const material={month:'11/2026',week:'Week 1',session:1,title:'Column storage',slide:'https://example.com/slide',lms:'https://example.com/lms'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[material]}}]]);
 let fresh=await rpc('vuihoc_business_data',[admin.token]);
 cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.deepEqual(cls.hoclieu,[material]);
 assert.equal((await db.query('SELECT tieude FROM vuihoc."HOC_LIEU_LOP" WHERE malop=$1',[cls.madinhdanh])).rows[0].tieude,material.title);
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[{...material,title:'Updated title'}]}}]]);
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[]}}]]),/thay đổi/);
 fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.equal(cls.hoclieu[0].title,'Updated title');
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[]}}]]);
 fresh=await rpc('vuihoc_business_data',[admin.token]);
 cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.deepEqual(cls.hoclieu,[]);
 const session={sessionNum:12,dateStr:'2002-11-02 18:00 - 19:30',title:'Saved session',status:'Đang học',
  materialGv:'slide',materialHs:'student',exerciseLms:'lms',checkinAt:'2002-11-02T18:00:00+07:00',attendance:{},feedback:{}};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,chitietcahoc:{...cls.chitietcahoc,12:session}}}]]);
 fresh=await rpc('vuihoc_business_data',[admin.token]);
 cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.equal(cls.chitietcahoc[12].title,session.title);
 assert.equal((await db.query('SELECT tieude FROM vuihoc."CHI_TIET_CA_LOP" WHERE malop=$1 AND khoaca=$2',[cls.madinhdanh,'12'])).rows[0].tieude,session.title);
 const complete={...cls.chitietcahoc[12],status:'Đã hoàn thành',checkoutAt:'2002-11-02T19:30:00+07:00',
  feedback:Object.fromEntries(cls.danhsachmahocsinh.map(id=>[id,'Saved comment'])),attendance:Object.fromEntries(cls.danhsachmahocsinh.map(id=>[id,'present']))};
 if(process.env.TEST_MONITORING_STATE) {
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,chitietcahoc:{...cls.chitietcahoc,12:{...complete,feedback:{}}}}}]]);
  fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
  assert.equal(cls.chitietcahoc[12].status,'Đã hoàn thành');
  const emptyLesson=fresh.dated_lessons.find(l=>l.malop===cls.madinhdanh && l.ngayhoc==='2002-11-02');
  assert.equal(emptyLesson.tiendonhanxet.completed,0);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',[emptyLesson.madinhdanh])).rows[0].n,0);
 }
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,chitietcahoc:{...cls.chitietcahoc,12:complete}}}]]);
 const completed=(await db.query('SELECT b.madinhdanh,b.trangthai FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE c.malop=$1 AND c.khoaca=$2',[cls.madinhdanh,'12'])).rows[0];
 assert.equal(completed.trangthai,process.env.TEST_MONITORING_STATE?'DA_HOC':'HOAN_THANH');
 assert.ok((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',[completed.madinhdanh])).rows[0].n>0);
 fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 const previous=fresh.teacher_evaluations[0];
 const teachingBefore=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows;
 const teachersBefore=(await db.query('SELECT * FROM vuihoc."GIAO_VIEN" ORDER BY madinhdanh')).rows;
 const evaluation={...clean(previous),madinhdanh:'NO-JSON-EVAL',mabienban:'NO-JSON-EVAL',diemtieuchi:{tc1:7,tc2:8,tc3:9}};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'teacher_evaluations',before:null,after:evaluation}]]);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows,teachingBefore,'Saving an inspection must not update teaching sessions');
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."GIAO_VIEN" ORDER BY madinhdanh')).rows,teachersBefore,'Saving an inspection must not update teacher profiles');
 assert.deepEqual((await db.query('SELECT diemtc1,diemtc2,diemtc3 FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh=$1',[evaluation.madinhdanh])).rows[0],{diemtc1:'7',diemtc2:'8',diemtc3:'9'});
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'teacher_evaluations',before:evaluation,after:{...evaluation,diemtieuchi:{tc1:11,tc2:8,tc3:9}}}]]),/check constraint/);
 const ownTeacher=before.teachers.find(t=>t.madinhdanh===cls.magiaovien);
 const account=(await db.query('SELECT tendangnhap,matkhau FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[ownTeacher.manguoidung])).rows[0];
 const teacherLogin=await rpc('vuihoc_login',[account.tendangnhap,account.matkhau]);
 assert.ok(teacherLogin.token);
 const teacherData=await rpc('vuihoc_business_data',[teacherLogin.token]);
 let ownClass=clean(teacherData.classes.find(c=>c.madinhdanh===cls.madinhdanh));
 assert.ok(ownClass.chitietcahoc[12]);
 if(process.env.TEST_MONITORING_STATE) {
  const student=Object.keys(ownClass.chitietcahoc[12].feedback)[0];
  const changed={...ownClass,chitietcahoc:{...ownClass.chitietcahoc,12:{...ownClass.chitietcahoc[12],feedback:{...ownClass.chitietcahoc[12].feedback,[student]:'Giáo viên sửa sau checkout'}}}};
  await rpc('vuihoc_save_business',[teacherLogin.token,[{dataset:'classes',before:ownClass,after:changed}]]);
  const savedTeacher=await rpc('vuihoc_business_data',[teacherLogin.token]);
  ownClass=clean(savedTeacher.classes.find(c=>c.madinhdanh===cls.madinhdanh));
  if(process.env.TEST_MANUAL_FEEDBACK) {
   const author=(await db.query('SELECT manguoicapnhat FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=$1 AND mahocsinh=$2',[completed.madinhdanh,student])).rows[0];
   assert.equal(author.manguoicapnhat,ownTeacher.manguoidung);
  }
  assert.equal(savedTeacher.classes.find(c=>c.madinhdanh===cls.madinhdanh).chitietcahoc[12].feedback[student],'Giáo viên sửa sau checkout');
  fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 }

 await assert.rejects(rpc('vuihoc_save_business',[teacherLogin.token,[{dataset:'classes',before:ownClass,after:{...ownClass,hoclieu:[material]}}]]),/quyền/);
 const substitute=before.teachers.find(t=>t.madinhdanh!==ownTeacher.madinhdanh&&t.mamonhoc===ownTeacher.mamonhoc);
 const cover={sessionNum:13,dateStr:'2002-11-03 18:00 - 19:30',teacherId:substitute.madinhdanh,teacherName:substitute.hoten};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,phancongdaythay:[cover]}}]]);
 fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.deepEqual(cls.phancongdaythay,[cover]);
 await rpc('vuihoc_report_lesson_incident',[admin.token,cls.malophoc,'2002-11-03','18:00 - 19:30','INC-TCH-03','No JSON incident test']);
 const lesson=clean((await rpc('vuihoc_business_data',[admin.token])).dated_lessons.find(l=>l.madinhdanh===completed.madinhdanh));
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'dated_lessons',before:lesson,after:{...lesson,hoclieu:{slide:'slide-url',materialHs:'student-url',lms:'exercise-url'}}}]]);
 const lessonAfter=(await rpc('vuihoc_business_data',[admin.token])).dated_lessons.find(l=>l.madinhdanh===lesson.madinhdanh);
 assert.deepEqual(lessonAfter.hoclieu,{slide:'slide-url',materialHs:'student-url',lms:'exercise-url'});
 const refreshedTeacher=await rpc('vuihoc_business_data',[teacherLogin.token]);
 const teacherClass=clean(refreshedTeacher.classes.find(c=>c.madinhdanh===cls.madinhdanh));
 await rpc('vuihoc_save_business',[teacherLogin.token,[{dataset:'classes',before:teacherClass,after:{...teacherClass,
  chitietcahoc:{...teacherClass.chitietcahoc,14:{sessionNum:14,dateStr:'2002-11-04 18:00 - 19:30',title:'Teacher check-in',
   status:'Đang học',checkinAt:'2002-11-04T18:00:00+07:00',checkinUserId:ownTeacher.manguoidung,
   materialGv:'',materialHs:'',exerciseLms:''}}}}]]);
 assert.equal((await rpc('vuihoc_business_data',[teacherLogin.token])).classes.find(c=>c.madinhdanh===cls.madinhdanh).chitietcahoc[14].title,'Teacher check-in');
 const newTeacher=await rpc('vuihoc_create_teacher',[admin.token,{
  hoten:'No JSON teacher',thudientu:'no-json@example.com',sodienthoai:'',mamonhoc:'SUB-MATH',macaphoc:'CAP-TH',
  danhsachkhoi:['Lớp 3'],danhsachmohinh:['1-3'],bangcap:'Test',ngaybatdau:'2026-10-15',ngayketthuc:''}]);
 assert.ok(newTeacher.id);
 assert.deepEqual(newTeacher.teacher.danhsachmohinh,['1-3']);
 const security=(await db.query(`SELECT c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') canread
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='vuihoc' AND c.relname IN ('HOC_LIEU_LOP','PHAN_CONG_DAY_THAY','CHI_TIET_CA_LOP')`)).rows;
 assert.equal(security.length,3);assert.ok(security.every(t=>t.relrowsecurity&&!t.canread));
 assert.equal((await db.query("SELECT has_function_privilege('anon','vuihoc.ghi_cac_truong_con(text,jsonb,boolean)','EXECUTE') allowed")).rows[0].allowed,false);
 fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[{...material,unknown:'must not disappear'}]}}]]),/ánh xạ/);
 await db.exec(file('supabase/diagnostics/relational_storage_audit.sql'));
 await db.exec(file('supabase/verify_schema.sql'));
 console.log('PASS: no JSON columns; repeat/rollback; preservation; locked payroll; materials CRUD; sessions/completion; scores; teacher create/check-in; permissions; covers/incidents; verification SQL');
} catch(error) {
 console.error(error.message,error.detail||'',error.where||'');
 process.exitCode=1;
} finally {await db.close();}
