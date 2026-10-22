import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export async function verifyTimeSlotNormalization(db,token){
 const file=p=>readFileSync(p,'utf8');
 const migration=file('supabase/migrations/20261125_normalize_time_slots.sql');
 const business=async()=>(await db.query('SELECT public.vuihoc_business_data($1) AS v',[token])).rows[0].v;
 const save=changes=>db.query('SELECT public.vuihoc_save_business($1,$2::jsonb)',[token,JSON.stringify(changes)]);
 const physical=async name=>(await db.query(`SELECT to_jsonb(t) AS row FROM vuihoc."${name}" t ORDER BY to_jsonb(t)::text`)).rows;
 const data=await business(),slots=await physical('KHUNG_GIO');
 const lessons=await physical('BUOI_HOC'),work=await physical('CONG_DAY_BUOI_HOC'),schedule=await physical('LICH_LOP'),availability=await physical('LICH_RANH_DINH_KY');
 assert.ok(lessons.length&&work.length&&schedule.length&&availability.length);
 const tables=async()=>(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='vuihoc' ORDER BY tablename")).rows;
 const beforeTables=await tables();
 assert.deepEqual((await db.query(file('supabase/diagnostics/time_slot_legacy.sql'))).rows,[]);
 await db.exec('BEGIN');await db.query('UPDATE vuihoc."KHUNG_GIO" SET sophut=sophut+1 WHERE madinhdanh=$1',[data.time_slots[0].madinhdanh]);
 await assert.rejects(()=>db.exec(migration),/chưa khớp/);await db.exec('ROLLBACK');
 await db.exec('BEGIN');await db.query(`UPDATE vuihoc."KHUNG_GIO" SET khoanggio='invalid' WHERE madinhdanh=$1`,[data.time_slots[0].madinhdanh]);
 assert.ok((await db.query(file('supabase/diagnostics/time_slot_legacy.sql'))).rows.length);
 await assert.rejects(()=>db.exec(migration),/chưa khớp/);await db.exec('ROLLBACK');
 await db.exec('BEGIN');
 await db.exec(`INSERT INTO vuihoc."KHUNG_GIO" SELECT (jsonb_populate_record(NULL::vuihoc."KHUNG_GIO",to_jsonb(k)||jsonb_build_object('madinhdanh','DUPLICATE-SLOT','makhunggio','DUPLICATE-SLOT'))).* FROM vuihoc."KHUNG_GIO" k LIMIT 1`);
 await assert.rejects(()=>db.exec(migration),/cùng khoảng giờ/);await db.exec('ROLLBACK');
 await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await tables(),beforeTables);
 assert.deepEqual(await physical('BUOI_HOC'),lessons);assert.deepEqual(await physical('CONG_DAY_BUOI_HOC'),work);assert.deepEqual(await physical('LICH_LOP'),schedule);assert.deepEqual(await physical('LICH_RANH_DINH_KY'),availability);
 const after=await business();
 for(const old of data.time_slots){const now=after.time_slots.find(s=>s.madinhdanh===old.madinhdanh);for(const k of Object.keys(old))assert.deepEqual(now[k],old[k]);}
 assert.deepEqual(after.classes,data.classes);assert.deepEqual(after.teachers,data.teachers);assert.deepEqual(after.students,data.students);
 const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='KHUNG_GIO'")).rows.map(x=>x.column_name);
 assert.ok(!columns.includes('khoanggio')&&!columns.includes('sophut'));assert.ok(columns.includes('giobatdau')&&columns.includes('gioketthuc'));
 const oldFacts=slots.map(({row})=>({...row,giobatdau:row.khoanggio.split('-')[0].trim()+':00',gioketthuc:row.khoanggio.split('-')[1].trim()+':00'})).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['sophut','khoanggio'].includes(k))));
 const newFacts=(await physical('KHUNG_GIO')).map(x=>x.row);
 for(const old of oldFacts)assert.deepEqual(newFacts.find(x=>x.madinhdanh===old.madinhdanh),old);
 // Create/edit/delete through the real master-data RPC, with typed clocks only.
 const fresh={madinhdanh:'TEST-NORMAL-SLOT',makhunggio:'TEST-NORMAL-SLOT',tenkhunggio:'New clock',giobatdau:'22:10:00',gioketthuc:'23:10:00',danghoatdong:true};
 await save([{dataset:'time_slots',before:null,after:fresh}]);
 const read=async id=>(await business()).time_slots.find(s=>s.madinhdanh===id);
 assert.equal((await read(fresh.madinhdanh)).sophut,60);
 const change=patch=>save([{dataset:'time_slots',before:{madinhdanh:fresh.madinhdanh},after:{madinhdanh:fresh.madinhdanh,...patch}}]);
 await change({giobatdau:'23:30:00',gioketthuc:'00:15:00'});assert.equal((await read(fresh.madinhdanh)).sophut,45);
 for(const patch of [{gioketthuc:'23:30:00'},{giobatdau:'24:00:00'},{giobatdau:'23:30:01'},{giobatdau:null}])await assert.rejects(()=>change(patch));
 for(const patch of [{sophut:999},{khoanggio:'00:00 - 01:00'}])await assert.rejects(()=>change(patch),/dữ liệu truy vấn/);
 await assert.rejects(()=>change({giobatdau:after.time_slots[0].giobatdau,gioketthuc:after.time_slots[0].gioketthuc}),/khung_gio_khoang_unique/);
 await save([{dataset:'time_slots',before:{madinhdanh:fresh.madinhdanh},after:null}]);
 // Change a referenced standard window. Actual dated lessons/work remain exact.
 const future=(await db.query(`SELECT b.*,l.malophoc FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop WHERE b.ngayhoc>current_date AND b.vaolopluc IS NULL AND l.magiaovien IS NOT NULL AND l.trangthai='DANG_HOC' AND EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" past ON past.madinhdanh=c.mabuoi WHERE past.makhunggio=b.makhunggio) ORDER BY b.ngayhoc LIMIT 1`)).rows[0];
 assert.ok(future);
 const source=after.time_slots.find(s=>s.madinhdanh===future.makhunggio);
 const payrollBefore=(await db.query(`SELECT DISTINCT c.kycong,c.magiaovien,vuihoc.ca_cong_truy_van(c.kycong,c.magiaovien) AS rows FROM vuihoc."CONG_DAY_BUOI_HOC" c ORDER BY 1,2`)).rows;
 const newStart=(await db.query("SELECT ($1::time+interval '5 minutes')::text AS t",[source.giobatdau])).rows[0].t;
 await save([{dataset:'time_slots',before:{madinhdanh:source.madinhdanh,giobatdau:source.giobatdau,khoanggio:source.khoanggio,sophut:source.sophut},after:{madinhdanh:source.madinhdanh,giobatdau:newStart}}]);
 const changed=await read(source.madinhdanh);assert.equal(changed.sophut,source.sophut-5);
 const portal=(await db.query('SELECT public.vuihoc_teacher_data($1) AS v',[token])).rows[0].v;
 assert.equal(portal.time_slots.find(s=>s.madinhdanh===source.madinhdanh).khoanggio,changed.khoanggio);
 assert.deepEqual(await physical('BUOI_HOC'),lessons);assert.deepEqual(await physical('CONG_DAY_BUOI_HOC'),work);
 const payrollAfter=(await db.query(`SELECT DISTINCT c.kycong,c.magiaovien,vuihoc.ca_cong_truy_van(c.kycong,c.magiaovien) AS rows FROM vuihoc."CONG_DAY_BUOI_HOC" c ORDER BY 1,2`)).rows;
 assert.deepEqual(payrollAfter,payrollBefore,'payroll must use actual lesson time, not the edited catalog');
 const planned=(await db.query('SELECT vuihoc.nhan_lich(thutrongtuan,makhunggio) AS label FROM vuihoc."LICH_LOP" WHERE makhunggio=$1 LIMIT 1',[source.madinhdanh])).rows[0].label;
 assert.ok(planned.includes(changed.khoanggio));
 const current=await business();
 for(const teacher of current.teachers)assert.deepEqual(teacher.cahochoanthanh,data.teachers.find(t=>t.madinhdanh===teacher.madinhdanh).cahochoanthanh,'successful lesson history must keep actual times');
 await assert.rejects(()=>save([{dataset:'time_slots',before:{madinhdanh:source.madinhdanh},after:null}]),/foreign key/);
 // Incident lookup follows actual times after a catalog edit, and refuses the
 // new template time when the same slot/date already has a different actual time.
 const incident=current.incident_categories.flatMap(c=>c.danhsachsuco).find(x=>x.status&&x.code);
 assert.ok(incident);
 const report=range=>db.query('SELECT public.vuihoc_report_lesson_incident($1,$2,$3::date,$4,$5,$6) AS v',[token,future.malophoc,future.ngayhoc,range,incident.code,'Clock source check']);
 await assert.rejects(()=>report(changed.khoanggio),/giờ thực tế/);
 await db.exec('BEGIN');const result=(await report(source.khoanggio)).rows[0].v;assert.equal(result.lessonId,future.madinhdanh);await db.exec('ROLLBACK');
 // Generate a replacement only inside a rolled-back fixture transaction: new
 // lessons use the edited standard; existing dated lessons are never rewritten.
 await db.exec('BEGIN');await db.query('DELETE FROM vuihoc."CHI_TIET_CA_LOP" WHERE mabuoi=$1',[future.madinhdanh]);await db.query('DELETE FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1',[future.madinhdanh]);
 await db.query('SELECT vuihoc.dong_bo_ca_theo_lich($1::date,$1::date)',[future.ngayhoc]);
 const regenerated=(await db.query('SELECT batdau::text AS starts,ketthuc::text AS ends FROM vuihoc."BUOI_HOC" WHERE malop=$1 AND ngayhoc=$2::date AND makhunggio=$3',[future.malop,future.ngayhoc,future.makhunggio])).rows[0];
 assert.equal(regenerated.starts,newStart);assert.equal(regenerated.ends,source.gioketthuc);await db.exec('ROLLBACK');
 assert.deepEqual(await physical('BUOI_HOC'),lessons);
 await save([{dataset:'time_slots',before:{madinhdanh:source.madinhdanh,giobatdau:newStart},after:{madinhdanh:source.madinhdanh,giobatdau:source.giobatdau}}]);
 assert.deepEqual((await db.query(file('supabase/diagnostics/time_slot_legacy.sql'))).rows,[]);
 await db.exec('BEGIN TRANSACTION READ ONLY');await db.query(file('supabase/diagnostics/normalization_data_checks.sql'));await db.exec('COMMIT');
 assert.deepEqual((await db.query(file('supabase/diagnostics/json_storage_columns.sql'))).rows,[]);
 assert.ok((await db.query(file('supabase/diagnostics/foreign_key_audit.sql'))).rows.every(r=>r.trangthai==='OK'));
 await db.exec(file('supabase/reset_demo_dataset.sql'));await db.exec(file('supabase/reset_demo_dataset.sql'));assert.ok((await business()).classes.length);
 console.log('PASS time-slot normalization: two derived columns removed, typed clocks/FKs, no new tables, preflight rollback, repeated migration, preserved lessons/work/schedules, real catalog CRUD, overnight duration, source-only writes, queried schedule updates, stable historical payroll, actual-time incident lookup, diagnostics and repeated reset');
}
