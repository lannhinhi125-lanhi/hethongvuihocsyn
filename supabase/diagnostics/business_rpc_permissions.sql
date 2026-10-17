-- Run in Supabase SQL Editor. Read only; no credentials or business rows returned.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_userbyid(p.proowner) AS function_owner,
       p.prosecdef AS security_definer, p.proconfig AS runtime_settings,
       has_schema_privilege(p.proowner,'vuihoc','USAGE') AS owner_can_use_vuihoc,
       has_table_privilege(p.proowner,'vuihoc."NGUOI_DUNG"','SELECT') AS owner_can_read_accounts,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
 AND p.proname IN ('vuihoc_login','vuihoc_session','vuihoc_business_data','vuihoc_save_business')
ORDER BY p.proname;

SELECT rolname,
       has_schema_privilege(rolname,'public','USAGE') AS public_usage,
       has_schema_privilege(rolname,'vuihoc','USAGE') AS private_schema_usage,
       has_table_privilege(rolname,'vuihoc."NGUOI_DUNG"','SELECT') AS direct_account_access
FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');
