import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export async function verifyDeleteUnusedClass(db,token) {
 const sql=readFileSync('supabase/migrations/20261225_delete_unused_classes.sql','utf8');
 await db.exec(sql);await db.exec(sql);
 const remove=id=>db.query('SELECT public.vuihoc_delete_unused_class($1,$2)',[token,id]);
 await db.exec('BEGIN');
 try {
  const clone=async id=>db.query(`INSERT INTO vuihoc."LOP_HOC" SELECT
   (jsonb_populate_record(NULL::vuihoc."LOP_HOC",to_jsonb(l)||jsonb_build_object('madinhdanh',$1::text,'malophoc',$1::text,'trangthai','CHO_KHAI_GIANG','tamdunglich',false))).*
   FROM vuihoc."LOP_HOC" l LIMIT 1`,[id]);
  await clone('DELETE-EMPTY');
  await remove('DELETE-EMPTY');
  assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LOP_HOC" WHERE madinhdanh='DELETE-EMPTY'`)).rows[0].n,0);
  await assert.rejects(remove('DELETE-EMPTY'),/không còn tồn tại/);
 } finally {await db.exec('ROLLBACK');}
 // Each rejected PostgreSQL statement is isolated by a savepoint.
 const reject=async(fn,pattern)=>{
  await db.exec('SAVEPOINT rejected_delete');
  await assert.rejects(fn,pattern);
  await db.exec('ROLLBACK TO SAVEPOINT rejected_delete');
 };
 await db.exec('BEGIN');
 try {
  const cls=(await db.query(`SELECT l.* FROM vuihoc."LOP_HOC" l JOIN vuihoc."BUOI_HOC" h ON h.malop=l.madinhdanh LIMIT 1`)).rows[0];
  assert.ok(cls,'fixture has a class with lessons');
  await reject(()=>remove(cls.madinhdanh),/phát sinh buổi học/);
  assert.equal((await db.query(`SELECT trangthai FROM vuihoc."LOP_HOC" WHERE madinhdanh=$1`,[cls.madinhdanh])).rows[0].trangthai,cls.trangthai);
  await reject(()=>db.query(`DELETE FROM vuihoc."LOP_HOC" WHERE madinhdanh=$1`,[cls.madinhdanh]),/phát sinh buổi học/);
  await reject(()=>db.query('SELECT public.vuihoc_delete_unused_class($1,$2)',['invalid',cls.madinhdanh]),/phiên|Phiên/);
 } finally {await db.exec('ROLLBACK');}
 await db.exec('BEGIN');
 try {
  const assignment=(await db.query(`SELECT x.* FROM vuihoc."XEP_LOP_DANG_KY" x LIMIT 1`)).rows[0];
  assert.ok(assignment);
  await db.query(`INSERT INTO vuihoc."LOP_HOC" SELECT
   (jsonb_populate_record(NULL::vuihoc."LOP_HOC",to_jsonb(l)||jsonb_build_object('madinhdanh','DELETE-ASSIGNED','malophoc','DELETE-ASSIGNED','trangthai','CHO_KHAI_GIANG','tamdunglich',false))).*
   FROM vuihoc."LOP_HOC" l WHERE madinhdanh=$1`,[assignment.malop]);
  await db.query(`UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG' WHERE madinhdanh=$1`,[assignment.malop]);
  await db.query(`INSERT INTO vuihoc."XEP_LOP_DANG_KY"(mahocsinh,mamonhoc,malop) VALUES($1,$2,'DELETE-ASSIGNED')`,[assignment.mahocsinh,assignment.mamonhoc]);
  await db.query(`UPDATE vuihoc."DANG_KY_MON_HOC" SET trangthai='DANG_HOC' WHERE mahocsinh=$1 AND mamonhoc=$2`,[assignment.mahocsinh,assignment.mamonhoc]);
  const unrelated=(await db.query(`SELECT * FROM vuihoc."TRUY_VET_XEP_LOP" WHERE malopcu IS DISTINCT FROM 'DELETE-ASSIGNED' AND malopmoi IS DISTINCT FROM 'DELETE-ASSIGNED' ORDER BY madinhdanh`)).rows;
  await remove('DELETE-ASSIGNED');
  assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."LOP_HOC" WHERE madinhdanh='DELETE-ASSIGNED'`)).rows[0].n,0);
  assert.equal((await db.query(`SELECT trangthai FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1 AND mamonhoc=$2`,[assignment.mahocsinh,assignment.mamonhoc])).rows[0].trangthai,'CHO_XEP_LOP');
  assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."HOC_SINH" WHERE madinhdanh=$1`,[assignment.mahocsinh])).rows[0].n,1);
  assert.deepEqual((await db.query(`SELECT * FROM vuihoc."TRUY_VET_XEP_LOP" ORDER BY madinhdanh`)).rows,unrelated);
  await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
 } finally {await db.exec('ROLLBACK');}
 console.log('PASS unused class deletion: repeat install, empty/assigned class, preserved student/other traces, lesson/direct-delete guards and invalid session.');
}
