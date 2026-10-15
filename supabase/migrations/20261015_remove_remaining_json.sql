-- Run AFTER apply_relational_update.sql (including the JSON-null fix).
-- JSON remains an RPC transport format only. No business JSON columns remain.
BEGIN;
LOCK TABLE vuihoc."LOP_HOC",vuihoc."BUOI_HOC",vuihoc."GIAO_VIEN",vuihoc."BIEN_BAN_DU_GIO" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS vuihoc."HOC_LIEU_LOP" (
 malop text NOT NULL REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE CASCADE,
 thutu integer NOT NULL CHECK(thutu>0), thang text NOT NULL, tuan text NOT NULL,
 sobuoi integer NOT NULL CHECK(sobuoi>0), tieude text NOT NULL,
 lienketslide text NOT NULL, lienketlms text NOT NULL, PRIMARY KEY(malop,thutu)
);
CREATE TABLE IF NOT EXISTS vuihoc."PHAN_CONG_DAY_THAY" (
 malop text NOT NULL REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE CASCADE,
 thutu integer NOT NULL CHECK(thutu>0), sobuoi integer NOT NULL CHECK(sobuoi>0),
 ngaygio text NOT NULL, magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh),
 PRIMARY KEY(malop,thutu)
);
-- Presentation/session metadata, linked to the dated lesson. Attendance and
-- comments are stored in DIEM_DANH_BUOI_HOC / NHAN_XET_BUOI_HOC, not copied here.
CREATE TABLE IF NOT EXISTS vuihoc."CHI_TIET_CA_LOP" (
 malop text NOT NULL REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE CASCADE,
 khoaca text NOT NULL, mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh),
 sobuoi integer NOT NULL CHECK(sobuoi>0), ngaygio text NOT NULL, tieude text,
 trangthaihienthi text, giovaohienthi text, hotennguoivao text,
 hoclieugiaovien text, hoclieuhocsinh text, baitaplms text,
 magiaoviendaythay text REFERENCES vuihoc."GIAO_VIEN"(madinhdanh),
 PRIMARY KEY(malop,khoaca)
);
-- Presence flags distinguish an untouched optional field from an explicitly
-- saved empty map. They do not contain business data or serialized objects.
ALTER TABLE vuihoc."CHI_TIET_CA_LOP"
 ADD COLUMN IF NOT EXISTS codiemdanh boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS conhanxet boolean NOT NULL DEFAULT false;
ALTER TABLE vuihoc."GIAO_VIEN"
 ADD COLUMN IF NOT EXISTS diemtc1 numeric CHECK(diemtc1 BETWEEN 0 AND 10),
 ADD COLUMN IF NOT EXISTS diemtc2 numeric CHECK(diemtc2 BETWEEN 0 AND 10),
 ADD COLUMN IF NOT EXISTS diemtc3 numeric CHECK(diemtc3 BETWEEN 0 AND 10);
ALTER TABLE vuihoc."BIEN_BAN_DU_GIO"
 ADD COLUMN IF NOT EXISTS diemtc1 numeric CHECK(diemtc1 BETWEEN 0 AND 10),
 ADD COLUMN IF NOT EXISTS diemtc2 numeric CHECK(diemtc2 BETWEEN 0 AND 10),
 ADD COLUMN IF NOT EXISTS diemtc3 numeric CHECK(diemtc3 BETWEEN 0 AND 10);
