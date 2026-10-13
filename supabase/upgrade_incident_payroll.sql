-- Run this single file in Supabase SQL Editor to install incident payroll synchronization.
BEGIN;

-- 20261012_incident_credit.sql
ALTER TABLE vuihoc."SU_CO_BUOI_HOC"
  ADD COLUMN IF NOT EXISTS hesocongapdung numeric(6,3) CHECK (hesocongapdung >= 0);

CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE item jsonb; coefficient numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.manhomsuco, NEW.masuco) IS NOT DISTINCT FROM (OLD.manhomsuco, OLD.masuco) THEN
    NEW.hesocongapdung := OLD.hesocongapdung;
    RETURN NEW;
  END IF;
  SELECT x INTO item FROM vuihoc."DANH_MUC_SU_CO" c
    CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) x
    WHERE c.madinhdanh = NEW.manhomsuco AND x->>'code' = NEW.masuco
      AND coalesce((x->>'status')::boolean,false) LIMIT 1;
  IF item IS NULL OR item->>'creditCoeff' IS NULL THEN
    RAISE EXCEPTION 'Loại sự cố chưa có hệ số công trong danh mục';
  END IF;
  coefficient := (item->>'creditCoeff')::numeric;
  IF coefficient < 0 OR coefficient > 999.999 THEN
    RAISE EXCEPTION 'Hệ số công của sự cố không hợp lệ';
  END IF;
  NEW.hesocongapdung := coefficient;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS chot_he_so_su_co ON vuihoc."SU_CO_BUOI_HOC";
CREATE TRIGGER chot_he_so_su_co BEFORE INSERT OR UPDATE ON vuihoc."SU_CO_BUOI_HOC"
  FOR EACH ROW EXECUTE FUNCTION vuihoc.chot_he_so_su_co();

CREATE OR REPLACE FUNCTION vuihoc.ap_dung_cong_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE lesson vuihoc."BUOI_HOC"; class_code text; time_range text; period text;
BEGIN
  IF NEW.hesocongapdung IS NULL OR (TG_OP = 'UPDATE' AND NEW.hesocongapdung IS NOT DISTINCT FROM OLD.hesocongapdung) THEN RETURN NEW; END IF;
  SELECT * INTO lesson FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi;
  SELECT malophoc INTO class_code FROM vuihoc."LOP_HOC" WHERE madinhdanh=lesson.malop;
  SELECT khoanggio INTO time_range FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=lesson.makhunggio;
  period := to_char(lesson.ngayhoc,'YYYY-MM');
  UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=NEW.hesocongapdung,
    ghichu='Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')',dagui=false
    WHERE mabuoi=NEW.mabuoi;
  UPDATE vuihoc."BANG_CONG_THANG" p SET danhsachgiaovien=(
    SELECT coalesce(jsonb_agg(
      CASE WHEN jsonb_typeof(t->'sessions')='array' THEN
        jsonb_set(t,'{sessions}',(
          SELECT coalesce(jsonb_agg(
            CASE WHEN s->>'classCode'=class_code
              AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
              AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
            THEN s||jsonb_build_object('creditCoeff',NEW.hesocongapdung,'hrPayNote','Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')')
            ELSE s END ORDER BY ord_s), '[]'::jsonb)
          FROM jsonb_array_elements(t->'sessions') WITH ORDINALITY AS ss(s,ord_s)))
        || CASE WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(t->'sessions') s
          WHERE s->>'classCode'=class_code
            AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
            AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
        ) THEN jsonb_build_object('payrollSent',false) ELSE '{}'::jsonb END
      ELSE t END ORDER BY ord_t), '[]'::jsonb)
    FROM jsonb_array_elements(p.danhsachgiaovien) WITH ORDINALITY AS tt(t,ord_t)
  ) WHERE p.kycong=period AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p.danhsachgiaovien) t
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(t->'sessions','[]'::jsonb)) s
    WHERE s->>'classCode'=class_code
      AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
      AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
  );
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS ap_dung_cong_su_co ON vuihoc."SU_CO_BUOI_HOC";
CREATE TRIGGER ap_dung_cong_su_co AFTER INSERT OR UPDATE ON vuihoc."SU_CO_BUOI_HOC"
  FOR EACH ROW EXECUTE FUNCTION vuihoc.ap_dung_cong_su_co();

