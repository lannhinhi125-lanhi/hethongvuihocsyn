import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyFinalNormalizationReview(db,token){
 const file=p=>readFileSync(p,'utf8');
 const schemaSql=file('supabase/diagnostics/final_3nf_schema_review.sql'),dataSql=file('supabase/diagnostics/remaining_3nf_data_checks.sql');
 const schema=async()=>(await db.query(schemaSql)).rows;
 const actualTables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows.map(x=>x.tablename);
 const facts=async()=>{
  const result={};for(const t of actualTables)result[t]=(await db.query(`SELECT to_jsonb(t) AS row FROM vuihoc."${t}" t ORDER BY to_jsonb(t)::text`)).rows;
  return result;
 };
 const before=await facts();
 await db.exec('BEGIN READ ONLY');
 await db.exec('SET LOCAL search_path=vuihoc,public');
 const reviewed=await schema();assert.deepEqual(reviewed.map(x=>x.table_name).sort(),actualTables);
 assert.ok(reviewed.every(x=>x.status==='KHOP_CAU_TRUC_DA_RA'),JSON.stringify(reviewed.filter(x=>x.status!=='KHOP_CAU_TRUC_DA_RA')));
 assert.deepEqual(await schema(),reviewed);
 const dataReview=(await db.query(dataSql)).rows;assert.equal(dataReview.length,16);assert.ok(dataReview.every(x=>x.status==='OK'));
 assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(x=>x.trangthai==='OK'));
 await db.query(file('supabase/diagnostics/normalization_data_checks.sql'));
 await db.exec('COMMIT');assert.deepEqual(await facts(),before,'read-only review leaves every row of every table intact');
 // Extra columns/tables must not silently inherit the reviewed verdict.
 await db.exec('BEGIN; ALTER TABLE vuihoc."GIAO_VIEN" ADD COLUMN hoten text; CREATE TABLE vuihoc."TEST_UNREVIEWED"(id text PRIMARY KEY);');
 let findings=await schema();assert.equal(findings.find(x=>x.table_name==='GIAO_VIEN').status,'CAN_RA_LAI');
 assert.equal(findings.find(x=>x.table_name==='TEST_UNREVIEWED').status,'CHUA_RA_BANG_NAY');await db.exec('ROLLBACK');
 // A physically duplicated source value and an unreviewed JSON column are both visible.
 await db.exec('BEGIN; ALTER TABLE vuihoc."DIEM_DANH_BUOI_HOC" ADD COLUMN metadata jsonb;');
 findings=await schema();assert.equal(findings.find(x=>x.table_name==='DIEM_DANH_BUOI_HOC').status,'CAN_RA_LAI');await db.exec('ROLLBACK');
 await db.exec('BEGIN; DROP INDEX vuihoc.cau_hinh_he_thong_mot_ban;');
 findings=await schema();assert.equal(findings.find(x=>x.table_name==='CAU_HINH_HE_THONG').status,'CAN_RA_LAI');await db.exec('ROLLBACK');
 const attendanceFk=(await db.query("SELECT conname FROM pg_constraint WHERE conrelid='vuihoc.\"DIEM_DANH_BUOI_HOC\"'::regclass AND confrelid='vuihoc.\"HOC_SINH\"'::regclass AND contype='f'")).rows[0].conname;
 const quote=x=>'"'+x.replaceAll('"','""')+'"';
 await db.exec('BEGIN');await db.exec('ALTER TABLE vuihoc."DIEM_DANH_BUOI_HOC" DROP CONSTRAINT '+quote(attendanceFk));
 findings=await schema();assert.equal(findings.find(x=>x.table_name==='DIEM_DANH_BUOI_HOC').status,'CAN_RA_LAI');
 await db.exec('ALTER TABLE vuihoc."DIEM_DANH_BUOI_HOC" DISABLE TRIGGER USER');
 const attendance=(await db.query('SELECT mabuoi,mahocsinh FROM vuihoc."DIEM_DANH_BUOI_HOC" LIMIT 1')).rows[0];assert.ok(attendance);
 await db.query('UPDATE vuihoc."DIEM_DANH_BUOI_HOC" SET mahocsinh=\'NO-SUCH-STUDENT\' WHERE mabuoi=$1 AND mahocsinh=$2',[attendance.mabuoi,attendance.mahocsinh]);
 assert.ok((await db.query(dataSql)).rows.find(x=>x.check_id==='ATTENDANCE_ORPHAN').review_rows>0);await db.exec('ROLLBACK');
 // Existing keys already reject a repeated slot and a history row without its parent period.
 for(const target of ['LICH_DANG_KY_MON_HOC','LICH_SU_CA_DANG_KY_HOC']){
  const row=(await db.query(`SELECT * FROM vuihoc."${target}" LIMIT 1`)).rows[0];
  if(!row)continue;
  await db.exec('BEGIN');
  const columns=Object.keys(row),values=columns.map(k=>k==='thutu'?999999:row[k]);
  await assert.rejects(()=>db.query(`INSERT INTO vuihoc."${target}"(${columns.map(quote).join(',')}) VALUES(${columns.map((_,i)=>'$'+(i+1)).join(',')})`,values),/unique/);
  await db.exec('ROLLBACK');
 }
 // Real reenrollment keeps period-specific requests, without copying them onto the profile.
 const business=async()=>(await db.query('SELECT public.vuihoc_business_data($1) v',[token])).rows[0].v;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 let student=(await business()).students.find(s=>s.dangkymonhoc.some(r=>r.status==='DA_THOI_HOC'&&r.scheduleSlots.length));assert.ok(student);
 const old=student.dangkymonhoc.find(r=>r.status==='DA_THOI_HOC'&&r.scheduleSlots.length),other=student.dangkymonhoc.filter(r=>r.subject!==old.subject);
 await save([{dataset:'students',before:{madinhdanh:student.madinhdanh,dangkymonhoc:student.dangkymonhoc},after:{madinhdanh:student.madinhdanh,dangkymonhoc:student.dangkymonhoc.map(r=>r.subject===old.subject?{...r,status:'CHO_XEP_LOP',scheduleSlots:[]}:r)}}]);
 student=(await business()).students.find(s=>s.madinhdanh===student.madinhdanh);
 assert.deepEqual(student.dangkymonhoc.filter(r=>r.subject!==old.subject),other);
 assert.deepEqual(student.lichsudangky.find(h=>h.subject===old.subject&&h.periodNumber===old.periodNumber).scheduleSlots,old.scheduleSlots);
 assert.deepEqual(student.dangkymonhoc.find(r=>r.subject===old.subject).scheduleSlots,[]);
 const historySlot=(await db.query('SELECT * FROM vuihoc."LICH_SU_CA_DANG_KY_HOC" WHERE mahocsinh=$1 AND mamonhoc=$2 AND dotdangky=$3 LIMIT 1',[student.madinhdanh,old.subject,old.periodNumber])).rows[0];assert.ok(historySlot);
 const historyColumns=Object.keys(historySlot),insertHistory=values=>db.query(`INSERT INTO vuihoc."LICH_SU_CA_DANG_KY_HOC"(${historyColumns.map(quote).join(',')}) VALUES(${historyColumns.map((_,i)=>'$'+(i+1)).join(',')})`,values);
 await db.exec('BEGIN');await assert.rejects(()=>insertHistory(historyColumns.map(k=>k==='thutu'?999999:historySlot[k])),/unique/);await db.exec('ROLLBACK');
 await db.exec('BEGIN');await assert.rejects(()=>insertHistory(historyColumns.map(k=>k==='dotdangky'?999999:historySlot[k])),/foreign key/);await db.exec('ROLLBACK');
 assert.ok((await db.query(dataSql)).rows.every(x=>x.status==='OK'));
 // Role membership is written by the actual account RPC; labels remain in the permission catalog.
 const session=async()=>(await db.query('SELECT public.vuihoc_session($1) v',[token])).rows[0].v;
 const group=(await session()).role_groups.find(g=>g.danhsachquyen.length>=2);assert.ok(group);
 const fresh=Object.fromEntries(Object.entries({...group,madinhdanh:'FINAL-REVIEW-ROLE',tennhomquyen:'Final review role',macdinh:false,danhsachquyen:group.danhsachquyen.slice(0,2)}).filter(([k])=>!['ngaytao','ngaycapnhat','soluongnguoidung'].includes(k)));
 const saveAccount=changes=>db.query('SELECT public.vuihoc_save_accounts($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 await saveAccount([{dataset:'role_groups',before:null,after:fresh}]);
 const links=(await db.query('SELECT maquyen FROM vuihoc."NHOM_QUYEN_CHI_TIET" WHERE manhom=$1 ORDER BY thutu',[fresh.madinhdanh])).rows.map(x=>x.maquyen);assert.deepEqual(links,fresh.danhsachquyen);
 await saveAccount([{dataset:'role_groups',before:{madinhdanh:fresh.madinhdanh},after:null}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."NHOM_QUYEN_CHI_TIET" WHERE manhom=$1',[fresh.madinhdanh])).rows[0].n,0);
 assert.ok((await schema()).every(x=>x.status==='KHOP_CAU_TRUC_DA_RA'));
 console.log(`PASS final normalization review: all ${actualTables.length} physical tables/columns/keys covered, read-only preservation, schema drift/extra table/JSON/missing FK detection, orphan detection, existing slot uniqueness, real reenrollment history and permission-link RPCs`);
}
