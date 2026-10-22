-- Read-only before/after 20261201. Retired criterion tables are not recreated.
WITH RECURSIVE ancestry(root,node,parent,path,cycle) AS (
 SELECT madinhdanh,madinhdanh,madanhmuccha,ARRAY[madinhdanh],false FROM vuihoc."DANH_MUC_BO_SUNG"
 UNION ALL
 SELECT a.root,p.madinhdanh,p.madanhmuccha,a.path||p.madinhdanh,p.madinhdanh=ANY(a.path)
 FROM ancestry a JOIN vuihoc."DANH_MUC_BO_SUNG" p ON p.madinhdanh=a.parent WHERE NOT a.cycle
), findings AS (
 SELECT 'RETIRED_TABLE_PRESENT' AS loai,name AS ma,'Bảng tiêu chí cũ còn tồn tại; kiểm tra trạng thái nâng cấp, không tự xóa.' AS lydo
 FROM unnest(ARRAY['NHOM_TIEU_CHI','TIEU_CHI','LUA_CHON_TIEU_CHI','TIEU_CHI_NHAN_XET']) name WHERE to_regclass(format('vuihoc.%I',name)) IS NOT NULL
 UNION ALL SELECT 'CATALOG_FIELDS',madinhdanh,'Mã định danh, mã nghiệp vụ và tên danh mục phải có giá trị.'
 FROM vuihoc."DANH_MUC_BO_SUNG" WHERE btrim(madinhdanh)='' OR btrim(madanhmuc)='' OR btrim(tendanhmuc)=''
 UNION ALL SELECT 'CATALOG_CODE',string_agg(madinhdanh,', ' ORDER BY madinhdanh),'Mã danh mục trùng khi bỏ khoảng trắng đầu/cuối và không phân biệt hoa thường.'
 FROM vuihoc."DANH_MUC_BO_SUNG" GROUP BY upper(btrim(madanhmuc)) HAVING count(*)>1
 UNION ALL SELECT 'ENTRY_FIELDS',madanhmuc||'/'||madinhdanh,'Mục cần có định danh, mã, tên và thứ tự dương.'
 FROM vuihoc."MUC_DANH_MUC" WHERE btrim(madinhdanh)='' OR btrim(ma)='' OR btrim(ten)='' OR thutu<=0
 UNION ALL SELECT 'ENTRY_CODE',madanhmuc||': '||string_agg(madinhdanh,', ' ORDER BY madinhdanh),'Mã mục trùng trong cùng danh mục khi bỏ khoảng trắng đầu/cuối và không phân biệt hoa thường.'
 FROM vuihoc."MUC_DANH_MUC" GROUP BY madanhmuc,upper(btrim(ma)) HAVING count(*)>1
 UNION ALL SELECT DISTINCT 'CATALOG_CYCLE',root,'Quan hệ danh mục cha tạo vòng lặp.' FROM ancestry WHERE cycle
) SELECT * FROM findings ORDER BY loai,ma;
