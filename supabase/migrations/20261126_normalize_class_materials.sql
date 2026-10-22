-- Apply after 20261125. Run the entire atomic statement.
DO $normalize_class_materials$
DECLARE f text; pending text; r record; states jsonb; a integer; z integer; trusted_owner name;
BEGIN
 LOCK TABLE vuihoc."HOC_LIEU_LOP",vuihoc."BUOI_HOC",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='KHUNG_GIO' AND column_name='sophut') THEN RAISE EXCEPTION 'Chạy bản 20261125 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_LIEU_LOP' AND column_name='tuan') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 CREATE OR REPLACE FUNCTION vuihoc.ngay_hoc_lieu(p_text text) RETURNS date
 LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=pg_catalog AS $date$
 DECLARE d date;
 BEGIN
  IF p_text !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN RETURN NULL; END IF;
  BEGIN d:=to_date(p_text,'DD/MM/YYYY'); EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
  IF to_char(d,'DD/MM/YYYY')<>p_text THEN RETURN NULL; END IF; RETURN d;
 END $date$;
 CREATE OR REPLACE FUNCTION vuihoc.khoang_tuan_hoc_lieu(p_text text) RETURNS date[]
 LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $week$
  SELECT ARRAY[vuihoc.ngay_hoc_lieu(m[1]),vuihoc.ngay_hoc_lieu(m[2])] FROM regexp_match(p_text,'^(?:Tuần [0-9]+: *)?Từ ngày ([0-9]{2}/[0-9]{2}/[0-9]{4}) đến ngày ([0-9]{2}/[0-9]{2}/[0-9]{4})$') m
 $week$;
 CREATE OR REPLACE FUNCTION vuihoc.nhan_tuan_hoc_lieu(p_from date,p_to date) RETURNS text
 LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $label$
  SELECT 'Tuần '||(floor((extract(day FROM p_from)-1)/7)+1)::integer||': Từ ngày '||to_char(p_from,'DD/MM/YYYY')||' đến ngày '||to_char(p_to,'DD/MM/YYYY')
 $label$;
 SELECT string_agg(h.malop||'/'||h.thutu,', ' ORDER BY h.malop,h.thutu) INTO pending FROM vuihoc."HOC_LIEU_LOP" h
 CROSS JOIN LATERAL (SELECT vuihoc.khoang_tuan_hoc_lieu(h.tuan) AS d) q
 WHERE d IS NULL OR d[1] IS NULL OR d[2] IS NULL OR d[2]<d[1] OR d[2]-d[1]>6
  OR regexp_replace(h.thang,'^Tháng +','')<>to_char(d[1],'MM/YYYY');
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Tháng/tuần học liệu chưa khớp khoảng ngày hợp lệ; chưa xóa cột.' USING DETAIL=pending,HINT='Chạy supabase/diagnostics/class_material_legacy.sql.'; END IF;
 SELECT string_agg(b.madinhdanh,', ') INTO pending FROM vuihoc."BUOI_HOC" b WHERE
 (nullif(b.hoclieuslide,'') IS NOT NULL AND nullif(b.hoclieugiaovien,'') IS NOT NULL AND b.hoclieuslide<>b.hoclieugiaovien)
 OR (nullif(b.hoclieulms,'') IS NOT NULL AND nullif(b.baitaplms,'') IS NOT NULL AND b.hoclieulms<>b.baitaplms);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Hai trường học liệu thực tế của buổi còn mâu thuẫn; chưa xóa cột.' USING DETAIL=pending,HINT='Đối soát slide/materialGv và lms/exerciseLms, không tự chọn một giá trị.'; END IF;
 ALTER TABLE vuihoc."HOC_LIEU_LOP" ADD COLUMN tungay date,ADD COLUMN denngay date;
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tgname,'state',tgenabled)),'[]') INTO states FROM pg_trigger WHERE tgrelid='vuihoc."HOC_LIEU_LOP"'::regclass AND NOT tgisinternal;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."HOC_LIEU_LOP" DISABLE TRIGGER %I',r.name); END LOOP;
 UPDATE vuihoc."HOC_LIEU_LOP" SET tungay=(vuihoc.khoang_tuan_hoc_lieu(tuan))[1],denngay=(vuihoc.khoang_tuan_hoc_lieu(tuan))[2];
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."HOC_LIEU_LOP" %s TRIGGER %I',CASE r.state WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.name); END LOOP;
 SELECT string_agg(a.malop||'/'||a.thutu||'–'||b.thutu,', ') INTO pending FROM vuihoc."HOC_LIEU_LOP" a JOIN vuihoc."HOC_LIEU_LOP" b
 ON a.malop=b.malop AND a.sobuoi=b.sobuoi AND a.thutu<b.thutu AND a.tungay<=b.denngay AND b.tungay<=a.denngay;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Học liệu cùng lớp/số buổi có khoảng ngày chồng nhau.' USING DETAIL=pending; END IF;
 ALTER TABLE vuihoc."HOC_LIEU_LOP" RENAME COLUMN thutu TO mahoclieu;
 CREATE SEQUENCE vuihoc.hoc_lieu_ma_seq AS integer;
 PERFORM setval('vuihoc.hoc_lieu_ma_seq'::regclass,(SELECT coalesce(max(mahoclieu),0)+1 FROM vuihoc."HOC_LIEU_LOP"),false);
 ALTER TABLE vuihoc."HOC_LIEU_LOP" ALTER COLUMN mahoclieu SET DEFAULT nextval('vuihoc.hoc_lieu_ma_seq'::regclass);
 ALTER TABLE vuihoc."HOC_LIEU_LOP" ALTER COLUMN tungay SET NOT NULL,ALTER COLUMN denngay SET NOT NULL,
 ADD CONSTRAINT hoc_lieu_khoang_ngay CHECK(denngay>=tungay AND denngay-tungay<=6),ADD CONSTRAINT hoc_lieu_lop_ngay_buoi_unique UNIQUE(malop,tungay,sobuoi);
 CREATE OR REPLACE VIEW vuihoc."V_HOC_LIEU_LOP" WITH(security_invoker=true) AS SELECT h.malop,h.mahoclieu,h.mahoclieu AS thutu,h.tungay,h.denngay,
 to_char(h.tungay,'MM/YYYY') AS thang,vuihoc.nhan_tuan_hoc_lieu(h.tungay,h.denngay) AS tuan,h.sobuoi,h.tieude,h.lienketslide,h.lienketlms FROM vuihoc."HOC_LIEU_LOP" h;
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%"HOC_LIEU_LOP"%' LOOP
  f:=pg_get_functiondef(r.oid);f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."HOC_LIEU_LOP"','\1 vuihoc."V_HOC_LIEU_LOP"','gi');EXECUTE f;
 END LOOP;
 ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN mahoclieu integer;
 ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_hoc_lieu_fk FOREIGN KEY(malop,mahoclieu) REFERENCES vuihoc."HOC_LIEU_LOP"(malop,mahoclieu) DEFERRABLE INITIALLY DEFERRED;
 CREATE INDEX buoi_hoc_lieu_idx ON vuihoc."BUOI_HOC"(malop,mahoclieu);
 CREATE OR REPLACE FUNCTION vuihoc.tim_hoc_lieu_buoi(p_lop text,p_date date,p_slot text) RETURNS integer
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $find$
  SELECT h.mahoclieu FROM (SELECT s.thutrongtuan,s.makhunggio,row_number() OVER(ORDER BY s.thutrongtuan,k.giobatdau,k.gioketthuc)::integer AS session FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio WHERE s.malop=p_lop) s
  JOIN vuihoc."HOC_LIEU_LOP" h ON h.malop=p_lop AND h.sobuoi=s.session AND p_date BETWEEN h.tungay AND h.denngay
  WHERE s.thutrongtuan=extract(isodow FROM p_date) AND s.makhunggio=p_slot
 $find$;
 -- Transfer actual legacy values only when they do not conflict. Link plans
 -- by class/date/session, never by matching a title or URL.
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tgname,'state',tgenabled)),'[]') INTO states FROM pg_trigger WHERE tgrelid='vuihoc."BUOI_HOC"'::regclass AND NOT tgisinternal;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" DISABLE TRIGGER %I',r.name); END LOOP;
 UPDATE vuihoc."BUOI_HOC" b SET mahoclieu=coalesce((SELECT h.mahoclieu FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."HOC_LIEU_LOP" h ON h.malop=b.malop AND h.sobuoi=c.sobuoi AND b.ngayhoc BETWEEN h.tungay AND h.denngay WHERE c.mabuoi=b.madinhdanh),vuihoc.tim_hoc_lieu_buoi(b.malop,b.ngayhoc,b.makhunggio)),hoclieugiaovien=coalesce(nullif(b.hoclieugiaovien,''),b.hoclieuslide),baitaplms=coalesce(nullif(b.baitaplms,''),b.hoclieulms);
 UPDATE vuihoc."BUOI_HOC" b SET hoclieutieude=CASE WHEN b.hoclieutieude=h.tieude THEN NULL ELSE b.hoclieutieude END,
 hoclieugiaovien=CASE WHEN b.hoclieugiaovien=h.lienketslide THEN NULL ELSE b.hoclieugiaovien END,baitaplms=CASE WHEN b.baitaplms=h.lienketlms THEN NULL ELSE b.baitaplms END
 FROM vuihoc."HOC_LIEU_LOP" h WHERE (h.malop,h.mahoclieu)=(b.malop,b.mahoclieu);
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" %s TRIGGER %I',CASE r.state WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.name); END LOOP;
 CREATE OR REPLACE FUNCTION vuihoc.hoc_lieu_buoi_truy_van(p_row jsonb) RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $read$
  SELECT jsonb_strip_nulls(jsonb_build_object('title',coalesce(nullif(p_row->>'hoclieutieude',''),h.tieude),
   'slide',coalesce(nullif(p_row->>'hoclieugiaovien',''),h.lienketslide),'materialGv',coalesce(nullif(p_row->>'hoclieugiaovien',''),h.lienketslide),
   'lms',coalesce(nullif(p_row->>'baitaplms',''),h.lienketlms),'exerciseLms',coalesce(nullif(p_row->>'baitaplms',''),h.lienketlms),'materialHs',p_row->>'hoclieuhocsinh'))
  FROM (SELECT 1) q LEFT JOIN vuihoc."HOC_LIEU_LOP" h ON (h.malop,h.mahoclieu)=(p_row->>'malop',nullif(p_row->>'mahoclieu','')::integer)
 $read$;
 CREATE OR REPLACE FUNCTION vuihoc.luu_hoc_lieu_buoi(p_buoi text,p_data jsonb) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $write_lesson$
 DECLARE b vuihoc."BUOI_HOC"; h vuihoc."HOC_LIEU_LOP"; caption text; slide text; lms text; hs text;
 BEGIN
  PERFORM vuihoc.kiem_tra_truong_json(p_data,ARRAY['title','slide','lms','materialGv','materialHs','exerciseLms']);
  SELECT * INTO STRICT b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi FOR UPDATE;
  SELECT * INTO h FROM vuihoc."HOC_LIEU_LOP" WHERE (malop,mahoclieu)=(b.malop,b.mahoclieu) FOR SHARE;
  caption:=CASE WHEN p_data ? 'title' THEN p_data->>'title' ELSE b.hoclieutieude END;
  slide:=CASE WHEN p_data ? 'materialGv' THEN p_data->>'materialGv' WHEN p_data ? 'slide' THEN p_data->>'slide' ELSE b.hoclieugiaovien END;
  lms:=CASE WHEN p_data ? 'exerciseLms' THEN p_data->>'exerciseLms' WHEN p_data ? 'lms' THEN p_data->>'lms' ELSE b.baitaplms END;
  hs:=CASE WHEN p_data ? 'materialHs' THEN p_data->>'materialHs' ELSE b.hoclieuhocsinh END;
  IF caption=h.tieude THEN caption:=NULL; END IF;IF slide=h.lienketslide THEN slide:=NULL; END IF;IF lms=h.lienketlms THEN lms:=NULL; END IF;
  UPDATE vuihoc."BUOI_HOC" SET hoclieutieude=caption,hoclieugiaovien=slide,baitaplms=lms,hoclieuhocsinh=hs WHERE madinhdanh=p_buoi
   AND (hoclieutieude,hoclieugiaovien,baitaplms,hoclieuhocsinh) IS DISTINCT FROM (caption,slide,lms,hs);
 END $write_lesson$;
 CREATE OR REPLACE FUNCTION vuihoc.luu_hoc_lieu_lop(p_lop text,p_data jsonb) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $write_plan$
 DECLARE x jsonb; d date[]; start_day date; end_day date; local_id integer; ids integer[]:=ARRAY[]::integer[]; oldrow vuihoc."HOC_LIEU_LOP";
 BEGIN
  IF jsonb_typeof(p_data) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Danh sách học liệu không hợp lệ.'; END IF;
  PERFORM 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_lop FOR UPDATE;
  FOR x IN SELECT value FROM jsonb_array_elements(p_data) LOOP
   PERFORM vuihoc.kiem_tra_truong_json(x,ARRAY['id','fromDate','toDate','month','week','session','title','slide','lms']);
   d:=vuihoc.khoang_tuan_hoc_lieu(x->>'week');start_day:=coalesce(nullif(x->>'fromDate','')::date,d[1]);end_day:=coalesce(nullif(x->>'toDate','')::date,d[2]);
   IF start_day IS NULL OR end_day IS NULL OR end_day<start_day OR end_day-start_day>6 THEN RAISE EXCEPTION 'Học liệu phải có khoảng ngày hợp lệ tối đa 7 ngày.'; END IF;
   IF x ? 'month' AND regexp_replace(x->>'month','^Tháng +','')<>to_char(start_day,'MM/YYYY') OR (x ? 'week' AND (d[1],d[2]) IS DISTINCT FROM (start_day,end_day)) THEN RAISE EXCEPTION 'Nhãn tháng/tuần không khớp ngày học liệu.'; END IF;
   local_id:=nullif(x->>'id','')::integer;
   IF local_id IS NOT NULL THEN SELECT * INTO oldrow FROM vuihoc."HOC_LIEU_LOP" WHERE (malop,mahoclieu)=(p_lop,local_id);IF NOT FOUND THEN RAISE EXCEPTION 'Mã học liệu không thuộc lớp hoặc đã bị xóa.'; END IF;
   ELSE SELECT * INTO oldrow FROM vuihoc."HOC_LIEU_LOP" WHERE malop=p_lop AND (tungay,denngay,sobuoi)=(start_day,end_day,(x->>'session')::integer);local_id:=oldrow.mahoclieu;END IF;
   IF local_id IS NULL THEN local_id:=nextval('vuihoc.hoc_lieu_ma_seq'::regclass);
    INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,mahoclieu,tungay,denngay,sobuoi,tieude,lienketslide,lienketlms) VALUES(p_lop,local_id,start_day,end_day,(x->>'session')::integer,x->>'title',coalesce(x->>'slide',''),coalesce(x->>'lms',''));
   ELSIF (oldrow.tungay,oldrow.denngay,oldrow.sobuoi,oldrow.tieude,oldrow.lienketslide,oldrow.lienketlms) IS DISTINCT FROM (start_day,end_day,(x->>'session')::integer,x->>'title',coalesce(x->>'slide',''),coalesce(x->>'lms','')) THEN
    UPDATE vuihoc."HOC_LIEU_LOP" SET tungay=start_day,denngay=end_day,sobuoi=(x->>'session')::integer,tieude=x->>'title',lienketslide=coalesce(x->>'slide',''),lienketlms=coalesce(x->>'lms','') WHERE (malop,mahoclieu)=(p_lop,local_id);
   END IF;
   IF local_id=ANY(ids) THEN RAISE EXCEPTION 'Danh sách có học liệu trùng.'; END IF;ids:=array_append(ids,local_id);
  END LOOP;
  DELETE FROM vuihoc."HOC_LIEU_LOP" WHERE malop=p_lop AND NOT(mahoclieu=ANY(ids));
 END $write_plan$;
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 a:=strpos(f,'  UPDATE vuihoc."BUOI_HOC" SET hoclieutieude=');z:=CASE WHEN a>0 THEN strpos(substr(f,a),';') ELSE 0 END;
 IF a=0 OR z=0 THEN RAISE EXCEPTION 'Không nhận diện được nơi ghi học liệu buổi.'; END IF;
 f:=left(f,a-1)||'  PERFORM vuihoc.luu_hoc_lieu_buoi(id,s);'||substr(f,a+z);
 a:=strpos(f,$mark$ IF p_row ? 'hoclieu' THEN$mark$);z:=strpos(f,$mark$ IF p_row ? 'phancongdaythay'$mark$);
 IF a=0 OR z<=a THEN RAISE EXCEPTION 'Không nhận diện được nơi ghi kế hoạch học liệu.'; END IF;
 f:=left(f,a-1)||$patch$ IF p_row ? 'hoclieu' THEN PERFORM vuihoc.luu_hoc_lieu_lop(id,p_row->'hoclieu'); END IF;
