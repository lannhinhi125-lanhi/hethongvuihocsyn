-- Run as postgres in Supabase SQL Editor. Repairs execution context, not business data.
BEGIN;
DO $repair_class_permissions$
DECLARE trusted_owner name; rpc regprocedure; fn record; body text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc
 WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Không xác định được owner quản trị của RPC đăng nhập.';
 END IF;
 IF NOT has_schema_privilege(trusted_owner,'vuihoc','USAGE')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."NGUOI_DUNG"','SELECT')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."LOP_HOC"','UPDATE') THEN
  RAISE EXCEPTION 'Owner RPC đăng nhập chưa đủ quyền truy cập dữ liệu lớp.';
 END IF;
 FOREACH rpc IN ARRAY ARRAY[
  to_regprocedure('public.vuihoc_business_data(text)'),
  to_regprocedure('public.vuihoc_save_business(text,jsonb)'),
  to_regprocedure('public.vuihoc_remove_class_student(text,text,text)')
 ] LOOP
  IF rpc IS NULL THEN CONTINUE; END IF;
  SELECT prosrc INTO body FROM pg_proc WHERE oid=rpc;
  IF strpos(body,'vuihoc.nguoi_dung_phien')=0 THEN
   RAISE EXCEPTION 'RPC % chưa có kiểm tra phiên đăng nhập dự kiến.',rpc;
  END IF;
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',rpc,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',rpc);
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog',rpc);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',rpc);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated',rpc);
 END LOOP;
 -- Deferred checks fire at COMMIT, after the SECURITY DEFINER RPC has returned.
 -- They must retain trusted privileges without exposing private tables to the browser.
 -- Also repair incorrectly owned elevated helpers used only by pause/incident writes.
 FOR fn IN
  SELECT p.oid::regprocedure AS signature FROM pg_proc p
  JOIN pg_namespace pn ON pn.oid=p.pronamespace
  WHERE pn.nspname='vuihoc' AND p.prokind='f' AND (
   EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace cn ON cn.oid=c.relnamespace
    WHERE t.tgfoid=p.oid AND cn.nspname='vuihoc' AND NOT t.tgisinternal
     AND (t.tgdeferrable OR (p.prosecdef AND c.relname IN
      ('LOP_HOC','BUOI_HOC','SU_CO_BUOI_HOC','CONG_DAY_BUOI_HOC','DANG_KY_MON_HOC','XEP_LOP_DANG_KY'))))
   OR (p.prosecdef AND p.proname IN ('dong_bo_su_co_tam_dung','kiem_tra_thoi_han_lop','kiem_tra_dang_ky_mon'))
  )
 LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',fn.signature,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',fn.signature);
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog',fn.signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
 END LOOP;
END $repair_class_permissions$;
NOTIFY pgrst,'reload schema';
COMMIT;
