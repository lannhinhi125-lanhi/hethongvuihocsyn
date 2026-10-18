-- Apply after 20261112_require_weekly_materials.sql.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.chan_hoc_lieu_lop_ngung() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE l.madinhdanh=NEW.malop
  AND l.trangthai='DANG_HOC' AND NOT l.tamdunglich
  AND (l.ngayketthuc IS NULL OR l.ngayketthuc >= (statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date)) THEN
  RAISE EXCEPTION 'Chỉ gắn học liệu cho lớp đang học, không tạm nghỉ và còn hạn';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chan_hoc_lieu_lop_ngung ON vuihoc."HOC_LIEU_LOP";
CREATE TRIGGER chan_hoc_lieu_lop_ngung BEFORE INSERT OR UPDATE ON vuihoc."HOC_LIEU_LOP"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.chan_hoc_lieu_lop_ngung();
REVOKE ALL ON FUNCTION vuihoc.chan_hoc_lieu_lop_ngung() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION vuihoc.ket_thuc_lop_het_han() RETURNS void
LANGUAGE sql SET search_path=pg_catalog AS $$
 UPDATE vuihoc."LOP_HOC" SET trangthai='DA_KET_THUC',tamdunglich=false
 WHERE ngayketthuc<(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date
  AND trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
$$;
REVOKE ALL ON FUNCTION vuihoc.ket_thuc_lop_het_han() FROM PUBLIC,anon,authenticated;
DO $$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.dong_bo_trang_thai_ca()'::regprocedure);
 IF strpos(f,'ket_thuc_lop_het_han')=0 THEN
  IF strpos(f,'PERFORM vuihoc.dong_bo_ca_theo_lich();')=0 THEN RAISE EXCEPTION 'Không tìm thấy luồng đồng bộ ca'; END IF;
  f:=replace(f,'PERFORM vuihoc.dong_bo_ca_theo_lich();','PERFORM vuihoc.ket_thuc_lop_het_han(); PERFORM vuihoc.dong_bo_ca_theo_lich();');EXECUTE f;
 END IF;
END $$;
SELECT vuihoc.ket_thuc_lop_het_han();
NOTIFY pgrst,'reload schema';
COMMIT;
