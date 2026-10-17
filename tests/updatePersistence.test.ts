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
 await db.exec(file('supabase/migrations/20261030_update_existing_business_rows.sql'));
 await db.exec(file('supabase/migrations/20261030_update_existing_business_rows.sql'));
 await db.exec(file('supabase/migrations/20261031_profile_edit_rules.sql'));
 await db.exec(file('supabase/migrations/20261031_profile_edit_rules.sql'));
 await db.exec(file('supabase/migrations/20261101_stop_class_release_slots.sql'));
 await db.exec(file('supabase/migrations/20261101_stop_class_release_slots.sql'));
 globalThis.fetch=async(url,options)=>{
  const request=url instanceof Request?url:new Request(url,options);
  const name=new URL(request.url).pathname.split('/').at(-1)!;
  assert.match(name,/^vuihoc_[a-z_]+$/);
  const args=await request.json();requests.push({name,args});
  return withDb(async()=>{
  try {
   await db.exec('SET ROLE anon');
   const entries=Object.entries(args);
   const query='SELECT public.'+name+'('+entries.map(([key],i)=>key+' => $'+(i+1)).join(',')+') result';
   const result=(await db.query(query,entries.map(([,value])=>value))).rows[0].result;
   return Response.json(result);
  }catch(error:any){return Response.json({code:error.code,message:error.message,details:error.detail,hint:error.hint},{status:400});}
  finally{await db.exec('RESET ROLE');}
  });
 };
 const accounts=await import('../src/lib/accountSession');
 const business=await import('../src/lib/businessPersistence');
 await accounts.loginAccount('admin.tong','234567');
 await business.loadBusinessData();
 assert.equal(business.getBusinessSnapshot().error,'');
 assert.equal(business.getBusinessSnapshot().data.criteria_categories.length,0,'retired criteria table remains absent');
 const {defaultReportConfig}=await import('../src/lib/customReports');
 const reportConfig=defaultReportConfig({id:'classes',label:'Classes',dateKind:'event',records:[],metrics:[{id:'count',label:'Count',mode:'count'}],dimensions:[],defaultMetricIds:['count'],filters:[],detailFields:[]});
 business.setBusinessValue('report_templates',[{id:'REGRESSION-REPORT',name:'Report',config:reportConfig}]);
 await business.waitForBusinessSave();
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
 console.log('PASS: frontend store -> Supabase RPC as anon -> database -> reload; stable row IDs and untouched other rows');
}catch(error){console.error('Update regression failed:',error);throw error;}
finally{await databaseQueue;globalThis.fetch=originalFetch;await db.close();}
