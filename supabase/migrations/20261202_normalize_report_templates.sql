-- After 20261201. One atomic statement. No new storage table or JSON column.
DO $normalize_report_templates$
DECLARE r record; parsed jsonb; item record; vals text[]; pending text; owner_name text;
BEGIN
 LOCK TABLE vuihoc."MAU_BAO_CAO",vuihoc."CHI_SO_MAU_BAO_CAO",vuihoc."BO_LOC_MAU_BAO_CAO" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regprocedure('vuihoc.bao_ve_cay_danh_muc_bo_sung()') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261201 trước.'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BO_LOC_MAU_BAO_CAO' AND column_name='thutu') THEN RETURN; END IF;
 SELECT string_agg(id,', ') INTO pending FROM (
  SELECT madinhdanh id FROM vuihoc."MAU_BAO_CAO" WHERE btrim(tenmaubaocao)='' OR btrim(nguondulieu)='' OR btrim(nhomtheo)=''
   OR khoangngay NOT IN ('month','previous_month','last_30_days','all','custom') OR sapxep NOT IN ('value_desc','label_asc','label_desc') OR tungay>denngay
  UNION ALL SELECT mamau FROM vuihoc."CHI_SO_MAU_BAO_CAO" WHERE btrim(machiso)='' OR thutu<=0
  UNION ALL SELECT mamau FROM vuihoc."CHI_SO_MAU_BAO_CAO" GROUP BY mamau,thutu HAVING count(*)>1
  UNION ALL SELECT mamau FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE btrim(truong)='' OR btrim(giatri)=''
 ) invalid;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Mẫu báo cáo có cấu hình cũ không hợp lệ; chưa thay đổi dữ liệu.' USING DETAIL=pending,HINT='Chạy supabase/diagnostics/report_template_legacy.sql để đối soát.'; END IF;

 ALTER TABLE vuihoc."BO_LOC_MAU_BAO_CAO" ADD COLUMN thutu integer;
 ALTER TABLE vuihoc."BO_LOC_MAU_BAO_CAO" DROP CONSTRAINT "BO_LOC_MAU_BAO_CAO_pkey";
 -- Replace a packed list by atomic rows; keep existing scalar identifiers intact.
 FOR r IN SELECT * FROM vuihoc."BO_LOC_MAU_BAO_CAO" ORDER BY mamau,truong LOOP
  parsed:=NULL; vals:=NULL;
  IF left(ltrim(r.giatri),1)='[' THEN
   BEGIN parsed:=r.giatri::jsonb; EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Bộ lọc %/% có chuỗi danh sách không hợp lệ; chưa chuyển dữ liệu.',r.mamau,r.truong;
   END;
   IF jsonb_typeof(parsed)<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements(parsed) x WHERE jsonb_typeof(x)<>'string' OR btrim(x#>>'{}')='') THEN
    RAISE EXCEPTION 'Bộ lọc %/% không phải danh sách mã dạng chuỗi hợp lệ.',r.mamau,r.truong;
   END IF;
   -- Incident choices use one composite identifier [group ID,item ID]. It is one value.
   IF r.truong IN ('cause','pauseReason') AND jsonb_array_length(parsed)=2
    AND EXISTS(SELECT 1 FROM vuihoc."LOAI_SU_CO" c WHERE c.manhom=parsed->>0 AND c.madinhdanh=parsed->>1) THEN vals:=ARRAY[r.giatri];
   ELSE
    IF r.truong IN ('cause','pauseReason') AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(parsed) x(value) WHERE left(value,1)<>'[' AND left(value,2)<>'__') THEN
     RAISE EXCEPTION 'Bộ lọc %/% có mã sự cố chưa xác định là mã ghép hay danh sách; cần đối soát.',r.mamau,r.truong;
    END IF;
    SELECT coalesce(array_agg(value ORDER BY ordinality),ARRAY[]::text[]) INTO vals FROM jsonb_array_elements_text(parsed) WITH ORDINALITY;
   END IF;
  ELSE vals:=ARRAY[r.giatri]; END IF;
  IF cardinality(vals)<>(SELECT count(DISTINCT v) FROM unnest(vals) v) THEN RAISE EXCEPTION 'Bộ lọc %/% chứa mã lặp; cần đối soát trước.',r.mamau,r.truong; END IF;
  DELETE FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE mamau=r.mamau AND truong=r.truong;
  FOR item IN SELECT value,ordinality FROM unnest(vals) WITH ORDINALITY AS x(value,ordinality) LOOP
   INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO"(mamau,truong,giatri,thutu) VALUES(r.mamau,r.truong,item.value,item.ordinality);
  END LOOP;
 END LOOP;
 -- The old PK allowed only one value per field; all old rows have now been decoded.
 ALTER TABLE vuihoc."BO_LOC_MAU_BAO_CAO" ADD PRIMARY KEY(mamau,truong,giatri),ALTER COLUMN thutu SET NOT NULL,
  ADD CONSTRAINT bo_loc_mau_thu_tu UNIQUE(mamau,truong,thutu),
  ADD CONSTRAINT bo_loc_mau_gia_tri CHECK(btrim(truong)<>'' AND btrim(giatri)<>'' AND thutu>0);
 ALTER TABLE vuihoc."CHI_SO_MAU_BAO_CAO" ADD CONSTRAINT chi_so_mau_thu_tu UNIQUE(mamau,thutu),
  ADD CONSTRAINT chi_so_mau_gia_tri CHECK(btrim(machiso)<>'' AND thutu>0);
 ALTER TABLE vuihoc."MAU_BAO_CAO"
  ADD COLUMN sosanhbat boolean,
  ADD COLUMN kieusosanh text,
  ADD COLUMN sosanhtungay date,
  ADD COLUMN sosanhdenngay date,
  ADD COLUMN giatrichon text,
  ADD COLUMN kieubieudo text,
  ADD COLUMN chisobieudo text,
  ADD CONSTRAINT mau_bao_cao_gia_tri CHECK(btrim(tenmaubaocao)<>'' AND btrim(nhomtheo)<>''
   AND khoangngay IN ('month','previous_month','last_30_days','all','custom') AND sapxep IN ('value_desc','label_asc','label_desc') AND (tungay IS NULL OR denngay IS NULL OR tungay<=denngay)),
  ADD CONSTRAINT mau_bao_cao_so_sanh CHECK((sosanhbat IS NULL AND kieusosanh IS NULL AND sosanhtungay IS NULL AND sosanhdenngay IS NULL)
   OR (sosanhbat IS NOT NULL AND kieusosanh IS NOT NULL AND kieusosanh IN ('previous','year','custom') AND (sosanhtungay IS NULL OR sosanhdenngay IS NULL OR sosanhtungay<=sosanhdenngay))),
  ADD CONSTRAINT mau_bao_cao_lua_chon CHECK(giatrichon IS NULL OR btrim(giatrichon)<>''),
  ADD CONSTRAINT mau_bao_cao_bieu_do CHECK(kieubieudo IS NULL OR kieubieudo IN ('column','bar','line','area','donut','pie','lollipop','treemap'));
 -- The generic RPC inserts the header before writing its relational config.
 CREATE FUNCTION vuihoc.kiem_tra_nguon_mau_bao_cao() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $source$
 BEGIN
  IF EXISTS(SELECT 1 FROM vuihoc."MAU_BAO_CAO" m WHERE m.madinhdanh=NEW.madinhdanh AND btrim(m.nguondulieu)='') THEN RAISE EXCEPTION 'Mẫu báo cáo cần nguồn dữ liệu.'; END IF;
  RETURN NEW;
 END $source$;
 CREATE CONSTRAINT TRIGGER kiem_tra_nguon_mau_bao_cao AFTER INSERT OR UPDATE ON vuihoc."MAU_BAO_CAO" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_nguon_mau_bao_cao();

 CREATE FUNCTION vuihoc.cau_hinh_mau_bao_cao(p_id text) RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
 SELECT jsonb_build_object('datasetId',m.nguondulieu,'groupBy',m.nhomtheo,'datePreset',m.khoangngay,'from',coalesce(m.tungay::text,''),'to',coalesce(m.denngay::text,''),'sort',m.sapxep,
  'metricIds',(SELECT coalesce(jsonb_agg(c.machiso ORDER BY c.thutu),'[]'::jsonb) FROM vuihoc."CHI_SO_MAU_BAO_CAO" c WHERE c.mamau=m.madinhdanh),
  'filters',(SELECT coalesce(jsonb_object_agg(f.truong,f.vals),'{}'::jsonb) FROM (SELECT b.truong,jsonb_agg(b.giatri ORDER BY b.thutu) vals FROM vuihoc."BO_LOC_MAU_BAO_CAO" b WHERE b.mamau=m.madinhdanh GROUP BY b.truong) f))
  ||CASE WHEN m.sosanhbat IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('comparison',jsonb_build_object('enabled',m.sosanhbat,'mode',m.kieusosanh,'start',coalesce(m.sosanhtungay::text,''),'end',coalesce(m.sosanhdenngay::text,''))) END
  ||CASE WHEN m.giatrichon IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('selection',jsonb_build_object('by',m.nhomtheo,'key',m.giatrichon)) END
  ||CASE WHEN m.kieubieudo IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('chartType',m.kieubieudo) END
  ||CASE WHEN m.chisobieudo IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('chartMetricId',m.chisobieudo) END
 FROM vuihoc."MAU_BAO_CAO" m WHERE m.madinhdanh=p_id
 $read$;
 CREATE FUNCTION vuihoc.luu_cau_hinh_mau_bao_cao(p_id text,p_cfg jsonb) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $write$
 DECLARE pair record; value record; selected jsonb;
 BEGIN
  IF jsonb_typeof(p_cfg) IS DISTINCT FROM 'object' OR coalesce(btrim(p_cfg->>'datasetId'),'')='' OR jsonb_typeof(p_cfg->'metricIds') IS DISTINCT FROM 'array' OR jsonb_typeof(p_cfg->'filters') IS DISTINCT FROM 'object'
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_cfg->'metricIds') x WHERE jsonb_typeof(x)<>'string')
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_cfg) k WHERE k NOT IN ('datasetId','groupBy','datePreset','from','to','sort','metricIds','filters','comparison','selection','chartType','chartMetricId')) THEN
   RAISE EXCEPTION 'Cấu hình mẫu báo cáo không hợp lệ hoặc chứa trường chưa được hỗ trợ.';
  END IF;
  IF p_cfg ? 'comparison' AND (jsonb_typeof(p_cfg->'comparison') IS DISTINCT FROM 'object' OR jsonb_typeof(p_cfg#>'{comparison,enabled}') IS DISTINCT FROM 'boolean' OR NOT (p_cfg->'comparison' ? 'mode')) THEN RAISE EXCEPTION 'Cấu hình so sánh không hợp lệ.'; END IF;
  IF p_cfg ? 'selection' AND (jsonb_typeof(p_cfg->'selection') IS DISTINCT FROM 'object' OR NOT (p_cfg->'selection' ?& ARRAY['by','key']) OR p_cfg#>>'{selection,by}' IS DISTINCT FROM p_cfg->>'groupBy') THEN RAISE EXCEPTION 'Nhóm đang chọn không hợp lệ.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_cfg) x WHERE x.key IN ('datasetId','groupBy','datePreset','from','to','sort','chartType','chartMetricId') AND jsonb_typeof(x.value)<>'string')
   OR EXISTS(SELECT 1 FROM jsonb_each(coalesce(p_cfg->'comparison','{}'::jsonb)) x WHERE x.key NOT IN ('enabled','mode','start','end') OR (x.key<>'enabled' AND jsonb_typeof(x.value)<>'string'))
   OR EXISTS(SELECT 1 FROM jsonb_each(coalesce(p_cfg->'selection','{}'::jsonb)) x WHERE x.key NOT IN ('by','key') OR jsonb_typeof(x.value)<>'string') THEN RAISE EXCEPTION 'Trường cấu hình báo cáo không đúng định dạng.'; END IF;
  UPDATE vuihoc."MAU_BAO_CAO" SET nguondulieu=p_cfg->>'datasetId',nhomtheo=p_cfg->>'groupBy',khoangngay=p_cfg->>'datePreset',tungay=nullif(p_cfg->>'from','')::date,denngay=nullif(p_cfg->>'to','')::date,sapxep=p_cfg->>'sort',
   sosanhbat=(p_cfg#>>'{comparison,enabled}')::boolean,kieusosanh=p_cfg#>>'{comparison,mode}',sosanhtungay=nullif(p_cfg#>>'{comparison,start}','')::date,sosanhdenngay=nullif(p_cfg#>>'{comparison,end}','')::date,
   giatrichon=p_cfg#>>'{selection,key}',kieubieudo=p_cfg->>'chartType',chisobieudo=p_cfg->>'chartMetricId' WHERE madinhdanh=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mẫu báo cáo không tồn tại.'; END IF;
  DELETE FROM vuihoc."CHI_SO_MAU_BAO_CAO" WHERE mamau=p_id;
  INSERT INTO vuihoc."CHI_SO_MAU_BAO_CAO" SELECT p_id,x.value,x.ordinality FROM jsonb_array_elements_text(p_cfg->'metricIds') WITH ORDINALITY x;
  DELETE FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE mamau=p_id;
  FOR pair IN SELECT * FROM jsonb_each(p_cfg->'filters') LOOP
   IF jsonb_typeof(pair.value)='string' THEN selected:=jsonb_build_array(pair.value);
   ELSIF jsonb_typeof(pair.value)='array' THEN selected:=pair.value;
   ELSE RAISE EXCEPTION 'Bộ lọc % cần mã hoặc danh sách mã.',pair.key; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(selected) x WHERE jsonb_typeof(x)<>'string' OR btrim(x#>>'{}')='') THEN RAISE EXCEPTION 'Bộ lọc % chứa mã không hợp lệ.',pair.key; END IF;
   INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO" SELECT p_id,pair.key,x.value,x.ordinality FROM jsonb_array_elements_text(selected) WITH ORDINALITY x;
  END LOOP;
 END $write$;
 ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_mau_bao_cao;
 CREATE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $projection$
 BEGIN
  IF p_table='MAU_BAO_CAO' THEN RETURN p_row||jsonb_build_object('cauhinh',vuihoc.cau_hinh_mau_bao_cao(p_row->>'madinhdanh')); END IF;
  RETURN vuihoc.du_lieu_quan_he_truoc_mau_bao_cao(p_table,p_row);
 END $projection$;
 ALTER FUNCTION vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) RENAME TO ghi_du_lieu_quan_he_truoc_mau_bao_cao;
 CREATE FUNCTION vuihoc.ghi_du_lieu_quan_he(p_table text,p_row jsonb,p_backfill boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $dispatch$
 BEGIN
  IF p_table='MAU_BAO_CAO' AND p_row ? 'cauhinh' THEN PERFORM vuihoc.luu_cau_hinh_mau_bao_cao(p_row->>'madinhdanh',p_row->'cauhinh');RETURN;END IF;
  PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_mau_bao_cao(p_table,p_row,p_backfill);
 END $dispatch$;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='vuihoc."BO_LOC_MAU_BAO_CAO"'::regclass AND tgname='audit_business_change') THEN
  DROP TRIGGER audit_business_change ON vuihoc."BO_LOC_MAU_BAO_CAO";
  CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc."BO_LOC_MAU_BAO_CAO" FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu('mamau','truong','giatri');
 END IF;
 SELECT pg_get_userbyid(proowner) INTO owner_name FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF owner_name IS NULL OR owner_name IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 EXECUTE format('ALTER FUNCTION vuihoc.cau_hinh_mau_bao_cao(text) OWNER TO %I',owner_name);
 EXECUTE format('ALTER FUNCTION vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb) OWNER TO %I',owner_name);
 EXECUTE format('ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) OWNER TO %I',owner_name);
 EXECUTE format('ALTER FUNCTION vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) OWNER TO %I',owner_name);
 EXECUTE format('ALTER FUNCTION vuihoc.kiem_tra_nguon_mau_bao_cao() OWNER TO %I',owner_name);
 REVOKE ALL ON FUNCTION vuihoc.kiem_tra_nguon_mau_bao_cao() FROM PUBLIC,anon,authenticated;
 REVOKE ALL ON FUNCTION vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) FROM PUBLIC,anon,authenticated;
 REVOKE ALL ON FUNCTION vuihoc.cau_hinh_mau_bao_cao(text),vuihoc.luu_cau_hinh_mau_bao_cao(text,jsonb) FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_report_templates$;
