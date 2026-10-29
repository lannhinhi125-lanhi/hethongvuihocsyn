-- Run once in Supabase SQL Editor before deploying the monitoring approval UI.
BEGIN;
ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN IF NOT EXISTS duyetgiamsat jsonb;
DO $$ DECLARE conf jsonb:=vuihoc.business_config();
BEGIN
 IF NOT (conf->'dated_lessons'->'columns' ? 'duyetgiamsat') THEN
  conf:=jsonb_set(conf,'{dated_lessons,columns}',conf->'dated_lessons'->'columns'||'"duyetgiamsat"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
