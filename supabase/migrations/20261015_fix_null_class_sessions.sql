-- Apply after apply_relational_update.sql on databases already upgraded.
-- SQL NULL becomes JSON null in to_jsonb(row), which COALESCE does not replace.
BEGIN;
DO $patch$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 definition:=replace(definition,
  'jsonb_each(coalesce(r->''chitietcahoc'',''{}''))',
  'jsonb_each(coalesce(nullif(r->''chitietcahoc'',''null''::jsonb),''{}''::jsonb))');
 EXECUTE definition;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
