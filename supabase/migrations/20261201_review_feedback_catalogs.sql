-- Apply after 20261130. Preserve all feedback/catalog rows and columns.
-- Criterion tables were retired by 20261021; this migration never drops or recreates them.
DO $review_feedback_catalogs$
DECLARE pending text; r record; trusted_owner text;
BEGIN
 LOCK TABLE vuihoc."NHAN_XET_BUOI_HOC",vuihoc."DANH_MUC_BO_SUNG",vuihoc."MUC_DANH_MUC" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regclass('vuihoc."V_CONG_DAY_BUOI_HOC"') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261130 trước.'; END IF;
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."MUC_DANH_MUC"'::regclass AND conname='muc_danh_muc_gia_tri_hop_le')
 AND to_regprocedure('vuihoc.bao_ve_cay_danh_muc_bo_sung()') IS NOT NULL THEN RETURN; END IF;
 FOR r IN SELECT name FROM unnest(ARRAY['NHOM_TIEU_CHI','TIEU_CHI','LUA_CHON_TIEU_CHI','TIEU_CHI_NHAN_XET']) name LOOP
  IF to_regclass(format('vuihoc.%I',r.name)) IS NOT NULL THEN RAISE EXCEPTION 'Bảng tiêu chí cũ % còn tồn tại; cần đối chiếu phiên bản nhận xét trước, chưa xóa bảng nào.',r.name; END IF;
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 WITH RECURSIVE ancestry(root,node,parent,path,cycle) AS (
  SELECT madinhdanh,madinhdanh,madanhmuccha,ARRAY[madinhdanh],false FROM vuihoc."DANH_MUC_BO_SUNG"
  UNION ALL SELECT a.root,p.madinhdanh,p.madanhmuccha,a.path||p.madinhdanh,p.madinhdanh=ANY(a.path)
  FROM ancestry a JOIN vuihoc."DANH_MUC_BO_SUNG" p ON p.madinhdanh=a.parent WHERE NOT a.cycle
 ), invalid AS (
  SELECT madinhdanh AS id FROM vuihoc."DANH_MUC_BO_SUNG" WHERE btrim(madinhdanh)='' OR btrim(madanhmuc)='' OR btrim(tendanhmuc)=''
  UNION ALL SELECT string_agg(madinhdanh,', ') FROM vuihoc."DANH_MUC_BO_SUNG" GROUP BY upper(btrim(madanhmuc)) HAVING count(*)>1
  UNION ALL SELECT madanhmuc||'/'||madinhdanh FROM vuihoc."MUC_DANH_MUC" WHERE btrim(madinhdanh)='' OR btrim(ma)='' OR btrim(ten)='' OR thutu<=0
  UNION ALL SELECT madanhmuc||': '||string_agg(madinhdanh,', ') FROM vuihoc."MUC_DANH_MUC" GROUP BY madanhmuc,upper(btrim(ma)) HAVING count(*)>1
  UNION ALL SELECT DISTINCT root FROM ancestry WHERE cycle
 ) SELECT string_agg(id,', ' ORDER BY id) INTO pending FROM invalid;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Danh mục có mã trùng, giá trị thiếu hoặc vòng lặp; chưa thay đổi dữ liệu.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/feedback_catalog_legacy.sql để đối soát; không tự gộp/xóa hoặc đổi mã các mục đang được tham chiếu.'; END IF;

 ALTER TABLE vuihoc."DANH_MUC_BO_SUNG" ADD CONSTRAINT danh_muc_bo_sung_gia_tri_hop_le CHECK(btrim(madinhdanh)<>'' AND btrim(madanhmuc)<>'' AND btrim(tendanhmuc)<>'');
 ALTER TABLE vuihoc."MUC_DANH_MUC" ADD CONSTRAINT muc_danh_muc_gia_tri_hop_le CHECK(btrim(madinhdanh)<>'' AND btrim(ma)<>'' AND btrim(ten)<>'' AND thutu>0);
 CREATE UNIQUE INDEX danh_muc_bo_sung_ma_khong_trung ON vuihoc."DANH_MUC_BO_SUNG"(upper(btrim(madanhmuc)));
 CREATE UNIQUE INDEX muc_danh_muc_ma_trong_nhom ON vuihoc."MUC_DANH_MUC"(madanhmuc,upper(btrim(ma)));
 CREATE FUNCTION vuihoc.bao_ve_cay_danh_muc_bo_sung() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $tree$
 BEGIN
  IF TG_OP='UPDATE' AND NEW.madanhmuccha IS NOT DISTINCT FROM OLD.madanhmuccha AND NEW.madinhdanh IS NOT DISTINCT FROM OLD.madinhdanh THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-custom-catalog-tree',0));
  IF NEW.madanhmuccha=NEW.madinhdanh OR EXISTS(
   WITH RECURSIVE ancestors(node,parent,path,cycle) AS (
    SELECT madinhdanh,madanhmuccha,ARRAY[madinhdanh],false FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madinhdanh=NEW.madanhmuccha
    UNION ALL SELECT p.madinhdanh,p.madanhmuccha,a.path||p.madinhdanh,p.madinhdanh=ANY(a.path)
    FROM ancestors a JOIN vuihoc."DANH_MUC_BO_SUNG" p ON p.madinhdanh=a.parent WHERE NOT a.cycle
   ) SELECT 1 FROM ancestors WHERE node=NEW.madinhdanh OR cycle
  ) THEN RAISE EXCEPTION 'Danh mục cha không được tạo vòng lặp.'; END IF;
  RETURN NEW;
 END $tree$;
 CREATE TRIGGER bao_ve_cay_danh_muc_bo_sung BEFORE INSERT OR UPDATE OF madanhmuccha,madinhdanh ON vuihoc."DANH_MUC_BO_SUNG" FOR EACH ROW EXECUTE FUNCTION vuihoc.bao_ve_cay_danh_muc_bo_sung();
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 EXECUTE format('ALTER FUNCTION vuihoc.bao_ve_cay_danh_muc_bo_sung() OWNER TO %I',trusted_owner);REVOKE ALL ON FUNCTION vuihoc.bao_ve_cay_danh_muc_bo_sung() FROM PUBLIC,anon,authenticated;
 -- No data UPDATE, table/column DROP, new storage or JSON columns.
 NOTIFY pgrst,'reload schema';
END $review_feedback_catalogs$;
