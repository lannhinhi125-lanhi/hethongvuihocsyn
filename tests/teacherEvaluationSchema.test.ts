
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {toSupabaseRow} from '../src/lib/supabaseMapper';
const root=process.env.PGLITE_MODULE_PATH;
assert.ok(root);
const {PGlite}=await import(pathToFileURL(root.replace(/[/\\]$/,'')+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root.replace(/[/\\]$/,'')+'/dist/contrib/pgcrypto.js').href);
const db=new PGlite({extensions:{pgcrypto}});
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;`);
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261011_teacher_evaluations.sql','utf8'));
 const cls=(await db.query('SELECT malophoc FROM vuihoc."LOP_HOC" WHERE madinhdanh=\'CLS-001\'')).rows[0].malophoc;
 await db.exec(`INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh)
 VALUES('OBS-LESSON','CLS-001','2026-10-06','SLOT-1','2026-10-06 18:00+07','2026-10-06 19:30+07','GV-001');`);
 const base={id:'OBS-1',teacherId:'GV-001',lessonId:'OBS-LESSON',classCode:cls,recipientUserId:'GV-001',reportCode:'OBS/2026/1',evaluationDate:'11/10/2026',sessionDate:'06/10/2026',evaluatorName:'Evaluator',evaluatorRole:'Chuyên môn',className:'Class',sessionNum:1,sessionName:'Lesson',timeSlot:'18:00 - 19:30',model:'1-3',overallScore:9,rank:'Xuất sắc',criteriaScores:{tc1:9,tc2:9,tc3:9},status:'DA_DUYET'};
 const insert=async(value:object)=>{
  const row=toSupabaseRow('teacher_evaluations',value);
  const cols=Object.keys(row);
  await db.query('INSERT INTO vuihoc."BIEN_BAN_DU_GIO" ('+cols.map(c=>'"'+c+'"').join(',')+') VALUES ('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(row));
 };
 await insert(base);
 const saved=(await db.query('SELECT * FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh=\'OBS-1\'')).rows[0];
 assert.equal(saved.magiaovien,'GV-001');assert.equal(new Date(saved.ngaydanhgia).toISOString().slice(0,10),'2026-10-11');assert.equal(new Date(saved.ngaycahoc).toISOString().slice(0,10),'2026-10-06');
 const reject=async(value:object)=>{
  await db.exec('BEGIN');
  try {await assert.rejects(insert(value));}finally {await db.exec('ROLLBACK');}
 };
 await reject({...base,id:'OBS-2',reportCode:'OBS/2',teacherId:'MISSING'});
 await reject({...base,id:'OBS-3',reportCode:'OBS/3',teacherId:'GV-002',recipientUserId:'GV-002'});
 await reject({...base,id:'OBS-4',reportCode:'OBS/4',recipientUserId:'GV-002'});
 await reject({...base,id:'OBS-5',reportCode:'OBS/5',sessionDate:'07/10/2026'});
 await reject({...base,id:'OBS-6',reportCode:'OBS/6',classCode:'MISSING'});
 await reject({...base,id:'OBS-7',reportCode:'OBS/7',criteriaScores:{tc1:11,tc2:9,tc3:9}});
 await reject({...base,id:'OBS-8',reportCode:'OBS/8',teacherId:undefined});
 assert.throws(()=>toSupabaseRow('teacher_evaluations',{evaluationDate:'31/02/2026'}));
 const upgraded=new PGlite({extensions:{pgcrypto}});
 try {
  await upgraded.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;`);
  const old=readFileSync('supabase/schema.sql','utf8').split('-- Biên bản dự giờ: mã giáo viên bắt buộc')[0]+'COMMIT;';
  await upgraded.exec(old);
  await upgraded.exec(readFileSync('supabase/migrations/20261011_teacher_evaluations.sql','utf8'));
  await upgraded.exec(readFileSync('supabase/migrations/20261011_teacher_evaluations.sql','utf8'));
  assert.equal((await upgraded.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='vuihoc'")).rows[0].n,32);
 }finally {await upgraded.close();}
 console.log('PASS: required teacher FK, lesson/teacher/class/date match, recipient ownership, date normalization, score bounds and upgrade/re-run.');
}finally {await db.close();}
