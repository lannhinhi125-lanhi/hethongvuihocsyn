-- Run after 20261016_complete_foreign_keys.sql. Replaces the UNAPPLIED draft
-- 20261017_persist_monitoring_status.sql. One status column, no extra JSON.
BEGIN;
LOCK TABLE vuihoc."BUOI_HOC",vuihoc."NHAN_XET_BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
DO $checks$
DECLARE r record;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name='trangthaica') THEN
  RAISE EXCEPTION 'Đã chạy bản nháp trangthaica; cần đối soát trước khi chạy bản này';
 END IF;
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."BUOI_HOC"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%trangthai%' LOOP
  EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" DROP CONSTRAINT %I',r.conname);
 END LOOP;
END $checks$;
ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_hoc_trangthai_lifecycle CHECK(trangthai IN
 ('CHUA_DIEN_RA','CHUA_HOC','DANG_HOC','CHUA_HOAN_TAT','DA_HOC','NGHI_HOC','HUY','HOAN_THANH','DA_HOC_CU','DAY_THAY_CU','CO_SU_CO_CU','KHAI_GIANG_CU'));

CREATE OR REPLACE FUNCTION vuihoc.trang_thai_ca_theo_du_lieu(p_ngay date,p_batdau time,p_ketthuc time,
 p_vaolop timestamptz,p_ralop timestamptz,p_trangthai text,p_now timestamptz DEFAULT statement_timestamp())
RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN p_trangthai IN ('HUY','NGHI_HOC') THEN 'NGHI_HOC'
 WHEN p_trangthai IN ('DA_HOC_CU','DAY_THAY_CU') THEN p_trangthai
 WHEN p_now<(p_ngay+p_batdau) AT TIME ZONE 'Asia/Bangkok' THEN 'CHUA_DIEN_RA'
 WHEN p_vaolop IS NULL THEN 'CHUA_HOC'
 WHEN p_ralop IS NOT NULL THEN 'DA_HOC'
 WHEN p_now<((p_ngay+CASE WHEN p_ketthuc<p_batdau THEN 1 ELSE 0 END)+p_ketthuc) AT TIME ZONE 'Asia/Bangkok' THEN 'DANG_HOC'
 ELSE 'CHUA_HOAN_TAT' END
$$;
CREATE OR REPLACE FUNCTION vuihoc.cap_nhat_trang_thai_ca() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 NEW.trangthai:=vuihoc.trang_thai_ca_theo_du_lieu(NEW.ngayhoc,NEW.batdau,NEW.ketthuc,NEW.vaolopluc,NEW.ketthucluc,NEW.trangthai);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cap_nhat_trang_thai_ca ON vuihoc."BUOI_HOC";
CREATE TRIGGER cap_nhat_trang_thai_ca BEFORE INSERT OR UPDATE ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.cap_nhat_trang_thai_ca();

-- Blank comment rows capture the actual class roster at check-in. This uses
-- the existing feedback table, not a stored array or another status table.
CREATE OR REPLACE FUNCTION vuihoc.hoc_sinh_nhan_xet_ca(p_buoi text) RETURNS TABLE(mahocsinh text)
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT n.mahocsinh FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=p_buoi
 UNION ALL
 SELECT h.madinhdanh FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 JOIN vuihoc."HOC_SINH" h ON h.malophientai=l.malophoc WHERE b.madinhdanh=p_buoi
 AND NOT EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=p_buoi)
$$;
CREATE OR REPLACE FUNCTION vuihoc.tien_do_nhan_xet_ca(p_buoi text) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('total',count(*),'completed',count(*) FILTER(WHERE btrim(coalesce(n.noidung,''))<>''),
 'state',CASE WHEN count(*) FILTER(WHERE btrim(coalesce(n.noidung,''))<>'')=0 THEN 'CHUA_NHAN_XET'
 WHEN count(*) FILTER(WHERE btrim(coalesce(n.noidung,''))<>'')=count(*) THEN 'DA_DU' ELSE 'CHUA_DU' END,
 'studentIds',coalesce(jsonb_agg(h.mahocsinh ORDER BY h.mahocsinh),'[]'))
 FROM vuihoc.hoc_sinh_nhan_xet_ca(p_buoi) h LEFT JOIN vuihoc."NHAN_XET_BUOI_HOC" n ON n.mabuoi=p_buoi AND n.mahocsinh=h.mahocsinh
