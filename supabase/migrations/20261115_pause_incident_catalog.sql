-- Apply after 20261114_catalog_query_consistency.sql. All persisted fields are scalar.
-- Run the entire file as one statement so the temporary mapping stays in one transaction.
DO $pause_catalog_migration$
BEGIN
LOCK TABLE vuihoc."LOP_HOC",vuihoc."BUOI_HOC",vuihoc."LOAI_SU_CO" IN SHARE ROW EXCLUSIVE MODE;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE vuihoc."LOAI_SU_CO" ADD COLUMN IF NOT EXISTS chopheptamdung boolean NOT NULL DEFAULT false;
ALTER TABLE vuihoc."LOAI_SU_CO" ADD COLUMN IF NOT EXISTS nghitheolich boolean NOT NULL DEFAULT false;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS manhomtamdung text;
ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN IF NOT EXISTS manhomtamdung text;
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ADD COLUMN IF NOT EXISTS dotamdunglop boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS mot_su_co_tam_dung_moi_buoi ON vuihoc."SU_CO_BUOI_HOC"(mabuoi) WHERE dotamdunglop;
DROP TRIGGER IF EXISTS kiem_tra_ly_do_tam_dung ON vuihoc."LOP_HOC";
DROP TRIGGER IF EXISTS bao_ve_su_co_tam_dung ON vuihoc."SU_CO_BUOI_HOC";

-- Extend the existing normalized catalog transport; lists remain query results.
DO $patch$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.danh_sach_truy_van(text,jsonb)'::regprocedure);
 IF strpos(f,'''allowClassPause''')=0 THEN
  f:=replace(f,'''targetParty'',s.doituong,','''allowClassPause'',s.chopheptamdung,''isScheduledBreak'',s.nghitheolich,''targetParty'',s.doituong,');
  IF strpos(f,'''allowClassPause''')=0 THEN RAISE EXCEPTION 'Không tìm thấy phép chiếu danh mục sự cố'; END IF;
  EXECUTE f;
 END IF;
 f:=pg_get_functiondef('vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean)'::regprocedure);
 IF strpos(f,'chopheptamdung')=0 THEN
  f:=replace(f,'INSERT INTO vuihoc."LOAI_SU_CO" VALUES(',
   'INSERT INTO vuihoc."LOAI_SU_CO"(manhom,madinhdanh,ma,ten,doituong,mota,danghoatdong,hesocong,loaithongbao,thutu,chopheptamdung,nghitheolich) VALUES(');
  f:=replace(f,$old$c.value->>'noticeType',c.ordinality);$old$,
   $new$c.value->>'noticeType',c.ordinality,coalesce((c.value->>'allowClassPause')::boolean,false),coalesce((c.value->>'isScheduledBreak')::boolean,false));$new$);
  IF strpos(f,'chopheptamdung')=0 THEN RAISE EXCEPTION 'Không tìm thấy phép ghi danh mục sự cố'; END IF;
  EXECUTE f;
 END IF;
 f:=pg_get_functiondef('vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean)'::regprocedure);
 IF strpos(f,'pause_kind_protection')=0 THEN
  f:=regexp_replace(f,'\mBEGIN\M',$head$BEGIN
 -- pause_kind_protection: renaming is allowed; reclassifying referenced history is not.
 IF p_table='DANH_MUC_SU_CO' AND p_row ? 'danhsachsuco' AND EXISTS(
  SELECT 1 FROM vuihoc."LOAI_SU_CO" s CROSS JOIN LATERAL jsonb_array_elements(p_row->'danhsachsuco') n
  WHERE s.manhom=p_row->>'madinhdanh' AND s.madinhdanh=n->>'id'
  AND s.nghitheolich IS DISTINCT FROM coalesce((n->>'isScheduledBreak')::boolean,false)
  AND (EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i WHERE i.manhomsuco=s.manhom AND i.masuco=s.ma)
   OR EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE (l.manhomtamdung,l.lydotamdung)=(s.manhom,s.madinhdanh))
   OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE (b.manhomtamdung,b.lydotamdung)=(s.manhom,s.madinhdanh)))
 ) THEN RAISE EXCEPTION 'Loại đã có lịch sử: không đổi giữa sự cố và nghỉ theo lịch; hãy tạo loại mới'; END IF;
