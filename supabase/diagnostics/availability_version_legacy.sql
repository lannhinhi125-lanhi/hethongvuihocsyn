-- Read-only; works before and after 20261209. No inference of historical start dates.
DO $review$ DECLARE pending jsonb; BEGIN
 IF to_regclass('vuihoc."PHIEN_BAN_LICH_RANH"') IS NULL THEN
  IF EXISTS(SELECT 1 FROM vuihoc."LICH_RANH_TUAN") OR EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_LICH_RANH") THEN
   SELECT jsonb_agg(jsonb_build_object('id',madinhdanh,'teacherId',magiaovien,'weekStart',ngaydautuan) ORDER BY magiaovien,ngaydautuan) INTO pending FROM vuihoc."LICH_RANH_TUAN";
   RAISE NOTICE 'Có lịch theo tuần; migration sẽ dừng để đối soát, không tự chuyển thành lịch lặp. Các đăng ký: %',pending;
  END IF;
 END IF;
END $review$;
SELECT a.magiaovien,a.makhunggio,count(*) AS songay,'INCOMPLETE_SLOT' AS can_doi_soat
FROM vuihoc."LICH_RANH_DINH_KY" a GROUP BY a.magiaovien,a.makhunggio HAVING count(*)<>7;
SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='vuihoc'
AND table_name IN ('LICH_RANH_TUAN','CHI_TIET_LICH_RANH','LICH_RANH_DINH_KY','PHIEN_BAN_LICH_RANH','CHI_TIET_PHIEN_BAN_LICH_RANH') ORDER BY table_name,ordinal_position;
