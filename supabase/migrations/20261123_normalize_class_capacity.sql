-- Apply after 20261122. Run this entire atomic statement.
-- Capacity belongs to the model; the current application has no per-class override.
DO $normalize_class_capacity$
DECLARE f text; pending text; r record; trusted_owner name;
BEGIN
 LOCK TABLE vuihoc."MO_HINH_LOP",vuihoc."LOP_HOC",vuihoc."XEP_LOP_DANG_KY" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CHI_TIET_CA_LOP' AND column_name='malop') THEN
  RAISE EXCEPTION 'Chạy bản 20261122 trước.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='sisotoida') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(l.madinhdanh,', ' ORDER BY l.madinhdanh) INTO pending
 FROM vuihoc."LOP_HOC" l LEFT JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=l.mamohinh
 WHERE m.mamohinh IS NULL OR l.sisotoida IS DISTINCT FROM m.sisotoida;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Sĩ số tối đa của lớp chưa khớp mô hình; chưa xóa cột.'
  USING DETAIL=pending,HINT='Chạy supabase/diagnostics/class_capacity_legacy.sql để đối soát; không tự ghi đè giới hạn riêng.'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."MO_HINH_LOP" WHERE sisotoida IS NULL OR sisotoida<=0 OR sisotoida<>trunc(sisotoida)) THEN
  RAISE EXCEPTION 'Sĩ số mô hình phải là số nguyên dương; chưa xóa cột.';
 END IF;
 ALTER TABLE vuihoc."MO_HINH_LOP" ADD CONSTRAINT mo_hinh_si_so_nguyen_duong CHECK(sisotoida>0 AND sisotoida=trunc(sisotoida));

 CREATE OR REPLACE FUNCTION vuihoc.si_so_mo_hinh(p_model text) RETURNS numeric
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
  SELECT sisotoida FROM vuihoc."MO_HINH_LOP" WHERE mamohinh=p_model
 $read$;
 CREATE OR REPLACE FUNCTION vuihoc.si_so_lop(p_class text) RETURNS numeric
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
  SELECT m.sisotoida FROM vuihoc."LOP_HOC" l JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=l.mamohinh WHERE l.madinhdanh=p_class
 $read$;
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 IF strpos(f,'BEGIN')=0 THEN RAISE EXCEPTION 'Không nhận diện được truy vấn dữ liệu quan hệ.'; END IF;
 f:=replace(f,'BEGIN',$patch$BEGIN
 IF p_table='LOP_HOC' AND p_row IS NOT NULL THEN p_row:=p_row||jsonb_build_object('sisotoida',vuihoc.si_so_lop(p_row->>'madinhdanh')); END IF;
$patch$); EXECUTE f;
 -- Inspection summaries and enrollment checks now query the source model.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='vuihoc' AND p.prokind='f' AND p.prosrc LIKE '%l.sisotoida%' LOOP
  f:=pg_get_functiondef(r.oid); f:=replace(f,'l.sisotoida','vuihoc.si_so_lop(l.madinhdanh)'); EXECUTE f;
 END LOOP;
 -- Retired single-subject validator is no longer called after 20261026.
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgfoid=to_regprocedure('vuihoc.kiem_tra_si_so_tu_hoc_sinh()')) THEN
  RAISE EXCEPTION 'Còn luồng kiểm tra sĩ số học sinh cũ; chưa xóa cột.';
 END IF;
 DROP FUNCTION IF EXISTS vuihoc.kiem_tra_si_so_tu_hoc_sinh();
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,$old$conf:=vuihoc.business_config()->ds;$old$)=0 OR strpos(f,$old$(v->>'sisotoida')::integer$old$)=0 THEN
  RAISE EXCEPTION 'Không nhận diện được hàm ghi lớp học; chưa xóa cột.';
 END IF;
 f:=replace(f,$old$conf:=vuihoc.business_config()->ds;$old$,$new$conf:=vuihoc.business_config()->ds;
 IF ds='classes' THEN
  b:=b-'sisotoida';
  IF v ? 'sisotoida' THEN RAISE EXCEPTION 'Sĩ số lớp là dữ liệu truy vấn từ mô hình, không ghi vào lớp.'; END IF;
 END IF;$new$);
 f:=replace(f,$old$(v->>'sisotoida')::integer$old$,$new$vuihoc.si_so_mo_hinh(coalesce(v->>'mamohinh',oldrow->>'mamohinh'))$new$); EXECUTE f;
 -- Keep sisotoida in the read contract. The explicit guard above rejects writes;
 -- the generic writer already excludes columns absent from the physical table.

 -- Serialize assignment/class-model changes with edits to the model capacity.
 -- FOR SHARE conflicts with an UPDATE of the model, including non-key fields.
 CREATE OR REPLACE FUNCTION vuihoc.khoa_mo_hinh_si_so() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 BEGIN
  IF TG_TABLE_NAME='LOP_HOC' THEN
   PERFORM 1 FROM vuihoc."MO_HINH_LOP" WHERE mamohinh=NEW.mamohinh FOR SHARE;
  ELSE
   PERFORM 1 FROM vuihoc."MO_HINH_LOP" m JOIN vuihoc."LOP_HOC" l ON l.mamohinh=m.mamohinh WHERE l.madinhdanh=NEW.malop FOR SHARE OF m;
  END IF;
  RETURN NEW;
 END $guard$;
 CREATE TRIGGER khoa_mo_hinh_si_so BEFORE INSERT OR UPDATE OF malop ON vuihoc."XEP_LOP_DANG_KY" FOR EACH ROW EXECUTE FUNCTION vuihoc.khoa_mo_hinh_si_so();
 CREATE TRIGGER khoa_mo_hinh_si_so BEFORE INSERT OR UPDATE OF mamohinh ON vuihoc."LOP_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.khoa_mo_hinh_si_so();
 CREATE CONSTRAINT TRIGGER kiem_tra_si_so_mo_hinh AFTER UPDATE ON vuihoc."MO_HINH_LOP"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
 ALTER TABLE vuihoc."LOP_HOC" DROP COLUMN sisotoida;
 PERFORM vuihoc.kiem_tra_dang_ky_mon();
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp để cài hàm nội bộ.'; END IF;
 FOREACH f IN ARRAY ARRAY['si_so_mo_hinh(text)','si_so_lop(text)','khoa_mo_hinh_si_so()'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);
  EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 NOTIFY pgrst,'reload schema';
END $normalize_class_capacity$;