$head$);
  EXECUTE f;
 END IF;
END $patch$;

INSERT INTO vuihoc."DANH_MUC_SU_CO"(madinhdanh,manhomsuco,tennhomsuco,mota)
VALUES('GRP-BREAK','GRP-BREAK','Khác','Nghỉ lễ, Tết, nghỉ theo thông báo nhà trường và các lý do nghỉ khác') ON CONFLICT DO NOTHING;
UPDATE vuihoc."LOAI_SU_CO" s SET chopheptamdung=true
 FROM vuihoc."DANH_MUC_SU_CO" g WHERE g.madinhdanh=s.manhom AND g.manhomsuco='GRP-TCH' AND s.ma IN ('INC-TCH-01','INC-TCH-02')
 AND EXISTS(SELECT 1 FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madanhmuc='CLASS_PAUSE_REASON');

-- Move old reasons without duplicating an existing teacher-leave incident.
DROP TABLE IF EXISTS pg_temp.pause_reason_map;
CREATE TEMP TABLE pause_reason_map(old_id text PRIMARY KEY,new_group text NOT NULL,new_id text NOT NULL) ON COMMIT DROP;
DO $move$
DECLARE r record; target_group text; target_id text; break_group text;
BEGIN
 SELECT madinhdanh INTO break_group FROM vuihoc."DANH_MUC_SU_CO" WHERE manhomsuco='GRP-BREAK';
 FOR r IN SELECT m.* FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc WHERE c.madanhmuc='CLASS_PAUSE_REASON' LOOP
  target_group:=NULL; target_id:=NULL;
  IF r.ma='TEACHER_LEAVE' THEN
   SELECT s.manhom,s.madinhdanh INTO target_group,target_id FROM vuihoc."LOAI_SU_CO" s
    JOIN vuihoc."DANH_MUC_SU_CO" g ON g.madinhdanh=s.manhom
    WHERE g.manhomsuco='GRP-TCH' AND s.doituong='Giáo viên' AND (s.ma='INC-TCH-01' OR s.ten=r.ten)
    ORDER BY (s.ma='INC-TCH-01') DESC,s.madinhdanh LIMIT 1;
  END IF;
  IF target_id IS NULL THEN
   IF r.ma='TEACHER_LEAVE' THEN
    SELECT madinhdanh INTO target_group FROM vuihoc."DANH_MUC_SU_CO" WHERE manhomsuco='GRP-TCH';
    IF target_group IS NULL THEN RAISE EXCEPTION 'Chưa có nhóm sự cố giáo viên để chuyển lý do xin nghỉ'; END IF;
   ELSE target_group:=break_group;
   END IF;
   target_id:='PAUSE-MIG-'||md5(r.madanhmuc||':'||r.madinhdanh);
   INSERT INTO vuihoc."LOAI_SU_CO"(manhom,madinhdanh,ma,ten,doituong,mota,danghoatdong,hesocong,loaithongbao,thutu,chopheptamdung,nghitheolich)
   VALUES(target_group,target_id,'PAUSE-'||r.ma,r.ten,CASE WHEN r.ma='TEACHER_LEAVE' THEN 'Giáo viên' ELSE 'Khách quan' END,r.mota,r.danghoatdong,
    CASE WHEN r.ma='TEACHER_LEAVE' THEN 0 ELSE NULL END,'advance',r.thutu,true,r.ma<>'TEACHER_LEAVE') ON CONFLICT DO NOTHING;
  ELSE UPDATE vuihoc."LOAI_SU_CO" SET chopheptamdung=true WHERE (manhom,madinhdanh)=(target_group,target_id);
  END IF;
  INSERT INTO pause_reason_map VALUES(r.madinhdanh,target_group,target_id);
 END LOOP;
