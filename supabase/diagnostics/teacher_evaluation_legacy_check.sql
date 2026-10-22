-- Read-only preflight for 20261116_normalize_teacher_evaluations.sql.
-- Zero rows means no unmatched legacy teacher summary was found.
-- A row means preserve/reconcile the actual source before removing its columns.
-- Uses to_jsonb only to read optional old columns; no JSON columns are stored.
WITH legacy AS (
 SELECT g.madinhdanh,to_jsonb(g) AS old FROM vuihoc."GIAO_VIEN" g
), unmatched AS (
 SELECT * FROM legacy g WHERE (
  g.old->>'diemtc1' IS NOT NULL OR g.old->>'diemtc2' IS NOT NULL OR g.old->>'diemtc3' IS NOT NULL
  OR nullif(btrim(g.old->>'diemdanhgia'),'') IS NOT NULL
  OR nullif(btrim(g.old->>'nhanxetdanhgia'),'') IS NOT NULL
  OR g.old->>'trangthaidanhgia'='SCORED'
 ) AND NOT EXISTS (
  SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" e WHERE e.magiaovien=g.madinhdanh
  AND (g.old->>'diemtc1' IS NULL OR e.diemtc1=(g.old->>'diemtc1')::numeric)
  AND (g.old->>'diemtc2' IS NULL OR e.diemtc2=(g.old->>'diemtc2')::numeric)
  AND (g.old->>'diemtc3' IS NULL OR e.diemtc3=(g.old->>'diemtc3')::numeric)
  AND (nullif(btrim(g.old->>'diemdanhgia'),'') IS NULL OR CASE
    WHEN btrim(g.old->>'diemdanhgia') ~ '^[0-9]+([.][0-9]+)?$'
    THEN e.diemtong=btrim(g.old->>'diemdanhgia')::numeric ELSE false END)
  AND (nullif(btrim(g.old->>'nhanxetdanhgia'),'') IS NULL OR btrim(e.nhanxetchung)=btrim(g.old->>'nhanxetdanhgia'))
 )
)
SELECT madinhdanh AS magiaovien,old->>'diemtc1' AS diemtc1,old->>'diemtc2' AS diemtc2,old->>'diemtc3' AS diemtc3,
 old->>'diemdanhgia' AS diemdanhgia,old->>'nhanxetdanhgia' AS nhanxetdanhgia,
 'Chưa có biên bản lưu đầy đủ các giá trị cũ này; cần đối soát, không tự tạo biên bản giả.' AS canxuly
FROM unmatched ORDER BY madinhdanh;
