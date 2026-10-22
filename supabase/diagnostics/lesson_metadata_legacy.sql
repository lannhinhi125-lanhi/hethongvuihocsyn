-- Read-only; outputs lesson IDs/reason codes, no names, materials or credentials.
WITH old_details AS (
 SELECT c.mabuoi,to_jsonb(c) AS old,b.* FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
), checks AS (
 SELECT mabuoi,array_remove(ARRAY[
  CASE WHEN old ? 'malop' AND old->>'malop' IS DISTINCT FROM malop THEN 'LOP_KHONG_KHOP' END,
  CASE WHEN nullif(old->>'tieude','') IS NOT NULL AND nullif(tieude,'') IS NOT NULL AND old->>'tieude'<>tieude THEN 'TIEU_DE_KHAC_NHAU' END,
  CASE WHEN nullif(old->>'hoclieugiaovien','') IS NOT NULL AND nullif(hoclieugiaovien,'') IS NOT NULL AND old->>'hoclieugiaovien'<>hoclieugiaovien THEN 'HOC_LIEU_GV_KHAC_NHAU' END,
  CASE WHEN nullif(old->>'hoclieuhocsinh','') IS NOT NULL AND nullif(hoclieuhocsinh,'') IS NOT NULL AND old->>'hoclieuhocsinh'<>hoclieuhocsinh THEN 'HOC_LIEU_HS_KHAC_NHAU' END,
  CASE WHEN nullif(old->>'baitaplms','') IS NOT NULL AND nullif(baitaplms,'') IS NOT NULL AND old->>'baitaplms'<>baitaplms THEN 'BAI_TAP_KHAC_NHAU' END,
  CASE WHEN old->>'magiaoviendaythay' IS NOT NULL AND old->>'magiaoviendaythay' IS DISTINCT FROM magiaoviendaythay AND NOT(old->>'magiaoviendaythay' IS NOT DISTINCT FROM magiaovienchinh AND magiaoviendaythay IS NULL) THEN 'DAY_THAY_KHONG_KHOP' END,
  CASE WHEN nullif(old->>'giovaohienthi','') IS NOT NULL AND vaolopluc IS NULL THEN 'THIEU_THOI_DIEM_VAO_LOP' END,
  CASE WHEN nullif(old->>'hotennguoivao','') IS NOT NULL AND vaolopluc IS NOT NULL AND manguoivaolop IS NULL THEN 'THIEU_MA_NGUOI_VAO_LOP' END
 ],NULL) AS can_doi_soat FROM old_details
 UNION ALL
 SELECT mabuoi,ARRAY['NHIEU_CHI_TIET_CUNG_BUOI'] FROM vuihoc."CHI_TIET_CA_LOP" GROUP BY mabuoi HAVING count(*)>1
 UNION ALL
 SELECT p.mabuoi,ARRAY['PHAN_CONG_KHONG_KHOP_BUOI'] FROM vuihoc."PHAN_CONG_DAY_THAY" p JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=p.mabuoi
 WHERE p.malop<>b.malop OR (p.magiaovien IS DISTINCT FROM b.magiaoviendaythay AND NOT(p.magiaovien IS NOT DISTINCT FROM b.magiaovienchinh AND b.magiaoviendaythay IS NULL))
)
SELECT * FROM checks WHERE cardinality(can_doi_soat)>0 ORDER BY mabuoi;
