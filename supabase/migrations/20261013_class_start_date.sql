BEGIN;

ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS ngaybatdau date;

-- The business RPC reads and writes only fields listed in business_config.
-- Extend its class field list without replacing the other dataset definitions.
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('vuihoc.business_config()'::regprocedure) INTO definition;
 IF position('"danhsachmahocsinh","lichhoc","ngaybatdau"' in definition)=0 THEN
  IF position('"danhsachmahocsinh","lichhoc"' in definition)=0 THEN
   RAISE EXCEPTION 'Không tìm thấy cấu hình trường lịch học của lớp';
  END IF;
  EXECUTE replace(definition,
   '"danhsachmahocsinh","lichhoc"',
   '"danhsachmahocsinh","lichhoc","ngaybatdau"');
 END IF;
END $migration$;

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ngay_bat_dau_lop()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE first_lesson date; class_start date;
BEGIN
 IF TG_TABLE_NAME='LOP_HOC' THEN
  IF NEW.ngaybatdau IS NOT NULL THEN
   SELECT min(ngayhoc) INTO first_lesson FROM vuihoc."BUOI_HOC" WHERE malop=NEW.madinhdanh;
   IF first_lesson < NEW.ngaybatdau THEN
    RAISE EXCEPTION 'Ngày bắt đầu lớp không thể sau ca học đã ghi nhận (%)',first_lesson;
   END IF;
  END IF;
 ELSE
  SELECT ngaybatdau INTO class_start FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malop;
  IF class_start IS NOT NULL AND NEW.ngayhoc<class_start THEN
   RAISE EXCEPTION 'Ca học không thể trước ngày bắt đầu lớp (%)',class_start;
  END IF;
 END IF;
 RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS kiem_tra_ngay_bat_dau_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER kiem_tra_ngay_bat_dau_lop BEFORE INSERT OR UPDATE OF ngaybatdau ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ngay_bat_dau_lop();
DROP TRIGGER IF EXISTS kiem_tra_ngay_bat_dau_buoi ON vuihoc."BUOI_HOC";
CREATE TRIGGER kiem_tra_ngay_bat_dau_buoi BEFORE INSERT OR UPDATE OF ngayhoc,malop ON vuihoc."BUOI_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ngay_bat_dau_lop();

REVOKE ALL ON FUNCTION vuihoc.kiem_tra_ngay_bat_dau_lop() FROM PUBLIC,anon,authenticated;
COMMIT;
