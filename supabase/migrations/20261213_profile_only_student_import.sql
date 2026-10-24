-- Permit receiving a student profile before subject enrollment. No new tables/columns.
DO $profile_first$
DECLARE f text; guard text; conf jsonb; r record; found_writer boolean:=false;
BEGIN
 LOCK TABLE vuihoc."HOC_SINH",vuihoc."DANG_KY_MON_HOC" IN SHARE ROW EXCLUSIVE MODE;
 guard:=$old$IF EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" h WHERE NOT EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" d WHERE d.mahocsinh=h.madinhdanh)) THEN RAISE EXCEPTION 'Hồ sơ học sinh cần ít nhất một đăng ký môn.'; END IF;$old$;
 f:=pg_get_functiondef('vuihoc.kiem_tra_dang_ky_mon()'::regprocedure);
 f:=replace(f,guard,'');
 guard:=replace(guard,'vuihoc."HOC_SINH"','vuihoc."V_HOC_SINH"');
 f:=replace(f,guard,'');
 IF strpos(f,'Hồ sơ học sinh cần ít nhất một đăng ký môn.')>0 THEN RAISE EXCEPTION 'Không nhận diện được ràng buộc hồ sơ; chưa thay đổi dữ liệu.'; END IF;
 EXECUTE f;
 -- The existing dispatcher also assumed every profile write contains study data.
 -- Route profile-only writes onward without fabricating a NULL subject registration.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='vuihoc' AND p.prokind='f' AND p.prosrc LIKE '%Môn đăng ký bị trùng%' LOOP
  found_writer:=true;f:=pg_get_functiondef(r.oid);
  IF strpos(f,'profile_first_no_enrollment')=0 THEN
   IF strpos(f,'PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_dang_ky_mon')=0 THEN RAISE EXCEPTION 'Không nhận diện được bộ ghi đăng ký; chưa thay đổi dữ liệu.'; END IF;
   f:=replace(f,'BEGIN',$patch$BEGIN
    -- profile_first_no_enrollment: empty subject input does not erase existing registrations.
    IF p_table='HOC_SINH' AND (NOT(p_row ? 'dangkymonhoc') OR p_row->'dangkymonhoc'='[]'::jsonb) AND nullif(p_row->>'mamonhoc','') IS NULL THEN
     PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_dang_ky_mon(p_table,p_row-'dangkymonhoc',p_backfill);
     RETURN;
    END IF;
   $patch$);EXECUTE f;
  END IF;
 END LOOP;
 IF NOT found_writer THEN RAISE EXCEPTION 'Thiếu bộ ghi đăng ký đã chuẩn hóa; chạy bản 20261121 trước.'; END IF;
 -- Receive the scoped grade key explicitly. The normal writer maps khoi+macaphoc
 -- to the existing (macaphoc,makhoi) FK; do not guess a category by grade label.
 conf:=vuihoc.business_config();
 IF NOT (conf->'students'->'columns' ? 'macaphoc') THEN
  conf:=jsonb_set(conf,'{students,columns}',(conf->'students'->'columns')||'"macaphoc"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
 -- Keep the deferred trigger and every assignment/history/slot/FK validation intact.
 NOTIFY pgrst,'reload schema';
END $profile_first$;
