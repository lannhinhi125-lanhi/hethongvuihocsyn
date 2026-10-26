import {readFileSync, writeFileSync} from 'node:fs';

// Keep the small existing fixture unchanged. Build the larger, reviewed demo SQL.
let sql=readFileSync('supabase/reset_demo_dataset.sql','utf8').replaceAll('\r\n','\n');
const replace=(from,to)=>{if(!sql.includes(from))throw new Error('Missing source: '+from.slice(0,80));sql=sql.replaceAll(from,()=>to);};
replace('-- REPLACE ALL teachers, students, classes, lessons and related operational data.',
`-- DEMO 08–11/2026: 24 teachers, 120 students, 24 demo classes.
-- REPLACES teachers/students/work/history; existing non-demo classes are retained,
-- paused and detached from old teachers. Existing demo classes are recreated.
-- Lessons on/after today's Bangkok date remain planned, without fabricated work.
-- August/September payroll is sent/reconciled/locked through the business function.
-- October stays open with disputes; November remains planned.
-- Run THIS entire file only; do not run the old reset or seed afterwards.`);
replace('DELETE FROM vuihoc."LOP_HOC";',`UPDATE vuihoc."LOP_HOC" SET magiaovien=NULL
 WHERE madinhdanh !~ '^DEMO-LOP-[0-9]{3}$';
DELETE FROM vuihoc."LOP_HOC" WHERE madinhdanh ~ '^DEMO-LOP-[0-9]{3}$';`);
// Keep class schedules/materials for retained classes.
replace('DELETE FROM vuihoc."HOC_LIEU_LOP";',`DELETE FROM vuihoc."HOC_LIEU_LOP" WHERE malop ~ '^DEMO-LOP-[0-9]{3}$';`);
replace('DELETE FROM vuihoc."LICH_LOP";',`DELETE FROM vuihoc."LICH_LOP" WHERE malop ~ '^DEMO-LOP-[0-9]{3}$';`);
replace("ARRAY['LICH_SU_DANG_KY_HOC'", "ARRAY['LICH_SU_CA_DANG_KY_HOC','LICH_SU_DANG_KY_HOC'");
const extraNames=['Nguyễn Thùy Dương','Trần Đức Anh','Lê Hải Yến','Phạm Minh Châu','Hoàng Tuấn Anh','Vũ Thanh Hà','Đặng Quốc Bảo','Bùi Ngọc Hân','Đỗ Thành Đạt','Ngô Phương Linh','Dương Minh Khôi','Đinh Khánh An'];
replace('\nDO $teachers$',`\nINSERT INTO demo_teachers VALUES\n${extraNames.map((name,j)=>` (${j+13},'${name}','SUB-${j%2===0?'MATH':'ENG'}','gv.demo${j+13}')`).join(',\n')};\n\nDO $teachers$`);
replace("CASE WHEN i<=10 THEN (i+1)/2 ELSE 3 END AS grade", "CASE WHEN i IN (11,12) THEN 3 ELSE ((i-1)/2)%5+1 END AS grade");
replace("WHEN i IN (3,4,7,8,11,12) THEN '1-3'", "WHEN i IN (3,4,7,8,11,12,13,14,17,18,21,22) THEN '1-3'");
replace('FROM generate_series(1,12) n(i);','FROM generate_series(1,24) n(i);');
replace("CASE WHEN c.i=11 THEN date '2026-11-02' ELSE date '2026-09-01' END", "CASE WHEN c.i=11 THEN date '2026-11-02' WHEN c.i>=21 THEN date '2026-10-01' WHEN c.i>=17 THEN date '2026-09-01' ELSE date '2026-08-01' END");
replace("'2026-08-25'", "'2026-07-25'");
// Four experienced teachers each take a second class in a different time slot.
replace("'DEMO-GV-'||lpad(c.i::text,3,'0'),'2026-07-25'",
 "'DEMO-GV-'||lpad((CASE WHEN c.i BETWEEN 13 AND 16 THEN c.i-10 ELSE c.i END)::text,3,'0'),'2026-07-25'");
