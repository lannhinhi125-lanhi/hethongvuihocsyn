-- Keep the deployed scheduler's duration, pause, materials and payroll guards.
-- A material row should generate lessons for its own class only.
BEGIN;
DO $patch$
DECLARE f text; trigger_def text; return_pos integer;
BEGIN
 f:=pg_get_functiondef('vuihoc.dong_bo_ca_theo_lich(date,date)'::regprocedure);
 return_pos:=strpos(f,'RETURNS integer');
 IF return_pos=0 OR strpos(f,'s.malop=l.madinhdanh')=0 THEN
  RAISE EXCEPTION 'Unsupported lesson scheduler; no changes applied';
 END IF;
 f:='CREATE OR REPLACE FUNCTION vuihoc.dong_bo_ca_lop(p_lop text,p_from date,p_to date) '||substr(f,return_pos);
 f:=replace(f,'s.malop=l.madinhdanh','s.malop=l.madinhdanh AND l.madinhdanh=p_lop');
 EXECUTE f;
 REVOKE ALL ON FUNCTION vuihoc.dong_bo_ca_lop(text,date,date) FROM PUBLIC,anon,authenticated;
 trigger_def:=pg_get_functiondef('vuihoc.sinh_buoi_khi_gan_hoc_lieu()'::regprocedure);
 IF strpos(trigger_def,'vuihoc.dong_bo_ca_lop(NEW.malop,start_day,')=0 THEN
  IF strpos(trigger_def,'vuihoc.dong_bo_ca_theo_lich(start_day,')=0 THEN
   RAISE EXCEPTION 'Unsupported material trigger; no changes applied';
  END IF;
  trigger_def:=replace(trigger_def,'vuihoc.dong_bo_ca_theo_lich(start_day,','vuihoc.dong_bo_ca_lop(NEW.malop,start_day,');
  EXECUTE trigger_def;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