ALTER TABLE vuihoc."BUOI_HOC"
 ADD COLUMN IF NOT EXISTS hoclieutieude text,
 ADD COLUMN IF NOT EXISTS hoclieuslide text,
 ADD COLUMN IF NOT EXISTS hoclieulms text,
 ADD COLUMN IF NOT EXISTS hoclieugiaovien text,
 ADD COLUMN IF NOT EXISTS hoclieuhocsinh text,
 ADD COLUMN IF NOT EXISTS baitaplms text;

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_truong_json(p_data jsonb,p_keys text[])
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF p_data IS NULL OR p_data='null'::jsonb THEN RETURN; END IF;
 IF jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'Dữ liệu cần là object để chuyển sang các cột'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) k WHERE NOT k=ANY(p_keys)) THEN
  RAISE EXCEPTION 'Có trường chưa được ánh xạ sang cột: %',p_data-p_keys;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.diem_tieu_chi_truy_van(p_row jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN p_row->>'diemtc1' IS NULL AND p_row->>'diemtc2' IS NULL AND p_row->>'diemtc3' IS NULL
  THEN 'null'::jsonb ELSE jsonb_strip_nulls(jsonb_build_object('tc1',p_row->'diemtc1','tc2',p_row->'diemtc2','tc3',p_row->'diemtc3')) END
$$;
CREATE OR REPLACE FUNCTION vuihoc.hoc_lieu_buoi_truy_van(p_row jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_strip_nulls(jsonb_build_object('title',p_row->'hoclieutieude','slide',p_row->'hoclieuslide',
  'lms',p_row->'hoclieulms','materialGv',p_row->'hoclieugiaovien','materialHs',p_row->'hoclieuhocsinh','exerciseLms',p_row->'baitaplms'))
$$;
CREATE OR REPLACE FUNCTION vuihoc.lop_truong_truy_van(p_row jsonb)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT p_row||jsonb_build_object(
 'hoclieu',(SELECT coalesce(jsonb_agg(jsonb_build_object('month',h.thang,'week',h.tuan,'session',h.sobuoi,
  'title',h.tieude,'slide',h.lienketslide,'lms',h.lienketlms) ORDER BY h.thutu),'[]')
  FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=p_row->>'madinhdanh'),
 'phancongdaythay',(SELECT coalesce(jsonb_agg(jsonb_build_object('sessionNum',c.sobuoi,'dateStr',c.ngaygio,
  'teacherId',c.magiaovien,'teacherName',g.hoten) ORDER BY c.thutu),'[]') FROM vuihoc."PHAN_CONG_DAY_THAY" c
  JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=c.magiaovien WHERE c.malop=p_row->>'madinhdanh'),
 'chitietcahoc',(SELECT coalesce(jsonb_object_agg(c.khoaca,
  jsonb_strip_nulls(jsonb_build_object('sessionNum',c.sobuoi,'dateStr',c.ngaygio,'title',c.tieude,
   'status',c.trangthaihienthi,'checkinTime',c.giovaohienthi,'checkinBy',c.hotennguoivao,
   'materialGv',c.hoclieugiaovien,'materialHs',c.hoclieuhocsinh,'exerciseLms',c.baitaplms,
   'checkinAt',b.vaolopluc,'checkoutAt',b.ketthucluc,'checkinUserId',b.manguoivaolop,
   'checkoutUserId',b.manguoiketthuc,'teacherAttendance',b.chuyencan,
   'coverTeacherId',c.magiaoviendaythay,'coverTeacherName',g.hoten))
  ||CASE WHEN c.codiemdanh THEN jsonb_build_object('attendance',
   (SELECT coalesce(jsonb_object_agg(a.mahocsinh,a.trangthai),'{}') FROM vuihoc."DIEM_DANH_BUOI_HOC" a WHERE a.mabuoi=c.mabuoi)) ELSE '{}'::jsonb END
  ||CASE WHEN c.conhanxet THEN jsonb_build_object('feedback',
   (SELECT coalesce(jsonb_object_agg(a.mahocsinh,a.noidung),'{}') FROM vuihoc."NHAN_XET_BUOI_HOC" a WHERE a.mabuoi=c.mabuoi)) ELSE '{}'::jsonb END
  ),'{}') FROM vuihoc."CHI_TIET_CA_LOP" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
  LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=c.magiaoviendaythay WHERE c.malop=p_row->>'madinhdanh'))
$$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_cac_truong_con(p_table text,p_row jsonb,p_backfill boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $write$
DECLARE id text:=p_row->>'madinhdanh'; x record; a record; s jsonb; cls vuihoc."LOP_HOC";
 d date; slot text; hours text[]; lesson text; changed jsonb:='{}'; old_sessions jsonb; points jsonb;
BEGIN
 IF p_table IN ('GIAO_VIEN','BIEN_BAN_DU_GIO') AND p_row ? 'diemtieuchi' THEN
  points:=p_row->'diemtieuchi'; PERFORM vuihoc.kiem_tra_truong_json(points,ARRAY['tc1','tc2','tc3']);
  EXECUTE format('UPDATE vuihoc.%I SET diemtc1=$1,diemtc2=$2,diemtc3=$3 WHERE madinhdanh=$4',p_table)
   USING (points->>'tc1')::numeric,(points->>'tc2')::numeric,(points->>'tc3')::numeric,id;
 END IF;
 IF p_table='BUOI_HOC' AND p_row ? 'hoclieu' THEN
  s:=p_row->'hoclieu';
  PERFORM vuihoc.kiem_tra_truong_json(s,ARRAY['title','slide','lms','materialGv','materialHs','exerciseLms']);
  UPDATE vuihoc."BUOI_HOC" SET hoclieutieude=s->>'title',hoclieuslide=s->>'slide',hoclieulms=s->>'lms',
   hoclieugiaovien=s->>'materialGv',hoclieuhocsinh=s->>'materialHs',baitaplms=s->>'exerciseLms' WHERE madinhdanh=id;
 END IF;
 IF p_table<>'LOP_HOC' THEN RETURN; END IF;
 SELECT * INTO STRICT cls FROM vuihoc."LOP_HOC" WHERE madinhdanh=id;
 IF p_row ? 'hoclieu' THEN
  DELETE FROM vuihoc."HOC_LIEU_LOP" WHERE malop=id;
  FOR x IN SELECT value,ordinality FROM jsonb_array_elements(coalesce(nullif(p_row->'hoclieu','null'),'[]')) WITH ORDINALITY LOOP
   PERFORM vuihoc.kiem_tra_truong_json(x.value,ARRAY['month','week','session','title','slide','lms']);
   INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES(id,x.ordinality,x.value->>'month',x.value->>'week',
    (x.value->>'session')::integer,x.value->>'title',x.value->>'slide',x.value->>'lms');
  END LOOP;
 END IF;
 IF p_row ? 'phancongdaythay' THEN
  DELETE FROM vuihoc."PHAN_CONG_DAY_THAY" WHERE malop=id;
  FOR x IN SELECT value,ordinality FROM jsonb_array_elements(coalesce(nullif(p_row->'phancongdaythay','null'),'[]')) WITH ORDINALITY LOOP
   PERFORM vuihoc.kiem_tra_truong_json(x.value,ARRAY['sessionNum','dateStr','teacherId','teacherName']);
   INSERT INTO vuihoc."PHAN_CONG_DAY_THAY" VALUES(id,x.ordinality,(x.value->>'sessionNum')::integer,x.value->>'dateStr',x.value->>'teacherId');
  END LOOP;
 END IF;
 IF NOT p_row ? 'chitietcahoc' THEN RETURN; END IF;
 old_sessions:=vuihoc.lop_truong_truy_van(to_jsonb(cls))->'chitietcahoc';
 FOR x IN SELECT * FROM jsonb_each(coalesce(nullif(p_row->'chitietcahoc','null'),'{}')) LOOP
  s:=x.value;
  PERFORM vuihoc.kiem_tra_truong_json(s,ARRAY['sessionNum','dateStr','title','status','checkinTime','checkinAt','checkinUserId',
   'checkoutAt','checkoutUserId','teacherAttendance','checkinBy','coverTeacherId','coverTeacherName',
   'materialGv','materialHs','exerciseLms','attendance','feedback','feedbackCriteria']);
  IF NOT p_backfill AND s=old_sessions->x.key THEN CONTINUE; END IF;
  d:=left(s->>'dateStr',10)::date;
  hours:=regexp_match(s->>'dateStr','([0-9]{2}:[0-9]{2}) *- *([0-9]{2}:[0-9]{2})');
  SELECT madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=hours[1]||'-'||hours[2] LIMIT 1;
  IF slot IS NULL OR cls.magiaovien IS NULL THEN RAISE EXCEPTION 'Ca % của lớp % thiếu khung giờ/giáo viên',x.key,id; END IF;
  SELECT madinhdanh INTO lesson FROM vuihoc."BUOI_HOC" WHERE malop=id AND ngayhoc=d AND makhunggio=slot;
  IF lesson IS NULL THEN
   INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,lienketphonghoc)
    VALUES(id,d,slot,hours[1]::time,hours[2]::time,cls.magiaovien,cls.lienketphonghoc) RETURNING madinhdanh INTO lesson;
  END IF;
  INSERT INTO vuihoc."CHI_TIET_CA_LOP"(malop,khoaca,mabuoi,sobuoi,ngaygio,tieude,trangthaihienthi,giovaohienthi,hotennguoivao,
   hoclieugiaovien,hoclieuhocsinh,baitaplms,magiaoviendaythay,codiemdanh,conhanxet)
  VALUES(id,x.key,lesson,(s->>'sessionNum')::integer,s->>'dateStr',s->>'title',s->>'status',s->>'checkinTime',s->>'checkinBy',
   s->>'materialGv',s->>'materialHs',s->>'exerciseLms',nullif(s->>'coverTeacherId',''),s ? 'attendance',s ? 'feedback')
  ON CONFLICT(malop,khoaca) DO UPDATE SET mabuoi=excluded.mabuoi,sobuoi=excluded.sobuoi,ngaygio=excluded.ngaygio,
   tieude=excluded.tieude,trangthaihienthi=excluded.trangthaihienthi,giovaohienthi=excluded.giovaohienthi,
   hotennguoivao=excluded.hotennguoivao,hoclieugiaovien=excluded.hoclieugiaovien,hoclieuhocsinh=excluded.hoclieuhocsinh,
   baitaplms=excluded.baitaplms,magiaoviendaythay=excluded.magiaoviendaythay,codiemdanh=excluded.codiemdanh,conhanxet=excluded.conhanxet;
  IF s ? 'attendance' THEN
   FOR a IN SELECT * FROM jsonb_each_text(s->'attendance') LOOP
    IF NOT a.key=ANY(cls.danhsachmahocsinh) THEN RAISE EXCEPTION 'Học sinh không thuộc lớp: %',a.key; END IF;
    INSERT INTO vuihoc."DIEM_DANH_BUOI_HOC"(mabuoi,mahocsinh,trangthai) VALUES(lesson,a.key,a.value)
     ON CONFLICT(mabuoi,mahocsinh) DO UPDATE SET trangthai=excluded.trangthai;
   END LOOP;
   DELETE FROM vuihoc."DIEM_DANH_BUOI_HOC" WHERE mabuoi=lesson AND NOT(s->'attendance' ? mahocsinh);
  END IF;
  IF s ? 'feedback' OR s ? 'feedbackCriteria' THEN
   FOR a IN SELECT key FROM jsonb_each(coalesce(s->'feedback','{}')||coalesce(s->'feedbackCriteria','{}')) LOOP
    IF NOT a.key=ANY(cls.danhsachmahocsinh) THEN RAISE EXCEPTION 'Học sinh không thuộc lớp: %',a.key; END IF;
    INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung) VALUES(lesson,a.key,coalesce(s->'feedback'->>a.key,''))
     ON CONFLICT(mabuoi,mahocsinh) DO UPDATE SET noidung=CASE WHEN s->'feedback' ? a.key THEN excluded.noidung ELSE vuihoc."NHAN_XET_BUOI_HOC".noidung END;
    IF s->'feedbackCriteria' ? a.key THEN PERFORM vuihoc.luu_tieu_chi_nhan_xet(lesson,a.key,s->'feedbackCriteria'->a.key); END IF;
   END LOOP;
  END IF;
  IF NOT p_backfill THEN
   UPDATE vuihoc."BUOI_HOC" SET tieude=coalesce(s->>'title',tieude),
    vaolopluc=coalesce(nullif(s->>'checkinAt','')::timestamptz,vaolopluc),
    ketthucluc=coalesce(nullif(s->>'checkoutAt','')::timestamptz,ketthucluc),
    manguoivaolop=coalesce(nullif(s->>'checkinUserId',''),manguoivaolop),
    manguoiketthuc=coalesce(nullif(s->>'checkoutUserId',''),manguoiketthuc),
    chuyencan=coalesce(s->>'teacherAttendance',chuyencan),
    trangthai=CASE WHEN s->>'status'='Đang học' AND s->>'checkinAt' IS NOT NULL THEN 'DANG_HOC' ELSE trangthai END
    WHERE madinhdanh=lesson;
   changed:=changed||jsonb_build_object(x.key,s);
  END IF;
 END LOOP;
 DELETE FROM vuihoc."CHI_TIET_CA_LOP" WHERE malop=id AND NOT(coalesce(nullif(p_row->'chitietcahoc','null'),'{}') ? khoaca);
 IF NOT p_backfill AND changed<>'{}' THEN
  PERFORM vuihoc.ghi_cong_tu_cac_truong(to_jsonb(cls)||jsonb_build_object('chitietcahoc',changed));
 END IF;
END $write$;

-- Keep the existing authorization, locks, optimistic comparisons and payroll
-- completion rules. Only replace storage access below.
DO $functions$
DECLARE f text;
BEGIN
 IF to_regprocedure('vuihoc.ghi_cong_tu_cac_truong(jsonb)') IS NULL THEN
  f:=pg_get_functiondef('vuihoc.ghi_cong_khi_du_nhan_xet()'::regprocedure);
  f:=replace(f,'vuihoc.ghi_cong_khi_du_nhan_xet()','vuihoc.ghi_cong_tu_cac_truong(p_lop jsonb)');
  f:=replace(f,'RETURNS trigger','RETURNS void');
  f:=replace(f,'NEW.chitietcahoc','(p_lop->''chitietcahoc'')');
  f:=replace(f,'NEW.danhsachmahocsinh','ARRAY(SELECT jsonb_array_elements_text(p_lop->''danhsachmahocsinh''))');
  f:=replace(f,'NEW.magiaovien','(p_lop->>''magiaovien'')');
  f:=replace(f,'NEW.madinhdanh','(p_lop->>''madinhdanh'')');
  f:=replace(f,'NEW.lienketphonghoc','(p_lop->>''lienketphonghoc'')');
  f:=replace(f,'RETURN NEW;','RETURN;'); EXECUTE f;
 END IF;
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_bo_json(text,jsonb)') IS NULL THEN
  f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
  f:=replace(f,'e.diemtieuchi','vuihoc.diem_tieu_chi_truy_van(to_jsonb(e))'); EXECUTE f;
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_bo_json;
 END IF;
 IF to_regprocedure('vuihoc.ghi_du_lieu_quan_he_truoc_bo_json(text,jsonb,boolean)') IS NULL THEN
  f:=pg_get_functiondef('vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean)'::regprocedure);
  f:=replace(f,'xeploai,diemtieuchi,nhanxetchung','xeploai,diemtc1,diemtc2,diemtc3,nhanxetchung');
  f:=replace(f,'ev->''criteriaScores'',','(ev->''criteriaScores''->>''tc1'')::numeric,(ev->''criteriaScores''->>''tc2'')::numeric,(ev->''criteriaScores''->>''tc3'')::numeric,');
  f:=replace(f,'diemtieuchi=excluded.diemtieuchi','diemtc1=excluded.diemtc1,diemtc2=excluded.diemtc2,diemtc3=excluded.diemtc3'); EXECUTE f;
  ALTER FUNCTION vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) RENAME TO ghi_du_lieu_quan_he_truoc_bo_json;
 END IF;