$patch$||substr(f,z);
 a:=strpos(f,' UPDATE vuihoc."BUOI_HOC" SET hoclieugiaovien=CASE');z:=CASE WHEN a>0 THEN strpos(substr(f,a),';') ELSE 0 END;
 IF a=0 OR z=0 THEN RAISE EXCEPTION 'Không nhận diện được nơi ghi học liệu chi tiết ca.'; END IF;
 f:=left(f,a-1)||$patch$ PERFORM vuihoc.luu_hoc_lieu_buoi(lesson,(SELECT coalesce(jsonb_object_agg(key,value),'{}') FROM jsonb_each(s) WHERE key IN ('materialGv','materialHs','exerciseLms')));$patch$||substr(f,a+z);EXECUTE f;
 f:=pg_get_functiondef('vuihoc.lop_truong_truy_van(jsonb)'::regprocedure);
 f:=replace(f,$old$jsonb_build_object('month',h.thang$old$,$new$jsonb_build_object('id',h.mahoclieu,'fromDate',h.tungay,'toDate',h.denngay,'month',h.thang$new$);
 f:=replace(f,'ORDER BY h.thutu','ORDER BY h.tungay,h.sobuoi,h.mahoclieu');EXECUTE f;
 CREATE OR REPLACE FUNCTION vuihoc.buoi_co_hoc_lieu_tuan(p_lop text,p_ngay date,p_khunggio text) RETURNS boolean
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $exists$ SELECT vuihoc.tim_hoc_lieu_buoi(p_lop,p_ngay,p_khunggio) IS NOT NULL $exists$;
 CREATE OR REPLACE FUNCTION vuihoc.sinh_buoi_khi_gan_hoc_lieu() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $generate$
 DECLARE start_day date;
 BEGIN
  UPDATE vuihoc."BUOI_HOC" b SET mahoclieu=NEW.mahoclieu WHERE b.malop=NEW.malop AND b.mahoclieu IS NULL AND b.ngayhoc BETWEEN NEW.tungay AND NEW.denngay
   AND b.ngayhoc>=(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date AND b.vaolopluc IS NULL AND b.ketthucluc IS NULL
   AND NOT EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh)
   AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
   AND vuihoc.tim_hoc_lieu_buoi(b.malop,b.ngayhoc,b.makhunggio)=NEW.mahoclieu;
  start_day:=greatest(NEW.tungay,(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date);
  IF start_day<=NEW.denngay THEN PERFORM vuihoc.dong_bo_ca_theo_lich(start_day,NEW.denngay); END IF;RETURN NEW;
 END $generate$;
 CREATE OR REPLACE FUNCTION vuihoc.giu_nguon_hoc_lieu() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $protect$
 BEGIN
  PERFORM 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=coalesce(NEW.malop,OLD.malop) FOR UPDATE;
  IF TG_OP='DELETE' THEN
   IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE (malop,mahoclieu)=(OLD.malop,OLD.mahoclieu)) THEN RAISE EXCEPTION 'Học liệu đang được buổi học tham chiếu, không được xóa nguồn.'; END IF;RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE (b.malop,b.mahoclieu)=(OLD.malop,OLD.mahoclieu)) THEN
   IF (NEW.malop,NEW.mahoclieu,NEW.tungay,NEW.denngay,NEW.sobuoi) IS DISTINCT FROM (OLD.malop,OLD.mahoclieu,OLD.tungay,OLD.denngay,OLD.sobuoi) THEN RAISE EXCEPTION 'Không đổi định danh/khoảng ngày/số buổi của học liệu đã được liên kết.'; END IF;
   IF (NEW.tieude,NEW.lienketslide,NEW.lienketlms) IS DISTINCT FROM (OLD.tieude,OLD.lienketslide,OLD.lienketlms) AND EXISTS(
    SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE (b.malop,b.mahoclieu)=(OLD.malop,OLD.mahoclieu) AND (b.vaolopluc IS NOT NULL OR b.ketthucluc IS NOT NULL
    OR EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh) OR EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa))) THEN
    RAISE EXCEPTION 'Học liệu đã dùng hoặc thuộc kỳ công khóa; giữ nguồn lịch sử, không ghi đè kế hoạch.';
   END IF;
  END IF;RETURN NEW;
 END $protect$;
 CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_hoc_lieu_chong() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $overlap$
 BEGIN
  IF EXISTS(SELECT 1 FROM vuihoc."HOC_LIEU_LOP" a JOIN vuihoc."HOC_LIEU_LOP" b ON a.malop=b.malop AND a.sobuoi=b.sobuoi AND a.mahoclieu<b.mahoclieu AND a.tungay<=b.denngay AND b.tungay<=a.denngay) THEN RAISE EXCEPTION 'Học liệu cùng lớp/số buổi không được chồng khoảng ngày.'; END IF;RETURN NULL;
 END $overlap$;
 CREATE TRIGGER giu_nguon_hoc_lieu BEFORE INSERT OR UPDATE OR DELETE ON vuihoc."HOC_LIEU_LOP" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_nguon_hoc_lieu();
 CREATE CONSTRAINT TRIGGER kiem_tra_hoc_lieu_chong AFTER INSERT OR UPDATE ON vuihoc."HOC_LIEU_LOP" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_hoc_lieu_chong();
 CREATE OR REPLACE FUNCTION vuihoc.lien_ket_hoc_lieu_buoi() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $link$
 DECLARE h vuihoc."HOC_LIEU_LOP";
 BEGIN
  IF TG_OP='INSERT' AND NEW.mahoclieu IS NULL THEN NEW.mahoclieu:=vuihoc.tim_hoc_lieu_buoi(NEW.malop,NEW.ngayhoc,NEW.makhunggio); END IF;
  IF TG_OP='UPDATE' AND (NEW.malop,NEW.mahoclieu) IS DISTINCT FROM (OLD.malop,OLD.mahoclieu) AND OLD.mahoclieu IS NOT NULL AND (OLD.vaolopluc IS NOT NULL OR OLD.ketthucluc IS NOT NULL OR EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=OLD.madinhdanh)) THEN RAISE EXCEPTION 'Không đổi nguồn học liệu của buổi đã sử dụng.'; END IF;
  IF NEW.mahoclieu IS NOT NULL THEN
   SELECT * INTO h FROM vuihoc."HOC_LIEU_LOP" WHERE (malop,mahoclieu)=(NEW.malop,NEW.mahoclieu) FOR SHARE;
   IF NOT FOUND OR NEW.ngayhoc NOT BETWEEN h.tungay AND h.denngay THEN RAISE EXCEPTION 'Nguồn học liệu không thuộc lớp/khoảng ngày của buổi.'; END IF;
   IF NEW.hoclieutieude=h.tieude THEN NEW.hoclieutieude:=NULL; END IF;IF NEW.hoclieugiaovien=h.lienketslide THEN NEW.hoclieugiaovien:=NULL; END IF;IF NEW.baitaplms=h.lienketlms THEN NEW.baitaplms:=NULL; END IF;
  END IF;RETURN NEW;
 END $link$;
 CREATE TRIGGER lien_ket_hoc_lieu_buoi BEFORE INSERT OR UPDATE OF malop,mahoclieu,ngayhoc,makhunggio,hoclieutieude,hoclieugiaovien,baitaplms,vaolopluc,ketthucluc ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.lien_ket_hoc_lieu_buoi();
 CREATE OR REPLACE VIEW vuihoc."V_CHI_TIET_CA_LOP" WITH(security_invoker=true) AS SELECT b.malop,c.khoaca,c.mabuoi,c.sobuoi,
 b.ngayhoc::text||' '||to_char(b.batdau,'HH24:MI')||' - '||to_char(b.ketthuc,'HH24:MI') AS ngaygio,b.tieude,to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS') AS giovaohienthi,u.hoten AS hotennguoivao,
 vuihoc.hoc_lieu_buoi_truy_van(to_jsonb(b))->>'materialGv' AS hoclieugiaovien,b.hoclieuhocsinh,vuihoc.hoc_lieu_buoi_truy_van(to_jsonb(b))->>'exerciseLms' AS baitaplms,b.magiaoviendaythay,
 EXISTS(SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" d WHERE d.mabuoi=b.madinhdanh) AS codiemdanh,EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh) AS conhanxet
 FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=b.manguoivaolop;
 ALTER TABLE vuihoc."HOC_LIEU_LOP" DROP COLUMN thang,DROP COLUMN tuan;
 ALTER TABLE vuihoc."BUOI_HOC" DROP COLUMN hoclieuslide,DROP COLUMN hoclieulms;
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOREACH f IN ARRAY ARRAY['ngay_hoc_lieu(text)','khoang_tuan_hoc_lieu(text)','nhan_tuan_hoc_lieu(date,date)','tim_hoc_lieu_buoi(text,date,text)','hoc_lieu_buoi_truy_van(jsonb)','luu_hoc_lieu_buoi(text,jsonb)','luu_hoc_lieu_lop(text,jsonb)','giu_nguon_hoc_lieu()','kiem_tra_hoc_lieu_chong()','lien_ket_hoc_lieu_buoi()'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_HOC_LIEU_LOP" OWNER TO %I',trusted_owner);REVOKE ALL ON vuihoc."V_HOC_LIEU_LOP" FROM PUBLIC,anon,authenticated;
 EXECUTE format('ALTER SEQUENCE vuihoc.hoc_lieu_ma_seq OWNER TO %I',trusted_owner);REVOKE ALL ON SEQUENCE vuihoc.hoc_lieu_ma_seq FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_class_materials$;
