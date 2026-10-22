-- Apply after 20261128. One atomic statement; source evidence rows are preserved.
DO $normalize_work_evidence$
DECLARE f text; pending text; trusted_owner text;
BEGIN
 LOCK TABLE vuihoc."GIAI_TRINH_CONG_DAY",vuihoc."LINK_MINH_CHUNG_CONG" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAI_TRINH_CONG_DAY' AND column_name='lienketminhchung') THEN RETURN; END IF;
 IF to_regclass('vuihoc."V_SU_CO_BUOI_HOC"') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261128 trước.'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(d.madinhdanh,', ' ORDER BY d.madinhdanh) INTO pending FROM vuihoc."GIAI_TRINH_CONG_DAY" d
 WHERE ARRAY(SELECT btrim(v) FROM regexp_split_to_table(d.lienketminhchung,E'[\r\n]+') WITH ORDINALITY AS x(v,n) WHERE btrim(v)<>'' ORDER BY n)
 IS DISTINCT FROM ARRAY(SELECT m.lienket FROM vuihoc."LINK_MINH_CHUNG_CONG" m WHERE m.magiaitrinh=d.madinhdanh ORDER BY m.thutu)
 OR EXISTS(SELECT 1 FROM vuihoc."LINK_MINH_CHUNG_CONG" m WHERE m.magiaitrinh=d.madinhdanh AND (m.thutu<=0 OR m.lienket!~'^https?://[^[:space:]]+$'))
 OR EXISTS(SELECT 1 FROM vuihoc."LINK_MINH_CHUNG_CONG" m WHERE m.magiaitrinh=d.madinhdanh GROUP BY m.lienket HAVING count(*)>1);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Minh chứng cũ chưa khớp nguồn hoặc có liên kết không hợp lệ/trùng; chưa xóa cột nào.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/work_evidence_legacy.sql để đối soát; không tự bỏ liên kết hoặc ghi đè dữ liệu khác nhau.'; END IF;

 CREATE VIEW vuihoc."V_GIAI_TRINH_CONG_DAY" WITH(security_invoker=true) AS
 SELECT d.madinhdanh,d.macong,d.noidung,d.loaisuco,d.trangthai,d.guiluc,d.manguoigui,d.manguoiduyet,d.duyetluc,d.ghichuduyet,d.ngaytao,d.ngaycapnhat,
 coalesce((SELECT string_agg(m.lienket,E'\n' ORDER BY m.thutu) FROM vuihoc."LINK_MINH_CHUNG_CONG" m WHERE m.magiaitrinh=d.madinhdanh),'') AS lienketminhchung
 FROM vuihoc."GIAI_TRINH_CONG_DAY" d;
 f:=pg_get_functiondef('vuihoc.giai_trinh_truy_van(text)'::regprocedure);
 IF strpos(f,'FROM vuihoc."GIAI_TRINH_CONG_DAY" d')=0 THEN RAISE EXCEPTION 'Không nhận diện được truy vấn giải trình.'; END IF;
 f:=replace(f,'FROM vuihoc."GIAI_TRINH_CONG_DAY" d','FROM vuihoc."V_GIAI_TRINH_CONG_DAY" d');EXECUTE f;

 -- Link writes use the same period lock as the payroll RPC, then lock their parent.
 CREATE FUNCTION vuihoc.khoa_nguon_minh_chung_cong(p_id text) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $lock$
 DECLARE ky text; khoa boolean;
 BEGIN
  SELECT c.kycong INTO ky FROM vuihoc."GIAI_TRINH_CONG_DAY" d JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.madinhdanh=d.macong WHERE d.madinhdanh=p_id;
  IF ky IS NULL THEN RAISE EXCEPTION 'Giải trình nguồn không tồn tại.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
  SELECT dakhoa INTO khoa FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky FOR SHARE;
  IF khoa THEN RAISE EXCEPTION 'Kỳ công đã khóa; không thay đổi minh chứng.'; END IF;
  PERFORM 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Giải trình nguồn không còn tồn tại.'; END IF;
 END $lock$;
 CREATE FUNCTION vuihoc.luu_link_minh_chung_cong(p_id text,p_links text) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $writer$
 DECLARE links text[];
 BEGIN
  links:=ARRAY(SELECT btrim(v) FROM regexp_split_to_table(coalesce(p_links,''),E'[\r\n]+') WITH ORDINALITY AS x(v,n) WHERE btrim(v)<>'' ORDER BY n);
  IF EXISTS(SELECT 1 FROM unnest(links) AS u(link) WHERE link!~'^https?://[^[:space:]]+$') THEN RAISE EXCEPTION 'Mỗi minh chứng phải là một liên kết HTTP/HTTPS, mỗi dòng một liên kết.'; END IF;
  IF cardinality(links)<>(SELECT count(DISTINCT link) FROM unnest(links) AS u(link)) THEN RAISE EXCEPTION 'Không lặp liên kết minh chứng trong cùng giải trình.'; END IF;
  PERFORM vuihoc.khoa_nguon_minh_chung_cong(p_id);
  IF links=ARRAY(SELECT lienket FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh=p_id ORDER BY thutu) THEN RETURN; END IF;
  DELETE FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh=p_id;
  INSERT INTO vuihoc."LINK_MINH_CHUNG_CONG"(magiaitrinh,thutu,lienket) SELECT p_id,n,link FROM unnest(links) WITH ORDINALITY AS u(link,n);
 END $writer$;
 f:=pg_get_functiondef('vuihoc.luu_bang_cong(text,text,jsonb,jsonb)'::regprocedure);
 IF strpos(f,'loaisuco,lienketminhchung,manguoigui')=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm gửi giải trình.'; END IF;
 f:=replace(f,'loaisuco,lienketminhchung,manguoigui','loaisuco,manguoigui');
 f:=replace(f,$old$coalesce(d->>'incidentType',''),coalesce(d->>'attachment',''),p_actor);$old$,
 $new$coalesce(d->>'incidentType',''),p_actor);
   PERFORM vuihoc.luu_link_minh_chung_cong(d->>'id',coalesce(d->>'attachment',''));$new$);
 IF strpos(f,'lienketminhchung')>0 OR strpos(f,'PERFORM vuihoc.luu_link_minh_chung_cong')=0 THEN RAISE EXCEPTION 'Chưa chuyển được luồng ghi minh chứng.'; END IF;EXECUTE f;
 DROP TRIGGER IF EXISTS dong_bo_link_minh_chung ON vuihoc."GIAI_TRINH_CONG_DAY";
 DROP FUNCTION vuihoc.dong_bo_link_minh_chung();
 ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" DROP COLUMN lienketminhchung;
 ALTER TABLE vuihoc."LINK_MINH_CHUNG_CONG"
  ADD CONSTRAINT minh_chung_thu_tu_duong CHECK(thutu>0),
  ADD CONSTRAINT minh_chung_link_hop_le CHECK(lienket ~ '^https?://[^[:space:]]+$'),
  ADD CONSTRAINT minh_chung_khong_lap UNIQUE(magiaitrinh,lienket);
 CREATE FUNCTION vuihoc.bao_ve_minh_chung_cong() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 BEGIN
  IF TG_OP='UPDATE' AND NEW.magiaitrinh IS DISTINCT FROM OLD.magiaitrinh THEN RAISE EXCEPTION 'Không chuyển minh chứng sang giải trình khác.'; END IF;
  -- A parent deletion already passed its own payroll guard; allow its FK cascade.
  IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh=OLD.magiaitrinh) THEN RETURN OLD; END IF;
  PERFORM vuihoc.khoa_nguon_minh_chung_cong(CASE WHEN TG_OP='DELETE' THEN OLD.magiaitrinh ELSE NEW.magiaitrinh END);
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
 END $guard$;
 CREATE TRIGGER bao_ve_minh_chung_cong BEFORE INSERT OR UPDATE OR DELETE ON vuihoc."LINK_MINH_CHUNG_CONG" FOR EACH ROW EXECUTE FUNCTION vuihoc.bao_ve_minh_chung_cong();
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 EXECUTE format('ALTER VIEW vuihoc."V_GIAI_TRINH_CONG_DAY" OWNER TO %I',trusted_owner);REVOKE ALL ON vuihoc."V_GIAI_TRINH_CONG_DAY" FROM PUBLIC,anon,authenticated;
 FOREACH f IN ARRAY ARRAY['khoa_nguon_minh_chung_cong(text)','luu_link_minh_chung_cong(text,text)','bao_ve_minh_chung_cong()'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 NOTIFY pgrst,'reload schema';
END $normalize_work_evidence$;
