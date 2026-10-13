BEGIN;

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
