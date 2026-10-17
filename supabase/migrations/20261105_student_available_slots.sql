-- Student availability can change while enrolled. Only removal of occupied
-- existing preferences requires stopping the corresponding active class.
-- No new storage, columns or snapshots; API documents are temporary parameters.
BEGIN;
DO $check$ BEGIN
 IF to_regprocedure('vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(text,jsonb,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Thiếu bản kiểm tra hồ sơ/dừng lớp hiện tại. Cần nâng cấp đến bản 20261101 trước.';
 END IF;
END $check$;

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_bo_ca_hoc_sinh(b jsonb,v jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE oldreg jsonb; newreg jsonb; removed text; dayrow record; bound_class text;
BEGIN
 FOR oldreg IN SELECT value FROM jsonb_array_elements(coalesce(b->'dangkymonhoc','[]')) LOOP
  SELECT value INTO newreg FROM jsonb_array_elements(coalesce(v->'dangkymonhoc','[]')) WHERE value->>'subject'=oldreg->>'subject';
  FOR removed IN SELECT value FROM jsonb_array_elements_text(coalesce(oldreg->'scheduleSlots','[]')) oldslot
   WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(newreg->'scheduleSlots','[]')) newslot
    WHERE upper(regexp_replace(oldslot.value,'\s','','g'))=upper(regexp_replace(newslot.value,'\s','','g'))) LOOP
   SELECT * INTO STRICT dayrow FROM vuihoc.tach_lich(removed);
   SELECT l.malophoc INTO bound_class FROM vuihoc."DANG_KY_MON_HOC" d
    JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=d.malop
    JOIN vuihoc."LICH_LOP" s ON s.malop=l.madinhdanh AND s.thutrongtuan=dayrow.thutrongtuan
    JOIN vuihoc."KHUNG_GIO" assigned ON assigned.madinhdanh=s.makhunggio
    JOIN vuihoc."KHUNG_GIO" oldslot ON oldslot.madinhdanh=dayrow.makhunggio
    WHERE d.mahocsinh=b->>'madinhdanh' AND d.mamonhoc=oldreg->>'subject'
     AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
     AND split_part(oldslot.khoanggio,'-',1)::time<split_part(assigned.khoanggio,'-',2)::time
     AND split_part(assigned.khoanggio,'-',1)::time<split_part(oldslot.khoanggio,'-',2)::time
    ORDER BY l.madinhdanh LIMIT 1;
   IF bound_class IS NOT NULL THEN
    RAISE EXCEPTION 'Không thể bỏ ca % vì đang gắn với lớp %. Dừng hoạt động lớp trước khi bỏ ca này; các ca khác vẫn được thêm hoặc sửa.',removed,bound_class;
   END IF;
  END LOOP;
 END LOOP;
END $$;

-- Install complete definitions so whitespace and previous body formatting do not affect upgrades.
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(p_table text,b jsonb,v jsonb) RETURNS void
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
    AND (oldreg->'level',oldreg->'model') IS DISTINCT FROM (newreg->'level',newreg->'model') THEN
    RAISE EXCEPTION 'Đưa đăng ký môn về Chờ xếp lớp và lưu trước khi đổi trình độ hoặc mô hình.';
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
     FROM vuihoc."BUOI_HOC" h JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=h.malop JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=h.makhunggio
     WHERE h.magiaoviendaythay=b->>'madinhdanh' AND h.trangthai NOT IN ('NGHI_HOC','HOAN_THANH','HUY','DA_HOC_CU') AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
   LOOP
    oldstate:=coalesce(b->'lichranh'->slot.makhunggio->>slot.day_index,b->'lichranh'->slot.code->>slot.day_index,'none');
    newstate:=coalesce(v->'lichranh'->slot.makhunggio->>slot.day_index,v->'lichranh'->slot.code->>slot.day_index,'none');
    IF oldstate IS DISTINCT FROM newstate THEN RAISE EXCEPTION 'Ca đã gắn với lớp: cần điều chỉnh phân công lớp trước khi sửa lịch rảnh.'; END IF;
   END LOOP;
  END IF;
 END IF;
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
 IF p_table='HOC_SINH' THEN PERFORM vuihoc.kiem_tra_bo_ca_hoc_sinh(b,v); END IF;
 PERFORM vuihoc.kiem_tra_sua_ho_so_truoc_dung_lop(p_table,b,v);
END $$;

