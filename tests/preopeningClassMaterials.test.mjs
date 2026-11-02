import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
try {
 await db.exec(`CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,trangthai text,tamdunglich boolean,ngayketthuc date);
 CREATE TABLE vuihoc."HOC_LIEU_LOP"(malop text,tieude text);
 CREATE FUNCTION vuihoc.ngay_ket_thuc_lop(p jsonb) RETURNS date LANGUAGE sql AS $$ SELECT (p->>'ngayketthuc')::date $$;
 INSERT INTO vuihoc."LOP_HOC" VALUES('WAIT','CHO_KHAI_GIANG',false,NULL),('ACTIVE','DANG_HOC',false,NULL),
 ('PAUSED','CHO_KHAI_GIANG',true,NULL),('STOPPED','TAM_DUNG',false,NULL),('ENDED','DA_KET_THUC',false,NULL),
 ('EXPIRED','CHO_KHAI_GIANG',false,'2000-01-01');`);
 const source=readFileSync('supabase/migrations/20261113_end_classes_material_guard.sql','utf8');
 const start=source.indexOf('CREATE OR REPLACE FUNCTION');
 const guard=source.slice(start,source.indexOf('END $$;',start)+'END $$;'.length);
 const patch=readFileSync('supabase/migrations/20261224_preopening_class_materials.sql','utf8');
 for(const normalized of [false,true]){
  await db.exec(normalized ? guard.replaceAll('l.ngayketthuc','vuihoc.ngay_ket_thuc_lop(to_jsonb(l))') : guard);
  await db.exec(`DROP TRIGGER IF EXISTS material_guard ON vuihoc."HOC_LIEU_LOP";
   CREATE TRIGGER material_guard BEFORE INSERT OR UPDATE ON vuihoc."HOC_LIEU_LOP" FOR EACH ROW EXECUTE FUNCTION vuihoc.chan_hoc_lieu_lop_ngung();`);
  await db.exec(patch);await db.exec(patch);
  await db.exec(`INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES('WAIT','Plan'),('ACTIVE','Plan');
   UPDATE vuihoc."HOC_LIEU_LOP" SET tieude='Updated' WHERE malop='WAIT';`);
  for(const id of ['PAUSED','STOPPED','ENDED','EXPIRED','MISSING']){
   await assert.rejects(()=>db.query('INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES($1,$2)',[id,'Blocked']),/Chỉ gắn học liệu/);
   await assert.rejects(()=>db.query('UPDATE vuihoc."HOC_LIEU_LOP" SET malop=$1 WHERE malop=$2',[id,'WAIT']),/Chỉ gắn học liệu/);
  }
  assert.equal((await db.query(`SELECT trangthai FROM vuihoc."LOP_HOC" WHERE madinhdanh='WAIT'`)).rows[0].trangthai,'CHO_KHAI_GIANG');
  await db.exec('DELETE FROM vuihoc."HOC_LIEU_LOP"');
 }
 console.log('PASS database material guard: waiting class insert/update; pause/expiry/stopped protection; normalized terms; repeat migration; class status unchanged.');
} finally {await db.close();}
