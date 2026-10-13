-- Run this entire file in Supabase SQL Editor. All changes commit together.
-- Lists in API responses are computed by SELECT; no payroll list is persisted.
BEGIN;
LOCK TABLE vuihoc."BANG_CONG_THANG",vuihoc."CONG_DAY_BUOI_HOC",
  vuihoc."GIAI_TRINH_CONG_DAY" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS vuihoc."DOI_SOAT_CONG_GIAO_VIEN" (
  kycong text NOT NULL REFERENCES vuihoc."BANG_CONG_THANG"(kycong) ON DELETE RESTRICT,
  magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
  dagui boolean NOT NULL DEFAULT false,
  trangthai text NOT NULL DEFAULT 'CHO_GUI'
    CHECK (trangthai IN ('CHO_GUI','DA_GUI','CO_GIAI_TRINH','DA_XU_LY_GT','DA_CHOT')),
  PRIMARY KEY(kycong,magiaovien)
);
ALTER TABLE vuihoc."DOI_SOAT_CONG_GIAO_VIEN" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."DOI_SOAT_CONG_GIAO_VIEN" FROM PUBLIC,anon,authenticated;
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC"
  ADD COLUMN IF NOT EXISTS loaicong text NOT NULL DEFAULT 'STANDARD'
    CHECK (loaicong IN ('STANDARD','COVER','STUDENT_CANCELED','LATE','EMERGENCY','APPROVED_EXPLANATION'));
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC"
  ADD COLUMN IF NOT EXISTS trangthaidoisoat text NOT NULL DEFAULT 'CHO_DOI_SOAT'
    CHECK (trangthaidoisoat IN ('CHO_DOI_SOAT','DA_XAC_NHAN','CO_GIAI_TRINH','DA_CHOT'));
ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" ADD COLUMN IF NOT EXISTS lienketminhchung text NOT NULL DEFAULT '';

DROP TRIGGER IF EXISTS cong_ca_sang_bang_thang ON vuihoc."CONG_DAY_BUOI_HOC";
DROP TRIGGER IF EXISTS dong_bo_cong_buoi_tu_bang_thang ON vuihoc."BANG_CONG_THANG";
-- A substitute's credit and the original teacher's incident are separate work rows.
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" DROP CONSTRAINT IF EXISTS "CONG_DAY_BUOI_HOC_mabuoi_key";
-- Legacy stores may each hold a different pending request for the same work row.
-- Preserve both; the submission trigger below prevents new duplicate requests.
DROP INDEX IF EXISTS vuihoc.mot_giai_trinh_dang_cho;

-- Historical locked months are migrated without opening them to application edits.
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" DISABLE TRIGGER kiem_tra_ky_cong;
ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" DISABLE TRIGGER kiem_tra_ky_cong;
DO $backfill$
DECLARE r record; t jsonb; s jsonb; d jsonb; lesson text; credit text;
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc'
     AND table_name='BANG_CONG_THANG' AND column_name='danhsachgiaovien') THEN
  FOR r IN EXECUTE 'SELECT kycong,danhsachgiaovien,danhsachgiaitrinh FROM vuihoc."BANG_CONG_THANG"' LOOP
   FOR t IN SELECT value FROM jsonb_array_elements(r.danhsachgiaovien) LOOP
    INSERT INTO vuihoc."DOI_SOAT_CONG_GIAO_VIEN"(kycong,magiaovien,dagui,trangthai)
    VALUES(r.kycong,t->>'teacherId',coalesce((t->>'payrollSent')::boolean,false),coalesce(t->>'reconcileStatus','CHO_GUI'))
    ON CONFLICT(kycong,magiaovien) DO UPDATE SET dagui=excluded.dagui,trangthai=excluded.trangthai;
    FOR s IN SELECT value FROM jsonb_array_elements(coalesce(t->'sessions','[]')) LOOP
     lesson:=coalesce(s->>'lessonId',s->>'id');
     IF NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=lesson AND to_char(b.ngayhoc,'YYYY-MM')=r.kycong) THEN
      RAISE EXCEPTION 'Ca % chưa có BUOI_HOC đúng kỳ %. Không xóa dữ liệu.',lesson,r.kycong;
     END IF;
     INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien,kycong,vaitro,hesocong,ghichu,dagui,loaicong,trangthaidoisoat)
     SELECT lesson,t->>'teacherId',r.kycong,
       CASE WHEN b.magiaoviendaythay=t->>'teacherId' THEN 'DAY_THAY' ELSE 'CHINH' END,
       (s->>'creditCoeff')::numeric,coalesce(s->>'hrPayNote',''),
       coalesce((s->>'reconciliationSent')::boolean,(t->>'payrollSent')::boolean,false),
       coalesce(s->>'type','STANDARD'),coalesce(s->>'reconcileStatus','CHO_DOI_SOAT')
     FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=lesson
     ON CONFLICT(mabuoi,magiaovien) DO UPDATE SET hesocong=excluded.hesocong,
       ghichu=excluded.ghichu,dagui=excluded.dagui,loaicong=excluded.loaicong,trangthaidoisoat=excluded.trangthaidoisoat;
    END LOOP;
   END LOOP;
   FOR d IN SELECT value FROM jsonb_array_elements(r.danhsachgiaitrinh) LOOP
    SELECT c.madinhdanh INTO credit FROM vuihoc."CONG_DAY_BUOI_HOC" c
    WHERE c.kycong=r.kycong AND c.magiaovien=d->>'teacherId' AND c.mabuoi=d->>'sessionId';
    IF credit IS NULL THEN RAISE EXCEPTION 'Giải trình % chưa tìm được công. Không xóa dữ liệu.',d->>'id'; END IF;
    INSERT INTO vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh,macong,noidung,loaisuco,trangthai,ghichuduyet,lienketminhchung)
    VALUES(d->>'id',credit,coalesce(d->>'content',''),coalesce(d->>'incidentType',''),
      coalesce(d->>'status','CHO_DUYET'),coalesce(d->>'adminNote',''),coalesce(d->>'attachment',''))
    ON CONFLICT(madinhdanh) DO UPDATE SET noidung=excluded.noidung,loaisuco=excluded.loaisuco,
      trangthai=excluded.trangthai,ghichuduyet=excluded.ghichuduyet,lienketminhchung=excluded.lienketminhchung;
   END LOOP;
   -- Verify every source session and dispute before allowing the DROP COLUMN below.
   IF EXISTS (SELECT 1 FROM jsonb_array_elements(r.danhsachgiaovien) a
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(a->'sessions','[]')) x
      WHERE NOT EXISTS (SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c
       WHERE c.kycong=r.kycong AND c.magiaovien=a->>'teacherId'
       AND c.mabuoi=coalesce(x->>'lessonId',x->>'id') AND c.hesocong=(x->>'creditCoeff')::numeric))
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(r.danhsachgiaitrinh) x
      WHERE NOT EXISTS (SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" g
       WHERE g.madinhdanh=x->>'id' AND g.noidung=coalesce(x->>'content','')
         AND g.trangthai=coalesce(x->>'status','CHO_DUYET'))) THEN
     RAISE EXCEPTION 'Chưa chuyển đủ công/giải trình kỳ %. Giao dịch đã hủy.',r.kycong;
   END IF;
  END LOOP;
 END IF;
END $backfill$;
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" ENABLE TRIGGER kiem_tra_ky_cong;
ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" ENABLE TRIGGER kiem_tra_ky_cong;

