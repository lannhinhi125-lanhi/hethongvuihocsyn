-- Apply after class duration and temporary pause updates.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.buoi_co_hoc_lieu_tuan(p_lop text,p_ngay date,p_khunggio text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT EXISTS(
  SELECT 1 FROM (
   SELECT s.thutrongtuan,s.makhunggio,row_number() OVER(ORDER BY s.thutrongtuan,replace(k.khoanggio,' ','') COLLATE "C") AS sobuoi
   FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio WHERE s.malop=p_lop
  ) lich JOIN vuihoc."HOC_LIEU_LOP" h ON h.malop=p_lop AND h.sobuoi=lich.sobuoi
  CROSS JOIN LATERAL regexp_match(h.tuan,'Từ ngày ([0-9]{2})/([0-9]{2})/([0-9]{4}) đến ngày ([0-9]{2})/([0-9]{2})/([0-9]{4})') r(parts)
  WHERE lich.makhunggio=p_khunggio AND lich.thutrongtuan=extract(isodow FROM p_ngay)::integer
   AND p_ngay BETWEEN to_date(r.parts[1]||'/'||r.parts[2]||'/'||r.parts[3],'DD/MM/YYYY')
    AND to_date(r.parts[4]||'/'||r.parts[5]||'/'||r.parts[6],'DD/MM/YYYY')
 )
$$;
REVOKE ALL ON FUNCTION vuihoc.buoi_co_hoc_lieu_tuan(text,date,text) FROM PUBLIC,anon,authenticated;
DO $$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.dong_bo_ca_theo_lich(date,date)'::regprocedure);
 IF strpos(f,'buoi_co_hoc_lieu_tuan')=0 THEN
  IF strpos(f,'ON CONFLICT(malop,ngayhoc,makhunggio)')=0 THEN RAISE EXCEPTION 'Không tìm thấy hàm sinh lịch lớp'; END IF;
  f:=replace(f,'ON CONFLICT(malop,ngayhoc,makhunggio)',
   'AND vuihoc.buoi_co_hoc_lieu_tuan(l.madinhdanh,d.d::date,s.makhunggio) ON CONFLICT(malop,ngayhoc,makhunggio)');
  EXECUTE f;
 END IF;
END $$;

-- Saving weekly materials is the event that creates that week's scheduled lessons.
CREATE OR REPLACE FUNCTION vuihoc.sinh_buoi_khi_gan_hoc_lieu() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE parts text[]; start_day date; end_day date;
BEGIN
 parts:=regexp_match(NEW.tuan,'Từ ngày ([0-9]{2})/([0-9]{2})/([0-9]{4}) đến ngày ([0-9]{2})/([0-9]{2})/([0-9]{4})');
 IF parts IS NULL THEN RAISE EXCEPTION 'Tuần học liệu không có khoảng ngày hợp lệ'; END IF;
 start_day:=to_date(parts[1]||'/'||parts[2]||'/'||parts[3],'DD/MM/YYYY');
 end_day:=to_date(parts[4]||'/'||parts[5]||'/'||parts[6],'DD/MM/YYYY');
 IF end_day<start_day OR end_day-start_day>6 THEN RAISE EXCEPTION 'Học liệu phải gắn theo tuần tối đa 7 ngày'; END IF;
 start_day:=greatest(start_day,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date);
 IF start_day<=end_day THEN
  PERFORM vuihoc.dong_bo_ca_theo_lich(start_day,end_day);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sinh_buoi_khi_gan_hoc_lieu ON vuihoc."HOC_LIEU_LOP";
CREATE TRIGGER sinh_buoi_khi_gan_hoc_lieu AFTER INSERT OR UPDATE ON vuihoc."HOC_LIEU_LOP"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.sinh_buoi_khi_gan_hoc_lieu();
REVOKE ALL ON FUNCTION vuihoc.sinh_buoi_khi_gan_hoc_lieu() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