-- A decision on a teacher's explanation can override the incident default for
-- this lesson. Keep the normalized lesson credit aligned with the monthly view.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_cong_buoi_tu_bang_thang()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE teacher jsonb; session jsonb; old_teacher jsonb; old_session jsonb;
  lesson_date date; coefficient numeric; lesson_id text;
BEGIN
 IF NEW.danhsachgiaovien IS NOT DISTINCT FROM OLD.danhsachgiaovien THEN RETURN NEW; END IF;
 FOR teacher IN SELECT value FROM jsonb_array_elements(NEW.danhsachgiaovien) LOOP
  SELECT value INTO old_teacher FROM jsonb_array_elements(OLD.danhsachgiaovien)
    WHERE value->>'teacherId'=teacher->>'teacherId' LIMIT 1;
  IF jsonb_typeof(teacher->'sessions')<>'array' THEN CONTINUE; END IF;
  FOR session IN SELECT value FROM jsonb_array_elements(teacher->'sessions') LOOP
   IF session->>'creditCoeff' IS NULL THEN CONTINUE; END IF;
   SELECT value INTO old_session FROM jsonb_array_elements(coalesce(old_teacher->'sessions','[]'::jsonb))
     WHERE value->>'id'=session->>'id' LIMIT 1;
   IF session->'creditCoeff' IS NOT DISTINCT FROM old_session->'creditCoeff' THEN CONTINUE; END IF;
   coefficient := (session->>'creditCoeff')::numeric;
   lesson_date := CASE WHEN coalesce(session->>'date','')<>'' THEN (session->>'date')::date
     ELSE to_date(left(session->>'dateStr',10),'DD/MM/YYYY') END;
   SELECT b.madinhdanh INTO lesson_id FROM vuihoc."BUOI_HOC" b
     JOIN vuihoc."LOP_HOC" c ON c.madinhdanh=b.malop
     JOIN vuihoc."KHUNG_GIO" h ON h.madinhdanh=b.makhunggio
     WHERE c.malophoc=session->>'classCode' AND b.ngayhoc=lesson_date
       AND regexp_replace(h.khoanggio,'\s','','g')=regexp_replace(coalesce(session->>'time',''),'\s','','g')
     LIMIT 1;
   IF lesson_id IS NOT NULL THEN
    UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=coefficient,
      ghichu=coalesce(nullif(btrim(session->>'hrPayNote'),''),'Điều chỉnh công sau đối soát'),dagui=false
      WHERE mabuoi=lesson_id AND magiaovien=teacher->>'teacherId';
   END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS dong_bo_cong_buoi_tu_bang_thang ON vuihoc."BANG_CONG_THANG";
CREATE TRIGGER dong_bo_cong_buoi_tu_bang_thang AFTER UPDATE OF danhsachgiaovien ON vuihoc."BANG_CONG_THANG"
  FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_cong_buoi_tu_bang_thang();

CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE ky text:=to_char(NEW.ngayhoc,'YYYY-MM'); incident vuihoc."SU_CO_BUOI_HOC";
BEGIN
 IF NEW.trangthai='HOAN_THANH' THEN
  INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES(ky,false,false) ON CONFLICT(kycong) DO NOTHING;
  SELECT * INTO incident FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=NEW.madinhdanh AND hesocongapdung IS NOT NULL ORDER BY baoluc DESC,madinhdanh DESC LIMIT 1;
  INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien,kycong,vaitro,hesocong,ghichu)
  VALUES(NEW.madinhdanh,coalesce(NEW.magiaoviendaythay,NEW.magiaovienchinh),ky,
    CASE WHEN NEW.magiaoviendaythay IS NULL THEN 'CHINH' ELSE 'DAY_THAY' END,
    coalesce(incident.hesocongapdung,1),
    CASE WHEN incident.madinhdanh IS NULL THEN '' ELSE 'Sự cố '||incident.masuco||' ('||incident.madinhdanh||')' END)
  ON CONFLICT(mabuoi) DO NOTHING;
 END IF;
 RETURN NEW;
