import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH!;
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')).href);
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')).href);
const db=new PGlite({extensions:{pgcrypto},initialMemory:128*1024*1024,postgresqlconf:'shared_buffers=8MB'});
const file=(p:string)=>readFileSync(p,'utf8');
const originalFetch=globalThis.fetch;
const requests:any[]=[];
let databaseQueue:Promise<unknown>=Promise.resolve();
const withDb=<T>(action:()=>Promise<T>):Promise<T>=>{
 const result=databaseQueue.then(action,action);
 databaseQueue=result.then(()=>undefined,()=>undefined);
 return result;
};
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

 await db.exec(file('supabase/migrations/20261027_standardize_inspection_scores.sql'));
 await db.exec(file('supabase/migrations/20261028_document_drive_catalog.sql'));
 // Reproduce the reported upgrade order: class-stop migration without the profile prerequisite.
 assert.equal((await db.query("SELECT to_regprocedure('vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb)') AS signature")).rows[0].signature,null);
 await assert.rejects(db.exec(file('supabase/migrations/20261101_stop_class_release_slots.sql')),/Thiếu bản sửa hồ sơ 20261031/);
 await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regprocedure('vuihoc.ca_giao_vien_con_lop(text,text,integer)') AS signature")).rows[0].signature,null,'missing prerequisite fails before installing new functions');
 await db.exec(file('supabase/fix_profile_class_updates.sql'));
 await db.exec(file('supabase/fix_profile_class_updates.sql'));
 console.log('PASS: missing profile prerequisite reproduced; combined recovery installs all fixes and is safe to rerun');
 // Review actual tables, then remove only the retired AI counter/RPC.
 const reviewBefore=(await db.query(file('supabase/diagnostics/unused_tables_review.sql'))).rows;
 assert.equal(reviewBefore.find((row:any)=>row.ten_bang==='LUOT_NHAN_XET_AI').danh_gia,'CO_THE_GO');
 const retainedTables=['GIAO_VIEN','HOC_SINH','LOP_HOC','BUOI_HOC','NHAN_XET_BUOI_HOC','TAI_LIEU_QUY_TRINH','CAU_HINH_TRO_LY','LICH_RANH_TUAN','CHI_TIET_LICH_RANH','LICH_RANH_DINH_KY','DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC'];
 const retainedRows=new Map();for(const table of retainedTables)retainedRows.set(table,(await db.query('SELECT * FROM vuihoc."'+table+'" ORDER BY 1,2')).rows);
 await db.exec(`CREATE FUNCTION public.counter_dependency_probe() RETURNS bigint LANGUAGE sql AS 'SELECT count(*) FROM vuihoc."LUOT_NHAN_XET_AI"';`);
 await assert.rejects(db.exec(file('supabase/migrations/20261103_remove_unused_ai_review_usage.sql')),/Còn hàm khác/);
 await db.exec('ROLLBACK');
 assert.ok((await db.query(`SELECT to_regclass('vuihoc."LUOT_NHAN_XET_AI"') AS target`)).rows[0].target);
 await db.exec('DROP FUNCTION public.counter_dependency_probe()');
 await db.exec('CREATE TABLE public.counter_fk_probe(teacher text,student text,FOREIGN KEY(teacher,student) REFERENCES vuihoc."LUOT_NHAN_XET_AI"(magiaovien,mahocsinh))');
 await assert.rejects(db.exec(file('supabase/migrations/20261103_remove_unused_ai_review_usage.sql')),/depend|constraint/i);
 await db.exec('ROLLBACK');
 assert.ok((await db.query(`SELECT to_regprocedure('public.vuihoc_ai_usage(text,text,text,boolean)') AS target`)).rows[0].target,'failed cleanup rolls back RPC deletion');
 await db.exec('DROP TABLE public.counter_fk_probe');
 await db.exec(file('supabase/migrations/20261103_remove_unused_ai_review_usage.sql'));
 await db.exec(file('supabase/migrations/20261103_remove_unused_ai_review_usage.sql'));
 assert.equal((await db.query(`SELECT to_regclass('vuihoc."LUOT_NHAN_XET_AI"') AS target`)).rows[0].target,null);
 assert.equal((await db.query(`SELECT to_regprocedure('public.vuihoc_ai_usage(text,text,text,boolean)') AS target`)).rows[0].target,null);
 for(const table of retainedTables)assert.deepEqual((await db.query('SELECT * FROM vuihoc."'+table+'" ORDER BY 1,2')).rows,retainedRows.get(table),table+' data preserved');
 assert.ok(!(await db.query(file('supabase/diagnostics/unused_tables_review.sql'))).rows.some((row:any)=>row.ten_bang==='LUOT_NHAN_XET_AI'));
 console.log('PASS: AI counter review/removal; extra function/FK dependencies stop cleanup atomically; feedback, documents and operational data preserved');
 // The supplied inventory also has obsolete UI preferences and single-subject schedules.
 const unmatched:any=(await db.query(`SELECT h.madinhdanh AS student,k.madinhdanh AS slot,d.day FROM vuihoc."HOC_SINH" h CROSS JOIN vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(1,7) d(day) WHERE NOT EXISTS(SELECT 1 FROM vuihoc."LICH_DANG_KY_MON_HOC" s WHERE s.mahocsinh=h.madinhdanh AND s.makhunggio=k.madinhdanh AND s.thutrongtuan=d.day) LIMIT 1`)).rows[0];
 assert.ok(unmatched);
 await db.query(`INSERT INTO vuihoc."LICH_DANG_KY_HOC_SINH" SELECT $1,coalesce(max(thutu),0)+1,$2,$3 FROM vuihoc."LICH_DANG_KY_HOC_SINH" WHERE mahocsinh=$1`,[unmatched.student,unmatched.day,unmatched.slot]);
 await assert.rejects(db.exec(file('supabase/cleanup_unused_tables.sql')),/lịch học sinh cũ chưa khớp/);
 await db.exec('ROLLBACK');
 assert.ok((await db.query(`SELECT to_regclass('vuihoc."TUY_CHON_NGUOI_DUNG"') AS target`)).rows[0].target,'unmatched slot blocks all cleanup');
 await db.query('DELETE FROM vuihoc."LICH_DANG_KY_HOC_SINH" WHERE mahocsinh=$1 AND thutrongtuan=$2 AND makhunggio=$3',[unmatched.student,unmatched.day,unmatched.slot]);
 await db.exec(file('supabase/cleanup_unused_tables.sql'));
 await db.exec(file('supabase/cleanup_unused_tables.sql'));
 for(const table of ['LUOT_NHAN_XET_AI','TUY_CHON_NGUOI_DUNG','LICH_DANG_KY_HOC_SINH'])assert.equal((await db.query('SELECT to_regclass($1) AS target',['vuihoc."'+table+'"'])).rows[0].target,null);
 for(const table of retainedTables)assert.deepEqual((await db.query('SELECT * FROM vuihoc."'+table+'" ORDER BY 1,2')).rows,retainedRows.get(table),table+' retained after combined cleanup');
 console.log('PASS: combined cleanup is idempotent, blocks unmatched legacy schedules, and preserves current per-subject/weekly/recurring schedules');
 await db.exec(file('supabase/migrations/20261106_teacher_chat_questions.sql'));
 await db.exec(file('supabase/migrations/20261107_teacher_question_history.sql'));
 const legacyTeacher:any=(await db.query('SELECT madinhdanh,manguoidung FROM vuihoc."GIAO_VIEN" WHERE manguoidung IS NOT NULL LIMIT 1')).rows[0];
 const legacyChat=crypto.randomUUID();
 await db.query('INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,magiaovien) VALUES($1,$2)',[legacyChat,legacyTeacher.madinhdanh]);
 await db.query('INSERT INTO vuihoc."CAU_HOI_CHAT_AI"(macauhoi,maphien,noidung) VALUES($1,$2,$3)',[crypto.randomUUID(),legacyChat,'Câu hỏi đã lưu trước bản nâng cấp quản trị']);
 await db.exec(file('supabase/migrations/20261108_chat_history_accounts.sql'));
 assert.equal((await db.query('SELECT manguoidung FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[legacyChat])).rows[0].manguoidung,legacyTeacher.manguoidung);
 assert.equal((await db.query('SELECT noidung FROM vuihoc."CAU_HOI_CHAT_AI" WHERE maphien=$1',[legacyChat])).rows[0].noidung,'Câu hỏi đã lưu trước bản nâng cấp quản trị');
 await db.query('DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[legacyChat]);
 await db.exec(file('supabase/setup_teacher_question_history.sql'));
 await db.exec(file('supabase/setup_teacher_question_history.sql'));
 assert.deepEqual((await db.query(file('supabase/diagnostics/json_storage_columns.sql'))).rows,[],'no JSON/JSONB columns, domains or arrays store business data');
 console.log('PASS: relational storage audit has zero JSON/JSONB columns');
 globalThis.fetch=async(url,options)=>{
  const request=url instanceof Request?url:new Request(url,options);
  const name=new URL(request.url).pathname.split('/').at(-1)!;
  assert.match(name,/^vuihoc_[a-z_]+$/);
  const args=await request.json();requests.push({name,args});
  return withDb(async()=>{
  try {
   await db.exec('BEGIN; SET LOCAL ROLE anon');
   const entries=Object.entries(args);
   const tableResult=['vuihoc_ai_chat_list','vuihoc_ai_chat_questions'].includes(name);
   const query=(tableResult?'SELECT * FROM public.':'SELECT public.')+name+'('+entries.map(([key],i)=>key+' => $'+(i+1)).join(',')+')'+(tableResult?'':' result');
   const queried=await db.query(query,entries.map(([,value])=>value));
   const result=tableResult?queried.rows:queried.rows[0].result;
   await db.exec('COMMIT');
   return Response.json(result);
  }catch(error:any){await db.exec('ROLLBACK');return Response.json({code:error.code,message:error.message,details:error.detail,hint:error.hint},{status:400});}
  });
 };
 const accounts=await import('../src/lib/accountSession');
 const business=await import('../src/lib/businessPersistence');
 await accounts.loginAccount('admin.tong','234567');
 const historyApi=await import('../src/lib/teacherChatHistory');
 const adminChat=crypto.randomUUID(),adminId=accounts.getAccountSnapshot().actor!.id;
 await historyApi.openTeacherChat(adminChat);
 await historyApi.saveTeacherQuestion(adminChat,crypto.randomUUID(),'Câu hỏi quản trị: xin nghỉ cần báo trước bao lâu?');
 const adminOwner:any=(await withDb<any>(()=>db.query('SELECT manguoidung,magiaovien FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[adminChat]))).rows[0];
 assert.equal(adminOwner.manguoidung,adminId);assert.equal(adminOwner.magiaovien,null,'administrator works without a teacher profile');
 assert.equal((await historyApi.listTeacherChats())[0].maphien,adminChat);
 const adminGroup:any=(await withDb<any>(()=>db.query('SELECT manhomquyen FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[adminId]))).rows[0];
 const permissionsBefore:any[]=(await withDb<any>(()=>db.query('SELECT * FROM vuihoc."NHOM_QUYEN_CHI_TIET" WHERE manhom=$1',[adminGroup.manhomquyen]))).rows;
 try{
  await withDb(()=>db.query('DELETE FROM vuihoc."NHOM_QUYEN_CHI_TIET" WHERE manhom=$1',[adminGroup.manhomquyen]));
  await assert.rejects(historyApi.listTeacherChats(),/chưa có quyền sử dụng AI/);
 }finally{
  for(const row of permissionsBefore)await withDb(()=>db.query('INSERT INTO vuihoc."NHOM_QUYEN_CHI_TIET"(manhom,maquyen,thutu) VALUES($1,$2,$3)',[row.manhom,row.maquyen,row.thutu]));
 }
 await withDb(async()=>{
  await db.exec('BEGIN READ ONLY; SET LOCAL ROLE anon');
  try {
   for(const name of ['vuihoc_business_data','vuihoc_teacher_data','vuihoc_session'])await db.query('SELECT public.'+name+'($1)',[accounts.getAccountSessionToken()]);
   await db.exec('COMMIT');
  }catch(error){await db.exec('ROLLBACK');throw error;}
 });
 console.log('PASS: business/teacher/account reads succeed in a read-only transaction');
 await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().error,'');
 assert.equal(business.getBusinessSnapshot().data.criteria_categories.length,0,'retired criteria table remains absent');
 // Reproduce a permission failure restricted to schedule-writing helpers.
 const {updateStudentRegistration:updateWaitingRegistration}=await import('../src/lib/studentRegistrations');
 const waitingStudent=business.getBusinessSnapshot().data.students.find((row:any)=>row.registrations.some((r:any)=>r.status==='Chờ xếp lớp'&&!r.currentClassCode));
 assert.ok(waitingStudent,'waiting student fixture');
 const waitingBefore=structuredClone(waitingStudent);
 const waitingSubject=waitingStudent.registrations.find((r:any)=>r.status==='Chờ xếp lớp'&&!r.currentClassCode).subject;
 const waitingSlot=business.getBusinessSnapshot().data.time_slots[0];
 let newSchedule=[`T2 (${waitingSlot.timeRange})`,`T4 (${waitingSlot.timeRange})`];
 if(JSON.stringify(waitingStudent.registrations.find((r:any)=>r.subject===waitingSubject).scheduleSlots)===JSON.stringify(newSchedule))newSchedule=[`T3 (${waitingSlot.timeRange})`];
 const editWaitingSchedule=()=>business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===waitingStudent.id?updateWaitingRegistration(row,{subject:waitingSubject,scheduleSlots:newSchedule}):row));
 await withDb(()=>db.exec('ALTER FUNCTION vuihoc.tach_lich(text) OWNER TO anon; ALTER FUNCTION vuihoc.tach_lich(text) SECURITY DEFINER'));
 editWaitingSchedule();await assert.rejects(business.waitForBusinessSave(),/permission denied for schema vuihoc/);
 const permissionReport:any=(await withDb<any>(()=>db.query(file('supabase/diagnostics/student_schedule_permissions.sql')))).rows;
 assert.equal(permissionReport.find((row:any)=>row.function_name==='tach_lich').owner_can_use_schema,false);
 // Older installations can have equivalent function bodies with different spacing.
 // The upgrade must not depend on exact source-text matches in any of these functions.
 await withDb(async()=>{
  for(const signature of ['vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(text,jsonb,jsonb)',
   'vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb)','vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean)']){
   const definition:any=(await db.query('SELECT pg_get_functiondef($1::regprocedure) AS definition',[signature])).rows[0];
   const reformatted=definition.definition.replace(/\n/g,'\r\n').replace(/AND \(\(oldreg/g,'AND  ((oldreg')
    .replace('registrations:=p_row', 'registrations := p_row')
    .replace('PERFORM vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(p_table,b,v);',
     'PERFORM vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(p_table, b, v);');
   await db.exec(reformatted);
  }
 });
 await withDb(()=>db.exec(file('supabase/fix_student_available_slots.sql')));
 await withDb(()=>db.exec(file('supabase/fix_student_available_slots.sql')));
 for(const role of ['anon','authenticated']){
  const access:any=(await withDb<any>(()=>db.query(`SELECT has_schema_privilege($1,'vuihoc','USAGE') AS schema_access,has_table_privilege($1,'vuihoc."HOC_SINH"','UPDATE') AS table_access,has_function_privilege($1,'vuihoc.tach_lich(text)','EXECUTE') AS helper_access`,[role]))).rows[0];
  assert.deepEqual(access,{schema_access:false,table_access:false,helper_access:false},'repair preserves private schema/table/helper isolation');
 }
 await withDb(async()=>{
  await db.exec('BEGIN; SET LOCAL ROLE anon');
  try{await assert.rejects(db.query('SELECT public.vuihoc_save_business($1,$2)',['x'.repeat(64),[]]),/Phiên/);}
  finally{await db.exec('ROLLBACK');}
 });
 await business.loadBusinessData();editWaitingSchedule();await business.waitForBusinessSave();await business.loadBusinessData();
 const waitingAfter=business.getBusinessSnapshot().data.students.find((row:any)=>row.id===waitingStudent.id);
 const savedWaiting=waitingAfter.registrations.find((r:any)=>r.subject===waitingSubject);
 assert.deepEqual(savedWaiting.scheduleSlots,newSchedule);assert.equal(savedWaiting.status,'Chờ xếp lớp');assert.ok(!savedWaiting.currentClassCode);
 assert.deepEqual(waitingAfter.registrations.filter((r:any)=>r.subject!==waitingSubject),waitingBefore.registrations.filter((r:any)=>r.subject!==waitingSubject));
 assert.equal(waitingAfter.id,waitingBefore.id);
 const physicalSchedule:any=(await withDb<any>(()=>db.query('SELECT thutrongtuan,makhunggio FROM vuihoc."LICH_DANG_KY_MON_HOC" WHERE mahocsinh=$1 AND mamonhoc=$2 ORDER BY thutu',[waitingStudent.id,waitingSubject]))).rows;
 assert.equal(physicalSchedule.length,newSchedule.length);assert.ok(physicalSchedule.every((row:any)=>row.makhunggio===waitingSlot.id));
 console.log('PASS: waiting-student schedule permission failure reproduced; repaired update survives commit/reload in relational rows without exposing private schema');
 const {defaultReportConfig}=await import('../src/lib/customReports');
 const reportConfig=defaultReportConfig({id:'classes',label:'Classes',dateKind:'event',records:[],metrics:[{id:'count',label:'Count',mode:'count'}],dimensions:[],defaultMetricIds:['count'],filters:[],detailFields:[]});
 business.setBusinessValue('report_templates',[{id:'REGRESSION-REPORT',name:'Report',config:reportConfig}]);
 await business.waitForBusinessSave();
 // Fail if scalar metadata edits rewrite unchanged relations or create redundant snapshots.
 const guardedTables=['LICH_RANH_DINH_KY','GIAO_VIEN_KHOI','GIAO_VIEN_MO_HINH','DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC','LICH_LOP','HOC_LIEU_LOP','PHAN_CONG_DAY_THAY','CHI_TIET_CA_LOP','LUA_CHON_CAP_HOC','LOAI_SU_CO','CHI_SO_MAU_BAO_CAO','BO_LOC_MAU_BAO_CAO'];
 await withDb(()=>db.exec(`CREATE FUNCTION vuihoc.reject_unchanged_relation_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Unchanged relation was rewritten: %',TG_TABLE_NAME; END $$;`));
 for(const table of guardedTables)await withDb(()=>db.exec('CREATE TRIGGER reject_unchanged_relation_write BEFORE INSERT OR UPDATE OR DELETE ON vuihoc."'+table+'" FOR EACH ROW EXECUTE FUNCTION vuihoc.reject_unchanged_relation_write()'));
 const cases=[['subjects','desc'],['levels','objective'],['time_slots','name'],['class_models','name'],['teaching_categories','name'],['incident_categories','desc'],['teachers','phone'],['students','name'],['classes','name'],['document_categories','description'],['sop_documents','summary'],['custom_catalogs','desc'],['report_templates','name'],['teacher_evaluations','generalComment'],['dated_lessons','title'],['lesson_incidents','resolutionNote']] as const;
 for(const [dataset,field] of cases){
  const rows=business.getBusinessSnapshot().data[dataset];
  assert.ok(rows.length,'required fixture: '+dataset);
  const target=rows[0];const id=target.id;const beforeCount=rows.length;
  const other=rows[1]&&structuredClone(rows[1]);
  const value=String(target[field]??'')+' regression';
  business.setBusinessValue(dataset,(items:any[])=>items.map(item=>item.id===id?{...item,[field]:value}:item));
  try{await business.waitForBusinessSave();}catch(error){console.error('FAILED dataset:',dataset,field);throw error;}
  const changed=business.getBusinessSnapshot().data[dataset];
  assert.equal(changed.find((row:any)=>row.id===id)[field],value,dataset+' value persisted');
  assert.equal(changed.length,beforeCount,dataset+' update must not insert');
  if(other)assert.deepEqual(changed.find((row:any)=>row.id===other.id),other,dataset+' other row unchanged');
  const write=requests.filter(request=>request.name==='vuihoc_save_business').at(-1);
  assert.ok(write.args.p_changes.some((change:any)=>change.dataset===dataset&&change.before.madinhdanh===id&&change.after.madinhdanh===id),dataset+' keeps original primary key');
  await business.loadBusinessData();
  assert.equal(business.getBusinessSnapshot().data[dataset].find((row:any)=>row.id===id)[field],value,dataset+' survives reload');
  console.log('PASS update:',dataset);
 }
 for(const table of guardedTables)await withDb(()=>db.exec('DROP TRIGGER reject_unchanged_relation_write ON vuihoc."'+table+'"'));
 await withDb(()=>db.exec('DROP FUNCTION vuihoc.reject_unchanged_relation_write()'));
 console.log('PASS: all scalar metadata updates leave unrelated schedules, enrollments, class materials, catalogs and report configuration untouched');
 // Set-based counts match the original occupancy rules without repeated per-day helper calls.
 const teacherIds=business.getBusinessSnapshot().data.teachers.map((row:any)=>row.id);
 for(const teacherId of teacherIds){
  const expected:any=(await withDb<any>(()=>db.query(`SELECT (SELECT count(*) FROM vuihoc."LICH_RANH_DINH_KY" a WHERE a.magiaovien=$1 AND a.trangthai='free' AND NOT vuihoc.ca_giao_vien_con_lop(a.magiaovien,a.makhunggio,a.thutrongtuan)) AS socaranh,(SELECT count(*) FROM vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day) WHERE vuihoc.ca_giao_vien_con_lop($1,k.madinhdanh,d.day)) AS socadaxep`,[teacherId]))).rows[0];
  assert.deepEqual((await withDb<any>(()=>db.query('SELECT * FROM vuihoc.thong_ke_ca_giao_vien($1)',[teacherId]))).rows[0],expected);
 }
 console.log('PASS: optimized availability counts preserve all teacher occupancy rules');
 // Constraint failures reach the UI as actionable warnings, and failed edits roll back.
 const usedSubject=business.getBusinessSnapshot().data.students[0].subject;
 const subjectId=business.getBusinessSnapshot().data.subjects.find((row:any)=>row.code===usedSubject).id;
 business.setBusinessValue('subjects',(rows:any[])=>rows.filter(row=>row.id!==subjectId));
 await assert.rejects(business.waitForBusinessSave(),/đang được dùng/);
 assert.doesNotMatch(business.getBusinessSnapshot().error,/foreign key constraint/);
 await business.loadBusinessData();assert.ok(business.getBusinessSnapshot().data.subjects.some((row:any)=>row.id===subjectId));
 const classRows=business.getBusinessSnapshot().data.classes;
 const duplicateTarget=classRows[0],existingCode=classRows[1].code;
 business.setBusinessValue('classes',(rows:any[])=>rows.map(row=>row.id===duplicateTarget.id?{...row,code:existingCode}:row));
 await assert.rejects(business.waitForBusinessSave(),/Mã lớp đã được sử dụng/);
 await business.loadBusinessData();assert.equal(business.getBusinessSnapshot().data.classes.find((row:any)=>row.id===duplicateTarget.id).code,duplicateTarget.code);
 console.log('PASS: linked-record and duplicate-code failures display actionable UI messages without saving the rejected changes');
 // A live, seeded class can be renamed without resetting status/assignments.
 const liveClass=business.getBusinessSnapshot().data.classes.find((row:any)=>row.status==='Đang học');
 assert.ok(liveClass,'ongoing seeded class fixture exists');
 const liveBefore=structuredClone(liveClass);
 business.setBusinessValue('classes',(rows:any[])=>rows.map(row=>row.id===liveClass.id?{...row,name:'Updated ongoing sample',roomLink:'https://room.example/updated'}:row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 const liveAfter=business.getBusinessSnapshot().data.classes.find((row:any)=>row.id===liveClass.id);
 assert.equal(liveAfter.name,'Updated ongoing sample');
 assert.equal(liveAfter.roomLink,'https://room.example/updated');
 assert.equal(liveAfter.status,'Đang học');
 assert.equal(liveAfter.teacherId,liveBefore.teacherId);
 assert.deepEqual(liveAfter.studentIds,liveBefore.studentIds);
 assert.deepEqual(liveAfter.activeSessions,liveBefore.activeSessions);
 console.log('PASS: ongoing seeded class rename/link persist with status, teacher, roster and sessions intact');
 // Personal teacher fields sync through the existing account FK, including class labels.
 const linkedTeacher=business.getBusinessSnapshot().data.teachers.find((row:any)=>row.id===liveClass.teacherId);
 assert.ok(linkedTeacher?.user_id);
 business.setBusinessValue('teachers',(rows:any[])=>rows.map(row=>row.id===linkedTeacher.id?{...row,name:'Updated personal teacher',phone:'0901112223'}:row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 const linkedAccount:any=(await withDb<any>(()=>db.query('SELECT hoten,sodienthoai FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[linkedTeacher.user_id]))).rows[0];
 assert.equal(linkedAccount.hoten,'Updated personal teacher');assert.equal(linkedAccount.sodienthoai,'0901112223');
 assert.equal(business.getBusinessSnapshot().data.classes.find((row:any)=>row.id===liveClass.id).teacherName,'Updated personal teacher');
 business.setBusinessValue('teachers',(rows:any[])=>rows.map(row=>row.id===linkedTeacher.id?{...row,models:[]}:row));
 await assert.rejects(business.waitForBusinessSave(),/ảnh hưởng lớp/);await business.loadBusinessData();
 // Personal student edits preserve enrollment. Academic edits require a prior release.
 const occupiedClass=business.getBusinessSnapshot().data.classes.find((row:any)=>row.status==='Đang học'&&row.studentIds.length);
 assert.ok(occupiedClass);
 const pupilId=occupiedClass.studentIds[0];
 const {updateStudentRegistration}=await import('../src/lib/studentRegistrations');
 const pupilBefore=business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId);
 business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?{...row,name:'Updated personal student',fatherPhone:'0904445556'}:row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 assert.deepEqual(business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations,pupilBefore.registrations);
 const enrolled=pupilBefore.registrations.find((row:any)=>row.subject===occupiedClass.subject);
 // Enrolled students can add/change unrelated preferences, but not remove occupied ones.
 const {schedulesOverlap}=await import('../src/lib/workflow');
 const boundSlots=occupiedClass.schedule.split(',').map((slot:string)=>slot.trim());
 const extraChoices=business.getBusinessSnapshot().data.time_slots.flatMap((slot:any)=>['T2','T3','T4','T5','T6','T7','CN'].map(day=>`${day} (${slot.timeRange})`)).filter((slot:string)=>!schedulesOverlap(slot,occupiedClass.schedule));
 const [spareOne,spareTwo]=extraChoices;assert.ok(spareOne&&spareTwo);
 const setPupilAvailability=(slots:string[])=>business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?updateStudentRegistration(row,{subject:occupiedClass.subject,scheduleSlots:slots}):row));
 let activePreferences=[...new Set([...enrolled.scheduleSlots,...boundSlots,spareOne])];
 setPupilAvailability(activePreferences);await business.waitForBusinessSave();await business.loadBusinessData();
 activePreferences=[...new Set([...activePreferences,spareTwo])];
 setPupilAvailability(activePreferences);await business.waitForBusinessSave();await business.loadBusinessData();
 activePreferences=activePreferences.filter(slot=>slot!==spareOne);
 setPupilAvailability(activePreferences);await business.waitForBusinessSave();await business.loadBusinessData();
 const activeAfter=business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations.find((row:any)=>row.subject===occupiedClass.subject);
 assert.deepEqual(activeAfter.scheduleSlots,activePreferences);assert.equal(activeAfter.status,'Đang học');assert.equal(activeAfter.currentClassCode,occupiedClass.code);
 setPupilAvailability(activePreferences.filter(slot=>slot!==boundSlots[0]));
 await assert.rejects(business.waitForBusinessSave(),/Dừng hoạt động lớp/);await business.loadBusinessData();
 assert.deepEqual(business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations.find((row:any)=>row.subject===occupiedClass.subject).scheduleSlots,activePreferences);
 const pupilForNewSubject=business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId);
 const newSubject=business.getBusinessSnapshot().data.subjects.find((subject:any)=>!pupilForNewSubject.registrations.some((row:any)=>row.subject===subject.code));assert.ok(newSubject);
 await withDb(()=>db.exec(`CREATE FUNCTION vuihoc.reject_unchanged_subject_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='DELETE' THEN IF OLD.mamonhoc=TG_ARGV[0] THEN RAISE EXCEPTION 'Unchanged subject was rewritten'; END IF; ELSE IF NEW.mamonhoc=TG_ARGV[0] THEN RAISE EXCEPTION 'Unchanged subject was rewritten'; END IF; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;`));
 for(const table of ['DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC']){
  const ddl:any=(await withDb<any>(()=>db.query(`SELECT format('CREATE TRIGGER reject_unchanged_subject_write BEFORE INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.reject_unchanged_subject_write(%L)',$1::text,$2::text) AS sql`,[table,occupiedClass.subject]))).rows[0].sql;
  await withDb(()=>db.exec(ddl));
 }
 business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?updateStudentRegistration(row,{subject:newSubject.code,model:enrolled.model,level:enrolled.level,status:'Chờ xếp lớp',currentClassCode:undefined,scheduleSlots:[spareOne]}):row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 for(const table of ['DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC'])await withDb(()=>db.exec('DROP TRIGGER reject_unchanged_subject_write ON vuihoc."'+table+'"'));
 await withDb(()=>db.exec('DROP FUNCTION vuihoc.reject_unchanged_subject_write()'));
 assert.deepEqual(business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations.find((row:any)=>row.subject===occupiedClass.subject),activeAfter);
 assert.deepEqual(business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations.find((row:any)=>row.subject===newSubject.code).scheduleSlots,[spareOne]);
 console.log('PASS: active students add/edit unrelated slots, occupied removal is blocked, and a new subject is saved without rewriting the current class registration');
 const alternateModel=business.getBusinessSnapshot().data.class_models.find((row:any)=>row.code!==enrolled.model).code;
 business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?updateStudentRegistration(row,{subject:occupiedClass.subject,model:alternateModel}):row));
 await assert.rejects(business.waitForBusinessSave(),/Chờ xếp lớp/);await business.loadBusinessData();
 business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?updateStudentRegistration(row,{subject:occupiedClass.subject,status:'Chờ xếp lớp',currentClassCode:undefined,model:alternateModel}):row));
 await assert.rejects(business.waitForBusinessSave(),/lưu trước/);await business.loadBusinessData();
 business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?updateStudentRegistration(row,{subject:occupiedClass.subject,status:'Chờ xếp lớp',currentClassCode:undefined}):row));
 await assert.rejects(business.waitForBusinessSave(),/Dừng hoạt động lớp/);await business.loadBusinessData();
 business.setBusinessValue('classes',(rows:any[])=>rows.map(row=>row.id===occupiedClass.id?{...row,studentIds:row.studentIds.filter((id:string)=>id!==pupilId)}:row));
 await assert.rejects(business.waitForBusinessSave(),/Dừng hoạt động lớp/);await business.loadBusinessData();
 business.setBusinessValue('classes',(rows:any[])=>rows.map(row=>row.id===occupiedClass.id?{...row,schedule:'T2 (18:00 - 19:30)'}:row));
 await assert.rejects(business.waitForBusinessSave(),/Dừng hoạt động lớp/);await business.loadBusinessData();
 console.log('PASS: personal student edits preserve enrollment; direct withdrawal, roster removal and schedule release require stopping the class');
 // Real teacher session: occupied availability is locked; a free slot can be edited.
 const credentials:any=(await withDb<any>(()=>db.query('SELECT tendangnhap,matkhau FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[linkedTeacher.user_id]))).rows[0];
 const occupiedSlot:any=(await withDb<any>(()=>db.query(`SELECT k.madinhdanh id,k.makhunggio code,s.thutrongtuan-1 AS day_index FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio WHERE l.magiaovien=$1 AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') LIMIT 1`,[linkedTeacher.id]))).rows[0];
 assert.ok(occupiedSlot);
 await accounts.logoutAccount();business.resetBusinessData();await accounts.loginAccount(credentials.tendangnhap,credentials.matkhau);await business.loadBusinessData();
 const chat=historyApi;
 await assert.rejects(chat.readTeacherChat(adminChat),/không thuộc/);
 await chat.deleteTeacherChat(adminChat);
 assert.equal((await withDb<any>(()=>db.query('SELECT count(*)::int n FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[adminChat]))).rows[0].n,1,'teacher cannot delete administrator history');
 const ownChat=crypto.randomUUID(),questionId=crypto.randomUUID();
 await chat.openTeacherChat(ownChat);
 await chat.saveTeacherQuestion(ownChat,questionId,'Tôi cần xin nghỉ trước bao nhiêu ngày?');
 await chat.saveTeacherQuestion(ownChat,questionId,'Tôi cần xin nghỉ trước bao nhiêu ngày?');
 const savedQuestion:any=(await withDb<any>(()=>db.query(`SELECT q.*,p.magiaovien FROM vuihoc."CAU_HOI_CHAT_AI" q JOIN vuihoc."PHIEN_CHAT_AI" p USING(maphien) WHERE q.maphien=$1`,[ownChat]))).rows[0];
 assert.equal(savedQuestion.magiaovien,linkedTeacher.id);
 assert.equal(savedQuestion.noidung,'Tôi cần xin nghỉ trước bao nhiêu ngày?');
 assert.equal((await withDb<any>(()=>db.query('SELECT count(*)::int n FROM vuihoc."CAU_HOI_CHAT_AI" WHERE maphien=$1',[ownChat]))).rows[0].n,1,'retry does not duplicate a saved question');
 const history=await chat.listTeacherChats();
 assert.equal(history[0].tieude,savedQuestion.noidung);
 assert.deepEqual(Object.keys(history[0]).sort(),['maphien','thoigianbatdau','tieude'],'summary query does not return full messages or store a title');
 const reloaded=await chat.readTeacherChat(ownChat);
 assert.equal(reloaded[0].noidung,savedQuestion.noidung);
 assert.equal(reloaded[0].traloi,null,'history has no stored AI response');
 const columns:any=(await withDb<any>(()=>db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CAU_HOI_CHAT_AI' ORDER BY column_name`))).rows;
 assert.deepEqual(columns.map((row:any)=>row.column_name),['macauhoi','maphien','noidung','thoigianhoi'],'question-only relational schema');
 const anotherTeacher:any=(await withDb<any>(()=>db.query('SELECT madinhdanh,manguoidung FROM vuihoc."GIAO_VIEN" WHERE madinhdanh<>$1 AND manguoidung IS NOT NULL LIMIT 1',[linkedTeacher.id]))).rows[0];
 const foreignChat=crypto.randomUUID();
 await withDb(()=>db.query('INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,magiaovien,manguoidung) VALUES($1,$2,$3)',[foreignChat,anotherTeacher.madinhdanh,anotherTeacher.manguoidung]));
 await assert.rejects(chat.openTeacherChat(foreignChat),/không thuộc/);
 await assert.rejects(chat.saveTeacherQuestion(foreignChat,crypto.randomUUID(),'Câu hỏi người khác'),/không thuộc/);
 await assert.rejects(chat.readTeacherChat(foreignChat),/không thuộc/);
 assert.ok(!(await chat.listTeacherChats()).some(row=>row.maphien===foreignChat));
 await chat.deleteTeacherChat(foreignChat);
 assert.equal((await withDb<any>(()=>db.query('SELECT count(*)::int n FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[foreignChat]))).rows[0].n,1);
 await withDb(()=>db.exec(`CREATE FUNCTION vuihoc.reject_chat_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated delete failure'; END $$; CREATE TRIGGER reject_chat_delete BEFORE DELETE ON vuihoc."PHIEN_CHAT_AI" FOR EACH ROW EXECUTE FUNCTION vuihoc.reject_chat_delete();`));
 await assert.rejects(chat.deleteTeacherChat(ownChat),/Simulated delete failure/);
 assert.equal((await chat.readTeacherChat(ownChat)).length,1,'failed delete retains history');
 await withDb(()=>db.exec('DROP TRIGGER reject_chat_delete ON vuihoc."PHIEN_CHAT_AI"; DROP FUNCTION vuihoc.reject_chat_delete()'));
 await withDb(()=>db.query(`INSERT INTO vuihoc."CAU_HOI_CHAT_AI"(macauhoi,maphien,noidung) SELECT gen_random_uuid(),$1,'Câu hỏi số '||n FROM generate_series(1,25) n`,[ownChat]));
 const firstQuestions=await chat.readTeacherChat(ownChat),nextQuestions=await chat.readTeacherChat(ownChat,20);
 assert.equal(firstQuestions.length,21);assert.equal(nextQuestions.length,6);
 assert.equal(new Set([...firstQuestions.slice(0,20),...nextQuestions].map(row=>row.macauhoi)).size,26,'question pages preserve all rows without overlap');
 await withDb(()=>db.query(`INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,magiaovien,manguoidung) SELECT gen_random_uuid(),$1,$2 FROM generate_series(1,25)`,[linkedTeacher.id,linkedTeacher.user_id]));
 const firstChats=await chat.listTeacherChats(),nextChats=await chat.listTeacherChats(20);
 assert.equal(firstChats.length,21);assert.equal(nextChats.length,6);
 assert.equal(new Set([...firstChats.slice(0,20),...nextChats].map(row=>row.maphien)).size,26,'history pages are bounded');
 await withDb(async()=>{
  await db.exec('BEGIN READ ONLY; SET LOCAL ROLE anon');
  try{
   await db.query('SELECT * FROM public.vuihoc_ai_chat_list($1,$2)',[accounts.getAccountSessionToken(),0]);
   await db.query('SELECT * FROM public.vuihoc_ai_chat_questions($1,$2,$3)',[accounts.getAccountSessionToken(),ownChat,0]);
   await db.exec('COMMIT');
  }catch(error){await db.exec('ROLLBACK');throw error;}
 });
 await chat.deleteTeacherChat(ownChat);await chat.deleteTeacherChat(ownChat);
 assert.equal((await withDb<any>(()=>db.query('SELECT count(*)::int n FROM vuihoc."CAU_HOI_CHAT_AI" WHERE maphien=$1',[ownChat]))).rows[0].n,0);
 await assert.rejects(chat.saveTeacherQuestion(ownChat,crypto.randomUUID(),'Late write'),/đã xóa/);
 for(const role of ['anon','authenticated'])assert.equal((await withDb<any>(()=>db.query(`SELECT has_table_privilege($1,'vuihoc."CAU_HOI_CHAT_AI"','SELECT') AS allowed`,[role]))).rows[0].allowed,false);
 await withDb(()=>db.query('DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE magiaovien=$1 OR maphien=$2',[linkedTeacher.id,foreignChat]));
 console.log('PASS: question-only history survives reload, scoped teacher access, bounded read-only pages, no AI response columns, atomic deletion and blocked late writes');
 const retainedTeacherChat=crypto.randomUUID();await chat.openTeacherChat(retainedTeacherChat);
 await chat.saveTeacherQuestion(retainedTeacherChat,crypto.randomUUID(),'Câu hỏi riêng của giáo viên');
 const alterSlot=(slot:any)=>business.setBusinessValue('teachers',(rows:any[])=>rows.map(row=>{
  if(row.id!==linkedTeacher.id)return row;
  const schedule=structuredClone(row.schedule||{});const key=Object.hasOwn(schedule,slot.id)?slot.id:slot.code;
  const days=[...(schedule[key]||Array(7).fill('none'))];days[slot.day_index]=days[slot.day_index]==='free'?'none':'free';schedule[key]=days;
  return {...row,schedule};
 }));
 alterSlot(occupiedSlot);await assert.rejects(business.waitForBusinessSave(),/Ca đã gắn/);await business.loadBusinessData();
 const unlockedSlot:any=(await withDb<any>(()=>db.query(`SELECT k.madinhdanh id,k.makhunggio code,d.day_index FROM vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day_index) WHERE NOT EXISTS(SELECT 1 FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop WHERE l.magiaovien=$1 AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') AND s.makhunggio=k.madinhdanh AND s.thutrongtuan=d.day_index+1) AND NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.magiaoviendaythay=$1 AND b.makhunggio=k.madinhdanh AND extract(isodow FROM b.ngayhoc)=d.day_index+1 AND b.trangthai NOT IN ('NGHI_HOC','DA_HOAN_THANH')) LIMIT 1`,[linkedTeacher.id]))).rows[0];
 assert.ok(unlockedSlot);alterSlot(unlockedSlot);await business.waitForBusinessSave();
 await accounts.logoutAccount();business.resetBusinessData();await accounts.loginAccount('admin.tong','234567');await business.loadBusinessData();
 await assert.rejects(historyApi.readTeacherChat(retainedTeacherChat),/không thuộc/);
 assert.ok(!(await historyApi.listTeacherChats()).some(row=>row.maphien===retainedTeacherChat));
 await historyApi.deleteTeacherChat(retainedTeacherChat);
 assert.equal((await withDb<any>(()=>db.query('SELECT count(*)::int n FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[retainedTeacherChat]))).rows[0].n,1,'administrator uses full chat functions but cannot delete another account history');
 assert.equal((await historyApi.readTeacherChat(adminChat)).length,1,'administrator question survives portal/account switches');
 await historyApi.deleteTeacherChat(adminChat);
 assert.equal((await withDb<any>(()=>db.query('SELECT count(*)::int n FROM vuihoc."CAU_HOI_CHAT_AI" WHERE maphien=$1',[adminChat]))).rows[0].n,0);
 await withDb(()=>db.query('DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=$1',[retainedTeacherChat]));
 console.log('PASS: administrator history works without teacher profile, respects AI permissions and remains isolated from teacher accounts');
 console.log('PASS: real teacher availability rejects assigned slot changes and accepts unrelated slot edits');
 // Stop releases only this class. Preferences, other subjects, and past lessons stay intact.
 const releaseTeacherId=occupiedClass.teacherId;
 const releaseSlot:any=(await withDb<any>(()=>db.query('SELECT makhunggio,thutrongtuan-1 AS day FROM vuihoc."LICH_LOP" WHERE malop=$1 LIMIT 1',[occupiedClass.id]))).rows[0];
 await withDb(()=>db.query(`UPDATE vuihoc."LICH_RANH_DINH_KY" SET trangthai='busy' WHERE magiaovien=$1 AND makhunggio=$2 AND thutrongtuan=$3`,[releaseTeacherId,releaseSlot.makhunggio,releaseSlot.day]));
 // Simulate a pre-existing overlapping assignment: stopping one class must not unlock both.
 await withDb(()=>db.query(`INSERT INTO vuihoc."LOP_HOC" SELECT (jsonb_populate_record(NULL::vuihoc."LOP_HOC",to_jsonb(l)||jsonb_build_object('madinhdanh','REG-OVERLAP','malophoc','REG-OVERLAP'))).* FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh=$1`,[occupiedClass.id]));
 await withDb(()=>db.query(`INSERT INTO vuihoc."LICH_LOP"(malop,thutu,thutrongtuan,makhunggio) SELECT 'REG-OVERLAP',thutu,thutrongtuan,makhunggio FROM vuihoc."LICH_LOP" WHERE malop=$1`,[occupiedClass.id]));
 const slotsBefore:any=(await withDb<any>(()=>db.query('SELECT * FROM vuihoc."LICH_RANH_DINH_KY" WHERE magiaovien=$1 ORDER BY makhunggio,thutrongtuan',[releaseTeacherId]))).rows;
 const preferences:any=(await withDb<any>(()=>db.query('SELECT * FROM vuihoc."LICH_DANG_KY_MON_HOC" WHERE mahocsinh=$1 ORDER BY mamonhoc,thutu',[pupilId]))).rows;
 const lessonsBefore:any=(await withDb<any>(()=>db.query('SELECT * FROM vuihoc."BUOI_HOC" WHERE malop=$1 AND vaolopluc IS NOT NULL ORDER BY madinhdanh',[occupiedClass.id]))).rows;
 const otherRegs=business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations.filter((row:any)=>row.subject!==occupiedClass.subject);
 await business.loadBusinessData();
 business.setBusinessValue('classes',(rows:any[])=>rows.map(row=>row.id===occupiedClass.id?{...row,status:'Tạm dừng',studentIds:[]}:row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 const releasedPupil=business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId);
 const releasedRegistration=releasedPupil.registrations.find((row:any)=>row.subject===occupiedClass.subject);
 assert.equal(releasedRegistration.status,'Chờ xếp lớp');assert.ok(!releasedRegistration.currentClassCode);
 assert.deepEqual(releasedPupil.registrations.filter((row:any)=>row.subject!==occupiedClass.subject),otherRegs);
 assert.deepEqual((await withDb<any>(()=>db.query('SELECT * FROM vuihoc."LICH_DANG_KY_MON_HOC" WHERE mahocsinh=$1 ORDER BY mamonhoc,thutu',[pupilId]))).rows,preferences);
 assert.deepEqual((await withDb<any>(()=>db.query('SELECT * FROM vuihoc."BUOI_HOC" WHERE malop=$1 AND vaolopluc IS NOT NULL ORDER BY madinhdanh',[occupiedClass.id]))).rows,lessonsBefore);
 const slotsAfter:any=(await withDb<any>(()=>db.query('SELECT * FROM vuihoc."LICH_RANH_DINH_KY" WHERE magiaovien=$1 ORDER BY makhunggio,thutrongtuan',[releaseTeacherId]))).rows;
 for(const old of slotsBefore){
  const next=slotsAfter.find((row:any)=>row.makhunggio===old.makhunggio&&row.thutrongtuan===old.thutrongtuan);
  const occupied:any=(await withDb<any>(()=>db.query('SELECT vuihoc.ca_giao_vien_con_lop($1,$2,$3) AS occupied',[releaseTeacherId,old.makhunggio,old.thutrongtuan]))).rows[0].occupied;
  if(occupied)assert.equal(next.trangthai,old.trangthai,'another active class keeps its slot');
  else if(old.makhunggio===releaseSlot.makhunggio&&old.thutrongtuan===releaseSlot.day)assert.equal(next.trangthai,'free');
  else if(old.trangthai!=='busy')assert.equal(next.trangthai,old.trangthai,'unrelated availability preserved');
 }
 assert.equal(slotsAfter.find((row:any)=>row.makhunggio===releaseSlot.makhunggio&&row.thutrongtuan===releaseSlot.day).trangthai,'busy','overlapping live class retains busy state');
 const countBeforeFinalStop=business.getBusinessSnapshot().data.teachers.find((row:any)=>row.id===releaseTeacherId).busySlots;
 business.setBusinessValue('classes',(rows:any[])=>rows.map(row=>row.id==='REG-OVERLAP'?{...row,status:'Tạm dừng',studentIds:[]}:row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 const releasedSlot:any=(await withDb<any>(()=>db.query('SELECT trangthai FROM vuihoc."LICH_RANH_DINH_KY" WHERE magiaovien=$1 AND makhunggio=$2 AND thutrongtuan=$3',[releaseTeacherId,releaseSlot.makhunggio,releaseSlot.day]))).rows[0];
 assert.equal(releasedSlot.trangthai,'free','last active class stop frees the teacher');
 const teacherAfterStop=business.getBusinessSnapshot().data.teachers.find((row:any)=>row.id===releaseTeacherId);
 assert.ok(teacherAfterStop.busySlots<countBeforeFinalStop,'queried occupied count reflects the stop');
 assert.equal(teacherAfterStop.busySlots,0);
 const releaseCredentials:any=(await withDb<any>(()=>db.query('SELECT tendangnhap,matkhau FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=$1',[teacherAfterStop.user_id]))).rows[0];
 await accounts.logoutAccount();business.resetBusinessData();await accounts.loginAccount(releaseCredentials.tendangnhap,releaseCredentials.matkhau);await business.loadBusinessData();
 business.setBusinessValue('teachers',(rows:any[])=>rows.map(row=>{
  if(row.id!==releaseTeacherId)return row;
  const schedule=structuredClone(row.schedule);const key=Object.hasOwn(schedule,releaseSlot.makhunggio)?releaseSlot.makhunggio:business.getBusinessSnapshot().data.time_slots.find((slot:any)=>slot.id===releaseSlot.makhunggio).code;
  schedule[key][releaseSlot.day]='none';return {...row,schedule};
 }));
 await business.waitForBusinessSave();
 await accounts.logoutAccount();business.resetBusinessData();await accounts.loginAccount('admin.tong','234567');await business.loadBusinessData();
 console.log('PASS: overlapping active class keeps slot locked; final stop frees slot/count and teacher can edit it afterward');
 business.setBusinessValue('students',(rows:any[])=>rows.map(row=>row.id===pupilId?updateStudentRegistration(row,{subject:occupiedClass.subject,model:alternateModel}):row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().data.students.find((row:any)=>row.id===pupilId).registrations.find((row:any)=>row.subject===occupiedClass.subject).model,alternateModel);
 console.log('PASS: stopping class releases teachers/students atomically, preserves other subjects/preferences/started lesson history, and permits subsequent academic edit');
 // Configurations and dictionaries also retain their stored singleton/row IDs.
 business.setBusinessValue('rag_bot_config',(value:any)=>({...value,welcomeGreeting:'Confirmed greeting'}));
 await business.waitForBusinessSave();await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().data.rag_bot_config.welcomeGreeting,'Confirmed greeting');
 console.log('PASS update: bot configuration');
 const tones=business.getBusinessSnapshot().data.tone_directives;
 const toneId=Object.keys(tones)[0];assert.ok(toneId);
 business.setBusinessValue('tone_directives',(value:any)=>({...value,[toneId]:{...value[toneId],directive:'Confirmed tone'}}));
 await business.waitForBusinessSave();await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().data.tone_directives[toneId].directive,'Confirmed tone');
 console.log('PASS update: tone configuration');
 const periods=Object.entries(business.getBusinessSnapshot().data.monthly_payroll) as [string,any][];
 const unlocked=periods.find(([,period])=>!period.isLocked);assert.ok(unlocked,'unlocked payroll fixture');
 const [periodKey]=unlocked;
 business.setBusinessValue('monthly_payroll',(value:any)=>({...value,[periodKey]:{...value[periodKey],unlock_reason:'Regression reason'}}));
 await business.waitForBusinessSave();await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().data.monthly_payroll[periodKey].unlock_reason,'Regression reason');
 console.log('PASS update: payroll aggregate');
 // Prove an existing-row update does not execute the INSERT branch/triggers.
 await withDb(()=>db.exec(`CREATE FUNCTION vuihoc.reject_subject_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INSERT must not run for an existing row'; END $$;
 CREATE TRIGGER reject_subject_insert BEFORE INSERT ON vuihoc."MON_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.reject_subject_insert();`));
 const subject=business.getBusinessSnapshot().data.subjects[0];
 business.setBusinessValue('subjects',(rows:any[])=>rows.map(row=>row.id===subject.id?{...row,name:'UPDATE only'}:row));
 await business.waitForBusinessSave();
 await withDb(()=>db.exec('DROP TRIGGER reject_subject_insert ON vuihoc."MON_HOC"; DROP FUNCTION vuihoc.reject_subject_insert()'));
 console.log('PASS: existing row never runs INSERT trigger');
 // An independent server edit must not be overwritten by a whole stale UI row.
 await withDb(()=>db.query('UPDATE vuihoc."MON_HOC" SET mota=$1 WHERE madinhdanh=$2',['Independent change',subject.id]));
 business.setBusinessValue('subjects',(rows:any[])=>rows.map(row=>row.id===subject.id?{...row,name:'Keep independent field'}:row));
 await business.waitForBusinessSave();await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().data.subjects.find((row:any)=>row.id===subject.id).desc,'Independent change');
 console.log('PASS: independent field edit preserved');
 await withDb(()=>db.query('UPDATE vuihoc."MON_HOC" SET tenmonhoc=$1 WHERE madinhdanh=$2',['Changed in another session',subject.id]));
 business.setBusinessValue('subjects',(rows:any[])=>rows.map(row=>row.id===subject.id?{...row,name:'Stale overwrite'}:row));
 await assert.rejects(business.waitForBusinessSave(),/phiên khác/);
 await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().data.subjects.find((row:any)=>row.id===subject.id).name,'Changed in another session');
 console.log('PASS: conflicting update rejected without overwriting database');
 // Account and permission-group edits use their existing IDs and survive refresh.
 const user=accounts.getAccountSnapshot().users.find(row=>row.id===linkedTeacher.user_id)!;
 assert.ok(user);
 const accountCount=accounts.getAccountSnapshot().users.length;
 accounts.setSessionUsers(rows=>rows.map(row=>row.id===user.id?{...row,phone:'0901234567'}:row));
 await accounts.waitForAccountSave();await accounts.refreshAccountSession();
 assert.equal(accounts.getAccountSnapshot().users.find(row=>row.id===user.id)!.phone,'0901234567');
 assert.equal(accounts.getAccountSnapshot().users.length,accountCount);
 await business.loadBusinessData();assert.equal(business.getBusinessSnapshot().data.teachers.find((row:any)=>row.id===linkedTeacher.id).phone,'0901234567');
 console.log('PASS update: accounts');
 const group=accounts.getAccountSnapshot().groups.find(row=>!row.isDefault)!;assert.ok(group);
 accounts.setSessionGroups(rows=>rows.map(row=>row.id===group.id?{...row,desc:'Updated group description'}:row));
 await accounts.waitForAccountSave();await accounts.refreshAccountSession();
 assert.equal(accounts.getAccountSnapshot().groups.find(row=>row.id===group.id)!.desc,'Updated group description');
 console.log('PASS update: permission groups');
 // The restored checkout migration must also be safe AFTER all newer updates.
 const checkoutBefore=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows;
 const creditBeforeRepair=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
 await db.exec(file('supabase/migrations/20261018_auto_checkout.sql'));
 await db.exec(file('supabase/migrations/20261018_auto_checkout.sql'));
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows,checkoutBefore);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows,creditBeforeRepair);
 assert.equal((await db.query(`SELECT vuihoc.trang_thai_ca_theo_du_lieu('2001-02-01','18:00','19:30',
  '2001-02-01T18:00:00+07','2001-02-01T19:24:59+07','DA_HOC','2001-02-01T20:00:00+07') state`)).rows[0].state,'CHUA_HOAN_TAT');
 console.log('PASS: checkout repair reruns after latest migrations without changing lessons, payroll or newer integrations');
 console.log('PASS: frontend store -> Supabase RPC as anon -> database -> reload; stable row IDs and untouched other rows');
}catch(error){console.error('Update regression failed:',error);throw error;}
finally{await databaseQueue;globalThis.fetch=originalFetch;await db.close();}
