-- Recovery and minimal relational writes for profiles/classes.
-- Paste this entire file into Supabase SQL Editor and run once.
-- Includes update/profile/class-stop/minimal-write fixes in order; safe to rerun.
-- Requires the existing relational migrations through 20261028.
-- No new tables/columns or JSONB storage. Does not reseed data.
BEGIN;
-- Source: migrations/20261030_update_existing_business_rows.sql
-- Existing rows use UPDATE by their immutable primary key; new rows use INSERT.
-- Run after the relational migrations (through 20261028).
-- No business rows are rewritten, no JSON/JSONB storage columns are added.
DO $patch$
DECLARE f text; original text; old_statement text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'update_existing_business_rows')=0 THEN
  original:=f;
  f:=replace(f,'DECLARE ','DECLARE updated_row_count integer; ');
  -- Query projections must remain available to child-table handlers, but must
  -- never appear as column names in the parent table's INSERT/UPDATE.
  IF strpos(f,'FROM jsonb_object_keys(v) k WHERE')=0 THEN
   RAISE EXCEPTION 'Cấu trúc RPC chưa phải bản quan hệ. Cần chạy các migration quan hệ trước.';
  END IF;
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE',
   $columns$FROM jsonb_object_keys(v) k WHERE EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid=format('vuihoc.%I',conf->>'table')::regclass
     AND a.attname=k AND a.attnum>0 AND NOT a.attisdropped
     AND a.attgenerated='' AND a.attidentity=''
   ) AND$columns$);
  f:=replace(f,$old$string_agg(format('%I=excluded.%I',k,k),',')$old$,
   $new$string_agg(format('%1$I=(jsonb_populate_record(NULL::vuihoc.%2$I,$1)).%1$I',k,conf->>'table'),',') FILTER (WHERE k<>'madinhdanh' AND (oldrow IS NULL OR oldrow->k IS DISTINCT FROM v->k))$new$);
  old_statement:=$old$EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;$old$;
  IF strpos(f,old_statement)=0 THEN RAISE EXCEPTION 'Không tìm thấy câu ghi dữ liệu cần sửa; dừng để tránh sửa nhầm RPC.'; END IF;
  f:=replace(f,old_statement,$new$-- update_existing_business_rows
   IF oldrow IS NULL THEN
    EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s',conf->>'table',cols,exprs) USING v;
   ELSIF assigns IS NOT NULL THEN
    EXECUTE format('UPDATE vuihoc.%I SET %s WHERE madinhdanh=$2',conf->>'table',assigns) USING v,id;
    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
    IF updated_row_count<>1 THEN RAISE EXCEPTION 'Bản ghi không còn tồn tại. Hãy tải lại dữ liệu.'; END IF;
   END IF;$new$);
  IF strpos(f,'excluded.')>0 OR f=original THEN RAISE EXCEPTION 'Chưa chuyển được câu ghi dữ liệu sang UPDATE rõ ràng.'; END IF;
  EXECUTE f;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';

