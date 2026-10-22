-- Apply after 20261127. One atomic, repeatable statement; no new storage tables.
DO $normalize_incident_names$
DECLARE f text; old_definition text; pending text; trusted_owner text;
BEGIN
 LOCK TABLE vuihoc."SU_CO_BUOI_HOC",vuihoc."LOAI_SU_CO" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='SU_CO_BUOI_HOC' AND column_name='tensuco') THEN RETURN; END IF;
 IF to_regclass('vuihoc."V_BIEN_BAN_DU_GIO"') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261127 trước.'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(s.madinhdanh,', ' ORDER BY s.madinhdanh) INTO pending
 FROM vuihoc."SU_CO_BUOI_HOC" s LEFT JOIN vuihoc."LOAI_SU_CO" l ON (l.manhom,l.ma)=(s.manhomsuco,s.masuco)
 WHERE l.madinhdanh IS NULL OR s.tensuco IS DISTINCT FROM l.ten;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Tên sự cố cũ chưa khớp danh mục; chưa xóa cột nào.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/incident_name_legacy.sql và xác nhận các tên khác nhau trước khi bỏ cột. Không tự ghi đè lịch sử.'; END IF;

 CREATE VIEW vuihoc."V_SU_CO_BUOI_HOC" WITH(security_invoker=true) AS
 SELECT s.madinhdanh,s.mabuoi,s.manhomsuco,s.masuco,l.ten AS tensuco,s.hesocongapdung,s.muckhancap,
 s.noidung,s.trangthai,s.manguoibao,s.manguoixuly,s.baoluc,s.xulyluc,s.ghichuxuly,s.ngaytao,s.ngaycapnhat,s.dotamdunglop
 FROM vuihoc."SU_CO_BUOI_HOC" s JOIN vuihoc."LOAI_SU_CO" l ON (l.manhom,l.ma)=(s.manhomsuco,s.masuco);

 -- Teacher reporting writes only the scoped catalog FK, never its name.
 f:=pg_get_functiondef('public.vuihoc_report_lesson_incident(text,text,date,text,text,text)'::regprocedure);old_definition:=f;
 f:=replace(f,'(mabuoi,manhomsuco,masuco,tensuco,noidung,manguoibao)','(mabuoi,manhomsuco,masuco,noidung,manguoibao)');
 f:=replace(f,$old$category,p_incident_code,item->>'name',btrim(p_note)$old$,$new$category,p_incident_code,btrim(p_note)$new$);
 -- The legacy RPC receives only a code. Reject ambiguous groups instead of guessing.
 f:=replace(f,$old$SELECT c.madinhdanh,x INTO category,item$old$,$new$BEGIN SELECT c.madinhdanh,x INTO STRICT category,item$new$);
 f:=replace(f,$old$coalesce((x->>'status')::boolean,false) LIMIT 1;$old$,
 $new$coalesce((x->>'status')::boolean,false);
 EXCEPTION WHEN no_data_found THEN category:=NULL; WHEN too_many_rows THEN RAISE EXCEPTION 'Mã sự cố thuộc nhiều nhóm; cần chọn loại bằng đầy đủ nhóm và mã.'; END;$new$);
 IF f=old_definition OR strpos(f,'tensuco')>0 OR strpos(f,'INTO STRICT category,item')=0 THEN RAISE EXCEPTION 'Chưa chuyển được RPC báo sự cố.'; END IF;EXECUTE f;

 -- Automatic pause incidents retain origin and applied credit; only the copied name disappears.
 f:=pg_get_functiondef('vuihoc.dong_bo_su_co_tam_dung(text)'::regprocedure);old_definition:=f;
 f:=replace(f,'(mabuoi,manhomsuco,masuco,tensuco,hesocongapdung','(mabuoi,manhomsuco,masuco,hesocongapdung');
 f:=replace(f,'reason.manhom,reason.ma,reason.ten,reason.hesocong','reason.manhom,reason.ma,reason.hesocong');
 f:=replace(f,$old$SET noidung=coalesce(b.ghichutamdung,''),tensuco=reason.ten WHERE madinhdanh=old_inc.madinhdanh AND (noidung,tensuco) IS DISTINCT FROM (coalesce(b.ghichutamdung,''),reason.ten)$old$,
 $new$SET noidung=coalesce(b.ghichutamdung,'') WHERE madinhdanh=old_inc.madinhdanh AND noidung IS DISTINCT FROM coalesce(b.ghichutamdung,'')$new$);
 IF f=old_definition OR strpos(f,'tensuco')>0 THEN RAISE EXCEPTION 'Chưa chuyển được luồng sự cố tạm dừng.'; END IF;EXECUTE f;

 -- Payroll keeps its actual credit, but reads incident labels through the same JOIN.
 f:=pg_get_functiondef('vuihoc.ca_cong_truy_van(text,text)'::regprocedure);old_definition:=f;
 f:=replace(f,'FROM vuihoc."SU_CO_BUOI_HOC" s','FROM vuihoc."V_SU_CO_BUOI_HOC" s');
 IF f=old_definition THEN RAISE EXCEPTION 'Chưa chuyển được truy vấn công dạy.'; END IF;EXECUTE f;

 ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_ten_su_co;
 CREATE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
 LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $reader$
 DECLARE r jsonb;
 BEGIN
  IF p_table='SU_CO_BUOI_HOC' THEN
   SELECT to_jsonb(s) INTO r FROM vuihoc."V_SU_CO_BUOI_HOC" s WHERE s.madinhdanh=p_row->>'madinhdanh';
   RETURN vuihoc.du_lieu_quan_he_truoc_ten_su_co(p_table,coalesce(r,p_row));
  END IF;
  RETURN vuihoc.du_lieu_quan_he_truoc_ten_su_co(p_table,p_row);
 END $reader$;
 -- Read config retains tensuco for existing screens; writes must use scoped FKs.
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'IF conf IS NULL THEN')=0 THEN RAISE EXCEPTION 'Không nhận diện được RPC ghi nghiệp vụ.'; END IF;
 f:=replace(f,'IF conf IS NULL THEN',$guard$IF ds='lesson_incidents' THEN
  b:=b-'tensuco';
  IF v ? 'tensuco' THEN RAISE EXCEPTION 'Tên sự cố chỉ được truy vấn từ danh mục; ghi nhóm và mã sự cố.'; END IF;
 END IF;
 IF conf IS NULL THEN$guard$);EXECUTE f;

 ALTER TABLE vuihoc."SU_CO_BUOI_HOC" DROP COLUMN tensuco;
 -- No data UPDATE, trigger suspension, new table or CASCADE is needed.
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 EXECUTE format('ALTER VIEW vuihoc."V_SU_CO_BUOI_HOC" OWNER TO %I',trusted_owner);
 REVOKE ALL ON vuihoc."V_SU_CO_BUOI_HOC" FROM PUBLIC,anon,authenticated;
 FOREACH f IN ARRAY ARRAY['du_lieu_quan_he(text,jsonb)','du_lieu_quan_he_truoc_ten_su_co(text,jsonb)'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 NOTIFY pgrst,'reload schema';
END $normalize_incident_names$;