$$;
CREATE OR REPLACE FUNCTION vuihoc.ca_du_dieu_kien_ghi_cong(p_buoi text) RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(b.trangthai='DA_HOC' AND b.vaolopluc IS NOT NULL AND b.ketthucluc IS NOT NULL
 AND (p.value->>'total')::integer>0 AND p.value->>'state'='DA_DU',false)
 FROM vuihoc."BUOI_HOC" b CROSS JOIN LATERAL (SELECT vuihoc.tien_do_nhan_xet_ca(b.madinhdanh) value) p WHERE b.madinhdanh=p_buoi
$$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_neu_du_nhan_xet(p_buoi text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b vuihoc."BUOI_HOC"; i vuihoc."SU_CO_BUOI_HOC"; is_teacher boolean; target text;
BEGIN
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi FOR UPDATE;
 IF NOT coalesce(vuihoc.ca_du_dieu_kien_ghi_cong(p_buoi),false) THEN RETURN; END IF;
 target:=coalesce(b.magiaoviendaythay,b.magiaovienchinh);
 -- Preserve existing approved/adjusted work rather than resetting its credit.
 IF EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=p_buoi AND magiaovien=target) THEN RETURN; END IF;
 SELECT * INTO i FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=p_buoi AND hesocongapdung IS NOT NULL ORDER BY baoluc DESC,madinhdanh DESC LIMIT 1;
 SELECT manhomsuco='GRP-TCH' INTO is_teacher FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh=i.manhomsuco;
 IF is_teacher AND b.magiaoviendaythay IS NOT NULL THEN i:=NULL; END IF;
 PERFORM vuihoc.ghi_ca_vao_bang_cong(p_buoi,target,coalesce(i.hesocongapdung,1),
 CASE WHEN i.madinhdanh IS NOT NULL THEN 'EMERGENCY' WHEN b.magiaoviendaythay IS NOT NULL THEN 'COVER' ELSE 'STANDARD' END,
 i.madinhdanh,CASE WHEN i.madinhdanh IS NULL THEN '' ELSE 'Sự cố '||i.masuco||' ('||i.madinhdanh||')' END,false);
END $$;
CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['trangthai','ngaycapnhat']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['trangthai','ngaycapnhat']) THEN RETURN NEW; END IF;
 END IF;
 IF NEW.vaolopluc IS NOT NULL AND (TG_OP='INSERT' OR OLD.vaolopluc IS NULL) THEN
  INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung)
   SELECT NEW.madinhdanh,h,'' FROM unnest(vuihoc.hoc_sinh_lop(NEW.malop)) h ON CONFLICT DO NOTHING;
 END IF;
 PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(NEW.madinhdanh);
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_khi_luu_nhan_xet() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE id text:=CASE WHEN TG_OP='DELETE' THEN OLD.mabuoi ELSE NEW.mabuoi END;
BEGIN
 IF TG_OP='DELETE' AND EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE madinhdanh=id AND vaolopluc IS NOT NULL) THEN
  RAISE EXCEPTION 'Không được xóa học sinh khỏi danh sách nhận xét của ca đã vào lớp';
 END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=id AND c.loaicong IN ('STANDARD','COVER'))
  AND NOT coalesce(vuihoc.ca_du_dieu_kien_ghi_cong(id),false) THEN
  RAISE EXCEPTION 'Ca đã ghi công: không được xóa hoặc để trống nhận xét';
 END IF;
 PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(id);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS ghi_cong_khi_luu_nhan_xet ON vuihoc."NHAN_XET_BUOI_HOC";
CREATE TRIGGER ghi_cong_khi_luu_nhan_xet AFTER INSERT OR UPDATE OR DELETE ON vuihoc."NHAN_XET_BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_cong_khi_luu_nhan_xet();

