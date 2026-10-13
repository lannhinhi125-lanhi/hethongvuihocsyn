BEGIN;
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" DROP CONSTRAINT IF EXISTS "SU_CO_BUOI_HOC_hesocongapdung_check";
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ADD CONSTRAINT "SU_CO_BUOI_HOC_hesocongapdung_check" CHECK (hesocongapdung BETWEEN -999.999 AND 999.999);
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" DROP CONSTRAINT IF EXISTS "CONG_DAY_BUOI_HOC_hesocong_check";
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" ADD CONSTRAINT "CONG_DAY_BUOI_HOC_hesocong_check" CHECK (hesocong BETWEEN -999.999 AND 999.999);

CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE item jsonb; coefficient numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.manhomsuco, NEW.masuco) IS NOT DISTINCT FROM (OLD.manhomsuco, OLD.masuco) THEN
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

COMMIT;
