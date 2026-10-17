-- Run after 20261023 (20261024/25 only remove sample data and are optional).
-- One student identity, independent registrations/class assignments per subject.
BEGIN;
LOCK TABLE vuihoc."HOC_SINH",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS vuihoc."DANG_KY_MON_HOC" (
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE CASCADE,
 mamonhoc text NOT NULL REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE,
 matrinhdo text NOT NULL REFERENCES vuihoc."TRINH_DO"(matrinhdo) ON UPDATE CASCADE,
 mamohinh text NOT NULL REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE,
 malop text REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 trangthai text NOT NULL CHECK(trangthai IN ('CHO_XEP_LOP','DANG_HOC','BAO_LUU','DA_THOI_HOC')),
 ngaydangky timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(mahocsinh,mamonhoc),
 CHECK((malop IS NOT NULL)=(trangthai='DANG_HOC'))
);
CREATE INDEX IF NOT EXISTS dang_ky_mon_lop_idx ON vuihoc."DANG_KY_MON_HOC"(malop);
CREATE TABLE IF NOT EXISTS vuihoc."LICH_DANG_KY_MON_HOC" (
 mahocsinh text NOT NULL, mamonhoc text NOT NULL, thutu integer NOT NULL,
 thutrongtuan integer NOT NULL CHECK(thutrongtuan BETWEEN 1 AND 7),
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh),
 PRIMARY KEY(mahocsinh,mamonhoc,thutu),
 FOREIGN KEY(mahocsinh,mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC" ON DELETE CASCADE
);

-- Existing class history is retained. All new history is written by registration.
DROP TRIGGER IF EXISTS ghi_chuyen_lop_hoc_sinh ON vuihoc."HOC_SINH";
DROP TRIGGER IF EXISTS kiem_tra_si_so_tu_hoc_sinh ON vuihoc."HOC_SINH";
ALTER TABLE vuihoc."TRUY_VET_XEP_LOP" ADD COLUMN IF NOT EXISTS mamonhoc text REFERENCES vuihoc."MON_HOC"(mamonhoc);
UPDATE vuihoc."TRUY_VET_XEP_LOP" t SET mamonhoc=l.mamonhoc FROM vuihoc."LOP_HOC" l
 WHERE t.mamonhoc IS NULL AND l.madinhdanh=coalesce(t.malopmoi,t.malopcu);

INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai,ngaydangky)
 SELECT h.madinhdanh,h.mamonhoc,h.matrinhdo,h.mamohinh,l.madinhdanh,
 CASE WHEN l.madinhdanh IS NOT NULL THEN 'DANG_HOC' WHEN h.trangthai='DANG_HOC' THEN 'CHO_XEP_LOP' ELSE h.trangthai END,h.ngaytao
 FROM vuihoc."HOC_SINH" h LEFT JOIN vuihoc."LOP_HOC" l ON l.malophoc=h.malophientai
 ON CONFLICT DO NOTHING;
INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC"
 SELECT s.mahocsinh,h.mamonhoc,s.thutu,s.thutrongtuan,s.makhunggio
 FROM vuihoc."LICH_DANG_KY_HOC_SINH" s JOIN vuihoc."HOC_SINH" h ON h.madinhdanh=s.mahocsinh
 WHERE to_regprocedure('vuihoc.du_lieu_quan_he_truoc_dang_ky_mon(text,jsonb)') IS NULL
 ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION vuihoc.hoc_sinh_lop(p_id text) RETURNS text[]
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(array_agg(mahocsinh ORDER BY mahocsinh),ARRAY[]::text[])
 FROM vuihoc."DANG_KY_MON_HOC" WHERE malop=p_id
$$;
CREATE OR REPLACE FUNCTION vuihoc.dang_ky_mon_truy_van(p_student text) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('subject',d.mamonhoc,'model',d.mamohinh,'level',d.matrinhdo,'registeredAt',d.ngaydangky,
 'status',d.trangthai,'currentClassCode',l.malophoc,'scheduleSlots',(
 SELECT coalesce(jsonb_agg(vuihoc.nhan_lich(s.thutrongtuan,s.makhunggio) ORDER BY s.thutu),'[]')
 FROM vuihoc."LICH_DANG_KY_MON_HOC" s WHERE (s.mahocsinh,s.mamonhoc)=(d.mahocsinh,d.mamonhoc)))
 ORDER BY d.ngaydangky,d.mamonhoc),'[]') FROM vuihoc."DANG_KY_MON_HOC" d
 LEFT JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=d.malop WHERE d.mahocsinh=p_student
