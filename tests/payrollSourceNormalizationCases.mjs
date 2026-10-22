import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyPayrollSourceNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261130_normalize_payroll_sources.sql'),diagnostic=file('supabase/diagnostics/payroll_source_legacy.sql');
 const business=async(t=token)=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[t])).rows[0].v;
 const save=(before,after,t=token)=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[t,JSON.stringify([{dataset:'monthly_payroll',before,after}])]);
 const rows=async table=>(await db.query(`SELECT to_jsonb(t) AS v FROM vuihoc."${table}" t ORDER BY to_jsonb(t)::text`)).rows.map(x=>x.v);
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 // Historical receipt flags may be known even when their old timestamp was not recorded.
 const legacyReceipt=(await db.query('SELECT madinhdanh,kycong,magiaovien FROM vuihoc."CONG_DAY_BUOI_HOC" ORDER BY madinhdanh LIMIT 1')).rows[0];
 await db.query('UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET dagui=true,guiluc=NULL WHERE madinhdanh=$1',[legacyReceipt.madinhdanh]);
 await db.query('UPDATE vuihoc."DOI_SOAT_CONG_GIAO_VIEN" SET dagui=true,trangthai=\'DA_GUI\' WHERE kycong=$1 AND magiaovien=$2',[legacyReceipt.kycong,legacyReceipt.magiaovien]);
 const lockedLegacy=(await db.query('SELECT kycong FROM vuihoc."BANG_CONG_THANG" ORDER BY kycong LIMIT 1')).rows[0].kycong;
 await db.query('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong=$1',[lockedLegacy]);
 const before=await rows('CONG_DAY_BUOI_HOC'),periods=await rows('BANG_CONG_THANG'),groups=await rows('DOI_SOAT_CONG_GIAO_VIEN'),lessons=await rows('BUOI_HOC'),tableNames=await tables(),data=await business();
 const reportViews=['V_CONG_DAY_THEO_CA','V_BANG_CONG_THEO_GIAO_VIEN'];const reports=await Promise.all(reportViews.map(rows));
 assert.ok(before.length);assert.ok(before.some(c=>c.vaitro==='DAY_THAY'));assert.deepEqual((await db.query(diagnostic)).rows,[]);
 for(const [field,value] of [['kycong','2099-01'],['vaitro',before[0].vaitro==='CHINH'?'DAY_THAY':'CHINH']]){
  await db.exec('BEGIN; ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" DISABLE TRIGGER USER');
  if(field==='kycong')await db.exec(`INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES('2099-01',false,false) ON CONFLICT DO NOTHING`);
  await db.query(`UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET ${field}=$2 WHERE madinhdanh=$1`,[before[0].madinhdanh,value]);
  assert.ok((await db.query(diagnostic)).rows.length);await assert.rejects(()=>db.exec(migration),/chưa khớp kỳ/);await db.exec('ROLLBACK');
 }
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await tables(),tableNames);assert.deepEqual(await rows('BANG_CONG_THANG'),periods);assert.deepEqual(await rows('DOI_SOAT_CONG_GIAO_VIEN'),groups);assert.deepEqual(await rows('BUOI_HOC'),lessons);
 const after=await rows('CONG_DAY_BUOI_HOC');for(const old of before){const {kycong,vaitro,...kept}=old;assert.deepEqual(after.find(c=>c.madinhdanh===old.madinhdanh),kept);}
 assert.equal(Object.keys(after[0]).length,11);assert.deepEqual(await rows('V_CONG_DAY_BUOI_HOC'),before);
 assert.deepEqual((await business()).monthly_payroll,data.monthly_payroll);
 for(let i=0;i<reportViews.length;i++)assert.deepEqual(await rows(reportViews[i]),reports[i]);

 // Actual work values are independent facts: positive, zero and negative adjustments survive reads.
 const sample=before.find(c=>c.kycong!==lockedLegacy);assert.ok(sample);await db.exec('BEGIN');
 for(const coefficient of [1,0,-0.25]){
  await db.query('SELECT vuihoc.ghi_ca_vao_bang_cong($1,$2,$3,$4,NULL,$5,true)',[sample.mabuoi,sample.magiaovien,coefficient,'EMERGENCY','Adjustment test with explicit reason']);
  const current=(await rows('V_CONG_DAY_BUOI_HOC')).find(c=>c.madinhdanh===sample.madinhdanh);
  assert.equal(Number(current.hesocong),coefficient);assert.equal(current.kycong,sample.kycong);assert.equal(current.vaitro,sample.vaitro);
 }await db.exec('ROLLBACK');

 // A period cannot disappear even if a manual edit removed its group reconciliation rows.
 await db.exec('BEGIN');await db.query('DELETE FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" WHERE kycong=$1',[sample.kycong]);
 await db.exec('SAVEPOINT protect_period');await assert.rejects(()=>db.query('DELETE FROM vuihoc."BANG_CONG_THANG" WHERE kycong=$1',[sample.kycong]),/còn dòng công/);await db.exec('ROLLBACK TO protect_period');
 await assert.rejects(()=>db.query('UPDATE vuihoc."BANG_CONG_THANG" SET kycong=$2 WHERE kycong=$1',[sample.kycong,'2099-02']),/còn dòng công/);await db.exec('ROLLBACK');
 await db.exec('BEGIN');await assert.rejects(()=>db.query('UPDATE vuihoc."BUOI_HOC" SET ngayhoc=ngayhoc+1 WHERE madinhdanh=$1',[sample.mabuoi]));await db.exec('ROLLBACK');
 await db.exec('BEGIN');await assert.rejects(()=>db.query('UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET magiaovien=$2 WHERE madinhdanh=$1',[sample.madinhdanh,before.find(c=>c.magiaovien!==sample.magiaovien).magiaovien]),/giáo viên khác/);await db.exec('ROLLBACK');

 // Work creation uses only source FKs; its writer creates the correct month and reconciliation row.
 const freshLesson=(await db.query(`SELECT b.madinhdanh,b.magiaovienchinh,to_char(b.ngayhoc,'YYYY-MM') AS month
 FROM vuihoc."BUOI_HOC" b WHERE b.magiaovienchinh IS NOT NULL AND b.magiaoviendaythay IS NULL
 AND NOT EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh)
 AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM')) LIMIT 1`)).rows[0];assert.ok(freshLesson);
 await db.exec('BEGIN');await assert.rejects(()=>db.query('INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien) VALUES($1,$2)',[freshLesson.madinhdanh,freshLesson.magiaovienchinh]),/Chưa có kỳ công/);await db.exec('ROLLBACK');
 await db.exec('BEGIN');
 for(let i=0;i<2;i++)await db.query('SELECT vuihoc.ghi_ca_vao_bang_cong($1,$2,1,\'STANDARD\',NULL,\'New source-only work\',false)',[freshLesson.madinhdanh,freshLesson.magiaovienchinh]);
 const created=(await rows('V_CONG_DAY_BUOI_HOC')).filter(c=>c.mabuoi===freshLesson.madinhdanh);assert.equal(created.length,1);assert.equal(created[0].kycong,freshLesson.month);assert.equal(created[0].vaitro,'CHINH');
 assert.ok((await rows('DOI_SOAT_CONG_GIAO_VIEN')).some(c=>c.kycong===freshLesson.month&&c.magiaovien===freshLesson.magiaovienchinh));await db.exec('ROLLBACK');

 // A group receipt and per-work receipts have separate workflow scopes.
 let month=(await business()).monthly_payroll.find(m=>!m.dakhoa&&m.danhsachgiaovien.some(t=>t.sessions.length>1));assert.ok(month);
 const selected=month.danhsachgiaovien.find(t=>t.sessions.length>1),teacherId=selected.teacherId;
 let next=structuredClone(month),teacher=next.danhsachgiaovien.find(t=>t.teacherId===teacherId);teacher.payrollSent=true;teacher.reconcileStatus='DA_GUI';teacher.sessions.forEach(s=>{s.reconciliationSent=true;});await save(month,next);
 month=(await business()).monthly_payroll.find(m=>m.kycong===month.kycong);next=structuredClone(month);teacher=next.danhsachgiaovien.find(t=>t.teacherId===teacherId);
 teacher.payrollSent=false;const edited=teacher.sessions[0];edited.creditCoeff=-0.125;edited.hrPayNote='Manual credit correction';edited.reconciliationSent=false;
 await save(month,next);month=(await business()).monthly_payroll.find(m=>m.kycong===month.kycong);
 let currentTeacher=month.danhsachgiaovien.find(t=>t.teacherId===teacherId);assert.equal(currentTeacher.payrollSent,false);assert.equal(currentTeacher.reconcileStatus,'DA_GUI');
 assert.ok(currentTeacher.sessions.some(s=>s.reconciliationSent)&&currentTeacher.sessions.some(s=>!s.reconciliationSent));assert.equal(currentTeacher.sessions.find(s=>s.id===edited.id).creditCoeff,-0.125);
 next=structuredClone(month);teacher=next.danhsachgiaovien.find(t=>t.teacherId===teacherId);teacher.payrollSent=true;teacher.sessions.forEach(s=>{s.reconciliationSent=true;});await save(month,next);
 const account=(await db.query('SELECT u.tendangnhap FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung WHERE g.madinhdanh=$1',[teacherId])).rows[0];
 const teacherToken=(await db.query('SELECT public.vuihoc_login($1,$2) AS v',[account.tendangnhap,'246810'])).rows[0].v.token;
 let own=(await business(teacherToken)).monthly_payroll.find(m=>m.kycong===month.kycong);assert.equal(own.danhsachgiaovien.length,1);
 const requested=structuredClone(own),ownTeacher=requested.danhsachgiaovien[0],session=ownTeacher.sessions.find(s=>s.id===edited.id);
 const dispute={id:'TEST-PAYROLL-SOURCE-DISPUTE',teacherId,teacherName:ownTeacher.teacherName,staffRole:'GIAO_VIEN',subject:ownTeacher.subject,sessionId:session.id,sessionTime:session.dateStr+' ('+session.time+')',classCode:session.classCode,status:'CHO_DUYET',incidentType:'Review credited work',content:'Request review of actual credited amount',attachment:'https://example.test/payroll-source-evidence',adminNote:''};
 requested.danhsachgiaitrinh.unshift(dispute);ownTeacher.reconcileStatus='CO_GIAI_TRINH';session.dispute=dispute;await save(own,requested,teacherToken);
 assert.equal((await rows('LINK_MINH_CHUNG_CONG')).find(l=>l.magiaitrinh===dispute.id).lienket,dispute.attachment);
 month=(await business()).monthly_payroll.find(m=>m.kycong===month.kycong);next=structuredClone(month);next.dakhoa=true;next.danhsachgiaovien.forEach(t=>{t.payrollSent=true;t.reconcileStatus='DA_CHOT';});await assert.rejects(()=>save(month,next),/chờ duyệt/);
 const reviewed=structuredClone(month),d=reviewed.danhsachgiaitrinh.find(x=>x.id===dispute.id);d.status='DA_DUYET';d.adminNote='Reviewed with source-linked evidence';
 teacher=reviewed.danhsachgiaovien.find(t=>t.teacherId===teacherId);teacher.payrollSent=false;teacher.reconcileStatus='DA_XU_LY_GT';const reviewedSession=teacher.sessions.find(s=>s.id===session.id);reviewedSession.dispute=d;reviewedSession.creditCoeff=0.5;reviewedSession.hrPayNote='Approved explanation';reviewedSession.type='APPROVED_EXPLANATION';reviewedSession.reconciliationSent=false;await save(month,reviewed);
 month=(await business()).monthly_payroll.find(m=>m.kycong===month.kycong);assert.equal(month.danhsachgiaovien.find(t=>t.teacherId===teacherId).sessions.find(s=>s.id===session.id).creditCoeff,0.5);
 const stale=structuredClone(month),resent=structuredClone(month);resent.danhsachgiaovien.forEach(t=>{t.payrollSent=true;t.reconcileStatus='DA_GUI';t.sessions.forEach(s=>{s.reconciliationSent=true;});});await save(month,resent);
 await assert.rejects(()=>save(stale,{...stale,daguithongbao:!stale.daguithongbao}),/phiên khác/);
 month=(await business()).monthly_payroll.find(m=>m.kycong===month.kycong);const locked=structuredClone(month);locked.dakhoa=true;locked.thoigiankhoa=new Date().toISOString();locked.danhsachgiaovien.forEach(t=>{t.payrollSent=true;t.reconcileStatus='DA_CHOT';});await save(month,locked);
 month=(await business()).monthly_payroll.find(m=>m.kycong===month.kycong);assert.equal(month.dakhoa,true);assert.ok(month.danhsachgiaovien.every(t=>t.reconcileStatus==='DA_CHOT'));
 const lockedCredit=(await rows('V_CONG_DAY_BUOI_HOC')).find(c=>c.kycong===month.kycong);
 await assert.rejects(()=>db.query('UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=0,ghichu=\'Locked edit\' WHERE madinhdanh=$1',[lockedCredit.madinhdanh]),/đã khóa/);
 const unlocked=structuredClone(month);unlocked.dakhoa=false;unlocked.lydomokhoa='Verified source correction';unlocked.danhsachgiaovien.forEach(t=>{t.reconcileStatus='DA_GUI';});await save(month,unlocked);assert.equal((await business()).monthly_payroll.find(m=>m.kycong===month.kycong).dakhoa,false);
 assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec(file('supabase/reset_demo_dataset.sql'));await db.exec(file('supabase/reset_demo_dataset.sql'));
 assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(r=>r.trangthai==='OK'));
 console.log('PASS payroll source normalization: 13 to 11 work columns, period/group schemas retained, conflict rollback, repeat migration, exact work/period/lesson/receipt and report preservation, generated source-only work, main/cover roles, positive/zero/negative and manual/approved credits, real sends/partial invalidation/teacher dispute/evidence/review/resend/locks/stale writes, derived-period protection and repeated reset');
}