CREATE INDEX IF NOT EXISTS giai_trinh_dang_cho_theo_cong ON vuihoc."GIAI_TRINH_CONG_DAY"(macong) WHERE trangthai='CHO_DUYET';
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_giai_trinh_dang_cho()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
BEGIN
 IF NEW.trangthai='CHO_DUYET' AND (TG_OP='INSERT' OR OLD.trangthai<>'CHO_DUYET') THEN
  PERFORM 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE madinhdanh=NEW.macong FOR UPDATE;
  IF EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" d WHERE d.macong=NEW.macong
    AND d.trangthai='CHO_DUYET' AND d.madinhdanh<>NEW.madinhdanh) THEN RAISE EXCEPTION 'Ca đã có giải trình đang chờ duyệt'; END IF;
 END IF;
 RETURN NEW;
END $guard$;
DROP TRIGGER IF EXISTS kiem_tra_giai_trinh_dang_cho ON vuihoc."GIAI_TRINH_CONG_DAY";
CREATE TRIGGER kiem_tra_giai_trinh_dang_cho BEFORE INSERT OR UPDATE ON vuihoc."GIAI_TRINH_CONG_DAY"
FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_giai_trinh_dang_cho();
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_giai_trinh_dang_cho() FROM PUBLIC,anon,authenticated;

-- One dispute object per normalized row; display labels come from source tables.
CREATE OR REPLACE FUNCTION vuihoc.giai_trinh_truy_van(p_cong text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $query$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',d.madinhdanh,'teacherId',c.magiaovien,'teacherName',g.hoten,
   'staffRole','GIAO_VIEN','subject',CASE WHEN g.mamonhoc='SUB-ENG' THEN 'ANH' ELSE 'TOAN' END,
   'sessionId',c.mabuoi,'sessionTime',to_char(b.ngayhoc,'DD/MM/YYYY')||' ('||k.khoanggio||')',
   'classCode',l.malophoc,'status',d.trangthai,'incidentType',d.loaisuco,
   'content',d.noidung,'attachment',d.lienketminhchung,'adminNote',d.ghichuduyet
 ) ORDER BY d.guiluc DESC,d.madinhdanh),'[]')
 FROM vuihoc."GIAI_TRINH_CONG_DAY" d
 JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.madinhdanh=d.macong
 JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=c.magiaovien
 JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
 JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
 WHERE c.madinhdanh=p_cong
$query$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_ca_vao_bang_cong(
 p_buoi text,p_giaovien text,p_heso numeric,p_loai text,
 p_suco text DEFAULT NULL,p_ghichu text DEFAULT '',p_thayheso boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE b vuihoc."BUOI_HOC"; ky text;
BEGIN
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi;
 IF b.madinhdanh IS NULL OR p_giaovien IS NULL THEN RETURN; END IF;
 ky:=to_char(b.ngayhoc,'YYYY-MM');
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
 INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao)
 VALUES(ky,false,false) ON CONFLICT(kycong) DO NOTHING;
 IF (SELECT dakhoa FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky FOR UPDATE) THEN
  RAISE EXCEPTION 'Kỳ công % đã khóa',ky;
 END IF;
 INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien,kycong,vaitro,hesocong,ghichu,loaicong)
 VALUES(p_buoi,p_giaovien,ky,CASE WHEN b.magiaoviendaythay=p_giaovien THEN 'DAY_THAY' ELSE 'CHINH' END,p_heso,p_ghichu,p_loai)
 ON CONFLICT(mabuoi,magiaovien) DO UPDATE SET
   hesocong=excluded.hesocong,ghichu=excluded.ghichu,loaicong=excluded.loaicong,dagui=false
 WHERE p_thayheso AND ("CONG_DAY_BUOI_HOC".hesocong,"CONG_DAY_BUOI_HOC".ghichu,"CONG_DAY_BUOI_HOC".loaicong)
   IS DISTINCT FROM (excluded.hesocong,excluded.ghichu,excluded.loaicong);
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.cong_ca_sang_bang_thang()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
BEGIN
 IF TG_OP='INSERT' OR (NEW.hesocong,NEW.ghichu,NEW.loaicong) IS DISTINCT FROM (OLD.hesocong,OLD.ghichu,OLD.loaicong) THEN
  INSERT INTO vuihoc."DOI_SOAT_CONG_GIAO_VIEN"(kycong,magiaovien)
  VALUES(NEW.kycong,NEW.magiaovien)
  ON CONFLICT(kycong,magiaovien) DO UPDATE SET dagui=false,trangthai='CHO_GUI';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER cong_ca_sang_bang_thang AFTER INSERT OR UPDATE ON vuihoc."CONG_DAY_BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.cong_ca_sang_bang_thang();

CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE i vuihoc."SU_CO_BUOI_HOC"; is_teacher boolean; target text;
BEGIN
 IF NEW.trangthai='HOAN_THANH' THEN
  target:=coalesce(NEW.magiaoviendaythay,NEW.magiaovienchinh);
  SELECT * INTO i FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi=NEW.madinhdanh
   AND hesocongapdung IS NOT NULL ORDER BY baoluc DESC,madinhdanh DESC LIMIT 1;
  SELECT manhomsuco='GRP-TCH' INTO is_teacher FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh=i.manhomsuco;
  IF is_teacher AND NEW.magiaoviendaythay IS NOT NULL THEN i:=NULL; END IF;
  PERFORM vuihoc.ghi_ca_vao_bang_cong(NEW.madinhdanh,target,coalesce(i.hesocongapdung,1),
    CASE WHEN i.madinhdanh IS NOT NULL THEN 'EMERGENCY'
      WHEN NEW.magiaoviendaythay IS NOT NULL THEN 'COVER' ELSE 'STANDARD' END,
    i.madinhdanh,CASE WHEN i.madinhdanh IS NULL THEN '' ELSE 'Sự cố '||i.masuco||' ('||i.madinhdanh||')' END,false);
 END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.ap_dung_cong_su_co()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE b vuihoc."BUOI_HOC"; target text; is_teacher boolean; changed boolean;
BEGIN
 IF NEW.hesocongapdung IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi;
 SELECT manhomsuco='GRP-TCH' INTO is_teacher FROM vuihoc."DANH_MUC_SU_CO" WHERE madinhdanh=NEW.manhomsuco;
 target:=CASE WHEN is_teacher THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END;
 changed:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN changed:=(NEW.hesocongapdung,NEW.masuco,NEW.manhomsuco) IS DISTINCT FROM (OLD.hesocongapdung,OLD.masuco,OLD.manhomsuco); END IF;
 PERFORM vuihoc.ghi_ca_vao_bang_cong(NEW.mabuoi,target,NEW.hesocongapdung,'EMERGENCY',NEW.madinhdanh,
   'Sự cố '||NEW.masuco||' ('||NEW.madinhdanh||')',changed);
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION vuihoc.ca_cong_truy_van(p_ky text,p_gv text)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $query$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',b.madinhdanh,'lessonId',b.madinhdanh,'week','Tuần '||to_char(b.ngayhoc,'W'),
   'date',b.ngayhoc::text,'dateStr',to_char(b.ngayhoc,'DD/MM/YYYY'),
   'dayOfWeek',CASE extract(isodow FROM b.ngayhoc)::integer WHEN 7 THEN 'Chủ nhật' ELSE 'Thứ '||(extract(isodow FROM b.ngayhoc)::integer+1) END,
   'time',k.khoanggio,'classCode',l.malophoc,'className',l.tenlophoc,
   'studentNames',names.list,'studentName',coalesce(names.list->>0,''),'studentCount',jsonb_array_length(names.list),
   'teacherId',g.madinhdanh,'teacherName',g.hoten,'staffRole','GIAO_VIEN','staffRoleName','Giáo viên',
   'model',l.mamohinh,'durationMinutes',extract(epoch FROM b.ketthuc-b.batdau)/60,
   'type',c.loaicong,'statusText',CASE c.loaicong
     WHEN 'COVER' THEN 'Dạy thay' WHEN 'STANDARD' THEN 'Dạy chuẩn'
     WHEN 'STUDENT_CANCELED' THEN 'Học sinh nghỉ học' WHEN 'LATE' THEN 'Giáo viên vào muộn'
     WHEN 'APPROVED_EXPLANATION' THEN 'Đã duyệt giải trình' ELSE coalesce(i.tensuco,'Công sự cố') END,
   'checkin',coalesce(to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),'--'),
   'checkout',coalesce(to_char(b.ketthucluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),'--'),
   'hasAiReview',EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh AND btrim(n.noidung)<>''),
   'creditCoeff',c.hesocong,'hrPayNote',c.ghichu,'reconciliationSent',c.dagui,
   'reconcileStatus',CASE WHEN m.dakhoa THEN 'DA_CHOT' ELSE c.trangthaidoisoat END,
   'dispute',vuihoc.giai_trinh_truy_van(c.madinhdanh)->0,
   'incidentId',i.madinhdanh,'handledBy',i.manguoixuly,'handledByName',u.hoten,'handledAt',i.xulyluc
 ) ORDER BY b.ngayhoc DESC,b.batdau DESC,b.madinhdanh),'[]')
 FROM vuihoc."CONG_DAY_BUOI_HOC" c
 JOIN vuihoc."BANG_CONG_THANG" m ON m.kycong=c.kycong
 JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
 JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=c.magiaovien
 JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
 LEFT JOIN LATERAL (SELECT coalesce(jsonb_agg(h.hoten ORDER BY h.madinhdanh),'[]') list
   FROM vuihoc."HOC_SINH" h WHERE h.madinhdanh=ANY(l.danhsachmahocsinh)) names ON true
 LEFT JOIN LATERAL (SELECT s.* FROM vuihoc."SU_CO_BUOI_HOC" s
   JOIN vuihoc."DANH_MUC_SU_CO" cat ON cat.madinhdanh=s.manhomsuco
   WHERE s.mabuoi=b.madinhdanh AND c.magiaovien=CASE WHEN cat.manhomsuco='GRP-TCH'
     THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END
   ORDER BY s.baoluc DESC,s.madinhdanh DESC LIMIT 1) i ON true
 LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=i.manguoixuly
 WHERE c.kycong=p_ky AND c.magiaovien=p_gv
