import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH!;
const {PGlite}=await import(pathToFileURL(root+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261011_teacher_persistence.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261011_teacher_persistence.sql','utf8'));
 const setup=readFileSync('supabase/setup_admin.sql','utf8').replace(/matkhau text:='[^']*'/,"matkhau text:='TeacherTest@890'");
 await db.exec(setup);
 const call=async(name:string,args:unknown[]) => (await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
 await db.exec('SET ROLE anon');
 const login=await call('vuihoc_login',['admin.tong','TeacherTest@890']);const token=login.token;

 const read=()=>call('vuihoc_business_data',[token]);
 const save=(changes:unknown[],t=token)=>call('vuihoc_save_business',[t,JSON.stringify(changes)]);
 const data=await read();assert.ok(data.subjects.length);assert.ok(!JSON.stringify(data).includes('matkhau'));assert.ok(!JSON.stringify(data.app_settings).includes('khoa'));
 const subject={madinhdanh:'TEST-SUB',mamonhoc:'TEST-SUB',tenviettat:'TEST',tenmonhoc:'Test subject',mota:'',danghoatdong:true};
 await save([{dataset:'subjects',before:null,after:subject}]);
 const persisted=(await read()).subjects.find((r:any)=>r.madinhdanh===subject.madinhdanh);assert.deepEqual(persisted,subject);
 const updated={...persisted,tenmonhoc:'Updated'};await save([{dataset:'subjects',before:persisted,after:updated}]);
 await assert.rejects(save([{dataset:'subjects',before:persisted,after:{...updated,tenmonhoc:'stale'}}]),/phiên khác/);
 await assert.rejects(save([{dataset:'subjects',before:updated,after:{...updated,tenmonhoc:'rollback'}},{dataset:'teachers',before:null,after:{madinhdanh:'fake'}}]),/Tạo hồ sơ/);
 assert.equal((await read()).subjects.find((r:any)=>r.madinhdanh===subject.madinhdanh).tenmonhoc,'Updated');
 await assert.rejects(save([{dataset:'subjects',before:updated,after:{...updated,injected:'x'}}]),/Trường không/);
 await assert.rejects(save([{dataset:'users',before:null,after:{madinhdanh:'fake'}}]),/Dataset/);
 await save([{dataset:'subjects',before:updated,after:null}]);assert.ok(!(await read()).subjects.some((r:any)=>r.madinhdanh===subject.madinhdanh));
 for(const dataset of ['levels','time_slots','class_models','teaching_categories','incident_categories','teachers','students','classes','criteria_categories','sop_documents','rag_bot_config','tone_directives','app_settings','monthly_payroll','teacher_evaluations']){
  const row=data[dataset]?.[0];if(!row)continue;
  // A full round trip exercises every field whitelist and SQL type conversion.
  await save([{dataset,before:row,after:row}]);
 }
 const profile={hoten:'Persistence teacher',thudientu:'persist@example.com',sodienthoai:'0901234567',mamonhoc:'SUB-MATH',macaphoc:'CAP-TH',danhsachkhoi:[data.teaching_categories.find((r:any)=>r.madinhdanh==='CAP-TH').danhsachluachon[0].id],danhsachmohinh:['1-1']};
 const created=await call('vuihoc_create_teacher',[token,JSON.stringify(profile)]);
 const ownLogin=await call('vuihoc_login',[created.username,created.password]);
 const ownData=await call('vuihoc_business_data',[ownLogin.token]);assert.equal(ownData.teachers.length,1);
 await assert.rejects(save([{dataset:'subjects',before:null,after:subject}],ownLogin.token),/Không có quyền/);
 const ownTeacher=ownData.teachers[0];await save([{dataset:'teachers',before:ownTeacher,after:{...ownTeacher,lichranh:{'2026-10-12':['SLOT-E1']}}}],ownLogin.token);
 assert.deepEqual((await call('vuihoc_business_data',[ownLogin.token])).teachers[0].lichranh,{'2026-10-12':['SLOT-E1']});
 await assert.rejects(save([{dataset:'teachers',before:ownTeacher,after:{...ownTeacher,hoten:'spoof'}}],ownLogin.token),/phiên khác/);
 const adminTeacher=(await read()).teachers.find((r:any)=>r.madinhdanh===created.id);await save([{dataset:'teachers',before:adminTeacher,after:{...adminTeacher,hoten:'Updated teacher'}}]);

 const period={madinhdanh:'TEST-PERIOD',kycong:'2026-12',dakhoa:false,daguithongbao:true,danhsachgiaovien:[{teacherId:created.id,payrollSent:true,reconcileStatus:'DA_GUI',sessions:[{id:'TEST-SESSION',creditCoeff:1}]},{teacherId:'GV-001',payrollSent:true,reconcileStatus:'DA_GUI',sessions:[]}],danhsachgiaitrinh:[]};
 await save([{dataset:'monthly_payroll',before:null,after:period}]);
 const projected=(await call('vuihoc_business_data',[ownLogin.token])).monthly_payroll.find((r:any)=>r.kycong==='2026-12');
 // Mimic the UI codec, which excludes system timestamps.
 delete projected.ngaytao;delete projected.ngaycapnhat;assert.equal(projected.danhsachgiaovien.length,1);
 const dispute={id:'TEST-DSP',teacherId:created.id,sessionId:'TEST-SESSION',status:'CHO_DUYET',content:'Review requested'};
 const submitted={...projected,danhsachgiaitrinh:[dispute],danhsachgiaovien:projected.danhsachgiaovien.map((r:any)=>({...r,reconcileStatus:'CO_GIAI_TRINH',sessions:r.sessions.map((s:any)=>({...s,dispute}))}))};
 await save([{dataset:'monthly_payroll',before:projected,after:submitted}],ownLogin.token);
 const reloaded=(await read()).monthly_payroll.find((r:any)=>r.kycong==='2026-12');assert.equal(reloaded.danhsachgiaovien.length,2);assert.equal(reloaded.danhsachgiaovien[1].teacherId,'GV-001');
 const ownReload=(await call('vuihoc_business_data',[ownLogin.token])).monthly_payroll.find((r:any)=>r.kycong==='2026-12');delete ownReload.ngaytao;delete ownReload.ngaycapnhat;
 await assert.rejects(save([{dataset:'monthly_payroll',before:ownReload,after:{...ownReload,dakhoa:true}}],ownLogin.token),/Chỉ được thêm/);
 const cls=data.classes.find((r:any)=>r.magiaovien);const slot=data.time_slots[0];
 const lesson={madinhdanh:'TEST-LESSON',malop:cls.madinhdanh,ngayhoc:'2026-12-21',makhunggio:slot.madinhdanh,batdau:'2026-12-21T18:00:00+07:00',ketthuc:'2026-12-21T19:00:00+07:00',magiaovienchinh:cls.magiaovien,tieude:'Test',lienketphonghoc:cls.lienketphonghoc,hoclieu:{},trangthai:'CHUA_DIEN_RA'};
 const category=data.incident_categories[0];const child=category.danhsachsuco[0];
 const incident={madinhdanh:'TEST-INC',mabuoi:lesson.madinhdanh,manhomsuco:category.madinhdanh,masuco:child.code,tensuco:child.name,noidung:'Test incident',trangthai:'DANG_XU_LY'};
 await save([{dataset:'dated_lessons',before:null,after:lesson},{dataset:'lesson_incidents',before:null,after:incident}]);

 const ownClass={...cls,madinhdanh:'TEST-OWN-CLASS',malophoc:'TEST-OWN-CLASS',magiaovien:created.id,danhsachmahocsinh:[data.students[0].madinhdanh]};
 await save([{dataset:'classes',before:null,after:ownClass}]);

 const activeChild=data.incident_categories.flatMap((r:any)=>r.danhsachsuco).find((r:any)=>r.status);
 const reported=await call('vuihoc_report_lesson_incident',[ownLogin.token,ownClass.malophoc,'2026-12-22',slot.khoanggio,activeChild.code,'Teacher report']);assert.ok(reported.lessonId);
 const repeated=await call('vuihoc_report_lesson_incident',[ownLogin.token,ownClass.malophoc,'2026-12-22',slot.khoanggio,activeChild.code,'Additional evidence']);assert.equal(repeated.lessonId,reported.lessonId);
 await assert.rejects(call('vuihoc_report_lesson_incident',[ownLogin.token,cls.malophoc,'2026-12-22',slot.khoanggio,activeChild.code,'Spoof']),/Chỉ được báo/);
 const usageArgs=[ownLogin.token,created.id,data.students[0].madinhdanh];
 assert.equal((await call('vuihoc_ai_usage',[...usageArgs,false])).count,0);
 assert.equal((await call('vuihoc_ai_usage',[...usageArgs,true])).count,1);
 assert.equal((await call('vuihoc_ai_usage',[...usageArgs,true])).count,2);
 await assert.rejects(call('vuihoc_ai_usage',[...usageArgs,true]),/hết 2 lượt/);
 await assert.rejects(call('vuihoc_ai_usage',[ownLogin.token,'GV-001',data.students[0].madinhdanh,true]),/Không có quyền/);
 const sop={madinhdanh:'TEST-SOP',tieude:'Test SOP',phanloai:'Quy chế',tomtat:'Summary',noidung:'Content',dangsudung:true};
 await save([{dataset:'sop_documents',before:null,after:sop}]);
 assert.equal((await read()).sop_documents.find((r:any)=>r.madinhdanh==='TEST-SOP').noidung,'Content');
 const operational=await read();assert.ok(operational.dated_lessons.some((r:any)=>r.madinhdanh==='TEST-LESSON'));assert.ok(operational.lesson_incidents.some((r:any)=>r.mabuoi==='TEST-LESSON'));
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT hoten FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[created.id])).rows[0].hoten,'Updated teacher');
 const tables=(await db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='vuihoc' AND table_type='BASE TABLE'")).rows[0].n;assert.equal(tables,31);
 console.log('Business persistence: CRUD, reload, CAS, rollback, rights, own availability and 31 tables passed.');
}finally{await db.close();}