replace("'2026-08-20'", "'2026-07-20'");
replace('FROM generate_series(1,40) n(i);','FROM generate_series(1,120) n(i);');
replace('DO $rosters$', `UPDATE demo_students SET name=overlay(name placing
 CASE WHEN i<=80 THEN 'Thanh ' ELSE 'Ngọc ' END from position(' ' in name)+1 for 0)
 WHERE i>40;
DO $rosters$`);
replace("'Hồng Nhung','Việt Anh'])[i]", "'Hồng Nhung','Việt Anh'])[(i-1)%40+1]");
replace('WHERE i<=10 ORDER BY i LOOP','WHERE i NOT IN (11,12) ORDER BY i LOOP');
// Original reserved IDs overlap the enlarged rosters. Move reserved pupils to the end.
for(const [a,b] of [['(33,34)','(113,114)'],['(37,38)','(117,118)'],["'DEMO-HS-037','DEMO-HS-038'","'DEMO-HS-117','DEMO-HS-118'"],['s.i<=36','s.i<=116'],['s.i<=38','s.i<=118']])replace(a,b);
replace("'2026-08-28'", "'2026-07-28'");
replace("'2026-08-28T09:00:00+07'", "'2026-07-28T09:00:00+07'");
replace("'2026-09-01T09:00:00+07'", "'2026-08-01T09:00:00+07'");
replace("timestamp '2026-09-01'", "timestamp '2026-08-01'");
replace("(c.i<=10 OR (c.i=11 AND d.day>=date '2026-11-02') OR (c.i=12 AND d.day<date '2026-09-15'))",
`((c.i<=10 OR c.i BETWEEN 13 AND 16)
 OR (c.i BETWEEN 17 AND 20 AND d.day>=date '2026-09-01')
 OR (c.i>=21 AND d.day>=date '2026-10-01')
 OR (c.i=11 AND d.day>=date '2026-11-02')
 OR (c.i=12 AND d.day<date '2026-08-15'))`);
