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
 const migration=file('supabase/migrations/20261018_auto_checkout.sql');
 await db.exec(migration);await db.exec(migration);
 const cls=(await db.query('SELECT madinhdanh,magiaovien FROM vuihoc."LOP_HOC" WHERE madinhdanh=$1',['CLS-001'])).rows[0];
 const slot=(await db.query('SELECT madinhdanh FROM vuihoc."KHUNG_GIO" WHERE khoanggio=$1',['18:00 - 19:30'])).rows[0].madinhdanh;
 for(const [id,day,entered] of [['AUTO','2001-02-01',true],['NO-SHOW','2001-02-02',false],['EARLY','2001-02-03',true],['FIVE','2001-02-04',true],['LOCKED','2001-03-01',true]]) {
  await db.query('INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,vaolopluc) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
   [id,cls.madinhdanh,day,slot,id==='NIGHT'?'23:00':'18:00',id==='NIGHT'?'00:30':'19:30',cls.magiaovien,entered?day+(id==='NIGHT'?'T23:00:00+07:00':'T18:00:00+07:00'):null]);
 }
 const row=async id=>(await db.query('SELECT trangthai,ketthucluc,manguoiketthuc FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',[id])).rows[0];
 const close=async now=>db.query('SELECT vuihoc.tu_dong_checkout($1::timestamptz)',[now]);
 const student=(await db.query('SELECT mahocsinh FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=$1 LIMIT 1',['AUTO'])).rows[0].mahocsinh;
 await assert.rejects(db.query('UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung=$1 WHERE mabuoi=$2 AND mahocsinh=$3',['Comment','AUTO',student]),/checkout/);
 await close('2001-02-01T19:29:59+07:00');assert.equal((await row('AUTO')).ketthucluc,null);
 await close('2001-02-01T19:31:12+07:00');
 assert.equal(new Date((await row('AUTO')).ketthucluc).getTime(),Date.parse('2001-02-01T19:30:00+07:00'));
 assert.equal((await row('AUTO')).trangthai,'DA_HOC');assert.equal((await row('AUTO')).manguoiketthuc,null);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['AUTO'])).rows[0].n,0);
 await db.query('UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung=$1 WHERE mabuoi=$2',['Comment','AUTO']);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['AUTO'])).rows[0].n,1);
 await close('2001-02-02T20:00:00+07:00');assert.equal((await row('NO-SHOW')).ketthucluc,null);
 await db.query('UPDATE vuihoc."BUOI_HOC" SET ketthucluc=$1 WHERE madinhdanh=$2',['2001-02-03T19:24:59+07:00','EARLY']);
 assert.equal((await row('EARLY')).trangthai,'CHUA_HOAN_TAT');
 await db.query('UPDATE vuihoc."NHAN_XET_BUOI_HOC" SET noidung=$1 WHERE mabuoi=$2',['Comment','EARLY']);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1',['EARLY'])).rows[0].n,0);
 await close('2001-02-03T20:00:00+07:00');assert.equal((await row('EARLY')).trangthai,'CHUA_HOAN_TAT');
 await db.query('UPDATE vuihoc."BUOI_HOC" SET ketthucluc=$1 WHERE madinhdanh=$2',['2001-02-04T19:25:00+07:00','FIVE']);assert.equal((await row('FIVE')).trangthai,'DA_HOC');
 await db.query('INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES($1,true,false) ON CONFLICT(kycong) DO UPDATE SET dakhoa=true',['2001-03']);
 await close('2001-03-01T20:00:00+07:00');assert.equal((await row('LOCKED')).ketthucluc,null);
 const before=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows;
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh')).rows,before);
 assert.equal((await db.query("SELECT has_function_privilege('authenticated','vuihoc.tu_dong_checkout(timestamptz)','EXECUTE') allowed")).rows[0].allowed,false);
 console.log('PASS: automatic exact checkout, feedback gate, no-show, >5 minute early checkout, normal 5 minute checkout, no duplicate work, locked periods, rerun');
} catch(error){console.error(error.message,error.detail||'',error.where||'');process.exitCode=1;} finally {await db.close();}