-- An edit to one subject must not rewrite schedules/registrations of the others.
CREATE OR REPLACE FUNCTION vuihoc.ghi_du_lieu_quan_he(p_table text,p_row jsonb,p_backfill boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE original_registrations jsonb; previous_registration jsonb; id text:=p_row->>'madinhdanh'; x jsonb; registrations jsonb; cls vuihoc."LOP_HOC"; target text; s record; dayrow record;
BEGIN
 IF p_table='HOC_SINH' THEN
  original_registrations:=vuihoc.dang_ky_mon_truy_van(id); -- minimal_student_registration_writes
  registrations:=p_row->'dangkymonhoc';
  IF registrations IS NULL THEN registrations:=jsonb_build_array(jsonb_build_object('subject',p_row->'mamonhoc',
   'model',p_row->'mamohinh','level',p_row->'matrinhdo','status',p_row->'trangthai',
   'currentClassCode',p_row->'malophientai','scheduleSlots',coalesce(p_row->'lichdangky','[]'))); END IF;
  IF jsonb_typeof(registrations)<>'array' OR jsonb_array_length(registrations)=0 THEN RAISE EXCEPTION 'Cần ít nhất một đăng ký môn'; END IF;
  IF (SELECT count(*)<>count(DISTINCT e->>'subject') FROM jsonb_array_elements(registrations) e) THEN RAISE EXCEPTION 'Môn đăng ký bị trùng'; END IF;
  -- Missing subjects are retained: withdrawing changes their status, never erases history.
  FOR x IN SELECT value FROM jsonb_array_elements(registrations) LOOP
   SELECT value INTO previous_registration FROM jsonb_array_elements(original_registrations) WHERE value->>'subject'=x->>'subject';
   IF previous_registration IS NOT NULL
    AND (previous_registration->>'level',previous_registration->>'model',previous_registration->>'status',previous_registration->>'currentClassCode')
     IS NOT DISTINCT FROM (x->>'level',x->>'model',x->>'status',nullif(x->>'currentClassCode',''))
    AND previous_registration->'scheduleSlots' IS NOT DISTINCT FROM coalesce(x->'scheduleSlots','[]') THEN CONTINUE; END IF;
   target:=NULL;
   IF x->>'status'='DANG_HOC' THEN
    SELECT madinhdanh INTO target FROM vuihoc."LOP_HOC" WHERE malophoc=nullif(x->>'currentClassCode','');
    IF target IS NULL THEN RAISE EXCEPTION 'Đăng ký đang học cần một lớp hợp lệ'; END IF;
   END IF;
   INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai)
    VALUES(id,x->>'subject',x->>'level',x->>'model',target,x->>'status')
    ON CONFLICT(mahocsinh,mamonhoc) DO UPDATE SET matrinhdo=excluded.matrinhdo,mamohinh=excluded.mamohinh,malop=excluded.malop,trangthai=excluded.trangthai WHERE (vuihoc."DANG_KY_MON_HOC".matrinhdo,vuihoc."DANG_KY_MON_HOC".mamohinh,vuihoc."DANG_KY_MON_HOC".malop,vuihoc."DANG_KY_MON_HOC".trangthai) IS DISTINCT FROM (excluded.matrinhdo,excluded.mamohinh,excluded.malop,excluded.trangthai);
   IF previous_registration IS NULL OR previous_registration->'scheduleSlots' IS DISTINCT FROM coalesce(x->'scheduleSlots','[]') THEN
   DELETE FROM vuihoc."LICH_DANG_KY_MON_HOC" WHERE mahocsinh=id AND mamonhoc=x->>'subject';
   FOR s IN SELECT value,ordinality FROM jsonb_array_elements_text(coalesce(x->'scheduleSlots','[]')) WITH ORDINALITY LOOP
    SELECT * INTO STRICT dayrow FROM vuihoc.tach_lich(s.value);
    INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" VALUES(id,x->>'subject',s.ordinality,dayrow.thutrongtuan,dayrow.makhunggio);
   END LOOP; END IF;
  END LOOP;
  PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_dang_ky_mon(p_table,p_row-'dangkymonhoc'-'lichdangky'-'malophientai',p_backfill);
 ELSIF p_table='LOP_HOC' THEN
  SELECT * INTO STRICT cls FROM vuihoc."LOP_HOC" WHERE madinhdanh=id;
  IF p_row ? 'danhsachmahocsinh' THEN
   UPDATE vuihoc."DANG_KY_MON_HOC" SET malop=NULL,trangthai='CHO_XEP_LOP'
    WHERE malop=id AND (cls.trangthai IN ('TAM_DUNG','DA_KET_THUC') OR NOT(p_row->'danhsachmahocsinh' ? mahocsinh));
   IF cls.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') THEN
    FOR x IN SELECT value FROM jsonb_array_elements(p_row->'danhsachmahocsinh') LOOP
     UPDATE vuihoc."DANG_KY_MON_HOC" SET malop=id,trangthai='DANG_HOC'
      WHERE mahocsinh=x#>>'{}' AND mamonhoc=cls.mamonhoc;
     IF NOT FOUND THEN RAISE EXCEPTION 'Học sinh % chưa đăng ký môn của lớp',x; END IF;
    END LOOP;
   END IF;
  END IF;
  PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_dang_ky_mon(p_table,p_row-'danhsachmahocsinh',p_backfill);
 ELSE PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_dang_ky_mon(p_table,p_row,p_backfill);
 END IF;
END $$;
DO $owner$
DECLARE trusted_owner name;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN RAISE EXCEPTION 'Owner quản trị chưa hợp lệ.'; END IF;
 EXECUTE format('ALTER FUNCTION vuihoc.kiem_tra_bo_ca_hoc_sinh(jsonb,jsonb) OWNER TO %I',trusted_owner);
END $owner$;
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_bo_ca_hoc_sinh(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
