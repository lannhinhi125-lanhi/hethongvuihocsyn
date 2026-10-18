-- Run this entire file once in Supabase SQL Editor.
-- Schema upgrade and existing demo class terms are committed atomically.
BEGIN;
-- Source: migrations/20261109_reenrollment_class_duration.sql
-- Run after 20261108. No tuition or revenue data is introduced.

LOCK TABLE vuihoc."DANG_KY_MON_HOC",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO vuihoc."DANH_MUC_BO_SUNG"(madinhdanh,madanhmuc,tendanhmuc,mota)
VALUES('CLASS-DURATION','CLASS_DURATION','Thời hạn lớp học','Số tháng lịch của một lớp học') ON CONFLICT DO NOTHING;
INSERT INTO vuihoc."MUC_DANH_MUC"(madanhmuc,madinhdanh,ma,ten,mota,danghoatdong,thutu)
SELECT c.madinhdanh,'MONTHS-'||n,n::text,CASE WHEN n=12 THEN '1 năm' ELSE n||' tháng' END,'',true,n
FROM vuihoc."DANH_MUC_BO_SUNG" c CROSS JOIN unnest(ARRAY[1,3,6,12]) n WHERE c.madanhmuc='CLASS_DURATION'
ON CONFLICT DO NOTHING;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS thoihanthang integer CHECK(thoihanthang BETWEEN 1 AND 120);
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS ngayketthuc date;
CREATE OR REPLACE FUNCTION vuihoc.tinh_ngay_ket_thuc_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.thoihanthang IS NULL THEN
  IF TG_OP='UPDATE' AND OLD.thoihanthang IS NOT NULL THEN RAISE EXCEPTION 'Không bỏ thời hạn đã thiết lập của lớp'; END IF;
  NEW.ngayketthuc:=NULL; RETURN NEW;
 END IF;
 IF NEW.ngaybatdau IS NULL THEN RAISE EXCEPTION 'Chọn ngày bắt đầu lớp'; END IF;
 IF TG_OP='INSERT' OR NEW.thoihanthang IS DISTINCT FROM OLD.thoihanthang THEN
  IF NOT EXISTS(SELECT 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
   WHERE c.madanhmuc='CLASS_DURATION' AND m.danghoatdong AND m.ma=NEW.thoihanthang::text) THEN RAISE EXCEPTION 'Thời hạn lớp không thuộc danh mục đang hoạt động'; END IF;
 END IF;
 NEW.ngayketthuc:=(NEW.ngaybatdau+make_interval(months=>NEW.thoihanthang))::date-1;
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=NEW.madinhdanh AND b.ngayhoc>NEW.ngayketthuc) THEN
  RAISE EXCEPTION 'Lớp đã có buổi học sau ngày kết thúc. Hãy xử lý lịch các buổi đó trước khi rút ngắn thời hạn.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tinh_ngay_ket_thuc_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER tinh_ngay_ket_thuc_lop BEFORE INSERT OR UPDATE OF ngaybatdau,thoihanthang,ngayketthuc ON vuihoc."LOP_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.tinh_ngay_ket_thuc_lop();
CREATE OR REPLACE FUNCTION vuihoc.chan_buoi_ngoai_thoi_han() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh=NEW.malop AND
  (NEW.ngayhoc<l.ngaybatdau OR NEW.ngayhoc>l.ngayketthuc)) THEN RAISE EXCEPTION 'Buổi học nằm ngoài thời hạn lớp'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chan_buoi_ngoai_thoi_han ON vuihoc."BUOI_HOC";
CREATE TRIGGER chan_buoi_ngoai_thoi_han BEFORE INSERT OR UPDATE OF malop,ngayhoc ON vuihoc."BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.chan_buoi_ngoai_thoi_han();

