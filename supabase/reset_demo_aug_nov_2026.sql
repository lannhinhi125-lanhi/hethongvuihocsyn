-- DEMO 08–11/2026: 24 teachers, 120 students, 24 demo classes.
-- REPLACES teachers/students/work/history; existing non-demo classes are retained,
-- paused and detached from old teachers. Existing demo classes are recreated.
-- Lessons on/after today's Bangkok date remain planned, without fabricated work.
-- August/September payroll is sent/reconciled/locked through the business function.
-- August/September include resolved claims; October has specific ongoing claims.
-- Run THIS entire file only; do not run the old reset or seed afterwards.
-- Preserve ADMIN accounts, roles, master catalogs, AI documents/configuration.
-- Run ONLY this entire file, on the migrated database, in Supabase SQL Editor.
-- This is an intentional data reset, not a schema migration. Export old data first.
DO $demo_reset$
BEGIN
SET CONSTRAINTS ALL DEFERRED;
IF to_regclass('vuihoc."V_KHUNG_GIO"') IS NOT NULL THEN EXECUTE 'CREATE TEMP VIEW demo_slot_source AS SELECT * FROM vuihoc."V_KHUNG_GIO"';
ELSE EXECUTE 'CREATE TEMP VIEW demo_slot_source AS SELECT * FROM vuihoc."KHUNG_GIO"'; END IF;
IF to_regclass('vuihoc."V_HOC_LIEU_LOP"') IS NOT NULL THEN EXECUTE 'CREATE TEMP VIEW demo_material_source AS SELECT * FROM vuihoc."V_HOC_LIEU_LOP"';
ELSE EXECUTE 'CREATE TEMP VIEW demo_material_source AS SELECT * FROM vuihoc."HOC_LIEU_LOP"'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
LOCK TABLE vuihoc."NGUOI_DUNG",vuihoc."GIAO_VIEN",vuihoc."HOC_SINH",vuihoc."LOP_HOC",
 vuihoc."BUOI_HOC",vuihoc."BANG_CONG_THANG",vuihoc."BIEN_BAN_DU_GIO" IN ACCESS EXCLUSIVE MODE;

DO $preflight$ BEGIN
 IF to_regprocedure('vuihoc.tu_dong_checkout(timestamptz)') IS NULL
 OR to_regclass('vuihoc."DANG_KY_MON_HOC"') IS NULL
 OR to_regclass('vuihoc."NHOM_QUYEN_CHI_TIET"') IS NULL THEN
  RAISE EXCEPTION 'Cần cài luồng ca học, tự checkout và đăng ký nhiều môn trước khi nạp dữ liệu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
   WHERE g.congtruycap='ADMIN' AND u.trangthai='active' AND 'ALL'=ANY(vuihoc.quyen_nhom(g.madinhdanh))) THEN
  RAISE EXCEPTION 'Cần có tài khoản quản trị toàn quyền đang hoạt động. Không xóa dữ liệu.';
 END IF;
 IF (SELECT count(*) FROM vuihoc."MON_HOC" WHERE mamonhoc IN ('SUB-MATH','SUB-ENG'))<>2
 OR (SELECT count(*) FROM vuihoc."MO_HINH_LOP" WHERE mamohinh IN ('1-1','1-3','1-5'))<>3
 OR (SELECT count(*) FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc='CAP-TH' AND nhan IN ('Lớp 1','Lớp 2','Lớp 3','Lớp 4','Lớp 5'))<>5
 OR (SELECT count(*) FROM vuihoc."TRINH_DO" WHERE matrinhdo IN ('LVL-F1','LVL-F2','LVL-STD','LVL-ADV'))<>4 THEN
  RAISE EXCEPTION 'Thiếu danh mục Toán/Anh, mô hình 1-1/1-3/1-5, khối tiểu học hoặc trình độ. Không xóa dữ liệu.';
 END IF;
 IF (SELECT count(*) FROM demo_slot_source WHERE regexp_replace(khoanggio,'\s','','g') IN ('16:15-17:45','18:00-19:30','19:45-21:15') AND danghoatdong)<3 THEN
  RAISE EXCEPTION 'Cần 3 khung giờ hoạt động: 16:15–17:45, 18:00–19:30, 19:45–21:15. Không xóa dữ liệu.';
 END IF;
END $preflight$;

-- Some deployed databases have criterion columns but lack the scoring trigger.
-- Install the existing scoring rule before loading; never seed computed scores.
IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BIEN_BAN_DU_GIO' AND column_name='diemtong') THEN
CREATE OR REPLACE FUNCTION vuihoc.chuan_hoa_diem_du_gio() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 NEW.diemtong:=round((NEW.diemtc1+NEW.diemtc2*2+NEW.diemtc3)/4,2);
 NEW.xeploai:=CASE WHEN NEW.diemtong>=9 THEN 'Xuất sắc'
  WHEN NEW.diemtong>=8 THEN 'Tốt' WHEN NEW.diemtong>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chuan_hoa_diem_du_gio ON vuihoc."BIEN_BAN_DU_GIO";
CREATE TRIGGER chuan_hoa_diem_du_gio BEFORE INSERT OR UPDATE ON vuihoc."BIEN_BAN_DU_GIO"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.chuan_hoa_diem_du_gio();
REVOKE ALL ON FUNCTION vuihoc.chuan_hoa_diem_du_gio() FROM PUBLIC,anon,authenticated;
END IF;



-- Suspend only history guards needed by this explicitly requested full reset.
-- Save and restore exact trigger states; all FKs and other validation remain on.
CREATE TEMP TABLE demo_guard_states ON COMMIT DROP AS
 SELECT n.nspname,c.relname,t.tgname,t.tgenabled FROM pg_trigger t
 JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid
 WHERE n.nspname='vuihoc' AND NOT t.tgisinternal
 AND p.proname IN ('kiem_tra_ky_cong_buoi','ghi_cong_khi_luu_nhan_xet','bao_ve_su_co_tam_dung','bao_ve_minh_chung_cong');
DO $disable$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM demo_guard_states LOOP
  EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I',r.nspname,r.relname,r.tgname);
 END LOOP;
END $disable$;

DELETE FROM vuihoc."BIEN_BAN_DU_GIO";
DELETE FROM vuihoc."CHI_TIET_CA_LOP";
DELETE FROM vuihoc."DIEM_DANH_BUOI_HOC";
DELETE FROM vuihoc."NHAN_XET_BUOI_HOC";
DELETE FROM vuihoc."LINK_MINH_CHUNG_CONG";
DELETE FROM vuihoc."GIAI_TRINH_CONG_DAY";
DELETE FROM vuihoc."CONG_DAY_BUOI_HOC";
DELETE FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN";
DELETE FROM vuihoc."SU_CO_BUOI_HOC";
DELETE FROM vuihoc."PHAN_CONG_DAY_THAY";
DELETE FROM vuihoc."BUOI_HOC";
DELETE FROM vuihoc."BANG_CONG_THANG";
UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG' WHERE trangthai NOT IN ('TAM_DUNG','DA_KET_THUC');
DELETE FROM vuihoc."LICH_DANG_KY_MON_HOC";
DELETE FROM vuihoc."DANG_KY_MON_HOC";
DELETE FROM vuihoc."TRUY_VET_XEP_LOP";
DELETE FROM vuihoc."HOC_LIEU_LOP" WHERE malop ~ '^DEMO-LOP-[0-9]{3}$';
DELETE FROM vuihoc."LICH_LOP" WHERE malop ~ '^DEMO-LOP-[0-9]{3}$';
-- Retired optional tables may still exist on databases not yet cleaned up.
DO $optional$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['LICH_SU_CA_DANG_KY_HOC','LICH_SU_DANG_KY_HOC','LUOT_NHAN_XET_AI','LICH_DANG_KY_HOC_SINH','TRUY_VET_XEP_LOP_SU_KIEN_CU'] LOOP
  IF to_regclass(format('vuihoc.%I',tab)) IS NOT NULL THEN EXECUTE format('DELETE FROM vuihoc.%I',tab); END IF;
 END LOOP;
END $optional$;
DELETE FROM vuihoc."HOC_SINH";
UPDATE vuihoc."LOP_HOC" SET magiaovien=NULL
 WHERE madinhdanh !~ '^DEMO-LOP-[0-9]{3}$';
