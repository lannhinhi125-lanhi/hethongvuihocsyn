-- REPLACE ALL teachers, students, classes, lessons and related operational data.
-- Preserve ADMIN accounts, roles, master catalogs, AI documents/configuration.
-- Run ONLY this entire file, on the migrated database, in Supabase SQL Editor.
-- This is an intentional data reset, not a schema migration. Export old data first.
DO $demo_reset$
BEGIN
SET CONSTRAINTS ALL DEFERRED;
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
 IF (SELECT count(*) FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g') IN ('16:15-17:45','18:00-19:30','19:45-21:15') AND danghoatdong)<3 THEN
  RAISE EXCEPTION 'Cần 3 khung giờ hoạt động: 16:15–17:45, 18:00–19:30, 19:45–21:15. Không xóa dữ liệu.';
 END IF;
END $preflight$;

-- Some deployed databases have criterion columns but lack the scoring trigger.
-- Install the existing scoring rule before loading; never seed computed scores.
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



-- Suspend ONLY the two guards preventing an intentional full history deletion.
-- Save and restore exact trigger states; all FKs and other validation remain on.
CREATE TEMP TABLE demo_guard_states ON COMMIT DROP AS
 SELECT n.nspname,c.relname,t.tgname,t.tgenabled FROM pg_trigger t
 JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid
 WHERE n.nspname='vuihoc' AND NOT t.tgisinternal
 AND p.proname IN ('kiem_tra_ky_cong_buoi','ghi_cong_khi_luu_nhan_xet');
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
DELETE FROM vuihoc."HOC_LIEU_LOP";
DELETE FROM vuihoc."LICH_LOP";
-- Retired optional tables may still exist on databases not yet cleaned up.
DO $optional$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['LUOT_NHAN_XET_AI','LICH_DANG_KY_HOC_SINH','TRUY_VET_XEP_LOP_SU_KIEN_CU'] LOOP
  IF to_regclass(format('vuihoc.%I',tab)) IS NOT NULL THEN EXECUTE format('DELETE FROM vuihoc.%I',tab); END IF;
 END LOOP;
END $optional$;
DELETE FROM vuihoc."HOC_SINH";
DELETE FROM vuihoc."LOP_HOC";
DELETE FROM vuihoc."CHI_TIET_LICH_RANH";
DELETE FROM vuihoc."LICH_RANH_TUAN";
DELETE FROM vuihoc."LICH_RANH_DINH_KY";
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

DO $teachers$ DECLARE r record; role_id text; BEGIN
 SELECT madinhdanh INTO role_id FROM vuihoc."NHOM_QUYEN" WHERE congtruycap='TEACHER'
  AND 'TEACHER_PORTAL'=ANY(vuihoc.quyen_nhom(madinhdanh)) ORDER BY madinhdanh LIMIT 1;
 IF role_id IS NULL THEN RAISE EXCEPTION 'Thiếu nhóm quyền giáo viên đầy đủ'; END IF;
 FOR r IN SELECT * FROM demo_teachers ORDER BY i LOOP
  INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,trangthai,chucaiavatar,manhomquyen,mamonhoc,matkhau,ngaytao)
  VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.username||'@example.com','090100'||lpad(r.i::text,4,'0'),
   'Giáo viên Giảng dạy',CASE WHEN r.i=12 THEN 'locked' ELSE 'active' END,upper(left(split_part(r.name,' ',1),1)||left(reverse(split_part(reverse(r.name),' ',1)),1)),role_id,r.subject,'246810','2026-08-20');
  INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,hoten,tendangnhap,mamonhoc,macaphoc,sodienthoai,thudientu,bangcap,
   ngaybatdau,trangthai,trangthaidanhgia,nhanxetdanhgia,socaranh,socadaxep,dakinlich,ngaytao)
  VALUES('DEMO-GV-'||lpad(r.i::text,3,'0'),'DEMO-GV-'||lpad(r.i::text,3,'0'),r.name,r.username,r.subject,'CAP-TH',
   '090100'||lpad(r.i::text,4,'0'),r.username||'@example.com',CASE WHEN r.subject='SUB-MATH' THEN 'Cử nhân Sư phạm Toán' ELSE 'Cử nhân Sư phạm Tiếng Anh, IELTS 7.5' END,
   '2026-08-20',CASE WHEN r.i=11 THEN 'CHO_LOP' WHEN r.i=12 THEN 'TAM_NGUNG' ELSE 'DANG_DAY' END,'UNSCORED','',0,0,false,'2026-08-20');
 END LOOP;
