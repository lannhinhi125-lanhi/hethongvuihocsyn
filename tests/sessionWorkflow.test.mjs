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
 const creditBefore=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
 const migration=file('supabase/migrations/20261017_session_workflow.sql');
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows,creditBefore);
 const values=(await db.query(`SELECT vuihoc.trang_thai_ca_theo_du_lieu('2026-10-15','12:50','13:50',NULL,NULL,'CHUA_DIEN_RA','2026-10-15T12:49:00+07') future,
 vuihoc.trang_thai_ca_theo_du_lieu('2026-10-15','12:50','13:50',NULL,NULL,'CHUA_DIEN_RA','2026-10-15T12:50:00+07') missing,
 vuihoc.trang_thai_ca_theo_du_lieu('2026-10-15','12:50','13:50',NULL,NULL,'CHUA_DIEN_RA','2026-10-15T14:00:00+07') ended_missing,
 vuihoc.trang_thai_ca_theo_du_lieu('2026-10-15','12:50','13:50','2026-10-15T12:50:00+07',NULL,'DANG_HOC','2026-10-15T13:49:00+07') ongoing,
 vuihoc.trang_thai_ca_theo_du_lieu('2026-10-15','12:50','13:50','2026-10-15T12:50:00+07',NULL,'DANG_HOC','2026-10-15T13:50:00+07') unfinished`)).rows[0];
 assert.deepEqual(values,{future:'CHUA_DIEN_RA',missing:'CHUA_HOC',ended_missing:'CHUA_HOC',ongoing:'DANG_HOC',unfinished:'CHUA_HOAN_TAT'});
 assert.equal((await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')`)).rows[0].n,0);
 const cls=(await db.query('SELECT madinhdanh,magiaovien FROM vuihoc."LOP_HOC" WHERE madinhdanh=$1',['CLS-001'])).rows[0];
 const slot=(await db.query('SELECT madinhdanh FROM vuihoc."KHUNG_GIO" WHERE khoanggio=$1',['18:00 - 19:30'])).rows[0].madinhdanh;
 await db.query(`INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh)
  VALUES('STATE-MISSING',$1,'2001-01-01',$2,'18:00','19:30',$3),('STATE-FUTURE',$1,'2035-01-01',$2,'18:00','19:30',$3)`,[cls.madinhdanh,slot,cls.magiaovien]);
 const state=async id=>(await db.query('SELECT trangthai,vaolopluc,ketthucluc FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',[id])).rows[0];
 assert.equal((await state('STATE-MISSING')).trangthai,'CHUA_HOC');
 assert.equal((await state('STATE-FUTURE')).trangthai,'CHUA_DIEN_RA');
 await db.query(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc='2001-01-01 18:00+07',trangthai='DANG_HOC' WHERE madinhdanh='STATE-MISSING'`);
 assert.equal((await state('STATE-MISSING')).trangthai,'CHUA_HOAN_TAT');
 await db.query(`UPDATE vuihoc."BUOI_HOC" SET ketthucluc='2001-01-01 19:30+07' WHERE madinhdanh='STATE-MISSING'`);
 assert.equal((await state('STATE-MISSING')).trangthai,'DA_HOC');
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi='STATE-MISSING'`)).rows[0].n,0,'Ended monitoring state does not generate work credit');
 const roster=(await db.query('SELECT mahocsinh FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=$1',['STATE-MISSING'])).rows;
 assert.ok(roster.length>0);
 for (let i=0;i<roster.length;i++) {
  await db.query('UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung=$1 WHERE mabuoi=$2 AND mahocsinh=$3',['Nhận xét '+i,'STATE-MISSING',roster[i].mahocsinh]);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['STATE-MISSING'])).rows[0].n,i===roster.length-1?1:0);
 }
 const lockedCredit=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['STATE-MISSING'])).rows;
 await db.query('UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung=$1 WHERE mabuoi=$2 AND mahocsinh=$3',['Sửa nội dung','STATE-MISSING',roster[0].mahocsinh]);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['STATE-MISSING'])).rows,lockedCredit);
 await assert.rejects(db.query('UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung=$1 WHERE mabuoi=$2 AND mahocsinh=$3',['','STATE-MISSING',roster[0].mahocsinh]),/Ca/);
 await db.query('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong=$1',['2001-01']);
 await db.query('SELECT vuihoc.dong_bo_trang_thai_ca()');
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['STATE-MISSING'])).rows,lockedCredit);
 const data=await rpc('vuihoc_business_data',[admin.token]);
 const saved=data.dated_lessons.find(l=>l.madinhdanh==='STATE-MISSING');
 assert.equal(saved.trangthai,'DA_HOC');assert.equal(saved.tiendonhanxet.state,'DA_DU');
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND column_name='trangthaica'")).rows[0].n,0);
 assert.equal((await db.query("SELECT has_function_privilege('anon','vuihoc.dong_bo_trang_thai_ca()','EXECUTE') allowed")).rows[0].allowed,false);
 await db.query('SELECT vuihoc.dong_bo_ca_theo_lich()');
 assert.equal((await db.query('SELECT vuihoc.dong_bo_ca_theo_lich() n')).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM (SELECT malop,ngayhoc,makhunggio FROM vuihoc."BUOI_HOC" GROUP BY malop,ngayhoc,makhunggio HAVING count(*)>1) duplicated')).rows[0].n,0);
 const periodBefore=(await db.query('SELECT * FROM vuihoc."BANG_CONG_THANG" ORDER BY madinhdanh')).rows;
 await rpc('vuihoc_business_data',[admin.token]);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."BANG_CONG_THANG" ORDER BY madinhdanh')).rows,periodBefore,'List RPC remains read-only');
 console.log('PASS: one lifecycle column; checkout then feedback then credit; no duplicate credit; locked history; repeat migration; no JSON');
} catch(error){console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;}
finally {await db.close();}