-- Current subject assignment retains its stable composite key. Closed periods
-- are immutable snapshots in relational tables, including their requested slots.
ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD COLUMN IF NOT EXISTS dotdangky integer NOT NULL DEFAULT 1;
ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD COLUMN IF NOT EXISTS loaidangky text NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD COLUMN IF NOT EXISTS khoidangky text;
ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD COLUMN IF NOT EXISTS thoihocluc timestamptz;
UPDATE vuihoc."DANG_KY_MON_HOC" d SET khoidangky=h.makhoi FROM vuihoc."HOC_SINH" h WHERE h.madinhdanh=d.mahocsinh AND d.khoidangky IS NULL;
CREATE TABLE IF NOT EXISTS vuihoc."LICH_SU_DANG_KY_HOC"(
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 mamonhoc text NOT NULL REFERENCES vuihoc."MON_HOC"(mamonhoc),dotdangky integer NOT NULL,
 ngaydangky timestamptz NOT NULL,ketthucluc timestamptz,loaidangky text NOT NULL,
 khoi text,matrinhdo text NOT NULL REFERENCES vuihoc."TRINH_DO"(matrinhdo),mamohinh text NOT NULL REFERENCES vuihoc."MO_HINH_LOP"(mamohinh),
 trangthai text NOT NULL,PRIMARY KEY(mahocsinh,mamonhoc,dotdangky)
);
CREATE TABLE IF NOT EXISTS vuihoc."LICH_SU_CA_DANG_KY_HOC"(
 mahocsinh text NOT NULL,mamonhoc text NOT NULL,dotdangky integer NOT NULL,thutu integer NOT NULL,
 thutrongtuan integer NOT NULL,makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh),
 PRIMARY KEY(mahocsinh,mamonhoc,dotdangky,thutu),
 FOREIGN KEY(mahocsinh,mamonhoc,dotdangky) REFERENCES vuihoc."LICH_SU_DANG_KY_HOC" ON DELETE CASCADE
);
CREATE OR REPLACE FUNCTION vuihoc.luu_dot_dang_ky_hoc_lai() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  -- Metadata is server-owned, not writable through the registration document.
  NEW.dotdangky:=OLD.dotdangky;NEW.loaidangky:=OLD.loaidangky;NEW.ngaydangky:=OLD.ngaydangky;
  IF OLD.trangthai='DA_THOI_HOC' AND NEW.trangthai NOT IN ('DA_THOI_HOC','CHO_XEP_LOP','DANG_HOC') THEN RAISE EXCEPTION 'Đăng ký học lại phải chuyển về Chờ xếp lớp hoặc Đang học'; END IF;
  IF OLD.trangthai='DA_THOI_HOC' AND NEW.trangthai IN ('CHO_XEP_LOP','DANG_HOC') THEN
   INSERT INTO vuihoc."LICH_SU_DANG_KY_HOC" VALUES(OLD.mahocsinh,OLD.mamonhoc,OLD.dotdangky,OLD.ngaydangky,OLD.thoihocluc,OLD.loaidangky,OLD.khoidangky,OLD.matrinhdo,OLD.mamohinh,OLD.trangthai);
   INSERT INTO vuihoc."LICH_SU_CA_DANG_KY_HOC" SELECT s.mahocsinh,s.mamonhoc,OLD.dotdangky,s.thutu,s.thutrongtuan,s.makhunggio
    FROM vuihoc."LICH_DANG_KY_MON_HOC" s WHERE (s.mahocsinh,s.mamonhoc)=(OLD.mahocsinh,OLD.mamonhoc);
   NEW.dotdangky:=OLD.dotdangky+1;NEW.loaidangky:='RETURNING';NEW.ngaydangky:=statement_timestamp();
   SELECT makhoi INTO NEW.khoidangky FROM vuihoc."HOC_SINH" WHERE madinhdanh=NEW.mahocsinh;
  END IF;
 ELSE
  NEW.loaidangky:='FIRST';
  SELECT makhoi INTO NEW.khoidangky FROM vuihoc."HOC_SINH" WHERE madinhdanh=NEW.mahocsinh;
  IF EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=NEW.mahocsinh) THEN NEW.loaidangky:='ADDITIONAL'; END IF;
 END IF;
 IF NEW.trangthai='DA_THOI_HOC' THEN
  IF TG_OP='INSERT' OR OLD.trangthai<>'DA_THOI_HOC' THEN NEW.thoihocluc:=statement_timestamp(); END IF;
 ELSE NEW.thoihocluc:=NULL; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS luu_dot_dang_ky_hoc_lai ON vuihoc."DANG_KY_MON_HOC";
CREATE TRIGGER luu_dot_dang_ky_hoc_lai BEFORE INSERT OR UPDATE ON vuihoc."DANG_KY_MON_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.luu_dot_dang_ky_hoc_lai();
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_khoi_dot_dang_ky() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 UPDATE vuihoc."DANG_KY_MON_HOC" SET khoidangky=NEW.makhoi WHERE mahocsinh=NEW.madinhdanh AND trangthai<>'DA_THOI_HOC' AND khoidangky IS DISTINCT FROM NEW.makhoi;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dong_bo_khoi_dot_dang_ky ON vuihoc."HOC_SINH";
CREATE TRIGGER dong_bo_khoi_dot_dang_ky AFTER UPDATE OF makhoi ON vuihoc."HOC_SINH" FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_khoi_dot_dang_ky();