END $teachers$;
INSERT INTO vuihoc."GIAO_VIEN_KHOI" SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),k.macaphoc,k.madinhdanh,k.thutu
 FROM demo_teachers t CROSS JOIN vuihoc."LUA_CHON_CAP_HOC" k WHERE k.macaphoc='CAP-TH';
INSERT INTO vuihoc."GIAO_VIEN_MO_HINH" SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),m.mamohinh,row_number() OVER(PARTITION BY t.i ORDER BY m.mamohinh)
 FROM demo_teachers t CROSS JOIN vuihoc."MO_HINH_LOP" m WHERE m.mamohinh IN ('1-1','1-3','1-5');
INSERT INTO vuihoc."LICH_RANH_DINH_KY" SELECT 'DEMO-GV-'||lpad(t.i::text,3,'0'),k.madinhdanh,d.day,
 CASE WHEN t.i=12 OR (d.day=6 AND t.i%3=0) THEN 'none' ELSE 'free' END
 FROM demo_teachers t CROSS JOIN vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day) WHERE k.danghoatdong;

CREATE TEMP TABLE demo_classes ON COMMIT DROP AS
 SELECT i,'DEMO-LOP-'||lpad(i::text,3,'0') AS id,
 CASE WHEN i%2=1 THEN 'SUB-MATH' ELSE 'SUB-ENG' END AS subject,
 CASE WHEN i<=10 THEN (i+1)/2 ELSE 3 END AS grade,
 CASE WHEN i IN (1,2) THEN '1-1' WHEN i IN (3,4,7,8,11,12) THEN '1-3' ELSE '1-5' END AS model,
 (ARRAY['LVL-F1','LVL-F2','LVL-STD','LVL-ADV'])[((i-1)/2)%4+1] AS level,
 (ARRAY['16:15-17:45','18:00-19:30','19:45-21:15'])[((i-1)/2)%3+1] AS hours,
 CASE WHEN i%2=1 THEN 1 ELSE 2 END AS firstday
 FROM generate_series(1,12) n(i);
ALTER TABLE demo_classes ADD COLUMN slot text;
UPDATE demo_classes c SET slot=(SELECT madinhdanh FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=c.hours AND danghoatdong ORDER BY madinhdanh LIMIT 1);
INSERT INTO vuihoc."LOP_HOC"(madinhdanh,malophoc,tenlophoc,mamonhoc,matrinhdo,mamohinh,sisotoida,macaphoc,makhoi,
 trangthai,ngaybatdau,lienketphonghoc,magiaovien,ngaytao)
 SELECT c.id,(CASE WHEN c.subject='SUB-MATH' THEN 'TOAN' ELSE 'ENG' END)||'_K'||c.grade||'_2026_'||lpad(c.i::text,2,'0'),
 (CASE WHEN c.subject='SUB-MATH' THEN 'Toán' ELSE 'Tiếng Anh' END)||' lớp '||c.grade||' – '||
 (CASE WHEN c.model='1-1' THEN 'Đồng hành cá nhân' WHEN c.model='1-3' THEN 'Nhóm khám phá' ELSE 'Nhóm bứt phá' END),
 c.subject,c.level,c.model,m.sisotoida,'CAP-TH',k.madinhdanh,
 CASE WHEN c.i=11 THEN 'CHO_KHAI_GIANG' ELSE 'DANG_HOC' END,
 CASE WHEN c.i=11 THEN date '2026-11-02' ELSE date '2026-09-01' END,'https://example.com/vuihoc/rooms/'||c.id,
 'DEMO-GV-'||lpad(c.i::text,3,'0'),'2026-08-25'
 FROM demo_classes c JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=c.model
 JOIN vuihoc."LUA_CHON_CAP_HOC" k ON k.macaphoc='CAP-TH' AND k.nhan='Lớp '||c.grade;
INSERT INTO vuihoc."LICH_LOP" SELECT id,1,firstday,slot FROM demo_classes
 UNION ALL SELECT id,2,firstday+3,slot FROM demo_classes;

