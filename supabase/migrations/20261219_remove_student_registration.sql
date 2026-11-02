-- Requires normalized enrollments and 20261213 profile-only student support.
-- Remove one mistaken subject registration without deleting the student profile.
BEGIN;
CREATE OR REPLACE FUNCTION public.vuihoc_remove_student_registration(p_token text,p_student_id text,p_subject text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $rpc$
DECLARE actor vuihoc."NGUOI_DUNG";
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT vuihoc.business_can(actor.madinhdanh,'PH4','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy') THEN
  RAISE EXCEPTION 'Bạn không có quyền xóa đăng ký môn.';
 END IF;
 -- Lock the parent enrollment so concurrent assignment cannot pass its FK check.
 PERFORM 1 FROM vuihoc."DANG_KY_MON_HOC"
 WHERE mahocsinh=p_student_id AND mamonhoc=p_subject FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Đăng ký môn không còn tồn tại. Hãy tải lại dữ liệu.'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh=p_student_id AND mamonhoc=p_subject) THEN
  RAISE EXCEPTION 'Môn này đã có lớp. Hãy xử lý lớp của môn này trước khi xóa đăng ký.';
 END IF;
 PERFORM set_config('vuihoc.actor',actor.madinhdanh,true);
 DELETE FROM vuihoc."DANG_KY_MON_HOC" WHERE mahocsinh=p_student_id AND mamonhoc=p_subject;
 RETURN jsonb_build_object('saved',true,'data',public.vuihoc_business_data(p_token));
END $rpc$;
REVOKE ALL ON FUNCTION public.vuihoc_remove_student_registration(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_remove_student_registration(text,text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