DELETE FROM vuihoc."LOP_HOC" WHERE madinhdanh ~ '^DEMO-LOP-[0-9]{3}$';
DO $availability_cleanup$ BEGIN
 IF to_regclass('vuihoc."PHIEN_BAN_LICH_RANH"') IS NOT NULL THEN
  DELETE FROM vuihoc."PHIEN_BAN_LICH_RANH";
 ELSE
  DELETE FROM vuihoc."CHI_TIET_LICH_RANH";
  DELETE FROM vuihoc."LICH_RANH_TUAN";
  DELETE FROM vuihoc."LICH_RANH_DINH_KY";
 END IF;
END $availability_cleanup$;
DELETE FROM vuihoc."GIAO_VIEN_KHOI";
DELETE FROM vuihoc."GIAO_VIEN_MO_HINH";
-- Teacher-owned chat is removed with accounts; administrator history is retained.
DO $chats$ BEGIN
 IF to_regclass('vuihoc."PHIEN_CHAT_AI"') IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='PHIEN_CHAT_AI' AND column_name='magiaovien') THEN
   DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE magiaovien IN (SELECT madinhdanh FROM vuihoc."GIAO_VIEN");
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='PHIEN_CHAT_AI' AND column_name='manguoidung') THEN
    DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE manguoidung IN (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='TEACHER');
   END IF;
  ELSE
   DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE manguoidung IN (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='TEACHER');
  END IF;
 END IF;
END $chats$;
DELETE FROM vuihoc."GIAO_VIEN";
DELETE FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh IN (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='TEACHER');

SET CONSTRAINTS ALL IMMEDIATE;
DO $restore$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM demo_guard_states LOOP
  EXECUTE format('ALTER TABLE %I.%I %s TRIGGER %I',r.nspname,r.relname,
   CASE r.tgenabled WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.tgname);
 END LOOP;
END $restore$;
SET CONSTRAINTS ALL DEFERRED;

-- Only temporary staging tables below; no new permanent tables or fake totals.
CREATE TEMP TABLE demo_teachers(i integer PRIMARY KEY,name text,subject text,username text) ON COMMIT DROP;
INSERT INTO demo_teachers VALUES
 (1,'Nguyễn Minh Anh','SUB-MATH','gv.minhanh'),(2,'Trần Thu Hà','SUB-ENG','gv.thuha'),
 (3,'Lê Hoàng Nam','SUB-MATH','gv.hoangnam'),(4,'Phạm Ngọc Linh','SUB-ENG','gv.ngoclinh'),
 (5,'Đỗ Quang Huy','SUB-MATH','gv.quanghuy'),(6,'Vũ Mai Phương','SUB-ENG','gv.maiphuong'),
 (7,'Bùi Đức Thành','SUB-MATH','gv.ducthanh'),(8,'Đặng Khánh Vy','SUB-ENG','gv.khanhvy'),
 (9,'Hoàng Gia Bảo','SUB-MATH','gv.giabao'),(10,'Ngô Thảo Nguyên','SUB-ENG','gv.thaonguyen'),
 (11,'Dương Tuấn Kiệt','SUB-MATH','gv.tuankiet'),(12,'Đinh Bảo Châu','SUB-ENG','gv.baochau');

INSERT INTO demo_teachers VALUES
 (13,'Nguyễn Thùy Dương','SUB-MATH','gv.demo13'),
 (14,'Trần Đức Anh','SUB-ENG','gv.demo14'),
 (15,'Lê Hải Yến','SUB-MATH','gv.demo15'),
 (16,'Phạm Minh Châu','SUB-ENG','gv.demo16'),
 (17,'Hoàng Tuấn Anh','SUB-MATH','gv.demo17'),
 (18,'Vũ Thanh Hà','SUB-ENG','gv.demo18'),
 (19,'Đặng Quốc Bảo','SUB-MATH','gv.demo19'),
 (20,'Bùi Ngọc Hân','SUB-ENG','gv.demo20'),
 (21,'Đỗ Thành Đạt','SUB-MATH','gv.demo21'),
 (22,'Ngô Phương Linh','SUB-ENG','gv.demo22'),
 (23,'Dương Minh Khôi','SUB-MATH','gv.demo23'),
 (24,'Đinh Khánh An','SUB-ENG','gv.demo24');

DO $teachers$ DECLARE r record; role_id text; BEGIN
 SELECT madinhdanh INTO role_id FROM vuihoc."NHOM_QUYEN" WHERE congtruycap='TEACHER'
  AND 'TEACHER_PORTAL'=ANY(vuihoc.quyen_nhom(madinhdanh)) ORDER BY madinhdanh LIMIT 1;
 IF role_id IS NULL THEN RAISE EXCEPTION 'Thiếu nhóm quyền giáo viên đầy đủ'; END IF;
 FOR r IN SELECT * FROM demo_teachers ORDER BY i LOOP
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NGUOI_DUNG' AND column_name='mamonhoc') THEN
  INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,trangthai,chucaiavatar,manhomquyen,mamonhoc,matkhau,ngaytao)
  VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.username||'@example.com','090100'||lpad(r.i::text,4,'0'),
   'Giáo viên Giảng dạy',CASE WHEN r.i=12 THEN 'locked' ELSE 'active' END,upper(left(split_part(r.name,' ',1),1)||left(reverse(split_part(reverse(r.name),' ',1)),1)),role_id,r.subject,'246810','2026-07-20');
  ELSE
   INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,trangthai,manhomquyen,matkhau,ngaytao)
   VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.username||'@example.com','090100'||lpad(r.i::text,4,'0'),
    CASE WHEN r.i=12 THEN 'locked' ELSE 'active' END,role_id,'246810','2026-07-20');
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN' AND column_name='trangthaidanhgia') THEN
   INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,hoten,tendangnhap,mamonhoc,macaphoc,sodienthoai,thudientu,bangcap,
    ngaybatdau,trangthai,trangthaidanhgia,nhanxetdanhgia,socaranh,socadaxep,dakinlich,ngaytao)
   VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),'DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.subject,'CAP-TH',
    '090100'||lpad(r.i::text,4,'0'),r.username||'@example.com',CASE WHEN r.subject='SUB-MATH' THEN 'Cử nhân Sư phạm Toán' ELSE 'Cử nhân Sư phạm Tiếng Anh, IELTS 7.5' END,
    '2026-07-20',CASE WHEN r.i=11 THEN 'CHO_LOP' WHEN r.i=12 THEN 'TAM_NGUNG' ELSE 'DANG_DAY' END,'UNSCORED','',0,0,false,'2026-07-20');
  ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN' AND column_name='socaranh') THEN
  INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,hoten,tendangnhap,mamonhoc,macaphoc,sodienthoai,thudientu,bangcap,
   ngaybatdau,trangthai,socaranh,socadaxep,dakinlich,ngaytao)
  VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),'DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.subject,'CAP-TH',
   '090100'||lpad(r.i::text,4,'0'),r.username||'@example.com',CASE WHEN r.subject='SUB-MATH' THEN 'Cử nhân Sư phạm Toán' ELSE 'Cử nhân Sư phạm Tiếng Anh, IELTS 7.5' END,
   '2026-07-20',CASE WHEN r.i=11 THEN 'CHO_LOP' WHEN r.i=12 THEN 'TAM_NGUNG' ELSE 'DANG_DAY' END,0,0,false,'2026-07-20');
  ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN' AND column_name='hoten') THEN
   INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,hoten,tendangnhap,mamonhoc,macaphoc,sodienthoai,thudientu,bangcap,
    ngaybatdau,trangthai,ngaytao)
   VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),'DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.subject,'CAP-TH',
    '090100'||lpad(r.i::text,4,'0'),r.username||'@example.com',CASE WHEN r.subject='SUB-MATH' THEN 'Cử nhân Sư phạm Toán' ELSE 'Cử nhân Sư phạm Tiếng Anh, IELTS 7.5' END,
    '2026-07-20',CASE WHEN r.i=11 THEN 'CHO_LOP' WHEN r.i=12 THEN 'TAM_NGUNG' ELSE 'DANG_DAY' END,'2026-07-20');
  ELSE
   INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,mamonhoc,macaphoc,bangcap,ngaybatdau,trangthai,ngaytao)
   VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),'DEMO-GV-'||lpad(r.i::text,3,'0'),r.subject,'CAP-TH',
    CASE WHEN r.subject='SUB-MATH' THEN 'Cử nhân Sư phạm Toán' ELSE 'Cử nhân Sư phạm Tiếng Anh, IELTS 7.5' END,
    '2026-07-20',CASE WHEN r.i=11 THEN 'CHO_LOP' WHEN r.i=12 THEN 'TAM_NGUNG' ELSE 'DANG_DAY' END,'2026-07-20');
  END IF;
 END LOOP;
