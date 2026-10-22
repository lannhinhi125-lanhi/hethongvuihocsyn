import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyWorkEvidenceNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261129_normalize_work_evidence.sql'),diagnostic=file('supabase/diagnostics/work_evidence_legacy.sql');
 const business=async(t=token)=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[t])).rows[0].v;
 const save=(before,after,t=token)=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[t,JSON.stringify([{dataset:'monthly_payroll',before,after}])]);
 const rows=async table=>(await db.query(`SELECT to_jsonb(t) AS v FROM vuihoc."${table}" t ORDER BY to_jsonb(t)::text`)).rows.map(r=>r.v);
 const fixtureCredits=(await db.query(`SELECT c.madinhdanh,c.kycong,c.magiaovien,g.manguoidung,u.tendangnhap FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=c.magiaovien JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung JOIN vuihoc."BANG_CONG_THANG" p ON p.kycong=c.kycong WHERE NOT p.dakhoa AND u.trangthai='active' AND NOT EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" d WHERE d.macong=c.madinhdanh) ORDER BY c.kycong,c.magiaovien,c.madinhdanh LIMIT 4`)).rows;assert.equal(fixtureCredits.length,4);
 // Populated legacy fixtures: pending multiple links (with a positional gap), approved and rejected.
 const legacyLinks=[' https://example.test/evidence/first\r\n\r\nhttps://example.test/evidence/second ','https://example.test/evidence/approved',''];
 for(let i=0;i<3;i++)await db.query('INSERT INTO vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh,macong,noidung,loaisuco,lienketminhchung,trangthai,manguoigui) VALUES($1,$2,$3,$4,$5,$6,$7)',['TEST-LEGACY-EVIDENCE-'+i,fixtureCredits[i].madinhdanh,'Actual explanation '+i,'Explanation of recorded work',legacyLinks[i],['CHO_DUYET','DA_DUYET','TU_CHOI'][i],fixtureCredits[i].manguoidung]);
 const before=await rows('GIAI_TRINH_CONG_DAY'),linksBefore=await rows('LINK_MINH_CHUNG_CONG'),workBefore=await rows('CONG_DAY_BUOI_HOC'),periodBefore=await rows('BANG_CONG_THANG');
 assert.ok(before.length>=3&&linksBefore.length>=3);assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec('BEGIN; ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" DISABLE TRIGGER USER');
 await db.exec(`UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET lienketminhchung='https://example.test/missing-child' WHERE madinhdanh='TEST-LEGACY-EVIDENCE-0'`);
 assert.ok((await db.query(diagnostic)).rows.length);await assert.rejects(()=>db.exec(migration),/chưa khớp nguồn/);await db.exec('ROLLBACK');
 for(const invalid of ['https://example.test/space in link','https://example.test/duplicate\nhttps://example.test/duplicate']){
  await db.exec('BEGIN');await db.query('UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET lienketminhchung=$1 WHERE madinhdanh=$2',[invalid,'TEST-LEGACY-EVIDENCE-0']);
  await assert.rejects(()=>db.exec(migration),/không hợp lệ\/trùng/);await db.exec('ROLLBACK');
 }
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const tableNames=await tables();await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await tables(),tableNames);assert.deepEqual(await rows('LINK_MINH_CHUNG_CONG'),linksBefore);assert.deepEqual(await rows('CONG_DAY_BUOI_HOC'),workBefore);assert.deepEqual(await rows('BANG_CONG_THANG'),periodBefore);
 const after=await rows('GIAI_TRINH_CONG_DAY');
 for(const old of before){const {lienketminhchung,...kept}=old;assert.deepEqual(after.find(x=>x.madinhdanh===old.madinhdanh),kept);}
 const cols=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAI_TRINH_CONG_DAY' ORDER BY ordinal_position")).rows.map(r=>r.column_name);assert.equal(cols.length,12);assert.ok(!cols.includes('lienketminhchung'));
 const readExplanation=async credit=>(await db.query('SELECT vuihoc.giai_trinh_truy_van($1) AS v',[credit])).rows[0].v;
 assert.equal((await readExplanation(fixtureCredits[0].madinhdanh))[0].attachment,'https://example.test/evidence/first\nhttps://example.test/evidence/second');
 assert.equal((await readExplanation(fixtureCredits[1].madinhdanh))[0].attachment,legacyLinks[1]);
 const stale=(await business()).monthly_payroll.find(x=>x.kycong===fixtureCredits[0].kycong);
 await db.query('SELECT vuihoc.luu_link_minh_chung_cong($1,$2)',['TEST-LEGACY-EVIDENCE-0','https://example.test/source-edited']);
 assert.equal((await readExplanation(fixtureCredits[0].madinhdanh))[0].attachment,'https://example.test/source-edited');
 let refreshed=(await business()).monthly_payroll.find(x=>x.kycong===fixtureCredits[0].kycong);
 assert.equal(refreshed.danhsachgiaitrinh.find(d=>d.id==='TEST-LEGACY-EVIDENCE-0').attachment,'https://example.test/source-edited');
 assert.equal(refreshed.danhsachgiaovien.flatMap(t=>t.sessions).find(s=>s.dispute?.id==='TEST-LEGACY-EVIDENCE-0').dispute.attachment,'https://example.test/source-edited');
 await assert.rejects(()=>save(stale,{...stale,daguithongbao:!stale.daguithongbao}),/phiên khác/);
 for(const invalid of ['file.png','javascript:alert(1)','https://example.test/a\nhttps://example.test/a'])await assert.rejects(()=>db.query('SELECT vuihoc.luu_link_minh_chung_cong($1,$2)',['TEST-LEGACY-EVIDENCE-0',invalid]));
 assert.equal((await readExplanation(fixtureCredits[0].madinhdanh))[0].attachment,'https://example.test/source-edited');

 // Send the actual work through the admin RPC, then submit from its teacher account.
 const target=fixtureCredits[3];let adminMonth=(await business()).monthly_payroll.find(x=>x.kycong===target.kycong);
 const sent=structuredClone(adminMonth),sentTeacher=sent.danhsachgiaovien.find(x=>x.teacherId===target.magiaovien);
 sentTeacher.payrollSent=true;sentTeacher.reconcileStatus='DA_GUI';sentTeacher.sessions.forEach(s=>{s.reconciliationSent=true;});await save(adminMonth,sent);
 const teacherToken=(await db.query('SELECT public.vuihoc_login($1,$2) AS v',[target.tendangnhap,'246810'])).rows[0].v.token;
 const own=async()=>(await business(teacherToken)).monthly_payroll.find(x=>x.kycong===target.kycong);
 const request=(month,id,attachment)=>{
  const next=structuredClone(month),teacher=next.danhsachgiaovien.find(x=>x.teacherId===target.magiaovien),session=teacher.sessions.find(s=>!month.danhsachgiaitrinh.some(d=>d.sessionId===s.id&&d.status==='CHO_DUYET'));
  assert.ok(session);const d={id,teacherId:target.magiaovien,teacherName:teacher.teacherName,staffRole:'GIAO_VIEN',subject:teacher.subject,sessionId:session.id,sessionTime:session.dateStr+' ('+session.time+')',classCode:session.classCode,status:'CHO_DUYET',incidentType:'Review actual work',content:'Please review this credited lesson',attachment,adminNote:''};
  next.danhsachgiaitrinh.unshift(d);teacher.reconcileStatus='CO_GIAI_TRINH';session.dispute=d;return next;
 };
 let ownMonth=await own();const invalidRequest=request(ownMonth,'TEST-BAD-EVIDENCE','Bien_ban_xac_nhan.png');
 await assert.rejects(()=>save(ownMonth,invalidRequest,teacherToken),/HTTP\/HTTPS/);
 assert.ok(!(await rows('GIAI_TRINH_CONG_DAY')).some(x=>x.madinhdanh==='TEST-BAD-EVIDENCE'));
 const requestId='TEST-RPC-EVIDENCE',evidence='https://example.test/rpc/one\nhttps://example.test/rpc/two';
 ownMonth=await own();await save(ownMonth,request(ownMonth,requestId,evidence),teacherToken);
 let ownUpdated=await own();assert.equal(ownUpdated.danhsachgiaitrinh.find(d=>d.id===requestId).attachment,evidence);
 assert.ok(ownUpdated.danhsachgiaitrinh.every(d=>d.teacherId===target.magiaovien));
 assert.equal((await rows('LINK_MINH_CHUNG_CONG')).filter(x=>x.magiaitrinh===requestId).length,2);
 // Admin can review, but cannot edit the teacher's attachment through the review form.
 adminMonth=(await business()).monthly_payroll.find(x=>x.kycong===target.kycong);
 const illegal=structuredClone(adminMonth);illegal.danhsachgiaitrinh.find(d=>d.id===requestId).attachment='https://example.test/replaced-by-reviewer';await assert.rejects(()=>save(adminMonth,illegal),/Chỉ duyệt/);
 const reviewed=structuredClone(adminMonth),review=reviewed.danhsachgiaitrinh.find(d=>d.id===requestId);review.status='DA_DUYET';review.adminNote='Reviewed with original evidence';
 for(const t of reviewed.danhsachgiaovien)for(const s of t.sessions)if(s.dispute?.id===requestId)s.dispute=review;
 await save(adminMonth,reviewed);
 assert.equal((await rows('LINK_MINH_CHUNG_CONG')).filter(x=>x.magiaitrinh===requestId).length,2);
 ownMonth=await own();assert.equal(ownMonth.danhsachgiaitrinh.find(d=>d.id===requestId).status,'DA_DUYET');
 // Optional evidence remains empty, without an invented filename.
 await save(ownMonth,request(ownMonth,'TEST-EMPTY-EVIDENCE',''),teacherToken);
 assert.equal((await own()).danhsachgiaitrinh.find(d=>d.id==='TEST-EMPTY-EVIDENCE').attachment,'');
 assert.equal((await rows('LINK_MINH_CHUNG_CONG')).filter(x=>x.magiaitrinh==='TEST-EMPTY-EVIDENCE').length,0);

 // Direct source changes obey period locks; FK cascades still clean up on parent deletion.
 await db.exec('BEGIN');await db.query('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong=$1',[target.kycong]);
 for(const sql of ['UPDATE vuihoc."LINK_MINH_CHUNG_CONG" SET lienket=\'https://example.test/locked\' WHERE magiaitrinh=$1','DELETE FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh=$1','INSERT INTO vuihoc."LINK_MINH_CHUNG_CONG" VALUES($1,99,\'https://example.test/new\')']){
  await db.exec('SAVEPOINT locked_evidence');await assert.rejects(()=>db.query(sql,[requestId]),/đã khóa/);await db.exec('ROLLBACK TO locked_evidence');
 }await db.exec('ROLLBACK');
 await db.exec('BEGIN');await db.query('DELETE FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh=$1',[requestId]);assert.equal((await rows('LINK_MINH_CHUNG_CONG')).filter(x=>x.magiaitrinh===requestId).length,0);await db.exec('ROLLBACK');
 await db.exec('BEGIN');await assert.rejects(()=>db.exec(`INSERT INTO vuihoc."LINK_MINH_CHUNG_CONG" VALUES('MISSING-PARENT',1,'https://example.test/orphan')`));await db.exec('ROLLBACK');
 await db.exec('BEGIN');await assert.rejects(()=>db.query('INSERT INTO vuihoc."LINK_MINH_CHUNG_CONG" VALUES($1,99,$2)',[requestId,'https://example.test/rpc/one']));await db.exec('ROLLBACK');
 assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec(file('supabase/reset_demo_dataset.sql'));await db.exec(file('supabase/reset_demo_dataset.sql'));
 assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(x=>x.trangthai==='OK'));
 console.log('PASS work-evidence normalization: populated legacy records, 13 to 12 parent columns, three-column source retained, no new tables, mismatch/invalid/duplicate rollback, repeat migration, exact source/work preservation, queried list/session evidence, real teacher submit/empty/rollback/admin review, stale writes, locked source edits, FK cascade and repeated reset');
}
