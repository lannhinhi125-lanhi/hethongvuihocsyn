import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {verifyDeleteUnusedClass} from './deleteUnusedClassCases.mjs';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."NHOM_QUYEN"(id text);
 CREATE TABLE vuihoc."NGUOI_DUNG"(madinhdanh text);
 CREATE TABLE vuihoc."HOC_SINH"(madinhdanh text PRIMARY KEY);
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,malophoc text UNIQUE,trangthai text,tamdunglich boolean,magiaovien text);
 CREATE TABLE vuihoc."BUOI_HOC"(madinhdanh text PRIMARY KEY,malop text REFERENCES vuihoc."LOP_HOC" ON DELETE RESTRICT);
 CREATE TABLE vuihoc."DANG_KY_MON_HOC"(mahocsinh text REFERENCES vuihoc."HOC_SINH",mamonhoc text,trangthai text,PRIMARY KEY(mahocsinh,mamonhoc));
 CREATE TABLE vuihoc."XEP_LOP_DANG_KY"(mahocsinh text,mamonhoc text,malop text REFERENCES vuihoc."LOP_HOC" ON DELETE RESTRICT,
 FOREIGN KEY(mahocsinh,mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC",PRIMARY KEY(mahocsinh,mamonhoc));
 CREATE TABLE vuihoc."TRUY_VET_XEP_LOP"(madinhdanh bigint GENERATED ALWAYS AS IDENTITY,mahocsinh text,
 malopcu text REFERENCES vuihoc."LOP_HOC" ON DELETE RESTRICT,malopmoi text REFERENCES vuihoc."LOP_HOC" ON DELETE RESTRICT);
 CREATE TABLE vuihoc."LICH_LOP"(malop text REFERENCES vuihoc."LOP_HOC" ON DELETE CASCADE);
 CREATE TABLE vuihoc.availability(teacher text PRIMARY KEY,busy boolean);
 CREATE FUNCTION public.vuihoc_login(text,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE FUNCTION vuihoc.nguoi_dung_phien(token text) RETURNS vuihoc."NGUOI_DUNG" LANGUAGE plpgsql AS $$
 BEGIN IF token NOT IN ('admin','denied','fail-response') THEN RAISE EXCEPTION 'Phiên không hợp lệ'; END IF; RETURN ROW(token)::vuihoc."NGUOI_DUNG"; END $$;
 CREATE FUNCTION vuihoc.business_can(actor text,module text,feature text) RETURNS boolean LANGUAGE sql AS $$ SELECT actor<>'denied' $$;
 CREATE FUNCTION public.vuihoc_business_data(token text) RETURNS jsonb LANGUAGE plpgsql AS $$
 BEGIN IF token='fail-response' THEN RAISE EXCEPTION 'response failure'; END IF; RETURN '{}'::jsonb; END $$;
 -- Fixture contract for the existing normalized stop/release triggers.
 CREATE FUNCTION vuihoc.stop_class() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN IF NEW.trangthai IN ('TAM_DUNG','DA_KET_THUC') THEN
 UPDATE vuihoc."DANG_KY_MON_HOC" d SET trangthai='CHO_XEP_LOP' FROM vuihoc."XEP_LOP_DANG_KY" x WHERE x.malop=NEW.madinhdanh AND (d.mahocsinh,d.mamonhoc)=(x.mahocsinh,x.mamonhoc);
 INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu) SELECT mahocsinh,malop FROM vuihoc."XEP_LOP_DANG_KY" WHERE malop=NEW.madinhdanh;
 DELETE FROM vuihoc."XEP_LOP_DANG_KY" WHERE malop=NEW.madinhdanh;
 UPDATE vuihoc.availability SET busy=false WHERE teacher=OLD.magiaovien AND NOT EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE magiaovien=OLD.magiaovien AND trangthai NOT IN ('TAM_DUNG','DA_KET_THUC'));
 END IF; RETURN NEW; END $$;
 CREATE TRIGGER stop_class AFTER UPDATE OF trangthai ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.stop_class();
 INSERT INTO vuihoc."HOC_SINH" VALUES('S1');
 INSERT INTO vuihoc."LOP_HOC" VALUES('C1','C1','DANG_HOC',false,'T1'),('C2','C2','DANG_HOC',false,'T2');
 INSERT INTO vuihoc.availability VALUES('T1',true),('T2',true);
 INSERT INTO vuihoc."BUOI_HOC" VALUES('B1','C1');
 INSERT INTO vuihoc."DANG_KY_MON_HOC" VALUES('S1','MATH','DANG_HOC');
 INSERT INTO vuihoc."XEP_LOP_DANG_KY" VALUES('S1','MATH','C1');`);
 await verifyDeleteUnusedClass(db,'admin');
 const remove=(token,id)=>db.query('SELECT public.vuihoc_delete_unused_class($1,$2)',[token,id]);
 await assert.rejects(()=>remove('denied','C2'),/không có quyền/);
 await assert.rejects(()=>remove('fail-response','C2'),/response failure/);
 assert.equal((await db.query(`SELECT trangthai FROM vuihoc."LOP_HOC" WHERE madinhdanh='C2'`)).rows[0].trangthai,'DANG_HOC');
 assert.equal((await db.query(`SELECT busy FROM vuihoc.availability WHERE teacher='T2'`)).rows[0].busy,true,'failure rolls back availability');
 await db.exec(`INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi) VALUES('S1','C1','C2')`);
 await assert.rejects(()=>remove('admin','C2'),/lịch sử chuyển/);
 await db.exec(`DELETE FROM vuihoc."TRUY_VET_XEP_LOP" WHERE malopmoi='C2'; INSERT INTO vuihoc."LICH_LOP" VALUES('C2')`);
 await remove('admin','C2');
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LICH_LOP" WHERE malop='C2'`)).rows[0].n,0);
 assert.equal((await db.query(`SELECT busy FROM vuihoc.availability WHERE teacher='T2'`)).rows[0].busy,false);
 console.log('PASS permission denial, atomic response rollback, cross-class history guard, schedule cascade and availability release.');
} finally {await db.close();}