END $teachers$;
DO $teacher_grades$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN_KHOI' AND column_name='macaphoc') THEN
  INSERT INTO vuihoc."GIAO_VIEN_KHOI" SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),k.macaphoc,k.madinhdanh,k.thutu
   FROM demo_teachers t CROSS JOIN vuihoc."LUA_CHON_CAP_HOC" k WHERE k.macaphoc='CAP-TH';
 ELSE
  INSERT INTO vuihoc."GIAO_VIEN_KHOI"(magiaovien,maluachon,thutu) SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),k.maluachon,k.thutu
   FROM demo_teachers t CROSS JOIN vuihoc."LUA_CHON_CAP_HOC" k WHERE k.macaphoc='CAP-TH';
 END IF;
END $teacher_grades$;
INSERT INTO vuihoc."GIAO_VIEN_MO_HINH" SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),m.mamohinh,row_number() OVER(PARTITION BY t.i ORDER BY m.mamohinh)
 FROM demo_teachers t CROSS JOIN vuihoc."MO_HINH_LOP" m WHERE m.mamohinh IN ('1-1','1-3','1-5');
DO $availability_seed$ BEGIN
 IF to_regclass('vuihoc."PHIEN_BAN_LICH_RANH"') IS NOT NULL THEN
  INSERT INTO vuihoc."PHIEN_BAN_LICH_RANH"(magiaovien) SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0') FROM demo_teachers t;
  INSERT INTO vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH"(maphienban,makhunggio,thutrongtuan,trangthai)
   SELECT p.madinhdanh,k.madinhdanh,d.day,CASE WHEN t.i=12 OR (d.day=6 AND t.i%3=0) THEN 'none' ELSE 'free' END
   FROM demo_teachers t JOIN vuihoc."PHIEN_BAN_LICH_RANH" p ON p.magiaovien='DEMO-GV-'||lpad(t.i::text,3,'0') CROSS JOIN vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day) WHERE k.danghoatdong;
 ELSE
  INSERT INTO vuihoc."LICH_RANH_DINH_KY" SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),k.madinhdanh,d.day,
   CASE WHEN t.i=12 OR (d.day=6 AND t.i%3=0) THEN 'none' ELSE 'free' END
   FROM demo_teachers t CROSS JOIN vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day) WHERE k.danghoatdong;
 END IF;
END $availability_seed$;

CREATE TEMP TABLE demo_classes ON COMMIT DROP AS
 SELECT i,'DEMO-LOP-'||lpad(i::text,3,'0') AS id,
 CASE WHEN i%2=1 THEN 'SUB-MATH' ELSE 'SUB-ENG' END AS subject,
 CASE WHEN i IN (11,12) THEN 3 ELSE ((i-1)/2)%5+1 END AS grade,
 CASE WHEN i IN (1,2) THEN '1-1' WHEN i IN (3,4,7,8,11,12,13,14,17,18,21,22) THEN '1-3' ELSE '1-5' END AS model,
 (ARRAY['LVL-F1','LVL-F2','LVL-STD','LVL-ADV'])[((i-1)/2)%4+1] AS level,
 (ARRAY['16:15-17:45','18:00-19:30','19:45-21:15'])[((i-1)/2)%3+1] AS hours,
 CASE WHEN i%2=1 THEN 1 ELSE 2 END AS firstday
 FROM generate_series(1,24) n(i);
ALTER TABLE demo_classes ADD COLUMN slot text;
UPDATE demo_classes c SET slot=(SELECT madinhdanh FROM demo_slot_source WHERE regexp_replace(khoanggio,'\s','','g')=c.hours AND danghoatdong ORDER BY madinhdanh LIMIT 1);
DO $demo_class_capacity$
DECLARE statement text:=$insert$
INSERT INTO vuihoc."LOP_HOC"(madinhdanh,malophoc,tenlophoc,mamonhoc,matrinhdo,mamohinh,sisotoida,macaphoc,makhoi,
 trangthai,ngaybatdau,lienketphonghoc,magiaovien,ngaytao)
 SELECT c.id,(CASE WHEN c.subject='SUB-MATH' THEN 'TOAN' ELSE 'ENG' END)||'_K'||c.grade||'_2026_'||lpad(c.i::text,2,'0'),
 (CASE WHEN c.subject='SUB-MATH' THEN 'Toán' ELSE 'Tiếng Anh' END)||' lớp '||c.grade||' – '||
 (CASE WHEN c.model='1-1' THEN 'Đồng hành cá nhân' WHEN c.model='1-3' THEN 'Nhóm khám phá' ELSE 'Nhóm bứt phá' END),
 c.subject,c.level,c.model,m.sisotoida,'CAP-TH',k.madinhdanh,
 CASE WHEN c.i=11 THEN 'CHO_KHAI_GIANG' ELSE 'DANG_HOC' END,
 CASE WHEN c.i=11 THEN date '2026-11-02' WHEN c.i>=21 THEN date '2026-10-01' WHEN c.i>=17 THEN date '2026-09-01' ELSE date '2026-08-01' END,'https://example.com/vuihoc/rooms/'||c.id,
 'DEMO-GV-'||lpad((CASE WHEN c.i BETWEEN 13 AND 16 THEN c.i-10 ELSE c.i END)::text,3,'0'),'2026-07-25'
 FROM demo_classes c JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=c.model
 JOIN vuihoc."LUA_CHON_CAP_HOC" k ON k.macaphoc='CAP-TH' AND k.nhan='Lớp '||c.grade;
$insert$;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='sisotoida') THEN
  statement:=replace(replace(statement,'mamohinh,sisotoida,macaphoc','mamohinh,macaphoc'),'c.model,m.sisotoida,','c.model,');
 END IF;
 EXECUTE statement;
END $demo_class_capacity$;
INSERT INTO vuihoc."LICH_LOP" SELECT id,1,firstday,slot FROM demo_classes
 UNION ALL SELECT id,2,firstday+3,slot FROM demo_classes;