$$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_truy_vet_dang_ky_mon() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE oldclass text;
BEGIN
 IF TG_OP='UPDATE' THEN oldclass:=OLD.malop; END IF;
 IF oldclass IS NOT DISTINCT FROM NEW.malop THEN RETURN NEW; END IF;
 INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,mamonhoc,malopcu,malopmoi,manguoithuchien)
 VALUES(NEW.mahocsinh,NEW.mamonhoc,oldclass,NEW.malop,nullif(current_setting('vuihoc.actor',true),''));
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ghi_truy_vet_dang_ky_mon ON vuihoc."DANG_KY_MON_HOC";
CREATE TRIGGER ghi_truy_vet_dang_ky_mon AFTER INSERT OR UPDATE ON vuihoc."DANG_KY_MON_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_truy_vet_dang_ky_mon();

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_dang_ky_mon() RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" d JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=d.malop
 JOIN vuihoc."HOC_SINH" h ON h.madinhdanh=d.mahocsinh
 WHERE d.mamonhoc<>l.mamonhoc OR d.matrinhdo<>l.matrinhdo OR d.mamohinh<>l.mamohinh
 OR (h.macaphoc,h.makhoi) IS DISTINCT FROM (l.macaphoc,l.makhoi)
 OR l.trangthai IN ('TAM_DUNG','DA_KET_THUC')) THEN
  RAISE EXCEPTION 'Đăng ký học sinh không khớp môn, khối, trình độ, mô hình hoặc lớp đã ngừng hoạt động';
 END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l JOIN vuihoc."DANG_KY_MON_HOC" d ON d.malop=l.madinhdanh
 GROUP BY l.madinhdanh,l.sisotoida HAVING count(*)>l.sisotoida) THEN RAISE EXCEPTION 'Sĩ số lớp vượt mức tối đa'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" a JOIN vuihoc."DANG_KY_MON_HOC" b
 ON a.mahocsinh=b.mahocsinh AND a.mamonhoc<b.mamonhoc
 JOIN vuihoc."LICH_LOP" la ON la.malop=a.malop JOIN vuihoc."LICH_LOP" lb ON lb.malop=b.malop AND lb.thutrongtuan=la.thutrongtuan
 JOIN vuihoc."KHUNG_GIO" ka ON ka.madinhdanh=la.makhunggio JOIN vuihoc."KHUNG_GIO" kb ON kb.madinhdanh=lb.makhunggio
 WHERE split_part(ka.khoanggio,'-',1)::time<split_part(kb.khoanggio,'-',2)::time
 AND split_part(kb.khoanggio,'-',1)::time<split_part(ka.khoanggio,'-',2)::time) THEN
  RAISE EXCEPTION 'Lịch hai lớp của cùng học sinh bị trùng';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN PERFORM vuihoc.kiem_tra_dang_ky_mon(); RETURN NULL; END $$;
DROP TRIGGER IF EXISTS kiem_tra_dang_ky_mon ON vuihoc."DANG_KY_MON_HOC";
CREATE CONSTRAINT TRIGGER kiem_tra_dang_ky_mon AFTER INSERT OR UPDATE OR DELETE ON vuihoc."DANG_KY_MON_HOC"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
DROP TRIGGER IF EXISTS kiem_tra_lich_hoc_sinh ON vuihoc."LICH_LOP";
CREATE CONSTRAINT TRIGGER kiem_tra_lich_hoc_sinh AFTER INSERT OR UPDATE OR DELETE ON vuihoc."LICH_LOP"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
DROP TRIGGER IF EXISTS kiem_tra_lop_hoc_sinh ON vuihoc."LOP_HOC";
CREATE CONSTRAINT TRIGGER kiem_tra_lop_hoc_sinh AFTER UPDATE ON vuihoc."LOP_HOC"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
DROP TRIGGER IF EXISTS kiem_tra_ho_so_dang_ky_mon ON vuihoc."HOC_SINH";
CREATE CONSTRAINT TRIGGER kiem_tra_ho_so_dang_ky_mon AFTER UPDATE ON vuihoc."HOC_SINH"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();