$query$;

CREATE OR REPLACE FUNCTION vuihoc.bang_cong_truy_van(p_ky text,p_gv text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $query$
 SELECT jsonb_build_object('madinhdanh',m.madinhdanh,'kycong',m.kycong,'dakhoa',m.dakhoa,
   'daguithongbao',m.daguithongbao,'thoigiankhoa',m.thoigiankhoa,'lydomokhoa',m.lydomokhoa,
   'danhsachgiaovien',coalesce((SELECT jsonb_agg(jsonb_build_object(
     'teacherId',g.madinhdanh,'teacherName',g.hoten,'staffRole','GIAO_VIEN','staffRoleName','Giáo viên',
     'subject',CASE WHEN g.mamonhoc='SUB-ENG' THEN 'ANH' ELSE 'TOAN' END,
     'subjectName',coalesce(mon.tenmonhoc,''),'payrollSent',coalesce(d.dagui,false),
     'reconcileStatus',CASE WHEN m.dakhoa THEN 'DA_CHOT' ELSE coalesce(d.trangthai,'CHO_GUI') END,
     'sessions',vuihoc.ca_cong_truy_van(m.kycong,g.madinhdanh),
     'standardSessions',(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=g.madinhdanh AND c.loaicong='STANDARD'),
     'coverSessions',(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=g.madinhdanh AND c.loaicong='COVER'),
     'studentCanceledSessions',(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=g.madinhdanh AND c.loaicong='STUDENT_CANCELED'),
     'lateSessions',(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=g.madinhdanh AND c.loaicong='LATE'),
     'emergencySessions',(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=g.madinhdanh AND c.loaicong='EMERGENCY'),
     'approvedExplanations',(SELECT count(*) FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=g.madinhdanh AND c.loaicong='APPROVED_EXPLANATION')
   ) ORDER BY g.madinhdanh) FROM vuihoc."GIAO_VIEN" g
    LEFT JOIN vuihoc."MON_HOC" mon ON mon.madinhdanh=g.mamonhoc
    LEFT JOIN vuihoc."DOI_SOAT_CONG_GIAO_VIEN" d ON d.kycong=m.kycong AND d.magiaovien=g.madinhdanh
    WHERE (p_gv IS NULL OR g.madinhdanh=p_gv)), '[]'),
   'danhsachgiaitrinh',coalesce((SELECT jsonb_agg(x ORDER BY x->>'id')
     FROM vuihoc."CONG_DAY_BUOI_HOC" c
     CROSS JOIN LATERAL jsonb_array_elements(vuihoc.giai_trinh_truy_van(c.madinhdanh)) x
     WHERE c.kycong=m.kycong AND (p_gv IS NULL OR c.magiaovien=p_gv)),'[]'))
 FROM vuihoc."BANG_CONG_THANG" m WHERE m.kycong=p_ky
$query$;

-- The old API shape is accepted as a command; only changed scalar fields are saved.
CREATE OR REPLACE FUNCTION vuihoc.luu_bang_cong(p_actor text,p_own text,b jsonb,v jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $save$
DECLARE ky text; original jsonb; teacher_portal boolean; can_edit boolean; can_review boolean; can_send boolean; can_lock boolean;
 t jsonb; old_t jsonb; s jsonb; old_s jsonb; d jsonb; old_d jsonb; credit text; pending boolean;
BEGIN
 IF v IS NULL OR b IS NULL THEN RAISE EXCEPTION 'Kỳ công được sinh từ ca học; không tạo/xóa danh sách thủ công'; END IF;
 ky:=b->>'kycong';
 IF v->>'kycong' IS DISTINCT FROM ky OR v->>'madinhdanh' IS DISTINCT FROM b->>'madinhdanh' THEN RAISE EXCEPTION 'Không đổi định danh kỳ công'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
 PERFORM 1 FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky FOR UPDATE;
 SELECT g.congtruycap='TEACHER' INTO teacher_portal FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE u.madinhdanh=p_actor;
 original:=vuihoc.bang_cong_truy_van(ky,CASE WHEN teacher_portal THEN p_own ELSE NULL END);
 IF original IS NULL OR EXISTS(SELECT 1 FROM jsonb_each(b) e WHERE original->e.key IS DISTINCT FROM e.value) THEN
  RAISE EXCEPTION 'Bảng công đã thay đổi ở phiên khác. Hãy tải lại.';
 END IF;
 IF teacher_portal THEN
  IF p_own IS NULL THEN RAISE EXCEPTION 'Không tìm được hồ sơ giáo viên'; END IF;
  v:=vuihoc.business_teacher_dispute(p_actor,p_own,original,b,v);
 ELSE
  can_edit:=vuihoc.business_can(p_actor,'PH7','Điều chỉnh hệ số công từng buổi kèm lý do');
  can_review:=vuihoc.business_can(p_actor,'PH7','Xử lý & phê duyệt đơn giải trình công dạy');
  can_send:=vuihoc.business_can(p_actor,'PH7','Gửi bảng công cho giáo viên đối soát');
  can_lock:=vuihoc.business_can(p_actor,'PH7','Khóa, mở kỳ công và xuất CSV / in bảng công');
  IF NOT (can_edit OR can_review OR can_send OR can_lock) THEN RAISE EXCEPTION 'Không có quyền lưu công'; END IF;
  IF (v->'dakhoa',v->'thoigiankhoa',v->'lydomokhoa') IS DISTINCT FROM (b->'dakhoa',b->'thoigiankhoa',b->'lydomokhoa') AND NOT can_lock THEN RAISE EXCEPTION 'Không có quyền khóa/mở kỳ công'; END IF;
  IF original->>'dakhoa'='true' THEN
   IF v->>'dakhoa'<>'false' OR NOT can_lock OR coalesce(btrim(v->>'lydomokhoa'),'')='' THEN RAISE EXCEPTION 'Kỳ công đã khóa; mở khóa cần lý do'; END IF;
   UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=false WHERE kycong=ky;
  END IF;
  IF (v->>'daguithongbao') IS DISTINCT FROM (b->>'daguithongbao') AND NOT can_send THEN RAISE EXCEPTION 'Không có quyền gửi thông báo'; END IF;
 END IF;
 IF jsonb_typeof(v->'danhsachgiaovien') IS DISTINCT FROM 'array' OR jsonb_typeof(v->'danhsachgiaitrinh') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Danh sách không hợp lệ'; END IF;
 IF (SELECT jsonb_agg(x->>'teacherId' ORDER BY x->>'teacherId') FROM jsonb_array_elements(v->'danhsachgiaovien') x)
   IS DISTINCT FROM (SELECT jsonb_agg(x->>'teacherId' ORDER BY x->>'teacherId') FROM jsonb_array_elements(b->'danhsachgiaovien') x) THEN
  RAISE EXCEPTION 'Danh sách giáo viên phải truy vấn từ hồ sơ';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b->'danhsachgiaitrinh') x
   WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v->'danhsachgiaitrinh') y WHERE y->>'id'=x->>'id')) THEN RAISE EXCEPTION 'Không xóa giải trình đã gửi'; END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(v->'danhsachgiaitrinh') LOOP
  SELECT x INTO old_d FROM jsonb_array_elements(b->'danhsachgiaitrinh') x WHERE x->>'id'=d->>'id';
  IF d IS NOT DISTINCT FROM old_d THEN CONTINUE; END IF;
  SELECT c.madinhdanh INTO credit FROM vuihoc."CONG_DAY_BUOI_HOC" c
   WHERE c.kycong=ky AND c.magiaovien=d->>'teacherId' AND c.mabuoi=d->>'sessionId';
  IF credit IS NULL THEN RAISE EXCEPTION 'Giải trình không có ca công tương ứng'; END IF;
  IF teacher_portal AND old_d IS NULL THEN
   INSERT INTO vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh,macong,noidung,loaisuco,lienketminhchung,manguoigui)
   VALUES(d->>'id',credit,d->>'content',coalesce(d->>'incidentType',''),coalesce(d->>'attachment',''),p_actor);
  ELSIF NOT teacher_portal AND can_review AND old_d IS NOT NULL THEN
   IF (d-'status'-'adminNote') IS DISTINCT FROM (old_d-'status'-'adminNote') THEN RAISE EXCEPTION 'Chỉ duyệt trạng thái và ghi chú giải trình'; END IF;
   UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET trangthai=d->>'status',ghichuduyet=coalesce(d->>'adminNote',''),manguoiduyet=p_actor,duyetluc=now() WHERE madinhdanh=d->>'id';
  ELSE RAISE EXCEPTION 'Không có quyền thay đổi giải trình'; END IF;
 END LOOP;
 FOR t IN SELECT value FROM jsonb_array_elements(v->'danhsachgiaovien') LOOP
  SELECT x INTO old_t FROM jsonb_array_elements(b->'danhsachgiaovien') x WHERE x->>'teacherId'=t->>'teacherId';
  IF t IS NOT DISTINCT FROM old_t THEN CONTINUE; END IF;
  IF NOT teacher_portal AND t->'payrollSent' IS DISTINCT FROM old_t->'payrollSent' THEN
   IF coalesce((t->>'payrollSent')::boolean,false) AND NOT (can_send OR can_lock) THEN RAISE EXCEPTION 'Không có quyền gửi đối soát'; END IF;
  END IF;
  IF (t-'sessions'-'payrollSent'-'reconcileStatus'-'standardSessions'-'coverSessions'-'studentCanceledSessions'-'lateSessions'-'emergencySessions'-'approvedExplanations')
    IS DISTINCT FROM (old_t-'sessions'-'payrollSent'-'reconcileStatus'-'standardSessions'-'coverSessions'-'studentCanceledSessions'-'lateSessions'-'emergencySessions'-'approvedExplanations') THEN RAISE EXCEPTION 'Thông tin giáo viên phải lấy từ hồ sơ'; END IF;
  IF (SELECT jsonb_agg(x->>'id' ORDER BY x->>'id') FROM jsonb_array_elements(t->'sessions') x)
    IS DISTINCT FROM (SELECT jsonb_agg(x->>'id' ORDER BY x->>'id') FROM jsonb_array_elements(old_t->'sessions') x) THEN RAISE EXCEPTION 'Danh sách ca phải lấy từ bảng công'; END IF;
  FOR s IN SELECT value FROM jsonb_array_elements(t->'sessions') LOOP
   SELECT x INTO old_s FROM jsonb_array_elements(old_t->'sessions') x WHERE x->>'id'=s->>'id';
   IF s IS NOT DISTINCT FROM old_s THEN CONTINUE; END IF;
   IF (s-'creditCoeff'-'hrPayNote'-'type'-'statusText'-'reconciliationSent'-'reconcileStatus'-'dispute') IS DISTINCT FROM
      (old_s-'creditCoeff'-'hrPayNote'-'type'-'statusText'-'reconciliationSent'-'reconcileStatus'-'dispute') THEN RAISE EXCEPTION 'Thông tin ca phải lấy từ dữ liệu buổi học'; END IF;
   IF NOT teacher_portal THEN
    IF (s->'creditCoeff',s->'hrPayNote',s->'type') IS DISTINCT FROM (old_s->'creditCoeff',old_s->'hrPayNote',old_s->'type')
      AND NOT (can_edit OR (can_review AND EXISTS(SELECT 1 FROM jsonb_array_elements(v->'danhsachgiaitrinh') x WHERE x->>'sessionId'=s->>'id' AND x->>'teacherId'=t->>'teacherId'))) THEN RAISE EXCEPTION 'Không có quyền sửa hệ số công'; END IF;
    IF (s->'reconciliationSent',s->'reconcileStatus') IS DISTINCT FROM (old_s->'reconciliationSent',old_s->'reconcileStatus')
      AND NOT (can_send OR can_edit OR can_review OR can_lock) THEN RAISE EXCEPTION 'Không có quyền gửi đối soát'; END IF;
   END IF;
   UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET hesocong=(s->>'creditCoeff')::numeric,
    ghichu=coalesce(s->>'hrPayNote',''),loaicong=s->>'type',
    dagui=coalesce((s->>'reconciliationSent')::boolean,false),trangthaidoisoat=coalesce(s->>'reconcileStatus','CHO_DOI_SOAT')
   WHERE kycong=ky AND magiaovien=t->>'teacherId' AND mabuoi=s->>'id';
  END LOOP;
  INSERT INTO vuihoc."DOI_SOAT_CONG_GIAO_VIEN"(kycong,magiaovien,dagui,trangthai)
  VALUES(ky,t->>'teacherId',coalesce((t->>'payrollSent')::boolean,false),t->>'reconcileStatus')
  ON CONFLICT(kycong,magiaovien) DO UPDATE SET dagui=excluded.dagui,trangthai=excluded.trangthai;
 END LOOP;
 IF NOT teacher_portal THEN
  IF v->>'dakhoa'='true' AND original->>'dakhoa'<>'true' THEN
   IF NOT EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE kycong=ky)
     OR EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" d JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.madinhdanh=d.macong WHERE c.kycong=ky AND d.trangthai='CHO_DUYET')
     OR EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c LEFT JOIN vuihoc."DOI_SOAT_CONG_GIAO_VIEN" ds ON ds.kycong=c.kycong AND ds.magiaovien=c.magiaovien WHERE c.kycong=ky AND NOT coalesce(ds.dagui,false)) THEN RAISE EXCEPTION 'Chỉ khóa kỳ có công, đã gửi đối soát và không còn giải trình chờ duyệt'; END IF;
  END IF;
  UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=(v->>'dakhoa')::boolean,
   daguithongbao=(v->>'daguithongbao')::boolean,thoigiankhoa=nullif(v->>'thoigiankhoa','')::timestamptz,lydomokhoa=v->>'lydomokhoa' WHERE kycong=ky;
 END IF;
