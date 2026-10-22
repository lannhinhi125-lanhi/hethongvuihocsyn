-- Apply after 20261129. Atomic, repeatable; work amounts and reconciliation facts are preserved.
DO $normalize_payroll_sources$
DECLARE f text; old_definition text; pending text; r record; trusted_owner text;
BEGIN
 LOCK TABLE vuihoc."BUOI_HOC",vuihoc."CONG_DAY_BUOI_HOC",vuihoc."BANG_CONG_THANG",vuihoc."DOI_SOAT_CONG_GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CONG_DAY_BUOI_HOC' AND column_name='kycong') THEN RETURN; END IF;
 IF to_regclass('vuihoc."V_GIAI_TRINH_CONG_DAY"') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261129 trước.'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(c.madinhdanh,', ' ORDER BY c.madinhdanh) INTO pending
 FROM vuihoc."CONG_DAY_BUOI_HOC" c LEFT JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
 LEFT JOIN vuihoc."BANG_CONG_THANG" p ON p.kycong=to_char(b.ngayhoc,'YYYY-MM')
 WHERE b.madinhdanh IS NULL OR p.madinhdanh IS NULL
 OR c.kycong IS DISTINCT FROM to_char(b.ngayhoc,'YYYY-MM')
 OR c.vaitro IS DISTINCT FROM CASE WHEN c.magiaovien=b.magiaoviendaythay THEN 'DAY_THAY' ELSE 'CHINH' END
 OR (c.magiaovien IS DISTINCT FROM b.magiaovienchinh AND c.magiaovien IS DISTINCT FROM b.magiaoviendaythay);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Dòng công chưa khớp kỳ/vai trò/giáo viên của buổi học; chưa xóa cột nào.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/payroll_source_legacy.sql để đối soát. Không tự chuyển kỳ hoặc giáo viên của lịch sử công.'; END IF;

 CREATE VIEW vuihoc."V_CONG_DAY_BUOI_HOC" WITH(security_invoker=true) AS
 SELECT c.madinhdanh,c.mabuoi,c.magiaovien,to_char(b.ngayhoc,'YYYY-MM') AS kycong,
 CASE WHEN c.magiaovien=b.magiaoviendaythay THEN 'DAY_THAY' ELSE 'CHINH' END AS vaitro,
 c.hesocong,c.ghichu,c.dagui,c.guiluc,c.ngaytao,c.ngaycapnhat,c.loaicong,c.trangthaidoisoat
 FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi;
 CREATE FUNCTION vuihoc.ky_cong_buoi(p_buoi text) RETURNS text
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $period$
 SELECT to_char(ngayhoc,'YYYY-MM') FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi
 $period$;

 -- Reads, including teacher visibility, explanations and evidence, all use the same JOIN.
 FOR r IN SELECT p.oid,pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%CONG_DAY_BUOI_HOC%'
 LOOP
  f:=regexp_replace(r.def,'(FROM|JOIN) vuihoc\."CONG_DAY_BUOI_HOC"','\1 vuihoc."V_CONG_DAY_BUOI_HOC"','g');
  IF f<>r.def THEN EXECUTE f; END IF;
 END LOOP;
 -- A work upsert writes only the actual credited teacher, coefficient and work classification.
 f:=pg_get_functiondef('vuihoc.ghi_ca_vao_bang_cong(text,text,numeric,text,text,text,boolean)'::regprocedure);old_definition:=f;
 f:=replace(f,'(mabuoi,magiaovien,kycong,vaitro,hesocong,ghichu,loaicong)','(mabuoi,magiaovien,hesocong,ghichu,loaicong)');
 f:=replace(f,$old$p_buoi,p_giaovien,ky,CASE WHEN b.magiaoviendaythay=p_giaovien THEN 'DAY_THAY' ELSE 'CHINH' END,p_heso$old$,$new$p_buoi,p_giaovien,p_heso$new$);
 IF f=old_definition OR strpos(f,'magiaovien,kycong,vaitro')>0 THEN RAISE EXCEPTION 'Chưa chuyển được hàm ghi công.'; END IF;EXECUTE f;
 f:=pg_get_functiondef('vuihoc.luu_bang_cong(text,text,jsonb,jsonb)'::regprocedure);old_definition:=f;
 f:=replace(f,$old$WHERE kycong=ky AND magiaovien=t->>'teacherId' AND mabuoi=s->>'id'$old$,
 $new$WHERE vuihoc.ky_cong_buoi(mabuoi)=ky AND magiaovien=t->>'teacherId' AND mabuoi=s->>'id'$new$);
 IF f=old_definition THEN RAISE EXCEPTION 'Chưa chuyển được luồng điều chỉnh/đối soát công.'; END IF;EXECUTE f;
 f:=pg_get_functiondef('vuihoc.cong_ca_sang_bang_thang()'::regprocedure);
 IF strpos(f,'NEW.kycong')=0 THEN RAISE EXCEPTION 'Không nhận diện được luồng tạo đối soát giáo viên.'; END IF;
 f:=replace(f,'NEW.kycong','vuihoc.ky_cong_buoi(NEW.mabuoi)');EXECUTE f;

 -- Keep the existing period lock, teacher eligibility, immutable lesson identity and adjustment reasons.
 f:=pg_get_functiondef('vuihoc.kiem_tra_ky_cong_buoi()'::regprocedure);old_definition:=f;
 f:=replace(f,$old$IF NEW.kycong<>ky THEN RAISE EXCEPTION 'Kỳ công phải lấy từ ngày của ca học (%)',ky; END IF;$old$,
 $new$IF khoa IS NULL THEN RAISE EXCEPTION 'Chưa có kỳ công tương ứng với buổi học (%).',ky; END IF;$new$);
 f:=replace(f,'(NEW.magiaovien,NEW.vaitro) IS DISTINCT FROM (OLD.magiaovien,OLD.vaitro)','NEW.magiaovien IS DISTINCT FROM OLD.magiaovien');
 IF f=old_definition OR strpos(f,'NEW.kycong')>0 OR strpos(f,'NEW.vaitro')>0 OR strpos(f,'OLD.vaitro')>0 THEN RAISE EXCEPTION 'Chưa chuyển được kiểm tra nguồn kỳ công.'; END IF;EXECUTE f;

 -- Preserve the public columns of existing report views, with their new source dependency.
 FOR r IN SELECT c.oid,c.relname,pg_get_viewdef(c.oid,true) AS def FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='vuihoc' AND c.relkind='v' AND c.relname<>'V_CONG_DAY_BUOI_HOC'
 LOOP
  f:=regexp_replace(r.def,'(FROM|JOIN) vuihoc\."CONG_DAY_BUOI_HOC"','\1 vuihoc."V_CONG_DAY_BUOI_HOC"','g');
  IF f<>r.def THEN EXECUTE format('CREATE OR REPLACE VIEW vuihoc.%I WITH(security_invoker=true) AS %s',r.relname,f); END IF;
 END LOOP;

 ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" DROP COLUMN kycong,DROP COLUMN vaitro;
 CREATE INDEX cong_day_giao_vien_buoi_idx ON vuihoc."CONG_DAY_BUOI_HOC"(magiaovien,mabuoi);
 -- The old direct period FK disappeared with its copied column. Protect the derived relation.
 CREATE FUNCTION vuihoc.bao_ve_ky_cong_co_du_lieu() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 BEGIN
  IF TG_OP='UPDATE' AND NEW.kycong IS NOT DISTINCT FROM OLD.kycong THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM vuihoc."V_CONG_DAY_BUOI_HOC" WHERE kycong=OLD.kycong) THEN RAISE EXCEPTION 'Kỳ còn dòng công; không xóa hoặc đổi mã kỳ.'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
 END $guard$;
 CREATE TRIGGER bao_ve_ky_cong_co_du_lieu BEFORE DELETE OR UPDATE OF kycong ON vuihoc."BANG_CONG_THANG" FOR EACH ROW EXECUTE FUNCTION vuihoc.bao_ve_ky_cong_co_du_lieu();

 -- No business-row updates, trigger suspension, extra storage tables or CASCADE.
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 EXECUTE format('ALTER VIEW vuihoc."V_CONG_DAY_BUOI_HOC" OWNER TO %I',trusted_owner);REVOKE ALL ON vuihoc."V_CONG_DAY_BUOI_HOC" FROM PUBLIC,anon,authenticated;
 FOREACH f IN ARRAY ARRAY['ky_cong_buoi(text)','bao_ve_ky_cong_co_du_lieu()'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 NOTIFY pgrst,'reload schema';
END $normalize_payroll_sources$;