CREATE TEMP TABLE demo_students(i integer PRIMARY KEY,name text,class_i integer) ON COMMIT DROP;
INSERT INTO demo_students(i,name,class_i)
 SELECT i,(ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi'])[(i-1)%8+1]||' '||
 (ARRAY['Minh Khang','Ngọc Anh','Gia Hân','Đức Minh','Khánh Linh','Tuấn Anh','Bảo Ngọc','Hải Đăng','Thảo My','Quang Khải',
 'Yến Nhi','Anh Khoa','Thanh Trúc','Nhật Nam','Diệu Linh','Phúc An','Khánh An','Trung Kiên','Mai Chi','Thiên Phúc',
 'Bảo Hân','Hoài An','Minh Quân','Hà My','Quỳnh Anh','Gia Huy','Phương Anh','Anh Thư','Bảo Minh','Tuệ Lâm',
 'Đăng Khoa','Như Ý','Minh Châu','Hữu Phước','Ngọc Mai','Thành Đạt','Khánh Ngọc','Thiên Ân','Hồng Nhung','Việt Anh'])[(i-1)%40+1],NULL
 FROM generate_series(1,120) n(i);
UPDATE demo_students SET name=overlay(name placing
 CASE WHEN i<=80 THEN 'Thanh ' ELSE 'Ngọc ' END from position(' ' in name)+1 for 0)
 WHERE i>40;
DO $rosters$ DECLARE c record; next_i integer:=1; amount integer; BEGIN
 FOR c IN SELECT * FROM demo_classes WHERE i NOT IN (11,12) ORDER BY i LOOP
  amount:=CASE WHEN c.model='1-1' THEN 1 WHEN c.model='1-3' THEN 3 WHEN c.i IN (5,6) THEN 4 ELSE 5 END;
  UPDATE demo_students SET class_i=c.i WHERE i BETWEEN next_i AND next_i+amount-1;
  next_i:=next_i+amount;
 END LOOP;
END $rosters$;
UPDATE demo_students SET class_i=11 WHERE i IN (113,114);
UPDATE demo_students SET class_i=12 WHERE i IN (117,118);
INSERT INTO vuihoc."HOC_SINH"
 SELECT (jsonb_populate_record(NULL::vuihoc."HOC_SINH",jsonb_build_object(
 'madinhdanh','DEMO-HS-'||lpad(s.i::text,3,'0'),'hoten',s.name,'mamonhoc',coalesce(c.subject,CASE WHEN s.i%2=1 THEN 'SUB-MATH' ELSE 'SUB-ENG' END),
 'mamohinh',coalesce(c.model,'1-3'),'matrinhdo',coalesce(c.level,'LVL-STD'),'macaphoc','CAP-TH','makhoi',k.madinhdanh,
 'hotencha',split_part(s.name,' ',1)||' Văn Thành','sodienthoaicha','091200'||lpad(s.i::text,4,'0'),
 'hotenme',(ARRAY['Nguyễn','Trần','Lê','Phạm'])[(s.i-1)%4+1]||' Thị Lan','sodienthoaime','092300'||lpad(s.i::text,4,'0'),
 'trangthai',CASE WHEN s.class_i IS NOT NULL THEN 'DANG_HOC' WHEN s.i<=116 THEN 'CHO_XEP_LOP' WHEN s.i<=118 THEN 'BAO_LUU' ELSE 'DA_THOI_HOC' END,
 'ngaytao','2026-07-28','ngaycapnhat',statement_timestamp()))).*
 FROM demo_students s LEFT JOIN demo_classes c ON c.i=s.class_i
 JOIN vuihoc."LUA_CHON_CAP_HOC" k ON k.macaphoc='CAP-TH' AND k.nhan='Lớp '||coalesce(c.grade,3);
IF to_regclass('vuihoc."V_DANG_KY_MON_HOC"') IS NULL THEN
INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT h.madinhdanh,h.mamonhoc,h.matrinhdo,h.mamohinh,c.id,h.trangthai,'2026-07-28T09:00:00+07'
 FROM demo_students s JOIN vuihoc."HOC_SINH" h ON h.madinhdanh='DEMO-HS-'||lpad(s.i::text,3,'0') LEFT JOIN demo_classes c ON c.i=s.class_i;
-- Two pupils study both subjects, with different weekdays and no over-capacity.
INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT 'DEMO-HS-'||lpad(s.i::text,3,'0'),c.subject,c.level,c.model,c.id,'DANG_HOC','2026-08-01T09:00:00+07'
 FROM demo_students s JOIN demo_classes c ON c.i=CASE WHEN s.class_i=5 THEN 6 ELSE 5 END
 WHERE s.i IN (SELECT min(i) FROM demo_students WHERE class_i IN (5,6) GROUP BY class_i);
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" SELECT d.mahocsinh,d.mamonhoc,l.thutu,l.thutrongtuan,l.makhunggio
 FROM vuihoc."DANG_KY_MON_HOC" d JOIN vuihoc."LICH_LOP" l ON l.malop=d.malop;
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" SELECT d.mahocsinh,d.mamonhoc,1,CASE WHEN d.mamonhoc='SUB-MATH' THEN 1 ELSE 2 END,
 (SELECT slot FROM demo_classes WHERE i=5) FROM vuihoc."DANG_KY_MON_HOC" d WHERE d.malop IS NULL;
ELSE
INSERT INTO vuihoc."V_DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT 'DEMO-HS-'||lpad(s.i::text,3,'0'),coalesce(c.subject,CASE WHEN s.i%2=1 THEN 'SUB-MATH' ELSE 'SUB-ENG' END),
 coalesce(c.level,'LVL-STD'),coalesce(c.model,'1-3'),c.id,
 CASE WHEN s.class_i IS NOT NULL THEN 'DANG_HOC' WHEN s.i<=116 THEN 'CHO_XEP_LOP' WHEN s.i<=118 THEN 'BAO_LUU' ELSE 'DA_THOI_HOC' END,'2026-07-28T09:00:00+07'
 FROM demo_students s LEFT JOIN demo_classes c ON c.i=s.class_i;
INSERT INTO vuihoc."V_DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT 'DEMO-HS-'||lpad(s.i::text,3,'0'),c.subject,c.level,c.model,c.id,'DANG_HOC','2026-08-01T09:00:00+07'
 FROM demo_students s JOIN demo_classes c ON c.i=CASE WHEN s.class_i=5 THEN 6 ELSE 5 END
 WHERE s.i IN (SELECT min(i) FROM demo_students WHERE class_i IN (5,6) GROUP BY class_i);
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" SELECT d.mahocsinh,d.mamonhoc,l.thutu,l.thutrongtuan,l.makhunggio
 FROM vuihoc."V_DANG_KY_MON_HOC" d JOIN vuihoc."LICH_LOP" l ON l.malop=d.malop;
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" SELECT d.mahocsinh,d.mamonhoc,1,CASE WHEN d.mamonhoc='SUB-MATH' THEN 1 ELSE 2 END,
 (SELECT slot FROM demo_classes WHERE i=5) FROM vuihoc."V_DANG_KY_MON_HOC" d WHERE d.malop IS NULL;
END IF;

IF to_regclass('vuihoc."V_DANG_KY_MON_HOC"') IS NOT NULL THEN
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

-- The existing schedule generator creates lessons. Never INSERT generated rows.
CREATE TEMP TABLE demo_material_trigger_states ON COMMIT DROP AS
 SELECT tgname,tgenabled FROM pg_trigger WHERE tgrelid='vuihoc."HOC_LIEU_LOP"'::regclass AND NOT tgisinternal;
DO $stage_materials$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM demo_material_trigger_states LOOP EXECUTE format('ALTER TABLE vuihoc."HOC_LIEU_LOP" DISABLE TRIGGER %I',r.tgname); END LOOP;
END $stage_materials$;
-- The current generator requires weekly materials before it can create lessons.
-- Stage them from the class schedule, not from lessons that do not exist yet.
DO $demo_plan_rows$
DECLARE statement text:=$rows$
WITH planned AS (
 SELECT DISTINCT c.id AS malop,date_trunc('week',d.day)::date AS monday,
  CASE WHEN extract(isodow FROM d.day)=c.firstday THEN 1 ELSE 2 END AS session
 FROM demo_classes c CROSS JOIN generate_series(timestamp '2026-08-01',timestamp '2026-11-30',interval '1 day') d(day)
 WHERE extract(isodow FROM d.day)::integer IN (c.firstday,c.firstday+3)
 AND ((c.i<=10 OR c.i BETWEEN 13 AND 16)
 OR (c.i BETWEEN 17 AND 20 AND d.day>=date '2026-09-01')
 OR (c.i>=21 AND d.day>=date '2026-10-01')
 OR (c.i=11 AND d.day>=date '2026-11-02')
 OR (c.i=12 AND d.day<date '2026-08-15'))
), labeled AS (
 SELECT *,to_char(monday,'MM/YYYY') AS month,
 'Tuần '||(floor((extract(day FROM monday)-1)/7)+1)::integer||': Từ ngày '||to_char(monday,'DD/MM/YYYY')||' đến ngày '||to_char(monday+6,'DD/MM/YYYY') AS week
 FROM planned
)
INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
 SELECT malop,row_number() OVER(PARTITION BY malop ORDER BY monday,session)::integer,month,week,session,
 'Bài học và luyện tập – Buổi '||session||' – '||to_char(monday,'DD/MM/YYYY'),
 'https://example.com/vuihoc/materials/'||malop||'/'||monday||'/buoi-'||session,
 'https://example.com/vuihoc/lms/'||malop||'/'||monday||'/buoi-'||session FROM labeled;
$rows$;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_LIEU_LOP' AND column_name='mahoclieu') THEN
  statement:=replace(replace(statement,'malop,thutu,thang,tuan,sobuoi','malop,mahoclieu,tungay,denngay,sobuoi'),'::integer,month,week,session','::integer,monday,monday+6,session');
 END IF;EXECUTE statement;
END $demo_plan_rows$;
PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-08-01',date '2026-09-30');
PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-10-01',date '2026-10-31');
PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-11-01',date '2026-11-30');
-- The paused demo class only operated during the first two weeks of September.
DELETE FROM vuihoc."BUOI_HOC" WHERE malop='DEMO-LOP-012' AND ngayhoc>=date '2026-08-15';
CREATE TEMP TABLE demo_lessons ON COMMIT DROP AS
 SELECT c.i AS class_i,c.id AS class_id,c.subject,c.model,c.slot,c.hours,c.firstday,
 d.day::date AS day,row_number() OVER(PARTITION BY c.id ORDER BY d.day)::integer AS lesson_no,
 'DEMO-BH-'||lpad(c.i::text,3,'0')||'-'||to_char(d.day,'YYYYMMDD') AS id
 FROM demo_classes c CROSS JOIN generate_series(timestamp '2026-08-01',timestamp '2026-11-30',interval '1 day') d(day)
 WHERE extract(isodow FROM d.day)::integer IN (c.firstday,c.firstday+3)
 AND ((c.i<=10 OR c.i BETWEEN 13 AND 16)
 OR (c.i BETWEEN 17 AND 20 AND d.day>=date '2026-09-01')
 OR (c.i>=21 AND d.day>=date '2026-10-01')
 OR (c.i=11 AND d.day>=date '2026-11-02')
 OR (c.i=12 AND d.day<date '2026-08-15'));
ALTER TABLE demo_lessons ADD COLUMN scenario text;
UPDATE demo_lessons SET scenario=CASE
 WHEN day>=(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date THEN 'FUTURE'
 WHEN class_i=12 THEN 'COMPLETE'
 WHEN lesson_no%13=0 THEN 'CANCELLED'
 WHEN lesson_no%11=0 THEN 'NO_SHOW'
 WHEN lesson_no%9=0 THEN 'EARLY'
 WHEN lesson_no%7=0 THEN 'COVER'
 WHEN lesson_no%6=0 THEN 'PARTIAL'
 WHEN lesson_no%5=0 THEN 'LATE'
 ELSE 'COMPLETE' END;
UPDATE demo_lessons x SET id=b.madinhdanh FROM vuihoc."BUOI_HOC" b
 WHERE b.malop=x.class_id AND b.ngayhoc=x.day AND b.makhunggio=x.slot;
DO $demo_actual_materials$
DECLARE statement text:=$actual$
UPDATE vuihoc."BUOI_HOC" b SET
 magiaoviendaythay=NULL,
 tieude=(CASE WHEN x.subject='SUB-MATH' THEN (ARRAY['Ôn tập số và phép tính','Giải toán có lời văn','Hình học quanh em','Luyện tư duy logic'])[(x.lesson_no-1)%4+1]
 ELSE (ARRAY['My family and friends','Listening and speaking practice','Reading adventure','Vocabulary and phonics'])[(x.lesson_no-1)%4+1] END)||' – Buổi '||x.lesson_no,
 hoclieutieude='Học liệu buổi '||x.lesson_no,hoclieuslide='https://example.com/vuihoc/slides/'||x.id,
 hoclieulms='https://example.com/vuihoc/exercises/'||x.id
 FROM demo_lessons x WHERE b.madinhdanh=x.id;
$actual$;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name='hoclieuslide') THEN
  statement:=replace(replace(statement,'hoclieuslide=','hoclieugiaovien='),'hoclieulms=','baitaplms=');
 END IF;EXECUTE statement;
END $demo_actual_materials$;
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
END $cover_assignment$;
-- Existing stopped classes cannot be newly checked in. Their historical lessons
-- are staged while temporarily active, then stopped after history is populated.
UPDATE vuihoc."LOP_HOC" SET trangthai='DANG_HOC' WHERE madinhdanh='DEMO-LOP-012';
DO $demo_source_clocks$
DECLARE statement text:=$actual$
UPDATE vuihoc."BUOI_HOC" b SET vaolopluc=(b.ngayhoc+b.batdau) AT TIME ZONE 'Asia/Bangkok'
 +CASE WHEN x.scenario='LATE' THEN interval '8 minutes' ELSE interval '-2 minutes' END,
 manguoivaolop=coalesce(b.magiaoviendaythay,b.magiaovienchinh),chuyencan=CASE WHEN x.scenario='LATE' THEN 'LATE' ELSE 'ATTENDED' END
 FROM demo_lessons x WHERE x.id=b.madinhdanh AND x.scenario NOT IN ('FUTURE','NO_SHOW','CANCELLED');
UPDATE vuihoc."BUOI_HOC" b SET ketthucluc=vuihoc.gio_ket_thuc_ca(b.ngayhoc,b.batdau,b.ketthuc)
 -CASE WHEN x.scenario='EARLY' THEN interval '12 minutes' ELSE interval '0 minutes' END,
 manguoiketthuc=coalesce(b.magiaoviendaythay,b.magiaovienchinh),
 nhatky=CASE WHEN x.scenario='EARLY' THEN 'Kết thúc sớm do gián đoạn đường truyền; vận hành cần đối soát.' ELSE 'Hoàn thành nội dung bài học, giao bài luyện tập sau buổi.' END,
 lienketbanghi='https://example.com/vuihoc/recordings/'||b.madinhdanh
 FROM demo_lessons x WHERE x.id=b.madinhdanh AND b.vaolopluc IS NOT NULL;
$actual$;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name='batdau') THEN
  statement:=replace(replace(statement,'b.batdau','vuihoc.gio_bat_dau_khung(b.makhunggio)'),'b.ketthuc','vuihoc.gio_ket_thuc_khung(b.makhunggio)');
 END IF;EXECUTE statement;
