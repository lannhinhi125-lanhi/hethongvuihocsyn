-- Tinh gọn CSDL; chạy sau timed_workflow và teacher_evaluations.
-- Không suy đoán giờ kết thúc thực tế của ca cũ. *_CU giữ nguyên ý nghĩa trạng thái cũ.
BEGIN;
DO $status$ DECLARE t text; c record; BEGIN
 FOREACH t IN ARRAY ARRAY['HOC_SINH','LOP_HOC','BUOI_HOC'] LOOP
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid=format('vuihoc.%I',t)::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%trangthai%' LOOP
   EXECUTE format('ALTER TABLE vuihoc.%I DROP CONSTRAINT %I',t,c.conname);
  END LOOP;
 END LOOP;
END $status$;
UPDATE vuihoc."HOC_SINH" SET trangthai=CASE trangthai WHEN 'Chờ xếp lớp' THEN 'CHO_XEP_LOP' WHEN 'Đang học' THEN 'DANG_HOC' WHEN 'Bảo lưu' THEN 'BAO_LUU' WHEN 'Đã thôi học' THEN 'DA_THOI_HOC' ELSE trangthai END;
UPDATE vuihoc."LOP_HOC" SET trangthai=CASE trangthai WHEN 'Chờ khai giảng' THEN 'CHO_KHAI_GIANG' WHEN 'Đang học' THEN 'DANG_HOC' WHEN 'Tạm dừng' THEN 'TAM_DUNG' WHEN 'Đã kết thúc' THEN 'DA_KET_THUC' ELSE trangthai END;
ALTER TABLE vuihoc."HOC_SINH" ADD CONSTRAINT hoc_sinh_trangthai_code CHECK(trangthai IN ('CHO_XEP_LOP','DANG_HOC','BAO_LUU','DA_THOI_HOC'));
ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_trangthai_code CHECK(trangthai IN ('CHO_KHAI_GIANG','DANG_HOC','TAM_DUNG','DA_KET_THUC'));
ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_hoc_trangthai_code CHECK(trangthai IN ('CHUA_DIEN_RA','DANG_HOC','HOAN_THANH','HUY','NGHI_HOC','DA_HOC_CU','DAY_THAY_CU','CO_SU_CO_CU','KHAI_GIANG_CU'));
ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_hoc_checkin CHECK(trangthai NOT IN ('DANG_HOC','HOAN_THANH') OR vaolopluc IS NOT NULL);
ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_hoc_checkout CHECK(trangthai<>'HOAN_THANH' OR ketthucluc IS NOT NULL);

-- Staging có cùng cấu trúc với CA_HOC cũ; fresh schema cung cấp staging trước đoạn này.
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ALTER COLUMN baoluc DROP NOT NULL;
DO $stage$ BEGIN
 IF to_regclass('vuihoc."CA_HOC"') IS NOT NULL THEN
  IF to_regclass('pg_temp._legacy_ca_hoc') IS NOT NULL THEN RAISE EXCEPTION 'Staging đã tồn tại'; END IF;
  CREATE TEMP TABLE _legacy_ca_hoc ON COMMIT DROP AS SELECT * FROM vuihoc."CA_HOC";
 END IF;
