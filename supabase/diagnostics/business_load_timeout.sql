-- Run in Supabase SQL Editor while the application shows a load timeout.
-- Read-only: no credentials, session tokens, or business rows are returned.

-- Show active requests, waits and blocking connections.
SELECT pid, application_name, state, wait_event_type, wait_event,
       clock_timestamp() - query_start AS elapsed,
       pg_blocking_pids(pid) AS blocking_pids
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid()
  AND state <> 'idle'
ORDER BY query_start;

-- Role limits can differ from the SQL Editor's own statement_timeout.
SELECT r.rolname, s.setconfig
FROM pg_db_role_setting s
LEFT JOIN pg_roles r ON r.oid = s.setrole
WHERE r.rolname IN ('anon', 'authenticated', 'authenticator') OR s.setrole = 0;

-- Table size, last planner-statistics refresh, and sequential scan volume.
SELECT relname, n_live_tup, seq_scan, idx_scan, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'vuihoc'
ORDER BY n_live_tup DESC;

-- Identify deployed RPC/helper versions without exposing their source.
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE (n.nspname = 'public' AND p.proname = 'vuihoc_business_data')
   OR (n.nspname = 'vuihoc' AND p.proname IN
       ('bang_cong_truy_van', 'ca_cong_truy_van', 'giai_trinh_truy_van'));
