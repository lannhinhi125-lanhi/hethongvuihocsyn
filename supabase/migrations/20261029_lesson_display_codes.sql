-- Run once in Supabase SQL Editor; safe to run again.
-- Keeps UUID primary keys and every foreign key intact. Codes are server-generated.
BEGIN;
ALTER TABLE vuihoc."BUOI_HOC"
 ADD COLUMN IF NOT EXISTS sobuoihienthi bigint GENERATED ALWAYS AS IDENTITY,
 ADD COLUMN IF NOT EXISTS mabuoihienthi text GENERATED ALWAYS AS
  ('BH-' || lpad(sobuoihienthi::text,greatest(6,length(sobuoihienthi::text)),'0')) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS buoi_hoc_so_hien_thi_uidx ON vuihoc."BUOI_HOC"(sobuoihienthi);
CREATE UNIQUE INDEX IF NOT EXISTS buoi_hoc_ma_hien_thi_uidx ON vuihoc."BUOI_HOC"(mabuoihienthi);

-- Extend only the read projection; keep all existing authorization and write guards.
DO $read_projection$
DECLARE original text; patched text;
BEGIN
 original:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF strpos(original,'mabuoihienthi')=0 THEN
  IF strpos(original, $pattern$e.key IN (SELECT jsonb_array_elements_text($1))$pattern$)=0
   OR strpos(original, $pattern$cfg.c->'columns',cfg.dataset$pattern$)=0 THEN
   RAISE EXCEPTION 'Unsupported business RPC projection. Apply current relational migrations first.';
  END IF;
  patched:=replace(original,
   $pattern$e.key IN (SELECT jsonb_array_elements_text($1))$pattern$,
   $pattern$(e.key IN (SELECT jsonb_array_elements_text($1)) OR (e.key=''mabuoihienthi'' AND $2=''dated_lessons''))$pattern$);
  EXECUTE patched;
 END IF;
END $read_projection$;
COMMIT;

SELECT madinhdanh AS uuid_lien_ket,mabuoihienthi AS ma_buoi,ngayhoc
FROM vuihoc."BUOI_HOC" ORDER BY sobuoihienthi DESC LIMIT 20;