END $move$;

-- Preserve saved report filters when their keys move from supplemental items to grouped incident IDs.
DO $templates$
DECLARE r record; values_json jsonb; converted jsonb; key text;
BEGIN
 FOR r IN SELECT * FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE truong='pauseReason' LOOP
  SELECT '['||to_jsonb(new_group)::text||','||to_jsonb(new_id)::text||']' INTO key FROM pause_reason_map WHERE old_id=r.giatri;
  IF key IS NOT NULL THEN
   UPDATE vuihoc."BO_LOC_MAU_BAO_CAO" SET giatri=jsonb_build_array(key)::text WHERE mamau=r.mamau AND truong=r.truong;
  ELSE
   BEGIN values_json:=r.giatri::jsonb; EXCEPTION WHEN invalid_text_representation THEN CONTINUE; END;
   IF jsonb_typeof(values_json)='array' THEN
    -- Unmatched keys, including sentinels and keys from an already migrated template, stay intact.
    IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(values_json) x(value) JOIN pause_reason_map m ON m.old_id=x.value) THEN
     SELECT jsonb_agg(CASE WHEN m.old_id IS NULL THEN to_jsonb(x.value) ELSE to_jsonb('['||to_jsonb(m.new_group)::text||','||to_jsonb(m.new_id)::text||']') END ORDER BY x.ordinality) INTO converted
     FROM jsonb_array_elements_text(values_json) WITH ORDINALITY x(value,ordinality) LEFT JOIN pause_reason_map m ON m.old_id=x.value;
     UPDATE vuihoc."BO_LOC_MAU_BAO_CAO" SET giatri=converted::text WHERE mamau=r.mamau AND truong=r.truong;
    END IF;
   END IF;
  END IF;
 END LOOP;
END $templates$;

ALTER TABLE vuihoc."LOP_HOC" DISABLE TRIGGER tam_nghi_lich_lop;
ALTER TABLE vuihoc."BUOI_HOC" DISABLE TRIGGER kiem_tra_ky_cong;
UPDATE vuihoc."LOP_HOC" l SET manhomtamdung=m.new_group,lydotamdung=m.new_id FROM pause_reason_map m WHERE l.manhomtamdung IS NULL AND l.lydotamdung=m.old_id;
UPDATE vuihoc."BUOI_HOC" b SET manhomtamdung=m.new_group,lydotamdung=m.new_id FROM pause_reason_map m WHERE b.manhomtamdung IS NULL AND b.lydotamdung=m.old_id;
ALTER TABLE vuihoc."LOP_HOC" ENABLE TRIGGER tam_nghi_lich_lop;
ALTER TABLE vuihoc."BUOI_HOC" ENABLE TRIGGER kiem_tra_ky_cong;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE lydotamdung IS NOT NULL AND manhomtamdung IS NULL)
 OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE lydotamdung IS NOT NULL AND manhomtamdung IS NULL) THEN
  RAISE EXCEPTION 'Có lý do tạm dừng không khớp danh mục cũ; giao dịch đã hoàn tác, cần kiểm tra trước khi chuyển';
 END IF;