END $fn$;

REVOKE ALL ON FUNCTION vuihoc.chot_he_so_su_co(),vuihoc.ap_dung_cong_su_co(),vuihoc.dong_bo_cong_buoi_tu_bang_thang() FROM PUBLIC,anon,authenticated;


-- 20261013_negative_work_credit.sql
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" DROP CONSTRAINT IF EXISTS "SU_CO_BUOI_HOC_hesocongapdung_check";
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ADD CONSTRAINT "SU_CO_BUOI_HOC_hesocongapdung_check" CHECK (hesocongapdung BETWEEN -999.999 AND 999.999);
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" DROP CONSTRAINT IF EXISTS "CONG_DAY_BUOI_HOC_hesocong_check";
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" ADD CONSTRAINT "CONG_DAY_BUOI_HOC_hesocong_check" CHECK (hesocong BETWEEN -999.999 AND 999.999);

CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE item jsonb; coefficient numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.manhomsuco, NEW.masuco) IS NOT DISTINCT FROM (OLD.manhomsuco, OLD.masuco) THEN
    NEW.hesocongapdung := OLD.hesocongapdung;
    RETURN NEW;
  END IF;
  SELECT x INTO item FROM vuihoc."DANH_MUC_SU_CO" c
    CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) x
    WHERE c.madinhdanh = NEW.manhomsuco AND x->>'code' = NEW.masuco
      AND coalesce((x->>'status')::boolean,false) LIMIT 1;
  IF item IS NULL OR item->>'creditCoeff' IS NULL THEN
    RAISE EXCEPTION 'Loại sự cố chưa có hệ số công trong danh mục';
  END IF;
  coefficient := (item->>'creditCoeff')::numeric;
  IF coefficient NOT BETWEEN -999.999 AND 999.999 OR coefficient::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Hệ số công của sự cố không hợp lệ';
  END IF;
  NEW.hesocongapdung := coefficient;
  RETURN NEW;
END $fn$;



-- 20261013_sync_incident_catalog_credit.sql
-- Allow the catalog sync to re-resolve a changed snapshot, while ordinary note
-- updates preserve the applied coefficient and reconciliation overrides.
CREATE OR REPLACE FUNCTION vuihoc.chot_he_so_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE item jsonb; coefficient numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.manhomsuco, NEW.masuco, NEW.hesocongapdung) IS NOT DISTINCT FROM (OLD.manhomsuco, OLD.masuco, OLD.hesocongapdung) THEN
    NEW.hesocongapdung := OLD.hesocongapdung;
    RETURN NEW;
  END IF;
  SELECT x INTO item FROM vuihoc."DANH_MUC_SU_CO" c
    CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) x
    WHERE c.madinhdanh = NEW.manhomsuco AND x->>'code' = NEW.masuco
      AND coalesce((x->>'status')::boolean,false) LIMIT 1;
  IF item IS NULL OR item->>'creditCoeff' IS NULL THEN
    RAISE EXCEPTION 'Loại sự cố chưa có hệ số công trong danh mục';
  END IF;
  coefficient := (item->>'creditCoeff')::numeric;
  IF coefficient NOT BETWEEN -999.999 AND 999.999 OR coefficient::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Hệ số công của sự cố không hợp lệ';
  END IF;
  NEW.hesocongapdung := coefficient;
  RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.ap_dung_cong_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE lesson vuihoc."BUOI_HOC"; class_code text; time_range text; period text;
