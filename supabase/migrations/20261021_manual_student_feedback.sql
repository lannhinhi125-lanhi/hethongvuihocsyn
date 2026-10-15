-- Run after 20261020. Keep existing feedback text rows and lesson/student FKs.
BEGIN;
LOCK TABLE vuihoc."NHAN_XET_BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
DO $functions$
DECLARE f text; a integer; b integer; conf jsonb; r record;
BEGIN
 -- Remove old criterion enrichment from the underlying relational projection.
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he_truoc_bo_json(text,jsonb)'::regprocedure);
 a:=strpos(f,' ELSIF p_table=''LOP_HOC'' THEN'); b:=strpos(f,' ELSIF p_table=''MAU_BAO_CAO'' THEN');
 IF a>0 AND b>a THEN f:=left(f,a-1)||substr(f,b); EXECUTE f; END IF;

 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 f:=replace(f,',''feedbackCriteria''','');
 f:=replace(f,'IF s ? ''feedback'' OR s ? ''feedbackCriteria'' THEN','IF s ? ''feedback'' THEN');
 f:=replace(f,'coalesce(s->''feedback'',''{}'')||coalesce(s->''feedbackCriteria'',''{}'')','coalesce(s->''feedback'',''{}'')');
 f:=replace(f,'IF s->''feedbackCriteria'' ? a.key THEN PERFORM vuihoc.luu_tieu_chi_nhan_xet(lesson,a.key,s->''feedbackCriteria''->a.key); END IF;','');
 f:=regexp_replace(f,'(?s)IF NOT p_backfill AND s \? ''feedbackCriteria'' THEN.*?END IF;','','g');
 IF strpos(f,'feedbackCriteria')>0 THEN RAISE EXCEPTION 'Chưa gỡ hết luồng ghi tiêu chí'; END IF;
 EXECUTE f;

 f:=pg_get_functiondef('vuihoc.danh_sach_truy_van(text,jsonb)'::regprocedure);
 a:=strpos(f,' WHEN ''NHOM_TIEU_CHI'' THEN'); b:=strpos(f,' WHEN ''DANH_MUC_BO_SUNG'' THEN');
 IF a>0 AND b>a THEN f:=left(f,a-1)||substr(f,b); EXECUTE f; END IF;
 f:=pg_get_functiondef('vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean)'::regprocedure);
 a:=strpos(f,' ELSIF p_table=''NHOM_TIEU_CHI'''); b:=strpos(f,' ELSIF p_table=''DANH_MUC_BO_SUNG''');
 IF a>0 AND b>a THEN f:=left(f,a-1)||substr(f,b); EXECUTE f; END IF;

 conf:=vuihoc.business_config()-'criteria_categories';
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 f:=replace(f,'sessionfield IN (''feedback'',''feedbackCriteria'')','sessionfield=''feedback''');
 f:=replace(f,'IF NOT vuihoc.business_teacher_can(actor.madinhdanh,''Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy'') THEN RAISE EXCEPTION ''Không có quyền nhận xét''',
  'IF NOT vuihoc.business_teacher_can(actor.madinhdanh,''Giáo viên Check-in / Check-out vào ca dạy'') THEN RAISE EXCEPTION ''Không có quyền nhận xét'''); EXECUTE f;
 FOR r IN SELECT n.nspname,c.relname,t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid
 WHERE NOT t.tgisinternal AND p.proname='luu_tieu_chi_tu_lop'
 LOOP EXECUTE format('DROP TRIGGER %I ON %I.%I',r.tgname,r.nspname,r.relname); END LOOP;
END $functions$;
DROP FUNCTION IF EXISTS vuihoc.luu_tieu_chi_tu_lop();
DROP FUNCTION IF EXISTS vuihoc.luu_tieu_chi_nhan_xet(text,text,jsonb);
DROP TABLE IF EXISTS vuihoc."TIEU_CHI_NHAN_XET";
DROP TABLE IF EXISTS vuihoc."LUA_CHON_TIEU_CHI";
DROP TABLE IF EXISTS vuihoc."TIEU_CHI";
DROP TABLE IF EXISTS vuihoc."NHOM_TIEU_CHI";
-- Handwritten comments need no AI tone reference. Keep noidung and timestamps.
ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" DROP COLUMN IF EXISTS mavanphong;
ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" DROP COLUMN IF EXISTS soluottaoai;
CREATE OR REPLACE FUNCTION vuihoc.luu_nguoi_nhan_xet() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF btrim(coalesce(NEW.noidung,''))<>'' AND (TG_OP='INSERT' OR NEW.noidung IS DISTINCT FROM OLD.noidung) THEN
  NEW.manguoicapnhat:=coalesce(nullif(current_setting('vuihoc.actor',true),''),NEW.manguoicapnhat);
  NEW.ngaycapnhat:=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS luu_nguoi_nhan_xet ON vuihoc."NHAN_XET_BUOI_HOC";
CREATE TRIGGER luu_nguoi_nhan_xet BEFORE INSERT OR UPDATE OF noidung ON vuihoc."NHAN_XET_BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.luu_nguoi_nhan_xet();
REVOKE ALL ON FUNCTION vuihoc.luu_nguoi_nhan_xet() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
