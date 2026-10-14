-- Included in apply_relational_update.sql. Do not run older migrations afterwards.
BEGIN;
ALTER TABLE vuihoc."LUA_CHON_CAP_HOC" ADD COLUMN IF NOT EXISTS macha text;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='lua_chon_cap_hoc_cha_fk') THEN
  ALTER TABLE vuihoc."LUA_CHON_CAP_HOC" ADD CONSTRAINT lua_chon_cap_hoc_cha_fk
   FOREIGN KEY(macaphoc,macha) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh) DEFERRABLE INITIALLY DEFERRED;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS vuihoc."GIAO_VIEN_KHOI" (
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE,
 macaphoc text NOT NULL, makhoi text NOT NULL, thutu integer NOT NULL,
 PRIMARY KEY(magiaovien,makhoi),
 FOREIGN KEY(macaphoc,makhoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS vuihoc."GIAO_VIEN_MO_HINH" (
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE,
 mamohinh text NOT NULL REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE,
 thutu integer NOT NULL, PRIMARY KEY(magiaovien,mamohinh)
);
-- Recurring availability template; dated registrations already have LICH_RANH_TUAN.
CREATE TABLE IF NOT EXISTS vuihoc."LICH_RANH_DINH_KY" (
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE,
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh),
 thutrongtuan integer NOT NULL CHECK(thutrongtuan BETWEEN 0 AND 6),
 trangthai text NOT NULL CHECK(trangthai IN ('free','busy','none')),
 PRIMARY KEY(magiaovien,makhunggio,thutrongtuan)
);
ALTER TABLE vuihoc."MAU_BAO_CAO"
 ADD COLUMN IF NOT EXISTS nguondulieu text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS nhomtheo text NOT NULL DEFAULT 'all',
 ADD COLUMN IF NOT EXISTS khoangngay text NOT NULL DEFAULT 'all',
 ADD COLUMN IF NOT EXISTS tungay date, ADD COLUMN IF NOT EXISTS denngay date,
 ADD COLUMN IF NOT EXISTS sapxep text NOT NULL DEFAULT 'value_desc';
CREATE TABLE IF NOT EXISTS vuihoc."CHI_SO_MAU_BAO_CAO" (
 mamau text NOT NULL REFERENCES vuihoc."MAU_BAO_CAO"(madinhdanh) ON DELETE CASCADE,
 machiso text NOT NULL, thutu integer NOT NULL, PRIMARY KEY(mamau,machiso)
);
CREATE TABLE IF NOT EXISTS vuihoc."BO_LOC_MAU_BAO_CAO" (
 mamau text NOT NULL REFERENCES vuihoc."MAU_BAO_CAO"(madinhdanh) ON DELETE CASCADE,
 truong text NOT NULL, giatri text NOT NULL, PRIMARY KEY(mamau,truong)
);
CREATE TABLE IF NOT EXISTS vuihoc."LINK_MINH_CHUNG_CONG" (
 magiaitrinh text NOT NULL REFERENCES vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh) ON DELETE CASCADE,
 thutu integer NOT NULL, lienket text NOT NULL CHECK(lienket ~ '^https?://'),
 PRIMARY KEY(magiaitrinh,thutu)
);
CREATE TABLE IF NOT EXISTS vuihoc."TIEU_CHI_NHAN_XET" (
 madinhdanh bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 mabuoi text NOT NULL, mahocsinh text NOT NULL,
 manhom text, matieuchi text, maluachon text, nhantieuchi text NOT NULL,
 nhanluachon text NOT NULL, thutu integer NOT NULL,
 FOREIGN KEY(mabuoi,mahocsinh) REFERENCES vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh) ON DELETE CASCADE,
 FOREIGN KEY(manhom,matieuchi,maluachon) REFERENCES vuihoc."LUA_CHON_TIEU_CHI"(manhom,matieuchi,madinhdanh) DEFERRABLE INITIALLY DEFERRED,
 UNIQUE(mabuoi,mahocsinh,matieuchi)
);

CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $read$
DECLARE id text:=p_row->>'madinhdanh'; r jsonb; cfg jsonb;
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 r:=vuihoc.danh_sach_truy_van(p_table,p_row);
 IF p_table='CAP_HOC' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.madinhdanh,'label',o.nhan)
   ||CASE WHEN o.macha IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('parentId',o.macha) END ORDER BY o.thutu),'[]') INTO cfg
  FROM vuihoc."LUA_CHON_CAP_HOC" o WHERE o.macaphoc=id;
  RETURN r||jsonb_build_object('danhsachluachon',cfg);
 ELSIF p_table='GIAO_VIEN' THEN
  RETURN r||jsonb_build_object(
   'danhsachkhoi',(SELECT coalesce(jsonb_agg(k.makhoi ORDER BY k.thutu),'[]') FROM vuihoc."GIAO_VIEN_KHOI" k WHERE k.magiaovien=id),
   'danhsachmohinh',(SELECT coalesce(jsonb_agg(m.mamohinh ORDER BY m.thutu),'[]') FROM vuihoc."GIAO_VIEN_MO_HINH" m WHERE m.magiaovien=id),
   'lichranh',(SELECT coalesce(jsonb_object_agg(s.makhunggio,s.days),'{}') FROM (
    SELECT a.makhunggio,jsonb_agg(a.trangthai ORDER BY a.thutrongtuan) days FROM vuihoc."LICH_RANH_DINH_KY" a WHERE a.magiaovien=id GROUP BY a.makhunggio) s),
   'baocaodanhgia',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',e.madinhdanh,'teacherId',e.magiaovien,'reportCode',e.mabienban,'recipientUserId',e.manguoinhan,
    'evaluatorUserId',e.manguoidanhgia,'evaluatorName',u.hoten,'evaluatorRole',u.vaitro,
    'evaluationDate',to_char(e.ngaydanhgia,'DD/MM/YYYY'),'sessionDate',e.ngaycahoc,'sessionCode',e.macahoc,
    'sentAt',e.guiluc,'classCode',e.malophoc,'className',l.tenlophoc,'sessionNum',e.sobuoi,
    'sessionName',e.tenbuoihoc,'timeSlot',e.khunggio,'model',e.mohinh,'overallScore',e.diemtong,
    'rank',e.xeploai,'criteriaScores',e.diemtieuchi,'generalComment',e.nhanxetchung,'strengths',e.uudiem,
    'improvements',e.cancaithien,'recommendations',e.khuyennghi,'status',e.trangthai,
    'roomLink',e.lienketphonghoc,'recordLink',e.lienketbanghi) ORDER BY e.ngaydanhgia DESC,e.madinhdanh),'[]')
    FROM vuihoc."BIEN_BAN_DU_GIO" e LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=e.manguoidanhgia
    LEFT JOIN vuihoc."LOP_HOC" l ON l.malophoc=e.malophoc WHERE e.magiaovien=id),
   'cahochoanthanh',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'code',b.madinhdanh,'name',b.tieude,'date',to_char(b.ngayhoc,'DD/MM/YYYY'),'dateISO',b.ngayhoc,
    'week','Tuần '||extract(week FROM b.ngayhoc),'slot',k.khoanggio,
    'students',cardinality(l.danhsachmahocsinh)||'/'||l.sisotoida||' HS','status','Hoàn thành',
    'roomLink',b.lienketphonghoc,'recordLink',b.lienketbanghi,'checkin',to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),
    'gradeLevel',l.khoi,'model',l.mamohinh) ORDER BY b.ngayhoc DESC,b.madinhdanh),'[]')
    FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
    JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
    WHERE coalesce(b.magiaoviendaythay,b.magiaovienchinh)=id AND b.trangthai IN ('HOAN_THANH','DA_HOC_CU','DAY_THAY_CU')));
 ELSIF p_table='LOP_HOC' THEN
  SELECT coalesce(jsonb_object_agg(s.key,s.value||CASE WHEN chosen.items IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('feedbackCriteria',chosen.items) END),'{}') INTO cfg
  FROM jsonb_each(coalesce(r->'chitietcahoc','{}')) s
  LEFT JOIN LATERAL (
   SELECT jsonb_object_agg(student.mahocsinh,student.items) items FROM (
    SELECT c.mahocsinh,jsonb_object_agg(c.matieuchi,c.maluachon) items
    FROM vuihoc."TIEU_CHI_NHAN_XET" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
    JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
    WHERE b.malop=id AND b.ngayhoc::text=left(s.value->>'dateStr',10)
     AND regexp_replace(k.khoanggio,'\s','','g')=regexp_replace(substring(s.value->>'dateStr' FROM '[0-9]{2}:[0-9]{2} *- *[0-9]{2}:[0-9]{2}'),'\s','','g')
     AND c.matieuchi IS NOT NULL GROUP BY c.mahocsinh
   ) student
  ) chosen ON true;
  RETURN r||jsonb_build_object('chitietcahoc',cfg);
 ELSIF p_table='MAU_BAO_CAO' THEN
  RETURN r||jsonb_build_object('cauhinh',jsonb_build_object('datasetId',r->>'nguondulieu','groupBy',r->>'nhomtheo',
   'datePreset',r->>'khoangngay','from',coalesce(r->>'tungay',''),'to',coalesce(r->>'denngay',''),'sort',r->>'sapxep',
   'metricIds',(SELECT coalesce(jsonb_agg(c.machiso ORDER BY c.thutu),'[]') FROM vuihoc."CHI_SO_MAU_BAO_CAO" c WHERE c.mamau=id),
   'filters',(SELECT coalesce(jsonb_object_agg(f.truong,f.giatri),'{}') FROM vuihoc."BO_LOC_MAU_BAO_CAO" f WHERE f.mamau=id)));
 END IF;
 RETURN r;
