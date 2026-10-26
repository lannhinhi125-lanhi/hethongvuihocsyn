-- Run this entire file as postgres in Supabase SQL Editor, then reload the application.
-- Existing data is retained. Class updates, group student removal, RPC/trigger permissions.
BEGIN;
-- Run on the existing database. Compatible with or without 20261215.
DO $patch$
DECLARE f text; original text := $old$EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;$old$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 -- Existing recovery migrations already update changed physical columns only.
 IF strpos(f,'update_existing_business_rows')>0 THEN RETURN; END IF;
 IF strpos(f,'class_student_changed_columns')=0 THEN
  IF strpos(f,original)=0 THEN RAISE EXCEPTION 'Unsupported vuihoc_save_business definition; no changes applied'; END IF;
  f:=replace(f,original,$new$
   -- class_student_changed_columns: relation writers below still receive the full projection.
   IF ds IN ('classes','students') AND oldrow IS NOT NULL THEN
    SELECT string_agg(format('%I=(jsonb_populate_record(NULL::vuihoc.%I,$1)).%I',e.k,conf->>'table',e.k),',')
     INTO assigns FROM jsonb_each(v) e(k,val)
     JOIN pg_attribute a ON a.attrelid=to_regclass(format('vuihoc.%I',conf->>'table'))
      AND a.attname=e.k AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated=''
     WHERE e.k<>'madinhdanh' AND e.val IS DISTINCT FROM oldrow->e.k;
    IF assigns IS NOT NULL THEN
     EXECUTE format('UPDATE vuihoc.%I SET %s WHERE madinhdanh=$2',conf->>'table',assigns) USING v,id;
    END IF;
   ELSE
    EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;
   END IF;
  $new$);
  EXECUTE f;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';

-- Requires normalized enrollments (20261121 or later). No history is deleted.
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

-- Run as postgres in Supabase SQL Editor. Repairs execution context, not business data.
DO $repair_class_permissions$
DECLARE trusted_owner name; rpc regprocedure; fn record; body text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc
 WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Không xác định được owner quản trị của RPC đăng nhập.';
 END IF;
 IF NOT has_schema_privilege(trusted_owner,'vuihoc','USAGE')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."NGUOI_DUNG"','SELECT')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."LOP_HOC"','UPDATE') THEN
  RAISE EXCEPTION 'Owner RPC đăng nhập chưa đủ quyền truy cập dữ liệu lớp.';
 END IF;
 FOREACH rpc IN ARRAY ARRAY[
  to_regprocedure('public.vuihoc_business_data(text)'),
  to_regprocedure('public.vuihoc_save_business(text,jsonb)'),
  to_regprocedure('public.vuihoc_remove_class_student(text,text,text)')
 ] LOOP
  IF rpc IS NULL THEN CONTINUE; END IF;
  SELECT prosrc INTO body FROM pg_proc WHERE oid=rpc;
  IF strpos(body,'vuihoc.nguoi_dung_phien')=0 THEN
   RAISE EXCEPTION 'RPC % chưa có kiểm tra phiên đăng nhập dự kiến.',rpc;
  END IF;
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',rpc,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',rpc);
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog',rpc);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',rpc);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated',rpc);
 END LOOP;
 -- Deferred checks fire at COMMIT, after the SECURITY DEFINER RPC has returned.
 -- They must retain trusted privileges without exposing private tables to the browser.
 -- Also repair incorrectly owned elevated helpers used only by pause/incident writes.
 FOR fn IN
  SELECT p.oid::regprocedure AS signature FROM pg_proc p
  JOIN pg_namespace pn ON pn.oid=p.pronamespace
  WHERE pn.nspname='vuihoc' AND p.prokind='f' AND (
   EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace cn ON cn.oid=c.relnamespace
    WHERE t.tgfoid=p.oid AND cn.nspname='vuihoc' AND NOT t.tgisinternal
     AND (t.tgdeferrable OR (p.prosecdef AND c.relname IN
      ('LOP_HOC','BUOI_HOC','SU_CO_BUOI_HOC','CONG_DAY_BUOI_HOC','DANG_KY_MON_HOC','XEP_LOP_DANG_KY'))))
   OR (p.prosecdef AND p.proname IN ('dong_bo_su_co_tam_dung','kiem_tra_thoi_han_lop','kiem_tra_dang_ky_mon'))
  )
 LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',fn.signature,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',fn.signature);
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog',fn.signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
 END LOOP;
END $repair_class_permissions$;
NOTIFY pgrst,'reload schema';

COMMIT;
