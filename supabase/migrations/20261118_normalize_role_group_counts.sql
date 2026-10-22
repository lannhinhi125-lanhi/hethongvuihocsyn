-- Phase 3. Apply after 20261117. Run this entire statement.
DO $normalize_role_group_counts$
DECLARE f text;
BEGIN
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc'
  AND table_name='GIAO_VIEN' AND column_name='socaranh') THEN
  RAISE EXCEPTION 'Chạy bản 20261117 trước khi chuẩn hóa số tài khoản nhóm quyền.';
 END IF;

 CREATE OR REPLACE FUNCTION vuihoc.nhom_quyen_truy_van(p_row jsonb) RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
  SELECT p_row||jsonb_build_object(
   'danhsachquyen',vuihoc.quyen_nhom(p_row->>'madinhdanh'),
   'soluongnguoidung',(SELECT count(*) FROM vuihoc."NGUOI_DUNG" u WHERE u.manhomquyen=p_row->>'madinhdanh'))
 $read$;

 f:=pg_get_functiondef('public.vuihoc_session(text)'::regprocedure);
 IF strpos(f,'nhom_quyen_truy_van')=0 THEN
  RAISE EXCEPTION 'Phiên tài khoản chưa đọc nhóm quyền qua truy vấn quan hệ; chưa xóa cột.';
 END IF;
 f:=pg_get_functiondef('public.vuihoc_save_accounts(text,jsonb)'::regprocedure);
 IF strpos(f,'role_group_count_readonly')=0 THEN
  IF strpos(f,$old$IF tab NOT IN ('users','role_groups')$old$)=0 THEN
   RAISE EXCEPTION 'Không nhận diện được RPC tài khoản; giao dịch đã hoàn tác.';
  END IF;
  f:=replace(f,$old$IF tab NOT IN ('users','role_groups')$old$,$new$-- role_group_count_readonly
 IF tab='role_groups' THEN
  IF jsonb_typeof(b)='object' THEN b:=b-'soluongnguoidung'; END IF;
  IF v ? 'soluongnguoidung' THEN
   RAISE EXCEPTION 'Số tài khoản được đếm từ NGUOI_DUNG, không ghi vào nhóm quyền';
  END IF;
 END IF;
 IF tab NOT IN ('users','role_groups')$new$);
 END IF;
 f:=replace(f,$old$'mota','soluongnguoidung','danhsachquyen'$old$,$new$'mota','danhsachquyen'$new$);
 f:=replace(f,'mota,soluongnguoidung,macdinh','mota,macdinh');
 f:=replace(f,'gr.mota,coalesce(gr.soluongnguoidung,0),gr.macdinh','gr.mota,gr.macdinh');
 IF strpos(f,'gr.soluongnguoidung')>0 THEN
  RAISE EXCEPTION 'Chưa chuyển được câu ghi nhóm quyền; chưa xóa cột.';
 END IF;
 EXECUTE f;

 ALTER TABLE vuihoc."NHOM_QUYEN" DROP COLUMN IF EXISTS soluongnguoidung;
 REVOKE ALL ON FUNCTION vuihoc.nhom_quyen_truy_van(jsonb) FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_role_group_counts$;
