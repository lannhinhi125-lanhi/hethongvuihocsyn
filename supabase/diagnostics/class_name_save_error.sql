-- Run the ENTIRE file in Supabase SQL Editor as postgres.
-- Tests the actual class rename RPC as anon and returns its exact error stack.
-- Every temporary session/name change is rolled back. No passwords/tokens returned.
BEGIN;
CREATE TEMP TABLE class_save_diagnostic (
 step text, ok boolean, sqlstate text, error_message text, error_detail text, error_context text
) ON COMMIT DROP;
DO $diagnose$
DECLARE actor_id text; token text; data jsonb; original jsonb; edited jsonb;
 code text; message text; detail text; context text;
BEGIN
 SELECT u.madinhdanh INTO actor_id
 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
 WHERE u.trangthai='active' AND g.congtruycap='ADMIN'
 ORDER BY CASE WHEN EXISTS (SELECT 1 FROM vuihoc."NHOM_QUYEN_CHI_TIET" q
   WHERE q.manhom=g.madinhdanh AND q.maquyen='ALL') THEN 0 ELSE 1 END,u.madinhdanh LIMIT 1;
 IF actor_id IS NULL THEN RAISE EXCEPTION 'Không có tài khoản quản trị hoạt động để kiểm tra.'; END IF;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=encode(extensions.digest(token,'sha256'),'hex'),
  phienhethan=now()+interval '5 minutes' WHERE madinhdanh=actor_id;
 BEGIN
  SET LOCAL ROLE anon;
  data:=public.vuihoc_business_data(token);
  RESET ROLE;
  INSERT INTO class_save_diagnostic VALUES ('read_business_data',true,NULL,NULL,NULL,NULL);
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS code=RETURNED_SQLSTATE,message=MESSAGE_TEXT,detail=PG_EXCEPTION_DETAIL,context=PG_EXCEPTION_CONTEXT;
  RESET ROLE;
  INSERT INTO class_save_diagnostic VALUES ('read_business_data',false,code,message,detail,context);
  RETURN;
 END;
 SELECT value INTO original FROM jsonb_array_elements(data->'classes') LIMIT 1;
 IF original IS NULL THEN
  INSERT INTO class_save_diagnostic VALUES ('rename_class',false,NULL,'Không có lớp trong kết quả đọc.',NULL,NULL);
  RETURN;
 END IF;
 -- These fields are query projections, not writable columns.
 original:=original-'ngaytao'-'tengiaovien'-'thongtindugio'-'inspectionData';
 edited:=jsonb_set(original,'{tenlophoc}',to_jsonb(coalesce(original->>'tenlophoc','')||' [diagnostic]'));
 BEGIN
  SET LOCAL ROLE anon;
  PERFORM public.vuihoc_save_business(token,jsonb_build_array(jsonb_build_object('dataset','classes','before',original,'after',edited)));
  RESET ROLE;
  INSERT INTO class_save_diagnostic VALUES ('rename_class',true,NULL,NULL,NULL,NULL);
  -- Force rollback of the successful rename test, including trigger effects.
  RAISE SQLSTATE 'Z0001' USING MESSAGE='Rollback successful diagnostic write';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN
  RESET ROLE;
  INSERT INTO class_save_diagnostic VALUES ('rename_class',true,NULL,'Đổi tên lớp qua RPC thành công trong kiểm tra; đã hoàn tác.',NULL,NULL);
 WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS code=RETURNED_SQLSTATE,message=MESSAGE_TEXT,detail=PG_EXCEPTION_DETAIL,context=PG_EXCEPTION_CONTEXT;
  RESET ROLE;
  INSERT INTO class_save_diagnostic VALUES ('rename_class',false,code,message,detail,context);
 END;
END $diagnose$;
SELECT * FROM class_save_diagnostic;
ROLLBACK;
