-- Apply after 20261121. One atomic statement. No new business-data tables.
DO $normalize_lesson_metadata$
DECLARE f text; pending text; r record; a integer; z integer; states jsonb; trusted_owner name;
BEGIN
 LOCK TABLE vuihoc."BUOI_HOC",vuihoc."CHI_TIET_CA_LOP" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_SINH' AND column_name='mamonhoc') THEN RAISE EXCEPTION 'Chạy bản 20261121 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CHI_TIET_CA_LOP' AND column_name='malop') THEN RETURN; END IF;
 LOCK TABLE vuihoc."PHAN_CONG_DAY_THAY" IN SHARE ROW EXCLUSIVE MODE;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(mabuoi,', ') INTO pending FROM (SELECT mabuoi FROM vuihoc."CHI_TIET_CA_LOP" GROUP BY mabuoi HAVING count(*)>1) q;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Một buổi còn nhiều bản chi tiết ca; cần đối soát trước.' USING DETAIL=pending; END IF;
 SELECT string_agg(c.mabuoi,', ') INTO pending FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
 WHERE c.malop<>b.malop
 OR (nullif(c.tieude,'') IS NOT NULL AND nullif(b.tieude,'') IS NOT NULL AND c.tieude<>b.tieude)
 OR (nullif(c.hoclieugiaovien,'') IS NOT NULL AND nullif(b.hoclieugiaovien,'') IS NOT NULL AND c.hoclieugiaovien<>b.hoclieugiaovien)
 OR (nullif(c.hoclieuhocsinh,'') IS NOT NULL AND nullif(b.hoclieuhocsinh,'') IS NOT NULL AND c.hoclieuhocsinh<>b.hoclieuhocsinh)
 OR (nullif(c.baitaplms,'') IS NOT NULL AND nullif(b.baitaplms,'') IS NOT NULL AND c.baitaplms<>b.baitaplms)
 OR (c.magiaoviendaythay IS NOT NULL AND c.magiaoviendaythay IS DISTINCT FROM b.magiaoviendaythay AND NOT(c.magiaoviendaythay IS NOT DISTINCT FROM b.magiaovienchinh AND b.magiaoviendaythay IS NULL))
 OR (nullif(c.giovaohienthi,'') IS NOT NULL AND b.vaolopluc IS NULL)
 OR (nullif(c.hotennguoivao,'') IS NOT NULL AND b.vaolopluc IS NOT NULL AND b.manguoivaolop IS NULL);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Chi tiết ca còn thông tin chưa khớp buổi học; chưa xóa cột.' USING DETAIL=pending,HINT='Chạy supabase/diagnostics/lesson_metadata_legacy.sql.'; END IF;
 SELECT string_agg(p.mabuoi,', ') INTO pending FROM vuihoc."PHAN_CONG_DAY_THAY" p JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=p.mabuoi
 WHERE p.malop<>b.malop OR (p.magiaovien IS DISTINCT FROM b.magiaoviendaythay AND NOT(p.magiaovien IS NOT DISTINCT FROM b.magiaovienchinh AND b.magiaoviendaythay IS NULL));
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Phân công dạy thay cũ chưa khớp buổi học; chưa xóa bảng.' USING DETAIL=pending; END IF;

 -- Fill only missing actual metadata. Suppress user triggers inside this DDL
 -- transaction so historical/locked lessons do not advance their clock or payroll.
 -- Restore every original enabled/disabled state before any schema change.
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tgname,'state',tgenabled)),'[]') INTO states FROM pg_trigger WHERE tgrelid='vuihoc."BUOI_HOC"'::regclass AND NOT tgisinternal;
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" DISABLE TRIGGER %I',r.name); END LOOP;
 UPDATE vuihoc."BUOI_HOC" b SET tieude=coalesce(nullif(b.tieude,''),c.tieude),
  hoclieugiaovien=coalesce(nullif(b.hoclieugiaovien,''),c.hoclieugiaovien),hoclieuhocsinh=coalesce(nullif(b.hoclieuhocsinh,''),c.hoclieuhocsinh),baitaplms=coalesce(nullif(b.baitaplms,''),c.baitaplms)
 FROM vuihoc."CHI_TIET_CA_LOP" c WHERE c.mabuoi=b.madinhdanh AND (
  (nullif(b.tieude,'') IS NULL AND nullif(c.tieude,'') IS NOT NULL) OR (nullif(b.hoclieugiaovien,'') IS NULL AND nullif(c.hoclieugiaovien,'') IS NOT NULL)
  OR (nullif(b.hoclieuhocsinh,'') IS NULL AND nullif(c.hoclieuhocsinh,'') IS NOT NULL) OR (nullif(b.baitaplms,'') IS NULL AND nullif(c.baitaplms,'') IS NOT NULL));
 FOR r IN SELECT * FROM jsonb_to_recordset(states) AS x(name text,state text) LOOP EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" %s TRIGGER %I',CASE r.state WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END,r.name); END LOOP;

 CREATE OR REPLACE VIEW vuihoc."V_CHI_TIET_CA_LOP" WITH(security_invoker=true) AS
 SELECT b.malop,c.khoaca,c.mabuoi,c.sobuoi,
  b.ngayhoc::text||' '||to_char(b.batdau,'HH24:MI')||' - '||to_char(b.ketthuc,'HH24:MI') AS ngaygio,b.tieude,
  to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS') AS giovaohienthi,u.hoten AS hotennguoivao,
  b.hoclieugiaovien,b.hoclieuhocsinh,b.baitaplms,b.magiaoviendaythay,
  EXISTS(SELECT 1 FROM vuihoc."DIEM_DANH_BUOI_HOC" d WHERE d.mabuoi=b.madinhdanh) AS codiemdanh,
  EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh) AS conhanxet
 FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=b.manguoivaolop;
 -- Move only reads; all writes below continue to target the physical normalized table.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%"CHI_TIET_CA_LOP"%' LOOP
  f:=pg_get_functiondef(r.oid); f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."CHI_TIET_CA_LOP"','\1 vuihoc."V_CHI_TIET_CA_LOP"','gi'); EXECUTE f;
 END LOOP;

 CREATE OR REPLACE FUNCTION vuihoc.buoi_tu_ngay_gio(p_lop text,p_ngaygio text,p_sobuoi integer DEFAULT NULL) RETURNS text
 LANGUAGE plpgsql SET search_path=pg_catalog AS $resolve$
 DECLARE hours text[]; n integer; lesson text;
 BEGIN
  hours:=regexp_match(p_ngaygio,'([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})');
  SELECT count(*),min(madinhdanh) INTO n,lesson FROM vuihoc."BUOI_HOC" WHERE malop=p_lop AND ngayhoc=left(p_ngaygio,10)::date
   AND (hours IS NULL OR (batdau,ketthuc)=(hours[1]::time,hours[2]::time))
   AND (hours IS NOT NULL OR p_sobuoi IS NULL OR coalesce(
    (SELECT c.sobuoi FROM vuihoc."CHI_TIET_CA_LOP" c WHERE c.mabuoi=madinhdanh),
    (SELECT session_num FROM (SELECT s.thutrongtuan,s.makhunggio,row_number() OVER(ORDER BY s.thutrongtuan,k.khoanggio)::integer AS session_num FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio WHERE s.malop=p_lop) plan WHERE plan.thutrongtuan=extract(isodow FROM ngayhoc) AND plan.makhunggio=vuihoc."BUOI_HOC".makhunggio))=p_sobuoi);
  IF n=1 THEN RETURN lesson; END IF;
  IF n>1 THEN RAISE EXCEPTION 'Ngày giờ chưa xác định duy nhất buổi học.'; END IF;
  RETURN vuihoc.buoi_phan_cong(p_lop,p_ngaygio);
 END $resolve$;
 CREATE OR REPLACE FUNCTION vuihoc.luu_day_thay_chuan(p_lop text,p_data jsonb) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $cover$
 DECLARE x jsonb; lesson text; ids text[]:=ARRAY[]::text[];
 BEGIN
  IF jsonb_typeof(p_data) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Danh sách dạy thay không hợp lệ.'; END IF;
  FOR x IN SELECT value FROM jsonb_array_elements(p_data) LOOP
   PERFORM vuihoc.kiem_tra_truong_json(x,ARRAY['sessionNum','dateStr','teacherId','teacherName']);
   lesson:=vuihoc.buoi_tu_ngay_gio(p_lop,x->>'dateStr',nullif(x->>'sessionNum','')::integer);
   IF lesson=ANY(ids) THEN RAISE EXCEPTION 'Một buổi chỉ có một phân công dạy thay.'; END IF;
   ids:=array_append(ids,lesson);
   UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=nullif(x->>'teacherId','') WHERE madinhdanh=lesson AND magiaoviendaythay IS DISTINCT FROM nullif(x->>'teacherId','');
  END LOOP;
  UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=NULL WHERE malop=p_lop AND magiaoviendaythay IS NOT NULL AND NOT(madinhdanh=ANY(ids));
 END $cover$;
 -- Replace the actual insert statement, independent of whitespace/extra installed wrappers.
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 a:=strpos(f,$mark$ IF p_row ? 'phancongdaythay' $mark$); z:=strpos(f,$mark$ IF NOT p_row ? 'chitietcahoc' THEN RETURN; END IF;$mark$);
 IF a=0 OR z<=a THEN RAISE EXCEPTION 'Không nhận diện được hàm ghi dạy thay.'; END IF;
 f:=left(f,a-1)||$patch$ IF p_row ? 'phancongdaythay' THEN PERFORM vuihoc.luu_day_thay_chuan(id,coalesce(nullif(p_row->'phancongdaythay','null'),'[]')); END IF;
