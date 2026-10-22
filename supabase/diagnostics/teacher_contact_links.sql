-- Read-only; supports both before and after migration 20261119.
-- No fuzzy matching, no contact values or passwords in the output.
SELECT g.madinhdanh AS magiaovien,g.manguoidung,
 CASE WHEN u.madinhdanh IS NULL THEN 'THIEU_TAI_KHOAN' ELSE 'THONG_TIN_KHONG_KHOP' END AS can_doi_soat
FROM vuihoc."GIAO_VIEN" g LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung
WHERE u.madinhdanh IS NULL OR (to_jsonb(g) ? 'hoten' AND
 (to_jsonb(g)->>'hoten',to_jsonb(g)->>'tendangnhap',to_jsonb(g)->>'thudientu',to_jsonb(g)->>'sodienthoai')
 IS DISTINCT FROM (u.hoten,u.tendangnhap,u.thudientu,u.sodienthoai))
ORDER BY g.madinhdanh;
