
-- Biên bản dự giờ: mã giáo viên bắt buộc, không chỉ nằm trong JSONB.
-- Chạy sau schema.sql phiên bản 31 bảng, hoặc sau migration timed_workflow.
BEGIN;
CREATE TABLE IF NOT EXISTS vuihoc."BIEN_BAN_DU_GIO" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 mabienban text NOT NULL UNIQUE,
 mabuoi text REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 malophoc text NOT NULL REFERENCES vuihoc."LOP_HOC"(malophoc) ON UPDATE CASCADE ON DELETE RESTRICT,
 manguoinhan text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoidanhgia text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaydanhgia date NOT NULL,
 ngaycahoc date,
 macahoc text,
 guiluc timestamptz,
 hotennguoidanhgia text NOT NULL,
 vaitronguoidanhgia text NOT NULL,
 tenlophoc text NOT NULL,
 sobuoi integer NOT NULL CHECK (sobuoi>0),
 tenbuoihoc text NOT NULL,
 khunggio text NOT NULL,
 mohinh text NOT NULL,
 diemtong numeric(4,2) NOT NULL CHECK (diemtong BETWEEN 0 AND 10),
 xeploai text NOT NULL CHECK (xeploai IN ('Xuất sắc','Tốt','Khá','Cần bồi dưỡng')),
 diemtieuchi jsonb NOT NULL CHECK (
  jsonb_typeof(diemtieuchi)='object'
  AND diemtieuchi ?& ARRAY['tc1','tc2','tc3']
  AND jsonb_typeof(diemtieuchi->'tc1')='number'
  AND jsonb_typeof(diemtieuchi->'tc2')='number'
  AND jsonb_typeof(diemtieuchi->'tc3')='number'
  AND (diemtieuchi->>'tc1')::numeric BETWEEN 0 AND 10
  AND (diemtieuchi->>'tc2')::numeric BETWEEN 0 AND 10
  AND (diemtieuchi->>'tc3')::numeric BETWEEN 0 AND 10
 ),
 nhanxetchung text NOT NULL DEFAULT '',
 uudiem text NOT NULL DEFAULT '',
 cancaithien text NOT NULL DEFAULT '',
 khuyennghi text NOT NULL DEFAULT '',
 trangthai text NOT NULL CHECK (trangthai IN ('DA_DUYET','CHO_GOP_Y')),
 lienketphonghoc text,
 lienketbanghi text,
 ngaytao timestamptz NOT NULL DEFAULT now(),
 ngaycapnhat timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bien_ban_gv_ngay ON vuihoc."BIEN_BAN_DU_GIO"(magiaovien,ngaydanhgia DESC);
CREATE INDEX IF NOT EXISTS bien_ban_buoi ON vuihoc."BIEN_BAN_DU_GIO"(mabuoi) WHERE mabuoi IS NOT NULL;
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_giao_vien_du_gio()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE b record; u text;
BEGIN
 IF NEW.mabuoi IS NOT NULL THEN
  SELECT bh.*,lh.malophoc AS malopgoc INTO b
  FROM vuihoc."BUOI_HOC" bh JOIN vuihoc."LOP_HOC" lh ON lh.madinhdanh=bh.malop
  WHERE bh.madinhdanh=NEW.mabuoi FOR SHARE OF bh;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ca dự giờ không tồn tại'; END IF;
  IF NEW.magiaovien IS DISTINCT FROM coalesce(b.magiaoviendaythay,b.magiaovienchinh) THEN
   RAISE EXCEPTION 'Giáo viên dự giờ phải là người thực dạy của ca';
  END IF;
  IF NEW.malophoc<>b.malopgoc THEN RAISE EXCEPTION 'Lớp dự giờ không khớp ca'; END IF;
  IF NEW.ngaycahoc IS NOT NULL AND NEW.ngaycahoc<>b.ngayhoc THEN RAISE EXCEPTION 'Ngày ca dự giờ không khớp'; END IF;
  NEW.ngaycahoc:=b.ngayhoc;
 END IF;
 IF NEW.manguoinhan IS NOT NULL THEN
  SELECT manguoidung INTO u FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=NEW.magiaovien;
  IF u IS DISTINCT FROM NEW.manguoinhan THEN RAISE EXCEPTION 'Tài khoản nhận biên bản không thuộc giáo viên được đánh giá'; END IF;
 END IF;
 RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS kiem_tra_giao_vien ON vuihoc."BIEN_BAN_DU_GIO";
CREATE TRIGGER kiem_tra_giao_vien BEFORE INSERT OR UPDATE ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_giao_vien_du_gio();
DO $triggers$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='vuihoc."BIEN_BAN_DU_GIO"'::regclass AND tgname='set_updated_at') THEN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.set_updated_at();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='vuihoc."BIEN_BAN_DU_GIO"'::regclass AND tgname='audit_business_change') THEN
  CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu('madinhdanh');
 END IF;
END; $triggers$;
ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."BIEN_BAN_DU_GIO" FROM PUBLIC,anon,authenticated;
GRANT ALL ON vuihoc."BIEN_BAN_DU_GIO" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_giao_vien_du_gio() FROM PUBLIC,anon,authenticated;
COMMIT;
