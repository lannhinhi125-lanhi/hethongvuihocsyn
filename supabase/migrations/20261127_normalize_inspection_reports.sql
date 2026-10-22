-- Apply after 20261126. Run the entire file as one atomic statement.
-- Preflight never guesses a lesson or discards conflicting historical values.
DO $normalize_inspection_reports$
DECLARE f text; r record; pending text; trusted_owner text;
 removed text[]:=ARRAY['magiaovien','malophoc','manguoinhan','ngaycahoc','macahoc','sobuoi','tenbuoihoc','khunggio','mohinh','diemtong','xeploai','lienketphonghoc','lienketbanghi'];
BEGIN
 LOCK TABLE vuihoc."BIEN_BAN_DU_GIO",vuihoc."BUOI_HOC",vuihoc."LOP_HOC",vuihoc."CHI_TIET_CA_LOP",vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BIEN_BAN_DU_GIO' AND column_name='malophoc') THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='HOC_LIEU_LOP' AND column_name='tuan') THEN RAISE EXCEPTION 'Chạy migration 20261126 trước.'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT string_agg(e.madinhdanh,', ' ORDER BY e.madinhdanh) INTO pending
 FROM vuihoc."BIEN_BAN_DU_GIO" e
 LEFT JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=e.mabuoi
 LEFT JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 LEFT JOIN vuihoc."CHI_TIET_CA_LOP" c ON c.mabuoi=b.madinhdanh
 LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh)
 WHERE b.madinhdanh IS NULL OR g.madinhdanh IS NULL
 OR e.magiaovien IS DISTINCT FROM g.madinhdanh OR e.malophoc IS DISTINCT FROM l.malophoc
 OR (e.ngaycahoc IS NOT NULL AND e.ngaycahoc IS DISTINCT FROM b.ngayhoc)
 OR (nullif(e.macahoc,'') IS NOT NULL AND e.macahoc IS DISTINCT FROM b.madinhdanh)
 OR (e.manguoinhan IS NOT NULL AND e.manguoinhan IS DISTINCT FROM g.manguoidung)
 OR e.sobuoi IS DISTINCT FROM c.sobuoi OR e.tenbuoihoc IS DISTINCT FROM b.tieude
 OR regexp_replace(e.khunggio,'\s','','g') IS DISTINCT FROM to_char(b.batdau,'HH24:MI')||'-'||to_char(b.ketthuc,'HH24:MI')
 OR e.mohinh IS DISTINCT FROM l.mamohinh
 OR coalesce(e.lienketphonghoc,'') IS DISTINCT FROM coalesce(b.lienketphonghoc,'')
 OR coalesce(e.lienketbanghi,'') IS DISTINCT FROM coalesce(b.lienketbanghi,'')
 OR e.diemtong IS DISTINCT FROM round((e.diemtc1+2*e.diemtc2+e.diemtc3)/4,2)
 OR e.xeploai IS DISTINCT FROM CASE WHEN e.diemtong>=9 THEN 'Xuất sắc' WHEN e.diemtong>=8 THEN 'Tốt' WHEN e.diemtong>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END;
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Biên bản chưa khớp nguồn buổi học hoặc điểm tiêu chí; chưa xóa cột nào.'
 USING DETAIL=pending,HINT='Chạy supabase/diagnostics/inspection_normalization_legacy.sql. Đối soát dữ liệu khác nhau trước, không tự ghi đè lịch sử.'; END IF;

 -- The view preserves the read contract, without storing another copy.
 CREATE VIEW vuihoc."V_BIEN_BAN_DU_GIO" WITH(security_invoker=true) AS
 SELECT e.madinhdanh,coalesce(b.magiaoviendaythay,b.magiaovienchinh) AS magiaovien,e.mabienban,e.mabuoi,
 l.malophoc,g.manguoidung AS manguoinhan,e.manguoidanhgia,e.ngaydanhgia,b.ngayhoc AS ngaycahoc,b.madinhdanh AS macahoc,
 e.guiluc,c.sobuoi,b.tieude AS tenbuoihoc,to_char(b.batdau,'HH24:MI')||' - '||to_char(b.ketthuc,'HH24:MI') AS khunggio,
 l.mamohinh AS mohinh,s.diemtong,
 CASE WHEN s.diemtong>=9 THEN 'Xuất sắc' WHEN s.diemtong>=8 THEN 'Tốt' WHEN s.diemtong>=7 THEN 'Khá' ELSE 'Cần bồi dưỡng' END AS xeploai,
 e.nhanxetchung,e.uudiem,e.cancaithien,e.khuyennghi,e.trangthai,b.lienketphonghoc,b.lienketbanghi,e.ngaytao,e.ngaycapnhat,e.diemtc1,e.diemtc2,e.diemtc3
 FROM vuihoc."BIEN_BAN_DU_GIO" e JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=e.mabuoi
 JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
 JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh)
 LEFT JOIN vuihoc."CHI_TIET_CA_LOP" c ON c.mabuoi=b.madinhdanh
 CROSS JOIN LATERAL (SELECT round((e.diemtc1+2*e.diemtc2+e.diemtc3)/4,2) AS diemtong) s;

 -- Replace the old nested history upsert as a whole: only independent facts are written.
 f:=pg_get_functiondef('vuihoc.ghi_du_lieu_quan_he_truoc_bo_json(text,jsonb,boolean)'::regprocedure);
 IF strpos(f,'INSERT INTO vuihoc."BIEN_BAN_DU_GIO"')=0 THEN RAISE EXCEPTION 'Không nhận diện được hàm ghi lịch sử dự giờ.'; END IF;
 f:=regexp_replace(f,'INSERT INTO vuihoc\."BIEN_BAN_DU_GIO"[\s\S]*?khuyennghi=excluded.khuyennghi,trangthai=excluded.trangthai;',
 $writer$PERFORM vuihoc.luu_bien_ban_du_gio(ev,id,evaluator);$writer$);
 IF strpos(f,'INSERT INTO vuihoc."BIEN_BAN_DU_GIO"')>0 THEN RAISE EXCEPTION 'Chưa chuyển được hàm ghi dự giờ.'; END IF;
 f:=replace(f,$old$coalesce(ev->>'evaluatorUserId',(SELECT min(madinhdanh) FROM vuihoc."NGUOI_DUNG" WHERE hoten=ev->>'evaluatorName'))$old$,$new$nullif(ev->>'evaluatorUserId','')$new$);
 EXECUTE f;
 CREATE OR REPLACE FUNCTION vuihoc.luu_bien_ban_du_gio(ev jsonb,p_teacher text,p_evaluator text) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $writer$
 DECLARE lesson text:=coalesce(nullif(ev->>'lessonId',''),nullif(ev->>'sessionCode','')); actual_teacher text;
 BEGIN
  SELECT coalesce(magiaoviendaythay,magiaovienchinh) INTO actual_teacher FROM vuihoc."BUOI_HOC" WHERE madinhdanh=lesson FOR SHARE;
  IF actual_teacher IS NULL OR actual_teacher IS DISTINCT FROM p_teacher THEN RAISE EXCEPTION 'Chọn đúng buổi học của giáo viên được đánh giá.'; END IF;
  INSERT INTO vuihoc."BIEN_BAN_DU_GIO"(madinhdanh,mabienban,mabuoi,manguoidanhgia,ngaydanhgia,guiluc,diemtc1,diemtc2,diemtc3,nhanxetchung,uudiem,cancaithien,khuyennghi,trangthai)
  VALUES(ev->>'id',ev->>'reportCode',lesson,p_evaluator,
   CASE WHEN ev->>'evaluationDate' LIKE '%/%' THEN to_date(ev->>'evaluationDate','DD/MM/YYYY') ELSE (ev->>'evaluationDate')::date END,
   nullif(ev->>'sentAt','')::timestamptz,(ev->'criteriaScores'->>'tc1')::numeric,(ev->'criteriaScores'->>'tc2')::numeric,(ev->'criteriaScores'->>'tc3')::numeric,
   coalesce(ev->>'generalComment',''),coalesce(ev->>'strengths',''),coalesce(ev->>'improvements',''),coalesce(ev->>'recommendations',''),ev->>'status')
  ON CONFLICT(madinhdanh) DO UPDATE SET mabienban=excluded.mabienban,mabuoi=excluded.mabuoi,manguoidanhgia=excluded.manguoidanhgia,
   ngaydanhgia=excluded.ngaydanhgia,guiluc=excluded.guiluc,diemtc1=excluded.diemtc1,diemtc2=excluded.diemtc2,diemtc3=excluded.diemtc3,
   nhanxetchung=excluded.nhanxetchung,uudiem=excluded.uudiem,cancaithien=excluded.cancaithien,khuyennghi=excluded.khuyennghi,trangthai=excluded.trangthai;
 END $writer$;

 -- All existing SQL readers, including teacher history and authorization, use the JOIN projection.
 FOR r IN SELECT p.oid,pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%BIEN_BAN_DU_GIO%'
 LOOP
  f:=regexp_replace(r.def,'(FROM|JOIN) vuihoc\."BIEN_BAN_DU_GIO"','\1 vuihoc."V_BIEN_BAN_DU_GIO"','g');
  IF f<>r.def THEN EXECUTE f; END IF;
 END LOOP;
 -- Enrich top-level evaluation rows as well as the nested teacher history.
 ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_chuan_hoa_du_gio;
 CREATE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
 LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $reader$
 DECLARE r jsonb;
 BEGIN
  IF p_table='BIEN_BAN_DU_GIO' THEN
   SELECT to_jsonb(e) INTO r FROM vuihoc."V_BIEN_BAN_DU_GIO" e WHERE e.madinhdanh=p_row->>'madinhdanh';
   RETURN vuihoc.du_lieu_quan_he_truoc_chuan_hoa_du_gio(p_table,coalesce(r,p_row));
  END IF;
  RETURN vuihoc.du_lieu_quan_he_truoc_chuan_hoa_du_gio(p_table,p_row);
 END $reader$;
 -- Config is also the read contract: keep the projection keys, reject them on write.
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'IF conf IS NULL THEN')=0 THEN RAISE EXCEPTION 'Không nhận diện được RPC ghi nghiệp vụ.'; END IF;
 f:=replace(f,'IF conf IS NULL THEN',$guard$IF ds='teacher_evaluations' THEN
  b:=b-ARRAY['magiaovien','malophoc','manguoinhan','ngaycahoc','macahoc','sobuoi','tenbuoihoc','khunggio','mohinh','diemtong','xeploai','lienketphonghoc','lienketbanghi'];
  IF v ?| ARRAY['magiaovien','malophoc','manguoinhan','ngaycahoc','macahoc','sobuoi','tenbuoihoc','khunggio','mohinh','diemtong','xeploai','lienketphonghoc','lienketbanghi'] THEN RAISE EXCEPTION 'Thông tin buổi học và tổng điểm/xếp loại chỉ được truy vấn; ghi mã buổi và điểm tiêu chí.'; END IF;
 END IF;
 IF conf IS NULL THEN$guard$);EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF strpos(f,$old$WHEN 'teacher_evaluations' THEN format('t.magiaovien=%L',own)$old$)=0 THEN RAISE EXCEPTION 'Không nhận diện được bộ lọc giáo viên xem dự giờ.'; END IF;
 f:=replace(f,$old$WHEN 'teacher_evaluations' THEN format('t.magiaovien=%L',own)$old$,
 $new$WHEN 'teacher_evaluations' THEN format('EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=t.mabuoi AND coalesce(b.magiaoviendaythay,b.magiaovienchinh)=%L)',own)$new$);EXECUTE f;
 -- Do not let an existing generic upsert merge virtual read fields back into storage.
 -- The existing config filter selects only physical writable columns.
 DROP TRIGGER IF EXISTS chuan_hoa_diem_du_gio ON vuihoc."BIEN_BAN_DU_GIO";
 DROP TRIGGER IF EXISTS kiem_tra_giao_vien ON vuihoc."BIEN_BAN_DU_GIO";
 DROP FUNCTION vuihoc.chuan_hoa_diem_du_gio();
 DROP FUNCTION vuihoc.kiem_tra_giao_vien_du_gio();
 ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" ALTER COLUMN mabuoi SET NOT NULL;
 ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" ADD CONSTRAINT bien_ban_chi_tiet_ca_fk FOREIGN KEY(mabuoi) REFERENCES vuihoc."CHI_TIET_CA_LOP"(mabuoi) ON DELETE RESTRICT;
 FOREACH f IN ARRAY removed LOOP EXECUTE format('ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" DROP COLUMN %I',f); END LOOP;
 CREATE OR REPLACE FUNCTION vuihoc.giu_nguon_bien_ban_du_gio() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 DECLARE b vuihoc."BUOI_HOC";
 BEGIN
  SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi FOR SHARE;
  IF NOT FOUND OR coalesce(b.magiaoviendaythay,b.magiaovienchinh) IS NULL THEN RAISE EXCEPTION 'Biên bản cần buổi học có giáo viên thực dạy.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM vuihoc."CHI_TIET_CA_LOP" WHERE mabuoi=NEW.mabuoi) THEN RAISE EXCEPTION 'Buổi học chưa có số buổi nguồn.'; END IF;
  RETURN NEW;
 END $guard$;
 CREATE TRIGGER giu_nguon_bien_ban_du_gio BEFORE INSERT OR UPDATE OF mabuoi ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_nguon_bien_ban_du_gio();
 CREATE OR REPLACE FUNCTION vuihoc.giu_giao_vien_buoi_da_du_gio() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $guard$
 BEGIN
  IF coalesce(NEW.magiaoviendaythay,NEW.magiaovienchinh) IS DISTINCT FROM coalesce(OLD.magiaoviendaythay,OLD.magiaovienchinh)
   AND EXISTS(SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" WHERE mabuoi=OLD.madinhdanh) THEN
   RAISE EXCEPTION 'Buổi học đã có biên bản dự giờ; không chuyển kết quả đánh giá sang giáo viên khác.';
  END IF;RETURN NEW;
 END $guard$;
 CREATE TRIGGER giu_giao_vien_buoi_da_du_gio BEFORE UPDATE OF magiaovienchinh,magiaoviendaythay ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.giu_giao_vien_buoi_da_du_gio();
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 FOREACH f IN ARRAY ARRAY['luu_bien_ban_du_gio(jsonb,text,text)','du_lieu_quan_he(text,jsonb)','du_lieu_quan_he_truoc_chuan_hoa_du_gio(text,jsonb)','giu_nguon_bien_ban_du_gio()','giu_giao_vien_buoi_da_du_gio()'] LOOP
  EXECUTE format('ALTER FUNCTION vuihoc.%s OWNER TO %I',f,trusted_owner);EXECUTE format('REVOKE ALL ON FUNCTION vuihoc.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
 EXECUTE format('ALTER VIEW vuihoc."V_BIEN_BAN_DU_GIO" OWNER TO %I',trusted_owner);
 REVOKE ALL ON vuihoc."V_BIEN_BAN_DU_GIO" FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_inspection_reports$;
