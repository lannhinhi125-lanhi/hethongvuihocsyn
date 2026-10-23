-- Read-only after 20261209. Every reviewed row count should be zero.
-- No names, contact details, credentials, record content or stored review tables.
WITH checks(check_id,table_name,review_rows) AS (
 SELECT 'CURRENT_SLOT_DUPLICATE','LICH_DANG_KY_MON_HOC',count(*) FROM (
  SELECT 1 FROM vuihoc."LICH_DANG_KY_MON_HOC" GROUP BY mahocsinh,mamonhoc,thutrongtuan,makhunggio HAVING count(*)>1) x
 UNION ALL SELECT 'CURRENT_SLOT_INVALID','LICH_DANG_KY_MON_HOC',count(*) FROM vuihoc."LICH_DANG_KY_MON_HOC" WHERE thutu<=0 OR thutrongtuan NOT BETWEEN 1 AND 7
 UNION ALL SELECT 'CURRENT_SLOT_ORPHAN','LICH_DANG_KY_MON_HOC',count(*) FROM vuihoc."LICH_DANG_KY_MON_HOC" s WHERE NOT EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" d WHERE (d.mahocsinh,d.mamonhoc)=(s.mahocsinh,s.mamonhoc)) OR NOT EXISTS(SELECT 1 FROM vuihoc."KHUNG_GIO" k WHERE k.madinhdanh=s.makhunggio)
 UNION ALL SELECT 'HISTORICAL_SLOT_DUPLICATE','LICH_SU_CA_DANG_KY_HOC',count(*) FROM (
  SELECT 1 FROM vuihoc."LICH_SU_CA_DANG_KY_HOC" GROUP BY mahocsinh,mamonhoc,dotdangky,thutrongtuan,makhunggio HAVING count(*)>1) x
 UNION ALL SELECT 'HISTORICAL_SLOT_INVALID','LICH_SU_CA_DANG_KY_HOC',count(*) FROM vuihoc."LICH_SU_CA_DANG_KY_HOC" WHERE thutu<=0 OR thutrongtuan NOT BETWEEN 1 AND 7
 UNION ALL SELECT 'HISTORICAL_SLOT_ORPHAN','LICH_SU_CA_DANG_KY_HOC',count(*) FROM vuihoc."LICH_SU_CA_DANG_KY_HOC" s WHERE NOT EXISTS(SELECT 1 FROM vuihoc."LICH_SU_DANG_KY_HOC" h WHERE (h.mahocsinh,h.mamonhoc,h.dotdangky)=(s.mahocsinh,s.mamonhoc,s.dotdangky)) OR NOT EXISTS(SELECT 1 FROM vuihoc."KHUNG_GIO" k WHERE k.madinhdanh=s.makhunggio)
 UNION ALL SELECT 'REGISTRATION_PERIOD_ORDER','LICH_SU_DANG_KY_HOC',count(*) FROM vuihoc."LICH_SU_DANG_KY_HOC" h JOIN vuihoc."DANG_KY_MON_HOC" d USING(mahocsinh,mamonhoc) WHERE h.dotdangky>=d.dotdangky
 UNION ALL SELECT 'ATTENDANCE_ORPHAN','DIEM_DANH_BUOI_HOC',count(*) FROM vuihoc."DIEM_DANH_BUOI_HOC" d WHERE NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=d.mabuoi) OR NOT EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" h WHERE h.madinhdanh=d.mahocsinh)
 UNION ALL SELECT 'ATTENDANCE_DUPLICATE','DIEM_DANH_BUOI_HOC',count(*) FROM (
  SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" GROUP BY mabuoi,mahocsinh HAVING count(*)>1) x
 UNION ALL SELECT 'PERMISSION_LINK_ORPHAN','NHOM_QUYEN_CHI_TIET',count(*) FROM vuihoc."NHOM_QUYEN_CHI_TIET" d WHERE NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=d.manhom) OR NOT EXISTS(SELECT 1 FROM vuihoc."QUYEN" p WHERE p.maquyen=d.maquyen)
 UNION ALL SELECT 'PERMISSION_LINK_DUPLICATE','NHOM_QUYEN_CHI_TIET',count(*) FROM (
  SELECT 1 FROM vuihoc."NHOM_QUYEN_CHI_TIET" GROUP BY manhom,maquyen HAVING count(*)>1) x
 UNION ALL SELECT 'PERMISSION_SOURCE_EMPTY','QUYEN',count(*) FROM vuihoc."QUYEN" WHERE btrim(maquyen)='' OR btrim(tenquyen)=''
 UNION ALL SELECT 'SCOPED_GRADE_ORPHAN','LUA_CHON_CAP_HOC',count(*) FROM vuihoc."LUA_CHON_CAP_HOC" c WHERE NOT EXISTS(SELECT 1 FROM vuihoc."CAP_HOC" p WHERE p.madinhdanh=c.macaphoc) OR (c.macha IS NOT NULL AND NOT EXISTS(SELECT 1 FROM vuihoc."LUA_CHON_CAP_HOC" p WHERE (p.macaphoc,p.madinhdanh)=(c.macaphoc,c.macha)))
 UNION ALL SELECT 'INCIDENT_SOURCE_ORPHAN','LOAI_SU_CO',count(*) FROM vuihoc."LOAI_SU_CO" c WHERE NOT EXISTS(SELECT 1 FROM vuihoc."DANH_MUC_SU_CO" p WHERE p.madinhdanh=c.manhom)
 UNION ALL SELECT 'CATALOG_ENTRY_ORPHAN','MUC_DANH_MUC',count(*) FROM vuihoc."MUC_DANH_MUC" c WHERE NOT EXISTS(SELECT 1 FROM vuihoc."DANH_MUC_BO_SUNG" p WHERE p.madinhdanh=c.madanhmuc)
 UNION ALL SELECT 'UNVALIDATED_CONSTRAINT','*',count(*) FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace WHERE n.nspname='vuihoc' AND NOT k.convalidated
)
SELECT check_id,table_name,review_rows,CASE WHEN review_rows=0 THEN 'OK' ELSE 'CAN_DOI_SOAT' END AS status FROM checks ORDER BY check_id;