replace("PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-09-01',date '2026-10-31');", "PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-08-01',date '2026-09-30');\nPERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-10-01',date '2026-10-31');");
replace("ngayhoc>=date '2026-09-15'", "ngayhoc>=date '2026-08-15'");
replace("magiaoviendaythay=CASE WHEN x.scenario='COVER' THEN 'DEMO-GV-'||lpad((CASE WHEN x.class_i<=8 THEN x.class_i+2 ELSE x.class_i-8 END)::text,3,'0') END,", 'magiaoviendaythay=NULL,');
replace('END $demo_actual_materials$;', `END $demo_actual_materials$;
-- Select a same-subject substitute with no overlapping main/cover lesson.
DO $cover_assignment$ DECLARE lesson record; chosen text; BEGIN
 FOR lesson IN SELECT * FROM demo_lessons WHERE scenario='COVER' ORDER BY day,class_i LOOP
  SELECT g.madinhdanh INTO chosen FROM vuihoc."GIAO_VIEN" g
  JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung
  WHERE g.mamonhoc=lesson.subject AND g.trangthai<>'TAM_NGUNG' AND u.trangthai='active'
   AND NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b JOIN demo_lessons x ON x.id=b.madinhdanh
    WHERE x.day=lesson.day AND (b.magiaovienchinh=g.madinhdanh OR b.magiaoviendaythay=g.madinhdanh)
    AND split_part(x.hours,'-',1)::time<split_part(lesson.hours,'-',2)::time
    AND split_part(lesson.hours,'-',1)::time<split_part(x.hours,'-',2)::time)
  ORDER BY (SELECT count(*) FROM vuihoc."BUOI_HOC" c WHERE c.magiaoviendaythay=g.madinhdanh),g.madinhdanh LIMIT 1;
  IF chosen IS NULL THEN RAISE EXCEPTION 'Không tìm được giáo viên dạy thay không trùng ca: %',lesson.id; END IF;
  UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=chosen WHERE madinhdanh=lesson.id;
 END LOOP;
END $cover_assignment$;`);
replace("'^DEMO-LOP-0(0[1-9]|1[0-2])$'", "'^DEMO-LOP-[0-9]{3}$'");
// Snapshot old rosters before a real transfer, then snapshot new rosters afterwards.
replace('-- The existing schedule generator creates lessons.', `IF to_regclass('vuihoc."V_DANG_KY_MON_HOC"') IS NOT NULL THEN
 EXECUTE 'CREATE TEMP VIEW demo_registration_source AS SELECT * FROM vuihoc."V_DANG_KY_MON_HOC"';
ELSE
 EXECUTE 'CREATE TEMP VIEW demo_registration_source AS SELECT * FROM vuihoc."DANG_KY_MON_HOC"';
END IF;
-- Two same-grade/same-subject transfers: 013 -> 003 and 014 -> 004.
-- These classes are all 1-3. Exchange one pupil each way, so no capacity changes.
CREATE TEMP TABLE demo_transfer_people ON COMMIT DROP AS
 SELECT min(d.mahocsinh) AS student,d.mamonhoc,d.malop AS oldclass,
 CASE d.malop WHEN 'DEMO-LOP-013' THEN 'DEMO-LOP-003' WHEN 'DEMO-LOP-003' THEN 'DEMO-LOP-013'
 WHEN 'DEMO-LOP-014' THEN 'DEMO-LOP-004' ELSE 'DEMO-LOP-014' END AS newclass
 FROM demo_registration_source d WHERE d.malop IN ('DEMO-LOP-003','DEMO-LOP-004','DEMO-LOP-013','DEMO-LOP-014')
 GROUP BY d.mamonhoc,d.malop;

-- The existing schedule generator creates lessons.`);
// All these classes have exactly the same slot and days in each subject.
// Move after lesson generation but before check-in creates student comment snapshots.
replace('INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"',`-- Snapshot enrolments for each historical lesson. The normal checkout trigger
-- already created blank comments; replace only the moved pupils' snapshots.
CREATE TEMP TABLE demo_snapshot_guard_states ON COMMIT DROP AS
 SELECT t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
 WHERE t.tgrelid='vuihoc."NHAN_XET_BUOI_HOC"'::regclass AND NOT t.tgisinternal
 AND p.proname='ghi_cong_khi_luu_nhan_xet';
DO $snapshot_disable$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM demo_snapshot_guard_states LOOP
  EXECUTE format('ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" DISABLE TRIGGER %I',r.tgname);
 END LOOP;
END $snapshot_disable$;
DELETE FROM vuihoc."NHAN_XET_BUOI_HOC" n USING demo_transfer_people t,demo_lessons x
 WHERE n.mabuoi=x.id AND n.mahocsinh=t.student AND x.day>=date '2026-09-15';
INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung)
 SELECT b.madinhdanh,t.student,'' FROM demo_transfer_people t
 JOIN vuihoc."BUOI_HOC" b ON b.malop=t.newclass
 WHERE b.ngayhoc>=date '2026-09-15' AND b.ketthucluc IS NOT NULL
 ON CONFLICT(mabuoi,mahocsinh) DO NOTHING;
DO $snapshot_restore$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM demo_snapshot_guard_states LOOP
  EXECUTE format('ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" %s TRIGGER %I',
   CASE r.tgenabled WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA'
   WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.tgname);
 END LOOP;
END $snapshot_restore$;
-- Clear existing assignment first; the real registration writer checks capacities.
DO $transfers$ DECLARE move_row record; r record; BEGIN
 SET CONSTRAINTS ALL IMMEDIATE;
 CREATE TEMP TABLE demo_transfer_guard_states ON COMMIT DROP AS
  SELECT c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
  JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='vuihoc' AND NOT t.tgisinternal
  AND p.proname IN ('giu_dang_ky_lop_dang_hoat_dong','giu_xep_lop_dang_hoat_dong');
 FOR r IN SELECT * FROM demo_transfer_guard_states LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I DISABLE TRIGGER %I',r.relname,r.tgname);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 FOR move_row IN SELECT * FROM demo_transfer_people ORDER BY student LOOP
  IF to_regclass('vuihoc."V_DANG_KY_MON_HOC"') IS NULL THEN
   UPDATE vuihoc."DANG_KY_MON_HOC" SET malop=NULL,trangthai='CHO_XEP_LOP'
    WHERE mahocsinh=move_row.student AND mamonhoc=move_row.mamonhoc;
  ELSE
   UPDATE vuihoc."V_DANG_KY_MON_HOC" SET malop=NULL,trangthai='CHO_XEP_LOP'
    WHERE mahocsinh=move_row.student AND mamonhoc=move_row.mamonhoc;
  END IF;
 END LOOP;
 FOR move_row IN SELECT * FROM demo_transfer_people ORDER BY student LOOP
  IF to_regclass('vuihoc."V_DANG_KY_MON_HOC"') IS NULL THEN
   UPDATE vuihoc."DANG_KY_MON_HOC" SET malop=move_row.newclass,trangthai='DANG_HOC',
    matrinhdo=(SELECT matrinhdo FROM vuihoc."LOP_HOC" WHERE madinhdanh=move_row.newclass)
    WHERE mahocsinh=move_row.student AND mamonhoc=move_row.mamonhoc;
  ELSE
   UPDATE vuihoc."V_DANG_KY_MON_HOC" SET malop=move_row.newclass,trangthai='DANG_HOC',
    matrinhdo=(SELECT matrinhdo FROM vuihoc."LOP_HOC" WHERE madinhdanh=move_row.newclass)
    WHERE mahocsinh=move_row.student AND mamonhoc=move_row.mamonhoc;
  END IF;
 END LOOP;
 DELETE FROM vuihoc."LICH_DANG_KY_MON_HOC" d USING demo_transfer_people t
  WHERE d.mahocsinh=t.student AND d.mamonhoc=t.mamonhoc;
 INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC"(mahocsinh,mamonhoc,thutu,thutrongtuan,makhunggio)
  SELECT t.student,t.mamonhoc,l.thutu,l.thutrongtuan,l.makhunggio
  FROM demo_transfer_people t JOIN vuihoc."LICH_LOP" l ON l.malop=t.newclass;
 SET CONSTRAINTS ALL IMMEDIATE;
 FOR r IN SELECT * FROM demo_transfer_guard_states LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I %s TRIGGER %I',r.relname,
   CASE r.tgenabled WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA'
   WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.tgname);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 -- Consolidate the two staged events into one explicit dated transfer per pupil.
 DELETE FROM vuihoc."TRUY_VET_XEP_LOP" v USING demo_transfer_people t
  WHERE v.mahocsinh=t.student AND (v.malopcu IS NOT NULL OR v.malopmoi=t.newclass);
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='TRUY_VET_XEP_LOP' AND column_name='mamonhoc') THEN
  INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,mamonhoc,malopcu,malopmoi,thoigian,nguon)
   SELECT student,mamonhoc,oldclass,newclass,'2026-09-15T08:00:00+07','LICH_SU' FROM demo_transfer_people;
 ELSE
  INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi,thoigian,nguon)
   SELECT student,oldclass,newclass,'2026-09-15T08:00:00+07','LICH_SU' FROM demo_transfer_people;
 END IF;
END $transfers$;

INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"`);
// Append payroll scenarios inside the same atomic block, after all sources exist.
const payroll=readFileSync('supabase/demo_payroll_scenarios.sql','utf8');
replace('\n b.magiaovienchinh,\n CASE WHEN x.scenario NOT IN', `
 (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' AND u.trangthai='active' ORDER BY u.madinhdanh LIMIT 1),
 CASE WHEN x.scenario NOT IN`);
