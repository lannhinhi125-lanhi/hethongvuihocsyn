-- After 20261207. One atomic statement; preserve every trace event and its identity.
DO $normalize_trace_subject$
DECLARE pending text; cols text; f text; r record; owner_name text;
BEGIN
 LOCK TABLE vuihoc."LOP_HOC",vuihoc."TRUY_VET_XEP_LOP" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regprocedure('vuihoc.luu_lua_chon_cap_hoc(text,jsonb)') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261207 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='TRUY_VET_XEP_LOP' AND column_name='mamonhoc') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(t.madinhdanh::text,', ' ORDER BY t.madinhdanh) INTO pending
 FROM vuihoc."TRUY_VET_XEP_LOP" t LEFT JOIN vuihoc."LOP_HOC" o ON o.madinhdanh=t.malopcu
 LEFT JOIN vuihoc."LOP_HOC" n ON n.madinhdanh=t.malopmoi
 WHERE coalesce(n.mamonhoc,o.mamonhoc) IS NULL
 OR (t.malopcu IS NOT NULL AND o.madinhdanh IS NULL) OR (t.malopmoi IS NOT NULL AND n.madinhdanh IS NULL)
 OR (o.mamonhoc IS NOT NULL AND n.mamonhoc IS NOT NULL AND o.mamonhoc IS DISTINCT FROM n.mamonhoc)
 OR t.mamonhoc IS DISTINCT FROM coalesce(n.mamonhoc,o.mamonhoc);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Môn truy vết chưa khớp nguồn lớp; chưa xóa cột nào.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/trace_subject_legacy.sql để đối soát; không tự đổi môn, đổi lớp hoặc xóa lịch sử.'; END IF;

 SELECT string_agg(format('t.%I',column_name),',' ORDER BY ordinal_position) INTO cols FROM information_schema.columns
 WHERE table_schema='vuihoc' AND table_name='TRUY_VET_XEP_LOP' AND column_name<>'mamonhoc';
 EXECUTE 'CREATE VIEW vuihoc."V_TRUY_VET_XEP_LOP" WITH(security_invoker=true) AS SELECT '||cols||',coalesce(n.mamonhoc,o.mamonhoc) AS mamonhoc FROM vuihoc."TRUY_VET_XEP_LOP" t LEFT JOIN vuihoc."LOP_HOC" o ON o.madinhdanh=t.malopcu LEFT JOIN vuihoc."LOP_HOC" n ON n.madinhdanh=t.malopmoi';
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%"TRUY_VET_XEP_LOP"%' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."TRUY_VET_XEP_LOP"','\1 vuihoc."V_TRUY_VET_XEP_LOP"','gi');
  f:=regexp_replace(f,'(\m[a-z_][a-z0-9_]*\s+)vuihoc\."TRUY_VET_XEP_LOP"([,;])','\1vuihoc."V_TRUY_VET_XEP_LOP"\2','gi');
  EXECUTE f;
 END LOOP;
 FOR r IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='vuihoc' AND c.relkind='v' AND c.relname<>'V_TRUY_VET_XEP_LOP' LOOP
  f:=pg_get_viewdef(r.oid,true);
  IF f LIKE '%"TRUY_VET_XEP_LOP"%' THEN
   f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."TRUY_VET_XEP_LOP"','\1 vuihoc."V_TRUY_VET_XEP_LOP"','gi');
   EXECUTE format('CREATE OR REPLACE VIEW vuihoc.%I WITH(security_invoker=true) AS %s',r.relname,f);
  END IF;
 END LOOP;
 CREATE OR REPLACE FUNCTION vuihoc.ghi_truy_vet_dang_ky_mon() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $writer$
 DECLARE prev text; nextclass text; hs text;
 BEGIN
  IF TG_OP<>'INSERT' THEN prev:=OLD.malop;hs:=OLD.mahocsinh; END IF;
  IF TG_OP<>'DELETE' THEN nextclass:=NEW.malop;hs:=NEW.mahocsinh; END IF;
  IF prev IS DISTINCT FROM nextclass THEN
   INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi,manguoithuchien)
   VALUES(hs,prev,nextclass,nullif(current_setting('vuihoc.actor',true),''));
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END $writer$;
 CREATE FUNCTION vuihoc.kiem_tra_nguon_mon_truy_vet() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $source$
 DECLARE old_subject text; new_subject text;
 BEGIN
  PERFORM 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh IN (NEW.malopcu,NEW.malopmoi) ORDER BY madinhdanh FOR SHARE;
  IF NEW.malopcu IS NOT NULL THEN SELECT mamonhoc INTO old_subject FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malopcu;
   IF old_subject IS NULL THEN RAISE EXCEPTION 'Thiếu lớp cũ nguồn của truy vết.'; END IF; END IF;
  IF NEW.malopmoi IS NOT NULL THEN SELECT mamonhoc INTO new_subject FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malopmoi;
   IF new_subject IS NULL THEN RAISE EXCEPTION 'Thiếu lớp mới nguồn của truy vết.'; END IF; END IF;
  IF coalesce(new_subject,old_subject) IS NULL OR (old_subject IS NOT NULL AND new_subject IS NOT NULL AND old_subject IS DISTINCT FROM new_subject) THEN
   RAISE EXCEPTION 'Truy vết xếp lớp phải có nguồn lớp và cùng môn đăng ký.';
  END IF;RETURN NEW;
 END $source$;
 CREATE TRIGGER kiem_tra_nguon_mon_truy_vet BEFORE INSERT OR UPDATE OF malopcu,malopmoi ON vuihoc."TRUY_VET_XEP_LOP" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_nguon_mon_truy_vet();
 CREATE FUNCTION vuihoc.bao_ve_mon_lop_co_truy_vet() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $protect$
 BEGIN
  IF NEW.mamonhoc IS DISTINCT FROM OLD.mamonhoc AND EXISTS(SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" WHERE malopcu=OLD.madinhdanh OR malopmoi=OLD.madinhdanh) THEN
   RAISE EXCEPTION 'Lớp đã có lịch sử xếp lớp; không đổi môn nguồn làm thay đổi lịch sử.';
  END IF;RETURN NEW;
 END $protect$;
 CREATE TRIGGER bao_ve_mon_lop_co_truy_vet BEFORE UPDATE OF mamonhoc ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.bao_ve_mon_lop_co_truy_vet();
 ALTER TABLE vuihoc."TRUY_VET_XEP_LOP" DROP COLUMN mamonhoc;
 SELECT pg_get_userbyid(proowner) INTO owner_name FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF owner_name IS NULL OR owner_name IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOR r IN SELECT signature FROM unnest(ARRAY['ghi_truy_vet_dang_ky_mon()','kiem_tra_nguon_mon_truy_vet()','bao_ve_mon_lop_co_truy_vet()']) signature LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',r.signature,owner_name);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_TRUY_VET_XEP_LOP" OWNER TO %I',owner_name);
 REVOKE ALL ON vuihoc."V_TRUY_VET_XEP_LOP" FROM PUBLIC,anon,authenticated;GRANT SELECT ON vuihoc."V_TRUY_VET_XEP_LOP" TO service_role;
 NOTIFY pgrst,'reload schema';
END $normalize_trace_subject$;
