-- Apply after 20261022_document_categories.sql.
-- Business data uses scalar columns. JSON below is only existing RPC configuration,
-- never a JSONB storage column. Category names remain a SELECT projection.
BEGIN;
ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH"
 ADD COLUMN IF NOT EXISTS linkdrive text NOT NULL DEFAULT '';

DO $constraints$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."TAI_LIEU_QUY_TRINH"'::regclass AND conname='tai_lieu_drive_url_check') THEN
  ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" ADD CONSTRAINT tai_lieu_drive_url_check
   CHECK (linkdrive='' OR linkdrive ~ '^https://(drive|docs)\.google\.com/[^[:space:]]*$');
 END IF;
END $constraints$;

DO $config$
DECLARE conf jsonb:=vuihoc.business_config();
BEGIN
 conf:=jsonb_set(conf,'{document_categories,module}','"PH2"');
 conf:=jsonb_set(conf,'{document_categories,feature}','"Quản lý danh mục loại tài liệu"');
 IF NOT (conf->'sop_documents'->'columns' ? 'linkdrive') THEN
  conf:=jsonb_set(conf,'{sop_documents,columns}',(conf->'sop_documents'->'columns')||jsonb_build_array('linkdrive'));
 END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L',
  'SELECT '||quote_literal(conf::text)||'::jsonb');
END $config$;
COMMENT ON COLUMN vuihoc."TAI_LIEU_QUY_TRINH".linkdrive IS 'Link nguồn Google Drive/Docs; không đồng nghĩa đã đọc hoặc đồng bộ nội dung.';
NOTIFY pgrst,'reload schema';
COMMIT;
