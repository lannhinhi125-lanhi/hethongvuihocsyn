import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH,'dist/index.js')));
const db=new PGlite();
const migration=readFileSync('supabase/migrations/20261210_remove_demo_catalog.sql','utf8');
try{
 await db.exec(`CREATE SCHEMA vuihoc;
 CREATE TABLE vuihoc."DANH_MUC_BO_SUNG"(madinhdanh text PRIMARY KEY,madanhmuc text UNIQUE,tendanhmuc text,mota text,madanhmuccha text REFERENCES vuihoc."DANH_MUC_BO_SUNG" ON DELETE SET NULL);
 CREATE TABLE vuihoc."MUC_DANH_MUC"(madanhmuc text REFERENCES vuihoc."DANH_MUC_BO_SUNG" ON DELETE CASCADE,madinhdanh text,ma text,ten text,mota text,danghoatdong boolean,thutu integer,PRIMARY KEY(madanhmuc,madinhdanh));
 CREATE TABLE vuihoc."LOP_HOC"(madinhdanh text PRIMARY KEY,madanhmucthoihan text,mathoihan text,FOREIGN KEY(madanhmucthoihan,mathoihan) REFERENCES vuihoc."MUC_DANH_MUC" ON DELETE RESTRICT);
 INSERT INTO vuihoc."DANH_MUC_BO_SUNG" VALUES('DURATION','CLASS_DURATION','Thời hạn lớp học','',NULL);
 INSERT INTO vuihoc."MUC_DANH_MUC" VALUES('DURATION','MONTH-1','MONTH-1','1 tháng','',true,1);
 INSERT INTO vuihoc."LOP_HOC" VALUES('CLASS-REAL','DURATION','MONTH-1');`);
 const seed=`INSERT INTO vuihoc."DANH_MUC_BO_SUNG" VALUES('CAT-DEMO','DEMO','Danh mục thử nghiệm','Dữ liệu mẫu',NULL),('CAT-DEMO-CHILD','DEMO-CHILD','Danh mục con','Kiểm tra cây danh mục','CAT-DEMO');
 INSERT INTO vuihoc."MUC_DANH_MUC" VALUES('CAT-DEMO','ENTRY-DEMO','DEMO-01','Mục thử nghiệm','Dùng kiểm tra CRUD danh mục',true,1);`;
 await db.exec(seed);
 const facts=async()=>(await db.query(`SELECT 'catalog' kind,to_jsonb(t) row FROM vuihoc."DANH_MUC_BO_SUNG" t UNION ALL SELECT 'entry',to_jsonb(t) FROM vuihoc."MUC_DANH_MUC" t UNION ALL SELECT 'class',to_jsonb(t) FROM vuihoc."LOP_HOC" t ORDER BY 1,2`)).rows;
 const before=await facts();
 for(const mutation of [
  `UPDATE vuihoc."DANH_MUC_BO_SUNG" SET tendanhmuc='Actual user catalog' WHERE madinhdanh='CAT-DEMO'`,
  `INSERT INTO vuihoc."DANH_MUC_BO_SUNG" VALUES('REAL-CHILD','REAL-CHILD','User child','','CAT-DEMO')`,
  `INSERT INTO vuihoc."MUC_DANH_MUC" VALUES('CAT-DEMO','REAL-ENTRY','REAL','User entry','',true,2)`,
  `INSERT INTO vuihoc."LOP_HOC" VALUES('USES-DEMO','CAT-DEMO','ENTRY-DEMO')`
 ]){
  await db.exec('BEGIN');await db.exec(mutation);await assert.rejects(()=>db.exec(migration),/chưa xóa dữ liệu nào/);await db.exec('ROLLBACK');assert.deepEqual(await facts(),before);
 }
 await db.exec(migration);await db.exec(migration);
 const retained=await facts();assert.deepEqual(retained,before.filter(x=>!['CAT-DEMO','CAT-DEMO-CHILD'].includes(x.row.madinhdanh)&&x.row.madanhmuc!=='CAT-DEMO'));
 await db.exec(seed);await db.exec(`DELETE FROM vuihoc."MUC_DANH_MUC" WHERE madanhmuc='CAT-DEMO'`);await db.exec(migration);assert.deepEqual(await facts(),retained,'empty experimental catalog is removed too');
 for(const path of ['supabase/schema.sql','supabase/seed_test_data.sql'])assert.ok(!readFileSync(path,'utf8').includes("('CAT-DEMO'"),'active seeds do not recreate the experimental catalog');
 console.log('PASS demo catalog cleanup: exact samples only, repeat/empty catalog, changed rows/new entries/child/used FK rollback, real duration catalog and class preserved, no reseeding');
}catch(e){console.error(JSON.stringify({message:e.message,detail:e.detail,where:e.where}));process.exitCode=1;}finally{await db.close();}