END $read$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_du_lieu_quan_he(p_table text,p_row jsonb,p_backfill boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $write$
DECLARE id text:=p_row->>'madinhdanh'; c record; o record; cfg jsonb; slot text; ev jsonb; evaluator text;
 session jsonb; lesson text; lesson_date date; cls vuihoc."LOP_HOC"; hours text[];
BEGIN
 IF p_table='GIAO_VIEN' THEN
  IF NOT p_backfill AND p_row ? 'danhsachmohinh' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements_text(p_row->'danhsachmohinh') x
   LEFT JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=x.value
   WHERE (m.madinhdanh IS NULL OR NOT m.danghoatdong)
    AND NOT EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN_MO_HINH" old WHERE old.magiaovien=id AND old.mamohinh=x.value)
  ) THEN RAISE EXCEPTION 'Chỉ chọn mô hình đang hoạt động trong danh mục'; END IF;
  IF p_row ? 'danhsachkhoi' THEN
   DELETE FROM vuihoc."GIAO_VIEN_KHOI" WHERE magiaovien=id;
   FOR c IN SELECT value,ordinality FROM jsonb_array_elements_text(p_row->'danhsachkhoi') WITH ORDINALITY LOOP
    INSERT INTO vuihoc."GIAO_VIEN_KHOI" VALUES(id,p_row->>'macaphoc',c.value,c.ordinality);
   END LOOP;
  END IF;
  IF p_row ? 'danhsachmohinh' THEN
   DELETE FROM vuihoc."GIAO_VIEN_MO_HINH" WHERE magiaovien=id;
   FOR c IN SELECT value,ordinality FROM jsonb_array_elements_text(coalesce(nullif(p_row->'danhsachmohinh','null'),'[]')) WITH ORDINALITY LOOP
    INSERT INTO vuihoc."GIAO_VIEN_MO_HINH" VALUES(id,c.value,c.ordinality);
   END LOOP;
  END IF;
  IF p_row ? 'lichranh' THEN
   DELETE FROM vuihoc."LICH_RANH_DINH_KY" WHERE magiaovien=id;
   FOR c IN SELECT * FROM jsonb_each(p_row->'lichranh') LOOP
    SELECT madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=c.key OR makhunggio=c.key ORDER BY madinhdanh=c.key DESC LIMIT 1;
    IF slot IS NULL OR jsonb_array_length(c.value)<>7 THEN RAISE EXCEPTION 'Lịch rảnh sai khung giờ hoặc không đủ 7 ngày: %',c.key; END IF;
    FOR o IN SELECT value,ordinality FROM jsonb_array_elements_text(c.value) WITH ORDINALITY LOOP
     INSERT INTO vuihoc."LICH_RANH_DINH_KY" VALUES(id,slot,o.ordinality-1,o.value);
    END LOOP;
   END LOOP;
  END IF;
  IF p_backfill THEN
   FOR session IN SELECT value FROM jsonb_array_elements(coalesce(p_row->'cahochoanthanh','[]')) LOOP
    lesson_date:=coalesce(nullif(session->>'dateISO','')::date,to_date(session->>'date','DD/MM/YYYY'));
    SELECT * INTO cls FROM vuihoc."LOP_HOC" WHERE malophoc=regexp_replace(session->>'code','-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+$','');
    SELECT madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=regexp_replace(session->>'slot','\s','','g');
    SELECT madinhdanh INTO lesson FROM vuihoc."BUOI_HOC" WHERE madinhdanh=session->>'code'
     OR (malop=cls.madinhdanh AND ngayhoc=lesson_date AND makhunggio=slot);
    IF lesson IS NULL THEN
     IF cls.madinhdanh IS NULL OR slot IS NULL THEN RAISE EXCEPTION 'Ca hoàn thành % chưa khớp lớp/khung giờ; hủy giao dịch',session->>'code'; END IF;
     hours:=regexp_split_to_array(session->>'slot','\s*-\s*');
     INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,magiaoviendaythay,tieude,lienketphonghoc,lienketbanghi,vaolopluc,trangthai)
     VALUES(session->>'code',cls.madinhdanh,lesson_date,slot,hours[1]::time,hours[2]::time,coalesce(cls.magiaovien,id),
      CASE WHEN cls.magiaovien IS NOT NULL AND cls.magiaovien<>id THEN id END,
      coalesce(session->>'name',''),coalesce(session->>'roomLink',''),session->>'recordLink',
      CASE WHEN coalesce(session->>'checkin','') ~ '^\d{2}:\d{2}(:\d{2})?$' THEN (lesson_date+(session->>'checkin')::time) AT TIME ZONE 'Asia/Bangkok' END,'DA_HOC_CU');
    ELSIF NOT EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" WHERE madinhdanh=lesson AND coalesce(magiaoviendaythay,magiaovienchinh)=id AND trangthai IN ('HOAN_THANH','DA_HOC_CU','DAY_THAY_CU')) THEN
     RAISE EXCEPTION 'Ca hoàn thành % không khớp giáo viên/trạng thái; cần đối soát trước',session->>'code';
    END IF;
   END LOOP;
  END IF;
  -- The compatibility API writes individual records into BIEN_BAN_DU_GIO.
  IF p_row ? 'baocaodanhgia' THEN
   FOR ev IN SELECT value FROM jsonb_array_elements(coalesce(nullif(p_row->'baocaodanhgia','null'),'[]')) LOOP
    IF p_backfill AND EXISTS(SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" WHERE madinhdanh=ev->>'id') THEN CONTINUE; END IF;
    evaluator:=coalesce(ev->>'evaluatorUserId',(SELECT min(madinhdanh) FROM vuihoc."NGUOI_DUNG" WHERE hoten=ev->>'evaluatorName'));
    IF evaluator IS NULL THEN RAISE EXCEPTION 'Chưa tìm được người đánh giá cho biên bản %',ev->>'id'; END IF;
    INSERT INTO vuihoc."BIEN_BAN_DU_GIO"(madinhdanh,magiaovien,mabienban,malophoc,manguoinhan,manguoidanhgia,ngaydanhgia,ngaycahoc,macahoc,guiluc,sobuoi,tenbuoihoc,khunggio,mohinh,diemtong,xeploai,diemtieuchi,nhanxetchung,uudiem,cancaithien,khuyennghi,trangthai,lienketphonghoc,lienketbanghi)
    VALUES(ev->>'id',id,ev->>'reportCode',coalesce((SELECT l.malophoc FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop WHERE b.madinhdanh=ev->>'sessionCode'),ev->>'classCode'),ev->>'recipientUserId',evaluator,
     CASE WHEN ev->>'evaluationDate' LIKE '%/%' THEN to_date(ev->>'evaluationDate','DD/MM/YYYY') ELSE (ev->>'evaluationDate')::date END,
     (ev->>'sessionDate')::date,ev->>'sessionCode',(ev->>'sentAt')::date,(ev->>'sessionNum')::integer,
     ev->>'sessionName',ev->>'timeSlot',ev->>'model',(ev->>'overallScore')::numeric,ev->>'rank',ev->'criteriaScores',
     coalesce(ev->>'generalComment',''),coalesce(ev->>'strengths',''),coalesce(ev->>'improvements',''),coalesce(ev->>'recommendations',''),ev->>'status',ev->>'roomLink',ev->>'recordLink')
    ON CONFLICT(madinhdanh) DO UPDATE SET ngaydanhgia=excluded.ngaydanhgia,guiluc=excluded.guiluc,
     diemtong=excluded.diemtong,xeploai=excluded.xeploai,diemtieuchi=excluded.diemtieuchi,
     nhanxetchung=excluded.nhanxetchung,uudiem=excluded.uudiem,cancaithien=excluded.cancaithien,
     khuyennghi=excluded.khuyennghi,trangthai=excluded.trangthai;
   END LOOP;
  END IF;
 ELSIF p_table='MAU_BAO_CAO' AND p_row ? 'cauhinh' THEN
  cfg:=p_row->'cauhinh';
  UPDATE vuihoc."MAU_BAO_CAO" SET nguondulieu=cfg->>'datasetId',nhomtheo=cfg->>'groupBy',
   khoangngay=cfg->>'datePreset',tungay=nullif(cfg->>'from','')::date,denngay=nullif(cfg->>'to','')::date,sapxep=cfg->>'sort' WHERE madinhdanh=id;
  DELETE FROM vuihoc."CHI_SO_MAU_BAO_CAO" WHERE mamau=id;
  INSERT INTO vuihoc."CHI_SO_MAU_BAO_CAO" SELECT id,value,ordinality FROM jsonb_array_elements_text(cfg->'metricIds') WITH ORDINALITY;
  DELETE FROM vuihoc."BO_LOC_MAU_BAO_CAO" WHERE mamau=id;
  INSERT INTO vuihoc."BO_LOC_MAU_BAO_CAO" SELECT id,key,value FROM jsonb_each_text(cfg->'filters');
 END IF;
END $write$;

DO $backfill$
DECLARE r jsonb; t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['GIAO_VIEN','MAU_BAO_CAO'] LOOP
  EXECUTE format('LOCK TABLE vuihoc.%I IN SHARE ROW EXCLUSIVE MODE',t);
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=t AND column_name IN ('danhsachkhoi','cauhinh')) THEN
   FOR r IN EXECUTE format('SELECT to_jsonb(t) FROM vuihoc.%I t',t) LOOP
    PERFORM vuihoc.ghi_du_lieu_quan_he(t,r,true);
   END LOOP;
  END IF;
 END LOOP;
