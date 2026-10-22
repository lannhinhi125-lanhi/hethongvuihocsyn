import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyStudentNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const business=async()=>(await db.query('SELECT public.vuihoc_business_data($1) AS value',[token])).rows[0].value;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const migration=file('supabase/migrations/20261121_normalize_student_enrollments.sql');
 const first=await business();
 // The real unmodified demo baseline contains NULL old class copies and stale
 // DANG_HOC states after automatic class completion. Do not repair it first.
 assert.deepEqual((await db.query(file('supabase/diagnostics/student_enrollment_legacy.sql'))).rows,[],'safe stale demo copies must not be reported as unresolved contradictions');
 await db.exec('BEGIN');await db.exec(migration);await db.exec('ROLLBACK');
 // Also migrate the deployed availability/minimal-write writer, whose UPSERT
 // has an additional WHERE ... IS DISTINCT FROM clause.
 await db.exec(file('supabase/migrations/20261105_student_available_slots.sql'));
 // Regression for the exported DEMO-HS-036 pattern: an initial assignment was
 // persisted/traced while the old profile still says waiting with a NULL class.
 await db.exec('BEGIN');
 const staleWaiting=(await db.query(`SELECT h.madinhdanh FROM vuihoc."HOC_SINH" h JOIN vuihoc."DANG_KY_MON_HOC" d ON d.mahocsinh=h.madinhdanh
 WHERE (h.mamonhoc,h.mamohinh,h.matrinhdo)=(d.mamonhoc,d.mamohinh,d.matrinhdo) AND d.trangthai='DANG_HOC'
 AND EXISTS(SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" t WHERE t.mahocsinh=h.madinhdanh AND t.mamonhoc=d.mamonhoc AND t.malopcu IS NULL AND t.malopmoi=d.malop) LIMIT 1`)).rows[0];
 assert.ok(staleWaiting);
 await db.query(`UPDATE vuihoc."HOC_SINH" SET trangthai='CHO_XEP_LOP',malophientai=NULL WHERE madinhdanh=$1`,[staleWaiting.madinhdanh]);
 assert.deepEqual((await db.query(file('supabase/diagnostics/student_enrollment_legacy.sql'))).rows,[]);
 const tracedAssignment=(await db.query('SELECT * FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1 ORDER BY mamonhoc',[staleWaiting.madinhdanh])).rows;
 await db.exec('SAVEPOINT without_assignment_trace');
 await db.query(`DELETE FROM vuihoc."TRUY_VET_XEP_LOP" WHERE mahocsinh=$1 AND malopcu IS NULL`,[staleWaiting.madinhdanh]);
 await assert.rejects(()=>db.exec(migration),/chưa khớp/);
 await db.exec('ROLLBACK TO SAVEPOINT without_assignment_trace');
 await db.exec(migration);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."V_DANG_KY_MON_HOC" WHERE mahocsinh=$1 ORDER BY mamonhoc',[staleWaiting.madinhdanh])).rows.map(({macaphocdangky,...row})=>row),tracedAssignment);
 await db.exec('ROLLBACK');
 const withdrawn=first.students.find(h=>h.dangkymonhoc.some(d=>d.status==='DA_THOI_HOC'));
 await save([{dataset:'students',before:{madinhdanh:withdrawn.madinhdanh,dangkymonhoc:withdrawn.dangkymonhoc},after:{madinhdanh:withdrawn.madinhdanh,dangkymonhoc:withdrawn.dangkymonhoc.map(d=>d.status==='DA_THOI_HOC'?{...d,status:'CHO_XEP_LOP'}:d)}}]);
 const before=await business();
 // Fixture-only reconciliation of old, already stale scalar copies against the real reader.
 for(const h of before.students)await db.query(`UPDATE vuihoc."HOC_SINH" SET mamonhoc=$2,mamohinh=$3,matrinhdo=$4,trangthai=$5,malophientai=$6 WHERE madinhdanh=$1`,[h.madinhdanh,h.mamonhoc,h.mamohinh,h.matrinhdo,h.trangthai,h.malophientai]);
 assert.deepEqual((await db.query(file('supabase/diagnostics/student_enrollment_legacy.sql'))).rows,[]);
 // Exercise deployments where the retired table still exists as well as the cleaned baseline.
 await db.exec(`CREATE TABLE vuihoc."LICH_DANG_KY_HOC_SINH"(mahocsinh text REFERENCES vuihoc."HOC_SINH"(madinhdanh),thutu integer,thutrongtuan integer,makhunggio text REFERENCES vuihoc."KHUNG_GIO"(madinhdanh),PRIMARY KEY(mahocsinh,thutu));
 INSERT INTO vuihoc."LICH_DANG_KY_HOC_SINH" SELECT s.mahocsinh,s.thutu,s.thutrongtuan,s.makhunggio FROM vuihoc."LICH_DANG_KY_MON_HOC" s JOIN vuihoc."HOC_SINH" h ON (h.madinhdanh,h.mamonhoc)=(s.mahocsinh,s.mamonhoc);`);
 await db.exec('BEGIN');
 await db.exec(`UPDATE vuihoc."LICH_DANG_KY_HOC_SINH" o SET thutrongtuan=(SELECT day FROM generate_series(1,7) day WHERE NOT EXISTS(SELECT 1 FROM vuihoc."LICH_DANG_KY_MON_HOC" n WHERE n.mahocsinh=o.mahocsinh AND n.makhunggio=o.makhunggio AND n.thutrongtuan=day) LIMIT 1) WHERE (mahocsinh,thutu)=(SELECT mahocsinh,thutu FROM vuihoc."LICH_DANG_KY_HOC_SINH" LIMIT 1)`);
 await assert.rejects(()=>db.exec(migration),/lịch đăng ký cũ/);await db.exec('ROLLBACK');
 await db.exec('BEGIN');
 await db.exec(`UPDATE vuihoc."HOC_SINH" SET trangthai='BAO_LUU' WHERE madinhdanh=(SELECT mahocsinh FROM vuihoc."DANG_KY_MON_HOC" WHERE trangthai='DANG_HOC' LIMIT 1)`);
 await assert.rejects(()=>db.exec(migration),/chưa khớp/);await db.exec('ROLLBACK');
 const registrations=(await db.query('SELECT * FROM vuihoc."DANG_KY_MON_HOC" ORDER BY mahocsinh,mamonhoc')).rows;
 const schedules=(await db.query('SELECT * FROM vuihoc."LICH_DANG_KY_MON_HOC" ORDER BY mahocsinh,mamonhoc,thutu')).rows;
 const histories=(await db.query(`SELECT to_jsonb(h)-'trangthai' AS row FROM vuihoc."LICH_SU_DANG_KY_HOC" h ORDER BY mahocsinh,mamonhoc,dotdangky`)).rows;
 assert.ok(histories.length>0);
 await db.exec(migration);await db.exec(migration);
 const projectedRegistrations=(await db.query('SELECT * FROM vuihoc."V_DANG_KY_MON_HOC" ORDER BY mahocsinh,mamonhoc')).rows;
 assert.deepEqual(projectedRegistrations.map(({macaphocdangky,...row})=>row),registrations);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."LICH_DANG_KY_MON_HOC" ORDER BY mahocsinh,mamonhoc,thutu')).rows,schedules);
 assert.deepEqual((await db.query(`SELECT to_jsonb(h)-ARRAY['trangthai','macaphoc'] AS row FROM vuihoc."LICH_SU_DANG_KY_HOC" h ORDER BY mahocsinh,mamonhoc,dotdangky`)).rows,histories);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."DANG_KY_MON_HOC" WHERE khoidangky IS NOT NULL AND macaphocdangky IS NULL`)).rows[0].n,0);
 assert.equal((await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_SINH' AND column_name IN ('mamonhoc','mamohinh','matrinhdo','trangthai','malophientai')`)).rows[0].n,0);
 assert.equal((await db.query(`SELECT to_regclass('vuihoc."LICH_DANG_KY_HOC_SINH"') AS name`)).rows[0].name,null);
 assert.equal((await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='DANG_KY_MON_HOC' AND column_name='malop'`)).rows[0].n,0);
 const pref=schedules[0];
 await assert.rejects(()=>db.query(`INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" VALUES($1,$2,999,$3,$4)`,[pref.mahocsinh,pref.mamonhoc,pref.thutrongtuan,pref.makhunggio]),/unique constraint/);
 const historicalCurrent=(await db.query('SELECT * FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1 LIMIT 1',[withdrawn.madinhdanh])).rows[0];
 await assert.rejects(()=>db.query(`INSERT INTO vuihoc."LICH_SU_DANG_KY_HOC"(mahocsinh,mamonhoc,dotdangky,ngaydangky,ketthucluc,loaidangky,khoi,matrinhdo,mamohinh,macaphoc) VALUES($1,$2,$3,$4,now(),$5,$6,$7,$8,$9)`,[historicalCurrent.mahocsinh,historicalCurrent.mamonhoc,historicalCurrent.dotdangky,historicalCurrent.ngaydangky,historicalCurrent.loaidangky,historicalCurrent.khoidangky,historicalCurrent.matrinhdo,historicalCurrent.mamohinh,historicalCurrent.macaphocdangky]),/Đợt hiện tại/);
 const after=await business();
 for(const h of before.students)assert.deepEqual(after.students.find(x=>x.madinhdanh===h.madinhdanh).dangkymonhoc,h.dangkymonhoc);
 const student=after.students.find(h=>h.dangkymonhoc.some(d=>d.status==='DA_THOI_HOC'));
 const original=student.dangkymonhoc.find(d=>d.status==='DA_THOI_HOC');
 const next=student.dangkymonhoc.map(d=>d.subject===original.subject?{...d,status:'CHO_XEP_LOP',scheduleSlots:[]}:d);
 await save([{dataset:'students',before:{madinhdanh:student.madinhdanh,dangkymonhoc:student.dangkymonhoc},after:{madinhdanh:student.madinhdanh,dangkymonhoc:next}}]);
 let reloaded=(await business()).students.find(h=>h.madinhdanh===student.madinhdanh);
 assert.equal(reloaded.dangkymonhoc.find(d=>d.subject===original.subject).periodNumber,original.periodNumber+1);
 assert.equal(reloaded.lichsudangky.length,(student.lichsudangky?.length||0)+1);
 assert.deepEqual(reloaded.lichsudangky.at(-1).scheduleSlots,original.scheduleSlots);
 await save([{dataset:'students',before:{madinhdanh:student.madinhdanh,hoten:reloaded.hoten},after:{madinhdanh:student.madinhdanh,hoten:'Học sinh kiểm thử chuẩn hóa'}}]);
 reloaded=(await business()).students.find(h=>h.madinhdanh===student.madinhdanh);
 assert.equal(reloaded.hoten,'Học sinh kiểm thử chuẩn hóa');
 await assert.rejects(()=>save([{dataset:'students',before:{madinhdanh:student.madinhdanh},after:{madinhdanh:student.madinhdanh,mamonhoc:original.subject}}]),/không ghi bản sao/);
 const active=registrations.find(d=>d.malop);
 await assert.rejects(()=>db.query('DELETE FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh=$1 AND mamonhoc=$2',[active.mahocsinh,active.mamonhoc]),/Dừng hoạt động lớp/);
 await assert.rejects(()=>db.query('DELETE FROM vuihoc."V_DANG_KY_MON_HOC" WHERE mahocsinh=$1 AND mamonhoc=$2',[active.mahocsinh,active.mamonhoc]),/Dừng hoạt động lớp/);
 const activeClass=(await business()).classes.find(c=>c.madinhdanh===active.malop);
 const membershipBefore=(await db.query('SELECT * FROM vuihoc."XEP_LOP_DANG_KY" WHERE malop=$1 ORDER BY mahocsinh',[active.malop])).rows;
 await save([{dataset:'classes',before:{madinhdanh:active.malop,tamdunglich:activeClass.tamdunglich},after:{madinhdanh:active.malop,tamdunglich:true}}]);
 assert.deepEqual((await db.query('SELECT * FROM vuihoc."XEP_LOP_DANG_KY" WHERE malop=$1 ORDER BY mahocsinh',[active.malop])).rows,membershipBefore);
 await save([{dataset:'classes',before:{madinhdanh:active.malop,trangthai:activeClass.trangthai},after:{madinhdanh:active.malop,trangthai:'TAM_DUNG',danhsachmahocsinh:[]}}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."XEP_LOP_DANG_KY" WHERE malop=$1',[active.malop])).rows[0].n,0);
 assert.equal((await business()).students.find(h=>h.madinhdanh===active.mahocsinh).dangkymonhoc.find(d=>d.subject===active.mamonhoc).status,'CHO_XEP_LOP');
 const template=(await business()).students[0];
 const requested=template.dangkymonhoc[0];
 const newProfile={madinhdanh:'TEST-3NF-STUDENT',hoten:'Học sinh mới chuẩn hóa',khoi:template.khoi,hotencha:'',sodienthoaicha:'',hotenme:'',sodienthoaime:'',dangkymonhoc:[{...requested,status:'CHO_XEP_LOP',currentClassCode:null,scheduleSlots:[]}]};
 await save([{dataset:'students',before:null,after:newProfile}]);
 const newStudent=(await business()).students.find(h=>h.madinhdanh===newProfile.madinhdanh);
 assert.ok(newStudent);assert.equal(newStudent.dangkymonhoc.length,1);
 const entryGrade=(await db.query('SELECT khoidangky FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1',[newProfile.madinhdanh])).rows[0].khoidangky;
 const currentGrade=(await db.query('SELECT * FROM vuihoc."HOC_SINH" WHERE madinhdanh=$1',[newProfile.madinhdanh])).rows[0];
 const otherGrade=(await db.query('SELECT nhan,madinhdanh FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=$1 AND madinhdanh<>$2 LIMIT 1',[currentGrade.macaphoc,currentGrade.makhoi])).rows[0];
 await save([{dataset:'students',before:{madinhdanh:newProfile.madinhdanh,khoi:newStudent.khoi},after:{madinhdanh:newProfile.madinhdanh,khoi:otherGrade.nhan}}]);
 assert.equal((await db.query('SELECT khoidangky FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=$1',[newProfile.madinhdanh])).rows[0].khoidangky,entryGrade,'entry grade is not a live mirror of the profile');
 await db.query(file('supabase/diagnostics/normalization_data_checks.sql'));
 await db.exec(file('supabase/reset_demo_dataset.sql'));
 await business();
 console.log('PASS student normalization: removed scalar copies/old schedule, separated assignment, repeat migration, registration/schedule/history preservation, real reenrollment/profile RPCs and stop-rule guards');
}
