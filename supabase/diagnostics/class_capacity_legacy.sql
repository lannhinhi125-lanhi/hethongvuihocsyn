-- Read only, compatible before/after 20261123. No names or contact information.
SELECT l.madinhdanh AS malop,l.mamohinh,
 to_jsonb(l)->>'sisotoida' AS sisolopcu,m.sisotoida AS sisomohinh,
 cardinality(vuihoc.hoc_sinh_lop(l.madinhdanh)) AS sisohientai,
 CASE WHEN m.mamohinh IS NULL THEN 'MISSING_MODEL'
  WHEN m.sisotoida<=0 OR m.sisotoida<>trunc(m.sisotoida) THEN 'INVALID_MODEL_CAPACITY'
  WHEN to_jsonb(l) ? 'sisotoida' AND (to_jsonb(l)->>'sisotoida')::numeric IS DISTINCT FROM m.sisotoida THEN 'LEGACY_CAPACITY_DIFFERS'
  ELSE 'CLASS_OVER_CAPACITY' END AS lydo
FROM vuihoc."LOP_HOC" l LEFT JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=l.mamohinh
WHERE m.mamohinh IS NULL OR m.sisotoida<=0 OR m.sisotoida<>trunc(m.sisotoida)
 OR (to_jsonb(l) ? 'sisotoida' AND (to_jsonb(l)->>'sisotoida')::numeric IS DISTINCT FROM m.sisotoida)
 OR cardinality(vuihoc.hoc_sinh_lop(l.madinhdanh))>m.sisotoida
ORDER BY l.madinhdanh;
