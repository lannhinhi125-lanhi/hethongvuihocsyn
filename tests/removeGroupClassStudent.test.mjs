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
 CREATE TABLE vuihoc."MO_HINH_LOP"(mamohinh text PRIMARY KEY,sisotoida numeric);
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,mamonhoc text,mamohinh text,trangthai text,magiaovien text);
 CREATE TABLE vuihoc."DANG_KY_MON_HOC"(mahocsinh text,mamonhoc text,trangthai text,mamohinh text,PRIMARY KEY(mahocsinh,mamonhoc));
 CREATE TABLE vuihoc."XEP_LOP_DANG_KY"(mahocsinh text,mamonhoc text,malop text,PRIMARY KEY(mahocsinh,mamonhoc));
 CREATE TABLE vuihoc.trace(student text,subject text,old_class text,actor text);
 CREATE FUNCTION vuihoc.nguoi_dung_phien(token text) RETURNS vuihoc."NGUOI_DUNG" LANGUAGE plpgsql AS $$
 BEGIN IF token NOT IN ('admin','denied','fail-response') THEN RAISE EXCEPTION 'invalid token'; END IF; RETURN ROW(token)::vuihoc."NGUOI_DUNG"; END $$;
 CREATE FUNCTION public.vuihoc_login(text,text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
 CREATE FUNCTION vuihoc.business_can(actor text,module text,feature text) RETURNS boolean LANGUAGE sql AS $$ SELECT actor<>'denied' $$;
 CREATE FUNCTION public.vuihoc_business_data(token text) RETURNS jsonb LANGUAGE plpgsql AS $$
 BEGIN PERFORM vuihoc.nguoi_dung_phien(token); IF token='fail-response' THEN RAISE EXCEPTION 'response failure'; END IF;
 RETURN jsonb_build_object('classes',(SELECT jsonb_agg(to_jsonb(l)) FROM vuihoc."LOP_HOC" l),'assignments',(SELECT jsonb_agg(to_jsonb(x)) FROM vuihoc."XEP_LOP_DANG_KY" x)); END $$;
 CREATE FUNCTION vuihoc.trace_removal() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN INSERT INTO vuihoc.trace VALUES(OLD.mahocsinh,OLD.mamonhoc,OLD.malop,current_setting('vuihoc.actor',true)); RETURN OLD; END $$;
 CREATE TRIGGER trace_removal AFTER DELETE ON vuihoc."XEP_LOP_DANG_KY" FOR EACH ROW EXECUTE FUNCTION vuihoc.trace_removal();
 INSERT INTO vuihoc."MO_HINH_LOP" VALUES('1-3',3),('1-1',1);
 INSERT INTO vuihoc."LOP_HOC" VALUES('GROUP','MATH','1-3','DANG_HOC','TEACHER'),('SOLO','MATH','1-1','DANG_HOC','TEACHER2');
 INSERT INTO vuihoc."DANG_KY_MON_HOC" VALUES('S1','MATH','DANG_HOC','1-3'),('S2','MATH','DANG_HOC','1-3'),('S1','ENGLISH','DANG_HOC','1-1'),('S3','MATH','DANG_HOC','1-1');
 INSERT INTO vuihoc."XEP_LOP_DANG_KY" VALUES('S1','MATH','GROUP'),('S2','MATH','GROUP'),('S1','ENGLISH','SOLO'),('S3','MATH','SOLO');`);
 // Use the installed normalized guards, rather than approximating their behavior.
 const source=readFileSync('supabase/migrations/20261121_normalize_student_enrollments.sql','utf8');
 for(const name of ['giu_dang_ky_lop_dang_hoat_dong','giu_xep_lop_dang_hoat_dong']) {
  const start=source.indexOf('CREATE OR REPLACE FUNCTION vuihoc.'+name+'()');
  const end=source.indexOf('END $guard$;',start)+'END $guard$;'.length;
  await db.exec(source.slice(start,end));
 }
 await db.exec(`CREATE TRIGGER guard_registration BEFORE UPDATE OR DELETE ON vuihoc."DANG_KY_MON_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_dang_ky_lop_dang_hoat_dong();
 CREATE TRIGGER guard_assignment BEFORE UPDATE OR DELETE ON vuihoc."XEP_LOP_DANG_KY" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_xep_lop_dang_hoat_dong();`);
 const migration=readFileSync('supabase/migrations/20261217_remove_group_class_student.sql','utf8');
 await db.exec(migration);await db.exec(migration);
 // The single file also accepts databases with the earlier recovery already installed.
 await db.exec(`CREATE FUNCTION public.vuihoc_save_business(text,jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN PERFORM vuihoc.nguoi_dung_phien($1); RETURN '{"update_existing_business_rows":true}'::jsonb; END $$;`);
 const combined=readFileSync('supabase/apply_class_management_update.sql','utf8');
 await db.exec(combined);await db.exec(combined);
 const remove=(token,cls,student)=>db.query('SELECT public.vuihoc_remove_class_student($1,$2,$3) AS receipt',[token,cls,student]);
 await assert.rejects(()=>remove('bad','GROUP','S1'),/invalid token/);
 await assert.rejects(()=>remove('denied','GROUP','S1'),/quyền/);
 await assert.rejects(()=>remove('admin','SOLO','S3'),/1-n/);
 await assert.rejects(()=>remove('admin','GROUP','S3'),/không còn thuộc/);
 await assert.rejects(()=>db.exec(`DELETE FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh='S1' AND mamonhoc='MATH'`),/Dừng/);
 await assert.rejects(()=>remove('fail-response','GROUP','S1'),/response failure/);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc.trace`)).rows[0].n,0,'failed response rolls back removal and trace');
 const before=(await db.query(`SELECT * FROM vuihoc."LOP_HOC" ORDER BY madinhdanh`)).rows;
 await db.exec('SET ROLE anon');await remove('admin','GROUP','S1');await db.exec('RESET ROLE');
 assert.equal((await db.query(`SELECT trangthai FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh='S1' AND mamonhoc='MATH'`)).rows[0].trangthai,'CHO_XEP_LOP');
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh='S1' AND mamonhoc='MATH'`)).rows[0].n,0);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."XEP_LOP_DANG_KY"`)).rows[0].n,3,'classmate and other subject retained');
 assert.deepEqual((await db.query(`SELECT * FROM vuihoc."LOP_HOC" ORDER BY madinhdanh`)).rows,before,'class and teachers retained');
 assert.deepEqual((await db.query(`SELECT * FROM vuihoc.trace`)).rows,[{student:'S1',subject:'MATH',old_class:'GROUP',actor:'admin'}]);
 await db.exec(`UPDATE vuihoc."DANG_KY_MON_HOC" SET mamohinh='1-1' WHERE mahocsinh='S1' AND mamonhoc='MATH'`);
 await assert.rejects(()=>remove('admin','GROUP','S1'),/không còn thuộc/);
 await assert.rejects(()=>db.exec(`DELETE FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh='S2' AND mamonhoc='MATH'`),/Dừng/);
 console.log('PASS group removal: authorization, 1-1 rejection, rollback, classmates/other subject/teacher preserved, trace, wait then change model, no leaked bypass');
} finally {await db.close();}
