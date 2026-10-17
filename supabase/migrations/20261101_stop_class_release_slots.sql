-- Apply after 20261031. No new tables, columns or JSONB storage.
BEGIN;

-- Availability is occupied by active assignments, including overlapping time slots.
CREATE OR REPLACE FUNCTION vuihoc.ca_giao_vien_con_lop(p_teacher text,p_slot text,p_day integer) RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(
  SELECT 1 FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop
  JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
  JOIN vuihoc."KHUNG_GIO" target ON target.madinhdanh=p_slot
  WHERE l.magiaovien=p_teacher AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') AND s.thutrongtuan=p_day+1
   AND split_part(k.khoanggio,'-',1)::time<split_part(target.khoanggio,'-',2)::time
   AND split_part(target.khoanggio,'-',1)::time<split_part(k.khoanggio,'-',2)::time
 ) OR EXISTS(
  SELECT 1 FROM vuihoc."BUOI_HOC" h JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=h.malop
  JOIN vuihoc."KHUNG_GIO" target ON target.madinhdanh=p_slot
  WHERE h.magiaoviendaythay=p_teacher AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
   AND h.trangthai NOT IN ('NGHI_HOC','HOAN_THANH','HUY','DA_HOC_CU') AND extract(isodow FROM h.ngayhoc)::int=p_day+1
   AND h.batdau<split_part(target.khoanggio,'-',2)::time AND split_part(target.khoanggio,'-',1)::time<h.ketthuc
 )
$$;

CREATE OR REPLACE FUNCTION vuihoc.giai_phong_ca_lop(p_class text,p_teacher text) RETURNS void
LANGUAGE sql SET search_path=pg_catalog AS $$
 UPDATE vuihoc."LICH_RANH_DINH_KY" a SET trangthai='free'
 FROM vuihoc."KHUNG_GIO" target
 WHERE target.madinhdanh=a.makhunggio AND a.trangthai='busy'
  AND NOT vuihoc.ca_giao_vien_con_lop(a.magiaovien,a.makhunggio,a.thutrongtuan)
  AND (
   (a.magiaovien=p_teacher AND EXISTS(
    SELECT 1 FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
    WHERE s.malop=p_class AND s.thutrongtuan=a.thutrongtuan+1
     AND split_part(k.khoanggio,'-',1)::time<split_part(target.khoanggio,'-',2)::time
     AND split_part(target.khoanggio,'-',1)::time<split_part(k.khoanggio,'-',2)::time
   )) OR EXISTS(
    SELECT 1 FROM vuihoc."BUOI_HOC" h WHERE h.malop=p_class AND h.magiaoviendaythay=a.magiaovien
     AND extract(isodow FROM h.ngayhoc)::int=a.thutrongtuan+1
     AND h.batdau<split_part(target.khoanggio,'-',2)::time AND split_part(target.khoanggio,'-',1)::time<h.ketthuc
   )
  )
$$;

-- Student registrations and teacher availability are released in the same transaction.
-- Retain registered preferences and completed lessons/feedback/payroll history.
CREATE OR REPLACE FUNCTION vuihoc.tra_hoc_sinh_ve_cho_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.trangthai IN ('TAM_DUNG','DA_KET_THUC') THEN
  UPDATE vuihoc."DANG_KY_MON_HOC" SET malop=NULL,trangthai='CHO_XEP_LOP' WHERE malop=NEW.madinhdanh;
  UPDATE vuihoc."BUOI_HOC" SET trangthai='NGHI_HOC' WHERE malop=NEW.madinhdanh AND vaolopluc IS NULL
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
  PERFORM vuihoc.giai_phong_ca_lop(NEW.madinhdanh,OLD.magiaovien);
 END IF;
 RETURN NEW;
END $$;

-- Direct registration edits and deletes cannot bypass the class stop rule.
CREATE OR REPLACE FUNCTION vuihoc.giu_dang_ky_lop_dang_hoat_dong() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.malop IS NOT NULL AND EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh=OLD.malop AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Dừng hoạt động lớp trước khi rút hoặc xóa học sinh để giải phóng ca.'; END IF;
  IF (OLD.malop,OLD.trangthai) IS DISTINCT FROM (NEW.malop,NEW.trangthai) THEN
   RAISE EXCEPTION 'Dừng hoạt động lớp trước khi rút học sinh hoặc chuyển về Chờ xếp lớp để giải phóng ca.';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS giu_dang_ky_lop_dang_hoat_dong ON vuihoc."DANG_KY_MON_HOC";
CREATE TRIGGER giu_dang_ky_lop_dang_hoat_dong BEFORE UPDATE OR DELETE ON vuihoc."DANG_KY_MON_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_dang_ky_lop_dang_hoat_dong();

CREATE OR REPLACE FUNCTION vuihoc.giu_phan_cong_lop_dang_hoat_dong() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') THEN
  IF TG_OP='DELETE' THEN
   IF OLD.magiaovien IS NOT NULL OR EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" WHERE malop=OLD.madinhdanh) THEN
    RAISE EXCEPTION 'Dừng hoạt động lớp để giải phóng ca trước khi xóa.';
   END IF;
  ELSIF NEW.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') AND OLD.magiaovien IS NOT NULL AND OLD.magiaovien IS DISTINCT FROM NEW.magiaovien THEN
   RAISE EXCEPTION 'Dừng hoạt động lớp trước khi đổi giáo viên để giải phóng ca.';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS giu_phan_cong_lop_dang_hoat_dong ON vuihoc."LOP_HOC";
