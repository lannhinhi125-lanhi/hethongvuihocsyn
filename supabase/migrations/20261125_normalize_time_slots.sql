-- Apply after 20261124. Run this entire atomic statement.
DO $normalize_time_slots$
DECLARE f text; pending text; r record; conf jsonb; states jsonb; trusted_owner name;
BEGIN
 LOCK TABLE vuihoc."KHUNG_GIO",vuihoc."LICH_LOP",vuihoc."BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='thoihanthang') THEN RAISE EXCEPTION 'Chạy bản 20261124 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='KHUNG_GIO' AND column_name='sophut') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 CREATE OR REPLACE FUNCTION vuihoc.so_phut_khoang_gio(p_start time,p_end time) RETURNS integer
 LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $minutes$
  SELECT (extract(epoch FROM (p_end-p_start+CASE WHEN p_end<p_start THEN interval '1 day' ELSE interval '0' END))/60)::integer
 $minutes$;
 CREATE OR REPLACE FUNCTION vuihoc.khoang_gio_hien_thi(p_start time,p_end time) RETURNS text
 LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $range$
  SELECT to_char(p_start,'HH24:MI')||' - '||to_char(p_end,'HH24:MI')
 $range$;
 SELECT string_agg(k.madinhdanh,', ' ORDER BY k.madinhdanh) INTO pending FROM vuihoc."KHUNG_GIO" k
 WHERE CASE WHEN k.khoanggio ~ '^\s*([01]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([01]?[0-9]|2[0-3]):[0-5][0-9]\s*$' THEN
  split_part(k.khoanggio,'-',1)::time=split_part(k.khoanggio,'-',2)::time
  OR k.sophut IS DISTINCT FROM vuihoc.so_phut_khoang_gio(split_part(k.khoanggio,'-',1)::time,split_part(k.khoanggio,'-',2)::time)
 ELSE true END;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Khoảng giờ hoặc số phút cũ chưa khớp; chưa xóa cột.' USING DETAIL=pending,HINT='Chạy supabase/diagnostics/time_slot_legacy.sql để đối soát.'; END IF;
 SELECT string_agg(ids,', ') INTO pending FROM (
  SELECT string_agg(madinhdanh,', ' ORDER BY madinhdanh) AS ids FROM vuihoc."KHUNG_GIO"
  GROUP BY split_part(khoanggio,'-',1)::time,split_part(khoanggio,'-',2)::time HAVING count(*)>1) q;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Có nhiều mã khung giờ cùng khoảng giờ; cần đối soát liên kết trước.' USING DETAIL=pending; END IF;
 ALTER TABLE vuihoc."KHUNG_GIO" ADD COLUMN giobatdau time,ADD COLUMN gioketthuc time;
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tgname,'state',tgenabled)),'[]') INTO states FROM pg_trigger WHERE tgrelid='vuihoc."KHUNG_GIO"'::regclass AND NOT tgisinternal;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."KHUNG_GIO" DISABLE TRIGGER %I',r.name); END LOOP;
 UPDATE vuihoc."KHUNG_GIO" SET giobatdau=split_part(khoanggio,'-',1)::time,gioketthuc=split_part(khoanggio,'-',2)::time;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."KHUNG_GIO" %s TRIGGER %I',CASE r.state WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.name); END LOOP;
 ALTER TABLE vuihoc."KHUNG_GIO" ALTER COLUMN giobatdau SET NOT NULL,ALTER COLUMN gioketthuc SET NOT NULL,
  ADD CONSTRAINT khung_gio_hop_le CHECK(giobatdau<>gioketthuc AND giobatdau<time '24:00' AND gioketthuc<time '24:00' AND extract(second FROM giobatdau)=0 AND extract(second FROM gioketthuc)=0),
  ADD CONSTRAINT khung_gio_khoang_unique UNIQUE(giobatdau,gioketthuc);
 CREATE OR REPLACE VIEW vuihoc."V_KHUNG_GIO" WITH(security_invoker=true) AS
 SELECT k.madinhdanh,k.makhunggio,k.tenkhunggio,k.danghoatdong,k.ngaytao,k.ngaycapnhat,k.giobatdau,k.gioketthuc,
  vuihoc.khoang_gio_hien_thi(k.giobatdau,k.gioketthuc) AS khoanggio,vuihoc.so_phut_khoang_gio(k.giobatdau,k.gioketthuc) AS sophut FROM vuihoc."KHUNG_GIO" k;
 -- All reads use the nonmaterialized projection. The generic RPC still writes
 -- the physical table and FKs continue to reference its original IDs.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%"KHUNG_GIO"%' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."KHUNG_GIO"','\1 vuihoc."V_KHUNG_GIO"','gi');
  f:=replace(f,'slot vuihoc."KHUNG_GIO"','slot vuihoc."V_KHUNG_GIO"');
  f:=regexp_replace(f,'split_part\(([a-z_]+)\.khoanggio,''-'',1\)::time','\1.giobatdau','g');
  f:=regexp_replace(f,'split_part\(([a-z_]+)\.khoanggio,''-'',2\)::time','\1.gioketthuc','g');
  f:=replace(f,'btrim(split_part(k.khoanggio,''-'',1))::time','k.giobatdau');
  f:=replace(f,'btrim(split_part(k.khoanggio,''-'',2))::time','k.gioketthuc');
  EXECUTE f;
 END LOOP;
 CREATE OR REPLACE FUNCTION vuihoc.khung_gio_truy_van(p_row jsonb) RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
  SELECT p_row||jsonb_build_object('khoanggio',k.khoanggio,'sophut',k.sophut) FROM vuihoc."V_KHUNG_GIO" k WHERE k.madinhdanh=p_row->>'madinhdanh'
 $read$;
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 f:=replace(f,'BEGIN',$patch$BEGIN IF p_table='KHUNG_GIO' AND p_row IS NOT NULL THEN p_row:=vuihoc.khung_gio_truy_van(p_row); END IF;
$patch$); EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'conf:=vuihoc.business_config()->ds;')=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm ghi danh mục.'; END IF;
 f:=replace(f,'conf:=vuihoc.business_config()->ds;',$patch$conf:=vuihoc.business_config()->ds;
 IF ds='time_slots' THEN
  b:=b-'khoanggio'-'sophut';
  IF v ?| ARRAY['khoanggio','sophut'] THEN RAISE EXCEPTION 'Khoảng giờ và số phút là dữ liệu truy vấn; chỉ ghi giờ bắt đầu và kết thúc.'; END IF;
 END IF;$patch$); EXECUTE f;
 conf:=vuihoc.business_config();conf:=jsonb_set(conf,'{time_slots,columns}',conf->'time_slots'->'columns'||'["giobatdau","gioketthuc"]'::jsonb);
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 -- Reports about dated lessons must display actual lesson times, even after
 -- the recurring slot catalog changes. Never rewrite lesson facts/payroll.
 FOREACH f IN ARRAY ARRAY['vuihoc.ca_cong_truy_van(text,text)','vuihoc.giai_trinh_truy_van(text)','vuihoc.du_lieu_quan_he_truoc_bo_json(text,jsonb)','vuihoc.ghi_cong_tu_cac_truong(jsonb)'] LOOP
  f:=pg_get_functiondef(f::regprocedure);
  f:=replace(f,'k.khoanggio','vuihoc.khoang_gio_hien_thi(b.batdau,b.ketthuc)');
  f:=replace(f,'extract(epoch FROM b.ketthuc-b.batdau)/60','vuihoc.so_phut_khoang_gio(b.batdau,b.ketthuc)'); EXECUTE f;
 END LOOP;
 -- Resolve a reported dated lesson by its actual times first. A catalog edit
 -- must not hide the old lesson or silently redirect a report to another time.
 f:=pg_get_functiondef('public.vuihoc_report_lesson_incident(text,text,date,text,text,text)'::regprocedure);
 IF strpos(f,'SELECT * INTO slot FROM vuihoc."V_KHUNG_GIO"')=0 THEN RAISE EXCEPTION 'Không nhận diện được luồng báo sự cố theo giờ.'; END IF;
 f:=replace(f,$old$SELECT * INTO slot FROM vuihoc."V_KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=regexp_replace(p_time_range,'\s','','g') AND danghoatdong LIMIT 1;$old$,$new$
 BEGIN
  SELECT * INTO STRICT lesson FROM vuihoc."BUOI_HOC" b WHERE b.malop=cls.madinhdanh AND b.ngayhoc=p_date
   AND regexp_replace(vuihoc.khoang_gio_hien_thi(b.batdau,b.ketthuc),'\s','','g')=regexp_replace(p_time_range,'\s','','g') FOR UPDATE;
 EXCEPTION WHEN no_data_found THEN lesson:=NULL; WHEN too_many_rows THEN RAISE EXCEPTION 'Ngày giờ chưa xác định duy nhất buổi học.'; END;
 IF lesson.madinhdanh IS NOT NULL THEN SELECT * INTO slot FROM vuihoc."V_KHUNG_GIO" WHERE madinhdanh=lesson.makhunggio;
 ELSE SELECT * INTO slot FROM vuihoc."V_KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=regexp_replace(p_time_range,'\s','','g') AND danghoatdong; END IF;
$new$);
 f:=replace(f,'IF lesson.madinhdanh IS NULL THEN',$new$IF lesson.madinhdanh IS NOT NULL AND regexp_replace(vuihoc.khoang_gio_hien_thi(lesson.batdau,lesson.ketthuc),'\s','','g')<>regexp_replace(p_time_range,'\s','','g') THEN RAISE EXCEPTION 'Dùng giờ thực tế của buổi học để báo sự cố.'; END IF;
 IF lesson.madinhdanh IS NULL THEN$new$);
 IF strpos(f,'INTO STRICT lesson')=0 THEN RAISE EXCEPTION 'Chưa chuyển được luồng báo sự cố.'; END IF; EXECUTE f;
 ALTER TABLE vuihoc."KHUNG_GIO" DROP COLUMN khoanggio,DROP COLUMN sophut;
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOREACH f IN ARRAY ARRAY['so_phut_khoang_gio(time,time)','khoang_gio_hien_thi(time,time)','khung_gio_truy_van(jsonb)'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_KHUNG_GIO" OWNER TO %I',trusted_owner);
 REVOKE ALL ON vuihoc."V_KHUNG_GIO" FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_time_slots$;
