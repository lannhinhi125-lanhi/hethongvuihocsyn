-- Apply after 20261218_resolve_incident_before_credit.sql.
-- Preserve historical work; recompute only on subsequent incident changes.
BEGIN;

-- A report targets the original teacher for teacher incidents, otherwise the
-- actual teacher. Preserve the existing separation of cover and primary work.
CREATE OR REPLACE FUNCTION vuihoc.tong_hop_cong_su_co(p_buoi text,p_giaovien text)
RETURNS TABLE(soluong bigint,dadieukien boolean,heso numeric,ghichu text)
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 WITH reports AS (
  SELECT i.*,l.ten FROM vuihoc."SU_CO_BUOI_HOC" i
  JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=i.mabuoi
  JOIN vuihoc."DANH_MUC_SU_CO" g ON g.madinhdanh=i.manhomsuco
  LEFT JOIN vuihoc."LOAI_SU_CO" l ON l.manhom=i.manhomsuco AND l.ma=i.masuco
  WHERE i.mabuoi=p_buoi AND p_giaovien=CASE WHEN g.manhomsuco='GRP-TCH'
   THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END
 ), totals AS (
  SELECT count(*) n,coalesce(bool_and(trangthai='DA_GIAI_QUYET' AND hesocongapdung IS NOT NULL),false) ready,
   coalesce(max(hesocongapdung) FILTER(WHERE hesocongapdung>0),0)
    +coalesce(min(hesocongapdung) FILTER(WHERE hesocongapdung<0),0) coefficient,
   string_agg(coalesce(ten,'Sự cố buổi học'),'; ' ORDER BY baoluc,madinhdanh) note FROM reports
 ) SELECT n,ready,CASE WHEN ready THEN coefficient ELSE NULL END,
  CASE WHEN n>0 THEN 'Tổng hợp '||n||' phiếu: '||note ELSE '' END FROM totals
$$;
REVOKE ALL ON FUNCTION vuihoc.tong_hop_cong_su_co(text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION vuihoc.ap_dung_cong_su_co()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b vuihoc."BUOI_HOC"; target text; teacher_incident boolean; total record; changed boolean;
BEGIN
 IF NEW.dotamdunglop AND coalesce(current_setting('vuihoc.pause_catalog_migration',true),'')='on' THEN RETURN NEW; END IF;
 -- incident_resolution_guard: unresolved reports must not apply any coefficient.
 IF NEW.trangthai IS DISTINCT FROM 'DA_GIAI_QUYET' OR NEW.hesocongapdung IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi FOR UPDATE;
 SELECT manhomsuco='GRP-TCH' INTO teacher_incident FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh=NEW.manhomsuco;
 target:=CASE WHEN teacher_incident THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END;
 SELECT * INTO total FROM vuihoc.tong_hop_cong_su_co(NEW.mabuoi,target);
 IF NOT total.dadieukien THEN RETURN NEW; END IF;
 changed:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN changed:=(NEW.hesocongapdung,NEW.masuco,NEW.manhomsuco,NEW.trangthai)
  IS DISTINCT FROM (OLD.hesocongapdung,OLD.masuco,OLD.manhomsuco,OLD.trangthai); END IF;
 PERFORM vuihoc.ghi_ca_vao_bang_cong(NEW.mabuoi,target,total.heso,'EMERGENCY',NEW.madinhdanh,total.ghichu,changed);
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_neu_du_nhan_xet(p_buoi text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b vuihoc."BUOI_HOC"; target text; total record;
BEGIN
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi FOR UPDATE;
 -- incident_missing_credit_guard: wait for every report before generating work.
 IF EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=p_buoi
  AND (trangthai IS DISTINCT FROM 'DA_GIAI_QUYET' OR hesocongapdung IS NULL)) THEN RETURN; END IF;
 IF NOT coalesce(vuihoc.ca_du_dieu_kien_ghi_cong(p_buoi),false) THEN RETURN; END IF;
 target:=coalesce(b.magiaoviendaythay,b.magiaovienchinh);
 IF EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=p_buoi AND magiaovien=target) THEN RETURN; END IF;
 SELECT * INTO total FROM vuihoc.tong_hop_cong_su_co(p_buoi,target);
 PERFORM vuihoc.ghi_ca_vao_bang_cong(p_buoi,target,coalesce(total.heso,1),
  CASE WHEN total.soluong>0 THEN 'EMERGENCY' WHEN b.magiaoviendaythay IS NOT NULL THEN 'COVER' ELSE 'STANDARD' END,
  NULL,total.ghichu,false);
END $$;
COMMIT;