CREATE TEMP TABLE demo_students(i integer PRIMARY KEY,name text,class_i integer) ON COMMIT DROP;
INSERT INTO demo_students(i,name,class_i)
 SELECT i,(ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi'])[(i-1)%8+1]||' '||
 (ARRAY['Minh Khang','Ngọc Anh','Gia Hân','Đức Minh','Khánh Linh','Tuấn Anh','Bảo Ngọc','Hải Đăng','Thảo My','Quang Khải',
 'Yến Nhi','Anh Khoa','Thanh Trúc','Nhật Nam','Diệu Linh','Phúc An','Khánh An','Trung Kiên','Mai Chi','Thiên Phúc',
 'Bảo Hân','Hoài An','Minh Quân','Hà My','Quỳnh Anh','Gia Huy','Phương Anh','Anh Thư','Bảo Minh','Tuệ Lâm',
 'Đăng Khoa','Như Ý','Minh Châu','Hữu Phước','Ngọc Mai','Thành Đạt','Khánh Ngọc','Thiên Ân','Hồng Nhung','Việt Anh'])[i],NULL
 FROM generate_series(1,40) n(i);
DO $rosters$ DECLARE c record; next_i integer:=1; amount integer; BEGIN
 FOR c IN SELECT * FROM demo_classes WHERE i<=10 ORDER BY i LOOP
  amount:=CASE WHEN c.model='1-1' THEN 1 WHEN c.model='1-3' THEN 3 WHEN c.i IN (5,6) THEN 4 ELSE 5 END;
  UPDATE demo_students SET class_i=c.i WHERE i BETWEEN next_i AND next_i+amount-1;
  next_i:=next_i+amount;
 END LOOP;
END $rosters$;
UPDATE demo_students SET class_i=11 WHERE i IN (33,34);
UPDATE demo_students SET class_i=12 WHERE i IN (37,38);
INSERT INTO vuihoc."HOC_SINH"(madinhdanh,hoten,mamonhoc,mamohinh,matrinhdo,macaphoc,makhoi,hotencha,sodienthoaicha,hotenme,sodienthoaime,trangthai,ngaytao)
 SELECT 'DEMO-HS-'||lpad(s.i::text,3,'0'),s.name,coalesce(c.subject,CASE WHEN s.i%2=1 THEN 'SUB-MATH' ELSE 'SUB-ENG' END),
 coalesce(c.model,'1-3'),coalesce(c.level,'LVL-STD'),'CAP-TH',k.madinhdanh,
 split_part(s.name,' ',1)||' Văn Thành','091200'||lpad(s.i::text,4,'0'),
 (ARRAY['Nguyễn','Trần','Lê','Phạm'])[(s.i-1)%4+1]||' Thị Lan','092300'||lpad(s.i::text,4,'0'),
 CASE WHEN s.class_i IS NOT NULL THEN 'DANG_HOC' WHEN s.i<=36 THEN 'CHO_XEP_LOP' WHEN s.i<=38 THEN 'BAO_LUU' ELSE 'DA_THOI_HOC' END,'2026-08-28'
 FROM demo_students s LEFT JOIN demo_classes c ON c.i=s.class_i
 JOIN vuihoc."LUA_CHON_CAP_HOC" k ON k.macaphoc='CAP-TH' AND k.nhan='Lớp '||coalesce(c.grade,3);
INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT h.madinhdanh,h.mamonhoc,h.matrinhdo,h.mamohinh,c.id,h.trangthai,'2026-08-28T09:00:00+07'
 FROM demo_students s JOIN vuihoc."HOC_SINH" h ON h.madinhdanh='DEMO-HS-'||lpad(s.i::text,3,'0') LEFT JOIN demo_classes c ON c.i=s.class_i;
-- Two pupils study both subjects, with different weekdays and no over-capacity.
INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT 'DEMO-HS-'||lpad(s.i::text,3,'0'),c.subject,c.level,c.model,c.id,'DANG_HOC','2026-09-01T09:00:00+07'
 FROM demo_students s JOIN demo_classes c ON c.i=CASE WHEN s.class_i=5 THEN 6 ELSE 5 END
 WHERE s.i IN (SELECT min(i) FROM demo_students WHERE class_i IN (5,6) GROUP BY class_i);
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" SELECT d.mahocsinh,d.mamonhoc,l.thutu,l.thutrongtuan,l.makhunggio
 FROM vuihoc."DANG_KY_MON_HOC" d JOIN vuihoc."LICH_LOP" l ON l.malop=d.malop;
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" SELECT d.mahocsinh,d.mamonhoc,1,CASE WHEN d.mamonhoc='SUB-MATH' THEN 1 ELSE 2 END,
 (SELECT slot FROM demo_classes WHERE i=5) FROM vuihoc."DANG_KY_MON_HOC" d WHERE d.malop IS NULL;

-- The existing schedule generator creates lessons. Never INSERT generated rows.
PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-09-01',date '2026-10-31');
PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-11-01',date '2026-11-30');
-- The paused demo class only operated during the first two weeks of September.
DELETE FROM vuihoc."BUOI_HOC" WHERE malop='DEMO-LOP-012' AND ngayhoc>=date '2026-09-15';
CREATE TEMP TABLE demo_lessons ON COMMIT DROP AS
 SELECT c.i AS class_i,c.id AS class_id,c.subject,c.model,c.slot,c.hours,c.firstday,
 d.day::date AS day,row_number() OVER(PARTITION BY c.id ORDER BY d.day)::integer AS lesson_no,
 'DEMO-BH-'||lpad(c.i::text,3,'0')||'-'||to_char(d.day,'YYYYMMDD') AS id
 FROM demo_classes c CROSS JOIN generate_series(timestamp '2026-09-01',timestamp '2026-11-30',interval '1 day') d(day)
 WHERE extract(isodow FROM d.day)::integer IN (c.firstday,c.firstday+3)
 AND (c.i<=10 OR (c.i=11 AND d.day>=date '2026-11-02') OR (c.i=12 AND d.day<date '2026-09-15'));
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
UPDATE vuihoc."BUOI_HOC" b SET
 magiaoviendaythay=CASE WHEN x.scenario='COVER' THEN 'DEMO-GV-'||lpad((CASE WHEN x.class_i<=8 THEN x.class_i+2 ELSE x.class_i-8 END)::text,3,'0') END,
 tieude=(CASE WHEN x.subject='SUB-MATH' THEN (ARRAY['Ôn tập số và phép tính','Giải toán có lời văn','Hình học quanh em','Luyện tư duy logic'])[(x.lesson_no-1)%4+1]
 ELSE (ARRAY['My family and friends','Listening and speaking practice','Reading adventure','Vocabulary and phonics'])[(x.lesson_no-1)%4+1] END)||' – Buổi '||x.lesson_no,
 hoclieutieude='Học liệu buổi '||x.lesson_no,hoclieuslide='https://example.com/vuihoc/slides/'||x.id,
 hoclieulms='https://example.com/vuihoc/exercises/'||x.id
 FROM demo_lessons x WHERE b.madinhdanh=x.id;
-- Existing stopped classes cannot be newly checked in. Their historical lessons
-- are staged while temporarily active, then stopped after history is populated.
UPDATE vuihoc."LOP_HOC" SET trangthai='DANG_HOC' WHERE madinhdanh='DEMO-LOP-012';
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
UPDATE vuihoc."BUOI_HOC" b SET trangthai='NGHI_HOC',nhatky='Phụ huynh xin nghỉ trước buổi học.'
 FROM demo_lessons x WHERE x.id=b.madinhdanh AND x.scenario='CANCELLED';
UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG' WHERE madinhdanh='DEMO-LOP-012';
UPDATE vuihoc."DANG_KY_MON_HOC" SET trangthai='BAO_LUU'
 WHERE mahocsinh IN ('DEMO-HS-037','DEMO-HS-038') AND malop IS NULL;
UPDATE vuihoc."HOC_SINH" SET trangthai='BAO_LUU' WHERE madinhdanh IN ('DEMO-HS-037','DEMO-HS-038');

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
INSERT INTO vuihoc."CHI_TIET_CA_LOP"(malop,khoaca,mabuoi,sobuoi,ngaygio,tieude,giovaohienthi,hotennguoivao,magiaoviendaythay,codiemdanh,conhanxet)
 SELECT x.class_id,x.day::text||'-'||CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,x.id,
 CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,x.day::text||' '||replace(x.hours,'-',' - '),b.tieude,
 to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),g.hoten,b.magiaoviendaythay,b.vaolopluc IS NOT NULL,b.ketthucluc IS NOT NULL
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh);
WITH slots AS (
 SELECT DISTINCT b.malop,date_trunc('week',b.ngayhoc)::date AS monday,l.thutu AS session
 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LICH_LOP" l
 ON l.malop=b.malop AND l.makhunggio=b.makhunggio AND l.thutrongtuan=extract(isodow FROM b.ngayhoc)
 WHERE b.malop ~ '^DEMO-LOP-0(0[1-9]|1[0-2])$'
), labeled AS (
 SELECT *,to_char(monday,'MM/YYYY') AS month,
 'Tuần '||(floor((extract(day FROM monday)-1)/7)+1)::integer||': Từ ngày '||to_char(monday,'DD/MM/YYYY')||' đến ngày '||to_char(monday+6,'DD/MM/YYYY') AS week
 FROM slots
), missing AS (
 SELECT x.* FROM labeled x WHERE NOT EXISTS(SELECT 1 FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=x.malop AND h.tuan=x.week AND h.sobuoi=x.session)
)
INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
 SELECT x.malop,coalesce((SELECT max(h.thutu) FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=x.malop),0)
 +row_number() OVER(PARTITION BY x.malop ORDER BY x.monday,x.session),x.month,x.week,x.session,
 'Bài học và luyện tập – Buổi '||x.session||' – '||to_char(x.monday,'DD/MM/YYYY'),
 'https://example.com/vuihoc/materials/'||x.malop||'/'||x.monday||'/buoi-'||x.session,
 'https://example.com/vuihoc/lms/'||x.malop||'/'||x.monday||'/buoi-'||x.session
 FROM missing x;

