
-- MÔ HÌNH NGHIỆP VỤ THEO THỜI GIAN.
-- Chạy migration này sau schema.sql trên database đã tồn tại.
-- Schema mới đã bao gồm nội dung này. Không tự suy đoán/chuyển JSONB lịch sử cũ.
BEGIN;
CREATE TABLE IF NOT EXISTS vuihoc."LICH_RANH_TUAN" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 ngaydautuan date NOT NULL CHECK (extract(isodow FROM ngaydautuan)=1),
 ngaycuoituan date GENERATED ALWAYS AS (ngaydautuan + 6) STORED,
 namhoc text,
 manguoicapnhat text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 UNIQUE(magiaovien,ngaydautuan)
);
CREATE TABLE IF NOT EXISTS vuihoc."CHI_TIET_LICH_RANH" (
 malichtuan text NOT NULL REFERENCES vuihoc."LICH_RANH_TUAN"(madinhdanh) ON DELETE CASCADE,
 ngay date NOT NULL,
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh) ON DELETE RESTRICT,
 trangthai text NOT NULL CHECK (trangthai IN ('free','none')),
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(malichtuan,ngay,makhunggio)
);
-- busy được tính từ BUOI_HOC, không cho giáo viên tự đăng ký busy.
CREATE TABLE IF NOT EXISTS vuihoc."BUOI_HOC" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 malop text NOT NULL REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 ngayhoc date NOT NULL,
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh) ON DELETE RESTRICT,
 batdau timestamptz NOT NULL, ketthuc timestamptz NOT NULL,
 magiaovienchinh text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 magiaoviendaythay text REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 tieude text NOT NULL DEFAULT '',
 lienketphonghoc text NOT NULL DEFAULT '',
 hoclieu jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(hoclieu)='object'),
 trangthai text NOT NULL DEFAULT 'CHUA_DIEN_RA' CHECK (trangthai IN ('CHUA_DIEN_RA','DANG_HOC','HOAN_THANH','HUY')),
 vaolopluc timestamptz, ketthucluc timestamptz,
 manguoivaolop text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoiketthuc text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 chuyencan text CHECK (chuyencan IN ('ATTENDED','LATE','ABSENT')),
 nhatky text NOT NULL DEFAULT '', lienketbanghi text,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 UNIQUE(malop,ngayhoc,makhunggio),
 CHECK (ketthuc>batdau),
 CHECK ((batdau AT TIME ZONE 'Asia/Bangkok')::date=ngayhoc),
 CHECK (ketthucluc IS NULL OR (vaolopluc IS NOT NULL AND ketthucluc>=vaolopluc)),
 CHECK (trangthai NOT IN ('DANG_HOC','HOAN_THANH') OR vaolopluc IS NOT NULL),
 CHECK (trangthai<>'HOAN_THANH' OR ketthucluc IS NOT NULL),
 CHECK (magiaoviendaythay IS NULL OR magiaoviendaythay<>magiaovienchinh)
);
CREATE TABLE IF NOT EXISTS vuihoc."DIEM_DANH_BUOI_HOC" (
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 trangthai text NOT NULL CHECK (trangthai IN ('present','late','absent')),
 ghichu text NOT NULL DEFAULT '',
 manguoicapnhat text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(mabuoi,mahocsinh)
);
CREATE TABLE IF NOT EXISTS vuihoc."NHAN_XET_BUOI_HOC" (
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 noidung text NOT NULL DEFAULT '',
 tieuchidachon jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(tieuchidachon)='object'),
 mavanphong text REFERENCES vuihoc."VAN_PHONG_NHAN_XET"(madinhdanh) ON DELETE SET NULL,
 soluottaoai integer NOT NULL DEFAULT 0 CHECK (soluottaoai>=0),
 manguoicapnhat text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(mabuoi,mahocsinh)
);
CREATE TABLE IF NOT EXISTS vuihoc."SU_CO_BUOI_HOC" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 manhomsuco text NOT NULL REFERENCES vuihoc."DANH_MUC_SU_CO"(madinhdanh) ON DELETE RESTRICT,
 masuco text NOT NULL, tensuco text NOT NULL,
 muckhancap text CHECK (muckhancap IN ('EMERGENCY','ADVANCED')),
 noidung text NOT NULL DEFAULT '',
 trangthai text NOT NULL DEFAULT 'DANG_XU_LY' CHECK (trangthai IN ('DANG_XU_LY','DA_GIAI_QUYET','HUY_CA')),
 manguoibao text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoixuly text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 baoluc timestamptz NOT NULL DEFAULT now(), xulyluc timestamptz,
 ghichuxuly text NOT NULL DEFAULT '',
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 CHECK (xulyluc IS NULL OR xulyluc>=baoluc)
);
CREATE TABLE IF NOT EXISTS vuihoc."CONG_DAY_BUOI_HOC" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 kycong text NOT NULL REFERENCES vuihoc."BANG_CONG_THANG"(kycong) ON DELETE RESTRICT,
 vaitro text NOT NULL CHECK (vaitro IN ('CHINH','DAY_THAY')),
 hesocong numeric(6,3) NOT NULL DEFAULT 1 CHECK (hesocong>=0),
 ghichu text NOT NULL DEFAULT '',
 dagui boolean NOT NULL DEFAULT false, guiluc timestamptz,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 UNIQUE(mabuoi,magiaovien),
 UNIQUE(mabuoi)
);
-- Chính sách mẫu: một ca hoàn tất tính công cho người thực dạy (cover nếu có).
-- Sự cố không tự áp hệ số 0; vận hành điều chỉnh hệ số kèm lý do.
CREATE TABLE IF NOT EXISTS vuihoc."GIAI_TRINH_CONG_DAY" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 macong text NOT NULL REFERENCES vuihoc."CONG_DAY_BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 noidung text NOT NULL, loaisuco text NOT NULL,
 minhchung jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(minhchung)='array'),
 trangthai text NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangthai IN ('CHO_DUYET','DA_DUYET','TU_CHOI')),
 guiluc timestamptz NOT NULL DEFAULT now(),
 manguoigui text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoiduyet text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 duyetluc timestamptz, ghichuduyet text NOT NULL DEFAULT '',
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mot_giai_trinh_dang_cho ON vuihoc."GIAI_TRINH_CONG_DAY"(macong) WHERE trangthai='CHO_DUYET';
CREATE INDEX IF NOT EXISTS buoi_hoc_ngay_gv ON vuihoc."BUOI_HOC"(ngayhoc,magiaovienchinh);
CREATE INDEX IF NOT EXISTS buoi_hoc_cover ON vuihoc."BUOI_HOC"(magiaoviendaythay,ngayhoc) WHERE magiaoviendaythay IS NOT NULL;
CREATE INDEX IF NOT EXISTS su_co_buoi ON vuihoc."SU_CO_BUOI_HOC"(mabuoi);
CREATE INDEX IF NOT EXISTS cong_day_ky_gv ON vuihoc."CONG_DAY_BUOI_HOC"(kycong,magiaovien);

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ngay_lich_ranh()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE dau date;
BEGIN
 SELECT ngaydautuan INTO dau FROM vuihoc."LICH_RANH_TUAN" WHERE madinhdanh=NEW.malichtuan FOR SHARE;
 IF dau IS NULL OR NEW.ngay NOT BETWEEN dau AND dau+6 THEN
  RAISE EXCEPTION 'Ngày lịch rảnh phải nằm trong tuần đã đăng ký';
 END IF;
 RETURN NEW;
