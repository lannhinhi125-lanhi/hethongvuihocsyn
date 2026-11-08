import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
const patch=readFileSync('supabase/migrations/20261227_stop_class_future_materials.sql','utf8');
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA vuihoc;
 CREATE FUNCTION public.vuihoc_login(text,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,trangthai text,tamdunglich boolean DEFAULT false);
 CREATE TABLE vuihoc."KHUNG_GIO"(madinhdanh text PRIMARY KEY,giobatdau time,gioketthuc time);
 CREATE TABLE vuihoc."LICH_LOP"(malop text,thutrongtuan integer,makhunggio text);
 CREATE TABLE vuihoc."HOC_LIEU_LOP"(malop text,mahoclieu integer,tungay date,denngay date,sobuoi integer,tieude text,lienketslide text,lienketlms text,PRIMARY KEY(malop,mahoclieu));
 CREATE TABLE vuihoc."BUOI_HOC"(madinhdanh text PRIMARY KEY,malop text,mahoclieu integer,ngayhoc date,makhunggio text,trangthai text,
 vaolopluc timestamptz,ketthucluc timestamptz,hoclieutieude text,hoclieugiaovien text,hoclieuhocsinh text,baitaplms text,
 FOREIGN KEY(malop,mahoclieu) REFERENCES vuihoc."HOC_LIEU_LOP" DEFERRABLE INITIALLY DEFERRED);
 CREATE TABLE vuihoc."CONG_DAY_BUOI_HOC"(mabuoi text);
 CREATE TABLE vuihoc."NHAN_XET_BUOI_HOC"(mabuoi text);
 CREATE TABLE vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi text);
 CREATE TABLE vuihoc."SU_CO_BUOI_HOC"(mabuoi text);
 CREATE TABLE vuihoc."BIEN_BAN_DU_GIO"(mabuoi text);
 CREATE TABLE vuihoc."BANG_CONG_THANG"(kycong text,dakhoa boolean);
 INSERT INTO vuihoc."LOP_HOC" VALUES('STOP','DANG_HOC',false),('OLD','TAM_DUNG',false),('PAUSE','DANG_HOC',true),('ACTIVE','DANG_HOC',false);
 INSERT INTO vuihoc."KHUNG_GIO" VALUES('S','18:00','19:00');
 INSERT INTO vuihoc."LICH_LOP" SELECT madinhdanh,extract(isodow FROM (statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date+1)::integer,'S' FROM vuihoc."LOP_HOC";
 CREATE FUNCTION vuihoc.tim_hoc_lieu_buoi(text,date,text) RETURNS integer LANGUAGE sql AS $$ SELECT NULL::integer $$;`);
 // Real normalized material guards, not bypassed by the cleanup implementation.
 const normalized=readFileSync('supabase/migrations/20261126_normalize_class_materials.sql','utf8');
 for(const [name,delimiter] of [['giu_nguon_hoc_lieu','protect'],['lien_ket_hoc_lieu_buoi','link']]) {
  const start=normalized.indexOf(' CREATE OR REPLACE FUNCTION vuihoc.'+name+'()');
  const end=normalized.indexOf('$'+delimiter+'$;',start)+('$'+delimiter+'$;').length;
  assert.ok(start>0&&end>start);await db.exec(normalized.slice(start,end));
 }
 await db.exec(`CREATE TRIGGER giu_nguon_hoc_lieu BEFORE INSERT OR UPDATE OR DELETE ON vuihoc."HOC_LIEU_LOP" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_nguon_hoc_lieu();
 CREATE TRIGGER lien_ket_hoc_lieu_buoi BEFORE INSERT OR UPDATE ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.lien_ket_hoc_lieu_buoi();`);
 const material=async(cls,id,offset=0)=>db.query(`INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES($1,$2,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date+$3::int,
 (statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date+$3::int+6,1,'Plan','slide','lms')`,[cls,id,offset]);
 const lesson=async(cls,id,mat,offset=1)=>db.query(`INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,mahoclieu,ngayhoc,makhunggio,trangthai,hoclieutieude,hoclieugiaovien,hoclieuhocsinh,baitaplms)
 VALUES($1,$2,$3,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date+$4::int,'S','NGHI_HOC','Override','override-slide','student','override-lms')`,[id,cls,mat,offset]);
 await material('OLD',1);await lesson('OLD','OLD-FUTURE',1);
 await material('PAUSE',1);await lesson('PAUSE','PAUSE-FUTURE',1);
 await material('ACTIVE',1);await lesson('ACTIVE','ACTIVE-FUTURE',1);
 await material('STOP',1);await lesson('STOP','FUTURE',1);
 await material('STOP',2,-1);await lesson('STOP','PAST',2,-1);await lesson('STOP','SHARED-FUTURE',2);
 await material('STOP',3,14); // no generated lesson, still clean a future plan
 for(const [index,table] of ['NHAN_XET_BUOI_HOC','DIEM_DANH_BUOI_HOC','CONG_DAY_BUOI_HOC','SU_CO_BUOI_HOC','BIEN_BAN_DU_GIO'].entries()){
  const id=10+index,offset=7*(index+3);
  await material('STOP',id,offset);await lesson('STOP',table,id,offset+1);
  await db.query(`INSERT INTO vuihoc."${table}" VALUES($1)`,[table]);
 }
 await material('STOP',20,150);await lesson('STOP','LOCKED',20,151);
 await db.exec(`INSERT INTO vuihoc."BANG_CONG_THANG" SELECT to_char(ngayhoc,'YYYY-MM'),true FROM vuihoc."BUOI_HOC" WHERE madinhdanh='LOCKED'`);
 await material('STOP',21,56);await lesson('STOP','STARTED',21,57);
 await db.exec(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc=statement_timestamp() WHERE madinhdanh='STARTED'`);
 const before=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows;
 await db.exec(patch);await db.exec(patch);
 let old=(await db.query(`SELECT * FROM vuihoc."BUOI_HOC" WHERE madinhdanh='OLD-FUTURE'`)).rows[0];
 assert.equal(old.mahoclieu,null,'already-stopped classes cleaned during installation');
 assert.equal(old.hoclieugiaovien,null);
 await db.exec(`UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG' WHERE madinhdanh='STOP'`);
 const after=(await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows;
 assert.equal(after.length,before.length,'never deletes lesson history');
 for(const id of ['FUTURE','SHARED-FUTURE']){
  const row=after.find(b=>b.madinhdanh===id);
  for(const field of ['mahoclieu','hoclieutieude','hoclieugiaovien','hoclieuhocsinh','baitaplms'])assert.equal(row[field],null);
 }
 for(const row of before.filter(b=>!['OLD-FUTURE','FUTURE','SHARED-FUTURE'].includes(b.madinhdanh)))assert.deepEqual(after.find(b=>b.madinhdanh===row.madinhdanh),row,'preserve history, evidence, locked months and other classes');
 const plans=(await db.query(`SELECT mahoclieu FROM vuihoc."HOC_LIEU_LOP" WHERE malop='STOP' ORDER BY mahoclieu`)).rows.map(h=>h.mahoclieu);
 assert.ok(!plans.includes(1),'current week future session removed');assert.ok(!plans.includes(3),'future unreferenced plan removed');assert.ok(plans.includes(2),'shared historical plan retained');
 await db.exec(patch);assert.deepEqual((await db.query('SELECT * FROM vuihoc."BUOI_HOC" ORDER BY madinhdanh')).rows,after,'idempotent cleanup');
 console.log('PASS stopped-class cleanup: automatic stop and existing-class cleanup; current/future plans; real material guards; preserve lesson rows, shared history, feedback, attendance, work, incidents, evaluations, locked months, temporary pauses and other classes.');
}catch(error){console.error(JSON.stringify({message:error.message,detail:error.detail,where:error.where}));process.exitCode=1;}finally{await db.close();}
