-- Apply after the existing session workflow and relational incident catalog migrations.
-- Recording an incident must not depend on payroll configuration.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE item vuihoc."LOAI_SU_CO";
BEGIN
 IF NEW.dotamdunglop AND coalesce(current_setting('vuihoc.pause_catalog_migration',true),'')='on' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (NEW.manhomsuco,NEW.masuco,NEW.hesocongapdung)
 IS NOT DISTINCT FROM (OLD.manhomsuco,OLD.masuco,OLD.hesocongapdung) THEN RETURN NEW; END IF;
 SELECT * INTO item FROM vuihoc."LOAI_SU_CO"
 WHERE manhom=NEW.manhomsuco AND ma=NEW.masuco AND danghoatdong;
 IF NOT FOUND THEN RAISE EXCEPTION 'Loại sự cố không tồn tại hoặc đã ngừng hoạt động'; END IF;
 IF item.hesocong IS NOT NULL AND (item.hesocong NOT BETWEEN -999.999 AND 999.999
 OR item.hesocong::text IN ('NaN','Infinity','-Infinity')) THEN
  RAISE EXCEPTION 'Hệ số công của sự cố không hợp lệ';
 END IF;
 NEW.hesocongapdung:=item.hesocong;
 RETURN NEW;
END $$;

-- Do not silently use the standard coefficient 1 for an unconfigured incident.
-- Preserve existing functions, including later changes to feedback/work validation.
DO $patch$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.ghi_cong_neu_du_nhan_xet(text)'::regprocedure);
 IF strpos(f,'incident_missing_credit_guard')=0 THEN
  f:=regexp_replace(f,'\mBEGIN\M',$guard$BEGIN
 -- incident_missing_credit_guard
 IF EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=p_buoi AND hesocongapdung IS NULL) THEN RETURN; END IF;
$guard$);
  EXECUTE f;
 END IF;
END $patch$;

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_cau_hinh_su_co_khi_khoa()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.dakhoa AND NOT OLD.dakhoa AND EXISTS(
  SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=i.mabuoi
  WHERE to_char(b.ngayhoc,'YYYY-MM')=NEW.kycong AND i.hesocongapdung IS NULL
 ) THEN RAISE EXCEPTION 'Kỳ còn sự cố chưa đủ cấu hình tính công. Hãy bổ sung hệ số trước khi khóa kỳ.'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kiem_tra_cau_hinh_su_co_khi_khoa ON vuihoc."BANG_CONG_THANG";
CREATE TRIGGER kiem_tra_cau_hinh_su_co_khi_khoa BEFORE UPDATE OF dakhoa ON vuihoc."BANG_CONG_THANG"
FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_cau_hinh_su_co_khi_khoa();

-- Filling in the catalog coefficient also resumes ordinary/cover work generation.
CREATE OR REPLACE FUNCTION vuihoc.tiep_tuc_ghi_cong_sau_cau_hinh_su_co()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.hesocongapdung IS NOT NULL AND OLD.hesocongapdung IS NULL THEN
  PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(NEW.mabuoi);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tiep_tuc_ghi_cong_sau_cau_hinh ON vuihoc."SU_CO_BUOI_HOC";
CREATE TRIGGER tiep_tuc_ghi_cong_sau_cau_hinh AFTER UPDATE OF hesocongapdung ON vuihoc."SU_CO_BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.tiep_tuc_ghi_cong_sau_cau_hinh_su_co();
COMMIT;
