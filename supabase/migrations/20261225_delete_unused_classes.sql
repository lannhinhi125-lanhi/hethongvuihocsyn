-- Run as postgres after the normalized class-management migrations.
-- Installing this file does not delete any business records.
BEGIN;

-- Protect every deletion path, including the older generic save RPC.
CREATE OR REPLACE FUNCTION vuihoc.chan_xoa_lop_co_buoi_hoc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE malop=OLD.madinhdanh) THEN
  RAISE EXCEPTION 'Lớp đã phát sinh buổi học nên không thể xóa vĩnh viễn. Bạn có thể dừng hẳn lớp.';
 END IF;
 RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS chan_xoa_lop_co_buoi_hoc ON vuihoc."LOP_HOC";
CREATE TRIGGER chan_xoa_lop_co_buoi_hoc BEFORE DELETE ON vuihoc."LOP_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.chan_xoa_lop_co_buoi_hoc();

CREATE OR REPLACE FUNCTION public.vuihoc_delete_unused_class(p_token text,p_class_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor vuihoc."NGUOI_DUNG"; cls vuihoc."LOP_HOC";
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT vuihoc.business_can(actor.madinhdanh,'PH4','Tạo, sửa, xóa lớp và cập nhật link phòng học') THEN
  RAISE EXCEPTION 'Bạn không có quyền xóa lớp.';
 END IF;
 -- Conflicts with FK key-share locks from concurrent lesson/assignment inserts.
 SELECT * INTO cls FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_class_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lớp học không còn tồn tại. Hãy tải lại dữ liệu.'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE malop=p_class_id) THEN
  RAISE EXCEPTION 'Lớp đã phát sinh buổi học nên không thể xóa vĩnh viễn. Bạn có thể dừng hẳn lớp.';
 END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP"
  WHERE (malopcu=p_class_id AND malopmoi IS NOT NULL)
     OR (malopmoi=p_class_id AND malopcu IS NOT NULL)) THEN
  RAISE EXCEPTION 'Lớp có lịch sử chuyển học sinh với lớp khác. Hãy dừng hẳn lớp để giữ lịch sử.';
 END IF;
 SET CONSTRAINTS ALL DEFERRED;
 PERFORM set_config('vuihoc.actor',actor.madinhdanh,true);
 -- Reuse the existing stop triggers to release students and teacher availability.
 -- The transaction rolls back these changes if any FK or later step rejects deletion.
 UPDATE vuihoc."LOP_HOC" SET trangthai='TAM_DUNG',tamdunglich=false WHERE madinhdanh=p_class_id;
 DELETE FROM vuihoc."TRUY_VET_XEP_LOP" WHERE malopcu=p_class_id OR malopmoi=p_class_id;
 DELETE FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_class_id;
 RETURN jsonb_build_object('saved',true,'data',public.vuihoc_business_data(p_token));
END $$;

-- Follow the deployment's trusted RPC owner rather than assuming a role name.
DO $$
DECLARE trusted_owner name;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc
 WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Không xác định được owner quản trị của RPC đăng nhập.';
 END IF;
 EXECUTE format('ALTER FUNCTION public.vuihoc_delete_unused_class(text,text) OWNER TO %I',trusted_owner);
 EXECUTE format('ALTER FUNCTION vuihoc.chan_xoa_lop_co_buoi_hoc() OWNER TO %I',trusted_owner);
END $$;
REVOKE ALL ON FUNCTION vuihoc.chan_xoa_lop_co_buoi_hoc() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_delete_unused_class(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_delete_unused_class(text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
