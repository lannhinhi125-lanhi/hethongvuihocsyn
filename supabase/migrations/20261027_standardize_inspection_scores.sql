-- Run after 20261026. Same scoring rule for both forms and stored reports.
BEGIN;
LOCK TABLE vuihoc."BIEN_BAN_DU_GIO" IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION vuihoc.chuan_hoa_diem_du_gio() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 NEW.diemtong:=round((NEW.diemtc1+NEW.diemtc2*2+NEW.diemtc3)/4,2);
 NEW.xeploai:=CASE WHEN NEW.diemtong>=9 THEN 'Xuất sắc'
  WHEN NEW.diemtong>=8 THEN 'Tốt' WHEN NEW.diemtong>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chuan_hoa_diem_du_gio ON vuihoc."BIEN_BAN_DU_GIO";
CREATE TRIGGER chuan_hoa_diem_du_gio BEFORE INSERT OR UPDATE ON vuihoc."BIEN_BAN_DU_GIO"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.chuan_hoa_diem_du_gio();

-- Preserve the original criterion scores, comments, identities and lesson links.
UPDATE vuihoc."BIEN_BAN_DU_GIO" SET diemtong=round((diemtc1+diemtc2*2+diemtc3)/4,2),
 xeploai=CASE WHEN round((diemtc1+diemtc2*2+diemtc3)/4,2)>=9 THEN 'Xuất sắc'
  WHEN round((diemtc1+diemtc2*2+diemtc3)/4,2)>=8 THEN 'Tốt'
  WHEN round((diemtc1+diemtc2*2+diemtc3)/4,2)>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END
 WHERE diemtong IS DISTINCT FROM round((diemtc1+diemtc2*2+diemtc3)/4,2)
 OR xeploai IS DISTINCT FROM CASE WHEN round((diemtc1+diemtc2*2+diemtc3)/4,2)>=9 THEN 'Xuất sắc'
  WHEN round((diemtc1+diemtc2*2+diemtc3)/4,2)>=8 THEN 'Tốt'
  WHEN round((diemtc1+diemtc2*2+diemtc3)/4,2)>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END;
REVOKE ALL ON FUNCTION vuihoc.chuan_hoa_diem_du_gio() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