END $save$;

-- Generated integration definitions: same API, normalized storage.
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ky_cong_buoi()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE d date; buoi text; ky text; khoa boolean; gv text; cover text; cong text;
BEGIN
 IF TG_TABLE_NAME='BUOI_HOC' THEN
  IF TG_OP='INSERT' THEN d:=NEW.ngayhoc; ELSE d:=OLD.ngayhoc; END IF;
  buoi:=CASE WHEN TG_OP='DELETE' THEN OLD.madinhdanh ELSE NEW.madinhdanh END;
  IF TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=OLD.madinhdanh)
    AND (NEW.ngayhoc,NEW.malop,NEW.makhunggio,NEW.magiaovienchinh)
      IS DISTINCT FROM (OLD.ngayhoc,OLD.malop,OLD.makhunggio,OLD.magiaovienchinh) THEN
   RAISE EXCEPTION 'Ca đã phát sinh công: cần hiệu chỉnh công trước khi đổi ca';
  END IF;
 ELSE
  IF TG_TABLE_NAME='GIAI_TRINH_CONG_DAY' THEN
   cong:=CASE WHEN TG_OP='DELETE' THEN OLD.macong ELSE NEW.macong END;
   SELECT mabuoi INTO buoi FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE madinhdanh=cong;
   IF TG_OP='UPDATE' AND NEW.macong<>OLD.macong THEN RAISE EXCEPTION 'Không chuyển giải trình sang bản công khác'; END IF;
  ELSE
   buoi:=CASE WHEN TG_OP='DELETE' THEN OLD.mabuoi ELSE NEW.mabuoi END;
   IF TG_OP='UPDATE' AND NEW.mabuoi<>OLD.mabuoi THEN RAISE EXCEPTION 'Không chuyển bản ghi sang ca khác'; END IF;
  END IF;
  SELECT ngayhoc,magiaovienchinh,magiaoviendaythay INTO d,gv,cover FROM vuihoc."BUOI_HOC" WHERE madinhdanh=buoi FOR SHARE;
 END IF;
 ky:=to_char(d,'YYYY-MM');
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
 SELECT dakhoa INTO khoa FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky FOR UPDATE;
 IF khoa THEN RAISE EXCEPTION 'Kỳ công % đã khóa',ky; END IF;
 IF TG_TABLE_NAME='CONG_DAY_BUOI_HOC' AND TG_OP<>'DELETE' THEN
  IF NEW.kycong<>ky THEN RAISE EXCEPTION 'Kỳ công phải lấy từ ngày của ca học (%)',ky; END IF;
  IF TG_OP='UPDATE' AND (NEW.magiaovien,NEW.vaitro) IS DISTINCT FROM (OLD.magiaovien,OLD.vaitro) THEN RAISE EXCEPTION 'Không chuyển công sang giáo viên khác'; END IF;
  IF TG_OP='INSERT' AND NEW.magiaovien IS DISTINCT FROM coalesce(cover,gv)
    AND NOT (NEW.magiaovien=gv AND EXISTS (
      SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" s
      JOIN vuihoc."DANH_MUC_SU_CO" cat ON cat.madinhdanh=s.manhomsuco
      WHERE s.mabuoi=buoi AND cat.manhomsuco='GRP-TCH')) THEN
   RAISE EXCEPTION 'Công phải thuộc giáo viên thực dạy hoặc giáo viên có sự cố';
  END IF;
  IF TG_OP='UPDATE' AND NEW.hesocong<>OLD.hesocong AND btrim(NEW.ghichu)='' THEN RAISE EXCEPTION 'Điều chỉnh hệ số công cần lý do'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $fn$;


