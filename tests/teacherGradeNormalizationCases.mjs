import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyTeacherGradeNormalization(db,token){
 const sql=readFileSync('supabase/migrations/20261205_normalize_teacher_grade_links.sql','utf8');
 const data=async()=>(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const before=(await db.query('SELECT * FROM vuihoc."GIAO_VIEN_KHOI" ORDER BY magiaovien,makhoi')).rows;
 const source=(await data()).teachers;
 const diagnostic=readFileSync('supabase/diagnostics/teacher_grade_links.sql','utf8');
 assert.equal(Number((await db.query(diagnostic)).rows[0].can_doi_soat),0);
 const preserved={};
 for(const table of ['GIAO_VIEN_MO_HINH','LICH_RANH_DINH_KY','LICH_RANH_TUAN','CHI_TIET_LICH_RANH'])preserved[table]=(await db.query(`SELECT to_jsonb(t) v FROM vuihoc."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
 const initial=source.find(x=>x.danhsachkhoi?.length);
 const anotherCategory=(await db.query('SELECT madinhdanh FROM vuihoc."CAP_HOC" WHERE madinhdanh<>$1 LIMIT 1',[initial.macaphoc])).rows[0];
 if(anotherCategory){
  await db.exec('BEGIN');
  await db.query('UPDATE vuihoc."GIAO_VIEN" SET macaphoc=$1 WHERE madinhdanh=$2',[anotherCategory.madinhdanh,initial.madinhdanh]);
  await assert.rejects(()=>db.exec(sql),/lệch cấp học/);
  await db.exec('ROLLBACK');
 }
 await db.exec(sql);await db.exec(sql);
 assert.equal(Number((await db.query(diagnostic)).rows[0].can_doi_soat),0);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN_KHOI'")).rows[0].n,3);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."V_GIAO_VIEN_KHOI" ORDER BY magiaovien,makhoi')).rows,before);
 assert.deepEqual((await data()).teachers,source);
 for(const [table,rows]of Object.entries(preserved))assert.deepEqual((await db.query(`SELECT to_jsonb(t) v FROM vuihoc."${table}" t ORDER BY to_jsonb(t)::text`)).rows,rows);
 const teacher=source.find(x=>x.danhsachkhoi?.length);assert.ok(teacher);
 const write=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const grades=[...teacher.danhsachkhoi].reverse();
 await write([{dataset:'teachers',before:{madinhdanh:teacher.madinhdanh,danhsachkhoi:teacher.danhsachkhoi},after:{madinhdanh:teacher.madinhdanh,danhsachkhoi:grades}}]);
 assert.deepEqual((await data()).teachers.find(x=>x.madinhdanh===teacher.madinhdanh).danhsachkhoi,grades);
 const category=(await data()).teaching_categories.find(x=>x.madinhdanh===teacher.macaphoc);
 const updatedOptions=category.danhsachluachon.map(x=>x.id===grades[0]?{...x,label:x.label+' reviewed'}:x);
 await write([{dataset:'teaching_categories',before:{madinhdanh:category.madinhdanh,danhsachluachon:category.danhsachluachon},after:{madinhdanh:category.madinhdanh,danhsachluachon:updatedOptions}}]);
 assert.deepEqual((await data()).teachers.find(x=>x.madinhdanh===teacher.madinhdanh).danhsachkhoi,grades,'catalog replacement must preserve stable option FKs');
 await assert.rejects(()=>write([{dataset:'teachers',before:{madinhdanh:teacher.madinhdanh,danhsachkhoi:grades},after:{madinhdanh:teacher.madinhdanh,danhsachkhoi:['MISSING-GRADE']}}]),/Khối|khối/);
 assert.deepEqual((await data()).teachers.find(x=>x.madinhdanh===teacher.madinhdanh).danhsachkhoi,grades);
 const foreign=(await db.query('SELECT maluachon FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc<>$1 LIMIT 1',[teacher.macaphoc])).rows[0];
 if(foreign)await assert.rejects(()=>db.query('INSERT INTO vuihoc."GIAO_VIEN_KHOI"(magiaovien,maluachon,thutu) VALUES($1,$2,999)',[teacher.madinhdanh,foreign.maluachon]),/cấp học/);
 if(anotherCategory)await assert.rejects(()=>db.query('UPDATE vuihoc."GIAO_VIEN" SET macaphoc=$1 WHERE madinhdanh=$2',[anotherCategory.madinhdanh,teacher.madinhdanh]),/cấp học/);
 // Restore fixture catalog labels before later suites run their demo-data preflight.
 const editedCategory=(await data()).teaching_categories.find(x=>x.madinhdanh===category.madinhdanh);
 await write([{dataset:'teaching_categories',before:{madinhdanh:category.madinhdanh,danhsachluachon:editedCategory.danhsachluachon},after:{madinhdanh:category.madinhdanh,danhsachluachon:category.danhsachluachon}}]);
 console.log('PASS teacher grades: source links/order preserved, repeated migration, real RPC edits and invalid/scoped grade guards');
}