END $$;
-- Retain user-created child catalogs as independent catalogs.
UPDATE vuihoc."DANH_MUC_BO_SUNG" SET madanhmuccha=NULL WHERE madanhmuccha IN (SELECT madinhdanh FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madanhmuc='CLASS_PAUSE_REASON');
DELETE FROM vuihoc."MUC_DANH_MUC" WHERE madanhmuc IN (SELECT madinhdanh FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madanhmuc='CLASS_PAUSE_REASON');
DELETE FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madanhmuc='CLASS_PAUSE_REASON';

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ly_do_tam_dung() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF (NEW.lydotamdung IS NULL)<>(NEW.manhomtamdung IS NULL) THEN RAISE EXCEPTION 'Chọn đầy đủ nhóm và lý do tạm dừng'; END IF;
 IF NEW.lydotamdung IS NOT NULL AND (TG_OP='INSERT' OR (NEW.lydotamdung,NEW.manhomtamdung) IS DISTINCT FROM (OLD.lydotamdung,OLD.manhomtamdung) OR (NEW.tamdunglich AND NOT OLD.tamdunglich)) THEN
  IF NOT EXISTS(SELECT 1 FROM vuihoc."LOAI_SU_CO" s WHERE s.manhom=NEW.manhomtamdung AND s.madinhdanh=NEW.lydotamdung AND s.danghoatdong AND s.chopheptamdung AND (s.nghitheolich OR s.hesocong IS NOT NULL)) THEN
   RAISE EXCEPTION 'Chọn lý do đang cho phép tạm dừng; loại sự cố cần được cấu hình hệ số công';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER kiem_tra_ly_do_tam_dung BEFORE INSERT OR UPDATE ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ly_do_tam_dung();
DO $patch$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.tam_nghi_lich_lop()'::regprocedure);
 IF strpos(f,'manhomtamdung')=0 THEN
  f:=replace(f,'lydotamdung=NEW.lydotamdung','lydotamdung=NEW.lydotamdung,manhomtamdung=NEW.manhomtamdung');
  f:=replace(f,'lydotamdung=NULL','lydotamdung=NULL,manhomtamdung=NULL');
  f:=replace(f,'(NEW.lydotamdung IS DISTINCT FROM OLD.lydotamdung OR','(NEW.manhomtamdung IS DISTINCT FROM OLD.manhomtamdung OR NEW.lydotamdung IS DISTINCT FROM OLD.lydotamdung OR');
  EXECUTE f;
 END IF;
END $patch$;
DROP TRIGGER IF EXISTS tam_nghi_lich_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER tam_nghi_lich_lop AFTER UPDATE OF tamdunglich,trangthai,lydotamdung,manhomtamdung,ghichutamdung ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.tam_nghi_lich_lop();