BEGIN
  IF NEW.hesocongapdung IS NULL OR (TG_OP = 'UPDATE' AND NEW.hesocongapdung IS NOT DISTINCT FROM OLD.hesocongapdung) THEN RETURN NEW; END IF;
  SELECT * INTO lesson FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi;
  SELECT malophoc INTO class_code FROM vuihoc."LOP_HOC" WHERE madinhdanh=lesson.malop;
  SELECT khoanggio INTO time_range FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=lesson.makhunggio;
  period := to_char(lesson.ngayhoc,'YYYY-MM');
  UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=NEW.hesocongapdung,
    ghichu='Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')',dagui=false
    WHERE mabuoi=NEW.mabuoi;
  UPDATE vuihoc."BANG_CONG_THANG" p SET danhsachgiaovien=(
    SELECT coalesce(jsonb_agg(
      CASE WHEN jsonb_typeof(t->'sessions')='array' THEN
        jsonb_set(t,'{sessions}',(
          SELECT coalesce(jsonb_agg(
            CASE WHEN s->>'classCode'=class_code
              AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
              AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
            THEN s||jsonb_build_object('creditCoeff',NEW.hesocongapdung,'type',CASE WHEN coalesce(s->>'type','STANDARD') IN ('STANDARD','COVER') THEN 'EMERGENCY' ELSE s->>'type' END,'statusText',NEW.tensuco,'hrPayNote','Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')')
            ELSE s END ORDER BY ord_s), '[]'::jsonb)
          FROM jsonb_array_elements(t->'sessions') WITH ORDINALITY AS ss(s,ord_s)))
        || CASE WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(t->'sessions') s
          WHERE s->>'classCode'=class_code
            AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
            AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
        ) THEN jsonb_build_object('payrollSent',false) ELSE '{}'::jsonb END
      ELSE t END ORDER BY ord_t), '[]'::jsonb)
    FROM jsonb_array_elements(p.danhsachgiaovien) WITH ORDINALITY AS tt(t,ord_t)
  ) WHERE p.kycong=period AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p.danhsachgiaovien) t
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(t->'sessions','[]'::jsonb)) s
    WHERE s->>'classCode'=class_code
      AND (s->>'date'=lesson.ngayhoc::text OR left(s->>'dateStr',10)=lesson.ngayhoc::text OR left(s->>'dateStr',10)=to_char(lesson.ngayhoc,'DD/MM/YYYY'))
      AND regexp_replace(coalesce(s->>'time',''),'\s','','g')=regexp_replace(time_range,'\s','','g')
  );
  RETURN NEW;
END $fn$;


CREATE OR REPLACE FUNCTION vuihoc.dong_bo_he_so_danh_muc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN
  UPDATE vuihoc."SU_CO_BUOI_HOC" i
  SET hesocongapdung=(item->>'creditCoeff')::numeric
  FROM jsonb_array_elements(NEW.danhsachsuco) item, vuihoc."BUOI_HOC" b
  WHERE i.manhomsuco=NEW.madinhdanh AND i.masuco=item->>'code'
    AND b.madinhdanh=i.mabuoi
    AND coalesce((item->>'status')::boolean,false)
    AND item->>'creditCoeff' IS NOT NULL
    AND i.hesocongapdung IS DISTINCT FROM (item->>'creditCoeff')::numeric
    AND NOT EXISTS (SELECT 1 FROM vuihoc."BANG_CONG_THANG" p
      WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.danhsachsuco) old_item
      WHERE old_item->>'code'=item->>'code'
        AND old_item->'creditCoeff' IS DISTINCT FROM item->'creditCoeff');
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS dong_bo_he_so_danh_muc ON vuihoc."DANH_MUC_SU_CO";
CREATE TRIGGER dong_bo_he_so_danh_muc AFTER UPDATE OF danhsachsuco ON vuihoc."DANH_MUC_SU_CO"
FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_he_so_danh_muc();
REVOKE ALL ON FUNCTION vuihoc.dong_bo_he_so_danh_muc() FROM PUBLIC,anon,authenticated;
-- Repair open periods whose incident snapshot still contains a former catalog value.
UPDATE vuihoc."SU_CO_BUOI_HOC" i SET hesocongapdung=(item->>'creditCoeff')::numeric
FROM vuihoc."DANH_MUC_SU_CO" c
CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) item,
vuihoc."BUOI_HOC" b
WHERE c.madinhdanh=i.manhomsuco AND item->>'code'=i.masuco AND b.madinhdanh=i.mabuoi
AND coalesce((item->>'status')::boolean,false) AND item->>'creditCoeff' IS NOT NULL
AND i.hesocongapdung IS DISTINCT FROM (item->>'creditCoeff')::numeric
AND NOT EXISTS (SELECT 1 FROM vuihoc."BANG_CONG_THANG" p
  WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa);