END $demo_source_clocks$;
UPDATE vuihoc."BUOI_HOC" b SET trangthai='NGHI_HOC',nhatky='Phụ huynh xin nghỉ trước buổi học.'
 FROM demo_lessons x WHERE x.id=b.madinhdanh AND x.scenario='CANCELLED';
UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG' WHERE madinhdanh='DEMO-LOP-012';
UPDATE vuihoc."DANG_KY_MON_HOC" d SET trangthai='BAO_LUU'
 WHERE mahocsinh IN ('DEMO-HS-117','DEMO-HS-118') AND NOT EXISTS(
 SELECT 1 FROM vuihoc."LOP_HOC" l WHERE d.mahocsinh=ANY(vuihoc.hoc_sinh_lop(l.madinhdanh)));
IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_SINH' AND column_name='trangthai') THEN
 UPDATE vuihoc."HOC_SINH" SET trangthai='BAO_LUU' WHERE madinhdanh IN ('DEMO-HS-117','DEMO-HS-118');
END IF;

-- Snapshot enrolments for each historical lesson. The normal checkout trigger
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

INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi,mahocsinh,trangthai,ghichu,manguoicapnhat)
 SELECT n.mabuoi,n.mahocsinh,CASE WHEN right(n.mahocsinh,3)::integer%9=0 AND x.lesson_no%4=0 THEN 'absent'
 WHEN right(n.mahocsinh,3)::integer%7=0 AND x.lesson_no%3=0 THEN 'late' ELSE 'present' END,
 CASE WHEN right(n.mahocsinh,3)::integer%9=0 AND x.lesson_no%4=0 THEN 'Gia đình báo vắng, đã gửi bài ôn tập.' ELSE '' END,
 coalesce(b.magiaoviendaythay,b.magiaovienchinh)
 FROM vuihoc."NHAN_XET_BUOI_HOC" n JOIN demo_lessons x ON x.id=n.mabuoi JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi;
