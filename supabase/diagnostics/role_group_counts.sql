-- Read-only: the group count is a query result, not a stored NHOM_QUYEN column.
-- COUNT(user ID), rather than COUNT(*), preserves zero for empty groups.
SELECT g.madinhdanh,g.tennhomquyen,count(u.madinhdanh) AS soluongnguoidung
FROM vuihoc."NHOM_QUYEN" g
LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.manhomquyen=g.madinhdanh
GROUP BY g.madinhdanh,g.tennhomquyen
ORDER BY g.madinhdanh;