CREATE OR REPLACE FUNCTION vuihoc.tra_hoc_sinh_ve_cho_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.trangthai IN ('TAM_DUNG','DA_KET_THUC') THEN
  UPDATE vuihoc."DANG_KY_MON_HOC" SET malop=NULL,trangthai='CHO_XEP_LOP' WHERE malop=NEW.madinhdanh;
  UPDATE vuihoc."BUOI_HOC" SET trangthai='NGHI_HOC' WHERE malop=NEW.madinhdanh AND vaolopluc IS NULL
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tra_hoc_sinh_ve_cho_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER tra_hoc_sinh_ve_cho_lop AFTER UPDATE OF trangthai ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.tra_hoc_sinh_ve_cho_lop();
UPDATE vuihoc."DANG_KY_MON_HOC" d SET malop=NULL,trangthai='CHO_XEP_LOP'
 FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh=d.malop AND l.trangthai IN ('TAM_DUNG','DA_KET_THUC');

-- Preserve the installed projection/write chain, including documents and inspections.
DO $$ BEGIN
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_dang_ky_mon(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_dang_ky_mon;
  ALTER FUNCTION vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) RENAME TO ghi_du_lieu_quan_he_truoc_dang_ky_mon;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb; registrations jsonb; first_subject jsonb;
BEGIN
 r:=vuihoc.du_lieu_quan_he_truoc_dang_ky_mon(p_table,p_row);
 IF p_table='HOC_SINH' AND r IS NOT NULL THEN
  registrations:=vuihoc.dang_ky_mon_truy_van(p_row->>'madinhdanh'); first_subject:=registrations->0;
  r:=r||jsonb_build_object('dangkymonhoc',registrations);
  IF first_subject IS NOT NULL THEN r:=r||jsonb_build_object('mamonhoc',first_subject->'subject',
   'mamohinh',first_subject->'model','matrinhdo',first_subject->'level','trangthai',first_subject->'status',
   'malophientai',first_subject->'currentClassCode','lichdangky',first_subject->'scheduleSlots'); END IF;
 ELSIF p_table='LOP_HOC' AND r IS NOT NULL THEN
  -- The lesson teacher FK is authoritative even when assigned by monitoring.
  r:=r||jsonb_build_object('phancongdaythay',(
   SELECT coalesce(jsonb_agg(jsonb_build_object('sessionNum',coalesce(c.sobuoi,s.session_num),
    'dateStr',b.ngayhoc::text,'teacherId',b.magiaoviendaythay,'teacherName',g.hoten)
    ORDER BY b.ngayhoc,b.batdau),'[]')
   FROM vuihoc."BUOI_HOC" b JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=b.magiaoviendaythay
   LEFT JOIN LATERAL (SELECT sobuoi FROM vuihoc."CHI_TIET_CA_LOP" WHERE mabuoi=b.madinhdanh ORDER BY khoaca LIMIT 1) c ON true
   LEFT JOIN (SELECT s.malop,s.thutrongtuan,s.makhunggio,row_number() OVER(PARTITION BY s.malop ORDER BY s.thutrongtuan,k.khoanggio)::integer session_num
    FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio) s
    ON s.malop=b.malop AND s.thutrongtuan=extract(isodow FROM b.ngayhoc) AND s.makhunggio=b.makhunggio
   WHERE b.malop=p_row->>'madinhdanh'));
 END IF;
 RETURN r;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_du_lieu_quan_he(p_table text,p_row jsonb,p_backfill boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE id text:=p_row->>'madinhdanh'; x jsonb; registrations jsonb; cls vuihoc."LOP_HOC"; target text; s record; dayrow record;
BEGIN
 IF p_table='HOC_SINH' THEN
  registrations:=p_row->'dangkymonhoc';
  IF registrations IS NULL THEN registrations:=jsonb_build_array(jsonb_build_object('subject',p_row->'mamonhoc',
   'model',p_row->'mamohinh','level',p_row->'matrinhdo','status',p_row->'trangthai',
   'currentClassCode',p_row->'malophientai','scheduleSlots',coalesce(p_row->'lichdangky','[]'))); END IF;
  IF jsonb_typeof(registrations)<>'array' OR jsonb_array_length(registrations)=0 THEN RAISE EXCEPTION 'Cần ít nhất một đăng ký môn'; END IF;
  IF (SELECT count(*)<>count(DISTINCT e->>'subject') FROM jsonb_array_elements(registrations) e) THEN RAISE EXCEPTION 'Môn đăng ký bị trùng'; END IF;
  -- Missing subjects are retained: withdrawing changes their status, never erases history.
  FOR x IN SELECT value FROM jsonb_array_elements(registrations) LOOP
   target:=NULL;
   IF x->>'status'='DANG_HOC' THEN
    SELECT madinhdanh INTO target FROM vuihoc."LOP_HOC" WHERE malophoc=nullif(x->>'currentClassCode','');
    IF target IS NULL THEN RAISE EXCEPTION 'Đăng ký đang học cần một lớp hợp lệ'; END IF;
   END IF;
   INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai)
    VALUES(id,x->>'subject',x->>'level',x->>'model',target,x->>'status')
    ON CONFLICT(mahocsinh,mamonhoc) DO UPDATE SET matrinhdo=excluded.matrinhdo,mamohinh=excluded.mamohinh,malop=excluded.malop,trangthai=excluded.trangthai;
   DELETE FROM vuihoc."LICH_DANG_KY_MON_HOC" WHERE mahocsinh=id AND mamonhoc=x->>'subject';
   FOR s IN SELECT value,ordinality FROM jsonb_array_elements_text(coalesce(x->'scheduleSlots','[]')) WITH ORDINALITY LOOP
    SELECT * INTO STRICT dayrow FROM vuihoc.tach_lich(s.value);
    INSERT INTO vuihoc."LICH_DANG_KY_MON_HOC" VALUES(id,x->>'subject',s.ordinality,dayrow.thutrongtuan,dayrow.makhunggio);
   END LOOP;
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