DO $patch$
DECLARE f text; conf jsonb; fn record;
BEGIN
 conf:=vuihoc.business_config();
 conf:=jsonb_set(conf,'{classes,columns}',conf->'classes'->'columns'||'["thoihanthang","ngayketthuc"]'::jsonb);
 IF NOT conf->'students'->'columns' ? 'lichsudangky' THEN conf:=jsonb_set(conf,'{students,columns}',conf->'students'->'columns'||'"lichsudangky"'::jsonb); END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L', 'SELECT '||quote_literal(conf::text)||'::jsonb');
 f:=pg_get_functiondef('vuihoc.dong_bo_ca_theo_lich(date,date)'::regprocedure);
 IF strpos(f,'d.d::date<=l.ngayketthuc')=0 THEN
  IF strpos(f,'ON CONFLICT(malop,ngayhoc,makhunggio)')=0 THEN RAISE EXCEPTION 'Không tìm thấy hàm sinh buổi theo lịch dự kiến'; END IF;
  f:=replace(f,'ON CONFLICT(malop,ngayhoc,makhunggio)','AND (l.ngayketthuc IS NULL OR d.d::date<=l.ngayketthuc) ON CONFLICT(malop,ngayhoc,makhunggio)');EXECUTE f;
 END IF;
 FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vuihoc' AND p.proname LIKE 'kiem_tra_sua_ho_so%' LOOP
  f:=pg_get_functiondef(fn.oid);
  f:=replace(f,'r->>''status''<>''CHO_XEP_LOP''','r->>''status'' NOT IN (''CHO_XEP_LOP'',''DA_THOI_HOC'')');
  f:=replace(f,'oldreg->>''status''<>''CHO_XEP_LOP''','oldreg->>''status'' NOT IN (''CHO_XEP_LOP'',''DA_THOI_HOC'')');
  EXECUTE f;
 END LOOP;
 f:=pg_get_functiondef('vuihoc.dang_ky_mon_truy_van(text)'::regprocedure);
 IF strpos(f,'''periodNumber''')=0 THEN
  f:=replace(f,'''registeredAt'',d.ngaydangky','''registeredAt'',d.ngaydangky,''periodNumber'',d.dotdangky,''registrationKind'',d.loaidangky');EXECUTE f;
 END IF;
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_hoc_lai(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_hoc_lai;
 END IF;
END $patch$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb;
BEGIN
 r:=vuihoc.du_lieu_quan_he_truoc_hoc_lai(p_table,p_row);
 IF p_table='HOC_SINH' THEN
  r:=r||jsonb_build_object('lichsudangky',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'subject',h.mamonhoc,'registeredAt',h.ngaydangky,'endedAt',h.ketthucluc,'registrationKind',h.loaidangky,'periodNumber',h.dotdangky,
   'grade',h.khoi,'model',h.mamohinh,'level',h.matrinhdo,'status','Đã thôi học','scheduleSlots',(
    SELECT coalesce(jsonb_agg(vuihoc.nhan_lich(s.thutrongtuan,s.makhunggio) ORDER BY s.thutu),'[]') FROM vuihoc."LICH_SU_CA_DANG_KY_HOC" s
    WHERE (s.mahocsinh,s.mamonhoc,s.dotdangky)=(h.mahocsinh,h.mamonhoc,h.dotdangky))) ORDER BY h.ngaydangky),'[]')
   FROM vuihoc."LICH_SU_DANG_KY_HOC" h WHERE h.mahocsinh=p_row->>'madinhdanh'));
 END IF;
 RETURN r;
END $$;
ALTER TABLE vuihoc."LICH_SU_DANG_KY_HOC" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vuihoc."LICH_SU_CA_DANG_KY_HOC" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."LICH_SU_DANG_KY_HOC",vuihoc."LICH_SU_CA_DANG_KY_HOC" FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION vuihoc.tinh_ngay_ket_thuc_lop(),vuihoc.chan_buoi_ngoai_thoi_han(),vuihoc.luu_dot_dang_ky_hoc_lai(),vuihoc.du_lieu_quan_he_truoc_hoc_lai(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION vuihoc.dong_bo_khoi_dot_dang_ky() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

-- Source: backfill_demo_class_end_dates.sql
-- Only the twelve existing DEMO-LOP-* classes with no term are updated.
-- Run after 20261109, or use apply_demo_class_terms.sql (includes both files).

DO $demo_terms$
BEGIN
LOCK TABLE vuihoc."LOP_HOC",vuihoc."BUOI_HOC",vuihoc."CONG_DAY_BUOI_HOC",
 vuihoc."SU_CO_BUOI_HOC",vuihoc."NHAN_XET_BUOI_HOC",vuihoc."DIEM_DANH_BUOI_HOC"
 IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='thoihanthang') THEN
  RAISE EXCEPTION 'Chạy 20261109_reenrollment_class_duration.sql trước, hoặc chạy apply_demo_class_terms.sql';
 END IF;

