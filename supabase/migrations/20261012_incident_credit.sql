BEGIN;

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
COMMIT;
