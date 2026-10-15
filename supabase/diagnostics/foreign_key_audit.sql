-- Read-only: each row should report OK after the foreign-key migration.
WITH expected(bang,cot,bang_tham_chieu) AS (VALUES
 ('HOC_SINH','malophientai','LOP_HOC'),
 ('LICH_DANG_KY_HOC_SINH','mahocsinh','HOC_SINH'),
 ('LICH_DANG_KY_HOC_SINH','makhunggio','KHUNG_GIO'),
 ('LICH_LOP','malop','LOP_HOC'),('LICH_LOP','makhunggio','KHUNG_GIO'),
 ('NHOM_QUYEN_CHI_TIET','manhom','NHOM_QUYEN'),('NHOM_QUYEN_CHI_TIET','maquyen','QUYEN'),
 ('HOC_SINH','macaphoc,makhoi','LUA_CHON_CAP_HOC'),('LOP_HOC','macaphoc,makhoi','LUA_CHON_CAP_HOC'),
 ('SU_CO_BUOI_HOC','manhomsuco,masuco','LOAI_SU_CO'),
 ('PHAN_CONG_DAY_THAY','mabuoi,malop','BUOI_HOC'),('CHI_TIET_CA_LOP','mabuoi,malop','BUOI_HOC')
), actual AS (
 SELECT t.relname bang,
  (SELECT string_agg(a.attname,',' ORDER BY k.ordinality)
   FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality)
   JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum) cot,
  parent.relname bang_tham_chieu,
  c.conname,c.convalidated,pg_get_constraintdef(c.oid) dinh_nghia
 FROM pg_constraint c
 JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 JOIN pg_class parent ON parent.oid=c.confrelid
 WHERE n.nspname='vuihoc' AND c.contype='f'
)
SELECT e.*,CASE WHEN bool_or(a.convalidated) THEN 'OK' ELSE 'THIEU_KHOA_NGOAI' END trangthai,
 string_agg(DISTINCT a.dinh_nghia,'; ') dinh_nghia
FROM expected e LEFT JOIN actual a USING(bang,cot,bang_tham_chieu)
GROUP BY e.bang,e.cot,e.bang_tham_chieu ORDER BY e.bang,e.cot;
