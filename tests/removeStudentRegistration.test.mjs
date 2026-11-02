import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."NHOM_QUYEN"(id text);
 CREATE TABLE vuihoc."NGUOI_DUNG"(madinhdanh text);
 CREATE TABLE vuihoc."HOC_SINH"(madinhdanh text PRIMARY KEY);
 CREATE TABLE vuihoc."DANG_KY_MON_HOC"(mahocsinh text REFERENCES vuihoc."HOC_SINH",mamonhoc text,PRIMARY KEY(mahocsinh,mamonhoc));
 CREATE TABLE vuihoc."XEP_LOP_DANG_KY"(mahocsinh text,mamonhoc text,malop text,FOREIGN KEY(mahocsinh,mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC" ON DELETE CASCADE);
 CREATE TABLE vuihoc."LICH_DANG_KY_MON_HOC"(mahocsinh text,mamonhoc text,FOREIGN KEY(mahocsinh,mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC" ON DELETE CASCADE);
 CREATE FUNCTION vuihoc.nguoi_dung_phien(token text) RETURNS vuihoc."NGUOI_DUNG" LANGUAGE plpgsql AS $$
 BEGIN IF token NOT IN ('admin','denied','fail') THEN RAISE EXCEPTION 'invalid token'; END IF; RETURN ROW(token)::vuihoc."NGUOI_DUNG"; END $$;
 CREATE FUNCTION vuihoc.business_can(actor text,module text,feature text) RETURNS boolean LANGUAGE sql AS $$ SELECT actor<>'denied' AND module='PH4' AND feature='Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy' $$;
 CREATE FUNCTION public.vuihoc_business_data(token text) RETURNS jsonb LANGUAGE plpgsql AS $$
 BEGIN IF token='fail' THEN RAISE EXCEPTION 'response failure'; END IF; RETURN '{}'::jsonb; END $$;
 INSERT INTO vuihoc."HOC_SINH" VALUES('S1');
 INSERT INTO vuihoc."DANG_KY_MON_HOC" VALUES('S1','MATH'),('S1','ENG');
 INSERT INTO vuihoc."XEP_LOP_DANG_KY" VALUES('S1','MATH','C1');
 INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" VALUES('S1','MATH'),('S1','ENG');`);
 const sql=readFileSync('supabase/migrations/20261219_remove_student_registration.sql','utf8');
 await db.exec(sql);await db.exec(sql);
 const remove=(token,subject)=>db.query('SELECT public.vuihoc_remove_student_registration($1,$2,$3)',[token,'S1',subject]);
 await assert.rejects(()=>remove('bad','ENG'),/invalid token/);
 await assert.rejects(()=>remove('denied','ENG'),/quyền/);
 await assert.rejects(()=>remove('admin','MATH'),/đã có lớp/);
 await assert.rejects(()=>remove('fail','ENG'),/response failure/);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."DANG_KY_MON_HOC"')).rows[0].n,2);
 await db.exec('SET ROLE anon');await remove('admin','ENG');await db.exec('RESET ROLE');
 assert.deepEqual((await db.query('SELECT mamonhoc FROM vuihoc."DANG_KY_MON_HOC"')).rows,[{mamonhoc:'MATH'}]);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."XEP_LOP_DANG_KY"')).rows,[{mahocsinh:'S1',mamonhoc:'MATH',malop:'C1'}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."HOC_SINH"')).rows[0].n,1);
 assert.deepEqual((await db.query('SELECT mamonhoc FROM vuihoc."LICH_DANG_KY_MON_HOC"')).rows,[{mamonhoc:'MATH'}]);
 await assert.rejects(()=>remove('admin','ENG'),/không còn tồn tại/);
 await db.exec('DELETE FROM vuihoc."XEP_LOP_DANG_KY"');await remove('admin','MATH');
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."HOC_SINH"')).rows[0].n,1,'Deleting the last enrollment must retain the profile');
 console.log('PASS subject deletion: permissions, assigned subject blocked, other subject/class/profile preserved, rollback, last enrollment, repeat migration.');
} finally {await db.close();}
