-- Cron still expires classes when nobody is using the app. Reading data also
-- catches up safely when Cron is unavailable or delayed.
BEGIN;
DO $patch$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF strpos(f,'PERFORM vuihoc.ket_thuc_lop_het_han();')=0 THEN
  IF strpos(f,'actor:=vuihoc.nguoi_dung_phien(p_token);')=0 THEN
   RAISE EXCEPTION 'Unsupported business reader; no changes applied';
  END IF;
  f:=replace(f,'actor:=vuihoc.nguoi_dung_phien(p_token);',
   'actor:=vuihoc.nguoi_dung_phien(p_token); PERFORM vuihoc.ket_thuc_lop_het_han();');
  EXECUTE f;
 END IF;
END $patch$;
SELECT vuihoc.ket_thuc_lop_het_han();
NOTIFY pgrst,'reload schema';
COMMIT;