-- Generated incident and its unreviewed work row are removed together when a future pause is cancelled.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_su_co_tam_dung(p_buoi text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE b vuihoc."BUOI_HOC"; reason vuihoc."LOAI_SU_CO"; old_inc vuihoc."SU_CO_BUOI_HOC"; note text; wanted boolean; migration boolean;
BEGIN
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 migration:=coalesce(current_setting('vuihoc.pause_catalog_migration',true),'')='on';
 SELECT * INTO reason FROM vuihoc."LOAI_SU_CO" WHERE (manhom,madinhdanh)=(b.manhomtamdung,b.lydotamdung);
 wanted:=coalesce(b.tamhoandolop AND b.trangthai='NGHI_HOC' AND reason.madinhdanh IS NOT NULL AND NOT reason.nghitheolich,false);
 SELECT * INTO old_inc FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=p_buoi AND dotamdunglop FOR UPDATE;
 IF old_inc.madinhdanh IS NOT NULL AND (NOT wanted OR (old_inc.manhomsuco,old_inc.masuco) IS DISTINCT FROM (reason.manhom,reason.ma)) THEN
  note:='Sự cố '||old_inc.masuco||' ('||old_inc.madinhdanh||')';
  IF EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=p_buoi AND c.ghichu=note AND
    (c.dagui OR c.trangthaidoisoat<>'CHO_DOI_SOAT' OR c.hesocong IS DISTINCT FROM old_inc.hesocongapdung OR EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" d WHERE d.macong=c.madinhdanh))) THEN
   RAISE EXCEPTION 'Buổi tạm dừng đã có công được gửi, điều chỉnh hoặc giải trình; cần xử lý đối soát trước khi đổi lý do/tiếp tục';
  END IF;
  DELETE FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=p_buoi AND ghichu=note;
  DELETE FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh=old_inc.madinhdanh;
  old_inc:=NULL;
 END IF;
 IF NOT wanted THEN RETURN; END IF;
 -- An operator's own incident must never be overwritten or silently duplicated.
 IF old_inc.madinhdanh IS NULL AND EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=p_buoi AND NOT dotamdunglop) THEN
  IF migration OR EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=p_buoi AND manhomsuco=reason.manhom AND masuco=reason.ma) THEN RETURN; END IF;
  RAISE EXCEPTION 'Buổi đã có biên bản sự cố riêng; cần kiểm tra biên bản trước khi tạm dừng theo sự cố khác';
 END IF;
 IF old_inc.madinhdanh IS NULL AND NOT migration AND EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=p_buoi) THEN
  RAISE EXCEPTION 'Buổi đã phát sinh công riêng; cần kiểm tra trước khi tạm dừng';
 END IF;
 IF old_inc.madinhdanh IS NULL THEN
  INSERT INTO vuihoc."SU_CO_BUOI_HOC"(mabuoi,manhomsuco,masuco,tensuco,hesocongapdung,muckhancap,noidung,trangthai,dotamdunglop,baoluc)
  VALUES(p_buoi,reason.manhom,reason.ma,reason.ten,reason.hesocong,CASE WHEN reason.loaithongbao='unannounced' THEN 'EMERGENCY' ELSE 'ADVANCED' END,coalesce(b.ghichutamdung,''),'DA_GIAI_QUYET',true,coalesce(b.batdautamdung,statement_timestamp()));
 ELSE
  UPDATE vuihoc."SU_CO_BUOI_HOC" SET noidung=coalesce(b.ghichutamdung,''),tensuco=reason.ten WHERE madinhdanh=old_inc.madinhdanh AND (noidung,tensuco) IS DISTINCT FROM (coalesce(b.ghichutamdung,''),reason.ten);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_su_co_tam_dung_buoi() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN PERFORM vuihoc.dong_bo_su_co_tam_dung(NEW.madinhdanh); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS dong_bo_su_co_tam_dung_buoi ON vuihoc."BUOI_HOC";
CREATE TRIGGER dong_bo_su_co_tam_dung_buoi AFTER UPDATE OF tamhoandolop,lydotamdung,manhomtamdung,ghichutamdung ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_su_co_tam_dung_buoi();

-- Existing history gains classification but migration never rewrites past work/locked payroll.
DO $patch$
DECLARE f text; signature text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['vuihoc.ap_dung_cong_su_co()','vuihoc.chot_he_so_su_co()'] LOOP
  f:=pg_get_functiondef(signature::regprocedure);
  IF strpos(f,'pause_catalog_migration')=0 THEN
   f:=regexp_replace(f,'\mBEGIN\M',$head$BEGIN
 IF NEW.dotamdunglop AND coalesce(current_setting('vuihoc.pause_catalog_migration',true),'')='on' THEN RETURN NEW; END IF;
$head$);
   EXECUTE f;
  END IF;
 END LOOP;
END $patch$;
PERFORM set_config('vuihoc.pause_catalog_migration','on',true);
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" DISABLE TRIGGER kiem_tra_ky_cong;
DO $$ DECLARE r record; BEGIN FOR r IN SELECT madinhdanh FROM vuihoc."BUOI_HOC" WHERE tamhoandolop AND lydotamdung IS NOT NULL LOOP PERFORM vuihoc.dong_bo_su_co_tam_dung(r.madinhdanh); END LOOP; END $$;
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ENABLE TRIGGER kiem_tra_ky_cong;
PERFORM set_config('vuihoc.pause_catalog_migration','off',true);