END; $fn$;
CREATE OR REPLACE FUNCTION vuihoc.khoa_dinh_danh_lich_tuan()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
 IF NEW.ngaydautuan<>OLD.ngaydautuan OR NEW.magiaovien<>OLD.magiaovien THEN
  RAISE EXCEPTION 'Tạo lịch tuần mới thay vì chuyển lịch cũ sang tuần/giáo viên khác';
 END IF;
 RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS kiem_tra_ngay ON vuihoc."CHI_TIET_LICH_RANH";
CREATE TRIGGER kiem_tra_ngay BEFORE INSERT OR UPDATE ON vuihoc."CHI_TIET_LICH_RANH" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ngay_lich_ranh();
DROP TRIGGER IF EXISTS khoa_dinh_danh ON vuihoc."LICH_RANH_TUAN";
CREATE TRIGGER khoa_dinh_danh BEFORE UPDATE ON vuihoc."LICH_RANH_TUAN" FOR EACH ROW EXECUTE FUNCTION vuihoc.khoa_dinh_danh_lich_tuan();

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ky_cong_buoi()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE d date; buoi text; ky text; khoa boolean; gv text; cover text; cong text;
BEGIN
 IF TG_TABLE_NAME='BUOI_HOC' THEN
  IF TG_OP='INSERT' THEN d:=NEW.ngayhoc; ELSE d:=OLD.ngayhoc; END IF;
  buoi:=CASE WHEN TG_OP='DELETE' THEN OLD.madinhdanh ELSE NEW.madinhdanh END;
  IF TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=OLD.madinhdanh)
    AND (NEW.ngayhoc,NEW.malop,NEW.makhunggio,NEW.magiaovienchinh,NEW.magiaoviendaythay,NEW.trangthai)
      IS DISTINCT FROM (OLD.ngayhoc,OLD.malop,OLD.makhunggio,OLD.magiaovienchinh,OLD.magiaoviendaythay,OLD.trangthai) THEN
   RAISE EXCEPTION 'Ca đã phát sinh công: không đổi định danh/người dạy/trạng thái; cần quy trình hiệu chỉnh công';
  END IF;
 ELSE
  IF TG_TABLE_NAME='GIAI_TRINH_CONG_DAY' THEN
   cong:=CASE WHEN TG_OP='DELETE' THEN OLD.macong ELSE NEW.macong END;
   SELECT mabuoi INTO buoi FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE madinhdanh=cong;
   IF TG_OP='UPDATE' AND NEW.macong<>OLD.macong THEN RAISE EXCEPTION 'Không chuyển giải trình sang bản công khác'; END IF;
  ELSE
   buoi:=CASE WHEN TG_OP='DELETE' THEN OLD.mabuoi ELSE NEW.mabuoi END;
   IF TG_OP='UPDATE' AND NEW.mabuoi<>OLD.mabuoi THEN RAISE EXCEPTION 'Không chuyển bản ghi sang ca khác'; END IF;
  END IF;
  SELECT ngayhoc,magiaovienchinh,magiaoviendaythay INTO d,gv,cover FROM vuihoc."BUOI_HOC" WHERE madinhdanh=buoi FOR SHARE;
 END IF;
 ky:=to_char(d,'YYYY-MM');
 -- Cùng thứ tự khóa với thao tác chốt kỳ; tránh ghi công đồng thời với khóa tháng.
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
 SELECT dakhoa INTO khoa FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky FOR UPDATE;
 IF khoa THEN RAISE EXCEPTION 'Kỳ công % đã khóa',ky; END IF;
 IF TG_TABLE_NAME='CONG_DAY_BUOI_HOC' AND TG_OP<>'DELETE' THEN
  IF NEW.kycong<>ky THEN RAISE EXCEPTION 'Kỳ công phải lấy từ ngày của ca học (%)',ky; END IF;
  IF NEW.magiaovien IS DISTINCT FROM coalesce(cover,gv) OR NEW.vaitro<>(CASE WHEN cover IS NULL THEN 'CHINH' ELSE 'DAY_THAY' END) THEN
   RAISE EXCEPTION 'Công phải thuộc giáo viên thực dạy của ca';
  END IF;
  IF TG_OP='UPDATE' AND NEW.hesocong<>OLD.hesocong AND btrim(NEW.ghichu)='' THEN RAISE EXCEPTION 'Điều chỉnh hệ số công cần lý do'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $fn$;

CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE ky text:=to_char(NEW.ngayhoc,'YYYY-MM');
BEGIN
 IF NEW.trangthai='HOAN_THANH' THEN
  INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES(ky,false,false) ON CONFLICT(kycong) DO NOTHING;
  INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien,kycong,vaitro)
  VALUES(NEW.madinhdanh,coalesce(NEW.magiaoviendaythay,NEW.magiaovienchinh),ky,CASE WHEN NEW.magiaoviendaythay IS NULL THEN 'CHINH' ELSE 'DAY_THAY' END)
  ON CONFLICT(mabuoi) DO NOTHING;
 END IF;
 RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS sinh_cong ON vuihoc."BUOI_HOC";
CREATE TRIGGER sinh_cong AFTER INSERT OR UPDATE ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.sinh_cong_khi_hoan_tat();

CREATE OR REPLACE VIEW vuihoc."V_CONG_DAY_THEO_CA" WITH (security_invoker=true) AS
 SELECT c.*, b.ngayhoc,b.malop,b.makhunggio,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,
 b.trangthai AS trangthaibuoi, b.magiaovienchinh,b.magiaoviendaythay,
 EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh AND btrim(n.noidung)<>'') AS conhanxet,
 EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" s WHERE s.mabuoi=b.madinhdanh) AS cosuco
 FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi;

DO $security$
DECLARE t text; keys text;
BEGIN
 FOREACH t IN ARRAY ARRAY['LICH_RANH_TUAN','CHI_TIET_LICH_RANH','BUOI_HOC','DIEM_DANH_BUOI_HOC','NHAN_XET_BUOI_HOC','SU_CO_BUOI_HOC','CONG_DAY_BUOI_HOC','GIAI_TRINH_CONG_DAY'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON vuihoc.%I TO service_role',t);
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=format('vuihoc.%I',t)::regclass AND tgname='set_updated_at') THEN
   EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.set_updated_at()',t);
  END IF;
  SELECT string_agg(quote_literal(a.attname),',' ORDER BY a.attnum) INTO keys
  FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
  WHERE i.indrelid=format('vuihoc.%I',t)::regclass AND i.indisprimary;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=format('vuihoc.%I',t)::regclass AND tgname='audit_business_change') THEN
   EXECUTE format('CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu(%s)',t,keys);
  END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['BUOI_HOC','DIEM_DANH_BUOI_HOC','NHAN_XET_BUOI_HOC','SU_CO_BUOI_HOC','CONG_DAY_BUOI_HOC','GIAI_TRINH_CONG_DAY'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS kiem_tra_ky_cong ON vuihoc.%I',t);
  EXECUTE format('CREATE TRIGGER kiem_tra_ky_cong BEFORE INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ky_cong_buoi()',t);
 END LOOP;
END; $security$;
REVOKE ALL ON vuihoc."V_CONG_DAY_THEO_CA" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."V_CONG_DAY_THEO_CA" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_ngay_lich_ranh(),vuihoc.khoa_dinh_danh_lich_tuan(),vuihoc.kiem_tra_ky_cong_buoi(),vuihoc.sinh_cong_khi_hoan_tat() FROM PUBLIC,anon,authenticated;
COMMIT;