END $backfill$;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE vuihoc."GIAO_VIEN" DROP COLUMN IF EXISTS danhsachkhoi,DROP COLUMN IF EXISTS danhsachmohinh,
 DROP COLUMN IF EXISTS baocaodanhgia,DROP COLUMN IF EXISTS cahochoanthanh,DROP COLUMN IF EXISTS lichranh;
ALTER TABLE vuihoc."MAU_BAO_CAO" DROP COLUMN IF EXISTS cauhinh;
ALTER TABLE vuihoc."CAU_HINH_TRO_LY" DROP COLUMN IF EXISTS cauhoinhanh;

DO $rpc$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.business_config()'::regprocedure);
 f:=replace(f,'"cauhoinhanh",',''); EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 f:=replace(f,'vuihoc.danh_sach_truy_van','vuihoc.du_lieu_quan_he'); EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF position('PERFORM vuihoc.ghi_du_lieu_quan_he' IN f)=0 THEN
 f:=replace(f,'vuihoc.danh_sach_truy_van','vuihoc.du_lieu_quan_he');
 f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE NOT (conf->>''table''=''GIAO_VIEN'' AND k IN (''danhsachkhoi'',''danhsachmohinh'',''baocaodanhgia'',''cahochoanthanh'',''lichranh'')) AND NOT (conf->>''table''=''MAU_BAO_CAO'' AND k=''cauhinh'') AND');
 f:=replace(f,'PERFORM vuihoc.ghi_chi_tiet_danh_muc(conf->>''table'',v);','PERFORM vuihoc.ghi_chi_tiet_danh_muc(conf->>''table'',v); PERFORM vuihoc.ghi_du_lieu_quan_he(conf->>''table'',v);');
 EXECUTE f;
 END IF;
 f:=pg_get_functiondef('public.vuihoc_teacher_data(text)'::regprocedure);
 f:=replace(f,'jsonb_agg(to_jsonb(t)','jsonb_agg(vuihoc.du_lieu_quan_he(''GIAO_VIEN'',to_jsonb(t))');
 f:=replace(f,'''teaching_categories'',(SELECT coalesce(jsonb_agg(to_jsonb(x))','''teaching_categories'',(SELECT coalesce(jsonb_agg(vuihoc.du_lieu_quan_he(''CAP_HOC'',to_jsonb(x)))');
 EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_create_teacher(text,jsonb)'::regprocedure);
 IF position('PERFORM vuihoc.ghi_du_lieu_quan_he' IN f)=0 THEN
 f:=replace(f,'macaphoc,danhsachkhoi,danhsachmohinh,bangcap','macaphoc,bangcap');
 f:=replace(f,'category.madinhdanh,grades,models,','category.madinhdanh,');
 f:=replace(f,'RETURN jsonb_build_object(''id'',id,','PERFORM vuihoc.ghi_du_lieu_quan_he(''GIAO_VIEN'',p_profile||jsonb_build_object(''madinhdanh'',id)); RETURN jsonb_build_object(''id'',id,');
 f:=replace(f,'''teacher'',to_jsonb(teacher)','''teacher'',vuihoc.du_lieu_quan_he(''GIAO_VIEN'',to_jsonb(teacher))');
 EXECUTE f;
 END IF;
END $rpc$;

CREATE OR REPLACE FUNCTION vuihoc.luu_tieu_chi_nhan_xet(p_buoi text,p_hocsinh text,p_chon jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $criteria$
DECLARE x record; o record; n integer:=0; label text;
BEGIN
 DELETE FROM vuihoc."TIEU_CHI_NHAN_XET" WHERE mabuoi=p_buoi AND mahocsinh=p_hocsinh AND matieuchi IS NULL;
 FOR x IN SELECT * FROM jsonb_each(p_chon) LOOP
  IF x.key='legacyCriteria' THEN
   FOR label IN SELECT value FROM jsonb_array_elements_text(x.value) LOOP
    n:=n+1;
    INSERT INTO vuihoc."TIEU_CHI_NHAN_XET"(mabuoi,mahocsinh,nhantieuchi,nhanluachon,thutu)
     VALUES(p_buoi,p_hocsinh,'Tiêu chí cũ',label,n);
   END LOOP;
  ELSE
   SELECT c.manhom,c.madinhdanh,c.ten,l.madinhdanh AS maluachon,l.nhan INTO o
   FROM vuihoc."TIEU_CHI" c JOIN vuihoc."LUA_CHON_TIEU_CHI" l ON l.manhom=c.manhom AND l.matieuchi=c.madinhdanh
   JOIN vuihoc."NHOM_TIEU_CHI" g ON g.madinhdanh=c.manhom
   JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=p_buoi JOIN vuihoc."LOP_HOC" cl ON cl.madinhdanh=b.malop AND cl.mamonhoc=g.mamonhoc
   WHERE c.madinhdanh=x.key AND l.madinhdanh=x.value#>>'{}';
   IF NOT FOUND THEN RAISE EXCEPTION 'Tiêu chí/lựa chọn không thuộc môn của buổi học: %',x.key; END IF;
   n:=n+1;
   INSERT INTO vuihoc."TIEU_CHI_NHAN_XET"(mabuoi,mahocsinh,manhom,matieuchi,maluachon,nhantieuchi,nhanluachon,thutu)
    VALUES(p_buoi,p_hocsinh,o.manhom,o.madinhdanh,o.maluachon,o.ten,o.nhan,n)
   ON CONFLICT(mabuoi,mahocsinh,matieuchi) DO UPDATE SET
    manhom=excluded.manhom,maluachon=excluded.maluachon,thutu=excluded.thutu,
    nhantieuchi=CASE WHEN "TIEU_CHI_NHAN_XET".manhom=excluded.manhom AND "TIEU_CHI_NHAN_XET".maluachon=excluded.maluachon THEN "TIEU_CHI_NHAN_XET".nhantieuchi ELSE excluded.nhantieuchi END,
    nhanluachon=CASE WHEN "TIEU_CHI_NHAN_XET".manhom=excluded.manhom AND "TIEU_CHI_NHAN_XET".maluachon=excluded.maluachon THEN "TIEU_CHI_NHAN_XET".nhanluachon ELSE excluded.nhanluachon END;
  END IF;
 END LOOP;
 DELETE FROM vuihoc."TIEU_CHI_NHAN_XET" WHERE mabuoi=p_buoi AND mahocsinh=p_hocsinh AND matieuchi IS NOT NULL AND NOT (p_chon ? matieuchi);
END $criteria$;
DO $criteria_backfill$
DECLARE r record;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NHAN_XET_BUOI_HOC' AND column_name='tieuchidachon') THEN
  FOR r IN EXECUTE 'SELECT mabuoi,mahocsinh,tieuchidachon FROM vuihoc."NHAN_XET_BUOI_HOC"' LOOP
   PERFORM vuihoc.luu_tieu_chi_nhan_xet(r.mabuoi,r.mahocsinh,r.tieuchidachon);
  END LOOP;
 END IF;
END $criteria_backfill$;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" DROP COLUMN IF EXISTS tieuchidachon;
-- Persist saved criteria even before the teacher has written every comment.
CREATE OR REPLACE FUNCTION vuihoc.luu_tieu_chi_tu_lop()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $draft$
DECLARE entry jsonb; sessionkey text; hs record; buoi text; slot text; ngay date; hours text[];
BEGIN
 FOR sessionkey,entry IN SELECT * FROM jsonb_each(NEW.chitietcahoc) LOOP
  IF NOT entry ? 'feedbackCriteria' THEN CONTINUE; END IF;
  NEW.chitietcahoc:=jsonb_set(NEW.chitietcahoc,ARRAY[sessionkey],entry-'feedbackCriteria');
  IF entry->'feedbackCriteria'='{}'::jsonb THEN CONTINUE; END IF;
  ngay:=left(entry->>'dateStr',10)::date;
  hours:=regexp_match(entry->>'dateStr','([0-9]{2}:[0-9]{2}) *- *([0-9]{2}:[0-9]{2})');
  SELECT madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=hours[1]||'-'||hours[2] LIMIT 1;
  IF slot IS NULL OR NEW.magiaovien IS NULL THEN RAISE EXCEPTION 'Không xác định được giáo viên/khung giờ để lưu tiêu chí'; END IF;
  SELECT madinhdanh INTO buoi FROM vuihoc."BUOI_HOC" WHERE malop=NEW.madinhdanh AND ngayhoc=ngay AND makhunggio=slot;
  IF buoi IS NULL THEN
   INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,lienketphonghoc)
   VALUES(NEW.madinhdanh,ngay,slot,hours[1]::time,hours[2]::time,NEW.magiaovien,NEW.lienketphonghoc) RETURNING madinhdanh INTO buoi;
  END IF;
  FOR hs IN SELECT * FROM jsonb_each(entry->'feedbackCriteria') LOOP
   IF NOT hs.key=ANY(NEW.danhsachmahocsinh) THEN RAISE EXCEPTION 'Học sinh không thuộc lớp: %',hs.key; END IF;
   INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung)
   VALUES(buoi,hs.key,coalesce(entry->'feedback'->>hs.key,'')) ON CONFLICT(mabuoi,mahocsinh) DO NOTHING;
   PERFORM vuihoc.luu_tieu_chi_nhan_xet(buoi,hs.key,hs.value);
  END LOOP;
 END LOOP;
 RETURN NEW;
END $draft$;
DROP TRIGGER IF EXISTS luu_tieu_chi_tu_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER luu_tieu_chi_tu_lop BEFORE UPDATE OF chitietcahoc ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.luu_tieu_chi_tu_lop();
ALTER TABLE vuihoc."LOP_HOC" DISABLE TRIGGER ghi_cong_khi_du_nhan_xet;
UPDATE vuihoc."LOP_HOC" SET chitietcahoc=chitietcahoc
 WHERE EXISTS(SELECT 1 FROM jsonb_each(chitietcahoc) s WHERE s.value ? 'feedbackCriteria');
ALTER TABLE vuihoc."LOP_HOC" ENABLE TRIGGER ghi_cong_khi_du_nhan_xet;

-- Historical evidence is migrated without reopening a locked payroll period.
ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" DISABLE TRIGGER kiem_tra_ky_cong;
DO $evidence$
DECLARE r record; item jsonb; link text; n integer;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAI_TRINH_CONG_DAY' AND column_name='minhchung') THEN
  FOR r IN EXECUTE 'SELECT madinhdanh,minhchung FROM vuihoc."GIAI_TRINH_CONG_DAY"' LOOP
   n:=0;
   FOR item IN SELECT value FROM jsonb_array_elements(r.minhchung) LOOP
    link:=CASE WHEN jsonb_typeof(item)='string' THEN item#>>'{}' ELSE coalesce(item->>'url',item->>'link') END;
    IF link IS NULL OR link !~ '^https?://' THEN RAISE EXCEPTION 'Minh chứng % chưa có link; hủy giao dịch',r.madinhdanh; END IF;
    n:=n+1;
    INSERT INTO vuihoc."LINK_MINH_CHUNG_CONG" VALUES(r.madinhdanh,n,link) ON CONFLICT DO NOTHING;
   END LOOP;
   IF n>0 THEN UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET lienketminhchung=(SELECT string_agg(lienket,E'\n' ORDER BY thutu) FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh=r.madinhdanh) WHERE madinhdanh=r.madinhdanh AND lienketminhchung=''; END IF;
  END LOOP;
 END IF;
END $evidence$;
ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" ENABLE TRIGGER kiem_tra_ky_cong;
ALTER TABLE vuihoc."GIAI_TRINH_CONG_DAY" DROP COLUMN IF EXISTS minhchung;
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_link_minh_chung()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $links$
BEGIN
 DELETE FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh=NEW.madinhdanh;
 INSERT INTO vuihoc."LINK_MINH_CHUNG_CONG"
 SELECT NEW.madinhdanh,ordinality,btrim(value)
 FROM regexp_split_to_table(NEW.lienketminhchung,E'[\r\n]+') WITH ORDINALITY AS links(value,ordinality) WHERE btrim(value)<>'';
 RETURN NEW;
END $links$;
DROP TRIGGER IF EXISTS dong_bo_link_minh_chung ON vuihoc."GIAI_TRINH_CONG_DAY";
CREATE TRIGGER dong_bo_link_minh_chung AFTER INSERT OR UPDATE OF lienketminhchung ON vuihoc."GIAI_TRINH_CONG_DAY"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_link_minh_chung();

-- Store audit events and scalar field changes. The screen reads a SELECT view.
DO $audit_table$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='vuihoc' AND c.relname='NHAT_KY_NGHIEP_VU' AND c.relkind='r') THEN
  ALTER TABLE vuihoc."NHAT_KY_NGHIEP_VU" RENAME TO "SU_KIEN_NGHIEP_VU";
 END IF;
END $audit_table$;
CREATE TABLE IF NOT EXISTS vuihoc."CHI_TIET_NHAT_KY" (
 masu_kien uuid NOT NULL REFERENCES vuihoc."SU_KIEN_NGHIEP_VU"(madinhdanh) ON DELETE CASCADE,
 duongdan text NOT NULL, loai text NOT NULL CHECK(loai IN ('KHOA','TRUOC','SAU')),
 giatri text, kieudulieu text NOT NULL, PRIMARY KEY(masu_kien,duongdan,loai)
);
CREATE OR REPLACE FUNCTION vuihoc.ghi_chi_tiet_nhat_ky(p_id uuid,p_loai text,p_data jsonb)
RETURNS void LANGUAGE sql SET search_path=pg_catalog AS $flatten$
 WITH RECURSIVE fields(path,value) AS (
  SELECT ''::text,p_data WHERE p_data IS NOT NULL
  UNION ALL
  SELECT f.path||'/'||replace(replace(e.key,'~','~0'),'/','~1'),e.value
  FROM fields f CROSS JOIN LATERAL (
   SELECT key,value FROM jsonb_each(CASE WHEN jsonb_typeof(f.value)='object' THEN f.value ELSE '{}'::jsonb END)
   UNION ALL SELECT (ordinality-1)::text,value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(f.value)='array' THEN f.value ELSE '[]'::jsonb END) WITH ORDINALITY
  ) e
 ) INSERT INTO vuihoc."CHI_TIET_NHAT_KY"
 SELECT p_id,path,p_loai,CASE WHEN jsonb_typeof(value) IN ('object','array') THEN NULL ELSE value#>>'{}' END,jsonb_typeof(value)
 FROM fields ON CONFLICT(masu_kien,duongdan,loai) DO NOTHING
$flatten$;
DO $audit_backfill$
DECLARE r record;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='SU_KIEN_NGHIEP_VU' AND column_name='khoabanghi') THEN
  FOR r IN EXECUTE 'SELECT madinhdanh,khoabanghi,dulieutruoc,dulieusau FROM vuihoc."SU_KIEN_NGHIEP_VU"' LOOP
   PERFORM vuihoc.ghi_chi_tiet_nhat_ky(r.madinhdanh,'KHOA',r.khoabanghi);
   PERFORM vuihoc.ghi_chi_tiet_nhat_ky(r.madinhdanh,'TRUOC',r.dulieutruoc);
   PERFORM vuihoc.ghi_chi_tiet_nhat_ky(r.madinhdanh,'SAU',r.dulieusau);
  END LOOP;
 END IF;