-- Final nonblank comment activates existing STANDARD/COVER payroll triggers.
UPDATE vuihoc."NHAN_XET_BUOI_HOC" n SET noidung=CASE WHEN a.trangthai='absent' THEN 'Con vắng buổi học. Gia đình hỗ trợ con xem lại học liệu và hoàn thành bài ôn tập trước buổi tiếp theo.'
 ELSE (ARRAY['Con nắm chắc nội dung bài học, chủ động trả lời câu hỏi. Cần trình bày bài làm rõ ràng hơn.',
 'Con tiến bộ trong phần luyện tập và biết tự sửa lỗi. Nên ôn lại kiến thức trong 15 phút mỗi ngày.',
 'Con tích cực trao đổi và hoàn thành phần lớn bài tập. Cần luyện thêm những câu vận dụng.',
 'Con hiểu bài nhưng đôi lúc còn mất tập trung. Gia đình hỗ trợ con chuẩn bị bài trước buổi học.',
 'Con tự tin hơn khi diễn đạt và hợp tác tốt với các bạn. Tiếp tục duy trì thói quen ôn tập.'])[(right(n.mahocsinh,3)::integer+x.lesson_no)%5+1] END,
 manguoicapnhat=coalesce(b.magiaoviendaythay,b.magiaovienchinh),ngaycapnhat=b.ketthucluc
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id JOIN vuihoc."DIEM_DANH_BUOI_HOC" a ON a.mabuoi=x.id
 WHERE n.mabuoi=x.id AND a.mahocsinh=n.mahocsinh
 AND (x.scenario<>'PARTIAL' OR n.mahocsinh<>(SELECT min(q.mahocsinh) FROM vuihoc."NHAN_XET_BUOI_HOC" q WHERE q.mabuoi=n.mabuoi));

-- Class session projections and materials use the same dated-lesson keys.
IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CHI_TIET_CA_LOP' AND column_name='malop') THEN
INSERT INTO vuihoc."CHI_TIET_CA_LOP"(malop,khoaca,mabuoi,sobuoi,ngaygio,tieude,giovaohienthi,hotennguoivao,magiaoviendaythay,codiemdanh,conhanxet)
 SELECT x.class_id,x.day::text||'-'||CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,x.id,
 CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,x.day::text||' '||replace(x.hours,'-',' - '),b.tieude,
 to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),g.hoten,b.magiaoviendaythay,b.vaolopluc IS NOT NULL,b.ketthucluc IS NOT NULL
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id LEFT JOIN vuihoc."GIAO_VIEN" teacher ON teacher.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh)
 LEFT JOIN vuihoc."NGUOI_DUNG" g ON g.madinhdanh=teacher.manguoidung;
ELSE
 INSERT INTO vuihoc."CHI_TIET_CA_LOP"(mabuoi,khoaca,sobuoi)
 SELECT x.id,x.day::text||'-'||CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,
 CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id;
END IF;
DO $demo_missing_materials$
DECLARE statement text:=$missing$
WITH slots AS (
 SELECT DISTINCT b.malop,date_trunc('week',b.ngayhoc)::date AS monday,l.thutu AS session
 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LICH_LOP" l
 ON l.malop=b.malop AND l.makhunggio=b.makhunggio AND l.thutrongtuan=extract(isodow FROM b.ngayhoc)
 WHERE b.malop ~ '^DEMO-LOP-[0-9]{3}$'
), labeled AS (
 SELECT *,to_char(monday,'MM/YYYY') AS month,
 'Tuần '||(floor((extract(day FROM monday)-1)/7)+1)::integer||': Từ ngày '||to_char(monday,'DD/MM/YYYY')||' đến ngày '||to_char(monday+6,'DD/MM/YYYY') AS week
 FROM slots
), missing AS (
 SELECT x.* FROM labeled x WHERE NOT EXISTS(SELECT 1 FROM demo_material_source h WHERE h.malop=x.malop AND h.tuan=x.week AND h.sobuoi=x.session)
)
INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
 SELECT x.malop,coalesce((SELECT max(h.thutu) FROM demo_material_source h WHERE h.malop=x.malop),0)
 +row_number() OVER(PARTITION BY x.malop ORDER BY x.monday,x.session),x.month,x.week,x.session,
 'Bài học và luyện tập – Buổi '||x.session||' – '||to_char(x.monday,'DD/MM/YYYY'),
 'https://example.com/vuihoc/materials/'||x.malop||'/'||x.monday||'/buoi-'||x.session,
 'https://example.com/vuihoc/lms/'||x.malop||'/'||x.monday||'/buoi-'||x.session
 FROM missing x;
$missing$;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_LIEU_LOP' AND column_name='mahoclieu') THEN
  statement:=replace(replace(statement,'malop,thutu,thang,tuan,sobuoi','malop,mahoclieu,tungay,denngay,sobuoi'),',x.month,x.week,x.session',',x.monday,x.monday+6,x.session');
 END IF;EXECUTE statement;
END $demo_missing_materials$;

INSERT INTO vuihoc."PHAN_CONG_DAY_THAY"(malop,thutu,sobuoi,ngaygio,magiaovien,mabuoi)
 SELECT x.class_id,row_number() OVER(PARTITION BY x.class_id ORDER BY x.day),
 CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,x.day::text,b.magiaoviendaythay,x.id
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id WHERE x.scenario='COVER';

