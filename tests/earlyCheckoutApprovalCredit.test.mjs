import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
const patch=readFileSync('supabase/fix_early_checkout_credit.sql','utf8');
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA vuihoc;
 CREATE FUNCTION public.vuihoc_login(text,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE TABLE vuihoc."KHUNG_GIO"(madinhdanh text PRIMARY KEY,giobatdau time,gioketthuc time);
 CREATE TABLE vuihoc."BUOI_HOC"(madinhdanh text PRIMARY KEY,mabuoihienthi text,ngayhoc date,makhunggio text REFERENCES vuihoc."KHUNG_GIO",
 trangthai text,vaolopluc timestamptz,ketthucluc timestamptz,magiaovienchinh text,magiaoviendaythay text,duyetgiamsat jsonb,feedback boolean DEFAULT true);
 CREATE TABLE vuihoc."BANG_CONG_THANG"(kycong text PRIMARY KEY,dakhoa boolean);
 CREATE TABLE vuihoc."CONG_DAY_BUOI_HOC"(madinhdanh text,mabuoi text,magiaovien text,hesocong numeric,loaicong text,UNIQUE(mabuoi,magiaovien));
 CREATE TABLE vuihoc."DANH_MUC_SU_CO"(madinhdanh text,manhomsuco text);
 CREATE TABLE vuihoc."LOAI_SU_CO"(manhom text,ma text,ten text);
 CREATE TABLE vuihoc."SU_CO_BUOI_HOC"(madinhdanh text,mabuoi text,manhomsuco text,masuco text,trangthai text,hesocongapdung numeric,baoluc timestamptz,dotamdunglop boolean DEFAULT false);
 CREATE FUNCTION vuihoc.gio_ket_thuc_ca(d date,s time,e time) RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$
 SELECT ((d+CASE WHEN e<s THEN 1 ELSE 0 END)+e) AT TIME ZONE 'Asia/Bangkok' $$;
 CREATE FUNCTION vuihoc.tien_do_nhan_xet_ca(id text) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('total',1,'state',CASE WHEN feedback THEN 'DA_DU' ELSE 'CHUA_DU' END) FROM vuihoc."BUOI_HOC" WHERE madinhdanh=id $$;
 CREATE FUNCTION vuihoc.ghi_ca_vao_bang_cong(id text,teacher text,coeff numeric,kind text,incident text,note text,force_update boolean) RETURNS void LANGUAGE plpgsql AS $$
 BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."BANG_CONG_THANG" p ON p.kycong=to_char(b.ngayhoc,'YYYY-MM') WHERE b.madinhdanh=id AND p.dakhoa) THEN RETURN; END IF;
 INSERT INTO vuihoc."CONG_DAY_BUOI_HOC" VALUES(id||teacher,id,teacher,coeff,kind)
 ON CONFLICT(mabuoi,magiaovien) DO UPDATE SET hesocong=excluded.hesocong,loaicong=excluded.loaicong WHERE force_update;
 END $$;
 CREATE FUNCTION vuihoc.dong_bo_trang_thai_ca() RETURNS integer LANGUAGE sql AS $$ SELECT 0 $$;
 CREATE FUNCTION vuihoc.ca_du_dieu_kien_ghi_cong(p_buoi text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
 INSERT INTO vuihoc."DANH_MUC_SU_CO" VALUES('STUDENT','GRP-STD');
 INSERT INTO vuihoc."LOAI_SU_CO" VALUES('STUDENT','TECH','Sự cố đường truyền');
 INSERT INTO vuihoc."KHUNG_GIO" SELECT 'S',((statement_timestamp() AT TIME ZONE 'Asia/Bangkok')-interval '2 hours')::time,
 ((statement_timestamp() AT TIME ZONE 'Asia/Bangkok')+interval '1 hour')::time;`);
 // Real incident aggregation and work-generation functions, with fixture storage.
 await db.exec(readFileSync('supabase/migrations/20261219_multiple_incident_credit.sql','utf8'));
 await db.exec(patch);await db.exec(patch);
 const make=async(id,feedback=true)=>db.query(`INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,ngayhoc,makhunggio,trangthai,vaolopluc,ketthucluc,magiaovienchinh,feedback)
 VALUES($1,((statement_timestamp() AT TIME ZONE 'Asia/Bangkok')-interval '2 hours')::date,'S','DA_HOC',statement_timestamp()-interval '90 minutes',statement_timestamp()-interval '60 minutes','T1',$2)`,[id,feedback]);
 const grant=async id=>db.query(`UPDATE vuihoc."BUOI_HOC" b SET duyetgiamsat=jsonb_build_object('by','OPS','at',statement_timestamp(),
 'warning','Chưa hoàn tất · Kết thúc sớm '||ceil(extract(epoch FROM (vuihoc.gio_ket_thuc_ca(b.ngayhoc,k.giobatdau,k.gioketthuc)-b.ketthucluc))/60)::text||' phút',
 'checkinAt',b.vaolopluc,'checkoutAt',b.ketthucluc) FROM vuihoc."KHUNG_GIO" k WHERE b.makhunggio=k.madinhdanh AND b.madinhdanh=$1`,[id]);
 const credit=async id=>(await db.query(`SELECT hesocong::text n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=$1`,[id])).rows;
 const retry=async id=>db.query('SELECT vuihoc.ghi_cong_neu_du_nhan_xet($1)',[id]);
 await make('APPROVED');await retry('APPROVED');assert.deepEqual(await credit('APPROVED'),[]);
 await grant('APPROVED');assert.equal((await credit('APPROVED'))[0].n,'1','approval immediately generates standard work');
 await retry('APPROVED');assert.equal((await credit('APPROVED')).length,1,'no duplicate work');
 await make('STALE');await grant('STALE');
 await db.exec(`DELETE FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi='STALE'; UPDATE vuihoc."BUOI_HOC" SET ketthucluc=ketthucluc+interval '1 minute' WHERE madinhdanh='STALE'`);
 await retry('STALE');assert.deepEqual(await credit('STALE'),[],'approval expires when actual checkout changes');
 await make('WAIT');await retry('WAIT');assert.deepEqual(await credit('WAIT'),[],'unapproved early checkout waits');
 await db.query(`UPDATE vuihoc."KHUNG_GIO" SET gioketthuc=((statement_timestamp() AT TIME ZONE 'Asia/Bangkok')-interval '30 minutes')::time WHERE madinhdanh='S'`);
 await db.query('SELECT vuihoc.dong_bo_trang_thai_ca()');
 assert.equal((await credit('WAIT'))[0].n,'1','minute job credits after end even when DA_HOC is unchanged');
 await make('FEEDBACK',false);await grant('FEEDBACK');assert.deepEqual(await credit('FEEDBACK'),[],'approval cannot bypass feedback');
 await make('INCIDENT');
 await db.exec(`INSERT INTO vuihoc."SU_CO_BUOI_HOC"(madinhdanh,mabuoi,manhomsuco,masuco,trangthai,hesocongapdung)
 VALUES('I1','INCIDENT','STUDENT','TECH','DANG_XU_LY',NULL)`);
 await retry('INCIDENT');assert.deepEqual(await credit('INCIDENT'),[],'unresolved incident cannot default to one');
 await db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET trangthai='DA_GIAI_QUYET',hesocongapdung=0.5 WHERE madinhdanh='I1'`);
 await retry('INCIDENT');assert.equal((await credit('INCIDENT'))[0].n,'0.5');
 await db.exec(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=0.75 WHERE mabuoi='APPROVED'`);
 await db.exec(patch);assert.equal((await credit('APPROVED'))[0].n,'0.75','reinstall preserves adjusted work');
 await make('LOCKED');await db.exec(`INSERT INTO vuihoc."BANG_CONG_THANG" SELECT to_char(ngayhoc,'YYYY-MM'),true FROM vuihoc."BUOI_HOC" WHERE madinhdanh='LOCKED'`);
 await db.query('SELECT vuihoc.dong_bo_trang_thai_ca()');assert.deepEqual(await credit('LOCKED'),[],'job preserves locked period');
 const state=(await db.query(`SELECT vuihoc.trang_thai_ca_theo_du_lieu('2026-11-08','10:15','11:15','2026-11-08T10:41:00+07','2026-11-08T10:42:00+07','DANG_HOC','2026-11-08T10:43:00+07') s`)).rows[0].s;
 assert.equal(state,'DA_HOC','early checkout is taught independently of work');
 console.log('PASS early checkout: taught status; approval -> 1 now; no approval -> wait until end; automatic retry; feedback/incident gates; incident coefficient; no duplicate; adjusted/locked work preserved; idempotent install.');
} catch(error) {console.error(JSON.stringify({message:error.message,where:error.where,detail:error.detail}));process.exitCode=1;} finally {await db.close();}
