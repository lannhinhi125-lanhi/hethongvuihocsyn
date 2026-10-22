-- Phase 2. Apply after 20261116; run this whole statement.
-- The existing relational schedule is authoritative; only redundant totals are removed.
DO $normalize_teacher_slot_counts$
DECLARE f text;
BEGIN
 LOCK TABLE vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc'
  AND table_name='GIAO_VIEN' AND column_name='diemtc1') THEN
  RAISE EXCEPTION 'Chạy bản 20261116 chuẩn hóa điểm giáo viên trước.';
 END IF;
 IF to_regprocedure('vuihoc.thong_ke_ca_giao_vien(text)') IS NULL
  OR to_regprocedure('vuihoc.du_lieu_quan_he_truoc_hoc_lai(text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Chưa có truy vấn số ca từ lịch và phân công; chưa xóa cột.';
 END IF;
 -- This reader must calculate counts before its stored counterparts can be removed.
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he_truoc_hoc_lai(text,jsonb)'::regprocedure);
 IF strpos(f,'thong_ke_ca_giao_vien')=0 THEN
  RAISE EXCEPTION 'Nguồn đọc số ca chưa đúng phiên bản; giao dịch đã hoàn tác.';
 END IF;

 f:=pg_get_functiondef('public.vuihoc_create_teacher(text,jsonb)'::regprocedure);
 f:=replace(f,'trangthai,socaranh,socadaxep,dakinlich','trangthai');
 f:=replace(f,$old$'CHO_LOP',0,0,false$old$,$new$'CHO_LOP'$new$);
 IF strpos(f,'socaranh')>0 OR strpos(f,'socadaxep')>0 OR strpos(f,'dakinlich')>0 THEN
  RAISE EXCEPTION 'Chưa chuyển được hàm tạo giáo viên; chưa xóa cột.';
 END IF;
 EXECUTE f;

 -- The three keys remain in the read projection, but are never valid write inputs.
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'teacher_slot_counts_readonly')=0 THEN
  IF strpos(f,'IF conf IS NULL THEN')=0 THEN
   RAISE EXCEPTION 'Không nhận diện được RPC ghi dữ liệu; giao dịch đã hoàn tác.';
  END IF;
  f:=replace(f,'IF conf IS NULL THEN',$guard$-- teacher_slot_counts_readonly
  IF ds='teachers' AND (coalesce(b,'{}'::jsonb)||coalesce(v,'{}'::jsonb)) ?| ARRAY['socaranh','socadaxep','dakinlich'] THEN
   RAISE EXCEPTION 'Số ca và trạng thái kín lịch chỉ được truy vấn từ lịch, không ghi vào hồ sơ giáo viên';
  END IF;
  IF conf IS NULL THEN$guard$);
  EXECUTE f;
 END IF;

 ALTER TABLE vuihoc."GIAO_VIEN"
  DROP COLUMN IF EXISTS socaranh,
  DROP COLUMN IF EXISTS socadaxep,
  DROP COLUMN IF EXISTS dakinlich;
 -- No CASCADE, no schedule updates, no counts stored in another table.
 NOTIFY pgrst,'reload schema';
END $normalize_teacher_slot_counts$;
