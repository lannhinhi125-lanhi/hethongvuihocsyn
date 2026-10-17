-- Read-only. Return execution context, not student data or credentials.
WITH owner AS (
 SELECT proowner FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_save_business(text,jsonb)')
)
SELECT n.nspname AS schema_name,p.proname AS function_name,
 pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_userbyid(p.proowner) AS function_owner,p.prosecdef AS security_definer,
 has_schema_privilege(p.proowner,'vuihoc','USAGE') AS owner_can_use_schema,
 has_function_privilege(o.proowner,p.oid,'EXECUTE') AS save_rpc_owner_can_execute,
 has_schema_privilege('anon','vuihoc','USAGE') AS browser_has_private_schema_usage
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN owner o
WHERE (n.nspname='public' AND p.proname IN ('vuihoc_login','vuihoc_business_data','vuihoc_save_business'))
 OR (n.nspname='vuihoc' AND p.proname IN ('tach_lich','anh_xa_khoi','ghi_truong_lien_ket','truong_lien_ket_truy_van',
  'ghi_du_lieu_quan_he','ghi_thay_doi_quan_he','kiem_tra_sua_ho_so','kiem_tra_sua_ho_so_truoc_dung_lop',
  'kiem_tra_dang_ky_mon','kiem_tra_dang_ky_mon_trigger','ghi_truy_vet_dang_ky_mon','dang_ky_mon_truy_van'))
ORDER BY n.nspname,p.proname;