-- Incident credit uses configured policy and the existing incident trigger.
-- Early end/no-show stay as lesson warnings: creating an incident would apply
-- the catalog coefficient immediately under the existing incident policy.
DO $incident_seed$ DECLARE seed_sql text:=$seed_sql$
INSERT INTO vuihoc."SU_CO_BUOI_HOC"(madinhdanh,mabuoi,manhomsuco,masuco,tensuco,hesocongapdung,muckhancap,noidung,
 trangthai,manguoibao,manguoixuly,baoluc,xulyluc,ghichuxuly)
 SELECT 'DEMO-SC-'||x.id,x.id,t.manhom,t.ma,t.ten,
 CASE WHEN x.scenario IN ('EARLY','NO_SHOW') THEN NULL ELSE t.hesocong END,
 CASE WHEN x.scenario IN ('CANCELLED','COVER') THEN 'ADVANCED' ELSE 'EMERGENCY' END,
 CASE x.scenario WHEN 'LATE' THEN 'Giáo viên vào lớp muộn 8 phút, đã báo vận hành.'
 WHEN 'COVER' THEN 'Giáo viên chính xin nghỉ; đã bố trí giáo viên cùng môn dạy thay.'
 WHEN 'CANCELLED' THEN 'Phụ huynh báo nghỉ trước buổi học.'
 WHEN 'EARLY' THEN 'Buổi học kết thúc sớm 12 phút, chờ xác minh và đối soát.'
 ELSE 'Không ghi nhận giáo viên vào lớp, chờ xác minh.' END,
 CASE WHEN x.scenario IN ('EARLY','NO_SHOW') OR (x.scenario='LATE' AND x.lesson_no%2=1) THEN 'DANG_XU_LY' ELSE 'DA_GIAI_QUYET' END,
 (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' AND u.trangthai='active' ORDER BY u.madinhdanh LIMIT 1),
 CASE WHEN x.scenario NOT IN ('EARLY','NO_SHOW') AND NOT (x.scenario='LATE' AND x.lesson_no%2=1) THEN (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' AND u.trangthai='active' ORDER BY u.madinhdanh LIMIT 1) END,
 x.day,CASE WHEN x.scenario NOT IN ('EARLY','NO_SHOW') AND NOT (x.scenario='LATE' AND x.lesson_no%2=1) THEN x.day END,
 CASE WHEN x.scenario IN ('EARLY','NO_SHOW') OR (x.scenario='LATE' AND x.lesson_no%2=1) THEN '' ELSE 'Đã xác minh và xử lý theo hệ số danh mục.' END
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id
 JOIN vuihoc."LOAI_SU_CO" t ON t.ma=CASE x.scenario WHEN 'LATE' THEN 'INC-TCH-03' WHEN 'CANCELLED' THEN 'INC-STU-01'
 WHEN 'COVER' THEN 'INC-TCH-01' WHEN 'EARLY' THEN 'INC-SYS-01' WHEN 'NO_SHOW' THEN 'INC-TCH-02' END
 WHERE x.scenario IN ('LATE','CANCELLED','COVER');
$seed_sql$;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='SU_CO_BUOI_HOC' AND column_name='tensuco') THEN
  seed_sql:=replace(seed_sql,'masuco,tensuco,hesocongapdung','masuco,hesocongapdung');
  seed_sql:=replace(seed_sql,'x.id,t.manhom,t.ma,t.ten,','x.id,t.manhom,t.ma,');
 END IF;
 EXECUTE seed_sql;
END $incident_seed$;

-- Build fragment, used inside the atomic demo reset/repair before closing periods.
DO $valid_claims$
DECLARE actor text; period record; c record; n integer; claim_id text;
 source_name text; sent_at timestamptz; before_row jsonb; after_row jsonb;
 teachers jsonb; decisions jsonb; claim_status text;
BEGIN
 SELECT u.madinhdanh INTO STRICT actor FROM vuihoc."NGUOI_DUNG" u
 JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
 WHERE g.congtruycap='ADMIN' AND u.trangthai='active'
 AND 'ALL'=ANY(vuihoc.quyen_nhom(g.madinhdanh)) ORDER BY u.madinhdanh LIMIT 1;
 source_name:=CASE WHEN to_regclass('vuihoc."V_CONG_DAY_BUOI_HOC"') IS NULL
  THEN 'CONG_DAY_BUOI_HOC' ELSE 'V_CONG_DAY_BUOI_HOC' END;
 FOR period IN SELECT kycong FROM vuihoc."BANG_CONG_THANG"
  WHERE kycong IN ('2026-08','2026-09','2026-10') ORDER BY kycong LOOP
  n:=0;
  FOR c IN EXECUTE format($query$
   SELECT x.madinhdanh,x.mabuoi,x.magiaovien,x.hesocong,b.ngayhoc,b.tieude,g.manguoidung
   FROM vuihoc.%I x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.mabuoi
   JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=x.magiaovien
   WHERE x.kycong=$1 AND x.magiaovien ~ '^DEMO-GV-[0-9]{3}$'
    AND x.loaicong IN ('LATE','EMERGENCY') AND x.hesocong>0 AND x.hesocong<1 AND b.chuyencan='LATE'
    AND b.ngayhoc<(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date-1
    AND EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i WHERE i.mabuoi=x.mabuoi AND i.masuco='INC-TCH-03')
   ORDER BY b.ngayhoc,x.magiaovien,x.madinhdanh LIMIT 3$query$,source_name) USING period.kycong
  LOOP
   n:=n+1;
   IF period.kycong<'2026-10' AND n=3 THEN EXIT; END IF;
   claim_id:='DEMO-GT-VALID-'||period.kycong||'-'||n;
   IF EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh=claim_id OR macong=c.madinhdanh) THEN CONTINUE; END IF;
   sent_at:=CASE WHEN period.kycong<'2026-10' THEN
    ((period.kycong||'-01')::date+interval '1 month 9 hours') AT TIME ZONE 'Asia/Bangkok'
    ELSE (c.ngayhoc+1+time '09:00') AT TIME ZONE 'Asia/Bangkok' END;
   claim_status:=CASE WHEN n=1 THEN 'DA_DUYET' WHEN n=2 THEN 'TU_CHOI' ELSE 'CHO_DUYET' END;
   -- A concrete demo entry error, independent of the genuinely recorded lateness.
   -- Accepted claims restore the original incident rate, pending claims retain 0.
   before_row:=vuihoc.bang_cong_truy_van(period.kycong);
   SELECT jsonb_agg(t||jsonb_build_object('sessions',
    coalesce((SELECT jsonb_agg(CASE WHEN t->>'teacherId'=c.magiaovien AND s->>'id'=c.mabuoi THEN
     s||jsonb_build_object('creditCoeff',CASE WHEN n IN (1,3) THEN 0 ELSE c.hesocong END,
      'hrPayNote',CASE WHEN n IN (1,3) THEN 'Demo: nhập nhầm hệ số thành 0 khi đối soát.' ELSE coalesce(s->>'hrPayNote','') END,
      'reconciliationSent',true) ELSE s END) FROM jsonb_array_elements(t->'sessions') s),'[]'::jsonb)))
    INTO teachers FROM jsonb_array_elements(before_row->'danhsachgiaovien') t;
   PERFORM vuihoc.luu_bang_cong(actor,NULL,before_row,before_row||jsonb_build_object('danhsachgiaovien',teachers));
   UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET guiluc=sent_at WHERE madinhdanh=c.madinhdanh;
   INSERT INTO vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh,macong,noidung,loaisuco,manguoigui,guiluc)
   VALUES(claim_id,c.madinhdanh,
    format('Buổi %s ngày %s (mã %s). %s',c.tieude,to_char(c.ngayhoc,'DD/MM/YYYY'),c.mabuoi,
     CASE WHEN n IN (1,3) THEN format('Bảng đối soát ghi 0 công dù sự cố vào muộn 8 phút áp hệ số %s. Đề nghị sửa lỗi nhập 0 về đúng hệ số sự cố, không yêu cầu tính đủ 1 công.',c.hesocong)
     ELSE format('Tôi vào lớp muộn 8 phút và đã dạy hết nội dung. Bảng công áp hệ số %s; đề nghị xem xét tính đủ 1 công.',c.hesocong) END),
    CASE WHEN n IN (1,3) THEN 'Sai hệ số công do nhập nhầm' ELSE 'Đề nghị xem xét hệ số đi muộn' END,
    c.manguoidung,sent_at+interval '1 hour');
   -- No fake evidence URL; the linked lesson and incident supply verifiable records.
   IF claim_status<>'CHO_DUYET' THEN
    before_row:=vuihoc.bang_cong_truy_van(period.kycong);
    SELECT jsonb_agg(d||CASE WHEN d->>'id'=claim_id THEN jsonb_build_object('status',claim_status,
     'adminNote',CASE WHEN n=1 THEN format('Đối chiếu đúng buổi và sự cố muộn 8 phút: sửa lỗi nhập 0 về %s công, giữ hệ số đi muộn.',c.hesocong)
      ELSE 'Nhật ký xác nhận muộn 8 phút. Dạy đủ nội dung không phải căn cứ miễn hệ số đi muộn; giữ nguyên công theo sự cố.' END) ELSE '{}'::jsonb END)
     INTO decisions FROM jsonb_array_elements(before_row->'danhsachgiaitrinh') d;
    after_row:=before_row||jsonb_build_object('danhsachgiaitrinh',decisions);
    IF n=1 THEN
     SELECT jsonb_agg(t||jsonb_build_object('sessions',
      coalesce((SELECT jsonb_agg(CASE WHEN t->>'teacherId'=c.magiaovien AND s->>'id'=c.mabuoi THEN
       s||jsonb_build_object('creditCoeff',c.hesocong,'hrPayNote',format('Đã duyệt %s: sửa lỗi nhập 0 về %s công; giữ hệ số đi muộn.',claim_id,c.hesocong)) ELSE s END)
       FROM jsonb_array_elements(t->'sessions') s),'[]'::jsonb))) INTO teachers FROM jsonb_array_elements(before_row->'danhsachgiaovien') t;
     after_row:=after_row||jsonb_build_object('danhsachgiaovien',teachers);
    END IF;
    PERFORM vuihoc.luu_bang_cong(actor,NULL,before_row,after_row);
    UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET duyetluc=sent_at+interval '5 hours' WHERE madinhdanh=claim_id;
   END IF;
  END LOOP;
 END LOOP;
END $valid_claims$;

-- Build fragment: included INSIDE reset_demo_aug_nov_2026.sql.
-- Do not run separately. Work rows themselves were generated by business triggers.
DO $demo_payroll$
DECLARE
 actor text; period record; before_row jsonb; after_row jsonb; teachers jsonb;