-- Source: migrations/20261031_profile_edit_rules.sql
-- Apply after 20261030. Rules for personal vs assigned teaching/enrollment data.
-- No new tables or columns; JSON is only the existing RPC transport/projection.
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_sua_ho_so(p_table text,b jsonb,v jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE oldreg jsonb; newreg jsonb; slot record; oldstate text; newstate text; cls record;
BEGIN
 IF b IS NULL OR v IS NULL THEN RETURN; END IF;
 IF p_table='HOC_SINH' THEN
  IF b->'khoi' IS DISTINCT FROM v->'khoi' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(coalesce(b->'dangkymonhoc','[]')) r
   WHERE r->>'status'<>'CHO_XEP_LOP' OR nullif(r->>'currentClassCode','') IS NOT NULL
  ) THEN RAISE EXCEPTION 'Đưa các đăng ký môn về Chờ xếp lớp và lưu trước khi đổi khối.'; END IF;
  FOR oldreg IN SELECT value FROM jsonb_array_elements(coalesce(b->'dangkymonhoc','[]')) LOOP
   SELECT r INTO newreg FROM jsonb_array_elements(coalesce(v->'dangkymonhoc','[]')) r WHERE r->>'subject'=oldreg->>'subject';
   IF newreg IS NOT NULL AND (oldreg->>'status'<>'CHO_XEP_LOP' OR nullif(oldreg->>'currentClassCode','') IS NOT NULL)
    AND ((oldreg->'level',oldreg->'model') IS DISTINCT FROM (newreg->'level',newreg->'model')
     OR (SELECT coalesce(jsonb_agg(x ORDER BY x),'[]') FROM jsonb_array_elements_text(coalesce(oldreg->'scheduleSlots','[]')) x)
      IS DISTINCT FROM (SELECT coalesce(jsonb_agg(x ORDER BY x),'[]') FROM jsonb_array_elements_text(coalesce(newreg->'scheduleSlots','[]')) x)) THEN
    RAISE EXCEPTION 'Đưa đăng ký môn về Chờ xếp lớp và lưu trước khi đổi trình độ, mô hình hoặc lịch học.';
   END IF;
  END LOOP;
 ELSIF p_table='GIAO_VIEN' THEN
  FOR cls IN SELECT l.*,vuihoc.khoi_lop(l.madinhdanh) AS grade FROM vuihoc."LOP_HOC" l
   WHERE l.magiaovien=b->>'madinhdanh' AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') LOOP
   IF (b->'mamonhoc' IS DISTINCT FROM v->'mamonhoc' AND cls.mamonhoc<>v->>'mamonhoc')
    OR (b->'macaphoc' IS DISTINCT FROM v->'macaphoc' AND cls.macaphoc<>v->>'macaphoc')
    OR (b->'danhsachkhoi' IS DISTINCT FROM v->'danhsachkhoi' AND NOT (v->'danhsachkhoi' ? cls.grade))
    OR (b->'danhsachmohinh' IS DISTINCT FROM v->'danhsachmohinh' AND NOT (v->'danhsachmohinh' ? cls.mamohinh)) THEN
    RAISE EXCEPTION 'Thay đổi chuyên môn ảnh hưởng lớp đang phụ trách. Điều chỉnh phân công lớp trước khi lưu.';
   END IF;
  END LOOP;
  IF b->'lichranh' IS DISTINCT FROM v->'lichranh' THEN
   FOR slot IN
    SELECT DISTINCT s.makhunggio,k.makhunggio AS code,s.thutrongtuan-1 AS day_index
     FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop
     JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
     WHERE l.magiaovien=b->>'madinhdanh' AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
    UNION
    SELECT DISTINCT h.makhunggio,k.makhunggio,extract(isodow FROM h.ngayhoc)::int-1
     FROM vuihoc."BUOI_HOC" h JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=h.makhunggio
     WHERE h.magiaoviendaythay=b->>'madinhdanh' AND h.trangthai NOT IN ('NGHI_HOC','DA_HOAN_THANH')
   LOOP
    oldstate:=coalesce(b->'lichranh'->slot.makhunggio->>slot.day_index,b->'lichranh'->slot.code->>slot.day_index,'none');
    newstate:=coalesce(v->'lichranh'->slot.makhunggio->>slot.day_index,v->'lichranh'->slot.code->>slot.day_index,'none');
    IF oldstate IS DISTINCT FROM newstate THEN RAISE EXCEPTION 'Ca đã gắn với lớp: cần điều chỉnh phân công lớp trước khi sửa lịch rảnh.'; END IF;
   END LOOP;
  END IF;
 END IF;
END $$;

DO $rpc$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'kiem_tra_sua_ho_so')=0 THEN
  IF strpos(f,'v:=coalesce(oldrow,''{}'')||v;')=0 THEN RAISE EXCEPTION 'RPC chưa có cấu trúc cập nhật dự kiến. Dừng để tránh sửa nhầm.'; END IF;
  f:=replace(f,'v:=coalesce(oldrow,''{}'')||v;',
   'PERFORM vuihoc.kiem_tra_sua_ho_so(conf->>''table'',oldrow,coalesce(oldrow,''{}'')||v); v:=coalesce(oldrow,''{}'')||v;');
  EXECUTE f;
 END IF;
