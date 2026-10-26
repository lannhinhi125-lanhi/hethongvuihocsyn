-- Bổ sung 6 lớp THCS/THPT và 18 học sinh, không reset dữ liệu hiện có.
-- Chạy sau enrich_demo_reporting.sql. Dùng gv.demo25..gv.demo30 đã tạo.
-- Nếu tháng 10 đã khóa, lớp mới bắt đầu tháng 11; không ghi vào kỳ đã khóa.
DO $secondary_demo$
DECLARE r record; person record; base_class jsonb; base_student jsonb; slot text; grade_id text;
 normalized_terms boolean; lesson_source text; start_day date; version_id text; profile_day date;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 LOCK TABLE vuihoc."LOP_HOC",vuihoc."GIAO_VIEN",vuihoc."HOC_SINH",vuihoc."BUOI_HOC",vuihoc."BANG_CONG_THANG" IN SHARE ROW EXCLUSIVE MODE;
 IF (SELECT count(*) FROM vuihoc."GIAO_VIEN" WHERE madinhdanh IN
  (SELECT 'DEMO-GV-'||lpad(i::text,3,'0') FROM generate_series(25,30) i))<>6 THEN
  RAISE EXCEPTION 'Chạy enrich_demo_reporting.sql để tạo giáo viên THCS/THPT trước.';
 END IF;
 start_day:=CASE WHEN EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" WHERE kycong='2026-10' AND dakhoa) THEN date '2026-11-02' ELSE date '2026-10-19' END;
 normalized_terms:=EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='ngayketthuctuychinh');
 lesson_source:=CASE WHEN to_regclass('vuihoc."V_BUOI_HOC"') IS NULL THEN 'BUOI_HOC' ELSE 'V_BUOI_HOC' END;
 SELECT to_jsonb(l) INTO STRICT base_class FROM vuihoc."LOP_HOC" l WHERE madinhdanh='DEMO-LOP-003';
 SELECT to_jsonb(h) INTO STRICT base_student FROM vuihoc."HOC_SINH" h WHERE madinhdanh='DEMO-HS-003';
 CREATE TEMP TABLE secondary_classes ON COMMIT DROP AS
  SELECT i,'DEMO-LOP-'||lpad(i::text,3,'0') id,'DEMO-GV-'||lpad(i::text,3,'0') teacher,
   CASE WHEN i<=27 THEN 'CAP-THCS' ELSE 'CAP-THPT' END category,
   CASE WHEN i<=27 THEN i-19 ELSE i-18 END grade,
   CASE WHEN i IN (26,29) THEN 'SUB-ENG' ELSE 'SUB-MATH' END subject,
   CASE WHEN i IN (26,29) THEN 2 ELSE 1 END firstday,
   CASE WHEN i<=27 THEN '16:15-17:45' ELSE '18:00-19:30' END hours,
   CASE WHEN i%2=0 THEN date '2026-12-18' ELSE date '2026-11-27' END ending,
   NOT EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh='DEMO-LOP-'||lpad(i::text,3,'0')) is_new
  FROM generate_series(25,30) n(i);
 CREATE TEMP TABLE secondary_old_lessons ON COMMIT DROP AS
  SELECT b.madinhdanh FROM vuihoc."BUOI_HOC" b JOIN secondary_classes c ON c.id=b.malop;

 FOR r IN SELECT * FROM secondary_classes ORDER BY i LOOP
  SELECT greatest(date '2026-10-12',(ngaytao AT TIME ZONE 'Asia/Bangkok')::date) INTO STRICT profile_day FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=r.teacher;
  SELECT madinhdanh INTO STRICT grade_id FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=r.category AND nhan='Lớp '||r.grade;
  IF to_regclass('vuihoc."V_KHUNG_GIO"') IS NOT NULL THEN
   EXECUTE 'SELECT madinhdanh FROM vuihoc."V_KHUNG_GIO" WHERE regexp_replace(khoanggio,''\s'','''',''g'')=$1 AND danghoatdong ORDER BY madinhdanh LIMIT 1' INTO slot USING r.hours;
  ELSE
   SELECT madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=r.hours AND danghoatdong ORDER BY madinhdanh LIMIT 1;
  END IF;
  IF slot IS NULL THEN RAISE EXCEPTION 'Thiếu khung giờ %',r.hours; END IF;
  IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=r.id AND malophoc<>'DEMO-'||r.category||'-'||r.grade) THEN
   RAISE EXCEPTION 'Mã lớp % đã được sử dụng cho dữ liệu khác.',r.id;
  END IF;
  INSERT INTO vuihoc."LOP_HOC"
   SELECT (jsonb_populate_record(NULL::vuihoc."LOP_HOC",base_class||jsonb_build_object(
    'madinhdanh',r.id,'malophoc','DEMO-'||r.category||'-'||r.grade,
    'tenlophoc',(CASE WHEN r.subject='SUB-ENG' THEN 'Tiếng Anh' ELSE 'Toán' END)||' lớp '||r.grade||' — Nhóm tiến bộ',
    'macaphoc',r.category,'makhoi',grade_id,'khoi','Lớp '||r.grade,'mamonhoc',r.subject,'matrinhdo','LVL-STD','mamohinh','1-3','sisotoida',3,
    'magiaovien',r.teacher,'trangthai',CASE WHEN start_day>(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date THEN 'CHO_KHAI_GIANG' ELSE 'DANG_HOC' END,'tamdunglich',false,'lydotamdung',NULL,'ghichutamdung',NULL,
    'ngaybatdau',start_day,'ngayketthuc',r.ending,'ngayketthuctuychinh',r.ending,'thoihanthang',NULL,'mathoihan',NULL,'madanhmucthoihan',NULL,
    'lienketphonghoc','https://example.com/demo/secondary/rooms/'||r.i,
    'ngaytao',profile_day,'ngaycapnhat',profile_day))).*
   ON CONFLICT(madinhdanh) DO NOTHING;
  INSERT INTO vuihoc."LICH_LOP"(malop,thutu,thutrongtuan,makhunggio)
   VALUES(r.id,1,r.firstday,slot),(r.id,2,r.firstday+3,slot) ON CONFLICT DO NOTHING;

  -- Reserve the new class slots only when the teacher has no schedule yet.
  IF to_regclass('vuihoc."PHIEN_BAN_LICH_RANH"') IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM vuihoc."PHIEN_BAN_LICH_RANH" WHERE magiaovien=r.teacher) THEN
    INSERT INTO vuihoc."PHIEN_BAN_LICH_RANH"(magiaovien,hieuluctu)
     SELECT r.teacher,ngaytao FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=r.teacher RETURNING madinhdanh INTO version_id;
    INSERT INTO vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH"(maphienban,makhunggio,thutrongtuan,trangthai)
     SELECT version_id,slot,d,CASE WHEN d IN(r.firstday-1,r.firstday+2) THEN 'busy' ELSE 'none' END FROM generate_series(0,6) d;
   END IF;
  ELSE
   INSERT INTO vuihoc."LICH_RANH_DINH_KY"(magiaovien,makhunggio,thutrongtuan,trangthai)
    SELECT r.teacher,slot,d,CASE WHEN d IN(r.firstday-1,r.firstday+2) THEN 'busy' ELSE 'none' END FROM generate_series(0,6) d ON CONFLICT DO NOTHING;
  END IF;

  FOR person IN SELECT j,120+(r.i-25)*3+j student_i,
   (ARRAY['Nguyễn Hải Nam','Trần Ngọc Ánh','Lê Minh Đức','Phạm Khánh Vy','Hoàng Tuấn Kiệt','Vũ Thu Hiền',
    'Đặng Quang Minh','Bùi Hà Phương','Đỗ Gia Bảo','Ngô Minh Anh','Dương Anh Dũng','Đinh Thanh Huyền',
    'Nguyễn Quốc Hưng','Trần Quỳnh Mai','Lê Đức Thắng','Phạm Bảo Trân','Hoàng Minh Nhật','Vũ Ngọc Diệp'])[(r.i-25)*3+j] name
   FROM generate_series(1,3) j LOOP
   INSERT INTO vuihoc."HOC_SINH"
    SELECT (jsonb_populate_record(NULL::vuihoc."HOC_SINH",base_student||jsonb_build_object(
     'madinhdanh','DEMO-HS-'||lpad(person.student_i::text,3,'0'),'hoten',person.name,'macaphoc',r.category,'makhoi',grade_id,
     'mamonhoc',r.subject,'matrinhdo','LVL-STD','mamohinh','1-3','trangthai','DANG_HOC',
     'hotencha',split_part(person.name,' ',1)||' Văn Hòa','sodienthoaicha','093200'||lpad(person.student_i::text,4,'0'),
     'hotenme','Nguyễn Thị Hạnh','sodienthoaime','094200'||lpad(person.student_i::text,4,'0'),
     'ngaytao',profile_day,'ngaycapnhat',profile_day))).*
    ON CONFLICT(madinhdanh) DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh='DEMO-HS-'||lpad(person.student_i::text,3,'0') AND mamonhoc=r.subject) THEN
    IF to_regclass('vuihoc."V_DANG_KY_MON_HOC"') IS NOT NULL THEN
     INSERT INTO vuihoc."V_DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
      VALUES('DEMO-HS-'||lpad(person.student_i::text,3,'0'),r.subject,'LVL-STD','1-3',r.id,'DANG_HOC',(profile_day+time '08:00') AT TIME ZONE 'Asia/Bangkok');
    ELSE
     INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
      VALUES('DEMO-HS-'||lpad(person.student_i::text,3,'0'),r.subject,'LVL-STD','1-3',r.id,'DANG_HOC',(profile_day+time '08:00') AT TIME ZONE 'Asia/Bangkok');
    END IF;
    INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC"(mahocsinh,mamonhoc,thutu,thutrongtuan,makhunggio)
     VALUES('DEMO-HS-'||lpad(person.student_i::text,3,'0'),r.subject,1,r.firstday,slot),('DEMO-HS-'||lpad(person.student_i::text,3,'0'),r.subject,2,r.firstday+3,slot);
   END IF;
  END LOOP;
  IF r.is_new THEN UPDATE vuihoc."TRUY_VET_XEP_LOP" SET thoigian=(profile_day+time '08:00') AT TIME ZONE 'Asia/Bangkok'
   WHERE malopcu IS NULL AND malopmoi=r.id AND mahocsinh IN(SELECT 'DEMO-HS-'||lpad((120+(r.i-25)*3+j)::text,3,'0') FROM generate_series(1,3) j); END IF;
  IF r.is_new THEN UPDATE vuihoc."GIAO_VIEN" SET trangthai='DANG_DAY' WHERE madinhdanh=r.teacher AND trangthai='CHO_LOP'; END IF;
 END LOOP;

 -- Stage two weekly materials before using the application's schedule generator.
 -- Planned fixture materials may belong to a class awaiting its November start.
 -- Suspend only this UI lifecycle guard while loading, then restore its exact mode.
 SET CONSTRAINTS ALL IMMEDIATE;
 CREATE TEMP TABLE secondary_material_guards ON COMMIT DROP AS
  SELECT t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
  WHERE t.tgrelid='vuihoc."HOC_LIEU_LOP"'::regclass AND NOT t.tgisinternal AND p.proname='chan_hoc_lieu_lop_ngung';
 FOR r IN SELECT * FROM secondary_material_guards LOOP
  EXECUTE format('ALTER TABLE vuihoc."HOC_LIEU_LOP" DISABLE TRIGGER %I',r.tgname);
 END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_LIEU_LOP' AND column_name='mahoclieu') THEN
  INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,tungay,denngay,sobuoi,tieude,lienketslide,lienketlms)
   SELECT c.id,d::date,d::date+6,s,'Ôn tập và vận dụng — Buổi '||s,
    'https://example.com/demo/secondary/materials/'||c.i||'/'||d::date||'/'||s,'https://example.com/demo/secondary/exercises/'||c.i||'/'||d::date||'/'||s
   FROM secondary_classes c CROSS JOIN LATERAL generate_series(start_day::timestamp,c.ending::timestamp,interval '7 days') d CROSS JOIN generate_series(1,2) s
   WHERE NOT EXISTS(SELECT 1 FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=c.id AND h.tungay=d::date AND h.sobuoi=s);
 ELSE
  INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
   SELECT c.id,row_number() OVER(PARTITION BY c.id ORDER BY d,s),to_char(d,'MM/YYYY'),
    'Tuần '||extract(week FROM d)||': Từ ngày '||to_char(d,'DD/MM/YYYY')||' đến ngày '||to_char(d+interval '6 days','DD/MM/YYYY'),s,'Ôn tập và vận dụng — Buổi '||s,
    'https://example.com/demo/secondary/materials/'||c.i||'/'||d::date||'/'||s,'https://example.com/demo/secondary/exercises/'||c.i||'/'||d::date||'/'||s
   FROM secondary_classes c CROSS JOIN LATERAL generate_series(start_day::timestamp,c.ending::timestamp,interval '7 days') d CROSS JOIN generate_series(1,2) s
   ON CONFLICT DO NOTHING;
 END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 FOR r IN SELECT * FROM secondary_material_guards LOOP
  EXECUTE format('ALTER TABLE vuihoc."HOC_LIEU_LOP" %s TRIGGER %I',CASE r.tgenabled WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.tgname);
 END LOOP;
 PERFORM vuihoc.dong_bo_ca_theo_lich(start_day,date '2026-11-30');
 PERFORM vuihoc.dong_bo_ca_theo_lich(date '2026-12-01',date '2026-12-31');

 CREATE TEMP TABLE secondary_new_lessons ON COMMIT DROP AS
  SELECT b.madinhdanh,c.i,row_number() OVER(PARTITION BY c.id ORDER BY b.ngayhoc) n
  FROM vuihoc."BUOI_HOC" b JOIN secondary_classes c ON c.id=b.malop
  WHERE NOT EXISTS(SELECT 1 FROM secondary_old_lessons old WHERE old.madinhdanh=b.madinhdanh);
 EXECUTE format($clocks$
  UPDATE vuihoc."BUOI_HOC" b SET vaolopluc=((s.ngayhoc+s.batdau) AT TIME ZONE 'Asia/Bangkok')+CASE WHEN x.i=26 AND x.n=2 THEN interval '8 minutes' ELSE interval '-2 minutes' END,
   ketthucluc=vuihoc.gio_ket_thuc_ca(s.ngayhoc,s.batdau,s.ketthuc)-CASE WHEN x.i=27 AND x.n=2 THEN interval '12 minutes' ELSE interval '0 minutes' END,
   manguoivaolop=b.magiaovienchinh,manguoiketthuc=b.magiaovienchinh,
   chuyencan=CASE WHEN x.i=26 AND x.n=2 THEN 'LATE' ELSE 'ATTENDED' END,
   nhatky='Đã ôn tập kiến thức và hướng dẫn học sinh vận dụng.',lienketbanghi='https://example.com/demo/secondary/recordings/'||x.i||'/'||x.n
  FROM vuihoc.%I s JOIN secondary_new_lessons x ON x.madinhdanh=s.madinhdanh
  WHERE b.madinhdanh=s.madinhdanh AND s.ngayhoc<(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date
   AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(s.ngayhoc,'YYYY-MM') AND p.dakhoa)
 $clocks$,lesson_source);
 INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi,mahocsinh,trangthai,ghichu,manguoicapnhat)
  SELECT n.mabuoi,n.mahocsinh,CASE WHEN x.i=28 AND x.n=2 AND right(n.mahocsinh,3)::integer%3=0 THEN 'absent' ELSE 'present' END,'',b.magiaovienchinh
  FROM vuihoc."NHAN_XET_BUOI_HOC" n JOIN secondary_new_lessons x ON x.madinhdanh=n.mabuoi JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=n.mabuoi
  ON CONFLICT DO NOTHING;
 UPDATE vuihoc."NHAN_XET_BUOI_HOC" n SET noidung=CASE WHEN EXISTS(SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" a WHERE a.mabuoi=n.mabuoi AND a.mahocsinh=n.mahocsinh AND a.trangthai='absent')
  THEN 'Con vắng buổi học; gia đình hỗ trợ con xem lại học liệu và hoàn thành bài luyện tập.' ELSE 'Con nắm được kiến thức trọng tâm, hoàn thành bài luyện tập và cần tiếp tục ôn bài sau buổi học.' END,
  manguoicapnhat=b.magiaovienchinh,ngaycapnhat=b.ketthucluc
  FROM secondary_new_lessons x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.madinhdanh
  WHERE n.mabuoi=x.madinhdanh AND b.ketthucluc IS NOT NULL
   AND NOT(x.i=29 AND x.n=1 AND n.mahocsinh=(SELECT min(q.mahocsinh) FROM vuihoc."NHAN_XET_BUOI_HOC" q WHERE q.mabuoi=n.mabuoi));
 PERFORM vuihoc.kiem_tra_dang_ky_mon();
 SET CONSTRAINTS ALL IMMEDIATE;
END $secondary_demo$;

SELECT 'Giáo viên' hang_muc,count(*) so_luong FROM vuihoc."GIAO_VIEN"
UNION ALL SELECT 'Học sinh',count(*) FROM vuihoc."HOC_SINH"
UNION ALL SELECT 'Lớp THCS/THPT bổ sung',count(*) FROM vuihoc."LOP_HOC" WHERE madinhdanh IN(SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(25,30) i);