DO $functions$
DECLARE f text; r record;
BEGIN
 f:=pg_get_functiondef('vuihoc.kiem_tra_ky_cong_buoi()'::regprocedure);
 IF position('lifecycle_clock_only' IN f)=0 THEN
  f:=regexp_replace(f,'\mBEGIN\M',$patch$BEGIN
  -- lifecycle_clock_only
  IF TG_TABLE_NAME='BUOI_HOC' AND TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-ARRAY['trangthai','ngaycapnhat']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['trangthai','ngaycapnhat'])
    AND NEW.trangthai=vuihoc.trang_thai_ca_theo_du_lieu(NEW.ngayhoc,NEW.batdau,NEW.ketthuc,NEW.vaolopluc,NEW.ketthucluc,NEW.trangthai) THEN RETURN NEW; END IF;
  END IF;$patch$); EXECUTE f;
 END IF;
 -- Existing historical projections must recognize the normal ended state.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%''HOAN_THANH'',''DA_HOC_CU''%' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,'''DA_HOC'',''HOAN_THANH'',''DA_HOC_CU''','''HOAN_THANH'',''DA_HOC_CU''');
  f:=replace(f,'''HOAN_THANH'',''DA_HOC_CU''','''DA_HOC'',''HOAN_THANH'',''DA_HOC_CU'''); EXECUTE f;
 END LOOP;
 f:=pg_get_functiondef('vuihoc.lop_truong_truy_van(jsonb)'::regprocedure);
 f:=replace(f,'CASE WHEN c.conhanxet THEN','CASE WHEN true THEN');
 f:=replace(f,'c.trangthaihienthi',$status$CASE WHEN b.trangthai IN ('DA_HOC','HOAN_THANH','DA_HOC_CU','DAY_THAY_CU') THEN 'Đã hoàn thành'
 WHEN b.trangthai='DANG_HOC' THEN 'Đang học' WHEN b.trangthai='CHUA_HOC' THEN 'Chưa học'
 WHEN b.trangthai='CHUA_HOAN_TAT' THEN 'Chưa hoàn tất' WHEN b.trangthai IN ('HUY','NGHI_HOC') THEN 'Nghỉ có phép' ELSE 'Chưa diễn ra' END$status$); EXECUTE f;
 -- Completion is driven by actual check-out. Feedback is independently saved.
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 f:=replace(f,'tieude,trangthaihienthi,giovaohienthi','tieude,giovaohienthi');
 f:=replace(f,'s->>''title'',s->>''status'',s->>''checkinTime''','s->>''title'',s->>''checkinTime''');
 f:=replace(f,'trangthaihienthi=excluded.trangthaihienthi,','');
 f:=replace(f,'IF NOT a.key=ANY(vuihoc.hoc_sinh_lop(cls.madinhdanh)) THEN',
  'IF NOT a.key=ANY(vuihoc.hoc_sinh_lop(cls.madinhdanh)) AND NOT EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=lesson AND mahocsinh=a.key) THEN');
 EXECUTE f;
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_luong_ca(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_luong_ca;
 END IF;
END $functions$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_tu_cac_truong(p_lop jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s jsonb; id text;
BEGIN
 FOR s IN SELECT value FROM jsonb_each(coalesce(p_lop->'chitietcahoc','{}')) LOOP
  SELECT b.madinhdanh INTO id FROM vuihoc."BUOI_HOC" b JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
  WHERE b.malop=p_lop->>'madinhdanh' AND b.ngayhoc=left(s->>'dateStr',10)::date
   AND regexp_replace(k.khoanggio,'\s','','g')=regexp_replace(substring(s->>'dateStr' FROM '[0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}:[0-9]{2}'),'\s','','g');
  IF id IS NOT NULL THEN PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(id); END IF;
 END LOOP;
END $$;
-- Archive the old presentation value before removing its duplicate column.
DO $presentation$
DECLARE r jsonb; id uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CHI_TIET_CA_LOP' AND column_name='trangthaihienthi') THEN
  FOR r IN EXECUTE 'SELECT to_jsonb(c) FROM vuihoc."CHI_TIET_CA_LOP" c' LOOP
   INSERT INTO vuihoc."SU_KIEN_NGHIEP_VU"(tenbang,thaotac,truongthaydoi) VALUES('CHI_TIET_CA_LOP','UPDATE',ARRAY['BO_TRANG_THAI_TRUNG_20261017']) RETURNING madinhdanh INTO id;
   PERFORM vuihoc.ghi_chi_tiet_nhat_ky(id,'TRUOC',r);
  END LOOP;
 END IF;
END $presentation$;
ALTER TABLE vuihoc."CHI_TIET_CA_LOP" DROP COLUMN IF EXISTS trangthaihienthi;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 IF p_table='BUOI_HOC' THEN
  p_row:=p_row||jsonb_build_object('tiendonhanxet',vuihoc.tien_do_nhan_xet_ca(p_row->>'madinhdanh'));
 END IF;
 RETURN vuihoc.du_lieu_quan_he_truoc_luong_ca(p_table,p_row);
END $$;
DO $config$
DECLARE conf jsonb:=vuihoc.business_config(); f text;
BEGIN
 IF NOT (conf->'dated_lessons'->'columns' ? 'tiendonhanxet') THEN
  conf:=jsonb_set(conf,'{dated_lessons,columns}',conf->'dated_lessons'->'columns'||'"tiendonhanxet"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF position('tiendonhanxet_readonly' IN f)=0 THEN
  f:=replace(f,'IF conf IS NULL THEN',$patch$-- tiendonhanxet_readonly
  IF coalesce(b,'{}') ? 'tiendonhanxet' OR coalesce(v,'{}') ? 'tiendonhanxet' THEN RAISE EXCEPTION 'Tiến độ nhận xét chỉ được truy vấn'; END IF;
  IF conf IS NULL THEN$patch$);
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE NOT (conf->>''table''=''BUOI_HOC'' AND k=''tiendonhanxet'') AND');
  EXECUTE f;
 END IF;
END $config$;

CREATE OR REPLACE FUNCTION vuihoc.dong_bo_ca_theo_lich(p_from date DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date,
 p_to date DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date+7) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer;
BEGIN
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>62 THEN RAISE EXCEPTION 'Khoảng đồng bộ ca không hợp lệ'; END IF;
 INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,lienketphonghoc)
 SELECT l.madinhdanh,d.d::date,s.makhunggio,btrim(split_part(k.khoanggio,'-',1))::time,btrim(split_part(k.khoanggio,'-',2))::time,l.magiaovien,l.lienketphonghoc
 FROM vuihoc."LOP_HOC" l JOIN vuihoc."LICH_LOP" s ON s.malop=l.madinhdanh JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
 CROSS JOIN generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d(d)
 WHERE l.magiaovien IS NOT NULL AND coalesce(l.trangthai,'DANG_HOC') NOT IN ('TAM_DUNG','DA_KET_THUC')
 AND extract(isodow FROM d.d)=s.thutrongtuan AND d.d::date>=coalesce(l.ngaybatdau,p_from)
 AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(d.d,'YYYY-MM') AND p.dakhoa)
 ON CONFLICT(malop,ngayhoc,makhunggio) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_trang_thai_ca() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 PERFORM vuihoc.dong_bo_ca_theo_lich();
 UPDATE vuihoc."BUOI_HOC" b SET trangthai=vuihoc.trang_thai_ca_theo_du_lieu(b.ngayhoc,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,b.trangthai)
 WHERE b.trangthai IN ('CHUA_DIEN_RA','CHUA_HOC','DANG_HOC','CHUA_HOAN_TAT','HOAN_THANH','CO_SU_CO_CU','KHAI_GIANG_CU')
 AND b.trangthai IS DISTINCT FROM vuihoc.trang_thai_ca_theo_du_lieu(b.ngayhoc,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,b.trangthai);
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
SELECT vuihoc.dong_bo_ca_theo_lich(date_trunc('month',CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date+7);
SELECT vuihoc.dong_bo_trang_thai_ca();
DO $security$
DECLARE r record;
BEGIN
 FOR r IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='vuihoc' AND p.proname IN ('trang_thai_ca_theo_du_lieu','cap_nhat_trang_thai_ca','hoc_sinh_nhan_xet_ca','tien_do_nhan_xet_ca',
 'ca_du_dieu_kien_ghi_cong','ghi_cong_neu_du_nhan_xet','ghi_cong_khi_luu_nhan_xet','du_lieu_quan_he','du_lieu_quan_he_truoc_luong_ca','dong_bo_ca_theo_lich','dong_bo_trang_thai_ca') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  PERFORM cron.schedule('vuihoc-session-lifecycle','* * * * *','SELECT vuihoc.dong_bo_trang_thai_ca();');
 ELSE RAISE NOTICE 'Cần bật Supabase Cron để tự cập nhật trạng thái theo giờ'; END IF;
END $security$;
SET CONSTRAINTS ALL IMMEDIATE;
NOTIFY pgrst,'reload schema';
COMMIT;
