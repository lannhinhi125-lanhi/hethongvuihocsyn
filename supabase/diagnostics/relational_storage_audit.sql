-- Read-only: run in Supabase SQL Editor and export the result as CSV.
-- Inspects the actual database, including extra columns not in the repository.
-- JSON returned by an RPC is not the same as a stored JSON column.
WITH columns AS (
 SELECT c.table_name,c.column_name,c.data_type,c.udt_name
 FROM information_schema.columns c
 JOIN information_schema.tables t USING (table_catalog,table_schema,table_name)
 WHERE c.table_schema='vuihoc' AND t.table_type='BASE TABLE'
), expected(table_name,column_name) AS (
 VALUES ('LOP_HOC','hoclieu'),('LOP_HOC','chitietcahoc'),
 ('LOP_HOC','phancongdaythay'),('BUOI_HOC','hoclieu'),
 ('GIAO_VIEN','diemtieuchi'),('BIEN_BAN_DU_GIO','diemtieuchi')
), relations(table_name) AS (
 VALUES ('NGUOI_DUNG'),('NHOM_QUYEN'),('MON_HOC'),('TRINH_DO'),
 ('KHUNG_GIO'),('MO_HINH_LOP'),('CAP_HOC'),('LUA_CHON_CAP_HOC'),
 ('DANH_MUC_SU_CO'),('LOAI_SU_CO'),('DANH_MUC_BO_SUNG'),('MUC_DANH_MUC'),
 ('GIAO_VIEN'),('GIAO_VIEN_KHOI'),('GIAO_VIEN_MO_HINH'),
 ('LICH_RANH_DINH_KY'),('LICH_RANH_TUAN'),('CHI_TIET_LICH_RANH'),
 ('BIEN_BAN_DU_GIO'),('HOC_SINH'),('LOP_HOC'),('BUOI_HOC'),
 ('DIEM_DANH_BUOI_HOC'),('NHAN_XET_BUOI_HOC'),('TIEU_CHI_NHAN_XET'),
 ('SU_CO_BUOI_HOC'),('NHOM_TIEU_CHI'),('TIEU_CHI'),('LUA_CHON_TIEU_CHI'),
 ('TAI_LIEU_QUY_TRINH'),('CAU_HINH_TRO_LY'),('VAN_PHONG_NHAN_XET'),
 ('CAU_HINH_HE_THONG'),('LUOT_NHAN_XET_AI'),('BANG_CONG_THANG'),
 ('CONG_DAY_BUOI_HOC'),('DOI_SOAT_CONG_GIAO_VIEN'),('GIAI_TRINH_CONG_DAY'),
 ('LINK_MINH_CHUNG_CONG'),('MAU_BAO_CAO'),('CHI_SO_MAU_BAO_CAO'),
 ('BO_LOC_MAU_BAO_CAO'),('TRUY_VET_XEP_LOP')
), findings AS (
 SELECT 'JSON_STORAGE' AS category,c.table_name,c.column_name,c.data_type,
  CASE WHEN e.table_name IS NULL
   THEN 'Unexpected JSON column: check migration state or additional schema.'
   ELSE 'Legacy JSON column: run 20261015_remove_remaining_json.sql after the relational update.' END AS detail
 FROM columns c LEFT JOIN expected e USING(table_name,column_name)
 WHERE c.data_type IN ('json','jsonb') OR c.udt_name IN ('json','jsonb','_json','_jsonb')
 UNION ALL
 SELECT 'ARRAY_STORAGE',table_name,column_name,udt_name,
  'Review multiple values: child rows allow individual keys and constraints.'
 FROM columns WHERE data_type='ARRAY'
 UNION ALL
 SELECT 'DERIVED_OR_DUPLICATED',table_name,column_name,data_type,
  'Review authoritative source; derive display values from source rows where possible.'
 FROM columns WHERE (table_name='NHOM_QUYEN' AND column_name='soluongnguoidung')
  OR (table_name='GIAO_VIEN' AND column_name IN
   ('socaranh','socadaxep','dakinlich','trangthaidanhgia','diemdanhgia','nhanxetdanhgia','diemtieuchi'))
  OR (table_name='HOC_SINH' AND column_name='malophientai' AND EXISTS(
   SELECT 1 FROM columns old_class WHERE old_class.table_name='LOP_HOC' AND old_class.column_name='danhsachmahocsinh'))
 UNION ALL
 SELECT 'TEXT_DATE',table_name,column_name,data_type,
  'Date stored as text: verify format and migrate to date if semantically a date.'
 FROM columns WHERE data_type IN ('text','character varying')
  AND column_name IN ('ngaybatdau','ngayketthuc','ngayketthuctuychinh','ngaycapnhat','ngaytao','ngayhoc','ngaydanhgia')
 UNION ALL
 SELECT 'MISSING_TABLE',r.table_name,NULL,NULL,'Expected after the combined relational update.'
 FROM relations r WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema='vuihoc' AND t.table_name=r.table_name AND t.table_type='BASE TABLE')
 UNION ALL
 SELECT 'UNUSED_UI_PREFERENCES',t.table_name,NULL,NULL,
  'No read/write caller found in current application; do not store transient screen filters here.'
 FROM information_schema.tables t
 WHERE t.table_schema='vuihoc' AND t.table_name='TUY_CHON_NGUOI_DUNG' AND t.table_type='BASE TABLE'
 UNION ALL
 SELECT 'READ_VIEW',v.table_name,NULL,NULL,'SELECT projection; not another stored business dataset.'
 FROM information_schema.views v WHERE v.table_schema='vuihoc'
 UNION ALL
 SELECT 'RLS_DISABLED',c.relname,NULL,NULL,'Business table has row level security disabled.'
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='vuihoc' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
)
SELECT * FROM findings ORDER BY category,table_name,column_name;
