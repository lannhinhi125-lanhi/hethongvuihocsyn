BEGIN;
-- Allow the catalog sync to re-resolve a changed snapshot, while ordinary note
-- updates preserve the applied coefficient and reconciliation overrides.
CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE item jsonb; coefficient numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.manhomsuco, NEW.masuco, NEW.hesocongapdung) IS NOT DISTINCT FROM (OLD.manhomsuco, OLD.masuco, OLD.hesocongapdung) THEN
    NEW.hesocongapdung := OLD.hesocongapdung;
    RETURN NEW;
  END IF;
  SELECT x INTO item FROM vuihoc."DANH_MUC_SU_CO" c
    CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) x
    WHERE c.madinhdanh = NEW.manhomsuco AND x->>'code' = NEW.masuco
      AND coalesce((x->>'status')::boolean,false) LIMIT 1;
  IF item IS NULL OR item->>'creditCoeff' IS NULL THEN
    RAISE EXCEPTION 'Loại sự cố chưa có hệ số công trong danh mục';
  END IF;
  coefficient := (item->>'creditCoeff')::numeric;
  IF coefficient NOT BETWEEN -999.999 AND 999.999 OR coefficient::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Hệ số công của sự cố không hợp lệ';
  END IF;
  NEW.hesocongapdung := coefficient;
  RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.ap_dung_cong_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE lesson vuihoc."BUOI_HOC"; class_code text; time_range text; period text;
BEGIN
  IF NEW.hesocongapdung IS NULL OR (TG_OP = 'UPDATE' AND NEW.hesocongapdung IS NOT DISTINCT FROM OLD.hesocongapdung) THEN RETURN NEW; END IF;
  SELECT * INTO lesson FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi;
  SELECT malophoc INTO class_code FROM vuihoc."LOP_HOC" WHERE madinhdanh=lesson.malop;
  SELECT khoanggio INTO time_range FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=lesson.makhunggio;
  period := to_char(lesson.ngayhoc,'YYYY-MM');
  UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=NEW.hesocongapdung,
    ghichu='Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')',dagui=false
    WHERE mabuoi=NEW.mabuoi;
  UPDATE vuihoc."BANG_CONG_THANG" p SET danhsachgiaovien=(
    SELECT coalesce(jsonb_agg(
      CASE WHEN jsonb_typeof(t->'sessions')='array' THEN
        jsonb_set(t,'{sessions}',(
          SELECT coalesce(jsonb_agg(
            CASE WHEN s->>'classCode'=class_code
              AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
              AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
            THEN s||jsonb_build_object('creditCoeff',NEW.hesocongapdung,'type',CASE WHEN coalesce(s->>'type','STANDARD') IN ('STANDARD','COVER') THEN 'EMERGENCY' ELSE s->>'type' END,'statusText',NEW.tensuco,'hrPayNote','Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')')
            ELSE s END ORDER BY ord_s), '[]'::jsonb)
          FROM jsonb_array_elements(t->'sessions') WITH ORDINALITY AS ss(s,ord_s)))
        || CASE WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(t->'sessions') s
          WHERE s->>'classCode'=class_code
            AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
            AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
        ) THEN jsonb_build_object('payrollSent',false) ELSE '{}'::jsonb END
      ELSE t END ORDER BY ord_t), '[]'::jsonb)
    FROM jsonb_array_elements(p.danhsachgiaovien) WITH ORDINALITY AS tt(t,ord_t)
  ) WHERE p.kycong=period AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p.danhsachgiaovien) t
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(t->'sessions','[]'::jsonb)) s
    WHERE s->>'classCode'=class_code
      AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
      AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
  );
  RETURN NEW;
END $fn$;


CREATE OR REPLACE FUNCTION vuihoc.dong_bo_he_so_danh_muc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN
  UPDATE vuihoc."SU_CO_BUOI_HOC" i
  SET hesocongapdung=(item->>'creditCoeff')::numeric
  FROM jsonb_array_elements(NEW.danhsachsuco) item, vuihoc."BUOI_HOC" b
  WHERE i.manhomsuco=NEW.madinhdanh AND i.masuco=item->>'code'
    AND b.madinhdanh=i.mabuoi
    AND coalesce((item->>'status')::boolean,false)
    AND item->>'creditCoeff' IS NOT NULL
    AND i.hesocongapdung IS DISTINCT FROM (item->>'creditCoeff')::numeric
    AND NOT EXISTS (SELECT 1 FROM vuihoc."BANG_CONG_THANG" p
      WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.danhsachsuco) old_item
      WHERE old_item->>'code'=item->>'code'
        AND old_item->'creditCoeff' IS DISTINCT FROM item->'creditCoeff');
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS dong_bo_he_so_danh_muc ON vuihoc."DANH_MUC_SU_CO";
CREATE TRIGGER dong_bo_he_so_danh_muc AFTER UPDATE OF danhsachsuco ON vuihoc."DANH_MUC_SU_CO"
FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_he_so_danh_muc();
REVOKE ALL ON FUNCTION vuihoc.dong_bo_he_so_danh_muc() FROM PUBLIC,anon,authenticated;
-- Repair open periods whose incident snapshot still contains a former catalog value.
UPDATE vuihoc."SU_CO_BUOI_HOC" i SET hesocongapdung=(item->>'creditCoeff')::numeric
FROM vuihoc."DANH_MUC_SU_CO" c
CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) item,
vuihoc."BUOI_HOC" b
WHERE c.madinhdanh=i.manhomsuco AND item->>'code'=i.masuco AND b.madinhdanh=i.mabuoi
AND coalesce((item->>'status')::boolean,false) AND item->>'creditCoeff' IS NOT NULL
AND i.hesocongapdung IS DISTINCT FROM (item->>'creditCoeff')::numeric
AND NOT EXISTS (SELECT 1 FROM vuihoc."BANG_CONG_THANG" p
  WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa);
COMMIT;