$patch$||substr(f,z);
 a:=strpos(f,'INSERT INTO vuihoc."CHI_TIET_CA_LOP"'); z:=CASE WHEN a>0 THEN strpos(substr(f,a),';') ELSE 0 END;
 IF a=0 OR z=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm ghi chi tiết ca.'; END IF;
 f:=left(f,a-1)||$patch$UPDATE vuihoc."CHI_TIET_CA_LOP" c SET khoaca='lesson:'||c.mabuoi WHERE c.mabuoi<>lesson AND c.khoaca=x.key
 AND EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=c.mabuoi AND b.malop=id);
 INSERT INTO vuihoc."CHI_TIET_CA_LOP"(mabuoi,khoaca,sobuoi) VALUES(lesson,x.key,(s->>'sessionNum')::integer)
 ON CONFLICT(mabuoi) DO UPDATE SET khoaca=excluded.khoaca,sobuoi=excluded.sobuoi
 WHERE (vuihoc."CHI_TIET_CA_LOP".khoaca,vuihoc."CHI_TIET_CA_LOP".sobuoi) IS DISTINCT FROM (excluded.khoaca,excluded.sobuoi);
 UPDATE vuihoc."BUOI_HOC" SET hoclieugiaovien=CASE WHEN s ? 'materialGv' THEN s->>'materialGv' ELSE hoclieugiaovien END,
  hoclieuhocsinh=CASE WHEN s ? 'materialHs' THEN s->>'materialHs' ELSE hoclieuhocsinh END,baitaplms=CASE WHEN s ? 'exerciseLms' THEN s->>'exerciseLms' ELSE baitaplms END
 WHERE madinhdanh=lesson AND ((s ? 'materialGv' AND hoclieugiaovien IS DISTINCT FROM s->>'materialGv') OR (s ? 'materialHs' AND hoclieuhocsinh IS DISTINCT FROM s->>'materialHs') OR (s ? 'exerciseLms' AND baitaplms IS DISTINCT FROM s->>'exerciseLms'));
