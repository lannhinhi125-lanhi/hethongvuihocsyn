-- Requires normalized enrollments (20261121 or later). No history is deleted.
BEGIN;
DO $guard$
DECLARE f text;
BEGIN
 IF to_regclass('vuihoc."XEP_LOP_DANG_KY"') IS NULL THEN
  RAISE EXCEPTION 'Cần cập nhật đăng ký môn chuẩn hóa trước khi dùng gỡ học sinh.';
 END IF;
 f:=pg_get_functiondef('vuihoc.giu_xep_lop_dang_hoat_dong()'::regprocedure);
 IF strpos(f,'vuihoc.detach_assignment')=0 THEN
  IF strpos(f,'BEGIN')=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm bảo vệ xếp lớp.'; END IF;
  f:=replace(f,'BEGIN',$body$BEGIN
  -- Only the authenticated, permission-checked RPC grants this single deletion.
  IF TG_OP='DELETE' AND current_setting('vuihoc.detach_assignment',true)=jsonb_build_array(OLD.mahocsinh,OLD.mamonhoc,OLD.malop)::text THEN RETURN OLD; END IF;
  $body$);
  EXECUTE f;
 END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.vuihoc_remove_class_student(p_token text,p_class_id text,p_student_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $rpc$
DECLARE actor vuihoc."NGUOI_DUNG"; cls vuihoc."LOP_HOC"; capacity numeric;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT vuihoc.business_can(actor.madinhdanh,'PH4','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)') THEN
  RAISE EXCEPTION 'Bạn không có quyền gỡ học sinh khỏi lớp.';
 END IF;
 SELECT * INTO cls FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_class_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lớp học không còn tồn tại. Hãy tải lại dữ liệu.'; END IF;
 SELECT sisotoida INTO capacity FROM vuihoc."MO_HINH_LOP" WHERE mamohinh=cls.mamohinh FOR SHARE;
 IF capacity IS NULL OR capacity<=1 THEN RAISE EXCEPTION 'Chỉ gỡ riêng học sinh khỏi lớp nhóm 1-n.'; END IF;
 IF cls.trangthai IN ('TAM_DUNG','DA_KET_THUC') THEN RAISE EXCEPTION 'Lớp đã dừng hoặc kết thúc. Hãy tải lại dữ liệu.'; END IF;
 PERFORM 1 FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=p_student_id AND mamonhoc=cls.mamonhoc FOR UPDATE;
 PERFORM 1 FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh=p_student_id AND mamonhoc=cls.mamonhoc AND malop=p_class_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Học sinh không còn thuộc lớp này. Hãy tải lại dữ liệu.'; END IF;
 SET CONSTRAINTS ALL DEFERRED;
 PERFORM set_config('vuihoc.actor',actor.madinhdanh,true);
 PERFORM set_config('vuihoc.detach_assignment',jsonb_build_array(p_student_id,cls.mamonhoc,p_class_id)::text,true);
 DELETE FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh=p_student_id AND mamonhoc=cls.mamonhoc AND malop=p_class_id;
 PERFORM set_config('vuihoc.detach_assignment','',true);
 UPDATE vuihoc."DANG_KY_MON_HOC" SET trangthai='CHO_XEP_LOP' WHERE mahocsinh=p_student_id AND mamonhoc=cls.mamonhoc;
 RETURN jsonb_build_object('saved',true,'data',public.vuihoc_business_data(p_token));
END $rpc$;
REVOKE ALL ON FUNCTION public.vuihoc_remove_class_student(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_remove_class_student(text,text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
