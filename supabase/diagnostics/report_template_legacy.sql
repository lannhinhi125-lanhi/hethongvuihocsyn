-- Read-only before/after 20261202. LIST_TO_SPLIT is informational before migration.
SELECT 'INVALID_TEMPLATE' AS loai,madinhdanh AS mamau,'Tên/nguồn/nhóm, khoảng ngày hoặc kiểu sắp xếp chưa hợp lệ.' AS chitiet
FROM vuihoc."MAU_BAO_CAO" m WHERE btrim(tenmaubaocao)='' OR btrim(nguondulieu)='' OR btrim(nhomtheo)=''
 OR (to_jsonb(m)->>'khoangngay') NOT IN ('month','previous_month','last_30_days','all','custom') OR sapxep NOT IN ('value_desc','label_asc','label_desc') OR nullif(to_jsonb(m)->>'tungay','')::date>nullif(to_jsonb(m)->>'denngay','')::date
UNION ALL SELECT 'INVALID_METRIC',mamau,machiso FROM vuihoc."CHI_SO_MAU_BAO_CAO" WHERE btrim(machiso)='' OR thutu<=0
UNION ALL SELECT 'DUPLICATE_METRIC_ORDER',mamau,thutu::text FROM vuihoc."CHI_SO_MAU_BAO_CAO" GROUP BY mamau,thutu HAVING count(*)>1
UNION ALL SELECT 'INVALID_FILTER',mamau,truong FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE btrim(truong)='' OR btrim(giatri)=''
UNION ALL SELECT 'LIST_TO_SPLIT',mamau,truong||': '||giatri FROM vuihoc."BO_LOC_MAU_BAO_CAO" b
 WHERE left(ltrim(giatri),1)='[' AND NOT (to_jsonb(b) ? 'thutu')
ORDER BY 1,2,3;
