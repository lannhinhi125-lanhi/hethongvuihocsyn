-- Run in Supabase SQL Editor as the database administrator.
-- Repairs RPC execution context only. Does not modify/delete business rows,
-- add columns, or grant browser roles access to private tables/schema.
BEGIN;
DO $repair$
DECLARE trusted_owner name; rpc regprocedure;
BEGIN
 -- Reuse the owner of the existing, session-validating login entry point.
 -- Never make a browser role the owner of a SECURITY DEFINER function.
 SELECT pg_get_userbyid(proowner) INTO trusted_owner
 FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Không xác định được owner quản trị của RPC đăng nhập. Chạy diagnostics/business_rpc_permissions.sql trước.';
 END IF;
 IF NOT has_schema_privilege(trusted_owner,'vuihoc','USAGE')
 OR NOT has_table_privilege(trusted_owner,'vuihoc."NGUOI_DUNG"','SELECT') THEN
  RAISE EXCEPTION 'Owner RPC đăng nhập chưa đủ quyền database. Cần kiểm tra owner trước khi sửa.';
 END IF;
 FOREACH rpc IN ARRAY ARRAY[
   to_regprocedure('public.vuihoc_business_data(text)'),
   to_regprocedure('public.vuihoc_save_business(text,jsonb)')
 ] LOOP
  IF rpc IS NULL THEN RAISE EXCEPTION 'Thiếu RPC nghiệp vụ. Cần chạy migration nghiệp vụ trước.'; END IF;
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',rpc,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',rpc);
  EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog',rpc);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',rpc);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated',rpc);
 END LOOP;
END $repair$;
NOTIFY pgrst,'reload schema';
COMMIT;
