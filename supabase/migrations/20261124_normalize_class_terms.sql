-- Apply after 20261123. Run this entire atomic statement.
-- Store a scoped catalog FK OR a custom date, never a copied month count/end date.
DO $normalize_class_terms$
DECLARE f text; pending text; r record; states jsonb; conf jsonb; trusted_owner name;
BEGIN
 LOCK TABLE vuihoc."DANH_MUC_BO_SUNG",vuihoc."MUC_DANH_MUC",vuihoc."LOP_HOC",vuihoc."BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='sisotoida') THEN RAISE EXCEPTION 'Chạy bản 20261123 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='thoihanthang') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(l.madinhdanh,', ' ORDER BY l.madinhdanh) INTO pending FROM vuihoc."LOP_HOC" l
 WHERE (l.thoihanthang IS NOT NULL AND (
  l.ngaybatdau IS NULL OR l.ngayketthuc IS DISTINCT FROM (l.ngaybatdau+make_interval(months=>l.thoihanthang))::date-1
  OR (SELECT count(*) FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc WHERE c.madanhmuc='CLASS_DURATION' AND m.ma=l.thoihanthang::text)<>1))
 OR (l.thoihanthang IS NULL AND l.ngayketthuc IS NOT NULL AND (l.ngaybatdau IS NULL OR l.ngayketthuc<l.ngaybatdau))
 OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=l.madinhdanh AND (b.ngayhoc<l.ngaybatdau OR b.ngayhoc>l.ngayketthuc));
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Thời hạn lớp cũ chưa khớp danh mục hoặc lịch buổi; chưa xóa cột.'
  USING DETAIL=pending,HINT='Chạy supabase/diagnostics/class_terms_legacy.sql. Không tự chọn một mục khi có nhiều kết quả.'; END IF;
 ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN madanhmucthoihan text,ADD COLUMN mathoihan text,ADD COLUMN ngayketthuctuychinh date;
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tgname,'state',tgenabled)),'[]') INTO states FROM pg_trigger WHERE tgrelid='vuihoc."LOP_HOC"'::regclass AND NOT tgisinternal;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."LOP_HOC" DISABLE TRIGGER %I',r.name); END LOOP;
 UPDATE vuihoc."LOP_HOC" l SET madanhmucthoihan=m.madanhmuc,mathoihan=m.madinhdanh
 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
 WHERE c.madanhmuc='CLASS_DURATION' AND m.ma=l.thoihanthang::text;
 UPDATE vuihoc."LOP_HOC" SET ngayketthuctuychinh=ngayketthuc WHERE thoihanthang IS NULL AND ngayketthuc IS NOT NULL;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."LOP_HOC" %s TRIGGER %I',CASE r.state WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.name); END LOOP;
 ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_thoi_han_fk FOREIGN KEY(madanhmucthoihan,mathoihan)
  REFERENCES vuihoc."MUC_DANH_MUC"(madanhmuc,madinhdanh) MATCH FULL DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT lop_mot_nguon_thoi_han CHECK(mathoihan IS NULL OR ngayketthuctuychinh IS NULL);
 CREATE INDEX lop_thoi_han_idx ON vuihoc."LOP_HOC"(madanhmucthoihan,mathoihan);

 CREATE OR REPLACE FUNCTION vuihoc.thang_thoi_han(p_group text,p_item text) RETURNS integer
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $months$
  SELECT CASE WHEN m.ma ~ '^[1-9][0-9]{0,2}$' THEN CASE WHEN m.ma::integer<=120 THEN m.ma::integer END END
  FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
  WHERE (m.madanhmuc,m.madinhdanh)=(p_group,p_item) AND c.madanhmuc='CLASS_DURATION'
 $months$;
 CREATE OR REPLACE FUNCTION vuihoc.ngay_ket_thuc_lop(p_row jsonb) RETURNS date
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $enddate$
  SELECT CASE WHEN nullif(p_row->>'mathoihan','') IS NOT NULL THEN
   (nullif(p_row->>'ngaybatdau','')::date+make_interval(months=>vuihoc.thang_thoi_han(p_row->>'madanhmucthoihan',p_row->>'mathoihan')))::date-1
  ELSE nullif(p_row->>'ngayketthuctuychinh','')::date END
 $enddate$;
 CREATE OR REPLACE FUNCTION vuihoc.thoi_han_lop_truy_van(p_row jsonb) RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
  SELECT p_row||jsonb_build_object('thoihanthang',vuihoc.thang_thoi_han(p_row->>'madanhmucthoihan',p_row->>'mathoihan'),'ngayketthuc',vuihoc.ngay_ket_thuc_lop(p_row))
 $read$;
 DROP TRIGGER tinh_ngay_ket_thuc_lop ON vuihoc."LOP_HOC";
 DROP FUNCTION vuihoc.tinh_ngay_ket_thuc_lop();
 -- All installed readers, including generators, material guards and date checks.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND (p.prosrc LIKE '%l.ngayketthuc%' OR p.prosrc LIKE '%cls.ngayketthuc%') LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,'cls.ngayketthuc','vuihoc.ngay_ket_thuc_lop(to_jsonb(cls))');
  f:=replace(f,'l.ngayketthuc','vuihoc.ngay_ket_thuc_lop(to_jsonb(l))'); EXECUTE f;
 END LOOP;
 f:=pg_get_functiondef('vuihoc.ket_thuc_lop_het_han()'::regprocedure);
 IF strpos(f,'WHERE ngayketthuc<')=0 THEN RAISE EXCEPTION 'Không nhận diện được luồng kết thúc lớp hết hạn.'; END IF;
 f:=replace(f,'WHERE ngayketthuc<','WHERE vuihoc.ngay_ket_thuc_lop(to_jsonb("LOP_HOC"))<'); EXECUTE f;
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 f:=replace(f,'BEGIN',$patch$BEGIN IF p_table='LOP_HOC' AND p_row IS NOT NULL THEN p_row:=vuihoc.thoi_han_lop_truy_van(p_row); END IF;
$patch$); EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'conf:=vuihoc.business_config()->ds;')=0 THEN RAISE EXCEPTION 'Không nhận diện được RPC ghi lớp học.'; END IF;
 f:=replace(f,'conf:=vuihoc.business_config()->ds;',$patch$conf:=vuihoc.business_config()->ds;
 IF ds='classes' THEN
  b:=b-'thoihanthang'-'ngayketthuc';
  IF v ?| ARRAY['thoihanthang','ngayketthuc'] THEN RAISE EXCEPTION 'Số tháng và ngày kết thúc là dữ liệu truy vấn; ghi khóa thời hạn hoặc ngày tùy chỉnh.'; END IF;
 END IF;$patch$); EXECUTE f;
 conf:=vuihoc.business_config(); conf:=jsonb_set(conf,'{classes,columns}',conf->'classes'->'columns'||'["madanhmucthoihan","mathoihan","ngayketthuctuychinh"]'::jsonb);
 IF NOT conf->'classes'->'columns' ? 'ngaybatdau' THEN conf:=jsonb_set(conf,'{classes,columns}',conf->'classes'->'columns'||'"ngaybatdau"'::jsonb); END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 ALTER TABLE vuihoc."LOP_HOC" DROP COLUMN thoihanthang,DROP COLUMN ngayketthuc;

 -- Lesson creation/date changes share-lock the class and its catalog source.
 -- This also protects direct SQL writes racing with a term/catalog edit.
 CREATE OR REPLACE FUNCTION vuihoc.chan_buoi_ngoai_thoi_han() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $lesson_guard$
 DECLARE cls vuihoc."LOP_HOC"; ending date;
 BEGIN
  SELECT * INTO cls FROM vuihoc."LOP_HOC" WHERE madinhdanh=NEW.malop FOR SHARE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF cls.mathoihan IS NOT NULL THEN
   PERFORM 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
   WHERE (m.madanhmuc,m.madinhdanh)=(cls.madanhmucthoihan,cls.mathoihan) FOR SHARE OF m,c;
  END IF;
  ending:=vuihoc.ngay_ket_thuc_lop(to_jsonb(cls));
  IF NEW.ngayhoc<cls.ngaybatdau OR NEW.ngayhoc>ending THEN RAISE EXCEPTION 'Buổi học nằm ngoài thời hạn lớp'; END IF;
  RETURN NEW;
 END $lesson_guard$;

 CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_thoi_han_lop() RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $check$
 BEGIN
  IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE
   (l.mathoihan IS NOT NULL AND vuihoc.thang_thoi_han(l.madanhmucthoihan,l.mathoihan) IS NULL)
   OR (vuihoc.ngay_ket_thuc_lop(to_jsonb(l)) IS NOT NULL AND (l.ngaybatdau IS NULL OR vuihoc.ngay_ket_thuc_lop(to_jsonb(l))<l.ngaybatdau))) THEN
   RAISE EXCEPTION 'Khóa thời hạn phải thuộc danh mục thời hạn hợp lệ; ngày kết thúc phải từ ngày bắt đầu lớp trở đi.';
  END IF;
  IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
   WHERE b.ngayhoc<l.ngaybatdau OR b.ngayhoc>vuihoc.ngay_ket_thuc_lop(to_jsonb(l))) THEN
   RAISE EXCEPTION 'Lớp đã có buổi học ngoài thời hạn. Hãy xử lý lịch các buổi đó trước khi đổi thời hạn hoặc danh mục.';
  END IF;
 END $check$;
 CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_thoi_han_trigger() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $check$
 BEGIN PERFORM vuihoc.kiem_tra_thoi_han_lop(); RETURN NULL; END $check$;
 CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_chon_thoi_han() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $choose$
 DECLARE ending date; oldending date; active boolean; months integer;
 BEGIN
  IF NEW.mathoihan IS NOT NULL THEN
   SELECT m.danghoatdong INTO active FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
   WHERE (m.madanhmuc,m.madinhdanh)=(NEW.madanhmucthoihan,NEW.mathoihan) AND c.madanhmuc='CLASS_DURATION' FOR SHARE OF m,c;
   months:=vuihoc.thang_thoi_han(NEW.madanhmucthoihan,NEW.mathoihan);
   IF months IS NULL THEN RAISE EXCEPTION 'Chọn thời hạn lớp hợp lệ từ danh mục.'; END IF;
   IF TG_OP='INSERT' OR (NEW.madanhmucthoihan,NEW.mathoihan) IS DISTINCT FROM (OLD.madanhmucthoihan,OLD.mathoihan) THEN
    IF NOT coalesce(active,false) THEN RAISE EXCEPTION 'Không chọn thời hạn đã ngừng hoạt động.'; END IF;
   END IF;
  END IF;
  ending:=vuihoc.ngay_ket_thuc_lop(to_jsonb(NEW));
  IF TG_OP='UPDATE' THEN oldending:=vuihoc.ngay_ket_thuc_lop(to_jsonb(OLD)); END IF;
  IF TG_OP='UPDATE' AND oldending IS NOT NULL AND ending IS NULL THEN RAISE EXCEPTION 'Chọn thời hạn hoặc ngày kết thúc tùy chỉnh, không bỏ thời hạn đã có.'; END IF;
  IF NEW.mathoihan IS NOT NULL AND NEW.ngaybatdau IS NULL OR (ending IS NOT NULL AND (NEW.ngaybatdau IS NULL OR ending<NEW.ngaybatdau)) THEN
   RAISE EXCEPTION 'Ngày kết thúc phải từ ngày bắt đầu lớp trở đi.';
  END IF;
  RETURN NEW;
 END $choose$;
 CREATE TRIGGER kiem_tra_chon_thoi_han BEFORE INSERT OR UPDATE OF ngaybatdau,madanhmucthoihan,mathoihan,ngayketthuctuychinh ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_chon_thoi_han();
 CREATE CONSTRAINT TRIGGER kiem_tra_thoi_han_lop AFTER INSERT OR UPDATE ON vuihoc."LOP_HOC"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_thoi_han_trigger();
 CREATE CONSTRAINT TRIGGER kiem_tra_thoi_han_danh_muc AFTER INSERT OR UPDATE OR DELETE ON vuihoc."MUC_DANH_MUC"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_thoi_han_trigger();
 CREATE CONSTRAINT TRIGGER kiem_tra_nhom_thoi_han AFTER UPDATE OR DELETE ON vuihoc."DANH_MUC_BO_SUNG"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_thoi_han_trigger();
 CREATE OR REPLACE VIEW vuihoc."V_THOI_HAN_LOP" WITH(security_invoker=true) AS SELECT l.*,
  vuihoc.thang_thoi_han(l.madanhmucthoihan,l.mathoihan) AS thoihanthang,vuihoc.ngay_ket_thuc_lop(to_jsonb(l)) AS ngayketthuc FROM vuihoc."LOP_HOC" l;
 PERFORM vuihoc.kiem_tra_thoi_han_lop();
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOREACH f IN ARRAY ARRAY['thang_thoi_han(text,text)','ngay_ket_thuc_lop(jsonb)','thoi_han_lop_truy_van(jsonb)','kiem_tra_thoi_han_lop()','kiem_tra_thoi_han_trigger()','kiem_tra_chon_thoi_han()','chan_buoi_ngoai_thoi_han()'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner); EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_THOI_HAN_LOP" OWNER TO %I',trusted_owner);
 REVOKE ALL ON vuihoc."V_THOI_HAN_LOP" FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_class_terms$;
