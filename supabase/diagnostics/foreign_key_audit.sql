-- Read-only: each row should report OK after the foreign-key migration.
WITH candidates(bang,cot,bang_tham_chieu) AS (VALUES
 ('MAU_BAO_CAO','manguoidung','NGUOI_DUNG'),('CHI_SO_MAU_BAO_CAO','mamau','MAU_BAO_CAO'),('BO_LOC_MAU_BAO_CAO','mamau','MAU_BAO_CAO'),
 ('NHAN_XET_BUOI_HOC','mabuoi','BUOI_HOC'),('NHAN_XET_BUOI_HOC','mahocsinh','HOC_SINH'),('NHAN_XET_BUOI_HOC','manguoicapnhat','NGUOI_DUNG'),
 ('DANH_MUC_BO_SUNG','madanhmuccha','DANH_MUC_BO_SUNG'),('MUC_DANH_MUC','madanhmuc','DANH_MUC_BO_SUNG'),
 ('CONG_DAY_BUOI_HOC','mabuoi','BUOI_HOC'),('CONG_DAY_BUOI_HOC','magiaovien','GIAO_VIEN'),
 ('DOI_SOAT_CONG_GIAO_VIEN','kycong','BANG_CONG_THANG'),('DOI_SOAT_CONG_GIAO_VIEN','magiaovien','GIAO_VIEN'),
 ('LINK_MINH_CHUNG_CONG','magiaitrinh','GIAI_TRINH_CONG_DAY'),
 ('GIAI_TRINH_CONG_DAY','macong','CONG_DAY_BUOI_HOC'),
 ('GIAI_TRINH_CONG_DAY','manguoigui','NGUOI_DUNG'),('GIAI_TRINH_CONG_DAY','manguoiduyet','NGUOI_DUNG'),
 ('BIEN_BAN_DU_GIO','mabuoi','BUOI_HOC'),('BIEN_BAN_DU_GIO','mabuoi','CHI_TIET_CA_LOP'),
 ('BIEN_BAN_DU_GIO','manguoidanhgia','NGUOI_DUNG'),
 ('HOC_SINH','malophientai','LOP_HOC'),
 ('LICH_DANG_KY_HOC_SINH','mahocsinh','HOC_SINH'),
 ('LICH_DANG_KY_HOC_SINH','makhunggio','KHUNG_GIO'),
 ('LICH_LOP','malop','LOP_HOC'),('LICH_LOP','makhunggio','KHUNG_GIO'),
 ('BUOI_HOC','makhunggio','KHUNG_GIO'),('LICH_RANH_DINH_KY','makhunggio','KHUNG_GIO'),
 ('PHIEN_BAN_LICH_RANH','magiaovien','GIAO_VIEN'),('PHIEN_BAN_LICH_RANH','manguoicapnhat','NGUOI_DUNG'),
 ('CHI_TIET_PHIEN_BAN_LICH_RANH','maphienban','PHIEN_BAN_LICH_RANH'),('CHI_TIET_PHIEN_BAN_LICH_RANH','makhunggio','KHUNG_GIO'),
 ('BUOI_HOC','malop,mahoclieu','HOC_LIEU_LOP'),('HOC_LIEU_LOP','malop','LOP_HOC'),
 ('LICH_DANG_KY_MON_HOC','makhunggio','KHUNG_GIO'),('LICH_SU_CA_DANG_KY_HOC','makhunggio','KHUNG_GIO'),
 ('LOP_HOC','mamohinh','MO_HINH_LOP'),
 ('LOP_HOC','madanhmucthoihan,mathoihan','MUC_DANH_MUC'),
 ('NHOM_QUYEN_CHI_TIET','manhom','NHOM_QUYEN'),('NHOM_QUYEN_CHI_TIET','maquyen','QUYEN'),
 ('HOC_SINH','macaphoc,makhoi','LUA_CHON_CAP_HOC'),('LOP_HOC','macaphoc,makhoi','LUA_CHON_CAP_HOC'),
 ('SU_CO_BUOI_HOC','manhomsuco,masuco','LOAI_SU_CO'),
 ('PHAN_CONG_DAY_THAY','mabuoi,malop','BUOI_HOC'),('CHI_TIET_CA_LOP','mabuoi,malop','BUOI_HOC'),
 ('CHI_TIET_CA_LOP','mabuoi','BUOI_HOC'),('BUOI_HOC','magiaoviendaythay','GIAO_VIEN'),
 ('DANG_KY_MON_HOC','mahocsinh','HOC_SINH'),('DANG_KY_MON_HOC','mamonhoc','MON_HOC'),
 ('XEP_LOP_DANG_KY','mahocsinh,mamonhoc','DANG_KY_MON_HOC'),('XEP_LOP_DANG_KY','malop,mamonhoc','LOP_HOC'),
 ('DANG_KY_MON_HOC','macaphocdangky,khoidangky','LUA_CHON_CAP_HOC'),('LICH_SU_DANG_KY_HOC','macaphoc,khoi','LUA_CHON_CAP_HOC')
), expected AS (
 -- Retired tables/columns are not missing FKs. Views use their source table FKs.
 SELECT e.* FROM candidates e JOIN pg_class t ON t.oid=to_regclass(format('vuihoc.%I',e.bang)) AND t.relkind IN ('r','p')
 WHERE (e.bang<>'BIEN_BAN_DU_GIO' OR e.bang_tham_chieu<>'CHI_TIET_CA_LOP' OR to_regclass('vuihoc."V_BIEN_BAN_DU_GIO"') IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM unnest(string_to_array(e.cot,',')) col WHERE NOT EXISTS(
  SELECT 1 FROM pg_attribute a WHERE a.attrelid=t.oid AND a.attname=col AND a.attnum>0 AND NOT a.attisdropped))
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