CREATE OR REPLACE FUNCTION vuihoc.business_teacher_dispute(actor text,own text,original jsonb,b jsonb,v jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog AS $dispute$
DECLARE projected jsonb; newdispute jsonb; oldteacher jsonb; newteacher jsonb; sess jsonb; oldsession jsonb;
BEGIN
 IF original IS NULL OR v IS NULL OR coalesce((original->>'dakhoa')::boolean,true) OR NOT vuihoc.business_teacher_can(actor,'Gửi giải trình / khiếu nại sai lệch ca dạy') THEN RAISE EXCEPTION 'Không có quyền gửi giải trình kỳ này'; END IF;
 SELECT x INTO oldteacher FROM jsonb_array_elements(original->'danhsachgiaovien') x WHERE x->>'teacherId'=own;
 IF oldteacher IS NULL THEN RAISE EXCEPTION 'Bảng công chưa được gửi cho bạn'; END IF;
 projected:=original||jsonb_build_object('danhsachgiaovien',jsonb_build_array(oldteacher),'danhsachgiaitrinh',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(original->'danhsachgiaitrinh') x WHERE x->>'teacherId'=own));
 IF EXISTS(SELECT 1 FROM jsonb_each(b) e WHERE projected->e.key IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Bảng công đã thay đổi ở phiên khác. Hãy tải lại.'; END IF;
 IF (v-'danhsachgiaovien'-'danhsachgiaitrinh') IS DISTINCT FROM (b-'danhsachgiaovien'-'danhsachgiaitrinh') OR jsonb_array_length(v->'danhsachgiaovien')<>1 THEN RAISE EXCEPTION 'Chỉ được thêm giải trình của mình'; END IF;
 IF jsonb_array_length(v->'danhsachgiaitrinh')<>jsonb_array_length(b->'danhsachgiaitrinh')+1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(b->'danhsachgiaitrinh') x WHERE NOT(v->'danhsachgiaitrinh' @> jsonb_build_array(x))) THEN RAISE EXCEPTION 'Không được sửa/xóa giải trình đã gửi'; END IF;
 SELECT x INTO newdispute FROM jsonb_array_elements(v->'danhsachgiaitrinh') x WHERE NOT(b->'danhsachgiaitrinh' @> jsonb_build_array(x));
 IF newdispute->>'teacherId' IS DISTINCT FROM own OR newdispute->>'status' IS DISTINCT FROM 'CHO_DUYET' OR coalesce(btrim(newdispute->>'content'),'')='' OR coalesce(newdispute->>'id','')='' OR EXISTS(SELECT 1 FROM jsonb_array_elements(original->'danhsachgiaitrinh') x WHERE x->>'id'=newdispute->>'id' OR (x->>'teacherId'=own AND x->>'sessionId'=newdispute->>'sessionId' AND x->>'status'='CHO_DUYET')) THEN RAISE EXCEPTION 'Giải trình không hợp lệ hoặc đang chờ duyệt'; END IF;
 newteacher:=v->'danhsachgiaovien'->0;
 IF (newteacher-'reconcileStatus'-'sessions') IS DISTINCT FROM (oldteacher-'reconcileStatus'-'sessions') OR newteacher->>'reconcileStatus' IS DISTINCT FROM 'CO_GIAI_TRINH' OR jsonb_array_length(newteacher->'sessions')<>jsonb_array_length(oldteacher->'sessions') THEN RAISE EXCEPTION 'Không được sửa số liệu công dạy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(oldteacher->'sessions') s WHERE s->>'id'=newdispute->>'sessionId' AND coalesce((s->>'reconciliationSent')::boolean,(oldteacher->>'payrollSent')::boolean,false)) THEN RAISE EXCEPTION 'Ca dạy không thuộc bảng công của bạn'; END IF;
 FOR sess IN SELECT value FROM jsonb_array_elements(newteacher->'sessions') LOOP
  SELECT x INTO oldsession FROM jsonb_array_elements(oldteacher->'sessions') x WHERE x->>'id'=sess->>'id';
  IF oldsession IS NULL OR (sess-'dispute') IS DISTINCT FROM (oldsession-'dispute') OR (sess->>'id'=newdispute->>'sessionId' AND sess->'dispute' IS DISTINCT FROM newdispute) OR (sess->>'id'<>newdispute->>'sessionId' AND sess IS DISTINCT FROM oldsession) THEN RAISE EXCEPTION 'Không được sửa ca dạy khi gửi giải trình'; END IF;
 END LOOP;
 RETURN original||jsonb_build_object('danhsachgiaovien',(SELECT jsonb_agg(CASE WHEN x->>'teacherId'=own THEN newteacher ELSE x END) FROM jsonb_array_elements(original->'danhsachgiaovien') x),'danhsachgiaitrinh',jsonb_build_array(newdispute)||(original->'danhsachgiaitrinh'));
