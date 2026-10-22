-- After 20261120. Run the whole statement. No reseeding, no fuzzy matching.
DO $normalize_student_enrollments$
DECLARE f text; cols text; r record; pending text;
BEGIN
 LOCK TABLE vuihoc."HOC_SINH",vuihoc."DANG_KY_MON_HOC",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NGUOI_DUNG' AND column_name='mamonhoc') THEN RAISE EXCEPTION 'Chạy bản 20261120 trước.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_SINH' AND column_name='mamonhoc') THEN RETURN; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(h.madinhdanh,', ' ORDER BY h.madinhdanh) INTO pending FROM vuihoc."HOC_SINH" h
 WHERE NOT EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" d LEFT JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=d.malop
  WHERE d.mahocsinh=h.madinhdanh AND (h.mamonhoc,h.mamohinh,h.matrinhdo,h.trangthai,nullif(h.malophientai,''))
   IS NOT DISTINCT FROM (d.mamonhoc,d.mamohinh,d.matrinhdo,d.trangthai,l.malophoc));
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Còn hồ sơ có thông tin đăng ký cũ chưa khớp nguồn đăng ký; chưa xóa cột nào.'
  USING DETAIL=pending,HINT='Chạy supabase/diagnostics/student_enrollment_legacy.sql để đối soát trước.'; END IF;
 IF to_regclass('vuihoc."LICH_DANG_KY_HOC_SINH"') IS NOT NULL THEN
 IF EXISTS(SELECT 1 FROM vuihoc."LICH_DANG_KY_HOC_SINH" s JOIN vuihoc."HOC_SINH" h ON h.madinhdanh=s.mahocsinh
  WHERE NOT EXISTS(SELECT 1 FROM vuihoc."LICH_DANG_KY_MON_HOC" n WHERE (n.mahocsinh,n.mamonhoc,n.thutrongtuan,n.makhunggio)=(s.mahocsinh,h.mamonhoc,s.thutrongtuan,s.makhunggio))) THEN
  RAISE EXCEPTION 'Còn lịch đăng ký cũ chưa khớp lịch theo môn; chưa xóa bảng nào.';
 END IF;
 END IF;
 PERFORM vuihoc.kiem_tra_dang_ky_mon();
 IF EXISTS(SELECT 1 FROM vuihoc."LICH_SU_DANG_KY_HOC" WHERE trangthai IS DISTINCT FROM 'DA_THOI_HOC') THEN
  RAISE EXCEPTION 'Có đợt lịch sử khác trạng thái đã thôi học; cần đối soát trước khi bỏ trạng thái dẫn xuất.';
 END IF;
 -- A grade ID is scoped by its teaching category. Never infer an ambiguous old key.
 IF EXISTS(SELECT 1 FROM (
  SELECT khoidangky AS grade FROM vuihoc."DANG_KY_MON_HOC" UNION SELECT khoi FROM vuihoc."LICH_SU_DANG_KY_HOC"
 ) g WHERE grade IS NOT NULL AND (SELECT count(*) FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.madinhdanh=g.grade)<>1) THEN
  RAISE EXCEPTION 'Khối tại thời điểm đăng ký cũ chưa xác định duy nhất cấp học; cần đối soát trước.';
 END IF;
 ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD COLUMN macaphocdangky text;
 ALTER TABLE vuihoc."LICH_SU_DANG_KY_HOC" ADD COLUMN macaphoc text;
 UPDATE vuihoc."DANG_KY_MON_HOC" d SET macaphocdangky=k.macaphoc FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.madinhdanh=d.khoidangky;
 UPDATE vuihoc."LICH_SU_DANG_KY_HOC" h SET macaphoc=k.macaphoc FROM vuihoc."LUA_CHON_CAP_HOC" k WHERE k.madinhdanh=h.khoi;
 ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD CONSTRAINT dang_ky_khoi_nhap_hoc_fk FOREIGN KEY(macaphocdangky,khoidangky)
  REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh) MATCH FULL;
 ALTER TABLE vuihoc."LICH_SU_DANG_KY_HOC" ADD CONSTRAINT lich_su_khoi_nhap_hoc_fk FOREIGN KEY(macaphoc,khoi)
  REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh) MATCH FULL;
 ALTER TABLE vuihoc."DANG_KY_MON_HOC" ADD CONSTRAINT dang_ky_dot_duong CHECK(dotdangky>0);
 ALTER TABLE vuihoc."LICH_SU_DANG_KY_HOC" ADD CONSTRAINT lich_su_dot_duong CHECK(dotdangky>0);
 ALTER TABLE vuihoc."LICH_DANG_KY_MON_HOC" ADD CONSTRAINT lich_dang_ky_ca_unique UNIQUE(mahocsinh,mamonhoc,thutrongtuan,makhunggio),
  ADD CONSTRAINT lich_dang_ky_thu_tu_duong CHECK(thutu>0);
 ALTER TABLE vuihoc."LICH_SU_CA_DANG_KY_HOC" ADD CONSTRAINT lich_su_ca_unique UNIQUE(mahocsinh,mamonhoc,dotdangky,thutrongtuan,makhunggio),
  ADD CONSTRAINT lich_su_ca_hop_le CHECK(thutu>0 AND thutrongtuan BETWEEN 1 AND 7);
 ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_ma_mon_unique UNIQUE(madinhdanh,mamonhoc);
 CREATE TABLE vuihoc."XEP_LOP_DANG_KY"(
  mahocsinh text NOT NULL,mamonhoc text NOT NULL,malop text NOT NULL,
  PRIMARY KEY(mahocsinh,mamonhoc),UNIQUE(mahocsinh,malop),
  FOREIGN KEY(mahocsinh,mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC" ON DELETE CASCADE,
  FOREIGN KEY(malop,mamonhoc) REFERENCES vuihoc."LOP_HOC"(madinhdanh,mamonhoc) ON DELETE RESTRICT
 );
 INSERT INTO vuihoc."XEP_LOP_DANG_KY" SELECT mahocsinh,mamonhoc,malop FROM vuihoc."DANG_KY_MON_HOC" WHERE malop IS NOT NULL;
 SELECT string_agg(format('d.%I',column_name),',' ORDER BY ordinal_position) INTO cols FROM information_schema.columns
 WHERE table_schema='vuihoc' AND table_name='DANG_KY_MON_HOC' AND column_name<>'malop';
 EXECUTE 'CREATE VIEW vuihoc."V_DANG_KY_MON_HOC" WITH (security_invoker=true) AS SELECT '||cols||',x.malop FROM vuihoc."DANG_KY_MON_HOC" d LEFT JOIN vuihoc."XEP_LOP_DANG_KY" x USING(mahocsinh,mamonhoc)';

 -- Keep existing readers and UPDATE/DELETE callers, backed by one normalized relation each.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','vuihoc') AND p.prokind='f' AND p.prosrc LIKE '%"DANG_KY_MON_HOC"%' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,'vuihoc."DANG_KY_MON_HOC"','vuihoc."V_DANG_KY_MON_HOC"');
  EXECUTE f;
 END LOOP;

 CREATE OR REPLACE FUNCTION vuihoc.luu_dang_ky_chuan(p jsonb) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $writer$
 BEGIN
  INSERT INTO vuihoc."DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,trangthai,ngaydangky)
  VALUES(p->>'mahocsinh',p->>'mamonhoc',p->>'matrinhdo',p->>'mamohinh',p->>'trangthai',coalesce((p->>'ngaydangky')::timestamptz,statement_timestamp()))
  ON CONFLICT(mahocsinh,mamonhoc) DO UPDATE SET matrinhdo=excluded.matrinhdo,mamohinh=excluded.mamohinh,trangthai=excluded.trangthai;
  IF nullif(p->>'malop','') IS NULL THEN
   DELETE FROM vuihoc."XEP_LOP_DANG_KY" WHERE mahocsinh=p->>'mahocsinh' AND mamonhoc=p->>'mamonhoc';
  ELSE
   INSERT INTO vuihoc."XEP_LOP_DANG_KY" VALUES(p->>'mahocsinh',p->>'mamonhoc',p->>'malop')
   ON CONFLICT(mahocsinh,mamonhoc) DO UPDATE SET malop=excluded.malop;
  END IF;
 END $writer$;
 CREATE OR REPLACE FUNCTION vuihoc.ghi_view_dang_ky() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $writer$
 BEGIN
  IF TG_OP='DELETE' THEN DELETE FROM vuihoc."DANG_KY_MON_HOC" WHERE (mahocsinh,mamonhoc)=(OLD.mahocsinh,OLD.mamonhoc); RETURN OLD; END IF;
  IF TG_OP='UPDATE' AND (NEW.mahocsinh,NEW.mamonhoc) IS DISTINCT FROM (OLD.mahocsinh,OLD.mamonhoc) THEN RAISE EXCEPTION 'Không thay khóa đăng ký.'; END IF;
  PERFORM vuihoc.luu_dang_ky_chuan(to_jsonb(NEW)); RETURN NEW;
 END $writer$;
 CREATE TRIGGER ghi_view_dang_ky INSTEAD OF INSERT OR UPDATE OR DELETE ON vuihoc."V_DANG_KY_MON_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_view_dang_ky();

 -- Preserve the class-stop rule on both lifecycle and assignment writes.
 CREATE OR REPLACE FUNCTION vuihoc.giu_dang_ky_lop_dang_hoat_dong() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 DECLARE cls text;
 BEGIN
  SELECT malop INTO cls FROM vuihoc."XEP_LOP_DANG_KY" WHERE (mahocsinh,mamonhoc)=(OLD.mahocsinh,OLD.mamonhoc);
  IF cls IS NOT NULL AND EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=cls AND trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')) THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Dừng hoạt động lớp trước khi rút hoặc xóa học sinh.'; END IF;
   IF OLD.trangthai IS DISTINCT FROM NEW.trangthai THEN RAISE EXCEPTION 'Dừng hoạt động lớp trước khi rút học sinh.'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END $guard$;
 CREATE OR REPLACE FUNCTION vuihoc.giu_xep_lop_dang_hoat_dong() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 BEGIN
  IF EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=OLD.malop AND trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')) THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Dừng hoạt động lớp trước khi bỏ xếp lớp.'; END IF;
   IF NEW.malop IS DISTINCT FROM OLD.malop THEN RAISE EXCEPTION 'Dừng hoạt động lớp trước khi chuyển lớp.'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END $guard$;
 CREATE TRIGGER giu_xep_lop BEFORE UPDATE OR DELETE ON vuihoc."XEP_LOP_DANG_KY" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_xep_lop_dang_hoat_dong();
 CREATE OR REPLACE FUNCTION vuihoc.ghi_truy_vet_dang_ky_mon() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $trace$
 DECLARE prev text; nextclass text; hs text; mon text;
 BEGIN
  IF TG_OP<>'INSERT' THEN prev:=OLD.malop; hs:=OLD.mahocsinh; mon:=OLD.mamonhoc; END IF;
  IF TG_OP<>'DELETE' THEN nextclass:=NEW.malop; hs:=NEW.mahocsinh; mon:=NEW.mamonhoc; END IF;
  IF prev IS DISTINCT FROM nextclass THEN
   INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,mamonhoc,malopcu,malopmoi,manguoithuchien)
   VALUES(hs,mon,prev,nextclass,nullif(current_setting('vuihoc.actor',true),''));
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END $trace$;
 DROP TRIGGER ghi_truy_vet_dang_ky_mon ON vuihoc."DANG_KY_MON_HOC";
 CREATE TRIGGER ghi_truy_vet_dang_ky_mon AFTER INSERT OR UPDATE OR DELETE ON vuihoc."XEP_LOP_DANG_KY" FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_truy_vet_dang_ky_mon();

 -- Lifecycle state is one stored fact; the deferred check enforces its assignment invariant.
 f:=pg_get_functiondef('vuihoc.kiem_tra_dang_ky_mon()'::regprocedure);
 f:=replace(f,'BEGIN',$check$BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."V_DANG_KY_MON_HOC" WHERE (malop IS NOT NULL) IS DISTINCT FROM (trangthai='DANG_HOC')) THEN RAISE EXCEPTION 'Trạng thái đăng ký không khớp quan hệ xếp lớp.'; END IF;$check$);
 f:=replace(f,'BEGIN',$check$BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" d JOIN vuihoc."LICH_SU_DANG_KY_HOC" h USING(mahocsinh,mamonhoc) WHERE h.dotdangky>=d.dotdangky) THEN RAISE EXCEPTION 'Đợt hiện tại không được trùng hoặc đứng trước đợt lịch sử.'; END IF;$check$);
 f:=replace(f,'BEGIN',$check$BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" h WHERE NOT EXISTS(SELECT 1 FROM vuihoc."DANG_KY_MON_HOC" d WHERE d.mahocsinh=h.madinhdanh)) THEN RAISE EXCEPTION 'Hồ sơ học sinh cần ít nhất một đăng ký môn.'; END IF;$check$);
 EXECUTE f;
 CREATE CONSTRAINT TRIGGER kiem_tra_xep_lop AFTER INSERT OR UPDATE OR DELETE ON vuihoc."XEP_LOP_DANG_KY"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
 CREATE CONSTRAINT TRIGGER kiem_tra_dot_lich_su AFTER INSERT OR UPDATE OR DELETE ON vuihoc."LICH_SU_DANG_KY_HOC"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
 CREATE CONSTRAINT TRIGGER kiem_tra_ho_so_moi AFTER INSERT ON vuihoc."HOC_SINH"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_dang_ky_mon_trigger();
 -- The INSTEAD OF view cannot use ON CONFLICT; write through the normalized helper.
 -- Locate the actual enrollment writer in the installed wrapper chain rather than assuming a particular wrapper name.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='vuihoc' AND p.prokind='f' AND p.prosrc LIKE '%ON CONFLICT(mahocsinh,mamonhoc) DO UPDATE SET matrinhdo%' AND p.proname<>'luu_dang_ky_chuan' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,$old$INSERT INTO vuihoc."V_DANG_KY_MON_HOC"(mahocsinh,mamonhoc,matrinhdo,mamohinh,malop,trangthai)
    VALUES(id,x->>'subject',x->>'level',x->>'model',target,x->>'status')
    ON CONFLICT(mahocsinh,mamonhoc) DO UPDATE SET matrinhdo=excluded.matrinhdo,mamohinh=excluded.mamohinh,malop=excluded.malop,trangthai=excluded.trangthai;$old$,
   $new$PERFORM vuihoc.luu_dang_ky_chuan(jsonb_build_object('mahocsinh',id,'mamonhoc',x->>'subject','matrinhdo',x->>'level','mamohinh',x->>'model','malop',target,'trangthai',x->>'status'));$new$);
  IF strpos(f,'INSERT INTO vuihoc."V_DANG_KY_MON_HOC"')>0 THEN RAISE EXCEPTION 'Chưa chuyển được hàm ghi đăng ký sang nguồn chuẩn hóa.'; END IF;
  EXECUTE f;
 END LOOP;
 -- Entry grade is historical context, not a live mirror of the current profile grade.
 DROP TRIGGER IF EXISTS dong_bo_khoi_dot_dang_ky ON vuihoc."HOC_SINH";
 DROP FUNCTION IF EXISTS vuihoc.dong_bo_khoi_dot_dang_ky();
 -- A closed period already means withdrawn. Its status is displayed, never copied.
 f:=pg_get_functiondef('vuihoc.luu_dot_dang_ky_hoc_lai()'::regprocedure);
 IF strpos(f,'OLD.mamohinh,OLD.trangthai);')=0 THEN RAISE EXCEPTION 'Không nhận diện được nơi lưu đợt học cũ.'; END IF;
 f:=replace(f,'OLD.mamohinh,OLD.trangthai);','OLD.mamohinh,OLD.macaphocdangky);');
 f:=replace(f,'INSERT INTO vuihoc."LICH_SU_DANG_KY_HOC" VALUES(',
  'INSERT INTO vuihoc."LICH_SU_DANG_KY_HOC"(mahocsinh,mamonhoc,dotdangky,ngaydangky,ketthucluc,loaidangky,khoi,matrinhdo,mamohinh,macaphoc) VALUES(');
 f:=replace(f,'SELECT makhoi INTO NEW.khoidangky','SELECT macaphoc,makhoi INTO NEW.macaphocdangky,NEW.khoidangky');
 EXECUTE f;
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 f:=replace(f,$old$'grade',h.khoi$old$,$new$'grade',(SELECT o.nhan FROM vuihoc."LUA_CHON_CAP_HOC" o WHERE (o.macaphoc,o.madinhdanh)=(h.macaphoc,h.khoi))$new$);
 EXECUTE f;
 -- Remove obsolete one-subject schedule read/write paths before dropping that table.
 f:=pg_get_functiondef('vuihoc.truong_lien_ket_truy_van(text,jsonb)'::regprocedure);
 f:=replace(f,$old$(SELECT coalesce(jsonb_agg(vuihoc.nhan_lich(thutrongtuan,makhunggio) ORDER BY thutu),'[]') FROM vuihoc."LICH_DANG_KY_HOC_SINH" WHERE mahocsinh=id)$old$,$new$'[]'::jsonb$new$); EXECUTE f;
 f:=pg_get_functiondef('vuihoc.ghi_truong_lien_ket(text,jsonb,boolean)'::regprocedure);
 f:=regexp_replace(f,'  IF NOT p_backfill AND p_row \? ''danhsachmahocsinh'' THEN.*? END IF;','', 's');
 f:=regexp_replace(f,' ELSIF p_table=''HOC_SINH'' AND p_row \? ''lichdangky'' THEN.*? END IF;',' END IF;', 's'); EXECUTE f;

 -- Read compatibility fields are calculated, never persisted on the student profile.
 SELECT string_agg(format('h.%I',column_name),',' ORDER BY ordinal_position) INTO cols FROM information_schema.columns
 WHERE table_schema='vuihoc' AND table_name='HOC_SINH' AND column_name NOT IN ('mamonhoc','mamohinh','matrinhdo','trangthai','malophientai');
 EXECUTE 'CREATE VIEW vuihoc."V_HOC_SINH" WITH (security_invoker=true) AS SELECT '||cols||',d->>''subject'' AS mamonhoc,d->>''model'' AS mamohinh,d->>''level'' AS matrinhdo,d->>''status'' AS trangthai,d->>''currentClassCode'' AS malophientai FROM vuihoc."HOC_SINH" h LEFT JOIN LATERAL (SELECT vuihoc.dang_ky_mon_truy_van(h.madinhdanh)->0 AS d) q ON true';
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%"HOC_SINH"%' LOOP
  f:=pg_get_functiondef(r.oid); f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."HOC_SINH"','\1 vuihoc."V_HOC_SINH"','gi'); EXECUTE f;
 END LOOP;
 -- Reject writes to the removed projection fields, even from a stale browser.
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 f:=replace(f,'IF conf IS NULL THEN',$guard$IF ds='students' AND v ?| ARRAY['mamonhoc','mamohinh','matrinhdo','trangthai','malophientai','lichdangky'] THEN RAISE EXCEPTION 'Ghi nhu cầu học qua đăng ký môn, không ghi bản sao vào hồ sơ học sinh.'; END IF; IF conf IS NULL THEN$guard$); EXECUTE f;
 ALTER TABLE vuihoc."DANG_KY_MON_HOC" DROP COLUMN malop;
 ALTER TABLE vuihoc."LICH_SU_DANG_KY_HOC" DROP COLUMN trangthai;
 ALTER TABLE vuihoc."HOC_SINH" DROP COLUMN mamonhoc,DROP COLUMN mamohinh,DROP COLUMN matrinhdo,DROP COLUMN trangthai,DROP COLUMN malophientai;
 DROP TABLE IF EXISTS vuihoc."LICH_DANG_KY_HOC_SINH";
 ALTER TABLE vuihoc."XEP_LOP_DANG_KY" ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON vuihoc."XEP_LOP_DANG_KY",vuihoc."V_DANG_KY_MON_HOC",vuihoc."V_HOC_SINH" FROM PUBLIC,anon,authenticated;
 GRANT SELECT ON vuihoc."XEP_LOP_DANG_KY",vuihoc."V_DANG_KY_MON_HOC",vuihoc."V_HOC_SINH" TO service_role;
 REVOKE ALL ON FUNCTION vuihoc.luu_dang_ky_chuan(jsonb),vuihoc.ghi_view_dang_ky(),vuihoc.giu_xep_lop_dang_hoat_dong() FROM PUBLIC,anon,authenticated;
 PERFORM vuihoc.kiem_tra_dang_ky_mon();
 NOTIFY pgrst,'reload schema';
END $normalize_student_enrollments$;
