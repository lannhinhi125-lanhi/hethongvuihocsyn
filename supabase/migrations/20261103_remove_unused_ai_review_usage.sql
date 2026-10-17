-- Removes the retired AI review counter and its unused RPC only.
-- This discards old usage counts, not feedback text, documents or chat settings.
-- No CASCADE: unexpected dependencies abort the transaction.
BEGIN;
DO $check$
DECLARE dependencies text;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema='vuihoc' AND table_name='NHAN_XET_BUOI_HOC' AND column_name='soluottaoai') THEN
  RAISE EXCEPTION 'Chạy bản 20261021_manual_student_feedback.sql trước để gỡ luồng nhận xét AI cũ.';
 END IF;
 SELECT string_agg(p.oid::regprocedure::text,', ' ORDER BY p.proname) INTO dependencies
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'
  AND p.prokind IN ('f','p')
  AND strpos(lower(p.prosrc),'luot_nhan_xet_ai')>0
  AND NOT(n.nspname='public' AND p.proname='vuihoc_ai_usage'
   AND (p.oid IS NOT DISTINCT FROM to_regprocedure('public.vuihoc_ai_usage(text,text,text,boolean)')));
 IF dependencies IS NOT NULL THEN
  RAISE EXCEPTION 'Còn hàm khác nhắc đến bảng lượt AI: %. Dừng để kiểm tra; chưa gỡ bảng.',dependencies;
 END IF;
END $check$;
DROP FUNCTION IF EXISTS public.vuihoc_ai_usage(text,text,text,boolean);
DROP TABLE IF EXISTS vuihoc."LUOT_NHAN_XET_AI";
NOTIFY pgrst,'reload schema';
COMMIT;