END $functions$;

CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb:=p_row;
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 IF p_table='LOP_HOC' THEN r:=vuihoc.lop_truong_truy_van(r);
 ELSIF p_table IN ('GIAO_VIEN','BIEN_BAN_DU_GIO') THEN r:=r||jsonb_build_object('diemtieuchi',vuihoc.diem_tieu_chi_truy_van(r));
 ELSIF p_table='BUOI_HOC' THEN r:=r||jsonb_build_object('hoclieu',vuihoc.hoc_lieu_buoi_truy_van(r)); END IF;
 RETURN vuihoc.du_lieu_quan_he_truoc_bo_json(p_table,r);
END $$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_du_lieu_quan_he(p_table text,p_row jsonb,p_backfill boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_bo_json(p_table,p_row,p_backfill);
 PERFORM vuihoc.ghi_cac_truong_con(p_table,p_row,p_backfill);
END $$;

-- Backfill with the old columns still present. Unknown keys abort the entire
-- transaction rather than silently losing fields when columns are dropped.
DO $backfill$
DECLARE t text; r jsonb; f text;
BEGIN
 FOREACH t IN ARRAY ARRAY['GIAO_VIEN','BIEN_BAN_DU_GIO','BUOI_HOC','LOP_HOC'] LOOP
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=t AND data_type='jsonb') THEN
   FOR r IN EXECUTE format('SELECT to_jsonb(t) FROM vuihoc.%I t',t) LOOP
    PERFORM vuihoc.ghi_cac_truong_con(t,r,true);
   END LOOP;
  END IF;
 END LOOP;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF position('vuihoc.lop_truong_truy_van' IN f)=0 THEN
  -- Mark the patch and remove virtual fields from the actual SQL column list.
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE',
   'FROM jsonb_object_keys(v) k WHERE NOT (conf->>''table''=''LOP_HOC'' AND k IN (''hoclieu'',''chitietcahoc'',''phancongdaythay'')) AND NOT (conf->>''table'' IN (''GIAO_VIEN'',''BIEN_BAN_DU_GIO'') AND k=''diemtieuchi'') AND NOT (conf->>''table''=''BUOI_HOC'' AND k=''hoclieu'') AND');
  f:=replace(f,'SELECT string_agg(format(''%I'',k)',
   'IF ds=''teacher_evaluations'' THEN v:=v||jsonb_build_object(''diemtc1'',v->''diemtieuchi''->''tc1'',''diemtc2'',v->''diemtieuchi''->''tc2'',''diemtc3'',v->''diemtieuchi''->''tc3''); END IF; SELECT string_agg(format(''%I'',k)');
  -- Harmless marker keeps this transformation idempotent.
  f:=replace(f,'actor:=vuihoc.nguoi_dung_phien(p_token);','/* vuihoc.lop_truong_truy_van: scalar storage */ actor:=vuihoc.nguoi_dung_phien(p_token);'); EXECUTE f;
 END IF;
 f:=pg_get_functiondef('public.vuihoc_report_lesson_incident(text,text,date,text,text,text)'::regprocedure);
 f:=replace(f,'cls.phancongdaythay','(vuihoc.lop_truong_truy_van(to_jsonb(cls))->''phancongdaythay'')'); EXECUTE f;
