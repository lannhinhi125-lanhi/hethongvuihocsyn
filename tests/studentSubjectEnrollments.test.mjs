import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
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
 for(const migration of ['20261015_remove_remaining_json','20261016_complete_foreign_keys','20261017_session_workflow',
  '20261018_auto_checkout','20261020_remove_general_audit','20261021_manual_student_feedback',
  '20261022_document_categories','20261023_inspection_session_queries','20261026_student_subject_enrollments']) {
  await db.exec(file('supabase/migrations/'+migration+'.sql'));
 }
 const admin=await rpc('vuihoc_login',['admin.tong','234567']);
 const data=()=>rpc('vuihoc_business_data',[admin.token]);
 const clean=({ngaytao,lichsulophoc,thongtindugio,...row})=>row;
 const save=async(ds,before,after)=>rpc('vuihoc_save_business',[admin.token,[{dataset:ds,before:before&&clean(before),after:after&&clean(after)}]]);
 let snapshot=await data();
 const base=snapshot.classes.find(c=>c.danhsachmahocsinh.length && c.trangthai!=='TAM_DUNG' && c.trangthai!=='DA_KET_THUC');
 assert.ok(base);
 const studentId=base.danhsachmahocsinh[0];
 let student=snapshot.students.find(s=>s.madinhdanh===studentId);
 const otherSubject=snapshot.subjects.find(s=>s.mamonhoc!==base.mamonhoc).mamonhoc;
 const originalRegistration=student.dangkymonhoc.find(r=>r.subject===base.mamonhoc);
 assert.equal(originalRegistration.currentClassCode,base.malophoc);
 const secondRegistration={...originalRegistration,subject:otherSubject,currentClassCode:null,status:'CHO_XEP_LOP',scheduleSlots:['CN (18:00 - 19:30)']};
 await save('students',student,{...student,dangkymonhoc:[...student.dangkymonhoc,secondRegistration]});
 student=(await data()).students.find(s=>s.madinhdanh===studentId);
 assert.equal(student.dangkymonhoc.length,2);
 assert.ok(student.dangkymonhoc.find(r=>r.subject===otherSubject).registeredAt,'registration timestamp is queried per subject');
 assert.equal(student.dangkymonhoc.find(r=>r.subject===base.mamonhoc).currentClassCode,base.malophoc);
 const secondClass={...clean(base),madinhdanh:'MULTI-ENG',malophoc:'MULTI-ENG',mamonhoc:otherSubject,
  magiaovien:snapshot.teachers.find(t=>t.mamonhoc===otherSubject).madinhdanh,
  danhsachmahocsinh:[studentId],lichhoc:'CN (18:00 - 19:30)',hoclieu:[],chitietcahoc:{},phancongdaythay:[]};
 await save('classes',null,secondClass);
 snapshot=await data();
 assert.ok(snapshot.classes.find(c=>c.madinhdanh===base.madinhdanh).danhsachmahocsinh.includes(studentId));
 assert.ok(snapshot.classes.find(c=>c.madinhdanh===secondClass.madinhdanh).danhsachmahocsinh.includes(studentId));
 assert.equal(snapshot.students.find(s=>s.madinhdanh===studentId).lichsulophoc.find(t=>t.toClassId===secondClass.madinhdanh).isInitial,true,'first English class is new independently of Math history');
 let second=snapshot.classes.find(c=>c.madinhdanh===secondClass.madinhdanh);
 await assert.rejects(save('classes',second,{...second,lichhoc:base.lichhoc}),/trùng/);
 // Closing just Math releases Math while English stays enrolled, including after reload.
 await db.query('INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc) VALUES($1,$2,$3,$4,$5,$6)',
  ['MULTI-FUTURE',base.madinhdanh,'2099-01-04',snapshot.time_slots[0].madinhdanh,'18:00','19:30']);
 let first=(await data()).classes.find(c=>c.madinhdanh===base.madinhdanh);
 await save('classes',first,{...first,trangthai:'TAM_DUNG'});
 snapshot=await data();student=snapshot.students.find(s=>s.madinhdanh===studentId);
 assert.equal(student.dangkymonhoc.find(r=>r.subject===base.mamonhoc).status,'CHO_XEP_LOP');
 assert.equal(student.dangkymonhoc.find(r=>r.subject===otherSubject).currentClassCode,secondClass.malophoc);
 assert.equal(snapshot.classes.find(c=>c.madinhdanh===base.madinhdanh).danhsachmahocsinh.length,0);
 assert.ok(student.lichsulophoc.some(t=>t.fromClassId===base.madinhdanh&&t.toClassId===null));
 assert.equal((await db.query('SELECT trangthai FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',['MULTI-FUTURE'])).rows[0].trangthai,'NGHI_HOC');
 await assert.rejects(db.exec(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc='2099-01-04 18:00:00+07' WHERE madinhdanh='MULTI-FUTURE'`),/không thể vào buổi mới/);
 // New Math class, then withdrawal; neither operation removes English or history.
 const replacement={...clean(first),madinhdanh:'MULTI-MATH-NEW',malophoc:'MULTI-MATH-NEW',trangthai:'CHO_KHAI_GIANG',danhsachmahocsinh:[studentId],hoclieu:[],chitietcahoc:{},phancongdaythay:[]};
 await save('classes',null,replacement);
 let newMath=(await data()).classes.find(c=>c.madinhdanh===replacement.madinhdanh);
 assert.equal((await data()).students.find(s=>s.madinhdanh===studentId).lichsulophoc.find(t=>t.toClassId===replacement.madinhdanh).isInitial,false,'new class of the same Math subject is a transfer');
 await save('classes',newMath,{...newMath,danhsachmahocsinh:[]});
 student=(await data()).students.find(s=>s.madinhdanh===studentId);
 assert.equal(student.dangkymonhoc.find(r=>r.subject===base.mamonhoc).status,'CHO_XEP_LOP');
 assert.equal(student.dangkymonhoc.find(r=>r.subject===otherSubject).status,'DANG_HOC');
 const beforeRerun=student.dangkymonhoc;
 await db.exec(file('supabase/migrations/20261026_student_subject_enrollments.sql'));
 assert.deepEqual((await data()).students.find(s=>s.madinhdanh===studentId).dangkymonhoc,beforeRerun);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 // Default primary teacher is read from the class; a cover is stored as a separate FK.
 const teacher=secondClass.magiaovien;
 const cover=(await data()).teachers.find(t=>t.mamonhoc===otherSubject&&t.madinhdanh!==teacher)?.madinhdanh;
 assert.ok(cover);
 const slot=snapshot.time_slots[0];
 const lesson=(await db.query('INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaoviendaythay) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING magiaovienchinh,magiaoviendaythay',
  ['MULTI-LESSON',secondClass.madinhdanh,'2020-01-05',slot.madinhdanh,'18:00','19:30',cover])).rows[0];
 assert.equal(lesson.magiaovienchinh,teacher);assert.equal(lesson.magiaoviendaythay,cover);
 const assignments=(await data()).classes.find(c=>c.madinhdanh===secondClass.madinhdanh).phancongdaythay;
 assert.ok(assignments.some(a=>a.teacherId===cover&&a.dateStr==='2020-01-05'),'teacher portal cover projection reads the lesson teacher ID');
 await db.exec(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc='2020-01-05 18:00:00+07',ketthucluc='2020-01-05 19:30:00+07' WHERE madinhdanh='MULTI-LESSON';
  UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung='Hoàn thành bài học' WHERE mabuoi='MULTI-LESSON';`);
 const work=(await db.query('SELECT magiaovien,loaicong FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['MULTI-LESSON'])).rows;
 assert.ok(work.some(w=>w.magiaovien===cover&&w.loaicong==='COVER'),'cover gets the work record');
 assert.ok(!work.some(w=>w.magiaovien===teacher),'no standard work is credited to the primary teacher');
 // A profile-only operator cannot withdraw by hiding the class in a nested status edit.
 await db.exec(`INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,congtruycap)
  VALUES('MULTI-PROFILE','Profile only','VẬN HÀNH','Test',1,'ADMIN');
  INSERT INTO vuihoc."NHOM_QUYEN_CHI_TIET" VALUES('MULTI-PROFILE','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy',1);
  INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,matkhau,manhomquyen,thudientu,sodienthoai,vaitro,trangthai,chucaiavatar)
  VALUES('MULTI-OP','Operator','multi.operator','234567','MULTI-PROFILE','','','Nhân viên Vận hành Lớp','active','OP');`);
 const operator=await rpc('vuihoc_login',['multi.operator','234567']);
 const restrictedStudent=(await rpc('vuihoc_business_data',[operator.token])).students.find(s=>s.madinhdanh===studentId);
 await assert.rejects(rpc('vuihoc_save_business',[operator.token,[{dataset:'students',before:clean(restrictedStudent),
  after:{...clean(restrictedStudent),dangkymonhoc:restrictedStudent.dangkymonhoc.map(r=>r.subject===otherSubject?{...r,status:'BAO_LUU'}:r)}}]]),/Không có quyền ghép/);
 await assert.rejects(db.query('UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=$1 WHERE madinhdanh=$2',[teacher,'MULTI-LESSON']),/đã ghi công/);
 console.log('PASS: multiple subjects, schedule conflict rollback, class pause, transfer, withdrawal, retained history, reload, rerun, no JSON storage, primary/cover IDs');
} catch(error){console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;} finally {await db.close();}
