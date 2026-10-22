import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifyIncidentNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261128_normalize_incident_names.sql');
 const diagnostic=file('supabase/diagnostics/incident_name_legacy.sql');
 const business=async()=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[token])).rows[0].v;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const physical=async table=>(await db.query(`SELECT to_jsonb(t) AS v FROM vuihoc."${table}" t ORDER BY to_jsonb(t)::text`)).rows.map(r=>r.v);
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const before=await physical('SU_CO_BUOI_HOC'),lessons=await physical('BUOI_HOC'),work=await physical('CONG_DAY_BUOI_HOC'),periods=await physical('BANG_CONG_THANG'),catalog=await physical('LOAI_SU_CO'),tableNames=await tables();
 assert.ok(before.length&&work.length);assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec('BEGIN; ALTER TABLE vuihoc."SU_CO_BUOI_HOC" DISABLE TRIGGER USER');
 await db.query('UPDATE vuihoc."SU_CO_BUOI_HOC" SET tensuco=$2 WHERE madinhdanh=$1',[before[0].madinhdanh,'Unmatched historical label']);
 assert.ok((await db.query(diagnostic)).rows.length);
 await assert.rejects(()=>db.exec(migration),/chưa khớp danh mục/);await db.exec('ROLLBACK');
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await tables(),tableNames);
 for(const [name,old] of [['BUOI_HOC',lessons],['CONG_DAY_BUOI_HOC',work],['BANG_CONG_THANG',periods],['LOAI_SU_CO',catalog]])assert.deepEqual(await physical(name),old);
 const after=await physical('SU_CO_BUOI_HOC');
 for(const old of before){const current=after.find(x=>x.madinhdanh===old.madinhdanh);const {tensuco,...kept}=old;assert.deepEqual(current,kept);}
 const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='SU_CO_BUOI_HOC' ORDER BY ordinal_position")).rows.map(r=>r.column_name);
 assert.equal(columns.length,16);assert.ok(!columns.includes('tensuco'));
 const projected=await physical('V_SU_CO_BUOI_HOC');for(const old of before)assert.deepEqual(projected.find(x=>x.madinhdanh===old.madinhdanh),old);
 const data=await business(),incident=data.lesson_incidents.find(x=>!x.dotamdunglop);assert.ok(incident?.tensuco);
 await save([{dataset:'lesson_incidents',before:{madinhdanh:incident.madinhdanh,tensuco:incident.tensuco,noidung:incident.noidung},after:{madinhdanh:incident.madinhdanh,noidung:'Normalized incident edit'}}]);
 assert.equal((await business()).lesson_incidents.find(x=>x.madinhdanh===incident.madinhdanh).noidung,'Normalized incident edit');
 await assert.rejects(()=>save([{dataset:'lesson_incidents',before:{madinhdanh:incident.madinhdanh},after:{madinhdanh:incident.madinhdanh,tensuco:'Independent label'}}]),/chỉ được truy vấn/);

 // Real catalog editing refreshes API/payroll labels without rewriting incident facts.
 const changeName='Renamed incident from authoritative catalog';
 const group=(await business()).incident_categories.find(x=>x.madinhdanh===incident.manhomsuco);
 const renamed=group.danhsachsuco.map(x=>x.code===incident.masuco?{...x,name:changeName}:x);
 const incidentsBeforeRename=await physical('SU_CO_BUOI_HOC'),workBeforeRename=await physical('CONG_DAY_BUOI_HOC');
 await save([{dataset:'incident_categories',before:{madinhdanh:group.madinhdanh,danhsachsuco:group.danhsachsuco},after:{madinhdanh:group.madinhdanh,danhsachsuco:renamed}}]);
 assert.deepEqual(await physical('SU_CO_BUOI_HOC'),incidentsBeforeRename);assert.deepEqual(await physical('CONG_DAY_BUOI_HOC'),workBeforeRename);
 assert.equal((await business()).lesson_incidents.find(x=>x.madinhdanh===incident.madinhdanh).tensuco,changeName);
 const credited=(await db.query(`SELECT c.kycong,c.magiaovien FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=$1`,[incident.mabuoi])).rows;
 for(const credit of credited){
  const sessions=(await db.query('SELECT vuihoc.ca_cong_truy_van($1,$2) AS v',[credit.kycong,credit.magiaovien])).rows[0].v;
  const linked=sessions.find(x=>x.incidentId===incident.madinhdanh&&x.type==='EMERGENCY');
  if(linked)assert.equal(linked.statusText,changeName);
 }
 // A locked period retains applied credit even if the current catalog default changes.
 const month=(await db.query('SELECT to_char(ngayhoc,\'YYYY-MM\') AS month FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',[incident.mabuoi])).rows[0].month;
 await db.exec('BEGIN');
 await db.query('UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong=$1',[month]);
 const lockedWork=(await physical('CONG_DAY_BUOI_HOC')).filter(x=>x.kycong===month);
 const oldApplied=(await physical('SU_CO_BUOI_HOC')).find(x=>x.madinhdanh===incident.madinhdanh);
 const currentGroup=(await business()).incident_categories.find(x=>x.madinhdanh===group.madinhdanh);
 const currentItem=currentGroup.danhsachsuco.find(x=>x.code===incident.masuco);
 await save([{dataset:'incident_categories',before:{madinhdanh:group.madinhdanh,danhsachsuco:currentGroup.danhsachsuco},after:{madinhdanh:group.madinhdanh,danhsachsuco:currentGroup.danhsachsuco.map(x=>x.code===incident.masuco?{...x,name:'New name with locked work',creditCoeff:Number(currentItem.creditCoeff)+0.125}:x)}}]);
 assert.deepEqual((await physical('CONG_DAY_BUOI_HOC')).filter(x=>x.kycong===month),lockedWork);
 assert.deepEqual((await physical('SU_CO_BUOI_HOC')).find(x=>x.madinhdanh===incident.madinhdanh),oldApplied);
 assert.equal((await business()).lesson_incidents.find(x=>x.madinhdanh===incident.madinhdanh).tensuco,'New name with locked work');
 await db.exec('ROLLBACK');

 // Direct admin CRUD requires only FKs and independent incident facts.
 const fresh={madinhdanh:'TEST-INCIDENT-3NF',mabuoi:incident.mabuoi,manhomsuco:incident.manhomsuco,masuco:incident.masuco,noidung:'Created without copied name',trangthai:'DANG_XU_LY'};
 await db.exec('BEGIN');
 await save([{dataset:'lesson_incidents',before:null,after:fresh}]);
 assert.equal((await business()).lesson_incidents.find(x=>x.madinhdanh===fresh.madinhdanh).tensuco,changeName);
 await save([{dataset:'lesson_incidents',before:{madinhdanh:fresh.madinhdanh},after:null}]);
 assert.ok(!(await business()).lesson_incidents.some(x=>x.madinhdanh===fresh.madinhdanh));await db.exec('ROLLBACK');
 await db.exec('BEGIN');
 await assert.rejects(()=>db.query('INSERT INTO vuihoc."SU_CO_BUOI_HOC"(mabuoi,manhomsuco,masuco) VALUES($1,$2,$3)',[incident.mabuoi,incident.manhomsuco,'MISSING-TYPE']));await db.exec('ROLLBACK');

 // The teacher-report RPC still resolves actual lesson clocks and writes no name.
 const reportLesson=(await db.query(`SELECT b.madinhdanh,b.ngayhoc::text,l.malophoc,vuihoc.khoang_gio_hien_thi(b.batdau,b.ketthuc) AS hours,coalesce(b.magiaoviendaythay,b.magiaovienchinh) AS teacher
 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop WHERE l.magiaovien IS NOT NULL AND coalesce(b.magiaoviendaythay,b.magiaovienchinh) IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" s WHERE s.mabuoi=b.madinhdanh)
 AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa) LIMIT 1`)).rows[0];assert.ok(reportLesson);
 const loginName=(await db.query('SELECT u.tendangnhap FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung WHERE g.madinhdanh=$1',[reportLesson.teacher])).rows[0].tendangnhap;
 const teacherToken=(await db.query('SELECT public.vuihoc_login($1,$2) AS v',[loginName,'246810'])).rows[0].v.token;
 await db.exec('BEGIN');
 const report=(await db.query('SELECT public.vuihoc_report_lesson_incident($1,$2,$3,$4,$5,$6) AS v',[teacherToken,reportLesson.malophoc,reportLesson.ngayhoc,reportLesson.hours,incident.masuco,'Teacher incident after normalization'])).rows[0].v;
 const teacherData=(await db.query('SELECT public.vuihoc_business_data($1) AS v',[teacherToken])).rows[0].v;
 assert.equal(teacherData.lesson_incidents.find(x=>x.madinhdanh===report.id).tensuco,changeName);await db.exec('ROLLBACK');
 // Codes are scoped by group. The legacy code-only endpoint must never choose randomly.
 const otherGroup=(await db.query('SELECT madinhdanh FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh<>$1 AND NOT EXISTS(SELECT 1 FROM vuihoc."LOAI_SU_CO" t WHERE t.manhom="DANH_MUC_SU_CO".madinhdanh AND t.ma=$2) LIMIT 1',[incident.manhomsuco,incident.masuco])).rows[0];assert.ok(otherGroup);
 await db.exec('BEGIN');
 await db.query(`INSERT INTO vuihoc."LOAI_SU_CO" SELECT (jsonb_populate_record(NULL::vuihoc."LOAI_SU_CO",to_jsonb(t)||jsonb_build_object('manhom',$1::text,'madinhdanh','TEST-SCOPED-TYPE','ten','Same code in another group'))).* FROM vuihoc."LOAI_SU_CO" t WHERE (t.manhom,t.ma)=($2,$3)`,[otherGroup.madinhdanh,incident.manhomsuco,incident.masuco]);
 await save([{dataset:'lesson_incidents',before:null,after:{...fresh,manhomsuco:otherGroup.madinhdanh}}]);
 assert.equal((await business()).lesson_incidents.find(x=>x.madinhdanh===fresh.madinhdanh).tensuco,'Same code in another group');
 await db.exec('SAVEPOINT ambiguous_report');
 await assert.rejects(()=>db.query('SELECT public.vuihoc_report_lesson_incident($1,$2,$3,$4,$5,$6)',[teacherToken,reportLesson.malophoc,reportLesson.ngayhoc,reportLesson.hours,incident.masuco,'Ambiguous group']),/thuộc nhiều nhóm/);
 await db.exec('ROLLBACK TO ambiguous_report; ROLLBACK');

 // Pause/resume and scheduled holidays keep their existing payroll distinction.
 const pauseClass=(await db.query(`SELECT l.* FROM vuihoc."LOP_HOC" l WHERE l.trangthai='DANG_HOC' AND NOT l.tamdunglich AND l.magiaovien IS NOT NULL
 AND EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=l.madinhdanh AND b.ngayhoc>current_date)
 AND NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.mabuoi=b.madinhdanh WHERE b.malop=l.madinhdanh AND b.ngayhoc>current_date) LIMIT 1`)).rows[0];assert.ok(pauseClass);
 const reasons=(await db.query('SELECT * FROM vuihoc."LOAI_SU_CO" WHERE chopheptamdung AND danghoatdong')).rows;
 const leave=reasons.find(x=>!x.nghitheolich&&x.hesocong!=null),holiday=reasons.find(x=>x.nghitheolich);assert.ok(leave&&holiday);
 await db.exec('BEGIN');
 await db.query('UPDATE vuihoc."LOP_HOC" SET tamdunglich=true,manhomtamdung=$2,lydotamdung=$3 WHERE madinhdanh=$1',[pauseClass.madinhdanh,leave.manhom,leave.madinhdanh]);
 const paused=(await db.query('SELECT s.* FROM vuihoc."V_SU_CO_BUOI_HOC" s JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=s.mabuoi WHERE b.malop=$1 AND s.dotamdunglop',[pauseClass.madinhdanh])).rows;
 assert.ok(paused.length);assert.ok(paused.every(x=>x.tensuco===leave.ten));
 await db.query('UPDATE vuihoc."LOP_HOC" SET ghichutamdung=$2 WHERE madinhdanh=$1',[pauseClass.madinhdanh,'Updated automatic pause note']);
 await db.query('UPDATE vuihoc."LOP_HOC" SET tamdunglich=false WHERE madinhdanh=$1',[pauseClass.madinhdanh]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh=ANY($1::text[])',[paused.map(x=>x.madinhdanh)])).rows[0].n,0);
 await db.query('UPDATE vuihoc."LOP_HOC" SET tamdunglich=true,manhomtamdung=$2,lydotamdung=$3 WHERE madinhdanh=$1',[pauseClass.madinhdanh,holiday.manhom,holiday.madinhdanh]);
 assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc."SU_CO_BUOI_HOC" s JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=s.mabuoi WHERE b.malop=$1 AND b.ngayhoc>current_date',[pauseClass.madinhdanh])).rows[0].n,0);
 await db.exec('ROLLBACK');
 assert.deepEqual((await db.query(diagnostic)).rows,[]);
 await db.exec(file('supabase/reset_demo_dataset.sql'));await db.exec(file('supabase/reset_demo_dataset.sql'));
 assert.ok((await physical('SU_CO_BUOI_HOC')).length);
 assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(x=>x.trangthai==='OK'));
 console.log('PASS incident normalization: 17 to 16 columns, scoped catalog JOIN names, no new tables, conflict rollback and repeat migration, source/work preservation, real CRUD/catalog rename/teacher reporting, locked applied credits, pause/resume/holidays, diagnostics and repeated compatible reset');
}