END $backfill$;

DROP TRIGGER IF EXISTS luu_tieu_chi_tu_lop ON vuihoc."LOP_HOC";
DROP TRIGGER IF EXISTS ghi_cong_khi_du_nhan_xet ON vuihoc."LOP_HOC";
DROP FUNCTION IF EXISTS vuihoc.luu_tieu_chi_tu_lop();
DROP FUNCTION IF EXISTS vuihoc.ghi_cong_khi_du_nhan_xet();
ALTER TABLE vuihoc."LOP_HOC" DROP COLUMN IF EXISTS hoclieu,DROP COLUMN IF EXISTS chitietcahoc,DROP COLUMN IF EXISTS phancongdaythay;
ALTER TABLE vuihoc."BUOI_HOC" DROP COLUMN IF EXISTS hoclieu;
ALTER TABLE vuihoc."GIAO_VIEN" DROP COLUMN IF EXISTS diemtieuchi;
ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" DROP COLUMN IF EXISTS diemtieuchi;
ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" ALTER COLUMN diemtc1 SET NOT NULL,ALTER COLUMN diemtc2 SET NOT NULL,ALTER COLUMN diemtc3 SET NOT NULL;

DO $security$
DECLARE t text; r record;
BEGIN
 FOREACH t IN ARRAY ARRAY['HOC_LIEU_LOP','PHAN_CONG_DAY_THAY','CHI_TIET_CA_LOP'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON vuihoc.%I TO service_role',t);
  EXECUTE format('DROP TRIGGER IF EXISTS audit_business_change ON vuihoc.%I',t);
  EXECUTE format('CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu(''malop'')',t);
 END LOOP;
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='vuihoc' AND p.proname IN ('kiem_tra_truong_json','diem_tieu_chi_truy_van','hoc_lieu_buoi_truy_van',
   'lop_truong_truy_van','ghi_cac_truong_con','ghi_cong_tu_cac_truong','du_lieu_quan_he','ghi_du_lieu_quan_he',
   'du_lieu_quan_he_truoc_bo_json','ghi_du_lieu_quan_he_truoc_bo_json') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns c JOIN information_schema.tables t USING(table_catalog,table_schema,table_name)
  WHERE c.table_schema='vuihoc' AND t.table_type='BASE TABLE' AND c.data_type IN ('json','jsonb')) THEN
  RAISE EXCEPTION 'Vẫn còn cột JSON trong bảng vuihoc; hủy giao dịch để kiểm tra';
 END IF;
END $security$;
NOTIFY pgrst,'reload schema';
COMMIT;
