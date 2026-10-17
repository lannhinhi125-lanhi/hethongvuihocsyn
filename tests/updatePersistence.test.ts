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
 const user=accounts.getAccountSnapshot().users.find(row=>row.id!==accounts.getAccountSnapshot().actor!.id)!;
 assert.ok(user);
 const accountCount=accounts.getAccountSnapshot().users.length;
 accounts.setSessionUsers(rows=>rows.map(row=>row.id===user.id?{...row,phone:'0901234567'}:row));
 await accounts.waitForAccountSave();await accounts.refreshAccountSession();
 assert.equal(accounts.getAccountSnapshot().users.find(row=>row.id===user.id)!.phone,'0901234567');
 assert.equal(accounts.getAccountSnapshot().users.length,accountCount);
 console.log('PASS update: accounts');
 const group=accounts.getAccountSnapshot().groups.find(row=>!row.isDefault)!;assert.ok(group);
 accounts.setSessionGroups(rows=>rows.map(row=>row.id===group.id?{...row,desc:'Updated group description'}:row));
 await accounts.waitForAccountSave();await accounts.refreshAccountSession();
 assert.equal(accounts.getAccountSnapshot().groups.find(row=>row.id===group.id)!.desc,'Updated group description');
 console.log('PASS update: permission groups');
 console.log('PASS: frontend store -> Supabase RPC as anon -> database -> reload; stable row IDs and untouched other rows');
}catch(error){console.error('Update regression failed:',error);throw error;}
finally{await databaseQueue;globalThis.fetch=originalFetch;await db.close();}
