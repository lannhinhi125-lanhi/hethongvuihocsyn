-- Read-only preflight; supports before and after migration 20261121.
-- Returns only record IDs; no student names or contact details.
SELECT h.madinhdanh AS mahocsinh,'DANG_KY_CU_CHUA_KHOP' AS can_doi_soat
FROM vuihoc."HOC_SINH" h
WHERE to_jsonb(h) ? 'mamonhoc' AND NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(vuihoc.dang_ky_mon_truy_van(h.madinhdanh)) d
 WHERE (to_jsonb(h)->>'mamonhoc',to_jsonb(h)->>'mamohinh',to_jsonb(h)->>'matrinhdo')
 IS NOT DISTINCT FROM (d->>'subject',d->>'model',d->>'level')
 AND (nullif(to_jsonb(h)->>'malophientai','') IS NULL OR to_jsonb(h)->>'malophientai'=d->>'currentClassCode' OR EXISTS(
  SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" t JOIN vuihoc."LOP_HOC" prev ON prev.madinhdanh=t.malopcu
  WHERE t.mahocsinh=h.madinhdanh AND t.mamonhoc=d->>'subject' AND t.malopmoi IS NULL
   AND prev.malophoc=to_jsonb(h)->>'malophientai' AND prev.trangthai IN ('TAM_DUNG','DA_KET_THUC')))
 AND (to_jsonb(h)->>'trangthai'=d->>'status'
  OR (to_jsonb(h)->>'trangthai'='CHO_XEP_LOP' AND nullif(to_jsonb(h)->>'malophientai','') IS NULL AND d->>'status'='DANG_HOC' AND EXISTS(
   SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" t JOIN vuihoc."LOP_HOC" assigned ON assigned.madinhdanh=t.malopmoi
   WHERE t.mahocsinh=h.madinhdanh AND t.mamonhoc=d->>'subject' AND t.malopcu IS NULL AND assigned.malophoc=d->>'currentClassCode'))
  OR (to_jsonb(h)->>'trangthai'='DANG_HOC' AND d->>'status'='CHO_XEP_LOP' AND EXISTS(
  SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" t JOIN vuihoc."LOP_HOC" prev ON prev.madinhdanh=t.malopcu
  WHERE t.mahocsinh=h.madinhdanh AND t.mamonhoc=d->>'subject' AND t.malopmoi IS NULL
   AND prev.trangthai IN ('TAM_DUNG','DA_KET_THUC')))))
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