-- 20261013_incident_payroll_upsert.sql
-- Materialize an operational decision even when the monthly teacher/session
-- does not exist yet. This runs inside the PH5 save transaction, not a PH7 edit.
CREATE OR REPLACE FUNCTION vuihoc.ghi_ca_vao_bang_cong(
  p_buoi text, p_giaovien text, p_heso numeric, p_loai text,
  p_suco text DEFAULT NULL, p_ghichu text DEFAULT '', p_thayheso boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE b vuihoc."BUOI_HOC"; c vuihoc."LOP_HOC"; g vuihoc."GIAO_VIEN";
  period text; slot text; staff jsonb; old_session jsonb; session jsonb; staff_list jsonb;
  incident vuihoc."SU_CO_BUOI_HOC"; names jsonb;
BEGIN
  SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi;
  SELECT * INTO c FROM vuihoc."LOP_HOC" WHERE madinhdanh=b.malop;
  SELECT * INTO g FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=p_giaovien;
  IF b.madinhdanh IS NULL OR g.madinhdanh IS NULL THEN RETURN; END IF;
  period:=to_char(b.ngayhoc,'YYYY-MM');
  PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||period,0));
  INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES(period,false,false) ON CONFLICT(kycong) DO NOTHING;
  SELECT danhsachgiaovien INTO staff_list FROM vuihoc."BANG_CONG_THANG" WHERE kycong=period AND NOT dakhoa FOR UPDATE;
  IF staff_list IS NULL THEN RAISE EXCEPTION 'Kỳ công % đã khóa',period; END IF;
  SELECT khoanggio INTO slot FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=b.makhunggio;
  SELECT * INTO incident FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh=p_suco;
  SELECT value INTO staff FROM jsonb_array_elements(staff_list) WHERE value->>'teacherId'=p_giaovien LIMIT 1;
  SELECT value INTO old_session FROM jsonb_array_elements(coalesce(staff->'sessions','[]'))
    WHERE value->>'lessonId'=p_buoi OR value->>'id'=p_buoi OR (
      value->>'classCode'=c.malophoc
      AND (value->>'date'=b.ngayhoc::text OR left(value->>'dateStr',10)=b.ngayhoc::text OR left(value->>'dateStr',10)=to_char(b.ngayhoc,'DD/MM/YYYY'))
      AND regexp_replace(coalesce(value->>'time',''),'\s','','g')=regexp_replace(slot,'\s','','g')) LIMIT 1;
  SELECT coalesce(jsonb_agg(h.hoten),'[]') INTO names FROM vuihoc."HOC_SINH" h WHERE h.madinhdanh=ANY(c.danhsachmahocsinh);
  session:=coalesce(old_session,'{}')||jsonb_build_object(
    'id',coalesce(old_session->>'id',p_buoi),'lessonId',p_buoi,
    'date',b.ngayhoc::text,'dateStr',to_char(b.ngayhoc,'DD/MM/YYYY'),'week','Tuần '||to_char(b.ngayhoc,'W'),
    'dayOfWeek',extract(isodow FROM b.ngayhoc)::text,'time',slot,
    'classCode',c.malophoc,'className',c.tenlophoc,'model',c.mamohinh,
    'teacherId',p_giaovien,'teacherName',g.hoten,'staffRole',coalesce(staff->>'staffRole','GIAO_VIEN'),'staffRoleName',coalesce(staff->>'staffRoleName','Giáo viên'),
    'studentNames',names,'studentName',coalesce(names->>0,''),'studentCount',jsonb_array_length(names),
    'durationMinutes',extract(epoch FROM b.ketthuc-b.batdau)/60,
    'checkin',coalesce(to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),'--'),
    'checkout',coalesce(to_char(b.ketthucluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),'--'),
    'hasAiReview',EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=p_buoi),
    'type',p_loai,'statusText',coalesce(incident.tensuco,CASE WHEN p_loai='COVER' THEN 'Dạy thay' ELSE 'Dạy chuẩn' END),
    'creditCoeff',CASE WHEN p_thayheso OR old_session IS NULL THEN p_heso ELSE (old_session->>'creditCoeff')::numeric END,
    'hrPayNote',CASE WHEN p_thayheso OR old_session IS NULL THEN p_ghichu ELSE coalesce(old_session->>'hrPayNote','') END,
    'reconcileStatus',coalesce(old_session->>'reconcileStatus','CHO_DOI_SOAT'),'dispute',old_session->'dispute');
  IF p_suco IS NOT NULL THEN
    session:=session||jsonb_build_object('incidentId',p_suco,'handledBy',incident.manguoixuly,
      'handledByName',(SELECT hoten FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=incident.manguoixuly),
      'handledAt',incident.xulyluc);
  END IF;
  IF session IS NOT DISTINCT FROM old_session THEN RETURN; END IF;
  staff:=coalesce(staff,jsonb_build_object('teacherId',p_giaovien,'teacherName',g.hoten,'staffRole','GIAO_VIEN',
    'staffRoleName','Giáo viên','subject',CASE WHEN g.mamonhoc='SUB-ENG' THEN 'ANH' ELSE 'TOAN' END,
    'subjectName',CASE WHEN g.mamonhoc='SUB-ENG' THEN 'Tiếng Anh' ELSE 'Toán' END,
    'standardSessions',0,'coverSessions',0,'studentCanceledSessions',0,'lateSessions',0,'emergencySessions',0,'approvedExplanations',0))
    ||jsonb_build_object('payrollSent',false,'reconcileStatus','CHO_GUI','sessions',
      CASE WHEN old_session IS NULL THEN coalesce(staff->'sessions','[]')||jsonb_build_array(session)
      ELSE (SELECT jsonb_agg(CASE WHEN x->>'id'=old_session->>'id' THEN session ELSE x END ORDER BY ord)
        FROM jsonb_array_elements(staff->'sessions') WITH ORDINALITY a(x,ord)) END);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(staff_list) t WHERE t->>'teacherId'=p_giaovien) THEN
    SELECT jsonb_agg(CASE WHEN t->>'teacherId'=p_giaovien THEN staff ELSE t END ORDER BY ord) INTO staff_list
    FROM jsonb_array_elements(staff_list) WITH ORDINALITY a(t,ord);
  ELSE staff_list:=staff_list||jsonb_build_array(staff); END IF;
  UPDATE vuihoc."BANG_CONG_THANG" SET danhsachgiaovien=staff_list WHERE kycong=period;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.ap_dung_cong_su_co()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE b vuihoc."BUOI_HOC"; target text; teacher_incident boolean; changed boolean;