-- Historical feedback roster stays fixed; only unstarted sessions use current enrollments.
CREATE OR REPLACE FUNCTION vuihoc.hoc_sinh_nhan_xet_ca(p_buoi text) RETURNS TABLE(mahocsinh text)
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT n.mahocsinh FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=p_buoi
 UNION ALL SELECT h FROM vuihoc."BUOI_HOC" b CROSS JOIN LATERAL unnest(vuihoc.hoc_sinh_lop(b.malop)) h
 WHERE b.madinhdanh=p_buoi AND NOT EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=p_buoi)
$$;

DO $rpc$
DECLARE f text; conf jsonb:=vuihoc.business_config();
BEGIN
 IF NOT(conf->'students'->'columns' ? 'dangkymonhoc') THEN
  conf:=jsonb_set(conf,'{students,columns}',conf->'students'->'columns'||'"dangkymonhoc"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'student_subject_enrollments')=0 THEN
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE k<>''dangkymonhoc'' AND');
  f:=replace(f,'RETURN jsonb_build_object(''saved'',true', 'PERFORM vuihoc.kiem_tra_dang_ky_mon(); -- student_subject_enrollments'||chr(10)||' RETURN jsonb_build_object(''saved'',true');
  -- Nested class assignment changes require roster permission, including profile edits.
  f:=replace(f,'target:=conf->>''feature'';', $guard$target:=conf->>'feature';
   IF ds='students' AND key='dangkymonhoc' THEN
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(v->key,'[]')) n
      LEFT JOIN LATERAL (SELECT value o FROM jsonb_array_elements(coalesce(b->key,'[]')) WHERE value->>'subject'=n->>'subject') q ON true
      WHERE (CASE WHEN n->>'status'='DANG_HOC' THEN nullif(n->>'currentClassCode','') END)
       IS DISTINCT FROM (CASE WHEN o->>'status'='DANG_HOC' THEN nullif(o->>'currentClassCode','') END))
      AND NOT vuihoc.business_can(actor.madinhdanh,'PH4','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)') THEN
     RAISE EXCEPTION 'Không có quyền ghép hoặc rút học sinh khỏi lớp'; END IF;
   END IF;
   IF ds='students' AND key='malophientai' AND nullif(v->>key,'') IS DISTINCT FROM nullif(b->>key,'')
    AND NOT vuihoc.business_can(actor.madinhdanh,'PH4','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)') THEN
    RAISE EXCEPTION 'Không có quyền ghép hoặc rút học sinh khỏi lớp'; END IF;
   IF ds='classes' AND key='danhsachmahocsinh' AND v->>'trangthai' IN ('TAM_DUNG','DA_KET_THUC')
    AND vuihoc.business_can(actor.madinhdanh,'PH4','Tạo, sửa, xóa lớp và cập nhật link phòng học') THEN CONTINUE; END IF;
   $guard$);
  EXECUTE f;
 END IF;
 IF strpos(f,'student_subject_enrollments')=0 THEN RAISE EXCEPTION 'Không tìm thấy điểm tích hợp RPC'; END IF;
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 f:=replace(f,'(vuihoc.lop_truong_truy_van(to_jsonb(cls))->''phancongdaythay'')',
  '(vuihoc.du_lieu_quan_he(''LOP_HOC'',to_jsonb(cls))->''phancongdaythay'')');
 EXECUTE f;
 f:=pg_get_functiondef('vuihoc.lich_su_lop_hoc(text)'::regprocedure);
 f:=replace(f,'''traceId'',t.madinhdanh::text','''subject'',t.mamonhoc,''traceId'',t.madinhdanh::text');
 IF strpos(f,'prev.mamonhoc IS NOT DISTINCT FROM t.mamonhoc')=0 THEN
  f:=replace(f,'prev.mahocsinh=t.mahocsinh','prev.mahocsinh=t.mahocsinh AND prev.mamonhoc IS NOT DISTINCT FROM t.mamonhoc');
 END IF;
 EXECUTE f;
END $rpc$;

-- Primary/cover identities are always teacher keys; names are read projections.
CREATE OR REPLACE FUNCTION vuihoc.gan_ma_giao_vien_buoi() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.vaolopluc IS NOT NULL AND (TG_OP='INSERT' OR OLD.vaolopluc IS NULL)
  AND EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malop AND trangthai IN ('TAM_DUNG','DA_KET_THUC')) THEN
  RAISE EXCEPTION 'Lớp đã dừng hoặc kết thúc, không thể vào buổi mới'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT magiaovien INTO NEW.magiaovienchinh FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malop;
 ELSE
  IF (NEW.magiaovienchinh,NEW.magiaoviendaythay) IS DISTINCT FROM (OLD.magiaovienchinh,OLD.magiaoviendaythay)
   AND EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=NEW.madinhdanh) THEN
   RAISE EXCEPTION 'Buổi đã ghi công không được thay đổi mã giáo viên'; END IF;
 END IF;
 IF NEW.magiaovienchinh IS NULL THEN SELECT magiaovien INTO NEW.magiaovienchinh FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malop; END IF;
 IF NEW.magiaovienchinh IS NULL THEN RAISE EXCEPTION 'Buổi học cần mã giáo viên chính'; END IF;
 IF NEW.magiaoviendaythay=NEW.magiaovienchinh THEN NEW.magiaoviendaythay:=NULL; END IF;
 IF NEW.magiaoviendaythay IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=NEW.malop
  WHERE g.madinhdanh=NEW.magiaoviendaythay AND g.mamonhoc=l.mamonhoc) THEN
  RAISE EXCEPTION 'Mã giáo viên cover không khớp môn học của lớp'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gan_ma_giao_vien_buoi ON vuihoc."BUOI_HOC";
CREATE TRIGGER gan_ma_giao_vien_buoi BEFORE INSERT OR UPDATE ON vuihoc."BUOI_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.gan_ma_giao_vien_buoi();

DO $security$ DECLARE t text; r record;
BEGIN
 FOREACH t IN ARRAY ARRAY['DANG_KY_MON_HOC','LICH_DANG_KY_MON_HOC'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON vuihoc.%I TO service_role',t);
 END LOOP;
 FOR r IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='vuihoc' AND p.proname IN ('dang_ky_mon_truy_van','ghi_truy_vet_dang_ky_mon','kiem_tra_dang_ky_mon',
 'kiem_tra_dang_ky_mon_trigger','tra_hoc_sinh_ve_cho_lop','du_lieu_quan_he','ghi_du_lieu_quan_he',
 'du_lieu_quan_he_truoc_dang_ky_mon','ghi_du_lieu_quan_he_truoc_dang_ky_mon','gan_ma_giao_vien_buoi') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
END $security$;
SELECT vuihoc.kiem_tra_dang_ky_mon();
SET CONSTRAINTS ALL IMMEDIATE;
NOTIFY pgrst,'reload schema';
COMMIT;
