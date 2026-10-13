import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.PGLITE_MODULE_PATH;
assert.ok(root,'Set PGLITE_MODULE_PATH to @electric-sql/pglite');
const {PGlite}=await import(pathToFileURL(resolve(root,'dist/index.js')));
const {pgcrypto}=await import(pathToFileURL(resolve(root,'dist/contrib/pgcrypto.js')));
const db=new PGlite({extensions:{pgcrypto}});
const migration=readFileSync('supabase/migrations/20261014_normalize_monthly_payroll.sql','utf8');
try {
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
 await db.exec(readFileSync('supabase/schema.sql','utf8').replace("to_jsonb(t)->>'ngaytao','') DESC","to_jsonb(t)->>''ngaytao'','''') DESC"));
 await db.exec(readFileSync('supabase/seed_test_data.sql','utf8'));
 await db.exec(readFileSync('supabase/upgrade_incident_payroll.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261013_teacher_live_payroll.sql','utf8'));
 await db.exec(readFileSync('supabase/setup_admin.sql','utf8').replace(/matkhau text:='[^']*'/,"matkhau text:='234567'"));
 const rpc=async(name,args)=>(await db.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result;
 const admin=await rpc('vuihoc_login',['admin.tong','234567']);
 const read=token=>rpc('vuihoc_business_data',[token||admin.token]);
 const save=(before,after,token)=>rpc('vuihoc_save_business',[token||admin.token,JSON.stringify([{dataset:'monthly_payroll',before,after}])]);
 const before=(await read()).monthly_payroll;
 const n=before.reduce((sum,m)=>sum+m.danhsachgiaovien.reduce((a,t)=>a+t.sessions.length,0),0);
 assert.ok(before[0].danhsachgiaovien.length>=12,'Include real and TEST teacher fixtures');
 assert.ok(before[0].danhsachgiaitrinh.length>=2,'Preserve both legacy disputes');
 const corrupt=structuredClone(before[0].danhsachgiaovien);corrupt[0].sessions[0].id='MISSING-LESSON';corrupt[0].sessions[0].lessonId='MISSING-LESSON';
 await db.query(`UPDATE vuihoc."BANG_CONG_THANG" SET danhsachgiaovien=$1::jsonb WHERE kycong=$2`,[JSON.stringify(corrupt),before[0].kycong]);
 await assert.rejects(db.exec(migration),/MISSING-LESSON/,'Incomplete source mapping must stop the migration');
 await db.exec('ROLLBACK');
 assert.equal((await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BANG_CONG_THANG' AND column_name IN ('danhsachgiaovien','danhsachgiaitrinh')`)).rows[0].n,2,'Failed migration preserves both original columns');
 await db.query(`UPDATE vuihoc."BANG_CONG_THANG" SET danhsachgiaovien=$1::jsonb WHERE kycong=$2`,[JSON.stringify(before[0].danhsachgiaovien),before[0].kycong]);
 await db.exec(migration);
 assert.equal((await db.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BANG_CONG_THANG' AND column_name IN ('danhsachgiaovien','danhsachgiaitrinh')`)).rows[0].n,0);
 const after=(await read()).monthly_payroll;
 assert.ok(after.reduce((sum,m)=>sum+m.danhsachgiaovien.reduce((a,t)=>a+t.sessions.length,0),0)>=n);
 for(const m of before)for(const t of m.danhsachgiaovien)for(const s of t.sessions){
  const row=after.find(x=>x.kycong===m.kycong).danhsachgiaovien.find(x=>x.teacherId===t.teacherId).sessions.find(x=>x.id===s.id);
  assert.equal(row.creditCoeff,s.creditCoeff,'Migration preserves every teacher coefficient');
 }
 await db.exec(migration);
 await db.exec(`INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,danhsachquyen,congtruycap)
  VALUES('NORMAL-OPS','Operator','VẬN HÀNH','Test',1,ARRAY['PH5_ALL'],'ADMIN'),
    ('NORMAL-READ','Reader','VẬN HÀNH','Test',1,ARRAY['PH7_READ'],'ADMIN');
  INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,trangthai,chucaiavatar,manhomquyen,matkhau)
  VALUES('NORMAL-OPS','Operator','normalized.ops','ops@example.com','','Nhân viên Vận hành Lớp','active','OP','NORMAL-OPS','234567'),
    ('NORMAL-READ','Reader','normalized.reader','reader@example.com','','Nhân viên Vận hành Lớp','active','RE','NORMAL-READ','234567');
  UPDATE vuihoc."NGUOI_DUNG" SET matkhau='234567' WHERE madinhdanh=(SELECT manguoidung FROM vuihoc."GIAO_VIEN" WHERE madinhdanh='GV-001');`);
 const operator=await rpc('vuihoc_login',['normalized.ops','234567']);
 const viewer=await rpc('vuihoc_login',['normalized.reader','234567']);
 const username=(await db.query(`SELECT u.tendangnhap FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."GIAO_VIEN" g ON g.manguoidung=u.madinhdanh WHERE g.madinhdanh='GV-001'`)).rows[0].tendangnhap;
 const teacher=await rpc('vuihoc_login',[username,'234567']);
 const work=async()=> (await read()).monthly_payroll.find(m=>m.kycong==='2026-11');
 const staff=m=>m.danhsachgiaovien.find(t=>t.teacherId==='GV-001');
 const session=(m,id,gv='GV-001')=>m.danhsachgiaovien.find(t=>t.teacherId===gv)?.sessions.find(s=>s.id===id);
 const operations=changes=>rpc('vuihoc_save_business',[operator.token,JSON.stringify(changes)]);
 for(const [id,date,cover] of [['NORMAL-CANCELED','2026-11-03',null],['NORMAL-COVER','2026-11-05','GV-002']]){
  await operations([
   {dataset:'dated_lessons',before:null,after:{madinhdanh:id,malop:'CLS-001',ngayhoc:date,makhunggio:'SLOT-1',batdau:date+'T18:00:00+07:00',ketthuc:date+'T19:30:00+07:00',magiaovienchinh:'GV-001',magiaoviendaythay:cover,trangthai:cover?'CHUA_DIEN_RA':'HUY'}},
   {dataset:'lesson_incidents',before:null,after:{madinhdanh:'INC-'+id,mabuoi:id,manhomsuco:'GRP-TCH',masuco:'INC-TCH-02',tensuco:'Absent teacher',noidung:'Test',trangthai:'DANG_XU_LY'}}
  ]);
 }
 let month=await work();
 assert.equal(session(month,'NORMAL-CANCELED').creditCoeff,0);
 assert.equal(session(month,'NORMAL-CANCELED').type,'EMERGENCY');
 assert.equal(session(month,'NORMAL-COVER').handledBy,'NORMAL-OPS');
 assert.equal(session(month,'NORMAL-COVER','GV-002'),undefined,'Substitute is paid only after completion');
 await db.exec(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc=batdau,ketthucluc=ketthuc,trangthai='HOAN_THANH' WHERE madinhdanh='NORMAL-COVER';
  UPDATE vuihoc."DANH_MUC_SU_CO" SET danhsachsuco=(SELECT jsonb_agg(CASE WHEN x->>'code'='INC-TCH-02' THEN x||'{"creditCoeff":-1}'::jsonb ELSE x END) FROM jsonb_array_elements(danhsachsuco) x) WHERE madinhdanh='GRP-TCH';`);
 month=await work();
 assert.equal(session(month,'NORMAL-CANCELED').creditCoeff,-1);
 assert.equal(session(month,'NORMAL-COVER').creditCoeff,-1);
 assert.equal(session(month,'NORMAL-COVER','GV-002').creditCoeff,1);
 assert.equal(session(month,'NORMAL-COVER','GV-002').type,'COVER');
 assert.equal(staff(month).sessions.reduce((sum,s)=>sum+s.creditCoeff,0),-2);
 const adminIncident=(await read()).lesson_incidents.find(i=>i.madinhdanh==='INC-NORMAL-COVER');
 await rpc('vuihoc_save_business',[admin.token,JSON.stringify([{dataset:'lesson_incidents',before:adminIncident,after:{...adminIncident,noidung:'Admin handled this incident'}}])]);
 month=await work();assert.equal(session(month,'NORMAL-COVER').handledBy,admin.actor.madinhdanh);
 const ownMonth=async()=> (await read(teacher.token)).monthly_payroll.find(m=>m.kycong==='2026-11');
 let own=await ownMonth();
 assert.equal(own.danhsachgiaovien.length,1);
 assert.equal(staff(own).payrollSent,false,'Teacher sees completed/canceled work before reconciliation');
 const withDispute=(m,id)=>{
  const v=structuredClone(m),t=staff(v),s=t.sessions.find(s=>s.id==='NORMAL-CANCELED');
  const d={id,teacherId:'GV-001',teacherName:t.teacherName,staffRole:'GIAO_VIEN',subject:t.subject,sessionId:s.id,sessionTime:s.dateStr+' ('+s.time+')',classCode:s.classCode,status:'CHO_DUYET',incidentType:'Review absence',content:'Please review',attachment:'https://example.com/evidence',adminNote:''};
  v.danhsachgiaitrinh.unshift(d);t.reconcileStatus='CO_GIAI_TRINH';s.dispute=d;return v;
 };
 await assert.rejects(save(own,withDispute(own,'NORMAL-DSP'),teacher.token),/không thuộc|chưa được|được gửi/);
 const sent=structuredClone(month),t=staff(sent);t.payrollSent=true;t.reconcileStatus='DA_GUI';t.sessions.forEach(s=>{s.reconciliationSent=true;});
 await assert.rejects(save(month,sent,viewer.token),/Không có quyền/);
 await save(month,sent);
 own=await ownMonth();
 assert.equal(staff(own).payrollSent,true);
 await save(own,withDispute(own,'NORMAL-DSP'),teacher.token);
 assert.equal((await db.query(`SELECT noidung,lienketminhchung,manguoigui FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh='NORMAL-DSP'`)).rows[0].lienketminhchung,'https://example.com/evidence');
 month=await work();
 assert.equal(month.danhsachgiaitrinh[0].status,'CHO_DUYET');
 const reviewed=structuredClone(month),d=reviewed.danhsachgiaitrinh.find(d=>d.id==='NORMAL-DSP');
 d.status='DA_DUYET';d.adminNote='Accepted';
 const rt=staff(reviewed),rs=rt.sessions.find(s=>s.id==='NORMAL-CANCELED');
 rt.payrollSent=false;rt.reconcileStatus='DA_XU_LY_GT';rs.dispute=d;rs.creditCoeff=0.5;rs.hrPayNote='Accepted';rs.type='APPROVED_EXPLANATION';rs.statusText='Đã duyệt GT';rs.reconciliationSent=false;
 await save(month,reviewed);
 month=await work();
 assert.equal(session(month,'NORMAL-CANCELED').creditCoeff,0.5);
 assert.equal(staff(month).approvedExplanations,1);
 assert.equal((await db.query(`SELECT manguoiduyet FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh='NORMAL-DSP'`)).rows[0].manguoiduyet,admin.actor.madinhdanh);
 await assert.rejects(save(reviewed,reviewed),/phiên khác/,'Derived values are refreshed after saves');
 let changed=structuredClone(month);session(changed,'NORMAL-CANCELED').creditCoeff=0.25;session(changed,'NORMAL-CANCELED').hrPayNote='Manual adjustment';
 await save(month,changed);
 const inc=(await read(operator.token)).lesson_incidents.find(i=>i.madinhdanh==='INC-NORMAL-CANCELED');
 await operations([{dataset:'lesson_incidents',before:inc,after:{...inc,noidung:'Reviewed note'}}]);
 month=await work();
 assert.equal(session(month,'NORMAL-CANCELED').creditCoeff,0.25,'Incident note saves preserve payroll overrides');
 const stale=structuredClone(month),fresh=structuredClone(month);session(fresh,'NORMAL-CANCELED').creditCoeff=0.75;session(fresh,'NORMAL-CANCELED').hrPayNote='New adjustment';
 await save(month,fresh);await assert.rejects(save(stale,changed),/phiên khác/);
 const cls=(await db.query(`SELECT danhsachmahocsinh FROM vuihoc."LOP_HOC" WHERE madinhdanh='CLS-001'`)).rows[0];
 const complete={dateStr:'2026-12-01 (18:00 - 19:30)',status:'Đã hoàn thành',sessionNum:'NORMAL-COMMENT',feedback:{}};
 await db.query(`UPDATE vuihoc."LOP_HOC" SET chitietcahoc=jsonb_set(chitietcahoc,'{NORMAL-COMMENT}',$1::jsonb) WHERE madinhdanh='CLS-001'`,[JSON.stringify(complete)]);
 assert.equal((await db.query(`SELECT count(*)::int n FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE b.malop='CLS-001' AND b.ngayhoc='2026-12-01'`)).rows[0].n,0,'No work before all student comments');
 complete.feedback=Object.fromEntries(cls.danhsachmahocsinh.map(id=>[id,'Completed student review']));
 await db.query(`UPDATE vuihoc."LOP_HOC" SET chitietcahoc=jsonb_set(chitietcahoc,'{NORMAL-COMMENT}',$1::jsonb) WHERE madinhdanh='CLS-001'`,[JSON.stringify(complete)]);
 assert.equal((await db.query(`SELECT c.hesocong FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi WHERE b.malop='CLS-001' AND b.ngayhoc='2026-12-01'`)).rows[0].hesocong,'1.000','All comments create standard work');
 assert.ok((await read(teacher.token)).monthly_payroll.find(m=>m.kycong==='2026-12').danhsachgiaovien[0].sessions.length>0);
 month=await work();
 const lock=structuredClone(month);lock.dakhoa=true;lock.thoigiankhoa=new Date().toISOString();lock.danhsachgiaovien.forEach(t=>{t.payrollSent=true;t.reconcileStatus='DA_CHOT';});
 await save(month,lock);
 const locked=await work();assert.equal(locked.dakhoa,true);
 await assert.rejects(operations([{dataset:'lesson_incidents',before:(await read(operator.token)).lesson_incidents.find(i=>i.madinhdanh===inc.madinhdanh),after:{...inc,noidung:'Locked edit'}}]),/đã khóa|phiên khác/);
 const unlock=structuredClone(locked);unlock.dakhoa=false;unlock.lydomokhoa='Correct payroll';unlock.danhsachgiaovien.forEach(t=>{t.reconcileStatus='DA_GUI';});
 await save(locked,unlock);assert.equal((await work()).dakhoa,false);
 await db.exec(`UPDATE vuihoc."GIAO_VIEN" SET hoten='Updated source name' WHERE madinhdanh='GV-001'`);
 assert.equal(staff(await work()).teacherName,'Updated source name','Names are queried from source, never monthly snapshots');
 console.log('PASS: preservation, column deletion, rerun, canceled/negative work, substitute work, catalog sync, actor identity, own-only live read, send permissions, disputes, review, overrides, concurrency, locks and source queries.');
}catch(error){console.error(error.message,error.detail||'',error.where||'',error.query?.slice(Math.max(0,Number(error.position)-100),Number(error.position)+100));process.exitCode=1;}
finally{await db.close();}