CREATE TEMP TABLE demo_class_term_plan ON COMMIT DROP AS
SELECT l.madinhdanh,l.ngaybatdau,t.months,
 (l.ngaybatdau+make_interval(months=>t.months))::date-1 AS end_date
FROM vuihoc."LOP_HOC" l
JOIN (SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') AS id,
 CASE WHEN i<=4 THEN '2026-10' WHEN i<=8 THEN '2026-11' ELSE '2026-12' END AS target_month
 FROM generate_series(1,12) i) targets ON targets.id=l.madinhdanh
LEFT JOIN LATERAL (SELECT months FROM generate_series(1,120) months
 WHERE to_char((l.ngaybatdau+make_interval(months=>months))::date-1,'YYYY-MM')=targets.target_month
 ORDER BY months LIMIT 1) t ON true
WHERE l.thoihanthang IS NULL AND l.ngayketthuc IS NULL;
 IF EXISTS(SELECT 1 FROM demo_class_term_plan WHERE months IS NULL) THEN
  RAISE EXCEPTION 'Ngày bắt đầu lớp không cho phép kết thúc trong tháng dự kiến. Không đổi ngày bắt đầu hoặc lịch sử.';
 END IF;
 -- Preserve all started/taught lessons and every dependent business record.
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b JOIN demo_class_term_plan p ON p.madinhdanh=b.malop WHERE b.ngayhoc>p.end_date AND (
  b.ngayhoc<=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date OR b.trangthai<>'CHUA_DIEN_RA'
  OR b.vaolopluc IS NOT NULL OR b.ketthucluc IS NOT NULL OR b.magiaoviendaythay IS NOT NULL
  OR coalesce(b.nhatky,'')<>'' OR coalesce(b.lienketbanghi,'')<>''
  OR EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" s WHERE s.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" d WHERE d.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_CA_LOP" c WHERE c.mabuoi=b.madinhdanh AND (c.codiemdanh OR c.conhanxet OR c.magiaoviendaythay IS NOT NULL OR nullif(c.giovaohienthi,'') IS NOT NULL))
  OR EXISTS(SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" d WHERE d.mabuoi=b.madinhdanh)
  OR EXISTS(SELECT 1 FROM vuihoc."PHAN_CONG_DAY_THAY" a WHERE a.mabuoi=b.madinhdanh)
 )) THEN RAISE EXCEPTION 'Có buổi sau hạn đã phát sinh dữ liệu hoặc đã đến ngày học. Toàn bộ cập nhật được hủy; cần đối chiếu riêng.'; END IF;

-- Old September starts need 2/4 months to finish at month ends without moving
-- their start dates. Add those valid terms to the same shared catalog.
INSERT INTO vuihoc."MUC_DANH_MUC"(madanhmuc,madinhdanh,ma,ten,mota,danghoatdong,thutu)
SELECT c.madinhdanh,'MONTHS-'||p.months,p.months::text,p.months||' tháng','',true,p.months
FROM (SELECT DISTINCT months FROM demo_class_term_plan) p
JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madanhmuc='CLASS_DURATION'
WHERE NOT EXISTS(SELECT 1 FROM vuihoc."MUC_DANH_MUC" m WHERE m.madanhmuc=c.madinhdanh AND m.ma=p.months::text)
ON CONFLICT DO NOTHING;
 IF EXISTS(SELECT 1 FROM demo_class_term_plan p WHERE NOT EXISTS(
  SELECT 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
  WHERE c.madanhmuc='CLASS_DURATION' AND m.ma=p.months::text AND m.danghoatdong
 )) THEN RAISE EXCEPTION 'Thời hạn cần dùng đang ngừng hoạt động trong danh mục'; END IF;

-- Untouched demo projections are only scheduled slots, not attendance/history.
DELETE FROM vuihoc."CHI_TIET_CA_LOP" c USING vuihoc."BUOI_HOC" b,demo_class_term_plan p
WHERE c.mabuoi=b.madinhdanh AND b.malop=p.madinhdanh AND b.ngayhoc>p.end_date;
DELETE FROM vuihoc."BUOI_HOC" b USING demo_class_term_plan p
WHERE b.malop=p.madinhdanh AND b.ngayhoc>p.end_date;
UPDATE vuihoc."LOP_HOC" l SET thoihanthang=p.months,ngayketthuc=p.end_date
FROM demo_class_term_plan p WHERE l.madinhdanh=p.madinhdanh;

END $demo_terms$;

-- Review the exact resulting dates, including pre-existing terms left intact.
SELECT madinhdanh,malophoc,tenlophoc,ngaybatdau,thoihanthang,ngayketthuc
FROM vuihoc."LOP_HOC" WHERE madinhdanh IN (SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(1,12) i)
ORDER BY ngayketthuc,madinhdanh;

COMMIT;