BEGIN
  IF NEW.hesocongapdung IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi;
  SELECT manhomsuco='GRP-TCH' INTO teacher_incident FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh=NEW.manhomsuco;
  target:=CASE WHEN teacher_incident THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END;
  changed:=TG_OP='INSERT';
  IF TG_OP='UPDATE' THEN changed:=(NEW.hesocongapdung,NEW.masuco,NEW.manhomsuco) IS DISTINCT FROM (OLD.hesocongapdung,OLD.masuco,OLD.manhomsuco); END IF;
  -- A teacher's incident applies to that teacher, not to their replacement.
  IF changed THEN
    UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=NEW.hesocongapdung,
      ghichu='Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')',dagui=false
      WHERE mabuoi=NEW.mabuoi AND magiaovien=target;
  END IF;
  PERFORM vuihoc.ghi_ca_vao_bang_cong(NEW.mabuoi,target,NEW.hesocongapdung,'EMERGENCY',NEW.madinhdanh,
    'Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')',changed);
  RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE ky text:=to_char(NEW.ngayhoc,'YYYY-MM'); incident vuihoc."SU_CO_BUOI_HOC"; teacher_incident boolean;
BEGIN
 IF NEW.trangthai='HOAN_THANH' THEN
  INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES(ky,false,false) ON CONFLICT(kycong) DO NOTHING;
  SELECT * INTO incident FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=NEW.madinhdanh AND hesocongapdung IS NOT NULL ORDER BY baoluc DESC,madinhdanh DESC LIMIT 1;
  SELECT manhomsuco='GRP-TCH' INTO teacher_incident FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh=incident.manhomsuco;
  INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien,kycong,vaitro,hesocong,ghichu)
  VALUES(NEW.madinhdanh,coalesce(NEW.magiaoviendaythay,NEW.magiaovienchinh),ky,
    CASE WHEN NEW.magiaoviendaythay IS NULL THEN 'CHINH' ELSE 'DAY_THAY' END,
    CASE WHEN teacher_incident AND NEW.magiaoviendaythay IS NOT NULL THEN 1 ELSE coalesce(incident.hesocongapdung,1) END,
    CASE WHEN incident.madinhdanh IS NULL OR (teacher_incident AND NEW.magiaoviendaythay IS NOT NULL) THEN '' ELSE 'Sự cố '||incident.masuco||' ('||incident.madinhdanh||')' END)
  ON CONFLICT(mabuoi) DO NOTHING;
 END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.cong_ca_sang_bang_thang()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE incident vuihoc."SU_CO_BUOI_HOC"; b vuihoc."BUOI_HOC"; target text;
