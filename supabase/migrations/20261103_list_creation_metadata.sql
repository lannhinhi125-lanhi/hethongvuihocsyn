BEGIN;

-- Creation dates are read-only metadata used to order account lists.
CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $profile$
 SELECT to_jsonb(u)-ARRAY['matkhau','matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaycapnhat']
$profile$;

-- Preserve the installed RPC's permission checks and projections. Extend only
-- its read whitelist, so creation dates are available for every collection.
DO $metadata$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure) INTO definition;
  IF position('e.key IN (SELECT jsonb_array_elements_text($1))' IN definition) = 0 THEN
    RAISE EXCEPTION 'Khong tim thay danh sach cot cua vuihoc_business_data. Can kiem tra phien ban RPC truoc khi ap dung.';
  END IF;
  definition := replace(definition,
    'e.key IN (SELECT jsonb_array_elements_text($1))',
    '(e.key IN (SELECT jsonb_array_elements_text($1)) OR e.key=''''ngaytao'''')');
  EXECUTE definition;
END;
$metadata$;

NOTIFY pgrst, 'reload schema';
COMMIT;