BEGIN
 SELECT u.madinhdanh INTO STRICT actor FROM vuihoc."NGUOI_DUNG" u
 JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
 WHERE g.congtruycap='ADMIN' AND u.trangthai='active'
 AND 'ALL'=ANY(vuihoc.quyen_nhom(g.madinhdanh)) ORDER BY u.madinhdanh LIMIT 1;
 -- Specific claims are seeded in demo_valid_explanations.sql first.
 -- October sends only sample lessons, not the whole unfinished month.

 -- Use the same source projection and validation function as saving payroll in UI.
 FOR period IN SELECT madinhdanh,kycong FROM vuihoc."BANG_CONG_THANG"
 WHERE kycong IN ('2026-08','2026-09','2026-10') ORDER BY kycong LOOP
  before_row:=vuihoc.bang_cong_truy_van(period.kycong);
  IF period.kycong<'2026-10' THEN
   UPDATE vuihoc."CONG_DAY_BUOI_HOC" c SET dagui=true,
    guiluc=((period.kycong||'-01')::date+interval '1 month 9 hours') AT TIME ZONE 'Asia/Bangkok'
   FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=c.mabuoi
    AND to_char(b.ngayhoc,'YYYY-MM')=period.kycong AND c.magiaovien ~ '^DEMO-GV-[0-9]{3}$';
   before_row:=vuihoc.bang_cong_truy_van(period.kycong);
  END IF;
  SELECT jsonb_agg(
   CASE WHEN t->>'teacherId' !~ '^DEMO-GV-[0-9]{3}$' THEN t ELSE t || jsonb_build_object('payrollSent',period.kycong<'2026-10',
    'reconcileStatus',CASE WHEN period.kycong<'2026-10' THEN 'DA_CHOT'
      WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(t->'sessions') s WHERE s->'dispute'->>'status'='CHO_DUYET') THEN 'CO_GIAI_TRINH'
      WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(t->'sessions') s WHERE s->'dispute'->>'id' IS NOT NULL) THEN 'DA_XU_LY_GT'
      ELSE 'CHO_GUI' END,
    'sessions',coalesce((SELECT jsonb_agg(s||jsonb_build_object('reconciliationSent',
       period.kycong<'2026-10' OR s->'dispute'->>'id' IS NOT NULL,
       'reconcileStatus',CASE WHEN period.kycong<'2026-10' THEN 'DA_CHOT'
        WHEN s->'dispute'->>'status'='CHO_DUYET' THEN 'CO_GIAI_TRINH'
        WHEN s->'dispute'->>'id' IS NOT NULL THEN 'DA_XAC_NHAN'
        ELSE 'CHO_DOI_SOAT' END))
     FROM jsonb_array_elements(t->'sessions') s),'[]'::jsonb)) END) INTO teachers
   FROM jsonb_array_elements(before_row->'danhsachgiaovien') t;
  after_row:=before_row||jsonb_build_object('danhsachgiaovien',coalesce(teachers,'[]'::jsonb),
   'daguithongbao',true,'dakhoa',period.kycong<'2026-10',
   'thoigiankhoa',CASE WHEN period.kycong<'2026-10' THEN
    to_char((period.kycong||'-01')::date+interval '1 month 2 days','YYYY-MM-DD')||'T09:00:00+07:00' ELSE NULL END);
  PERFORM vuihoc.luu_bang_cong(actor,NULL,before_row,after_row);
 END LOOP;
 IF (SELECT count(*) FROM vuihoc."BANG_CONG_THANG" WHERE kycong IN ('2026-08','2026-09') AND dakhoa)<>2 THEN
  RAISE EXCEPTION 'Demo thiếu hai kỳ công đã khóa; hoàn tác toàn bộ.';
 END IF;
END $demo_payroll$;


-- Inspection reports: multiple scores/ratings, linked to genuinely taught lessons.
IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BIEN_BAN_DU_GIO' AND column_name='malophoc') THEN
EXECUTE $legacy_inspections$
INSERT INTO vuihoc."BIEN_BAN_DU_GIO"(madinhdanh,magiaovien,mabienban,mabuoi,malophoc,manguoinhan,manguoidanhgia,
 ngaydanhgia,ngaycahoc,macahoc,guiluc,sobuoi,tenbuoihoc,khunggio,mohinh,diemtc1,diemtc2,diemtc3,
 nhanxetchung,uudiem,cancaithien,khuyennghi,trangthai,lienketphonghoc,lienketbanghi)
 SELECT 'DEMO-DG-'||lpad(x.class_i::text,3,'0')||'-'||x.lesson_no,coalesce(b.magiaoviendaythay,b.magiaovienchinh),
 'BBDG/2026/'||lpad(x.class_i::text,3,'0')||'/'||x.lesson_no,x.id,l.malophoc,coalesce(b.magiaoviendaythay,b.magiaovienchinh),
 (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' AND u.trangthai='active' ORDER BY u.madinhdanh LIMIT 1),
 x.day,x.day,x.id,x.day,CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,b.tieude,replace(x.hours,'-',' - '),x.model,
 6.4+(x.class_i%4),6.5+(x.class_i%4),6.6+(x.class_i%4),
 'Bài dạy có mục tiêu rõ ràng, học sinh tham gia tích cực.','Hướng dẫn mạch lạc, sử dụng ví dụ gần gũi.',
 'Tăng câu hỏi gợi mở và phân bổ thời gian luyện tập.','Tiếp tục dự giờ đồng nghiệp và trao đổi phương pháp.',
 CASE WHEN x.class_i%4=0 THEN 'CHO_GOP_Y' ELSE 'DA_DUYET' END,b.lienketphonghoc,b.lienketbanghi
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=x.class_id
 WHERE x.class_i<=10 AND x.lesson_no IN (3,10) AND x.scenario IN ('COMPLETE','LATE');
$legacy_inspections$;
ELSE
 INSERT INTO vuihoc."BIEN_BAN_DU_GIO"(madinhdanh,mabienban,mabuoi,manguoidanhgia,ngaydanhgia,guiluc,
 diemtc1,diemtc2,diemtc3,nhanxetchung,uudiem,cancaithien,khuyennghi,trangthai)
 SELECT 'DEMO-DG-'||lpad(x.class_i::text,3,'0')||'-'||x.lesson_no,
 'BBDG/2026/'||lpad(x.class_i::text,3,'0')||'/'||x.lesson_no,x.id,
 (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' AND u.trangthai='active' ORDER BY u.madinhdanh LIMIT 1),
 x.day,x.day,6.4+(x.class_i%4),6.5+(x.class_i%4),6.6+(x.class_i%4),
 'Bài dạy có mục tiêu rõ ràng, học sinh tham gia tích cực.','Hướng dẫn mạch lạc, sử dụng ví dụ gần gũi.',
 'Tăng câu hỏi gợi mở và phân bổ thời gian luyện tập.','Tiếp tục dự giờ đồng nghiệp và trao đổi phương pháp.',
 CASE WHEN x.class_i%4=0 THEN 'CHO_GOP_Y' ELSE 'DA_DUYET' END
 FROM demo_lessons x WHERE x.class_i<=10 AND x.lesson_no IN (3,10) AND x.scenario IN ('COMPLETE','LATE');
END IF;

SET CONSTRAINTS ALL IMMEDIATE;
DO $restore_materials$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM demo_material_trigger_states LOOP
  EXECUTE format('ALTER TABLE vuihoc."HOC_LIEU_LOP" %s TRIGGER %I',CASE r.tgenabled WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.tgname);
 END LOOP;
END $restore_materials$;
UPDATE vuihoc."TRUY_VET_XEP_LOP" SET thoigian='2026-08-01T08:00:00+07'
 WHERE malopcu IS NULL AND mahocsinh LIKE 'DEMO-HS-%';
PERFORM vuihoc.kiem_tra_dang_ky_mon();
SET CONSTRAINTS ALL IMMEDIATE;
DROP VIEW demo_registration_source;
DROP VIEW demo_slot_source;
DROP VIEW demo_material_source;
END $demo_reset$;

-- Read-only summary; payroll totals are queried from generated work rows.
SELECT 'Giáo viên' AS hang_muc,count(*) AS so_luong FROM vuihoc."GIAO_VIEN"
UNION ALL SELECT 'Học sinh',count(*) FROM vuihoc."HOC_SINH"
UNION ALL SELECT 'Lớp học',count(*) FROM vuihoc."LOP_HOC"
UNION ALL SELECT 'Buổi học',count(*) FROM vuihoc."BUOI_HOC"
UNION ALL SELECT 'Nhận xét đã nhập',count(*) FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE btrim(noidung)<>''
UNION ALL SELECT 'Công tự sinh',count(*) FROM vuihoc."CONG_DAY_BUOI_HOC";
