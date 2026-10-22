-- Only the twelve existing DEMO-LOP-* classes with no term are updated.
-- Run after 20261109, or use apply_demo_class_terms.sql (includes both files).
BEGIN;
DO $demo_terms$
DECLARE normalized boolean;
BEGIN
LOCK TABLE vuihoc."LOP_HOC",vuihoc."BUOI_HOC",vuihoc."CONG_DAY_BUOI_HOC",
 vuihoc."SU_CO_BUOI_HOC",vuihoc."NHAN_XET_BUOI_HOC",vuihoc."DIEM_DANH_BUOI_HOC"
 IN SHARE ROW EXCLUSIVE MODE;
 SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='mathoihan') INTO normalized;
 IF NOT normalized AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='thoihanthang') THEN
  RAISE EXCEPTION 'Chạy 20261109_reenrollment_class_duration.sql trước, hoặc chạy apply_demo_class_terms.sql';
 END IF;
 IF normalized THEN EXECUTE 'CREATE TEMP VIEW demo_class_term_source AS SELECT * FROM vuihoc."V_THOI_HAN_LOP"';
 ELSE EXECUTE 'CREATE TEMP VIEW demo_class_term_source AS SELECT * FROM vuihoc."LOP_HOC"'; END IF;

CREATE TEMP TABLE demo_class_term_plan ON COMMIT DROP AS
SELECT l.madinhdanh,l.ngaybatdau,t.months,
 (l.ngaybatdau+make_interval(months=>t.months))::date-1 AS end_date
FROM demo_class_term_source l
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
  OR nullif(b.hoclieugiaovien,'') IS NOT NULL OR nullif(b.hoclieuhocsinh,'') IS NOT NULL OR nullif(b.baitaplms,'') IS NOT NULL
  OR EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_CA_LOP" c WHERE c.mabuoi=b.madinhdanh AND (coalesce((to_jsonb(c)->>'codiemdanh')::boolean,false) OR coalesce((to_jsonb(c)->>'conhanxet')::boolean,false) OR to_jsonb(c)->>'magiaoviendaythay' IS NOT NULL OR nullif(to_jsonb(c)->>'giovaohienthi','') IS NOT NULL OR nullif(to_jsonb(c)->>'hoclieugiaovien','') IS NOT NULL OR nullif(to_jsonb(c)->>'hoclieuhocsinh','') IS NOT NULL OR nullif(to_jsonb(c)->>'baitaplms','') IS NOT NULL))
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
 IF EXISTS(SELECT 1 FROM demo_class_term_plan p WHERE (SELECT count(*) FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
  WHERE c.madanhmuc='CLASS_DURATION' AND m.ma=p.months::text)<>1 OR NOT EXISTS(
  SELECT 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
  WHERE c.madanhmuc='CLASS_DURATION' AND m.ma=p.months::text AND m.danghoatdong
 )) THEN RAISE EXCEPTION 'Thời hạn cần dùng bị trùng hoặc đang ngừng hoạt động trong danh mục'; END IF;

-- Untouched demo projections are only scheduled slots, not attendance/history.
DELETE FROM vuihoc."CHI_TIET_CA_LOP" c USING vuihoc."BUOI_HOC" b,demo_class_term_plan p
WHERE c.mabuoi=b.madinhdanh AND b.malop=p.madinhdanh AND b.ngayhoc>p.end_date;
DELETE FROM vuihoc."BUOI_HOC" b USING demo_class_term_plan p
WHERE b.malop=p.madinhdanh AND b.ngayhoc>p.end_date;
IF normalized THEN
 UPDATE vuihoc."LOP_HOC" l SET madanhmucthoihan=m.madanhmuc,mathoihan=m.madinhdanh,ngayketthuctuychinh=NULL
 FROM demo_class_term_plan p JOIN vuihoc."MUC_DANH_MUC" m ON m.ma=p.months::text
 JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc AND c.madanhmuc='CLASS_DURATION'
 WHERE l.madinhdanh=p.madinhdanh;
ELSE
 UPDATE vuihoc."LOP_HOC" l SET thoihanthang=p.months,ngayketthuc=p.end_date
 FROM demo_class_term_plan p WHERE l.madinhdanh=p.madinhdanh;
END IF;
DROP VIEW demo_class_term_source;

END $demo_terms$;

-- Review the exact resulting dates, including pre-existing terms left intact.
SELECT r->>'madinhdanh' AS madinhdanh,r->>'malophoc' AS malophoc,r->>'tenlophoc' AS tenlophoc,
 (r->>'ngaybatdau')::date AS ngaybatdau,(r->>'thoihanthang')::integer AS thoihanthang,(r->>'ngayketthuc')::date AS ngayketthuc
FROM vuihoc."LOP_HOC" l CROSS JOIN LATERAL (SELECT vuihoc.du_lieu_quan_he('LOP_HOC',to_jsonb(l)) AS r) q
WHERE l.madinhdanh IN (SELECT 'DEMO-LOP-'||lpad(i::text,3,'0') FROM generate_series(1,12) i)
ORDER BY ngayketthuc,madinhdanh;
COMMIT;
