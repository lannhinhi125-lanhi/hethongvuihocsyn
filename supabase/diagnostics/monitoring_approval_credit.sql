-- Read-only diagnosis for the reported early-checkout lesson.
-- Run in Supabase SQL Editor as postgres. No approvals or credits are changed.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '8s';

-- 1. Actual persisted clocks/status/approval; do not rely on the UI's derived label.
SELECT b.madinhdanh, to_jsonb(b)->>'mabuoihienthi' AS ma_buoi,
 b.ngayhoc,b.trangthai,b.vaolopluc,b.ketthucluc,
 to_jsonb(b)->'duyetgiamsat' AS duyet_giam_sat,
 b.magiaovienchinh,b.magiaoviendaythay,
 vuihoc.tien_do_nhan_xet_ca(b.madinhdanh) AS tien_do_nhan_xet,
 EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p
  WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa) AS ky_da_khoa
FROM vuihoc."BUOI_HOC" b
WHERE to_jsonb(b)->>'mabuoihienthi'='BH-184684';

-- 2. Recorded work and incidents for this lesson. An empty work result means
-- no work row is stored; changing the display label cannot create that row.
SELECT to_jsonb(c) AS cong_da_ghi FROM vuihoc."CONG_DAY_BUOI_HOC" c
JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
WHERE to_jsonb(b)->>'mabuoihienthi'='BH-184684';
SELECT to_jsonb(i) AS su_co FROM vuihoc."SU_CO_BUOI_HOC" i
JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=i.mabuoi
WHERE to_jsonb(b)->>'mabuoihienthi'='BH-184684';

-- 3. Installed rules (not the source files in the repository). These are
-- private business helpers; this query does not return account/session secrets.
SELECT p.oid::regprocedure::text AS ham, p.prosrc AS quy_tac_dang_cai
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='vuihoc' AND p.proname IN
 ('ca_du_dieu_kien_ghi_cong','ghi_cong_neu_du_nhan_xet','trang_thai_ca_theo_du_lieu');

-- 4. Run while another tab is stuck saving to observe lock waits.
-- No SQL text, usernames, passwords or tokens are included.
SELECT pid,state,wait_event_type,wait_event,
 clock_timestamp()-query_start AS thoi_gian_truy_van,
 pg_blocking_pids(pid) AS pid_dang_chan
FROM pg_stat_activity
WHERE datname=current_database() AND pid<>pg_backend_pid()
 AND (cardinality(pg_blocking_pids(pid))>0 OR wait_event_type='Lock')
ORDER BY query_start;
COMMIT;
