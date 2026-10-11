import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {toSupabaseRow,fromSupabaseRow} from '../src/lib/supabaseMapper';
const root=process.env.PGLITE_MODULE_PATH!;
const {PGlite}=await import(pathToFileURL(root+'/dist/index.js').href);
const {pgcrypto}=await import(pathToFileURL(root+'/dist/contrib/pgcrypto.js').href);
const setup=async(db:any)=>db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT null::uuid $$;`);
const migration=readFileSync('supabase/migrations/20261011_normalize_database.sql','utf8');
for(const mode of ['fresh','upgrade']){
 const db=new PGlite({extensions:{pgcrypto}});
 try {
  await setup(db);
  if(mode==='fresh'){await db.exec(readFileSync('supabase/schema.sql','utf8'));await db.exec(readFileSync('supabase/schema.sql','utf8'));}
  else {await db.exec(readFileSync('tests/fixtures/preNormalization.sql','utf8'));await db.exec(migration);await db.exec(migration);}
  assert.equal((await db.query(`SELECT count(*)::int n FROM pg_tables WHERE schemaname='vuihoc'`)).rows[0].n,31);
  assert.equal((await db.query(`SELECT to_regclass('vuihoc."CA_HOC"') AS t`)).rows[0].t,null);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."BUOI_HOC"')).rows[0].n,8);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."NHAN_XET_BUOI_HOC"')).rows[0].n,6);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."SU_CO_BUOI_HOC"')).rows[0].n,4);
  for(const [table,columns] of Object.entries({GIAO_VIEN:['tenmonhoc','tencaphoc','tentrangthai'],LOP_HOC:['hotengiaovien'],BIEN_BAN_DU_GIO:['hotennguoidanhgia','vaitronguoidanhgia','tenlophoc']})){
   const rows=(await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['vuihoc',table])).rows;
   for(const col of columns)assert.ok(!rows.some((r:any)=>r.column_name===col));
  }
  assert.equal(toSupabaseRow('students',{status:'Đang học'}).trangthai,'DANG_HOC');
  assert.equal(fromSupabaseRow('students',{trangthai:'DANG_HOC'}).status,'Đang học');
  assert.deepEqual(toSupabaseRow('teachers',{subject:'SUB-MATH',subjectName:'stale',statusLabel:'stale'}),{mamonhoc:'SUB-MATH'});
  assert.equal(fromSupabaseRow('classes',{magiaovien:'GV-001'},{teachers:[{madinhdanh:'GV-001',hoten:'Current name'}]}).teacherName,'Current name');
  assert.throws(()=>toSupabaseRow('teaching_sessions',{subject:'TOAN'}),/dated_lessons/);
  console.log(mode+': normalized schema and data transfer passed');
 }finally{await db.close();}
}
// Ambiguous names must roll back without deleting legacy data.
const db=new PGlite({extensions:{pgcrypto}});
try {await setup(db);await db.exec(readFileSync('tests/fixtures/preNormalization.sql','utf8'));
 await db.exec(`UPDATE vuihoc."GIAO_VIEN" SET hoten=(SELECT hoten FROM vuihoc."GIAO_VIEN" WHERE madinhdanh='GV-001') WHERE madinhdanh='GV-003'`);
 await assert.rejects(db.exec(migration),/Ca /);await db.exec('ROLLBACK');
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."CA_HOC"')).rows[0].n,8);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."BUOI_HOC"')).rows[0].n,0);
 console.log('Ambiguous legacy identity: rollback passed');
}finally{await db.close();}
