-- Read only. Run before 20261127; returns only records requiring reconciliation.
WITH source AS (
 SELECT to_jsonb(e) AS e,to_jsonb(b) AS b,l.malophoc,l.mamohinh,g.manguoidung,c.sobuoi
 FROM vuihoc."BIEN_BAN_DU_GIO" e
 LEFT JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=e.mabuoi
 LEFT JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh)
 LEFT JOIN vuihoc."CHI_TIET_CA_LOP" c ON c.mabuoi=b.madinhdanh
), checks AS (
 SELECT e->>'madinhdanh' AS madinhdanh,array_remove(ARRAY[
 CASE WHEN b IS NULL THEN 'mabuoi: thiếu buổi học nguồn' END,
 CASE WHEN e ? 'magiaovien' AND e->>'magiaovien' IS DISTINCT FROM coalesce(b->>'magiaoviendaythay',b->>'magiaovienchinh') THEN 'magiaovien: khác giáo viên thực dạy' END,
 CASE WHEN e ? 'malophoc' AND e->>'malophoc' IS DISTINCT FROM malophoc THEN 'malophoc: khác lớp nguồn' END,
 CASE WHEN nullif(e->>'ngaycahoc','') IS NOT NULL AND e->>'ngaycahoc' IS DISTINCT FROM b->>'ngayhoc' THEN 'ngaycahoc: khác ngày học' END,
 CASE WHEN nullif(e->>'macahoc','') IS NOT NULL AND e->>'macahoc' IS DISTINCT FROM b->>'madinhdanh' THEN 'macahoc: khác mã buổi' END,
 CASE WHEN nullif(e->>'manguoinhan','') IS NOT NULL AND e->>'manguoinhan' IS DISTINCT FROM manguoidung THEN 'manguoinhan: khác tài khoản giáo viên' END,
 CASE WHEN e ? 'sobuoi' AND (e->>'sobuoi')::integer IS DISTINCT FROM sobuoi THEN 'sobuoi: thiếu/khác chi tiết ca nguồn' END,
 CASE WHEN e ? 'tenbuoihoc' AND coalesce(e->>'tenbuoihoc','') IS DISTINCT FROM coalesce(b->>'tieude','') THEN 'tenbuoihoc: khác tiêu đề buổi học' END,
 CASE WHEN e ? 'khunggio' AND regexp_replace(e->>'khunggio','\s','','g') IS DISTINCT FROM to_char((b->>'batdau')::time,'HH24:MI')||'-'||to_char((b->>'ketthuc')::time,'HH24:MI') THEN 'khunggio: khác giờ thực tế' END,
 CASE WHEN e ? 'mohinh' AND e->>'mohinh' IS DISTINCT FROM mamohinh THEN 'mohinh: khác mô hình lớp' END,
 CASE WHEN e ? 'lienketphonghoc' AND coalesce(e->>'lienketphonghoc','') IS DISTINCT FROM coalesce(b->>'lienketphonghoc','') THEN 'lienketphonghoc: khác buổi học' END,
 CASE WHEN e ? 'lienketbanghi' AND coalesce(e->>'lienketbanghi','') IS DISTINCT FROM coalesce(b->>'lienketbanghi','') THEN 'lienketbanghi: khác buổi học' END,
 CASE WHEN e ? 'diemtong' AND (e->>'diemtong')::numeric IS DISTINCT FROM round(((e->>'diemtc1')::numeric+2*(e->>'diemtc2')::numeric+(e->>'diemtc3')::numeric)/4,2) THEN 'diemtong: khác công thức hiện hành' END
 ,CASE WHEN e ? 'xeploai' AND e->>'xeploai' IS DISTINCT FROM CASE WHEN (e->>'diemtong')::numeric>=9 THEN 'Xuất sắc' WHEN (e->>'diemtong')::numeric>=8 THEN 'Tốt' WHEN (e->>'diemtong')::numeric>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END THEN 'xeploai: khác quy tắc hiện hành' END
 ],NULL) AS lydo FROM source
) SELECT * FROM checks WHERE cardinality(lydo)>0 ORDER BY madinhdanh;
