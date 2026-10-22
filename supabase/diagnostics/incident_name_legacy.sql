-- Read only, before/after 20261128. Empty result: no source/name conflict found.
SELECT s.madinhdanh,s.mabuoi,s.manhomsuco,s.masuco,
 to_jsonb(s)->>'tensuco' AS ten_cu,l.ten AS ten_danh_muc,
 CASE WHEN l.madinhdanh IS NULL THEN 'Không có loại sự cố đúng nhóm/mã'
 ELSE 'Tên đang lưu khác tên danh mục; cần xác nhận trước khi bỏ cột' END AS lydo
FROM vuihoc."SU_CO_BUOI_HOC" s
LEFT JOIN vuihoc."LOAI_SU_CO" l ON (l.manhom,l.ma)=(s.manhomsuco,s.masuco)
WHERE l.madinhdanh IS NULL OR (to_jsonb(s) ? 'tensuco' AND to_jsonb(s)->>'tensuco' IS DISTINCT FROM l.ten)
ORDER BY s.madinhdanh;
