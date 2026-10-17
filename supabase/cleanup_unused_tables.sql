-- Reviewed against the supplied Supabase table inventory.
-- Run the whole file in SQL Editor after the per-subject enrollment migration.
-- Removes: LUOT_NHAN_XET_AI, TUY_CHON_NGUOI_DUNG, LICH_DANG_KY_HOC_SINH.
-- Discards old AI counts/UI preferences; refuses unmatched legacy student slots.
-- Keeps current per-subject student schedules and all teacher availability.
-- One transaction, safe to rerun; no CASCADE, reseeding, extra storage or tables.
BEGIN;
-- Source: migrations/20261103_remove_unused_ai_review_usage.sql
-- Removes the retired AI review counter and its unused RPC only.
-- This discards old usage counts, not feedback text, documents or chat settings.
-- No CASCADE: unexpected dependencies abort the transaction.
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

-- Source: migrations/20261104_remove_unused_legacy_tables.sql
-- After 20261026. Removes obsolete UI preferences and the single-subject schedule.
-- Current per-subject schedules and teacher weekly/recurring availability stay intact.
DO $check$
DECLARE extra text;
BEGIN
 IF to_regprocedure('vuihoc.dang_ky_mon_truy_van(text)') IS NULL
  OR to_regclass('vuihoc."LICH_DANG_KY_MON_HOC"') IS NULL THEN
  RAISE EXCEPTION 'Chạy bản 20261026 trước để chuyển lịch học sinh sang đăng ký từng môn.';
 END IF;
 IF to_regclass('vuihoc."LICH_DANG_KY_HOC_SINH"') IS NOT NULL THEN
  -- Do not discard any legacy slot that has no counterpart in the new schedule.
  IF EXISTS(SELECT 1 FROM vuihoc."LICH_DANG_KY_HOC_SINH" old
   WHERE NOT EXISTS(SELECT 1 FROM vuihoc."LICH_DANG_KY_MON_HOC" current
    WHERE current.mahocsinh=old.mahocsinh AND current.thutrongtuan=old.thutrongtuan AND current.makhunggio=old.makhunggio)) THEN
   RAISE EXCEPTION 'Còn lịch học sinh cũ chưa khớp lịch theo môn. Chưa xóa bảng; cần đối chiếu các ca này trước.';
  END IF;
 END IF;
 SELECT string_agg(p.oid::regprocedure::text,', ') INTO extra
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'
  AND p.prokind IN ('f','p') AND (
   strpos(lower(p.prosrc),'tuy_chon_nguoi_dung')>0
   OR (strpos(lower(p.prosrc),'lich_dang_ky_hoc_sinh')>0
    AND p.oid IS DISTINCT FROM to_regprocedure('vuihoc.truong_lien_ket_truy_van(text,jsonb)')
    AND p.oid IS DISTINCT FROM to_regprocedure('vuihoc.ghi_truong_lien_ket(text,jsonb,boolean)')));
 IF extra IS NOT NULL THEN RAISE EXCEPTION 'Còn hàm ngoài luồng dự kiến dùng bảng cũ: %. Chưa gỡ bảng.',extra; END IF;
END $check$;

-- Keep the existing grade/class query. The installed per-subject projection
-- adds the student schedule later, once, from the authoritative registrations.
CREATE OR REPLACE FUNCTION vuihoc.truong_lien_ket_truy_van(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE id text:=p_row->>'madinhdanh'; r jsonb:=p_row;
BEGIN
 IF p_table='LOP_HOC' THEN
  r:=r||jsonb_build_object('danhsachmahocsinh',vuihoc.hoc_sinh_lop(id),'khoi',vuihoc.khoi_lop(id),
   'lichhoc',(SELECT coalesce(string_agg(vuihoc.nhan_lich(thutrongtuan,makhunggio),', ' ORDER BY thutu),'') FROM vuihoc."LICH_LOP" WHERE malop=id));
 ELSIF p_table='HOC_SINH' THEN
  r:=r||jsonb_build_object('khoi',(SELECT nhan FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=p_row->>'macaphoc' AND madinhdanh=p_row->>'makhoi'));
 END IF;
 RETURN r;
END $$;

-- Only remove the obsolete student branch; retain the installed class writer.
DO $writer$
DECLARE f text; a integer; b integer;
BEGIN
 f:=pg_get_functiondef('vuihoc.ghi_truong_lien_ket(text,jsonb,boolean)'::regprocedure);
 IF strpos(lower(f),'lich_dang_ky_hoc_sinh')>0 THEN
  a:=strpos(f,' ELSIF p_table=''HOC_SINH'' AND p_row ? ''lichdangky'' THEN');
  b:=CASE WHEN a>0 THEN strpos(substr(f,a),'END LOOP;') ELSE 0 END;
  IF a=0 OR b=0 THEN RAISE EXCEPTION 'Hàm ghi lịch cũ khác cấu trúc dự kiến; chưa sửa hoặc xóa bảng.'; END IF;
  f:=left(f,a-1)||substr(f,a+b+length('END LOOP;')-1);
  IF strpos(lower(f),'lich_dang_ky_hoc_sinh')>0 THEN RAISE EXCEPTION 'Chưa gỡ hết tham chiếu lịch học sinh cũ.'; END IF;
  EXECUTE f;
 END IF;
END $writer$;
DROP TABLE IF EXISTS vuihoc."LICH_DANG_KY_HOC_SINH";
DROP TABLE IF EXISTS vuihoc."TUY_CHON_NGUOI_DUNG";
REVOKE ALL ON FUNCTION vuihoc.truong_lien_ket_truy_van(text,jsonb),vuihoc.ghi_truong_lien_ket(text,jsonb,boolean)
 FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
