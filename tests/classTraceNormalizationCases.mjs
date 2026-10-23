import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export async function verifyClassTraceNormalization(db,token){
 const file=p=>readFileSync(p,'utf8'),migration=file('supabase/migrations/20261208_normalize_class_trace_subject.sql');
 const rows=async t=>(await db.query(`SELECT to_jsonb(t) v FROM vuihoc."${t}" t ORDER BY to_jsonb(t)::text`)).rows.map(x=>x.v);
 const data=async()=>(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const oldTables=await tables(),oldTrace=await rows('TRUY_VET_XEP_LOP'),oldData=await data(),protectedFacts={};
 const traceConstraints=async()=>(await db.query("SELECT conname,contype,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='vuihoc.\"TRUY_VET_XEP_LOP\"'::regclass ORDER BY conname")).rows;
 const keptConstraints=(await traceConstraints()).filter(x=>!x.definition.includes('(mamonhoc)'));
 assert.ok(oldTrace.length);
 for(const t of ['LOP_HOC','DANG_KY_MON_HOC','XEP_LOP_DANG_KY','LICH_SU_DANG_KY_HOC','BUOI_HOC','CONG_DAY_BUOI_HOC'])protectedFacts[t]=await rows(t);
 const classes=await rows('LOP_HOC'),one=oldTrace[0],source=classes.find(c=>c.madinhdanh===(one.malopmoi||one.malopcu)),other=classes.find(c=>c.mamonhoc!==source.mamonhoc);
 assert.ok(other);
 assert.deepEqual((await db.query(file('supabase/diagnostics/trace_subject_legacy.sql'))).rows,[]);
 await db.exec('BEGIN');
 await db.query('UPDATE vuihoc."TRUY_VET_XEP_LOP" SET mamonhoc=$1 WHERE madinhdanh=$2',[other.mamonhoc,one.madinhdanh]);
 await assert.rejects(()=>db.exec(migration),/chưa khớp nguồn lớp/);await db.exec('ROLLBACK');
 assert.deepEqual(await rows('TRUY_VET_XEP_LOP'),oldTrace);
 await db.exec('BEGIN');
 await db.query('INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi,mamonhoc) VALUES($1,$2,$3,$4)',[one.mahocsinh,source.madinhdanh,other.madinhdanh,other.mamonhoc]);
 await assert.rejects(()=>db.exec(migration),/chưa khớp nguồn lớp/);await db.exec('ROLLBACK');
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await tables(),oldTables,'no new physical storage');
 // Compare by event identity; SQL JSON text ordering differs from JavaScript object ordering.
 const current=new Map((await rows('TRUY_VET_XEP_LOP')).map(x=>[x.madinhdanh,x]));
 for(const {mamonhoc,...x} of oldTrace)assert.deepEqual(current.get(x.madinhdanh),x);
 assert.equal(current.size,oldTrace.length);
 assert.deepEqual(await traceConstraints(),keptConstraints,'all original keys/checks apart from the removed subject FK remain');
 const queried=new Map((await rows('V_TRUY_VET_XEP_LOP')).map(x=>[x.madinhdanh,x]));
 for(const x of oldTrace)assert.deepEqual(queried.get(x.madinhdanh),x);
 for(const [t,old] of Object.entries(protectedFacts))assert.deepEqual(await rows(t),old,t);
 assert.deepEqual(await data(),oldData,'business histories/reports retain the same queried values');
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='TRUY_VET_XEP_LOP'")).rows[0].n,7);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')")).rows[0].n,0);
 await assert.rejects(()=>db.query('UPDATE vuihoc."LOP_HOC" SET mamonhoc=$1 WHERE madinhdanh=$2',[other.mamonhoc,source.madinhdanh]));
 await assert.rejects(()=>db.query('INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi) VALUES($1,$2,$3)',[one.mahocsinh,source.madinhdanh,other.madinhdanh]),/cùng môn đăng ký/);
 await db.query('UPDATE vuihoc."LOP_HOC" SET tenlophoc=$1 WHERE madinhdanh=$2',[source.tenlophoc+' source rename',source.madinhdanh]);
 assert.equal((await db.query('SELECT mamonhoc FROM vuihoc."V_TRUY_VET_XEP_LOP" WHERE madinhdanh=$1',[one.madinhdanh])).rows[0].mamonhoc,source.mamonhoc);
 await db.query('UPDATE vuihoc."LOP_HOC" SET tenlophoc=$1 WHERE madinhdanh=$2',[source.tenlophoc,source.madinhdanh]);
 // Exercise the actual registration trigger through the business RPC, including stop/reopen/assign.
 let cls=(await data()).classes.find(c=>c.trangthai==='DANG_HOC'&&c.danhsachmahocsinh.length);
 assert.ok(cls);const members=[...cls.danhsachmahocsinh];
 const traceCount=async()=>(await db.query('SELECT count(*)::int n FROM vuihoc."TRUY_VET_XEP_LOP"')).rows[0].n;
 const beforePause=await traceCount();
 await save([{dataset:'classes',before:{madinhdanh:cls.madinhdanh,tamdunglich:cls.tamdunglich},after:{madinhdanh:cls.madinhdanh,tamdunglich:true}}]);
 assert.equal(await traceCount(),beforePause,'temporary pause retains assignments');
 await save([{dataset:'classes',before:{madinhdanh:cls.madinhdanh,trangthai:cls.trangthai},after:{madinhdanh:cls.madinhdanh,trangthai:'TAM_DUNG',danhsachmahocsinh:[]}}]);
 assert.equal(await traceCount(),beforePause+members.length);
 for(const hs of members){
  const latest=(await db.query('SELECT * FROM vuihoc."V_TRUY_VET_XEP_LOP" WHERE mahocsinh=$1 ORDER BY madinhdanh DESC LIMIT 1',[hs])).rows[0];
  assert.equal(latest.malopcu,cls.madinhdanh);assert.equal(latest.malopmoi,null);assert.equal(latest.mamonhoc,cls.mamonhoc);
 }
 cls=(await data()).classes.find(c=>c.madinhdanh===cls.madinhdanh);
 await save([{dataset:'classes',before:{madinhdanh:cls.madinhdanh,trangthai:cls.trangthai},after:{madinhdanh:cls.madinhdanh,trangthai:'DANG_HOC',tamdunglich:false,danhsachmahocsinh:members}}]);
 assert.equal(await traceCount(),beforePause+2*members.length);
 let student=(await data()).students.find(s=>s.dangkymonhoc.some(r=>r.status==='DA_THOI_HOC'));assert.ok(student);
 const subject=student.dangkymonhoc.find(r=>r.status==='DA_THOI_HOC').subject;
 const originalPeriod=student.dangkymonhoc.find(r=>r.subject===subject).periodNumber,historyCount=student.lichsudangky.length;
 for(const status of ['CHO_XEP_LOP','DA_THOI_HOC','CHO_XEP_LOP']){
  const after=student.dangkymonhoc.map(r=>r.subject===subject?{...r,status,scheduleSlots:[]}:r);
  await save([{dataset:'students',before:{madinhdanh:student.madinhdanh,dangkymonhoc:student.dangkymonhoc},after:{madinhdanh:student.madinhdanh,dangkymonhoc:after}}]);
  student=(await data()).students.find(s=>s.madinhdanh===student.madinhdanh);
 }
 assert.equal(student.dangkymonhoc.find(r=>r.subject===subject).periodNumber,originalPeriod+2);
 assert.equal(student.lichsudangky.length,historyCount+2);
 // Direct entry/exit/same-subject transfer use only class foreign keys.
 const same=classes.find(c=>c.mamonhoc===source.mamonhoc&&c.madinhdanh!==source.madinhdanh);assert.ok(same);
 for(const [prev,next] of [[null,source.madinhdanh],[source.madinhdanh,null],[source.madinhdanh,same.madinhdanh]]){
  const id=(await db.query('INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi) VALUES($1,$2,$3) RETURNING madinhdanh',[one.mahocsinh,prev,next])).rows[0].madinhdanh;
  assert.equal((await db.query('SELECT mamonhoc FROM vuihoc."V_TRUY_VET_XEP_LOP" WHERE madinhdanh=$1',[id])).rows[0].mamonhoc,source.mamonhoc);
 }
 await db.exec('BEGIN TRANSACTION READ ONLY');assert.deepEqual((await db.query(file('supabase/diagnostics/trace_subject_legacy.sql'))).rows,[]);await db.exec('COMMIT');
 for(const role of ['anon','authenticated'])assert.equal((await db.query("SELECT has_function_privilege($1,'vuihoc.kiem_tra_nguon_mon_truy_vet()','EXECUTE') v",[role])).rows[0].v,false);
 await db.exec(file('supabase/reset_demo_dataset.sql'));await db.exec(file('supabase/reset_demo_dataset.sql'));await data();
 assert.deepEqual((await db.query(file('supabase/diagnostics/trace_subject_legacy.sql'))).rows,[]);
 console.log('PASS class trace normalization: 8 to 7 columns, no new tables, mismatch/cross-subject rollback, exact events/source facts/API preservation, repeated migration, class-source protection, real pause/stop/reopen assignment RPCs, queried entry/exit/transfer, permissions and repeated reset');
}
