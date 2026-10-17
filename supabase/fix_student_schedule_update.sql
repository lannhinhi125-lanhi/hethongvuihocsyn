-- Run in SQL Editor. Repairs execution privileges in the student-save chain.
-- No business rows/columns are changed, no JSON storage or new tables are added.
-- Browser roles retain no direct access to the private schema/tables.
BEGIN;
DO $repair$
DECLARE trusted_owner name; fn record; rpc regprocedure; body text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc
 WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Owner RPC đăng nhập không phải owner quản trị phù hợp. Chạy diagnostics/student_schedule_permissions.sql để kiểm tra.';
 END IF;
 IF NOT has_schema_privilege(trusted_owner,'vuihoc','USAGE')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."HOC_SINH"','UPDATE')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."DANG_KY_MON_HOC"','UPDATE')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."LICH_DANG_KY_MON_HOC"','INSERT')
  OR NOT has_table_privilege(trusted_owner,'vuihoc."LICH_DANG_KY_MON_HOC"','DELETE') THEN
  RAISE EXCEPTION 'Owner RPC đăng nhập chưa đủ quyền lưu hồ sơ/lịch theo môn. Cần kiểm tra kết quả chẩn đoán.';
 END IF;
 FOREACH rpc IN ARRAY ARRAY[to_regprocedure('public.vuihoc_business_data(text)'),to_regprocedure('public.vuihoc_save_business(text,jsonb)')] LOOP
  IF rpc IS NULL THEN RAISE EXCEPTION 'Thiếu RPC nghiệp vụ hiện tại.'; END IF;
  SELECT prosrc INTO body FROM pg_proc WHERE oid=rpc;
  IF strpos(body,'vuihoc.nguoi_dung_phien')=0 THEN RAISE EXCEPTION 'RPC % chưa có kiểm tra phiên đăng nhập dự kiến; chưa thay quyền.',rpc; END IF;
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',rpc,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',rpc);
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog',rpc);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',rpc);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated',rpc);
 END LOOP;
 -- A helper with an incorrectly privileged SECURITY DEFINER owner can fail
 -- only on schedule edits while unrelated personal edits continue to work.
 FOR fn IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vuihoc' AND p.prokind='f'
  AND p.proname=ANY(ARRAY['tach_lich','nhan_lich','anh_xa_khoi','hoc_sinh_lop','khoi_lop',
   'dang_ky_mon_truy_van','truong_lien_ket_truy_van','ghi_truong_lien_ket',
   'ghi_thay_doi_quan_he','ghi_chi_tiet_danh_muc','ghi_cac_truong_con','ghi_du_lieu_quan_he',
   'ghi_du_lieu_quan_he_truoc_dang_ky_mon','ghi_du_lieu_quan_he_truoc_khoa_ngoai','ghi_du_lieu_quan_he_truoc_bo_json',
   'du_lieu_quan_he','du_lieu_quan_he_truoc_dung_lop','du_lieu_quan_he_truoc_dang_ky_mon',
   'du_lieu_quan_he_truoc_khoa_ngoai','du_lieu_quan_he_truoc_bo_json','du_lieu_quan_he_truoc_truy_vet',
   'du_lieu_quan_he_truoc_loai_tai_lieu','du_lieu_quan_he_truoc_du_gio',
   'kiem_tra_sua_ho_so','kiem_tra_sua_ho_so_truoc_dung_lop','kiem_tra_bo_ca_hoc_sinh',
   'kiem_tra_dang_ky_mon','kiem_tra_dang_ky_mon_trigger','ghi_truy_vet_dang_ky_mon',
   'thong_ke_ca_giao_vien','ca_giao_vien_con_lop']) LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',fn.signature,trusted_owner);
  EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog',fn.signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
  IF fn.proname='kiem_tra_dang_ky_mon_trigger' THEN
   EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',fn.signature);
  END IF;
 END LOOP;
END $repair$;
NOTIFY pgrst,'reload schema';
COMMIT;
