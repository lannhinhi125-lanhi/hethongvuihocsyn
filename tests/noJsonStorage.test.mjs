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
 await db.exec(migration);
 await db.exec(migration);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 const after=await rpc('vuihoc_business_data',[admin.token]);
 for(const cls of before.classes){
  const next=after.classes.find(c=>c.madinhdanh===cls.madinhdanh);
  assert.deepEqual(next.hoclieu,cls.hoclieu);
  for(const [key,s] of Object.entries(cls.chitietcahoc||{})) {
   const saved=next.chitietcahoc[key];
   for(const [field,value] of Object.entries(s)) {
    if(['checkinAt','checkoutAt'].includes(field)) assert.equal(new Date(saved[field]).getTime(),new Date(value).getTime());
    else if(field!=='coverTeacherName') assert.deepEqual(saved[field],value,`${cls.madinhdanh}.${key}.${field}`);
   }
  }
 }
 for(const teacher of before.teachers)assert.deepEqual(after.teachers.find(t=>t.madinhdanh===teacher.madinhdanh).diemtieuchi,teacher.diemtieuchi);
 const clean=row=>Object.fromEntries(Object.entries(row).filter(([k])=>k!=='ngaytao'));
 let cls=clean(after.classes.find(c=>c.madinhdanh==='CLS-001'));
 const material={month:'11/2026',week:'Week 1',session:1,title:'Column storage',slide:'https://example.com/slide',lms:'https://example.com/lms'};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[material]}}]]);
 let fresh=await rpc('vuihoc_business_data',[admin.token]);
 cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.deepEqual(cls.hoclieu,[material]);
 assert.equal((await db.query('SELECT tieude FROM vuihoc."HOC_LIEU_LOP" WHERE malop=$1',[cls.madinhdanh])).rows[0].tieude,material.title);
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[]}}]]);
 fresh=await rpc('vuihoc_business_data',[admin.token]);
 cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.deepEqual(cls.hoclieu,[]);
 const session={sessionNum:12,dateStr:'2026-11-02 18:00 - 19:30',title:'Saved session',status:'Đang học',
  materialGv:'slide',materialHs:'student',exerciseLms:'lms',checkinAt:'2026-11-02T18:00:00+07:00',attendance:{},feedback:{}};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,chitietcahoc:{...cls.chitietcahoc,12:session}}}]]);
 fresh=await rpc('vuihoc_business_data',[admin.token]);
 cls=clean(fresh.classes.find(c=>c.madinhdanh==='CLS-001'));
 assert.equal(cls.chitietcahoc[12].title,session.title);
 assert.equal((await db.query('SELECT tieude FROM vuihoc."CHI_TIET_CA_LOP" WHERE malop=$1 AND khoaca=$2',[cls.madinhdanh,'12'])).rows[0].tieude,session.title);
 const previous=fresh.teacher_evaluations[0];
 const evaluation={...clean(previous),madinhdanh:'NO-JSON-EVAL',mabienban:'NO-JSON-EVAL',diemtieuchi:{tc1:7,tc2:8,tc3:9}};
 await rpc('vuihoc_save_business',[admin.token,[{dataset:'teacher_evaluations',before:null,after:evaluation}]]);
 assert.deepEqual((await db.query('SELECT diemtc1,diemtc2,diemtc3 FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh=$1',[evaluation.madinhdanh])).rows[0],{diemtc1:'7',diemtc2:'8',diemtc3:'9'});
 await assert.rejects(rpc('vuihoc_save_business',[admin.token,[{dataset:'classes',before:cls,after:{...cls,hoclieu:[{...material,unknown:'must not disappear'}]}}]]),/ánh xạ/);
 await db.exec(file('supabase/diagnostics/relational_storage_audit.sql'));
 console.log('PASS: no JSON columns, repeat migration, data preservation, materials CRUD, sessions, evaluations and rollback');
} catch(error) {
 console.error(error.message,error.detail||'',error.where||'');
 process.exitCode=1;
} finally {await db.close();}
