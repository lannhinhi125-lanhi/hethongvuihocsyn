-- After 20261205. Run the whole atomic statement. No new storage table or JSON column.
DO $normalize_lesson_clocks$
DECLARE r record; f text; cols text; pending text; owner_name text;
BEGIN
 LOCK TABLE vuihoc."KHUNG_GIO",vuihoc."BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regclass('vuihoc."V_GIAO_VIEN_KHOI"') IS NULL THEN RAISE EXCEPTION 'Chạy migration 20261205 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name='batdau') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(b.madinhdanh,', ' ORDER BY b.madinhdanh) INTO pending
 FROM vuihoc."BUOI_HOC" b LEFT JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
 WHERE k.madinhdanh IS NULL OR (b.batdau,b.ketthuc) IS DISTINCT FROM (k.giobatdau,k.gioketthuc);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Giờ buổi học chưa khớp khung giờ nguồn; chưa xóa cột nào.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/lesson_clock_source_review.sql. Đối soát từng buổi; không tự ghi đè giờ hoặc đổi mã để vượt kiểm tra.'; END IF;

 CREATE FUNCTION vuihoc.gio_bat_dau_khung(p_id text) RETURNS time LANGUAGE sql STABLE STRICT SET search_path=pg_catalog AS $start$
 SELECT giobatdau FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=p_id
 $start$;
 CREATE FUNCTION vuihoc.gio_ket_thuc_khung(p_id text) RETURNS time LANGUAGE sql STABLE STRICT SET search_path=pg_catalog AS $end$
 SELECT gioketthuc FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=p_id
 $end$;
 SELECT string_agg(format('b.%I',column_name),',' ORDER BY ordinal_position) INTO cols FROM information_schema.columns
 WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name NOT IN ('batdau','ketthuc');
 EXECUTE 'CREATE VIEW vuihoc."V_BUOI_HOC" WITH(security_invoker=true) AS SELECT '||cols||',k.giobatdau::time(0) AS batdau,k.gioketthuc::time(0) AS ketthuc FROM vuihoc."BUOI_HOC" b JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio';

 -- Rewrite the existing readers, record variables, trigger clocks and generator writes.
 -- DML continues to target the physical BUOI_HOC, with the slot FK as its only clock input.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND (p.prosrc LIKE '%"BUOI_HOC"%'
 OR EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgfoid=p.oid AND t.tgrelid='vuihoc."BUOI_HOC"'::regclass)) LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,'vuihoc."BUOI_HOC".','"V_BUOI_HOC".');
  f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."BUOI_HOC"','\1 vuihoc."V_BUOI_HOC"','gi');
  f:=regexp_replace(f,'(\m[a-z_][a-z0-9_]*\s+)vuihoc\."BUOI_HOC"([,;])','\1vuihoc."V_BUOI_HOC"\2','gi');
  f:=regexp_replace(f,'([a-z_][a-z0-9_]*|"V_BUOI_HOC")\.batdau\M','vuihoc.gio_bat_dau_khung(\1.makhunggio)','gi');
  f:=regexp_replace(f,'([a-z_][a-z0-9_]*|"V_BUOI_HOC")\.ketthuc\M','vuihoc.gio_ket_thuc_khung(\1.makhunggio)','gi');
  -- Known INSERT shapes are checked against live definitions by regression tests.
  f:=replace(f,'makhunggio,batdau,ketthuc,','makhunggio,');
  f:=replace(f,'s.makhunggio,k.giobatdau,k.gioketthuc,','s.makhunggio,');
  f:=replace(f,'slot.madinhdanh,slot.giobatdau,slot.gioketthuc,','slot.madinhdanh,');
  f:=replace(f,'slot.madinhdanh,hours[1]::time,hours[2]::time,','slot.madinhdanh,');
  f:=replace(f,'slot.madinhdanh,times[1]::time,times[2]::time,','slot.madinhdanh,');
  f:=replace(f,'slot,hours[1]::time,hours[2]::time,','slot,');
  f:=regexp_replace(f,'\mngayhoc\s*\+\s*batdau\M','ngayhoc+vuihoc.gio_bat_dau_khung(makhunggio)','g');
  EXECUTE f;
 END LOOP;
 FOR r IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='vuihoc' AND c.relkind='v' AND c.relname<>'V_BUOI_HOC' LOOP
  f:=pg_get_viewdef(r.oid,true);
  IF f LIKE '%"BUOI_HOC"%' THEN
   f:=replace(f,'vuihoc."BUOI_HOC".','"V_BUOI_HOC".');
   f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."BUOI_HOC"','\1 vuihoc."V_BUOI_HOC"','gi');
   EXECUTE format('CREATE OR REPLACE VIEW vuihoc.%I WITH(security_invoker=true) AS %s',r.relname,f);
  END IF;
 END LOOP;

 -- Generic datasets select their physical table dynamically; project slot clocks before delegation.
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 IF strpos(f,'BEGIN')=0 THEN RAISE EXCEPTION 'Không nhận diện được bộ đọc buổi học.'; END IF;
 f:=replace(f,'BEGIN',$projection$BEGIN
  IF p_table='BUOI_HOC' AND p_row IS NOT NULL THEN
   p_row:=p_row||jsonb_build_object('batdau',vuihoc.gio_bat_dau_khung(p_row->>'makhunggio'),'ketthuc',vuihoc.gio_ket_thuc_khung(p_row->>'makhunggio'));
  END IF;
$projection$);EXECUTE f;

 -- The dataset contract includes read aliases. Keep both clocks in reads but exclude them from DML.
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'conf:=vuihoc.business_config()->ds;')=0 OR strpos(f,'FROM jsonb_object_keys(v) k WHERE')=0 THEN RAISE EXCEPTION 'Không nhận diện được bộ ghi buổi học.'; END IF;
 f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE NOT (ds=''dated_lessons'' AND k IN (''batdau'',''ketthuc'')) AND');
 f:=replace(f,'conf:=vuihoc.business_config()->ds;',$guard$conf:=vuihoc.business_config()->ds;
 IF ds='dated_lessons' THEN
  b:=b-'batdau'-'ketthuc';
  IF v ?| ARRAY['batdau','ketthuc'] THEN RAISE EXCEPTION 'Giờ buổi học là dữ liệu truy vấn từ khung giờ; chỉ ghi mã khung giờ.'; END IF;
 END IF;$guard$);EXECUTE f;

 -- Protect one source of truth: a referenced slot cannot silently move historical lesson clocks.
 CREATE FUNCTION vuihoc.bao_ve_gio_khung_da_dung() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $protect$
 BEGIN
  IF (NEW.giobatdau,NEW.gioketthuc) IS DISTINCT FROM (OLD.giobatdau,OLD.gioketthuc)
   AND EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE makhunggio=OLD.madinhdanh) THEN
   RAISE EXCEPTION 'Khung giờ đã có buổi học sử dụng; tạo khung giờ mới để đổi lịch, không sửa giờ lịch sử.';
  END IF;RETURN NEW;
 END $protect$;
 CREATE TRIGGER bao_ve_gio_khung_da_dung BEFORE UPDATE OF giobatdau,gioketthuc ON vuihoc."KHUNG_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.bao_ve_gio_khung_da_dung();
 CREATE FUNCTION vuihoc.khoa_nguon_gio_buoi() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $lock$
 BEGIN
  IF TG_OP='UPDATE' AND NEW.makhunggio IS DISTINCT FROM OLD.makhunggio AND
   (OLD.vaolopluc IS NOT NULL OR OLD.ketthucluc IS NOT NULL OR OLD.ngayhoc<(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date
    OR EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=OLD.madinhdanh)
    OR EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" WHERE kycong=to_char(OLD.ngayhoc,'YYYY-MM') AND dakhoa)) THEN
   RAISE EXCEPTION 'Không đổi khung giờ của buổi lịch sử, đã sử dụng hoặc thuộc kỳ công khóa.';
  END IF;
  PERFORM 1 FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=NEW.makhunggio FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Khung giờ nguồn không tồn tại.'; END IF;RETURN NEW;
 END $lock$;
 CREATE TRIGGER khoa_nguon_gio_buoi BEFORE INSERT OR UPDATE OF makhunggio ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.khoa_nguon_gio_buoi();
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."BUOI_HOC"'::regclass AND contype='c' AND pg_get_constraintdef(oid) ~ '\m(batdau|ketthuc)\M' LOOP
  EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" DROP CONSTRAINT %I',r.conname);
 END LOOP;
 SELECT string_agg(p.oid::regprocedure::text,', ') INTO pending FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc ~ '\.(batdau|ketthuc)\M'
 AND (p.prosrc LIKE '%"BUOI_HOC"%' OR EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgfoid=p.oid AND t.tgrelid='vuihoc."BUOI_HOC"'::regclass));
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Còn hàm dùng giờ buổi cũ; chưa xóa cột.' USING DETAIL=pending; END IF;
 ALTER TABLE vuihoc."BUOI_HOC" DROP COLUMN batdau,DROP COLUMN ketthuc;
 SELECT pg_get_userbyid(proowner) INTO owner_name FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF owner_name IS NULL OR owner_name IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOR r IN SELECT signature FROM unnest(ARRAY['gio_bat_dau_khung(text)','gio_ket_thuc_khung(text)','bao_ve_gio_khung_da_dung()','khoa_nguon_gio_buoi()']) signature LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',r.signature,owner_name);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_BUOI_HOC" OWNER TO %I',owner_name);
 REVOKE ALL ON vuihoc."V_BUOI_HOC" FROM PUBLIC,anon,authenticated;GRANT SELECT ON vuihoc."V_BUOI_HOC" TO service_role;
 NOTIFY pgrst,'reload schema';
END $normalize_lesson_clocks$;
