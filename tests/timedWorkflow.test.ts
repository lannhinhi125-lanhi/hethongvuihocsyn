
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
assert.ok(root,'Set PGLITE_MODULE_PATH to @electric-sql/pglite');
const {PGlite}=await import(pathToFileURL(root.replace(/[/\\]$/,'')+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root.replace(/[/\\]$/,'')+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 // Remove seeded canonical sessions so this scenario controls its own timeline.
 await db.exec('DELETE FROM vuihoc."SU_CO_BUOI_HOC"; DELETE FROM vuihoc."NHAN_XET_BUOI_HOC"; DELETE FROM vuihoc."DIEM_DANH_BUOI_HOC"; DELETE FROM vuihoc."BUOI_HOC";');
 // Also verify migration-only upgrade using the previous schema portion.
 const upgraded=new PGlite({extensions:{pgcrypto}});
 try {
  await upgraded.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;`);
  const base=readFileSync('supabase/schema.sql','utf8').split('-- MÔ HÌNH NGHIỆP VỤ THEO THỜI GIAN.')[0]+'COMMIT;';
  await upgraded.exec(base);
  await upgraded.exec(readFileSync('supabase/migrations/20261011_timed_workflow.sql','utf8'));
  await upgraded.exec(readFileSync('supabase/migrations/20261011_timed_workflow.sql','utf8'));
  assert.equal((await upgraded.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='vuihoc'")).rows[0].n,30);
 } finally {await upgraded.close();}
 const reject=async(sql:string)=>{
  await db.exec('BEGIN');
  try {await assert.rejects(db.exec(sql));}finally {await db.exec('ROLLBACK');}
 };
 await db.exec(`INSERT INTO vuihoc."LICH_RANH_TUAN"(madinhdanh,magiaovien,ngaydautuan) VALUES('W1','GV-001','2026-10-05'),('W2','GV-001','2026-10-12');
 INSERT INTO vuihoc."CHI_TIET_LICH_RANH"(malichtuan,ngay,makhunggio,trangthai) VALUES('W1','2026-10-06','SLOT-1','free'),('W2','2026-10-13','SLOT-1','none');`);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CHI_TIET_LICH_RANH"')).rows[0].n,2);
 await reject(`INSERT INTO vuihoc."CHI_TIET_LICH_RANH" VALUES('W1','2026-10-13','SLOT-1','free',now(),now());`);
 await reject(`UPDATE vuihoc."LICH_RANH_TUAN" SET ngaydautuan='2026-10-19' WHERE madinhdanh='W1';`);
 await db.exec(`INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh)
 VALUES('B1','CLS-001','2026-10-06','SLOT-1','2026-10-06 18:00+07','2026-10-06 19:30+07','GV-001'),
 ('B2','CLS-001','2026-10-13','SLOT-1','2026-10-13 18:00+07','2026-10-13 19:30+07','GV-001'),
 ('B3','CLS-001','2026-11-03','SLOT-1','2026-11-03 18:00+07','2026-11-03 19:30+07','GV-001');`);
 await db.exec(`INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi,mahocsinh,trangthai) VALUES('B1','HS-2026-001','present'),('B2','HS-2026-001','absent');
 INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung) VALUES('B1','HS-2026-001','Week one'),('B2','HS-2026-001','Week two');
 INSERT INTO vuihoc."SU_CO_BUOI_HOC"(mabuoi,manhomsuco,masuco,tensuco) VALUES('B1','GRP-TCH','INC-TCH-03','Late');
 UPDATE vuihoc."BUOI_HOC" SET vaolopluc='2026-10-06 18:05+07',ketthucluc='2026-10-06 19:31+07',trangthai='HOAN_THANH' WHERE madinhdanh='B1';`);
 await db.exec(`UPDATE vuihoc."BUOI_HOC" SET nhatky='Retried completion save' WHERE madinhdanh='B1';`);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=\'B1\'')).rows[0].n,1);
 assert.equal((await db.query('SELECT noidung FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=\'B1\'')).rows[0].noidung,'Week one');
 const b1=(await db.query('SELECT * FROM vuihoc."V_CONG_DAY_THEO_CA" WHERE mabuoi=\'B1\'')).rows[0];
 assert.equal(b1.kycong,'2026-10');assert.equal(b1.cosuco,true);assert.equal(b1.conhanxet,true);
 await db.exec(`UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay='GV-002',vaolopluc='2026-11-03 18:00+07',ketthucluc='2026-11-03 19:30+07',trangthai='HOAN_THANH' WHERE madinhdanh='B3';`);
 const b3=(await db.query('SELECT * FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=\'B3\'')).rows[0];
 assert.equal(b3.kycong,'2026-11');assert.equal(b3.magiaovien,'GV-002');assert.equal(b3.vaitro,'DAY_THAY');
 await reject(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET kycong='2026-09' WHERE mabuoi='B3';`);
 await reject(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=0.5,ghichu='' WHERE mabuoi='B3';`);
 await db.exec(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=0.5,ghichu='Reviewed incident' WHERE mabuoi='B3';`);
 await reject(`UPDATE vuihoc."BUOI_HOC" SET ngayhoc='2026-11-10' WHERE madinhdanh='B3';`);
 await reject(`INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi,mahocsinh,trangthai) VALUES('MISSING','HS-2026-001','present');`);
 await db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong='2026-11';`);
 await reject(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=0.75,ghichu='Change locked month' WHERE mabuoi='B3';`);
 await reject(`INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung) VALUES('B3','HS-2026-001','Locked');`);
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC"')).rows[0].n,2);
 console.log('PASS: fresh schema, upgrade/re-run, separate weeks and lessons, date bounds, attendance/feedback/incident joins, automatic October/November payroll, cover credit, no duplicates, invalid FK/month rejected, locked month and required adjustment reasons.');
} finally {await db.close();}
