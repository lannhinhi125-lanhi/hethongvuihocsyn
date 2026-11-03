BEGIN;

-- Keep sessions until logout or explicit revocation. Existing login functions
-- can still assign a duration; normalize it at the table boundary.
CREATE OR REPLACE FUNCTION vuihoc.giu_phien_dang_nhap() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.maphien_bam IS NOT NULL AND NEW.phienhethan > now() THEN
    NEW.phienhethan := 'infinity'::timestamptz;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS giu_phien_dang_nhap ON vuihoc."NGUOI_DUNG";
CREATE TRIGGER giu_phien_dang_nhap
BEFORE INSERT OR UPDATE OF maphien_bam, phienhethan ON vuihoc."NGUOI_DUNG"
FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_phien_dang_nhap();

-- Extend only live sessions; never reactivate an expired/revoked session.
UPDATE vuihoc."NGUOI_DUNG"
SET phienhethan='infinity'::timestamptz
WHERE maphien_bam IS NOT NULL AND phienhethan > now()
  AND phienhethan <> 'infinity'::timestamptz;
REVOKE ALL ON FUNCTION vuihoc.giu_phien_dang_nhap() FROM PUBLIC;
COMMIT;
