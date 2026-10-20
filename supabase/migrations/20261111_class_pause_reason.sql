-- Apply after 20261110_temporary_class_pause.sql.
BEGIN;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS lydotamdung text;
-- Existing pauses keep their state; an operator selects the actual reason.
DO $$
DECLARE conf jsonb;
BEGIN
 conf:=vuihoc.business_config();
 IF NOT (conf->'classes'->'columns' ? 'lydotamdung') THEN
  conf:=jsonb_set(conf,'{classes,columns}',conf->'classes'->'columns'||'["lydotamdung"]'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
