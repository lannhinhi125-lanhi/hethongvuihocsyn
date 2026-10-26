-- Bổ sung dữ liệu cho báo cáo, KHÔNG reset và KHÔNG đổi công đã ghi.
-- Chỉ sửa bộ DEMO-HS/DEMO-GV/DEMO-LOP; giữ dữ liệu ngoài bộ demo.
-- Phân bố ngày tạo học sinh/giáo viên; thêm 3 GV THCS + 3 GV THPT;
-- bổ sung ngày kết thúc tháng 10/11/12 cho lớp demo đang thiếu thời hạn.
-- Chạy toàn bộ file trong Supabase SQL Editor bằng quyền quản trị.
DO $enrich_demo_reporting$
DECLARE r record; base_teacher jsonb; base_account jsonb; normalized boolean; lesson_source text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 LOCK TABLE vuihoc."LOP_HOC",vuihoc."BUOI_HOC",vuihoc."GIAO_VIEN",vuihoc."HOC_SINH",
  vuihoc."NGUOI_DUNG",vuihoc."DANG_KY_MON_HOC",vuihoc."BANG_CONG_THANG" IN SHARE ROW EXCLUSIVE MODE;
 IF (SELECT count(*) FROM vuihoc."LOP_HOC" WHERE madinhdanh IN
  (SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(1,24) i))<>24 THEN
  RAISE EXCEPTION 'Cần có bộ demo 24 lớp trước khi bổ sung. Không thay đổi dữ liệu.';
 END IF;
 IF (SELECT count(*) FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc IN ('CAP-THCS','CAP-THPT'))<7 THEN
  RAISE EXCEPTION 'Thiếu danh mục khối THCS/THPT. Không tự tạo mã khối không khớp hệ thống.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name IN ('ngayketthuc','ngayketthuctuychinh')) THEN
  RAISE EXCEPTION 'Cần cập nhật thời hạn lớp (20261109 và 20261111_custom_class_end_date) trước khi bổ sung ngày kết thúc.';
 END IF;
 SELECT to_jsonb(g) INTO STRICT base_teacher FROM vuihoc."GIAO_VIEN" g WHERE madinhdanh='DEMO-GV-001';
 SELECT to_jsonb(u) INTO STRICT base_account FROM vuihoc."NGUOI_DUNG" u WHERE madinhdanh=base_teacher->>'manguoidung';

 CREATE TEMP TABLE demo_additional_teachers(i integer,name text,subject text,category text,created date) ON COMMIT DROP;
 INSERT INTO demo_additional_teachers VALUES
  (25,'Nguyễn Hoài Phương','SUB-MATH','CAP-THCS','2026-08-15'),
  (26,'Trần Minh Hạnh','SUB-ENG','CAP-THCS','2026-09-03'),
  (27,'Lê Quốc Việt','SUB-MATH','CAP-THCS','2026-10-06'),
  (28,'Phạm Thu Trang','SUB-MATH','CAP-THPT','2026-08-23'),
  (29,'Hoàng Bảo Anh','SUB-ENG','CAP-THPT','2026-09-14'),
  (30,'Vũ Đức Long','SUB-MATH','CAP-THPT','2026-10-18');
 FOR r IN SELECT *, 'DEMO-GV-'||lpad(i::text,3,'0') id,'gv.demo'||i username FROM demo_additional_teachers LOOP
  IF EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u WHERE u.madinhdanh=r.id AND u.tendangnhap<>r.username) THEN
   RAISE EXCEPTION 'Mã tài khoản % đã được dùng cho dữ liệu khác.',r.id;
  END IF;
  INSERT INTO vuihoc."NGUOI_DUNG"
   SELECT (jsonb_populate_record(NULL::vuihoc."NGUOI_DUNG",base_account||jsonb_build_object(
    'madinhdanh',r.id,'hoten',r.name,'tendangnhap',r.username,'thudientu',r.username||'@example.com',
    'sodienthoai','090100'||lpad(r.i::text,4,'0'),'mamonhoc',r.subject,'trangthai','active',
    'matkhau','246810','maphien_bam',NULL,'phienhethan',NULL,'maxacthuc',NULL,
    'solansai',0,'tamkhoaden',NULL,'ngaytao',r.created,'ngaycapnhat',r.created))).*
   ON CONFLICT(madinhdanh) DO NOTHING;
  INSERT INTO vuihoc."GIAO_VIEN"
   SELECT (jsonb_populate_record(NULL::vuihoc."GIAO_VIEN",base_teacher||jsonb_build_object(
    'madinhdanh',r.id,'manguoidung',r.id,'hoten',r.name,'tendangnhap',r.username,
    'thudientu',r.username||'@example.com','sodienthoai','090100'||lpad(r.i::text,4,'0'),
    'mamonhoc',r.subject,'macaphoc',r.category,'trangthai','CHO_LOP',
    'bangcap',CASE WHEN r.subject='SUB-ENG' THEN 'Cử nhân Sư phạm Tiếng Anh, IELTS 7.5' ELSE 'Cử nhân Sư phạm Toán' END,
    'ngaybatdau',r.created,'ngayketthuc',NULL,'ngaytao',r.created,'ngaycapnhat',r.created,
    'trangthaidanhgia','UNSCORED','diemdanhgia',0,'nhanxetdanhgia','',
    'socaranh',0,'socadaxep',0,'dakinlich',false))).*
   ON CONFLICT(madinhdanh) DO NOTHING;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN_KHOI' AND column_name='macaphoc') THEN
   INSERT INTO vuihoc."GIAO_VIEN_KHOI"(magiaovien,macaphoc,makhoi,thutu)
    SELECT r.id,k.macaphoc,k.madinhdanh,k.thutu FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.macaphoc=r.category ON CONFLICT DO NOTHING;
  ELSE
   INSERT INTO vuihoc."GIAO_VIEN_KHOI"(magiaovien,maluachon,thutu)
    SELECT r.id,k.maluachon,k.thutu FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.macaphoc=r.category ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO vuihoc."GIAO_VIEN_MO_HINH"(magiaovien,mamohinh,thutu)
   SELECT r.id,m.mamohinh,row_number() OVER(ORDER BY m.mamohinh) FROM vuihoc."MO_HINH_LOP" m
   WHERE m.mamohinh IN ('1-1','1-3','1-5') ON CONFLICT DO NOTHING;
 END LOOP;

 -- Never place creation after a student's first historical lesson.
 CREATE TEMP TABLE demo_student_dates ON COMMIT DROP AS
 SELECT h.madinhdanh,least(CASE
  WHEN right(h.madinhdanh,3)::integer<=48 THEN date '2026-08-01'+right(h.madinhdanh,3)::integer%2
  WHEN right(h.madinhdanh,3)::integer<=64 THEN date '2026-09-01'
  WHEN right(h.madinhdanh,3)::integer<=80 THEN date '2026-10-01'
  WHEN right(h.madinhdanh,3)::integer IN (113,114) THEN date '2026-10-10'
  WHEN right(h.madinhdanh,3)::integer IN (117,118) THEN date '2026-08-01'
  ELSE (ARRAY[date '2026-08-01',date '2026-09-01',date '2026-10-01'])[right(h.madinhdanh,3)::integer%3+1]+right(h.madinhdanh,3)::integer%20 END,
  coalesce((SELECT min(b.ngayhoc) FROM vuihoc."NHAN_XET_BUOI_HOC" n JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi WHERE n.mahocsinh=h.madinhdanh),date '2026-10-26')) created
 FROM vuihoc."HOC_SINH" h WHERE h.madinhdanh ~ '^DEMO-HS-[0-9]{3}$';
 UPDATE vuihoc."HOC_SINH" h SET ngaytao=(p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok'
  FROM demo_student_dates p WHERE h.madinhdanh=p.madinhdanh AND h.ngaytao IS DISTINCT FROM (p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok';
 -- Demo-only chronology repair; preserve exact lifecycle trigger modes.
 SET CONSTRAINTS ALL IMMEDIATE;
 CREATE TEMP TABLE demo_registration_date_guards ON COMMIT DROP AS
  SELECT t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
  WHERE t.tgrelid='vuihoc."DANG_KY_MON_HOC"'::regclass AND NOT t.tgisinternal AND p.proname='luu_dot_dang_ky_hoc_lai';
 FOR r IN SELECT * FROM demo_registration_date_guards LOOP
  EXECUTE format('ALTER TABLE vuihoc."DANG_KY_MON_HOC" DISABLE TRIGGER %I',r.tgname);
 END LOOP;
 UPDATE vuihoc."DANG_KY_MON_HOC" d SET ngaydangky=(p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok'
  FROM demo_student_dates p WHERE d.mahocsinh=p.madinhdanh AND d.ngaydangky<(p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok';
 FOR r IN SELECT * FROM demo_registration_date_guards LOOP
  EXECUTE format('ALTER TABLE vuihoc."DANG_KY_MON_HOC" %s TRIGGER %I',
   CASE r.tgenabled WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.tgname);
 END LOOP;
 UPDATE vuihoc."TRUY_VET_XEP_LOP" t SET thoigian=(p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok'
  FROM demo_student_dates p WHERE t.mahocsinh=p.madinhdanh AND t.malopcu IS NULL
  AND t.thoigian<=timestamptz '2026-08-01T08:00:00+07';

 CREATE TEMP TABLE demo_teacher_dates ON COMMIT DROP AS
 SELECT g.madinhdanh,g.manguoidung,least(CASE
  WHEN right(g.madinhdanh,3)::integer<=6 THEN date '2026-07-15'+right(g.madinhdanh,3)::integer
  WHEN right(g.madinhdanh,3)::integer<=12 THEN date '2026-08-01'
  WHEN right(g.madinhdanh,3)::integer<=16 THEN date '2026-08-10'
  WHEN right(g.madinhdanh,3)::integer<=20 THEN date '2026-09-01' ELSE date '2026-10-01' END,
  coalesce((SELECT min(b.ngayhoc)-1 FROM vuihoc."BUOI_HOC" b WHERE b.magiaovienchinh=g.madinhdanh OR b.magiaoviendaythay=g.madinhdanh),date '2026-10-01')) created
 FROM vuihoc."GIAO_VIEN" g WHERE g.madinhdanh IN(SELECT 'DEMO-GV-'||lpad(i::text,3,'0') FROM generate_series(1,24) i);
 UPDATE vuihoc."GIAO_VIEN" g SET ngaytao=(p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok',ngaybatdau=p.created
  FROM demo_teacher_dates p WHERE g.madinhdanh=p.madinhdanh AND (g.ngaytao IS DISTINCT FROM (p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok' OR g.ngaybatdau::date IS DISTINCT FROM p.created);
 UPDATE vuihoc."NGUOI_DUNG" u SET ngaytao=(p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok'
  FROM demo_teacher_dates p WHERE u.madinhdanh=p.manguoidung AND u.ngaytao IS DISTINCT FROM (p.created+time '08:00') AT TIME ZONE 'Asia/Bangkok';

 normalized:=EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='ngayketthuctuychinh');
 IF normalized THEN EXECUTE 'CREATE TEMP VIEW demo_reporting_classes AS SELECT * FROM vuihoc."V_THOI_HAN_LOP"';
 ELSE EXECUTE 'CREATE TEMP VIEW demo_reporting_classes AS SELECT * FROM vuihoc."LOP_HOC"'; END IF;
 CREATE TEMP TABLE demo_reporting_terms ON COMMIT DROP AS
 SELECT l.madinhdanh,CASE right(l.madinhdanh,3)::integer%3
  WHEN 1 THEN date '2026-10-31'
  WHEN 2 THEN (ARRAY[date '2026-11-26',date '2026-11-28',date '2026-11-30'])[(right(l.madinhdanh,3)::integer/3)%3+1]
  ELSE (ARRAY[date '2026-12-18',date '2026-12-24',date '2026-12-31'])[(right(l.madinhdanh,3)::integer/3)%3+1] END ending
 FROM demo_reporting_classes l WHERE l.madinhdanh IN(SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(1,24) i)
 AND l.ngayketthuc IS NULL;
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b JOIN demo_reporting_terms p ON p.madinhdanh=b.malop WHERE b.ngayhoc>p.ending AND (
  b.ngayhoc<=(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date OR b.vaolopluc IS NOT NULL OR b.ketthucluc IS NOT NULL
  OR b.trangthai<>'CHUA_DIEN_RA' OR b.magiaoviendaythay IS NOT NULL OR coalesce(b.nhatky,'')<>'' OR coalesce(b.lienketbanghi,'')<>''
  OR EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" s WHERE s.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" d WHERE d.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" d WHERE d.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."PHAN_CONG_DAY_THAY" a WHERE a.mabuoi=b.madinhdanh)
 )) THEN RAISE EXCEPTION 'Có buổi đã phát sinh nghiệp vụ sau hạn dự kiến. Hoàn tác toàn bộ; không xóa lịch sử.'; END IF;
 DELETE FROM vuihoc."CHI_TIET_CA_LOP" c USING vuihoc."BUOI_HOC" b,demo_reporting_terms p
  WHERE c.mabuoi=b.madinhdanh AND b.malop=p.madinhdanh AND b.ngayhoc>p.ending;
 DELETE FROM vuihoc."BUOI_HOC" b USING demo_reporting_terms p WHERE b.malop=p.madinhdanh AND b.ngayhoc>p.ending;
 UPDATE vuihoc."LOP_HOC" SET ngaytao=(least(ngaybatdau-(right(madinhdanh,3)::integer%5+1),date '2026-10-05')+time '08:00') AT TIME ZONE 'Asia/Bangkok'
  WHERE madinhdanh IN(SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(1,24) i);
 IF normalized THEN
  UPDATE vuihoc."LOP_HOC" l SET ngayketthuctuychinh=p.ending FROM demo_reporting_terms p WHERE l.madinhdanh=p.madinhdanh;
 ELSE
  UPDATE vuihoc."LOP_HOC" l SET ngayketthuc=p.ending FROM demo_reporting_terms p WHERE l.madinhdanh=p.madinhdanh;
 END IF;
 DROP VIEW demo_reporting_classes;
 SET CONSTRAINTS ALL IMMEDIATE;
END $enrich_demo_reporting$;

SELECT 'Học sinh mới' loai,to_char(ngaytao AT TIME ZONE 'Asia/Bangkok','YYYY-MM') thang,count(*) so_luong
 FROM vuihoc."HOC_SINH" WHERE madinhdanh LIKE 'DEMO-HS-%' GROUP BY 2
UNION ALL SELECT 'Giáo viên mới',to_char(ngaytao AT TIME ZONE 'Asia/Bangkok','YYYY-MM'),count(*)
 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh LIKE 'DEMO-GV-%' GROUP BY 2 ORDER BY 1,2;

SELECT l.madinhdanh,l.malophoc,l.tenlophoc,l.ngaybatdau,
 vuihoc.du_lieu_quan_he('LOP_HOC',to_jsonb(l))->>'ngayketthuc' ngayketthuc
 FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh IN(SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(1,24) i)
 ORDER BY ngayketthuc,l.madinhdanh;
