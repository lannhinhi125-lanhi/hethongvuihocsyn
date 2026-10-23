-- After 20261202. Atomic, repeatable; no new table or JSON column.
-- Templates retain report structure and filters, never the dates of a particular run.
-- Legacy date columns remain for schema compatibility, with no selected dates stored.
DO $reusable_report_templates$
DECLARE f text; owner_name text;
BEGIN
 LOCK TABLE vuihoc."MAU_BAO_CAO" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regprocedure('vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb)') IS NULL THEN RAISE EXCEPTION 'Chạy bản 20261202 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='vuihoc."MAU_BAO_CAO"'::regclass AND tgname='mau_bao_cao_khong_luu_ky') THEN
  f:=pg_get_functiondef('vuihoc.cau_hinh_mau_bao_cao(text)'::regprocedure);
  IF strpos(f,'SELECT jsonb_build_object')=0 OR strpos(f,'FROM vuihoc."MAU_BAO_CAO" m WHERE')=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm đọc mẫu báo cáo.'; END IF;
  f:=replace(f,'SELECT jsonb_build_object','SELECT (jsonb_build_object');
  f:=replace(f,'FROM vuihoc."MAU_BAO_CAO" m WHERE',') - ARRAY[''datePreset'',''from'',''to'',''comparison'',''selection''] FROM vuihoc."MAU_BAO_CAO" m WHERE');
  EXECUTE f;
  f:=pg_get_functiondef('vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb)'::regprocedure);
  IF strpos(f,'BEGIN')=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm ghi mẫu báo cáo.'; END IF;
  -- Accept old clients too, but discard all run-specific values at the server boundary.
  f:=replace(f,'BEGIN',$patch$BEGIN
   p_cfg:=(p_cfg-ARRAY['datePreset','from','to','comparison','selection'])||jsonb_build_object('datePreset','all','from','','to','');
  $patch$);
  EXECUTE f;
 END IF;
 CREATE OR REPLACE FUNCTION vuihoc.mau_bao_cao_khong_luu_ky() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 BEGIN
  NEW.khoangngay:='all'; NEW.tungay:=NULL; NEW.denngay:=NULL;
  NEW.sosanhbat:=NULL; NEW.kieusosanh:=NULL; NEW.sosanhtungay:=NULL; NEW.sosanhdenngay:=NULL;
  NEW.giatrichon:=NULL;
  RETURN NEW;
 END $guard$;
 DROP TRIGGER IF EXISTS mau_bao_cao_khong_luu_ky ON vuihoc."MAU_BAO_CAO";
 CREATE TRIGGER mau_bao_cao_khong_luu_ky BEFORE INSERT OR UPDATE ON vuihoc."MAU_BAO_CAO"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.mau_bao_cao_khong_luu_ky();
 UPDATE vuihoc."MAU_BAO_CAO" SET khoangngay='all',tungay=NULL,denngay=NULL,
  sosanhbat=NULL,kieusosanh=NULL,sosanhtungay=NULL,sosanhdenngay=NULL,giatrichon=NULL
 WHERE khoangngay IS DISTINCT FROM 'all' OR tungay IS NOT NULL OR denngay IS NOT NULL
  OR sosanhbat IS NOT NULL OR kieusosanh IS NOT NULL OR sosanhtungay IS NOT NULL OR sosanhdenngay IS NOT NULL OR giatrichon IS NOT NULL;
 SELECT pg_get_userbyid(proowner) INTO owner_name FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 EXECUTE format('ALTER FUNCTION vuihoc.mau_bao_cao_khong_luu_ky() OWNER TO %I',owner_name);
 REVOKE ALL ON FUNCTION vuihoc.mau_bao_cao_khong_luu_ky() FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $reusable_report_templates$;
