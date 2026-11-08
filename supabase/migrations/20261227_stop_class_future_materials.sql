-- Run as postgres after normalized class materials and lesson clocks.
-- Automatically clean future unused plans when a class is permanently stopped.
-- Also cleans already-stopped classes; preserves lesson rows and business history.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION vuihoc.don_hoc_lieu_tuong_lai_lop_dung(p_lop text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_lop AND trangthai='TAM_DUNG' FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 -- Retain the cancelled lesson for operations, but remove unused teaching links.
 -- Any actual attendance, feedback, work, incident, evaluation or locked month
 -- protects the source material even when its scheduled clock is in the future.
 UPDATE vuihoc."BUOI_HOC" b SET mahoclieu=NULL,hoclieutieude=NULL,
  hoclieugiaovien=NULL,hoclieuhocsinh=NULL,baitaplms=NULL
 FROM vuihoc."KHUNG_GIO" k
 WHERE b.malop=p_lop AND k.madinhdanh=b.makhunggio
  AND (b.ngayhoc+k.giobatdau) AT TIME ZONE 'Asia/Bangkok'>statement_timestamp()
  AND b.vaolopluc IS NULL AND b.ketthucluc IS NULL
  AND NOT EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh)
  AND NOT EXISTS(SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" d WHERE d.mabuoi=b.madinhdanh)
  AND NOT EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh)
  AND NOT EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i WHERE i.mabuoi=b.madinhdanh)
  AND NOT EXISTS(SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" e WHERE e.mabuoi=b.madinhdanh)
  AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
  AND (b.mahoclieu IS NOT NULL OR b.hoclieutieude IS NOT NULL OR b.hoclieugiaovien IS NOT NULL
   OR b.hoclieuhocsinh IS NOT NULL OR b.baitaplms IS NOT NULL);

 -- A row belongs to one weekly session. Handle a future session in the current
 -- week too, while protecting any row shared with a past/started lesson.
 WITH schedule AS (
  SELECT s.thutrongtuan,k.giobatdau,
   row_number() OVER(ORDER BY s.thutrongtuan,k.giobatdau,k.gioketthuc) AS sobuoi
  FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio WHERE s.malop=p_lop
 ) DELETE FROM vuihoc."HOC_LIEU_LOP" h
 WHERE h.malop=p_lop
  AND NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE (b.malop,b.mahoclieu)=(h.malop,h.mahoclieu))
  AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p
   WHERE p.dakhoa AND p.kycong BETWEEN to_char(h.tungay,'YYYY-MM') AND to_char(h.denngay,'YYYY-MM'))
  AND (h.tungay>(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date
   OR (EXISTS(SELECT 1 FROM schedule s CROSS JOIN LATERAL generate_series(h.tungay::timestamp,h.denngay::timestamp,interval '1 day') d(day)
     WHERE s.sobuoi=h.sobuoi AND extract(isodow FROM d.day)::integer=s.thutrongtuan
      AND (d.day::date+s.giobatdau) AT TIME ZONE 'Asia/Bangkok'>statement_timestamp())
    AND NOT EXISTS(SELECT 1 FROM schedule s CROSS JOIN LATERAL generate_series(h.tungay::timestamp,h.denngay::timestamp,interval '1 day') d(day)
     WHERE s.sobuoi=h.sobuoi AND extract(isodow FROM d.day)::integer=s.thutrongtuan
      AND (d.day::date+s.giobatdau) AT TIME ZONE 'Asia/Bangkok'<=statement_timestamp())));
END $$;

CREATE OR REPLACE FUNCTION vuihoc.don_hoc_lieu_khi_dung_lop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM vuihoc.don_hoc_lieu_tuong_lai_lop_dung(NEW.madinhdanh);
 RETURN NEW;
END $$;
-- Runs after the existing stop/release trigger (trigger names sort by name).
DROP TRIGGER IF EXISTS z_don_hoc_lieu_khi_dung_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER z_don_hoc_lieu_khi_dung_lop AFTER UPDATE OF trangthai ON vuihoc."LOP_HOC"
FOR EACH ROW WHEN (NEW.trangthai='TAM_DUNG' AND OLD.trangthai IS DISTINCT FROM NEW.trangthai)
EXECUTE FUNCTION vuihoc.don_hoc_lieu_khi_dung_lop();

DO $$
DECLARE trusted_owner name;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Không xác định được owner quản trị của RPC đăng nhập.';
 END IF;
 EXECUTE format('ALTER FUNCTION vuihoc.don_hoc_lieu_tuong_lai_lop_dung(text) OWNER TO %I',trusted_owner);
 EXECUTE format('ALTER FUNCTION vuihoc.don_hoc_lieu_khi_dung_lop() OWNER TO %I',trusted_owner);
END $$;
REVOKE ALL ON FUNCTION vuihoc.don_hoc_lieu_tuong_lai_lop_dung(text),vuihoc.don_hoc_lieu_khi_dung_lop() FROM PUBLIC,anon,authenticated;

DO $$ DECLARE cls record;
BEGIN
 FOR cls IN SELECT madinhdanh FROM vuihoc."LOP_HOC" WHERE trangthai='TAM_DUNG' ORDER BY madinhdanh LOOP
  PERFORM vuihoc.don_hoc_lieu_tuong_lai_lop_dung(cls.madinhdanh);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