END $dispute$;


CREATE OR REPLACE FUNCTION public.vuihoc_business_data(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $read$
DECLARE actor vuihoc."NGUOI_DUNG"; cfg record; rows jsonb; result jsonb:='{}'; predicate text; isadmin boolean; own text;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 SELECT congtruycap='ADMIN' INTO isadmin FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=actor.manhomquyen;
 SELECT madinhdanh INTO own FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 FOR cfg IN SELECT key dataset,value c FROM jsonb_each(vuihoc.business_config()) LOOP
  predicate:='true';
  IF cfg.dataset='report_templates' THEN predicate:=format('t.manguoidung=%L',actor.madinhdanh);
  ELSIF NOT isadmin THEN
   predicate:=CASE cfg.dataset WHEN 'dated_lessons' THEN format('(t.magiaovienchinh=%L OR t.magiaoviendaythay=%L)',own,own)
    WHEN 'lesson_incidents' THEN format('EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=t.mabuoi AND (b.magiaovienchinh=%L OR b.magiaoviendaythay=%L))',own,own)
    WHEN 'teachers' THEN format('t.manguoidung=%L',actor.madinhdanh)
    WHEN 'classes' THEN format('(t.magiaovien=%L OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=t.madinhdanh AND (b.magiaovienchinh=%L OR b.magiaoviendaythay=%L)))',own,own,own)
    WHEN 'students' THEN format('EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE t.madinhdanh=ANY(l.danhsachmahocsinh) AND (l.magiaovien=%L OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=l.madinhdanh AND (b.magiaovienchinh=%L OR b.magiaoviendaythay=%L))))',own,own,own)
    WHEN 'teacher_evaluations' THEN format('t.magiaovien=%L',own)
    WHEN 'monthly_payroll' THEN 'false'
    WHEN 'custom_catalogs' THEN 'false'
    ELSE 'true' END;
  ELSIF cfg.dataset IN ('teachers','students','classes','monthly_payroll','teacher_evaluations','dated_lessons','lesson_incidents') AND NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen AND g.danhsachquyen && (CASE cfg.dataset WHEN 'teachers' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'students' THEN ARRAY['ALL','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'classes' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'monthly_payroll' THEN ARRAY['ALL','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'teacher_evaluations' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'dated_lessons' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'lesson_incidents' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] ELSE ARRAY[]::text[] END)) THEN predicate:='false'; END IF;
  -- Chỉ lấy cột nằm trong hợp đồng UI; không trả khóa mã hóa trong CAU_HINH_HE_THONG.
  IF cfg.dataset='monthly_payroll' THEN
   EXECUTE format('SELECT coalesce(jsonb_agg(vuihoc.bang_cong_truy_van(t.kycong) ORDER BY t.kycong DESC),''[]''::jsonb) FROM vuihoc."BANG_CONG_THANG" t WHERE %s',predicate) INTO rows;
  ELSE
  EXECUTE format('SELECT coalesce(jsonb_agg((SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(t)) e WHERE (e.key IN (SELECT jsonb_array_elements_text($1)) OR (e.key=''ngaytao'' AND $2 IN (''teachers'',''students'',''classes'')))) ORDER BY coalesce(to_jsonb(t)->>''ngaytao'','''') DESC, t.madinhdanh DESC),''[]''::jsonb) FROM vuihoc.%I t WHERE %s',cfg.c->>'table',predicate) INTO rows USING cfg.c->'columns',cfg.dataset;
  END IF;
  result:=result||jsonb_build_object(cfg.dataset,rows);
 END LOOP;
 IF NOT isadmin THEN
  IF own IS NOT NULL AND vuihoc.business_teacher_can(actor.madinhdanh,'Xem bảng kê công dạy cá nhân theo kỳ') THEN
   SELECT coalesce(jsonb_agg(vuihoc.bang_cong_truy_van(m.kycong,own) ORDER BY m.kycong DESC),'[]') INTO rows
   FROM vuihoc."BANG_CONG_THANG" m WHERE EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=own)
    OR EXISTS(SELECT 1 FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" d WHERE d.kycong=m.kycong AND d.magiaovien=own);
  ELSE rows:='[]'; END IF;
  result:=result||jsonb_build_object('monthly_payroll',rows);
 END IF;
 RETURN result;
END $read$;


CREATE OR REPLACE FUNCTION public.vuihoc_save_business(p_token text,p_changes jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $save$
DECLARE actor vuihoc."NGUOI_DUNG"; c jsonb; b jsonb; v jsonb; oldrow jsonb; conf jsonb; ds text; id text; key text; cols text; exprs text; assigns text; own text; sessionkey text; s jsonb; previous jsonb; sessionfield text; target text; rowlocked boolean;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes)>1000 THEN RAISE EXCEPTION 'Danh sách thay đổi không hợp lệ.'; END IF;
 -- Một giao dịch cho toàn bộ thao tác liên quan. Khóa theo cùng thứ tự ở mọi phiên.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 SET CONSTRAINTS ALL DEFERRED;
 SELECT madinhdanh INTO own FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 FOR c IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
  ds:=c->>'dataset'; b:=nullif(c->'before','null'::jsonb); v:=nullif(c->'after','null'::jsonb); conf:=vuihoc.business_config()->ds;
  IF conf IS NULL THEN RAISE EXCEPTION 'Dataset không được phép: %',ds; END IF;
  IF (b IS NOT NULL AND jsonb_typeof(b)<>'object') OR (v IS NOT NULL AND jsonb_typeof(v)<>'object') THEN RAISE EXCEPTION 'Bản ghi không hợp lệ'; END IF;
  id:=coalesce(v->>'madinhdanh',b->>'madinhdanh');
  IF coalesce(id,'')='' OR (b IS NOT NULL AND v IS NOT NULL AND b->>'madinhdanh' IS DISTINCT FROM v->>'madinhdanh') THEN RAISE EXCEPTION 'Mã bản ghi không hợp lệ'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(coalesce(b,'{}')||coalesce(v,'{}')) k WHERE NOT (conf->'columns' ? k)) THEN RAISE EXCEPTION 'Trường không được phép ở %',ds; END IF;
  IF ds='monthly_payroll' THEN
   PERFORM vuihoc.luu_bang_cong(actor.madinhdanh,own,b,v);
   CONTINUE;
  END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM vuihoc.%I t WHERE madinhdanh=$1 FOR UPDATE',conf->>'table') INTO oldrow USING id;
  IF oldrow IS NULL AND b IS NOT NULL OR oldrow IS NOT NULL AND b IS NULL THEN RAISE EXCEPTION 'Bản ghi đã thay đổi hoặc mã đã tồn tại. Hãy tải lại.'; END IF;
  IF oldrow IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_each(b) e WHERE oldrow->e.key IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Dữ liệu % đã thay đổi ở phiên khác. Hãy tải lại.',ds; END IF;
  IF ds='teachers' AND oldrow IS NULL THEN RAISE EXCEPTION 'Tạo hồ sơ qua chức năng cấp tài khoản giáo viên.'; END IF;
  IF v IS NULL AND NOT vuihoc.business_can(actor.madinhdanh,conf->>'module',conf->>'feature') THEN RAISE EXCEPTION 'Không có quyền xóa dữ liệu'; END IF;
  FOR key IN SELECT jsonb_object_keys(coalesce(b,'{}')||coalesce(v,'{}')) LOOP
   IF oldrow IS NOT NULL AND v IS NOT NULL AND b->key IS NOT DISTINCT FROM v->key THEN CONTINUE; END IF;
   IF v IS NULL THEN CONTINUE; END IF;
   target:=conf->>'feature';
   IF ds='teachers' THEN
    IF key IN ('lichranh','socaranh','socadaxep','dakinlich') THEN
     IF own IS DISTINCT FROM id OR NOT vuihoc.business_teacher_can(actor.madinhdanh,'Giáo viên đăng ký lịch rảnh theo tuần') THEN RAISE EXCEPTION 'Chỉ giáo viên được sửa lịch rảnh của mình.'; END IF; CONTINUE;
    ELSIF key IN ('trangthaidanhgia','diemdanhgia','nhanxetdanhgia','diemtieuchi','baocaodanhgia') THEN target:='Chấm điểm và cập nhật báo cáo dự giờ';
    ELSIF key='manguoidung' AND oldrow IS NOT NULL AND b->key IS DISTINCT FROM v->key THEN RAISE EXCEPTION 'Không được thay liên kết tài khoản giáo viên.'; END IF;
   ELSIF ds='classes' THEN
    IF key='danhsachmahocsinh' THEN target:='Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)';
    ELSIF key='magiaovien' THEN target:='Phân công giáo viên (Khớp nối môn và lịch rảnh)';
    ELSIF key='hoclieu' THEN target:='Thêm, sửa, xóa và nạp học liệu theo tuần';
    ELSIF key='phancongdaythay' THEN target:='Tìm và phân công giáo viên dạy thay';
    ELSIF key='chitietcahoc' THEN
     IF vuihoc.business_can(actor.madinhdanh,'PH5','Ghi nhận và xử lý sự cố ca dạy') THEN CONTINUE; END IF;
     IF own IS NULL OR v IS NULL THEN RAISE EXCEPTION 'Không có quyền sửa ca học'; END IF;
     IF EXISTS(SELECT 1 FROM jsonb_object_keys(coalesce(b->key,'{}')) k WHERE NOT(coalesce(v->key,'{}') ? k)) THEN RAISE EXCEPTION 'Không được xóa lịch sử ca học'; END IF;
     FOR sessionkey,s IN SELECT * FROM jsonb_each(coalesce(v->key,'{}')) LOOP
      previous:=coalesce(b->key->sessionkey,'{}'); IF previous IS NOT DISTINCT FROM s THEN CONTINUE; END IF;
      SELECT coalesce(x->>'teacherId',oldrow->>'magiaovien') INTO target FROM (SELECT 1) q LEFT JOIN LATERAL (SELECT value x FROM jsonb_array_elements(coalesce(oldrow->'phancongdaythay','[]')) WHERE value->>'sessionNum'=s->>'sessionNum' AND left(value->>'dateStr',10)=left(s->>'dateStr',10) LIMIT 1) cover ON true;
      IF target IS DISTINCT FROM own THEN RAISE EXCEPTION 'Ca học không được phân công cho bạn'; END IF;
      FOR sessionfield IN SELECT jsonb_object_keys(previous||s) LOOP
       IF previous->sessionfield IS NOT DISTINCT FROM s->sessionfield THEN CONTINUE; END IF;
       IF sessionfield IN ('feedback','feedbackCriteria') THEN
        IF NOT vuihoc.business_teacher_can(actor.madinhdanh,'Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy') THEN RAISE EXCEPTION 'Không có quyền nhận xét'; END IF;
       ELSIF sessionfield NOT IN ('sessionNum','dateStr','title','status','materialGv','materialHs','exerciseLms','checkinTime','checkinAt','checkinUserId','checkoutAt','checkoutUserId','teacherAttendance','checkinBy','attendance') OR NOT vuihoc.business_teacher_can(actor.madinhdanh,'Giáo viên Check-in / Check-out vào ca dạy') THEN RAISE EXCEPTION 'Trường ca học không được phép'; END IF;
      END LOOP;
     END LOOP; CONTINUE;
    END IF;
   ELSIF ds='students' AND key='malophientai' THEN
    IF vuihoc.business_can(actor.madinhdanh,'PH4','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)') THEN CONTINUE; END IF;
   ELSIF ds='incident_categories' AND key='danhsachsuco' THEN
    IF NOT vuihoc.business_can(actor.madinhdanh,'PH2','Cấu hình Danh mục Sự cố & Vi phạm ca học') AND ((SELECT coalesce(jsonb_agg(x-'creditCoeff' ORDER BY x->>'id'),'[]') FROM jsonb_array_elements(coalesce(v->key,'[]')) x) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(x-'creditCoeff' ORDER BY x->>'id'),'[]') FROM jsonb_array_elements(coalesce(b->key,'[]')) x)) THEN RAISE EXCEPTION 'Không có quyền sửa danh mục sự cố'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(v->key,'[]')) n LEFT JOIN LATERAL (SELECT value o FROM jsonb_array_elements(coalesce(b->key,'[]')) WHERE value->>'id'=n->>'id') q ON true WHERE n->'creditCoeff' IS DISTINCT FROM o->'creditCoeff') AND NOT vuihoc.business_can(actor.madinhdanh,'PH2','Cấu hình hệ số công theo sự cố') THEN RAISE EXCEPTION 'Không có quyền sửa hệ số công'; END IF; CONTINUE;

   END IF;
   IF NOT vuihoc.business_can(actor.madinhdanh,CASE WHEN ds='classes' AND key='phancongdaythay' THEN 'PH5' ELSE conf->>'module' END,target) THEN RAISE EXCEPTION 'Không có quyền %',target; END IF;
  END LOOP;
  IF ds='report_templates' THEN
   IF oldrow IS NOT NULL AND oldrow->>'manguoidung' IS DISTINCT FROM actor.madinhdanh THEN RAISE EXCEPTION 'Mẫu báo cáo thuộc người dùng khác'; END IF;
   IF v IS NOT NULL THEN v:=v||jsonb_build_object('manguoidung',actor.madinhdanh); END IF;
  END IF;
  IF ds='classes' AND v IS NOT NULL THEN
   IF jsonb_array_length(v->'danhsachmahocsinh')>(v->>'sisotoida')::integer THEN RAISE EXCEPTION 'Sĩ số vượt mức tối đa'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(v->'danhsachmahocsinh') h WHERE NOT EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" WHERE madinhdanh=h)) THEN RAISE EXCEPTION 'Học sinh không tồn tại'; END IF;
  END IF;
  IF v IS NULL THEN
   EXECUTE format('DELETE FROM vuihoc.%I WHERE madinhdanh=$1',conf->>'table') USING id;
   IF ds='teachers' THEN UPDATE vuihoc."NGUOI_DUNG" SET trangthai='locked' WHERE madinhdanh=oldrow->>'manguoidung'; END IF;
  ELSE
   IF ds='lesson_incidents' THEN v:=v||jsonb_build_object('manguoibao',coalesce(oldrow->>'manguoibao',actor.madinhdanh),'manguoixuly',actor.madinhdanh); END IF;
   IF ds='sop_documents' AND oldrow IS NULL THEN v:=v||jsonb_build_object('ngaycapnhat',to_char(now(),'DD/MM/YYYY')); END IF;
   v:=coalesce(oldrow,'{}')||v;
   -- Upsert chỉ ghi các cột UI, không ghi cột hệ thống/khóa mã hóa.
   SELECT coalesce(jsonb_object_agg(k,val),'{}') INTO v FROM jsonb_each(v) e(k,val) WHERE conf->'columns' ? k;
   SELECT string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(NULL::vuihoc.%I,$1)).%I',conf->>'table',k),','),string_agg(format('%I=excluded.%I',k,k),',') INTO cols,exprs,assigns FROM jsonb_object_keys(v) k;
   EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;
   IF ds='teachers' THEN
    UPDATE vuihoc."NGUOI_DUNG" SET hoten=v->>'hoten',thudientu=v->>'thudientu',sodienthoai=v->>'sodienthoai',mamonhoc=v->>'mamonhoc' WHERE madinhdanh=oldrow->>'manguoidung';
   END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('saved',true,'data',public.vuihoc_business_data(p_token));
END $save$;

CREATE OR REPLACE VIEW vuihoc."V_BANG_CONG_THEO_GIAO_VIEN"
WITH (security_invoker=true) AS
SELECT c.kycong,c.magiaovien,g.hoten AS tengiaovien,g.mamonhoc,
 c.madinhdanh AS macong,c.mabuoi,c.vaitro,c.hesocong,c.ghichu AS ghichucong,c.dagui,c.guiluc,
 b.ngayhoc,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,b.trangthai AS trangthaibuoi,
 b.lienketphonghoc,b.lienketbanghi,l.madinhdanh AS malop,l.malophoc,l.tenlophoc,l.mamohinh,
 k.khoanggio,coalesce(cardinality(l.danhsachmahocsinh),0) AS sohocsinh,
 EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh AND btrim(n.noidung)<>'') AS conhanxet,
 sc.madinhdanh AS masuco,sc.tensuco,sc.hesocongapdung,sc.manguoixuly,sc.xulyluc,
 gt.madinhdanh AS magiaitrinh,gt.trangthai AS trangthaigiaitrinh,gt.loaisuco,
 gt.noidung AS noidunggiaitrinh,gt.ghichuduyet
FROM vuihoc."CONG_DAY_BUOI_HOC" c
JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=c.magiaovien
JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
LEFT JOIN LATERAL (SELECT s.* FROM vuihoc."SU_CO_BUOI_HOC" s
 JOIN vuihoc."DANH_MUC_SU_CO" cat ON cat.madinhdanh=s.manhomsuco
 WHERE s.mabuoi=b.madinhdanh AND c.magiaovien=CASE WHEN cat.manhomsuco='GRP-TCH'
  THEN b.magiaovienchinh ELSE coalesce(b.magiaoviendaythay,b.magiaovienchinh) END
 ORDER BY s.baoluc DESC,s.madinhdanh DESC LIMIT 1) sc ON true
LEFT JOIN LATERAL (SELECT d.* FROM vuihoc."GIAI_TRINH_CONG_DAY" d WHERE d.macong=c.madinhdanh
 ORDER BY d.guiluc DESC,d.madinhdanh DESC LIMIT 1) gt ON true;

CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_khi_du_nhan_xet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $complete$
DECLARE session jsonb; lesson vuihoc."BUOI_HOC";
  lesson_date date; slot_text text; slot_id text; start_at timestamptz; end_at timestamptz;
  student_id text; actual_teacher text;
BEGIN
  FOR session IN SELECT value FROM jsonb_each(coalesce(NEW.chitietcahoc,'{}'::jsonb)) LOOP
    IF session->>'status'<>'Đã hoàn thành' THEN CONTINUE; END IF;
    IF coalesce(array_length(NEW.danhsachmahocsinh,1),0)=0 OR EXISTS (
      SELECT 1 FROM unnest(NEW.danhsachmahocsinh) student
      WHERE btrim(coalesce(session->'feedback'->>student,''))=''
    ) THEN CONTINUE; END IF;
    lesson_date:=left(session->>'dateStr',10)::date;
    slot_text:=substring(session->>'dateStr' FROM '[0-9]{2}:[0-9]{2} *- *[0-9]{2}:[0-9]{2}');
    SELECT madinhdanh INTO slot_id FROM vuihoc."KHUNG_GIO"
      WHERE slot_text IS NOT NULL AND regexp_replace(khoanggio,'\s','','g')=regexp_replace(slot_text,'\s','','g')
      LIMIT 1;
    SELECT * INTO lesson FROM vuihoc."BUOI_HOC"
      WHERE malop=NEW.madinhdanh AND ngayhoc=lesson_date
        AND (slot_id IS NULL OR makhunggio=slot_id) ORDER BY batdau LIMIT 1;
    IF lesson.madinhdanh IS NULL THEN
      IF slot_id IS NULL THEN RAISE EXCEPTION 'Không xác định được khung giờ cho ca %',session->>'dateStr'; END IF;
      start_at:=(lesson_date::text||' '||btrim(split_part(slot_text,'-',1)))::timestamp AT TIME ZONE 'Asia/Bangkok';
      end_at:=(lesson_date::text||' '||btrim(split_part(slot_text,'-',2)))::timestamp AT TIME ZONE 'Asia/Bangkok';
      INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,tieude,lienketphonghoc,vaolopluc)
      VALUES(NEW.madinhdanh,lesson_date,slot_id,start_at,end_at,NEW.magiaovien,coalesce(session->>'title',''),
        coalesce(NEW.lienketphonghoc,''),coalesce(nullif(session->>'checkinAt','')::timestamptz,start_at))
      RETURNING * INTO lesson;
    END IF;
    actual_teacher:=coalesce(nullif(session->>'coverTeacherId',''),NEW.magiaovien);
    FOREACH student_id IN ARRAY NEW.danhsachmahocsinh LOOP
      INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung)
      VALUES(lesson.madinhdanh,student_id,session->'feedback'->>student_id)
      ON CONFLICT(mabuoi,mahocsinh) DO UPDATE SET noidung=EXCLUDED.noidung;
    END LOOP;
    UPDATE vuihoc."BUOI_HOC" SET trangthai='HOAN_THANH',
      magiaoviendaythay=CASE WHEN actual_teacher<>magiaovienchinh THEN actual_teacher ELSE NULL END,
      vaolopluc=coalesce(vaolopluc,nullif(session->>'checkinAt','')::timestamptz,batdau),
      ketthucluc=coalesce(nullif(session->>'checkoutAt','')::timestamptz,ketthuc),
      tieude=coalesce(session->>'title',tieude)
    WHERE madinhdanh=lesson.madinhdanh;
  END LOOP;
  RETURN NEW;
END $complete$;
DROP TRIGGER IF EXISTS ghi_cong_khi_du_nhan_xet ON vuihoc."LOP_HOC";
CREATE TRIGGER ghi_cong_khi_du_nhan_xet AFTER UPDATE OF chitietcahoc ON vuihoc."LOP_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_cong_khi_du_nhan_xet();
REVOKE ALL ON FUNCTION vuihoc.ghi_cong_khi_du_nhan_xet() FROM PUBLIC,anon,authenticated;


DROP FUNCTION IF EXISTS vuihoc.dong_bo_cong_buoi_tu_bang_thang();
ALTER TABLE vuihoc."BANG_CONG_THANG" DROP COLUMN IF EXISTS danhsachgiaovien,
  DROP COLUMN IF EXISTS danhsachgiaitrinh;
REVOKE ALL ON FUNCTION vuihoc.bang_cong_truy_van(text,text),vuihoc.ca_cong_truy_van(text,text),
 vuihoc.giai_trinh_truy_van(text),vuihoc.luu_bang_cong(text,text,jsonb,jsonb),
 vuihoc.ghi_ca_vao_bang_cong(text,text,numeric,text,text,text,boolean),
 vuihoc.ap_dung_cong_su_co(),vuihoc.cong_ca_sang_bang_thang() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_business_data(text),public.vuihoc_save_business(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_business_data(text),public.vuihoc_save_business(text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