-- Protect generated records and forbid recording holidays as payroll incidents.
CREATE OR REPLACE FUNCTION vuihoc.bao_ve_su_co_tam_dung() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 -- Catalog coefficient synchronization may update its snapshot, but never classification or notes.
 IF TG_OP='UPDATE' AND OLD.dotamdunglop AND NEW.dotamdunglop
 AND (to_jsonb(NEW)-ARRAY['hesocongapdung','ngaycapnhat']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['hesocongapdung','ngaycapnhat'])
 AND NEW.hesocongapdung IS NOT DISTINCT FROM (SELECT hesocong FROM vuihoc."LOAI_SU_CO" WHERE manhom=NEW.manhomsuco AND ma=NEW.masuco) THEN RETURN NEW; END IF;
 IF pg_trigger_depth()=1 AND ((TG_OP<>'INSERT' AND OLD.dotamdunglop) OR (TG_OP<>'DELETE' AND NEW.dotamdunglop)) THEN
  RAISE EXCEPTION 'Sự cố tự đồng bộ từ tạm dừng lớp; sửa lý do tại quản lý lớp';
 END IF;
 IF TG_OP<>'DELETE' AND EXISTS(SELECT 1 FROM vuihoc."LOAI_SU_CO" s WHERE s.manhom=NEW.manhomsuco AND s.ma=NEW.masuco AND s.nghitheolich) THEN
  RAISE EXCEPTION 'Nghỉ theo lịch không phải biên bản sự cố; dùng Tạm dừng lớp';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS bao_ve_su_co_tam_dung ON vuihoc."SU_CO_BUOI_HOC";
CREATE TRIGGER bao_ve_su_co_tam_dung BEFORE INSERT OR UPDATE OR DELETE ON vuihoc."SU_CO_BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.bao_ve_su_co_tam_dung();

DO $config$
DECLARE conf jsonb; dataset text; f text;
BEGIN
 conf:=vuihoc.business_config();
 FOREACH dataset IN ARRAY ARRAY['classes','dated_lessons'] LOOP
  IF NOT (conf->dataset->'columns' ? 'manhomtamdung') THEN conf:=jsonb_set(conf,ARRAY[dataset,'columns'],conf->dataset->'columns'||'["manhomtamdung"]'::jsonb); END IF;
 END LOOP;
 IF NOT (conf->'lesson_incidents'->'columns' ? 'dotamdunglop') THEN conf:=jsonb_set(conf,'{lesson_incidents,columns}',conf->'lesson_incidents'->'columns'||'["dotamdunglop"]'::jsonb); END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 f:=replace(f,$old$WHEN 'custom_catalogs' THEN 'madanhmuc=''CLASS_PAUSE_REASON'''$old$,$new$WHEN 'custom_catalogs' THEN 'false'$new$);
 EXECUTE f;
END $config$;
DO $constraints$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."LOAI_SU_CO"'::regclass AND conname='nghi_theo_lich_khach_quan') THEN
  ALTER TABLE vuihoc."LOAI_SU_CO" ADD CONSTRAINT nghi_theo_lich_khach_quan CHECK(NOT nghitheolich OR doituong='Khách quan');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."LOP_HOC"'::regclass AND conname='lop_ly_do_tam_dung_fk') THEN
  ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_ly_do_tam_dung_fk FOREIGN KEY(manhomtamdung,lydotamdung) REFERENCES vuihoc."LOAI_SU_CO"(manhom,madinhdanh) DEFERRABLE INITIALLY DEFERRED;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."BUOI_HOC"'::regclass AND conname='buoi_ly_do_tam_dung_fk') THEN
  ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_ly_do_tam_dung_fk FOREIGN KEY(manhomtamdung,lydotamdung) REFERENCES vuihoc."LOAI_SU_CO"(manhom,madinhdanh) DEFERRABLE INITIALLY DEFERRED;
 END IF;
END $constraints$;
REVOKE ALL ON FUNCTION vuihoc.dong_bo_su_co_tam_dung(text),vuihoc.dong_bo_su_co_tam_dung_buoi(),vuihoc.bao_ve_su_co_tam_dung(),vuihoc.kiem_tra_ly_do_tam_dung() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
END $pause_catalog_migration$;
