-- Read-only before/after 20261130. No guessed teacher, role or accounting period.
WITH source AS (
 SELECT c.madinhdanh,c.mabuoi,c.magiaovien,to_jsonb(c) AS old,
 b.ngayhoc,to_char(b.ngayhoc,'YYYY-MM') AS ky_nguon,
 CASE WHEN c.magiaovien=b.magiaoviendaythay THEN 'DAY_THAY' ELSE 'CHINH' END AS vai_tro_nguon,
 b.magiaovienchinh,b.magiaoviendaythay,p.kycong AS ky_ton_tai
 FROM vuihoc."CONG_DAY_BUOI_HOC" c LEFT JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
 LEFT JOIN vuihoc."BANG_CONG_THANG" p ON p.kycong=to_char(b.ngayhoc,'YYYY-MM')
), checks AS (
 SELECT *,array_remove(ARRAY[
 CASE WHEN ngayhoc IS NULL THEN 'Không có buổi học nguồn' END,
 CASE WHEN magiaovien IS DISTINCT FROM magiaovienchinh AND magiaovien IS DISTINCT FROM magiaoviendaythay THEN 'Giáo viên không thuộc phân công của buổi' END,
 CASE WHEN old ? 'kycong' AND old->>'kycong' IS DISTINCT FROM ky_nguon THEN 'Kỳ đang lưu khác tháng của buổi học' END,
 CASE WHEN old ? 'vaitro' AND old->>'vaitro' IS DISTINCT FROM vai_tro_nguon THEN 'Vai trò đang lưu khác phân công của buổi học' END,
 CASE WHEN ky_ton_tai IS NULL THEN 'Chưa có kỳ công tương ứng với tháng buổi học' END
 ],NULL) AS lydo FROM source
) SELECT madinhdanh,mabuoi,magiaovien,old->>'kycong' AS ky_cu,ky_nguon,old->>'vaitro' AS vai_tro_cu,vai_tro_nguon,lydo
FROM checks WHERE cardinality(lydo)>0 ORDER BY madinhdanh;
