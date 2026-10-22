-- Read-only. No contact values, credentials or role labels are disclosed.
SELECT u.madinhdanh AS mataikhoan,g.madinhdanh AS magiaovien,
 CASE WHEN n.madinhdanh IS NULL THEN 'THIEU_NHOM_QUYEN'
  WHEN g.madinhdanh IS NULL THEN 'MON_CHUA_CO_HO_SO_GIAO_VIEN'
  ELSE 'MON_KHONG_KHOP_HO_SO' END AS can_doi_soat
FROM vuihoc."NGUOI_DUNG" u LEFT JOIN vuihoc."GIAO_VIEN" g ON g.manguoidung=u.madinhdanh
LEFT JOIN vuihoc."NHOM_QUYEN" n ON n.madinhdanh=u.manhomquyen
WHERE n.madinhdanh IS NULL OR (nullif(btrim(to_jsonb(u)->>'mamonhoc'),'') IS NOT NULL
 AND to_jsonb(u)->>'mamonhoc' IS DISTINCT FROM g.mamonhoc)
ORDER BY u.madinhdanh;
