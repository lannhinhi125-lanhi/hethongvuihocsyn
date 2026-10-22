-- Read-only preflight; supports before and after migration 20261121.
-- Returns only record IDs; no student names or contact details.
SELECT h.madinhdanh AS mahocsinh,'DANG_KY_CU_CHUA_KHOP' AS can_doi_soat
FROM vuihoc."HOC_SINH" h
WHERE to_jsonb(h) ? 'mamonhoc' AND NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(vuihoc.dang_ky_mon_truy_van(h.madinhdanh)) d
 WHERE (to_jsonb(h)->>'mamonhoc',to_jsonb(h)->>'mamohinh',to_jsonb(h)->>'matrinhdo',to_jsonb(h)->>'trangthai',nullif(to_jsonb(h)->>'malophientai',''))
 IS NOT DISTINCT FROM (d->>'subject',d->>'model',d->>'level',d->>'status',nullif(d->>'currentClassCode','')))
UNION ALL
SELECT d.mahocsinh,'KHOI_NHAP_HOC_CHUA_RO_CAP'
FROM vuihoc."DANG_KY_MON_HOC" d WHERE d.khoidangky IS NOT NULL
 AND to_jsonb(d)->>'macaphocdangky' IS NULL
 AND (SELECT count(*) FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.madinhdanh=d.khoidangky)<>1
UNION ALL
SELECT h.mahocsinh,'KHOI_LICH_SU_CHUA_RO_CAP'
FROM vuihoc."LICH_SU_DANG_KY_HOC" h WHERE h.khoi IS NOT NULL AND to_jsonb(h)->>'macaphoc' IS NULL
 AND (SELECT count(*) FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.madinhdanh=h.khoi)<>1
UNION ALL
SELECT h.mahocsinh,'TRANG_THAI_LICH_SU_CAN_DOI_SOAT'
FROM vuihoc."LICH_SU_DANG_KY_HOC" h WHERE to_jsonb(h) ? 'trangthai' AND to_jsonb(h)->>'trangthai' IS DISTINCT FROM 'DA_THOI_HOC'
ORDER BY mahocsinh,can_doi_soat;