END $stage$;
DO $move$
DECLARE r record; hs jsonb; lop text; gv text; cover text; slot text; buoi text; n integer; mapped text;
BEGIN
 IF to_regclass('pg_temp._legacy_ca_hoc') IS NULL THEN RETURN; END IF;
 FOR r IN SELECT * FROM _legacy_ca_hoc LOOP
  SELECT count(*),min(madinhdanh) INTO n,lop FROM vuihoc."LOP_HOC" WHERE malophoc=r.malophoc;
  IF n<>1 THEN RAISE EXCEPTION 'Ca %: không xác định được lớp %',r.macahoc,r.malophoc; END IF;
  SELECT count(*),min(madinhdanh) INTO n,gv FROM vuihoc."GIAO_VIEN" WHERE hoten=r.giaovienchinh;
  IF n<>1 THEN RAISE EXCEPTION 'Ca %: tên giáo viên chính thiếu hoặc trùng: %',r.macahoc,r.giaovienchinh; END IF;
  cover:=NULL;
  IF nullif(r.giaoviendaythay,'') IS NOT NULL THEN
   SELECT count(*),min(madinhdanh) INTO n,cover FROM vuihoc."GIAO_VIEN" WHERE hoten=r.giaoviendaythay;
   IF n<>1 THEN RAISE EXCEPTION 'Ca %: tên giáo viên thay thiếu hoặc trùng',r.macahoc; END IF;
  END IF;
  SELECT count(*),min(madinhdanh) INTO n,slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=regexp_replace(r.cahoc,'\s','','g');
  IF n<>1 THEN RAISE EXCEPTION 'Ca %: không xác định được khung giờ %',r.macahoc,r.cahoc; END IF;
  mapped:=CASE r.trangthai WHEN 'DA_HOC' THEN 'DA_HOC_CU' WHEN 'CHUA_HOC' THEN 'CHUA_DIEN_RA' WHEN 'NGHI_HOC' THEN 'NGHI_HOC' WHEN 'DAY_THAY' THEN 'DAY_THAY_CU' WHEN 'CO_SU_CO' THEN 'CO_SU_CO_CU' WHEN 'KHAI_GIANG' THEN 'KHAI_GIANG_CU' ELSE NULL END;
  IF mapped IS NULL THEN RAISE EXCEPTION 'Ca %: trạng thái chưa hỗ trợ %',r.macahoc,r.trangthai; END IF;
  buoi:=r.macahoc;
  IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE (malop=lop AND ngayhoc=r.ngayhoc::date AND makhunggio=slot) OR madinhdanh=buoi) THEN
   RAISE EXCEPTION 'Ca % đã tồn tại trong BUOI_HOC; cần đối soát trước khi gộp',r.macahoc;
  END IF;
  INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,magiaoviendaythay,lienketphonghoc,lienketbanghi,trangthai,vaolopluc,chuyencan,nhatky)
  VALUES(buoi,lop,r.ngayhoc::date,slot,(r.ngayhoc||' '||trim(split_part(r.cahoc,'-',1)))::timestamp AT TIME ZONE 'Asia/Bangkok',(r.ngayhoc||' '||trim(split_part(r.cahoc,'-',2)))::timestamp AT TIME ZONE 'Asia/Bangkok',gv,cover,r.lienketphonghoc,r.lienketbanghi,mapped,CASE WHEN nullif(r.giovaolop,'') IS NOT NULL THEN (r.ngayhoc||' '||r.giovaolop)::timestamp AT TIME ZONE 'Asia/Bangkok' END,CASE WHEN mapped='CHUA_DIEN_RA' THEN NULL ELSE r.diemdanh END,r.nhatkybuoihoc);
  FOR hs IN SELECT value FROM jsonb_array_elements(r.danhsachhocsinh) LOOP
   IF NOT EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" WHERE madinhdanh=hs->>'code') THEN RAISE EXCEPTION 'Ca %: mã học sinh không tồn tại %',buoi,hs->>'code'; END IF;
   IF hs->>'attendance' IN ('Có mặt','Đi muộn','Vắng','Vắng có phép','Vắng không phép','present','late','absent') THEN
    INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi,mahocsinh,trangthai,ghichu) VALUES(buoi,hs->>'code',CASE WHEN hs->>'attendance' IN ('Có mặt','present') THEN 'present' WHEN hs->>'attendance' IN ('Đi muộn','late') THEN 'late' ELSE 'absent' END,hs->>'attendance');
   ELSIF nullif(hs->>'attendance','') IS NOT NULL AND hs->>'attendance'<>'Chưa diễn ra' THEN RAISE EXCEPTION 'Ca %: điểm danh chưa hỗ trợ %',buoi,hs->>'attendance'; END IF;
   IF nullif(hs->>'aiComment','') IS NOT NULL OR coalesce(hs->'criteria','[]'::jsonb)<>'[]'::jsonb THEN
    INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung,tieuchidachon) VALUES(buoi,hs->>'code',coalesce(hs->>'aiComment',''),jsonb_build_object('legacyCriteria',coalesce(hs->'criteria','[]'::jsonb)));
   END IF;
  END LOOP;
  IF r.cosuco THEN
   INSERT INTO vuihoc."SU_CO_BUOI_HOC"(madinhdanh,mabuoi,manhomsuco,masuco,tensuco,muckhancap,noidung,trangthai,manguoixuly,baoluc,xulyluc)
   VALUES('LEGACY-INC-'||buoi,buoi,r.manhomsuco,r.masuco,r.masuco,r.muckhancap,r.ghichusuco,coalesce(r.trangthaisuco,'DANG_XU_LY'),r.manguoixuly,NULL,nullif(r.thoigianxuly,'')::timestamptz);
  END IF;
 END LOOP;
END $move$;
DROP TABLE IF EXISTS vuihoc."CA_HOC";
ALTER TABLE vuihoc."GIAO_VIEN" DROP COLUMN IF EXISTS tenmonhoc, DROP COLUMN IF EXISTS tencaphoc, DROP COLUMN IF EXISTS tentrangthai;
ALTER TABLE vuihoc."LOP_HOC" DROP COLUMN IF EXISTS hotengiaovien;
-- Biên bản cũ thiếu mã người đánh giá phải được gắn mã trước khi bỏ tên.
DO $check$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BIEN_BAN_DU_GIO' AND column_name='hotennguoidanhgia') THEN
  IF EXISTS(SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" WHERE manguoidanhgia IS NULL) THEN RAISE EXCEPTION 'Biên bản dự giờ thiếu mã người đánh giá; bổ sung mã trước khi tinh gọn'; END IF;
 END IF;
END $check$;
ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" DROP COLUMN IF EXISTS hotennguoidanhgia, DROP COLUMN IF EXISTS vaitronguoidanhgia, DROP COLUMN IF EXISTS tenlophoc;
NOTIFY pgrst,'reload schema';
COMMIT;