END $audit_backfill$;
ALTER TABLE vuihoc."SU_KIEN_NGHIEP_VU" DROP COLUMN IF EXISTS khoabanghi,DROP COLUMN IF EXISTS dulieutruoc,DROP COLUMN IF EXISTS dulieusau;
CREATE OR REPLACE VIEW vuihoc."NHAT_KY_NGHIEP_VU" WITH(security_invoker=true) AS
 SELECT e.madinhdanh,e.thoigian,e.manguoithuchien,u.hoten AS nguoithuchien,e.tenbang,e.thaotac,
 d.duongdan,d.loai,d.giatri,d.kieudulieu
 FROM vuihoc."SU_KIEN_NGHIEP_VU" e LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=e.manguoithuchien
 LEFT JOIN vuihoc."CHI_TIET_NHAT_KY" d ON d.masu_kien=e.madinhdanh;
CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keys jsonb:='{}'; col text; id uuid;
 secret text[]:=ARRAY['matkhau','matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','ngaycapnhat'];
BEGIN
 IF TG_OP<>'INSERT' THEN truoc:=to_jsonb(OLD)-secret; END IF;
 IF TG_OP<>'DELETE' THEN sau:=to_jsonb(NEW)-secret; END IF;
 SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO fields FROM jsonb_object_keys(coalesce(truoc,'{}')||coalesce(sau,'{}')) k WHERE truoc->k IS DISTINCT FROM sau->k;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='NGUOI_DUNG' AND to_jsonb(OLD)->'matkhau' IS DISTINCT FROM to_jsonb(NEW)->'matkhau' THEN fields:=array_append(fields,'matkhau'); END IF;
 IF TG_OP='UPDATE' AND cardinality(fields)=0 THEN RETURN NEW; END IF;
 FOREACH col IN ARRAY TG_ARGV LOOP keys:=keys||jsonb_build_object(col,coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."SU_KIEN_NGHIEP_VU"(manguoithuchien,tenbang,thaotac,truongthaydoi)
 VALUES(nullif(current_setting('vuihoc.actor',true),''),TG_TABLE_NAME,TG_OP,fields) RETURNING madinhdanh INTO id;
 PERFORM vuihoc.ghi_chi_tiet_nhat_ky(id,'KHOA',keys);
 PERFORM vuihoc.ghi_chi_tiet_nhat_ky(id,'TRUOC',truoc);
 PERFORM vuihoc.ghi_chi_tiet_nhat_ky(id,'SAU',sau);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $audit$;
ALTER TABLE vuihoc."CHI_TIET_NHAT_KY" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."CHI_TIET_NHAT_KY",vuihoc."NHAT_KY_NGHIEP_VU" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."CHI_TIET_NHAT_KY",vuihoc."NHAT_KY_NGHIEP_VU" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.ghi_chi_tiet_nhat_ky(uuid,text,jsonb),vuihoc.luu_tieu_chi_nhan_xet(text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION vuihoc.dong_bo_link_minh_chung() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION vuihoc.luu_tieu_chi_tu_lop() FROM PUBLIC,anon,authenticated;

DO $security$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['GIAO_VIEN_KHOI','GIAO_VIEN_MO_HINH','LICH_RANH_DINH_KY','CHI_SO_MAU_BAO_CAO','BO_LOC_MAU_BAO_CAO','LINK_MINH_CHUNG_CONG','TIEU_CHI_NHAN_XET'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $security$;
DO $audit_relations$
DECLARE r record; args text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('LUA_CHON_CAP_HOC',ARRAY['macaphoc','madinhdanh']),
  ('LOAI_SU_CO',ARRAY['manhom','madinhdanh']),('TIEU_CHI',ARRAY['manhom','madinhdanh']),
  ('LUA_CHON_TIEU_CHI',ARRAY['manhom','matieuchi','madinhdanh']),
  ('MUC_DANH_MUC',ARRAY['madanhmuc','madinhdanh']),
  ('GIAO_VIEN_KHOI',ARRAY['magiaovien','makhoi']),('GIAO_VIEN_MO_HINH',ARRAY['magiaovien','mamohinh']),
  ('LICH_RANH_DINH_KY',ARRAY['magiaovien','makhunggio','thutrongtuan']),
  ('CHI_SO_MAU_BAO_CAO',ARRAY['mamau','machiso']),('BO_LOC_MAU_BAO_CAO',ARRAY['mamau','truong']),
  ('LINK_MINH_CHUNG_CONG',ARRAY['magiaitrinh','thutu']),('TIEU_CHI_NHAN_XET',ARRAY['madinhdanh'])
 ) tables(name,keys) LOOP
  SELECT string_agg(quote_literal(k),',') INTO args FROM unnest(r.keys) k;
  EXECUTE format('DROP TRIGGER IF EXISTS audit_business_change ON vuihoc.%I',r.name);
  EXECUTE format('CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu(%s)',r.name,args);
 END LOOP;
END $audit_relations$;
REVOKE ALL ON FUNCTION vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
