-- Run after 20261202 (20261211 is optional). One atomic, repeatable statement.
-- Discards obsolete run dates/comparisons/drill-down; preserves template structure and ownership.
DO $drop_template_periods$
DECLARE f text; a integer; b integer;
BEGIN
 LOCK TABLE vuihoc."MAU_BAO_CAO" IN ACCESS EXCLUSIVE MODE;
 IF to_regprocedure('vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb)') IS NULL THEN RAISE EXCEPTION 'Chạy bản 20261202 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='MAU_BAO_CAO' AND column_name='khoangngay') THEN RETURN; END IF;
 CREATE OR REPLACE FUNCTION vuihoc.cau_hinh_mau_bao_cao(p_id text) RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
 SELECT jsonb_build_object('datasetId',m.nguondulieu,'groupBy',m.nhomtheo,'sort',m.sapxep,
  'metricIds',(SELECT coalesce(jsonb_agg(c.machiso ORDER BY c.thutu),'[]'::jsonb) FROM vuihoc."CHI_SO_MAU_BAO_CAO" c WHERE c.mamau=m.madinhdanh),
  'filters',(SELECT coalesce(jsonb_object_agg(f.truong,f.vals),'{}'::jsonb) FROM (SELECT b.truong,jsonb_agg(b.giatri ORDER BY b.thutu) vals FROM vuihoc."BO_LOC_MAU_BAO_CAO" b WHERE b.mamau=m.madinhdanh GROUP BY b.truong) f))
  ||CASE WHEN m.kieubieudo IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('chartType',m.kieubieudo) END
  ||CASE WHEN m.chisobieudo IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('chartMetricId',m.chisobieudo) END
 FROM vuihoc."MAU_BAO_CAO" m WHERE m.madinhdanh=p_id
 $read$;
 f:=pg_get_functiondef('vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb)'::regprocedure);
 a:=strpos(f,'UPDATE vuihoc."MAU_BAO_CAO" SET'); b:=strpos(f,'WHERE madinhdanh=p_id;');
 IF a=0 OR b<a THEN RAISE EXCEPTION 'Không nhận diện được hàm ghi mẫu; chưa xóa cột nào.'; END IF;
 f:=overlay(f placing $update$UPDATE vuihoc."MAU_BAO_CAO" SET nguondulieu=p_cfg->>'datasetId',nhomtheo=p_cfg->>'groupBy',sapxep=p_cfg->>'sort',kieubieudo=p_cfg->>'chartType',chisobieudo=p_cfg->>'chartMetricId' WHERE madinhdanh=p_id;$update$ from a for b-a+length('WHERE madinhdanh=p_id;'));
 f:=replace(f,$old$p_cfg:=(p_cfg-ARRAY['datePreset','from','to','comparison','selection'])||jsonb_build_object('datePreset','all','from','','to','');$old$,'');
 f:=replace(f,'BEGIN',$sanitize$BEGIN
  p_cfg:=p_cfg-ARRAY['datePreset','from','to','comparison','selection'];
 $sanitize$);
 EXECUTE f;
 DROP TRIGGER IF EXISTS mau_bao_cao_khong_luu_ky ON vuihoc."MAU_BAO_CAO";
 DROP FUNCTION IF EXISTS vuihoc.mau_bao_cao_khong_luu_ky();
 ALTER TABLE vuihoc."MAU_BAO_CAO" DROP COLUMN khoangngay,DROP COLUMN tungay,DROP COLUMN denngay,
  DROP COLUMN sosanhbat,DROP COLUMN kieusosanh,DROP COLUMN sosanhtungay,DROP COLUMN sosanhdenngay,DROP COLUMN giatrichon;
 -- The old mixed constraint was removed along with its date columns. Restore the structure-only guard.
 ALTER TABLE vuihoc."MAU_BAO_CAO" ADD CONSTRAINT mau_bao_cao_khung_hop_le
 CHECK(btrim(tenmaubaocao)<>'' AND btrim(nhomtheo)<>'' AND sapxep IN ('value_desc','label_asc','label_desc'));
 NOTIFY pgrst,'reload schema';
END $drop_template_periods$;