replace("CASE WHEN x.scenario IN ('EARLY','NO_SHOW') THEN 'DANG_XU_LY' ELSE 'DA_GIAI_QUYET' END", "CASE WHEN x.scenario IN ('EARLY','NO_SHOW') OR (x.scenario='LATE' AND x.lesson_no%2=1) THEN 'DANG_XU_LY' ELSE 'DA_GIAI_QUYET' END");
replace("CASE WHEN x.scenario NOT IN ('EARLY','NO_SHOW') THEN", "CASE WHEN x.scenario NOT IN ('EARLY','NO_SHOW') AND NOT (x.scenario='LATE' AND x.lesson_no%2=1) THEN");
replace("CASE WHEN x.scenario IN ('EARLY','NO_SHOW') THEN '' ELSE 'Đã xác minh và xử lý theo hệ số danh mục.' END", "CASE WHEN x.scenario IN ('EARLY','NO_SHOW') OR (x.scenario='LATE' AND x.lesson_no%2=1) THEN '' ELSE 'Đã xác minh và xử lý theo hệ số danh mục.' END");
replace('-- Payroll and reconciliation stay exactly as generated by business triggers.\n-- Sending/reconciling/locking payroll is left for real actions in the UI.',payroll);
// Initial assignment traces have historical dates rather than the time of loading.
replace('PERFORM vuihoc.kiem_tra_dang_ky_mon();',`UPDATE vuihoc."TRUY_VET_XEP_LOP" SET thoigian='2026-08-01T08:00:00+07'
 WHERE malopcu IS NULL AND mahocsinh LIKE 'DEMO-HS-%';
PERFORM vuihoc.kiem_tra_dang_ky_mon();`);
replace('DROP VIEW demo_slot_source;', 'DROP VIEW demo_registration_source;\nDROP VIEW demo_slot_source;');
writeFileSync('supabase/reset_demo_aug_nov_2026.sql',sql,'utf8');
console.log('Built supabase/reset_demo_aug_nov_2026.sql');
