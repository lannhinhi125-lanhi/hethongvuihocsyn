-- Run after 20261217_incident_workflow.sql. No historical work is rewritten.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE item vuihoc."LOAI_SU_CO";
BEGIN
 IF NEW.dotamdunglop AND coalesce(current_setting('vuihoc.pause_catalog_migration',true),'')='on' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.trangthai='DA_GIAI_QUYET' AND OLD.hesocongapdung IS NOT NULL
 AND NEW.trangthai IS DISTINCT FROM 'DA_GIAI_QUYET' THEN
  RAISE EXCEPTION 'Sự cố đã chốt hệ số công; hãy xử lý điều chỉnh qua đối soát công thay vì mở lại biên bản.';
 END IF;
 IF NEW.trangthai IS DISTINCT FROM 'DA_GIAI_QUYET' THEN
  SELECT * INTO item FROM vuihoc."LOAI_SU_CO" WHERE manhom=NEW.manhomsuco AND ma=NEW.masuco AND danghoatdong;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loại sự cố không tồn tại hoặc đã ngừng hoạt động'; END IF;
  NEW.hesocongapdung:=NULL;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.manhomsuco,NEW.masuco,NEW.hesocongapdung,NEW.trangthai)
 IS NOT DISTINCT FROM (OLD.manhomsuco,OLD.masuco,OLD.hesocongapdung,OLD.trangthai) THEN RETURN NEW; END IF;
 SELECT * INTO item FROM vuihoc."LOAI_SU_CO" WHERE manhom=NEW.manhomsuco AND ma=NEW.masuco AND danghoatdong;
 IF NOT FOUND THEN RAISE EXCEPTION 'Loại sự cố không tồn tại hoặc đã ngừng hoạt động'; END IF;
 IF item.hesocong IS NOT NULL AND (item.hesocong NOT BETWEEN -999.999 AND 999.999
 OR item.hesocong::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'Hệ số công của sự cố không hợp lệ'; END IF;
 NEW.hesocongapdung:=item.hesocong;
 RETURN NEW;
END $$;

DO $patch$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.ap_dung_cong_su_co()'::regprocedure);
 IF strpos(f,'incident_resolution_guard')=0 THEN
  f:=regexp_replace(f,'\mBEGIN\M',$guard$BEGIN
 -- incident_resolution_guard
 IF NEW.trangthai IS DISTINCT FROM 'DA_GIAI_QUYET' THEN RETURN NEW; END IF;
$guard$);
  EXECUTE f;
 END IF;
 f:=pg_get_functiondef('vuihoc.ghi_cong_neu_du_nhan_xet(text)'::regprocedure);
 f:=replace(f,'mabuoi=p_buoi AND hesocongapdung IS NULL',
  'mabuoi=p_buoi AND (trangthai IS DISTINCT FROM ''DA_GIAI_QUYET'' OR hesocongapdung IS NULL)');
 EXECUTE f;
END $patch$;

-- A status-only UPDATE also changes the coefficient in the BEFORE trigger.
-- UPDATE OF hesocongapdung would miss that transition.
DROP TRIGGER IF EXISTS tiep_tuc_ghi_cong_sau_cau_hinh ON vuihoc."SU_CO_BUOI_HOC";
CREATE TRIGGER tiep_tuc_ghi_cong_sau_cau_hinh AFTER UPDATE ON vuihoc."SU_CO_BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.tiep_tuc_ghi_cong_sau_cau_hinh_su_co();

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_cau_hinh_su_co_khi_khoa()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.dakhoa AND NOT OLD.dakhoa AND EXISTS(
  SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=i.mabuoi
  WHERE to_char(b.ngayhoc,'YYYY-MM')=NEW.kycong
   AND (i.trangthai IS DISTINCT FROM 'DA_GIAI_QUYET' OR i.hesocongapdung IS NULL)
 ) THEN RAISE EXCEPTION 'Kỳ còn sự cố chưa giải quyết hoặc chưa đủ cấu hình tính công. Hãy xử lý trước khi khóa kỳ.'; END IF;
 RETURN NEW;
END $$;
COMMIT;