BEGIN
  -- A monthly manual edit already contains the authoritative session fields.
  IF pg_trigger_depth()>1 AND TG_OP='UPDATE' THEN RETURN NEW; END IF;
  SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi;
  SELECT * INTO incident FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=NEW.mabuoi AND hesocongapdung IS NOT NULL ORDER BY baoluc DESC,madinhdanh DESC LIMIT 1;
  SELECT CASE WHEN c.manhomsuco='GRP-TCH' THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END INTO target
    FROM vuihoc."DANH_MUC_SU_CO" c WHERE c.madinhdanh=incident.manhomsuco;
  PERFORM vuihoc.ghi_ca_vao_bang_cong(NEW.mabuoi,NEW.magiaovien,NEW.hesocong,
    CASE WHEN NEW.magiaovien=target THEN 'EMERGENCY' WHEN NEW.vaitro='DAY_THAY' THEN 'COVER' ELSE 'STANDARD' END,
    CASE WHEN NEW.magiaovien=target THEN incident.madinhdanh ELSE NULL END,NEW.ghichu,true);
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS cong_ca_sang_bang_thang ON vuihoc."CONG_DAY_BUOI_HOC";
CREATE TRIGGER cong_ca_sang_bang_thang AFTER INSERT OR UPDATE ON vuihoc."CONG_DAY_BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.cong_ca_sang_bang_thang();

REVOKE ALL ON FUNCTION vuihoc.ghi_ca_vao_bang_cong(text,text,numeric,text,text,text,boolean),
  vuihoc.ap_dung_cong_su_co(),vuihoc.cong_ca_sang_bang_thang() FROM PUBLIC,anon,authenticated;

-- Recover missing monthly rows without replacing coefficients already reviewed.
DO $repair$
DECLARE i record; target text;
BEGIN
  FOR i IN SELECT s.*,b.magiaovienchinh,b.magiaoviendaythay,c.manhomsuco AS nhom
    FROM vuihoc."SU_CO_BUOI_HOC" s JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=s.mabuoi
    JOIN vuihoc."DANH_MUC_SU_CO" c ON c.madinhdanh=s.manhomsuco
    WHERE s.hesocongapdung IS NOT NULL AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
  LOOP
    target:=CASE WHEN i.nhom='GRP-TCH' THEN i.magiaovienchinh ELSE coalesce(i.magiaoviendaythay,i.magiaovienchinh) END;
    PERFORM vuihoc.ghi_ca_vao_bang_cong(i.mabuoi,target,i.hesocongapdung,'EMERGENCY',i.madinhdanh,
      'Sự cố '||i.masuco||' ('||i.madinhdanh||')',false);
  END LOOP;
END $repair$;

COMMIT;