CREATE TRIGGER giu_phan_cong_lop_dang_hoat_dong BEFORE UPDATE OR DELETE ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_phan_cong_lop_dang_hoat_dong();

DO $$ BEGIN
 IF to_regprocedure('vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(text,jsonb,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb) RENAME TO kiem_tra_sua_ho_so_truoc_dung_lop;
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_dung_lop;
 END IF;
END $$;
-- Correct the older availability guard to ignore cover lessons of stopped classes/history.
DO $$ DECLARE f text; BEGIN
 f:=pg_get_functiondef('vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(text,jsonb,jsonb)'::regprocedure);
 f:=replace(f,'FROM vuihoc."BUOI_HOC" h JOIN vuihoc."KHUNG_GIO" k',
  'FROM vuihoc."BUOI_HOC" h JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=h.malop JOIN vuihoc."KHUNG_GIO" k');
 f:=replace(f,'h.trangthai NOT IN (''NGHI_HOC'',''DA_HOAN_THANH'')',
  'h.trangthai NOT IN (''NGHI_HOC'',''HOAN_THANH'',''HUY'',''DA_HOC_CU'') AND l.trangthai NOT IN (''TAM_DUNG'',''DA_KET_THUC'')');
 IF strpos(f,'JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=h.malop JOIN vuihoc."LOP_HOC"')>0 THEN
  RAISE EXCEPTION 'Cấu trúc kiểm tra lịch rảnh không đúng dự kiến.';
 END IF;
 -- Idempotent: the old FROM pattern no longer matches after the first run.
 EXECUTE f;
END $$;

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_sua_ho_so(p_table text,b jsonb,v jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE s record; oldstate text; newstate text;
BEGIN
 IF b IS NULL OR v IS NULL THEN RETURN; END IF;
 IF p_table='LOP_HOC' AND b->>'trangthai' NOT IN ('TAM_DUNG','DA_KET_THUC') AND v->>'trangthai' NOT IN ('TAM_DUNG','DA_KET_THUC') THEN
  IF (nullif(b->>'magiaovien','') IS NOT NULL AND b->'magiaovien' IS DISTINCT FROM v->'magiaovien')
   OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(b->'danhsachmahocsinh','[]')) x WHERE NOT(coalesce(v->'danhsachmahocsinh','[]') ? x))
   OR ((nullif(b->>'magiaovien','') IS NOT NULL OR jsonb_array_length(coalesce(b->'danhsachmahocsinh','[]'))>0)
    AND regexp_replace(coalesce(b->>'lichhoc',''),'\s','','g') IS DISTINCT FROM regexp_replace(coalesce(v->>'lichhoc',''),'\s','','g')) THEN
   RAISE EXCEPTION 'Dừng hoạt động lớp trước khi đổi giáo viên, đổi lịch hoặc rút học sinh để giải phóng ca.';
  END IF;
 ELSIF p_table='GIAO_VIEN' AND b->'lichranh' IS DISTINCT FROM v->'lichranh' THEN
  FOR s IN SELECT k.madinhdanh,k.makhunggio,d.day FROM vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day)
   WHERE vuihoc.ca_giao_vien_con_lop(b->>'madinhdanh',k.madinhdanh,d.day) LOOP
   oldstate:=coalesce(b->'lichranh'->s.madinhdanh->>s.day,b->'lichranh'->s.makhunggio->>s.day,'none');
   newstate:=coalesce(v->'lichranh'->s.madinhdanh->>s.day,v->'lichranh'->s.makhunggio->>s.day,'none');
   IF oldstate IS DISTINCT FROM newstate THEN RAISE EXCEPTION 'Ca đã gắn với lớp: dừng hoạt động lớp trước khi sửa lịch rảnh.'; END IF;
  END LOOP;
 END IF;
 PERFORM vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(p_table,b,v);
END $$;

-- Counts are queries of availability and active assignments, never extra columns.
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb; available integer; occupied integer;
BEGIN
 r:=vuihoc.du_lieu_quan_he_truoc_dung_lop(p_table,p_row);
 IF p_table='GIAO_VIEN' AND r IS NOT NULL THEN
  SELECT count(*) INTO available FROM vuihoc."LICH_RANH_DINH_KY" a WHERE a.magiaovien=p_row->>'madinhdanh'
   AND a.trangthai='free' AND NOT vuihoc.ca_giao_vien_con_lop(a.magiaovien,a.makhunggio,a.thutrongtuan);
  SELECT count(*) INTO occupied FROM vuihoc."KHUNG_GIO" k CROSS JOIN generate_series(0,6) d(day)
   WHERE vuihoc.ca_giao_vien_con_lop(p_row->>'madinhdanh',k.madinhdanh,d.day);
  r:=r||jsonb_build_object('socaranh',available,'socadaxep',occupied,'dakinlich',available=0 AND occupied>0);
 END IF;
 RETURN r;
END $$;

-- Repair only busy slots attached to classes already stopped, preserving other slots.
DO $$ DECLARE l record; BEGIN
 FOR l IN SELECT madinhdanh,magiaovien FROM vuihoc."LOP_HOC" WHERE trangthai IN ('TAM_DUNG','DA_KET_THUC') LOOP
  PERFORM vuihoc.giai_phong_ca_lop(l.madinhdanh,l.magiaovien);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION vuihoc.ca_giao_vien_con_lop(text,text,integer),vuihoc.giai_phong_ca_lop(text,text),
 vuihoc.giu_dang_ky_lop_dang_hoat_dong(),vuihoc.giu_phan_cong_lop_dang_hoat_dong(),
 vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb),vuihoc.du_lieu_quan_he(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