END $rpc$;

-- Account edits update the linked teacher, using the existing FK only.
-- The business RPC already syncs teacher personal fields back to the account.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_lien_he_giao_vien() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 UPDATE vuihoc."GIAO_VIEN" SET hoten=NEW.hoten,thudientu=NEW.thudientu,sodienthoai=NEW.sodienthoai,tendangnhap=NEW.tendangnhap
 WHERE manguoidung=NEW.madinhdanh AND (hoten,thudientu,sodienthoai,tendangnhap)
  IS DISTINCT FROM (NEW.hoten,NEW.thudientu,NEW.sodienthoai,NEW.tendangnhap);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dong_bo_lien_he_giao_vien ON vuihoc."NGUOI_DUNG";
CREATE TRIGGER dong_bo_lien_he_giao_vien AFTER UPDATE OF hoten,thudientu,sodienthoai,tendangnhap ON vuihoc."NGUOI_DUNG"
 FOR EACH ROW WHEN ((OLD.hoten,OLD.thudientu,OLD.sodienthoai,OLD.tendangnhap) IS DISTINCT FROM (NEW.hoten,NEW.thudientu,NEW.sodienthoai,NEW.tendangnhap))
 EXECUTE FUNCTION vuihoc.dong_bo_lien_he_giao_vien();
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb),vuihoc.dong_bo_lien_he_giao_vien() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

-- Source: migrations/20261101_stop_class_release_slots.sql
-- Apply after 20261031. No new tables, columns or JSONB storage.

