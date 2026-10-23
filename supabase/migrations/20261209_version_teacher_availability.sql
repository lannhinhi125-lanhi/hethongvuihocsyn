-- After 20261208. Atomic; legacy dated registrations require explicit reconciliation.
DO $availability_versions$
DECLARE f text; cfg jsonb; start_at integer; stop_at integer; r record; owner_name text; initial_time timestamptz:=clock_timestamp();
BEGIN
 IF to_regprocedure('vuihoc.lich_ranh_tai_thoi_diem(text,timestamp with time zone)') IS NOT NULL THEN RETURN; END IF;
 IF to_regprocedure('vuihoc.bao_ve_mon_lop_co_truy_vet()') IS NULL THEN RAISE EXCEPTION 'Chạy 20261208 trước.'; END IF;
 LOCK TABLE vuihoc."GIAO_VIEN",vuihoc."LICH_RANH_TUAN",vuihoc."CHI_TIET_LICH_RANH",vuihoc."LICH_RANH_DINH_KY" IN SHARE ROW EXCLUSIVE MODE;
 SET CONSTRAINTS ALL IMMEDIATE;
 IF EXISTS(SELECT 1 FROM vuihoc."LICH_RANH_TUAN") OR EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_LICH_RANH") THEN
  RAISE EXCEPTION 'Còn dữ liệu lịch theo tuần; chưa chuyển hoặc xóa dữ liệu nào.' USING HINT='Chạy supabase/diagnostics/availability_version_legacy.sql để đối soát. Lịch theo ngày không tự suy thành lịch lặp vô thời hạn.';
 END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."LICH_RANH_DINH_KY" GROUP BY magiaovien,makhunggio HAVING count(*)<>7) THEN
  RAISE EXCEPTION 'Lịch rảnh cũ thiếu ngày trong tuần; chưa chuyển dữ liệu.' USING HINT='Chạy supabase/diagnostics/availability_version_legacy.sql.';
 END IF;
 -- Reuse the empty weekly header and the populated recurring detail: three tables become two.
 DROP TABLE vuihoc."CHI_TIET_LICH_RANH";
 DROP FUNCTION vuihoc.kiem_tra_ngay_lich_ranh();
 DROP TRIGGER khoa_dinh_danh ON vuihoc."LICH_RANH_TUAN";
 DROP TRIGGER IF EXISTS set_updated_at ON vuihoc."LICH_RANH_TUAN";
 DROP FUNCTION vuihoc.khoa_dinh_danh_lich_tuan();
 ALTER TABLE vuihoc."LICH_RANH_TUAN" RENAME TO "PHIEN_BAN_LICH_RANH";
 ALTER TABLE vuihoc."PHIEN_BAN_LICH_RANH" DROP COLUMN ngaycuoituan,DROP COLUMN ngaydautuan,DROP COLUMN namhoc,DROP COLUMN ngaytao,DROP COLUMN ngaycapnhat,
  ADD COLUMN hieuluctu timestamptz NOT NULL DEFAULT clock_timestamp(),ADD UNIQUE(magiaovien,hieuluctu);
 INSERT INTO vuihoc."PHIEN_BAN_LICH_RANH"(magiaovien,hieuluctu) SELECT DISTINCT magiaovien,initial_time FROM vuihoc."LICH_RANH_DINH_KY";
 ALTER TABLE vuihoc."LICH_RANH_DINH_KY" RENAME TO "CHI_TIET_PHIEN_BAN_LICH_RANH";
 ALTER TABLE vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" ADD COLUMN maphienban text REFERENCES vuihoc."PHIEN_BAN_LICH_RANH"(madinhdanh) ON DELETE CASCADE;
 UPDATE vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" d SET maphienban=p.madinhdanh FROM vuihoc."PHIEN_BAN_LICH_RANH" p WHERE p.magiaovien=d.magiaovien;
 ALTER TABLE vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" DROP COLUMN magiaovien,ALTER COLUMN maphienban SET NOT NULL,ADD PRIMARY KEY(maphienban,makhunggio,thutrongtuan);

 CREATE FUNCTION vuihoc.lich_ranh_tai_thoi_diem(p_teacher text,p_at timestamptz)
 RETURNS TABLE(makhunggio text,thutrongtuan integer,trangthai text) LANGUAGE sql STABLE SET search_path=pg_catalog AS $at$
  SELECT d.makhunggio,d.thutrongtuan,d.trangthai FROM vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" d
  WHERE d.maphienban=(SELECT p.madinhdanh FROM vuihoc."PHIEN_BAN_LICH_RANH" p WHERE p.magiaovien=p_teacher AND p.hieuluctu<=p_at ORDER BY p.hieuluctu DESC LIMIT 1)
 $at$;
 CREATE VIEW vuihoc."LICH_RANH_DINH_KY" WITH(security_invoker=true) AS
  SELECT p.magiaovien,d.makhunggio,d.thutrongtuan,d.trangthai FROM vuihoc."PHIEN_BAN_LICH_RANH" p
  JOIN vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" d ON d.maphienban=p.madinhdanh
  WHERE p.hieuluctu<=clock_timestamp() AND NOT EXISTS(SELECT 1 FROM vuihoc."PHIEN_BAN_LICH_RANH" n WHERE n.magiaovien=p.magiaovien AND n.hieuluctu>p.hieuluctu AND n.hieuluctu<=clock_timestamp());
 CREATE FUNCTION vuihoc.lich_ranh_json(p_version text) RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $json$
  SELECT coalesce(jsonb_object_agg(s.makhunggio,s.days),'{}') FROM (
   SELECT d.makhunggio,jsonb_agg(d.trangthai ORDER BY d.thutrongtuan) days FROM vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" d WHERE d.maphienban=p_version GROUP BY d.makhunggio) s
 $json$;
 CREATE FUNCTION vuihoc.luu_phien_ban_lich_ranh(p_teacher text,p_schedule jsonb) RETURNS text
 LANGUAGE plpgsql SET search_path=pg_catalog AS $save$
 DECLARE old_id text; new_id text; previous_time timestamptz; c record; day record; slot text; normalized jsonb:='{}'; old_schedule jsonb; actor text:=nullif(current_setting('vuihoc.actor',true),'');
 BEGIN
  PERFORM 1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=p_teacher FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy giáo viên nguồn.'; END IF;
  IF jsonb_typeof(p_schedule) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Lịch rảnh phải là đối tượng khung giờ và đủ 7 ngày.'; END IF;
  SELECT madinhdanh,hieuluctu INTO old_id,previous_time FROM vuihoc."PHIEN_BAN_LICH_RANH" WHERE magiaovien=p_teacher ORDER BY hieuluctu DESC LIMIT 1;
  old_schedule:=vuihoc.lich_ranh_json(old_id);
  FOR c IN SELECT * FROM jsonb_each(p_schedule) LOOP
   SELECT k.madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" k WHERE k.madinhdanh=c.key OR k.makhunggio=c.key ORDER BY k.madinhdanh=c.key DESC LIMIT 1;
   IF slot IS NULL OR jsonb_typeof(c.value) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Lịch rảnh sai khung giờ hoặc định dạng: %',c.key; END IF;
   IF jsonb_array_length(c.value)<>7 OR normalized ? slot THEN RAISE EXCEPTION 'Lịch rảnh cần đủ 7 ngày và không trùng khung giờ: %',c.key; END IF;
   FOR day IN SELECT value,ordinality FROM jsonb_array_elements(c.value) WITH ORDINALITY LOOP
    IF jsonb_typeof(day.value)<>'string' OR day.value#>>'{}' NOT IN ('free','none','busy') THEN RAISE EXCEPTION 'Trạng thái lịch rảnh không hợp lệ.'; END IF;
    IF day.value#>>'{}'='busy' AND old_schedule->slot->(day.ordinality::int-1) IS DISTINCT FROM day.value THEN RAISE EXCEPTION 'Không tự đăng ký trạng thái đã xếp lớp.'; END IF;
   END LOOP;
   normalized:=normalized||jsonb_build_object(slot,c.value);
  END LOOP;
  IF old_id IS NOT NULL AND old_schedule=normalized THEN RETURN old_id; END IF;
  INSERT INTO vuihoc."PHIEN_BAN_LICH_RANH"(magiaovien,hieuluctu,manguoicapnhat)
   VALUES(p_teacher,greatest(clock_timestamp(),previous_time+interval '1 microsecond'),actor) RETURNING madinhdanh INTO new_id;
  INSERT INTO vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH"(maphienban,makhunggio,thutrongtuan,trangthai)
   SELECT new_id,entry.key,d.ordinality-1,d.value FROM jsonb_each(normalized) entry CROSS JOIN LATERAL jsonb_array_elements_text(entry.value) WITH ORDINALITY d;
  RETURN new_id;
 END $save$;
 -- Replace the old destructive writer in whichever historical wrapper now owns it.
 start_at:=0;
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vuihoc' AND p.prokind='f' AND p.prosrc LIKE '%DELETE FROM vuihoc."LICH_RANH_DINH_KY"%' LOOP
  f:=pg_get_functiondef(r.oid);start_at:=strpos(f,'  IF p_row ? ''lichranh'' THEN');stop_at:=strpos(substr(f,start_at),'  IF p_backfill THEN');
  IF start_at=0 OR stop_at=0 THEN RAISE EXCEPTION 'Không nhận dạng được bộ ghi lịch rảnh; hủy giao dịch.'; END IF;
  f:=substr(f,1,start_at-1)||'  IF p_row ? ''lichranh'' THEN PERFORM vuihoc.luu_phien_ban_lich_ranh(id,p_row->''lichranh''); END IF;'||chr(10)||substr(f,start_at+stop_at-1);
  EXECUTE f;
 END LOOP;
 IF start_at=0 THEN RAISE EXCEPTION 'Thiếu bộ ghi lịch rảnh chuẩn hóa.'; END IF;
 -- Legacy busy cells released by operations produce a new version; old versions remain intact.
 CREATE OR REPLACE FUNCTION vuihoc.giai_phong_ca_lop(p_class text,p_teacher text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $release$
 DECLARE t record; c record; schedule jsonb;
 BEGIN
  FOR t IN SELECT DISTINCT a.magiaovien FROM vuihoc."LICH_RANH_DINH_KY" a WHERE a.trangthai='busy' AND (a.magiaovien=p_teacher OR EXISTS(SELECT 1 FROM vuihoc."V_BUOI_HOC" b WHERE b.malop=p_class AND b.magiaoviendaythay=a.magiaovien)) ORDER BY a.magiaovien LOOP
   PERFORM 1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=t.magiaovien FOR UPDATE;
   SELECT vuihoc.lich_ranh_json(p.madinhdanh) INTO schedule FROM vuihoc."PHIEN_BAN_LICH_RANH" p WHERE p.magiaovien=t.magiaovien ORDER BY p.hieuluctu DESC LIMIT 1;
   FOR c IN SELECT a.* FROM vuihoc."LICH_RANH_DINH_KY" a WHERE a.magiaovien=t.magiaovien AND a.trangthai='busy'
    AND NOT vuihoc.ca_giao_vien_con_lop(a.magiaovien,a.makhunggio,a.thutrongtuan)
    AND ((a.magiaovien=p_teacher AND EXISTS(SELECT 1 FROM vuihoc."LICH_LOP" s JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio JOIN vuihoc."KHUNG_GIO" target ON target.madinhdanh=a.makhunggio WHERE s.malop=p_class AND s.thutrongtuan=a.thutrongtuan+1 AND k.giobatdau<target.gioketthuc AND target.giobatdau<k.gioketthuc))
     OR EXISTS(SELECT 1 FROM vuihoc."V_BUOI_HOC" b JOIN vuihoc."KHUNG_GIO" target ON target.madinhdanh=a.makhunggio WHERE b.malop=p_class AND b.magiaoviendaythay=a.magiaovien AND extract(isodow FROM b.ngayhoc)::int=a.thutrongtuan+1 AND b.batdau<target.gioketthuc AND target.giobatdau<b.ketthuc))
   LOOP schedule:=jsonb_set(schedule,ARRAY[c.makhunggio,c.thutrongtuan::text],'"free"'); END LOOP;
   PERFORM vuihoc.luu_phien_ban_lich_ranh(t.magiaovien,schedule);
  END LOOP;
 END $release$;
 ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_phien_ban_lich_ranh;
 CREATE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $read$
 DECLARE result jsonb; history jsonb; effective timestamptz;
 BEGIN
  result:=vuihoc.du_lieu_quan_he_truoc_phien_ban_lich_ranh(p_table,p_row);
  IF p_table='GIAO_VIEN' AND result IS NOT NULL THEN
   SELECT p.hieuluctu INTO effective FROM vuihoc."PHIEN_BAN_LICH_RANH" p WHERE p.magiaovien=p_row->>'madinhdanh' AND p.hieuluctu<=clock_timestamp() ORDER BY p.hieuluctu DESC LIMIT 1;
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.madinhdanh,'effectiveFrom',p.hieuluctu,'effectiveUntil',p.until_at,'schedule',vuihoc.lich_ranh_json(p.madinhdanh)) ORDER BY p.hieuluctu DESC),'[]') INTO history FROM (
    SELECT p.*,lead(p.hieuluctu) OVER(ORDER BY p.hieuluctu) until_at FROM vuihoc."PHIEN_BAN_LICH_RANH" p WHERE p.magiaovien=p_row->>'madinhdanh') p;
   result:=result||jsonb_build_object('lichranhhieuluctu',effective,'lichsuphienbanlichranh',history);
  END IF;RETURN result;
 END $read$;
 cfg:=vuihoc.business_config();
 cfg:=jsonb_set(cfg,'{teachers,columns}',(cfg#>'{teachers,columns}')||'["lichranhhieuluctu","lichsuphienbanlichranh"]'::jsonb);
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(cfg::text)||'::jsonb');
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'IF conf IS NULL THEN')=0 THEN RAISE EXCEPTION 'Không nhận diện được RPC ghi giáo viên.'; END IF;
 f:=replace(f,'IF conf IS NULL THEN',$readonly$
 IF ds='teachers' AND (coalesce(b,'{}'::jsonb)||coalesce(v,'{}'::jsonb)) ?| ARRAY['lichranhhieuluctu','lichsuphienbanlichranh'] THEN
  RAISE EXCEPTION 'Hiệu lực và lịch sử lịch rảnh chỉ được truy vấn; cập nhật lịch để tạo phiên bản mới.';
 END IF;
 IF conf IS NULL THEN$readonly$);EXECUTE f;
 SELECT pg_get_userbyid(proowner) INTO owner_name FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF owner_name IN ('anon','authenticated','service_role','authenticator') OR owner_name IS NULL THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOR r IN SELECT signature FROM unnest(ARRAY['lich_ranh_tai_thoi_diem(text,timestamp with time zone)','lich_ranh_json(text)','luu_phien_ban_lich_ranh(text,jsonb)','giai_phong_ca_lop(text,text)','du_lieu_quan_he(text,jsonb)','du_lieu_quan_he_truoc_phien_ban_lich_ranh(text,jsonb)']) signature LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',r.signature,owner_name);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."LICH_RANH_DINH_KY" OWNER TO %I',owner_name);
 REVOKE ALL ON vuihoc."LICH_RANH_DINH_KY" FROM PUBLIC,anon,authenticated;GRANT SELECT ON vuihoc."LICH_RANH_DINH_KY" TO service_role;
 ALTER TABLE vuihoc."PHIEN_BAN_LICH_RANH" ENABLE ROW LEVEL SECURITY;ALTER TABLE vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON vuihoc."PHIEN_BAN_LICH_RANH",vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" FROM PUBLIC,anon,authenticated;
 GRANT ALL ON vuihoc."PHIEN_BAN_LICH_RANH",vuihoc."CHI_TIET_PHIEN_BAN_LICH_RANH" TO service_role;
 NOTIFY pgrst,'reload schema';
END $availability_versions$;