$patch$||substr(f,a+z);
 -- Resolve by actual lesson time, not a time-slot catalog label that may have changed.
 a:=strpos(f,$mark$  d:=left(s->>'dateStr',10)::date;$mark$); z:=strpos(f,'  -- The pre-conversion values');
 IF a=0 OR z<=a THEN RAISE EXCEPTION 'Không nhận diện được bước xác định buổi học.'; END IF;
 f:=left(f,a-1)||$patch$  lesson:=vuihoc.buoi_tu_ngay_gio(id,s->>'dateStr');
$patch$||substr(f,z);
 f:=replace(f,$old$DELETE FROM vuihoc."V_CHI_TIET_CA_LOP" WHERE malop=id AND NOT(coalesce(nullif(p_row->'chitietcahoc','null'),'{}') ? khoaca);$old$,
  '-- A UI-map omission does not delete the historical lesson sequence.');
 IF strpos(f,'ON CONFLICT(malop,khoaca)')>0 OR strpos(f,'INSERT INTO vuihoc."PHAN_CONG_DAY_THAY"')>0 OR strpos(f,'DELETE FROM vuihoc."V_CHI_TIET_CA_LOP"')>0 THEN RAISE EXCEPTION 'Chưa chuyển hết nguồn ghi ca/dạy thay.'; END IF;
 EXECUTE f;
 ALTER TABLE vuihoc."CHI_TIET_CA_LOP" DROP COLUMN malop,DROP COLUMN ngaygio,DROP COLUMN tieude,DROP COLUMN giovaohienthi,DROP COLUMN hotennguoivao,
  DROP COLUMN hoclieugiaovien,DROP COLUMN hoclieuhocsinh,DROP COLUMN baitaplms,DROP COLUMN magiaoviendaythay,DROP COLUMN codiemdanh,DROP COLUMN conhanxet;
 ALTER TABLE vuihoc."CHI_TIET_CA_LOP" ADD PRIMARY KEY(mabuoi);

 DROP TABLE vuihoc."PHAN_CONG_DAY_THAY";
 DROP FUNCTION IF EXISTS vuihoc.dong_bo_phan_cong_buoi();
 CREATE VIEW vuihoc."PHAN_CONG_DAY_THAY" WITH(security_invoker=true) AS
 SELECT b.malop,row_number() OVER(PARTITION BY b.malop ORDER BY b.ngayhoc,b.batdau,b.madinhdanh)::integer AS thutu,
  c.sobuoi,b.ngayhoc::text||' '||to_char(b.batdau,'HH24:MI')||' - '||to_char(b.ketthuc,'HH24:MI') AS ngaygio,
  b.magiaoviendaythay AS magiaovien,b.madinhdanh AS mabuoi FROM vuihoc."BUOI_HOC" b LEFT JOIN vuihoc."CHI_TIET_CA_LOP" c ON c.mabuoi=b.madinhdanh WHERE b.magiaoviendaythay IS NOT NULL;
 -- Legacy SQL clients may still use this view; all actual writes go to BUOI_HOC.
 CREATE OR REPLACE FUNCTION vuihoc.ghi_view_day_thay() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $view$
 BEGIN
  IF TG_OP='DELETE' THEN
   UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=NULL WHERE madinhdanh=OLD.mabuoi AND magiaoviendaythay IS NOT NULL; RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND NEW.mabuoi IS DISTINCT FROM OLD.mabuoi THEN RAISE EXCEPTION 'Không đổi khóa buổi của phân công.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi AND malop=NEW.malop) THEN RAISE EXCEPTION 'Phân công không khớp buổi/lớp.'; END IF;
  IF NEW.ngaygio IS NOT NULL AND NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi AND ngayhoc=left(NEW.ngaygio,10)::date) THEN RAISE EXCEPTION 'Ngày phân công không khớp buổi.'; END IF;
  IF NEW.sobuoi IS NOT NULL AND EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_CA_LOP" WHERE mabuoi=NEW.mabuoi AND sobuoi<>NEW.sobuoi) THEN RAISE EXCEPTION 'Số buổi phân công không khớp buổi.'; END IF;
  UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=NEW.magiaovien WHERE madinhdanh=NEW.mabuoi AND magiaoviendaythay IS DISTINCT FROM NEW.magiaovien;
  RETURN NEW;
 END $view$;
 CREATE TRIGGER ghi_view_day_thay INSTEAD OF INSERT OR UPDATE OR DELETE ON vuihoc."PHAN_CONG_DAY_THAY" FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_view_day_thay();
 CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_khoa_ca() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $key$
 BEGIN
  IF EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi GROUP BY b.malop,c.khoaca HAVING count(*)>1) THEN RAISE EXCEPTION 'Khóa giao diện ca bị trùng trong lớp.'; END IF;
  RETURN NULL;
 END $key$;
 CREATE CONSTRAINT TRIGGER kiem_tra_khoa_ca AFTER INSERT OR UPDATE ON vuihoc."CHI_TIET_CA_LOP" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_khoa_ca();
 CREATE CONSTRAINT TRIGGER kiem_tra_khoa_ca_buoi AFTER UPDATE ON vuihoc."BUOI_HOC" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (OLD.malop IS DISTINCT FROM NEW.malop) EXECUTE FUNCTION vuihoc.kiem_tra_khoa_ca();
 REVOKE ALL ON vuihoc."V_CHI_TIET_CA_LOP",vuihoc."PHAN_CONG_DAY_THAY" FROM PUBLIC,anon,authenticated;
 GRANT SELECT ON vuihoc."V_CHI_TIET_CA_LOP",vuihoc."PHAN_CONG_DAY_THAY" TO service_role;
 REVOKE ALL ON FUNCTION vuihoc.buoi_tu_ngay_gio(text,text,integer),vuihoc.luu_day_thay_chuan(text,jsonb),vuihoc.ghi_view_day_thay(),vuihoc.kiem_tra_khoa_ca() FROM PUBLIC,anon,authenticated;
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN RAISE EXCEPTION 'Owner RPC quản trị không hợp lệ.'; END IF;
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='vuihoc' AND p.proname IN ('buoi_tu_ngay_gio','luu_day_thay_chuan','ghi_view_day_thay','kiem_tra_khoa_ca') LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',r.signature,trusted_owner);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_CHI_TIET_CA_LOP" OWNER TO %I',trusted_owner);
 EXECUTE format('ALTER VIEW vuihoc."PHAN_CONG_DAY_THAY" OWNER TO %I',trusted_owner);
 NOTIFY pgrst,'reload schema';
END $normalize_lesson_metadata$;