DO $prerequisites$ BEGIN
 IF to_regprocedure('vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Thiếu bản sửa hồ sơ 20261031. Chạy toàn bộ file supabase/fix_profile_class_updates.sql để cài đủ các bản sửa theo đúng thứ tự.';
 END IF;
 IF to_regprocedure('vuihoc.du_lieu_quan_he(text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Thiếu bản nâng cấp dữ liệu quan hệ. Cần nâng cấp database quan hệ trước khi sửa luồng dừng lớp.';
 END IF;
END $prerequisites$;

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

-- Source: migrations/20261102_minimal_relational_writes.sql
-- Run after 20261101. Only functions are changed: no stored snapshots or new columns.
DO $check$ BEGIN
 IF to_regprocedure('vuihoc.ca_giao_vien_con_lop(text,text,integer)') IS NULL THEN
  RAISE EXCEPTION 'Chạy bản 20261101 trước, hoặc chạy toàn bộ supabase/fix_profile_class_updates.sql.';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')) THEN
  RAISE EXCEPTION 'Database còn cột JSON/JSONB. Cần hoàn tất các bản nâng cấp quan hệ trước; bản này không tự xóa dữ liệu cũ.';
 END IF;
END $check$;

-- The existing API accepts a temporary document. Persist only changed relations,
-- keeping scalar context needed by the normalized writers and their validation.
CREATE OR REPLACE FUNCTION vuihoc.ghi_thay_doi_quan_he(p_table text,p_before jsonb,p_after jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE fields jsonb:=p_after; k text;
BEGIN
 IF p_before IS NOT NULL THEN
  FOREACH k IN ARRAY ARRAY['danhsachluachon','danhsachsuco','danhsachtieuchi','danhsachmuc',
   'danhsachkhoi','danhsachmohinh','lichranh','baocaodanhgia','cahochoanthanh','diemtieuchi',
   'dangkymonhoc','lichdangky','danhsachmahocsinh','lichhoc','hoclieu','phancongdaythay',
   'chitietcahoc','cauhinh','cauhoinhanh'] LOOP
   IF p_before->k IS NOT DISTINCT FROM p_after->k THEN fields:=fields-k; END IF;
  END LOOP;
  -- Grade rows contain the teaching-category FK as well as the grade ID.
  IF p_table='GIAO_VIEN' AND p_before->'macaphoc' IS DISTINCT FROM p_after->'macaphoc' THEN
   fields:=fields||jsonb_build_object('danhsachkhoi',p_after->'danhsachkhoi');
  END IF;
 END IF;
 PERFORM vuihoc.ghi_chi_tiet_danh_muc(p_table,fields);
 -- The enrollment writer requires a complete subject registration when called.
 -- A personal-name/phone/grade edit has no registration work to perform.
 IF p_table='HOC_SINH' AND p_before IS NOT NULL AND NOT fields ? 'dangkymonhoc' THEN RETURN; END IF;
 PERFORM vuihoc.ghi_du_lieu_quan_he(p_table,fields);
END $$;

DO $rpc$
DECLARE f text; original_calls text:=$calls$PERFORM vuihoc.ghi_chi_tiet_danh_muc(conf->>'table',v); PERFORM vuihoc.ghi_du_lieu_quan_he(conf->>'table',v);$calls$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'vuihoc.ghi_thay_doi_quan_he')=0 THEN
  IF strpos(f,'update_existing_business_rows')=0 OR strpos(f,original_calls)=0 THEN
   RAISE EXCEPTION 'RPC chưa đúng bản cập nhật quan hệ dự kiến; dừng để tránh sửa nhầm.';
  END IF;
  f:=replace(f,original_calls,'PERFORM vuihoc.ghi_thay_doi_quan_he(conf->>''table'',oldrow,v);');
  EXECUTE f;
 END IF;
END $rpc$;

-- Query the assignments once, then count distinct occupied weekly slots.
-- No stored counts, cache table, materialized view, or cross-product of days.
CREATE OR REPLACE FUNCTION vuihoc.thong_ke_ca_giao_vien(p_teacher text)
RETURNS TABLE(socaranh bigint,socadaxep bigint)
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 WITH assignments AS MATERIALIZED (
  SELECT s.thutrongtuan-1 AS day,split_part(k.khoanggio,'-',1)::time AS starts,split_part(k.khoanggio,'-',2)::time AS ends
  FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop
  JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
  WHERE l.magiaovien=p_teacher AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
  UNION ALL
  SELECT extract(isodow FROM h.ngayhoc)::int-1,h.batdau,h.ketthuc
  FROM vuihoc."BUOI_HOC" h JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=h.malop
  WHERE h.magiaoviendaythay=p_teacher AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
   AND h.trangthai NOT IN ('NGHI_HOC','HOAN_THANH','HUY','DA_HOC_CU')
 ), occupied AS MATERIALIZED (
  SELECT DISTINCT k.madinhdanh AS slot,a.day FROM assignments a JOIN vuihoc."KHUNG_GIO" k
   ON a.starts<split_part(k.khoanggio,'-',2)::time AND split_part(k.khoanggio,'-',1)::time<a.ends
 )
 SELECT (SELECT count(*) FROM vuihoc."LICH_RANH_DINH_KY" a
   WHERE a.magiaovien=p_teacher AND a.trangthai='free'
    AND NOT EXISTS(SELECT 1 FROM occupied o WHERE o.slot=a.makhunggio AND o.day=a.thutrongtuan)),
  (SELECT count(*) FROM occupied)
$$;

CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb; totals record;
BEGIN
 r:=vuihoc.du_lieu_quan_he_truoc_dung_lop(p_table,p_row);
 IF p_table='GIAO_VIEN' AND r IS NOT NULL THEN
  SELECT * INTO totals FROM vuihoc.thong_ke_ca_giao_vien(p_row->>'madinhdanh');
  r:=r||jsonb_build_object('socaranh',totals.socaranh,'socadaxep',totals.socadaxep,
   'dakinlich',totals.socaranh=0 AND totals.socadaxep>0);
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION vuihoc.ghi_thay_doi_quan_he(text,jsonb,jsonb),vuihoc.thong_ke_ca_giao_vien(text)
 FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
