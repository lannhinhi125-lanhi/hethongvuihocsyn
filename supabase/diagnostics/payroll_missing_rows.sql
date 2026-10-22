-- Chỉ đọc: liệt kê 7 ca và 2 giải trình đang chỉ có trong JSONB.
WITH sessions AS (
  SELECT m.kycong, t.value->>'teacherId' AS magiaovien,
    s.value->>'id' AS maca, s.value->>'lessonId' AS mabuoi_json,
    s.value->>'classCode' AS malophoc,
    coalesce(s.value->>'date', s.value->>'dateStr') AS ngay_json,
    s.value->>'time' AS khunggio,
    s.value->>'creditCoeff' AS hesocong_json
  FROM vuihoc."BANG_CONG_THANG" m
  CROSS JOIN LATERAL jsonb_array_elements(m.danhsachgiaovien) t
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(t.value->'sessions','[]'::jsonb)) s
), missing_sessions AS (
  SELECT s.* FROM sessions s
  WHERE NOT EXISTS (
    SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c
    WHERE c.kycong=s.kycong AND c.magiaovien=s.magiaovien
      AND c.mabuoi=coalesce(s.mabuoi_json,s.maca)
  )
)
SELECT 'CA' AS loai, s.kycong, s.magiaovien, s.maca AS madinhdanh,
  coalesce(s.mabuoi_json,s.maca) AS mabuoi_du_kien,
  s.malophoc, s.ngay_json, s.khunggio, s.hesocong_json,
  b.madinhdanh AS mabuoi_tim_duoc,
  c.magiaovien AS giaovien_da_co_cong
FROM missing_sessions s
LEFT JOIN LATERAL (
  SELECT b2.madinhdanh
  FROM vuihoc."BUOI_HOC" b2
  JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b2.malop
  JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b2.makhunggio
  WHERE b2.madinhdanh=coalesce(s.mabuoi_json,s.maca)
     OR (l.malophoc=s.malophoc
       AND b2.ngayhoc=CASE
         WHEN left(s.ngay_json,10) ~ '^\d{4}-\d{2}-\d{2}$'
           THEN left(s.ngay_json,10)::date
         ELSE to_date(left(s.ngay_json,10),'DD/MM/YYYY') END
       AND to_char(b2.batdau,'HH24:MI')||'-'||to_char(b2.ketthuc,'HH24:MI')=
           regexp_replace(coalesce(s.khunggio,''),'\s','','g'))
  ORDER BY CASE WHEN b2.madinhdanh=coalesce(s.mabuoi_json,s.maca) THEN 0 ELSE 1 END
  LIMIT 1
) b ON true
LEFT JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.mabuoi=b.madinhdanh
UNION ALL
SELECT 'GIAI_TRINH' AS loai, m.kycong,
  d.value->>'teacherId' AS magiaovien, d.value->>'id' AS madinhdanh,
  d.value->>'sessionId' AS mabuoi_du_kien,
  d.value->>'classCode' AS malophoc,
  d.value->>'sessionTime' AS ngay_json,
  NULL AS khunggio, NULL AS hesocong_json,
  c.mabuoi AS mabuoi_tim_duoc,
  c.magiaovien AS giaovien_da_co_cong
FROM vuihoc."BANG_CONG_THANG" m
CROSS JOIN LATERAL jsonb_array_elements(m.danhsachgiaitrinh) d
LEFT JOIN vuihoc."CONG_DAY_BUOI_HOC" c
  ON c.mabuoi=d.value->>'sessionId' AND c.magiaovien=d.value->>'teacherId'
WHERE NOT EXISTS (
  SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" g
  WHERE g.madinhdanh=d.value->>'id'
)
ORDER BY loai, magiaovien, madinhdanh;
