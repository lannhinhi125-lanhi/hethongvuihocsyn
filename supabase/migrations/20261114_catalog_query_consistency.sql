-- Apply after 20261113_class_pause_reporting.sql. No new storage columns.
BEGIN;
DO $patch$
DECLARE signature text; f text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['vuihoc.bang_cong_truy_van(text,text)','vuihoc.giai_trinh_truy_van(text)'] LOOP
  f:=pg_get_functiondef(signature::regprocedure);
  f:=replace(f,$old$CASE WHEN g.mamonhoc='SUB-ENG' THEN 'ANH' ELSE 'TOAN' END$old$,'g.mamonhoc');
  -- Subjects are referenced by catalog code, which need not equal the row ID.
  f:=replace(f,'mon.madinhdanh=g.mamonhoc','mon.mamonhoc=g.mamonhoc');
  EXECUTE f;
 END LOOP;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
