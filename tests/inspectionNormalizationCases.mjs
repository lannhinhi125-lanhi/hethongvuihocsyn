import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyInspectionNormalization(db,token){
 const migration=readFileSync('supabase/migrations/20261127_normalize_inspection_reports.sql','utf8');
 const diagnostic=readFileSync('supabase/diagnostics/inspection_normalization_legacy.sql','utf8');
 const data=async()=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[token])).rows[0].v;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const rows=async table=>(await db.query(`SELECT to_jsonb(t) AS v FROM vuihoc."${table}" t ORDER BY madinhdanh`)).rows.map(r=>r.v);
 const before=await rows('BIEN_BAN_DU_GIO'),lessons=await rows('BUOI_HOC'),work=await rows('CONG_DAY_BUOI_HOC');
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const tableNames=await tables(); assert.ok(before.length);assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec('BEGIN; ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" DISABLE TRIGGER USER');
 await db.query('UPDATE vuihoc."BIEN_BAN_DU_GIO" SET tenbuoihoc=$2 WHERE madinhdanh=$1',[before[0].madinhdanh,'Conflicting historical title']);
 assert.ok((await db.query(diagnostic)).rows.length);
 await assert.rejects(()=>db.exec(migration),/chưa khớp nguồn/); await db.exec('ROLLBACK');
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await tables(),tableNames);assert.deepEqual(await rows('BUOI_HOC'),lessons);assert.deepEqual(await rows('CONG_DAY_BUOI_HOC'),work);
 const after=await rows('BIEN_BAN_DU_GIO');
 const kept=['madinhdanh','mabienban','mabuoi','manguoidanhgia','ngaydanhgia','guiluc','nhanxetchung','uudiem','cancaithien','khuyennghi','trangthai','ngaytao','ngaycapnhat','diemtc1','diemtc2','diemtc3'];
 for(let i=0;i<before.length;i++) assert.deepEqual(after[i],Object.fromEntries(kept.map(k=>[k,before[i][k]])));
 const view=await rows('V_BIEN_BAN_DU_GIO');
 for(let i=0;i<before.length;i++)for(const k of Object.keys(before[i])) {
  if(k==='khunggio')assert.equal(view[i][k].replace(/\s/g,''),before[i][k].replace(/\s/g,''));
  else assert.deepEqual(view[i][k],before[i][k],`read projection preserves ${k}`);
 }
 const oldData=await data();const e=oldData.teacher_evaluations[0];assert.ok(e&&e.diemtong!=null&&e.magiaovien);
 await save([{dataset:'teacher_evaluations',before:{madinhdanh:e.madinhdanh,nhanxetchung:e.nhanxetchung,diemtieuchi:e.diemtieuchi},after:{madinhdanh:e.madinhdanh,nhanxetchung:'Normalized comment',diemtieuchi:{tc1:9,tc2:8,tc3:7}}}]);
 let edited=(await data()).teacher_evaluations.find(x=>x.madinhdanh===e.madinhdanh);
 assert.equal(edited.diemtong,8);assert.equal(edited.xeploai,'Tốt');assert.equal(edited.nhanxetchung,'Normalized comment');
 const nested=(await data()).teachers.find(t=>t.madinhdanh===e.magiaovien).baocaodanhgia.find(x=>x.id===e.madinhdanh);
 assert.equal(nested.overallScore,8);assert.equal(nested.lessonId,e.mabuoi);
 // The legacy teacher-history editor also writes only normalized evaluation facts.
 const teacher=(await data()).teachers.find(t=>t.madinhdanh===e.magiaovien);
 const history=teacher.baocaodanhgia.map(x=>x.id===e.madinhdanh?{...x,generalComment:'Nested normalized edit',criteriaScores:{tc1:8,tc2:9,tc3:8}}:x);
 await save([{dataset:'teachers',before:{madinhdanh:teacher.madinhdanh,baocaodanhgia:teacher.baocaodanhgia},after:{madinhdanh:teacher.madinhdanh,baocaodanhgia:history}}]);
 assert.equal((await data()).teacher_evaluations.find(x=>x.madinhdanh===e.madinhdanh).diemtong,8.5);
 const account=(await db.query('SELECT u.tendangnhap FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung WHERE g.madinhdanh=$1',[e.magiaovien])).rows[0];
 const teacherToken=(await db.query('SELECT public.vuihoc_login($1,$2) AS v',[account.tendangnhap,'246810'])).rows[0].v.token;
 const ownData=(await db.query('SELECT public.vuihoc_business_data($1) AS v',[teacherToken])).rows[0].v;
 assert.ok(ownData.teacher_evaluations.length);assert.ok(ownData.teacher_evaluations.every(x=>x.magiaovien===e.magiaovien));
 // A correction to the authoritative lesson is visible in every read projection.
 await db.exec('BEGIN');
 await db.query('UPDATE vuihoc."BUOI_HOC" SET lienketbanghi=$2 WHERE madinhdanh=$1',[e.mabuoi,'https://example.test/recording-source']);
 assert.equal((await data()).teacher_evaluations.find(x=>x.madinhdanh===e.madinhdanh).lienketbanghi,'https://example.test/recording-source');
 await db.exec('ROLLBACK');
 await db.exec('BEGIN');
 await assert.rejects(()=>db.query('DELETE FROM vuihoc."CHI_TIET_CA_LOP" WHERE mabuoi=$1',[e.mabuoi]));await db.exec('ROLLBACK');
 await db.exec('BEGIN');
 await assert.rejects(()=>db.query('UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=NULL,magiaovienchinh=NULL WHERE madinhdanh=$1',[e.mabuoi]),/giáo viên|biên bản/);await db.exec('ROLLBACK');
 await assert.rejects(()=>save([{dataset:'teacher_evaluations',before:{madinhdanh:e.madinhdanh},after:{madinhdanh:e.madinhdanh,diemtong:1}}]));
 const fresh={...edited,madinhdanh:'TEST-NORMALIZED-INSPECTION',mabienban:'TEST/NORMALIZED/INSPECTION'};
 await save([{dataset:'teacher_evaluations',before:null,after:Object.fromEntries(['madinhdanh','mabienban','mabuoi','manguoidanhgia','ngaydanhgia','guiluc','nhanxetchung','uudiem','cancaithien','khuyennghi','trangthai','diemtieuchi'].map(k=>[k,fresh[k]]))}]);
 assert.ok((await data()).teacher_evaluations.some(x=>x.madinhdanh===fresh.madinhdanh&&x.magiaovien===e.magiaovien));
 await save([{dataset:'teacher_evaluations',before:{madinhdanh:fresh.madinhdanh},after:null}]);
 await db.exec('BEGIN');
 await assert.rejects(()=>db.query('UPDATE vuihoc."BIEN_BAN_DU_GIO" SET mabuoi=$2 WHERE madinhdanh=$1',[e.madinhdanh,'MISSING-LESSON']));await db.exec('ROLLBACK');
 assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec(readFileSync('supabase/reset_demo_dataset.sql','utf8'));
 await db.exec(readFileSync('supabase/reset_demo_dataset.sql','utf8'));
 assert.ok((await rows('BIEN_BAN_DU_GIO')).length);
 assert.ok((await db.query(readFileSync('supabase/diagnostics/foreign_key_audit.sql','utf8'))).rows.every(r=>r.trangthai==='OK'));
 console.log('PASS inspection normalization: 13 copied/derived columns removed, 16 independent columns preserved, no new tables, preflight rollback, repeat migration, JOIN reads/history, criterion edits and computed scores, real CRUD, FK protection and compatible repeated demo reset');
}