INSERT INTO vuihoc."PHAN_CONG_DAY_THAY"(malop,thutu,sobuoi,ngaygio,magiaovien,mabuoi)
 SELECT x.class_id,row_number() OVER(PARTITION BY x.class_id ORDER BY x.day),
 CASE WHEN extract(isodow FROM x.day)=x.firstday THEN 1 ELSE 2 END,x.day::text,b.magiaoviendaythay,x.id
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id WHERE x.scenario='COVER';

-- Incident credit uses configured policy and the existing incident trigger.
-- Early end/no-show stay as lesson warnings: creating an incident would apply
-- the catalog coefficient immediately under the existing incident policy.
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
 CASE WHEN x.scenario IN ('EARLY','NO_SHOW') THEN 'DANG_XU_LY' ELSE 'DA_GIAI_QUYET' END,
 b.magiaovienchinh,
 CASE WHEN x.scenario NOT IN ('EARLY','NO_SHOW') THEN (SELECT u.madinhdanh FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE g.congtruycap='ADMIN' AND u.trangthai='active' ORDER BY u.madinhdanh LIMIT 1) END,
 x.day,CASE WHEN x.scenario NOT IN ('EARLY','NO_SHOW') THEN x.day END,
 CASE WHEN x.scenario IN ('EARLY','NO_SHOW') THEN '' ELSE 'Đã xác minh và xử lý theo hệ số danh mục.' END
 FROM demo_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.id
 JOIN vuihoc."LOAI_SU_CO" t ON t.ma=CASE x.scenario WHEN 'LATE' THEN 'INC-TCH-03' WHEN 'CANCELLED' THEN 'INC-STU-01'
 WHEN 'COVER' THEN 'INC-TCH-01' WHEN 'EARLY' THEN 'INC-SYS-01' WHEN 'NO_SHOW' THEN 'INC-TCH-02' END
 WHERE x.scenario IN ('LATE','CANCELLED','COVER');

-- Payroll and reconciliation stay exactly as generated by business triggers.
-- Sending/reconciling/locking payroll is left for real actions in the UI.

-- Inspection reports: multiple scores/ratings, linked to genuinely taught lessons.
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

PERFORM vuihoc.kiem_tra_dang_ky_mon();
SET CONSTRAINTS ALL IMMEDIATE;
END $demo_reset$;

-- Read-only summary; payroll totals are queried from generated work rows.
SELECT 'Giáo viên' AS hang_muc,count(*) AS so_luong FROM vuihoc."GIAO_VIEN"
UNION ALL SELECT 'Học sinh',count(*) FROM vuihoc."HOC_SINH"
UNION ALL SELECT 'Lớp học',count(*) FROM vuihoc."LOP_HOC"
UNION ALL SELECT 'Buổi học',count(*) FROM vuihoc."BUOI_HOC"
UNION ALL SELECT 'Nhận xét đã nhập',count(*) FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE btrim(noidung)<>''
UNION ALL SELECT 'Công tự sinh',count(*) FROM vuihoc."CONG_DAY_BUOI_HOC";
