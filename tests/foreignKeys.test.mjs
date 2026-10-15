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
 let admin=await rpc('vuihoc_login',['admin.tong','234567']);
 const before=await rpc('vuihoc_business_data',[admin.token]);
 {
  const migration=file('supabase/migrations/20261016_complete_foreign_keys.sql');
  const accountBefore=await rpc('vuihoc_session',[admin.token]);
  await db.exec(migration);await db.exec(migration);
  const after=await rpc('vuihoc_business_data',[admin.token]);
  const clean=row=>Object.fromEntries(Object.entries(row).filter(([k])=>k!=='ngaytao'));
  for(const original of before.classes){
   const row=after.classes.find(c=>c.madinhdanh===original.madinhdanh);
   assert.deepEqual([...row.danhsachmahocsinh].sort(),[...original.danhsachmahocsinh].sort());
   assert.equal(row.lichhoc,original.lichhoc);assert.equal(row.khoi,original.khoi);
  }
  for(const original of before.students){
   const row=after.students.find(s=>s.madinhdanh===original.madinhdanh);
   assert.equal(row.khoi,original.khoi);assert.deepEqual(row.lichdangky,original.lichdangky);
  }
  const accountAfter=await rpc('vuihoc_session',[admin.token]);
  assert.deepEqual(accountAfter.role_groups,accountBefore.role_groups);
  admin=await rpc('vuihoc_login',['admin.tong','234567']);assert.ok(admin.token);
  const columns=(await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='vuihoc'")).rows;
  assert.ok(!columns.some(c=>['json','jsonb'].includes(c.data_type)));
  for(const [table,fields] of Object.entries({LOP_HOC:['danhsachmahocsinh','lichhoc','khoi'],HOC_SINH:['lichdangky','khoi'],NHOM_QUYEN:['danhsachquyen']}))
   assert.ok(!columns.some(c=>c.table_name===table&&fields.includes(c.column_name)));
  let cls=clean(after.classes.find(c=>c.madinhdanh==='CLS-001'));
  let student=clean(after.students.find(s=>s.madinhdanh===cls.danhsachmahocsinh[0]));
  const changedStudent={...student,lichdangky:['CN (18:00 - 19:30)']};
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'students',before:student,after:changedStudent}]]);
  student=clean((await rpc('vuihoc_business_data',[admin.token])).students.find(s=>s.madinhdanh===student.madinhdanh));
  assert.deepEqual(student.lichdangky,changedStudent.lichdangky);
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,lichhoc:'CN (18:00 - 19:30)'}}]]);
  cls=clean((await rpc('vuihoc_business_data',[admin.token])).classes.find(c=>c.madinhdanh===cls.madinhdanh));
  assert.equal(cls.lichhoc,'CN (18:00 - 19:30)');
  await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,lichhoc:'CN (03:00 - 04:00)'}}]]),/danh mục/);
  await assert.rejects(db.exec(`INSERT INTO vuihoc."LICH_LOP" VALUES('CLS-001',999,1,'NO-SLOT')`),/foreign key/);
  await assert.rejects(db.exec(`UPDATE vuihoc."LOP_HOC" SET makhoi='NO-GRADE' WHERE madinhdanh='CLS-001'`),/foreign key/);
  await assert.rejects(db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET masuco='NO-INCIDENT' WHERE madinhdanh=(SELECT madinhdanh FROM vuihoc."SU_CO_BUOI_HOC" LIMIT 1)`),/foreign key|hệ số/);
  const mapped=(await db.query('SELECT malop,khoaca,mabuoi FROM vuihoc."CHI_TIET_CA_LOP" LIMIT 1')).rows[0];
  const otherLesson=(await db.query('SELECT madinhdanh FROM vuihoc."BUOI_HOC" WHERE malop<>$1 LIMIT 1',[mapped.malop])).rows[0];
  await assert.rejects(db.query('UPDATE vuihoc."CHI_TIET_CA_LOP" SET mabuoi=$1 WHERE malop=$2 AND khoaca=$3',[otherLesson.madinhdanh,mapped.malop,mapped.khoaca]),/foreign key/);
  const group={madinhdanh:'FK-GROUP',tennhomquyen:'FK group',phanloai:'VẬN HÀNH',mota:'Test',soluongnguoidung:0,
   danhsachquyen:['Xem danh mục dùng chung'],macdinh:false,congtruycap:'ADMIN'};
  await rpc('vuihoc_save_accounts',[admin.token,[{dataset:'role_groups',before:null,after:group}]]);
  const savedGroup=clean((await rpc('vuihoc_session',[admin.token])).role_groups.find(g=>g.madinhdanh===group.madinhdanh));
  delete savedGroup.ngaycapnhat;
  assert.deepEqual(savedGroup.danhsachquyen,group.danhsachquyen);
  await assert.rejects(rpc('vuihoc_save_accounts',[admin.token,[{dataset:'role_groups',before:savedGroup,after:{...savedGroup,danhsachquyen:['NO-PERMISSION']}}]]),/foreign key/);
  const newGroup={...savedGroup,danhsachquyen:['Quản lý danh mục môn học']};
  await rpc('vuihoc_save_accounts',[admin.token,[{dataset:'role_groups',before:savedGroup,after:newGroup}]]);
  await rpc('vuihoc_save_accounts',[admin.token,[{dataset:'role_groups',before:newGroup,after:null}]]);
  const newStudent={...student,madinhdanh:'FK-STUDENT',hoten:'FK student',malophientai:null};
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'students',before:null,after:newStudent}]]);
  let fresh=await rpc('vuihoc_business_data',[admin.token]);
  let added=clean(fresh.students.find(s=>s.madinhdanh==='FK-STUDENT'));cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
  const fullClass=fresh.classes.find(c=>c.danhsachmahocsinh.length===Number(c.sisotoida)&&c.danhsachmahocsinh.length>0);
  assert.ok(fullClass);
  await assert.rejects(db.query('UPDATE vuihoc."HOC_SINH" SET malophientai=$1 WHERE madinhdanh=$2',[fullClass.malophoc,added.madinhdanh]),/Sĩ số/);
  // This is the same multi-row change emitted by the UI: student and class
  // changes share a transaction, and roster reads must not cause false conflicts.
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'students',before:added,after:{...added,malophientai:cls.malophoc}},
   {dataset:'classes',before:cls,after:{...cls,danhsachmahocsinh:[...cls.danhsachmahocsinh,added.madinhdanh]}}]]);
  fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));added=clean(fresh.students.find(s=>s.madinhdanh==='FK-STUDENT'));
  assert.ok(cls.danhsachmahocsinh.includes(added.madinhdanh));assert.equal(added.malophientai,cls.malophoc);
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,danhsachmahocsinh:cls.danhsachmahocsinh.filter(id=>id!==added.madinhdanh)}}]]);
  added=clean((await rpc('vuihoc_business_data',[admin.token])).students.find(s=>s.madinhdanh==='FK-STUDENT'));assert.equal(added.malophientai,null);
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'students',before:added,after:null}]]);
  fresh=await rpc('vuihoc_business_data',[admin.token]);cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
  const createdClass={...cls,madinhdanh:'FK-CLASS',malophoc:'FK-CLASS-CODE',tenlophoc:'FK class',danhsachmahocsinh:[],
   chitietcahoc:{},phancongdaythay:[],hoclieu:[],lichhoc:'T2 (18:00 - 19:30)'};
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:null,after:createdClass}]]);
  const classRow=clean((await rpc('vuihoc_business_data',[admin.token])).classes.find(c=>c.madinhdanh==='FK-CLASS'));
  assert.equal(classRow.lichhoc,createdClass.lichhoc);assert.deepEqual(classRow.danhsachmahocsinh,[]);
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:classRow,after:null}]]);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."LICH_LOP" WHERE malop=$1',['FK-CLASS'])).rows[0].n,0);
  const category=clean(fresh.teaching_categories.find(c=>c.madinhdanh===cls.macaphoc));
  const changedCategory={...category,danhsachluachon:category.danhsachluachon.map(o=>o.label===cls.khoi?{...o,label:o.label+' renamed'}:o)};
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'teaching_categories',before:category,after:changedCategory}]]);
  assert.equal((await rpc('vuihoc_business_data',[admin.token])).classes.find(c=>c.madinhdanh===cls.madinhdanh).khoi,cls.khoi+' renamed');
  await rpc('vuihoc_save_business',[admin.token,[{dataset:'teaching_categories',before:changedCategory,after:category}]]);
  const fkNames=(await db.query("SELECT conname FROM pg_constraint WHERE connamespace='vuihoc'::regnamespace AND contype='f'")).rows.map(c=>c.conname);
  for(const name of ['chi_tiet_ca_dung_lop_fk','phan_cong_dung_buoi_lop_fk','su_co_dung_loai_nhom_fk','hoc_sinh_khoi_cap_fk','lop_hoc_khoi_cap_fk'])assert.ok(fkNames.includes(name));
  const fkAudit=(await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows;
  assert.equal(fkAudit.length,12);assert.ok(fkAudit.every(r=>r.trangthai==='OK'));
  const access=(await db.query(`SELECT c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') readable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='vuihoc' AND c.relname IN ('QUYEN','NHOM_QUYEN_CHI_TIET','LICH_LOP','LICH_DANG_KY_HOC_SINH')`)).rows;
  assert.equal(access.length,4);assert.ok(access.every(t=>t.relrowsecurity&&!t.readable));
  await db.exec(file('supabase/verify_schema.sql'));
  console.log('PASS: repeat migration; query rosters; FK enforcement; schedules; grades; group permissions CRUD; student assignment/unassignment; no JSON; verification SQL');
 }
} catch(error){console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;}
finally {await db.close();}
