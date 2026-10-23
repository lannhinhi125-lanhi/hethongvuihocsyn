-- After 20261209. Remove only unchanged experimental seed records, never the shared catalog tables.
DO $remove_demo_catalog$
BEGIN
 LOCK TABLE vuihoc."LOP_HOC",vuihoc."DANH_MUC_BO_SUNG",vuihoc."MUC_DANH_MUC" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madinhdanh IN ('CAT-DEMO','CAT-DEMO-CHILD')) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."DANH_MUC_BO_SUNG" WHERE
  (madinhdanh='CAT-DEMO' AND (madanhmuc,tendanhmuc,mota,madanhmuccha) IS DISTINCT FROM ('DEMO','Danh mục thử nghiệm','Dữ liệu mẫu',NULL::text))
  OR (madinhdanh='CAT-DEMO-CHILD' AND (madanhmuc,tendanhmuc,mota,madanhmuccha) IS DISTINCT FROM ('DEMO-CHILD','Danh mục con','Kiểm tra cây danh mục','CAT-DEMO')))
 THEN RAISE EXCEPTION 'Danh mục thử nghiệm đã được chỉnh sửa; chưa xóa dữ liệu nào. Cần đối soát bản ghi CAT-DEMO/CAT-DEMO-CHILD trước.'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madanhmuccha IN ('CAT-DEMO','CAT-DEMO-CHILD') AND madinhdanh<>'CAT-DEMO-CHILD') THEN
  RAISE EXCEPTION 'Có danh mục con ngoài dữ liệu mẫu; chưa xóa dữ liệu nào.';
 END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."MUC_DANH_MUC" WHERE madanhmuc IN ('CAT-DEMO','CAT-DEMO-CHILD') AND
  (madanhmuc,madinhdanh,ma,ten,mota,danghoatdong,thutu) IS DISTINCT FROM ('CAT-DEMO','ENTRY-DEMO','DEMO-01','Mục thử nghiệm','Dùng kiểm tra CRUD danh mục',true,1)) THEN
  RAISE EXCEPTION 'Danh mục thử nghiệm có mục đã chỉnh sửa hoặc mục mới; chưa xóa dữ liệu nào.';
 END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE madanhmucthoihan IN ('CAT-DEMO','CAT-DEMO-CHILD')) THEN
  RAISE EXCEPTION 'Có lớp đang tham chiếu danh mục thử nghiệm; chưa xóa dữ liệu nào.';
 END IF;
 DELETE FROM vuihoc."MUC_DANH_MUC" WHERE madanhmuc='CAT-DEMO' AND madinhdanh='ENTRY-DEMO';
 DELETE FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madinhdanh='CAT-DEMO-CHILD';
 DELETE FROM vuihoc."DANH_MUC_BO_SUNG" WHERE madinhdanh='CAT-DEMO';
 -- No DROP, CASCADE, new tables, column changes or changes to CLASS_DURATION records.
END $remove_demo_catalog$;
