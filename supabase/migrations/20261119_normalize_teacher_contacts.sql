-- Apply after 20261118. Run the entire statement; an unexpected dependency rolls back everything.
-- Personal facts live only in NGUOI_DUNG. V_GIAO_VIEN is a JOIN, never another stored copy.
DO $normalize_teacher_contacts$
DECLARE f text; r record; cols text; pending text; fk record;
BEGIN
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG",vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NHOM_QUYEN' AND column_name='soluongnguoidung') THEN
  RAISE EXCEPTION 'Chạy bản 20261118 trước.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN' AND column_name='hoten') THEN RETURN; END IF;
 SELECT string_agg(g.madinhdanh,', ' ORDER BY g.madinhdanh) INTO pending
 FROM vuihoc."GIAO_VIEN" g LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung
 WHERE u.madinhdanh IS NULL OR (g.hoten,g.tendangnhap,g.thudientu,g.sodienthoai)
  IS DISTINCT FROM (u.hoten,u.tendangnhap,u.thudientu,u.sodienthoai);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Còn hồ sơ thiếu tài khoản hoặc thông tin không khớp; chưa xóa cột nào.'
  USING DETAIL=pending,HINT='Chạy supabase/diagnostics/teacher_contact_links.sql để đối soát trước; không tự ghép theo tên.'; END IF;

 -- Explicit columns ensure that this view does not depend on the columns being dropped.
 SELECT string_agg(format('g.%I',column_name),',' ORDER BY ordinal_position) INTO cols
 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN'
  AND column_name NOT IN ('hoten','tendangnhap','thudientu','sodienthoai');
 EXECUTE 'CREATE OR REPLACE VIEW vuihoc."V_GIAO_VIEN" WITH (security_invoker=true) AS SELECT '||cols||',u.hoten,u.tendangnhap,u.thudientu,u.sodienthoai FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung';

 DROP TRIGGER IF EXISTS dong_bo_lien_he_giao_vien ON vuihoc."NGUOI_DUNG";
 DROP FUNCTION IF EXISTS vuihoc.dong_bo_lien_he_giao_vien();

 -- Move existing SQL readers (including payroll and cover teaching) to the same JOIN.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','vuihoc') AND p.prokind='f'
   AND p.prosrc LIKE '%"GIAO_VIEN"%' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."GIAO_VIEN"','\1 vuihoc."V_GIAO_VIEN"','gi');
  f:=replace(f,'g vuihoc."GIAO_VIEN"','g vuihoc."V_GIAO_VIEN"');
  EXECUTE f;
 END LOOP;
 FOR r IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='vuihoc' AND c.relkind='v' AND c.relname<>'V_GIAO_VIEN' LOOP
  f:=pg_get_viewdef(r.oid,true);
  IF f LIKE '%"GIAO_VIEN"%' THEN
   f:=regexp_replace(f,'\m(FROM|JOIN)\s+vuihoc\."GIAO_VIEN"','\1 vuihoc."V_GIAO_VIEN"','gi');
   EXECUTE format('CREATE OR REPLACE VIEW %I.%I AS %s',r.nspname,r.relname,f);
  END IF;
 END LOOP;

 -- Projection for dynamic readers and optimistic concurrency checks.
 EXECUTE $sql$CREATE OR REPLACE FUNCTION vuihoc.lien_he_giao_vien(p_row jsonb) RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $body$
 SELECT p_row||jsonb_build_object('hoten',u.hoten,'tendangnhap',u.tendangnhap,'thudientu',u.thudientu,'sodienthoai',u.sodienthoai)
 FROM vuihoc."NGUOI_DUNG" u WHERE u.madinhdanh=p_row->>'manguoidung'
 $body$$sql$;
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he(text,jsonb)'::regprocedure);
 f:=replace(f,'BEGIN','BEGIN IF p_table=''GIAO_VIEN'' THEN p_row:=vuihoc.lien_he_giao_vien(p_row); END IF;');
 EXECUTE f;

 f:=pg_get_functiondef('public.vuihoc_create_teacher(text,jsonb)'::regprocedure);
 f:=replace(f,'madinhdanh,manguoidung,hoten,tendangnhap,thudientu,sodienthoai,mamonhoc','madinhdanh,manguoidung,mamonhoc');
 f:=replace(f,$old$VALUES(id,id,name,id,email,coalesce(p_profile->>'sodienthoai',''),p_profile->>'mamonhoc'$old$,
  $new$VALUES(id,id,p_profile->>'mamonhoc'$new$);
 f:=replace(f,'''teacher'',to_jsonb(teacher)','''teacher'',vuihoc.lien_he_giao_vien(to_jsonb(teacher))');
 IF f LIKE '%manguoidung,hoten%' THEN RAISE EXCEPTION 'Không nhận diện được hàm tạo giáo viên.'; END IF;
 EXECUTE f;

 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'IF oldrow IS NULL AND b IS NOT NULL')=0 OR strpos(f,'FROM jsonb_object_keys(v) k WHERE')=0 THEN
  RAISE EXCEPTION 'Không nhận diện được RPC ghi dữ liệu.'; END IF;
 f:=replace(f,'IF oldrow IS NULL AND b IS NOT NULL',
  'IF ds=''teachers'' AND oldrow IS NOT NULL THEN oldrow:=vuihoc.lien_he_giao_vien(oldrow); END IF; IF oldrow IS NULL AND b IS NOT NULL');
 f:=replace(f,'FROM jsonb_object_keys(v) k WHERE',
  'FROM jsonb_object_keys(v) k WHERE NOT (ds=''teachers'' AND k IN (''hoten'',''tendangnhap'',''thudientu'',''sodienthoai'')) AND');
 -- Contact keys remain accepted RPC inputs, but UPDATE only the source account.
 f:=replace(f,$old$UPDATE vuihoc."NGUOI_DUNG" SET hoten=v->>'hoten',thudientu=v->>'thudientu',sodienthoai=v->>'sodienthoai',mamonhoc=v->>'mamonhoc' WHERE madinhdanh=oldrow->>'manguoidung';$old$,
 $new$IF v->>'tendangnhap' IS DISTINCT FROM oldrow->>'tendangnhap' THEN RAISE EXCEPTION 'Sửa tên đăng nhập trong quản lý tài khoản.'; END IF;
 UPDATE vuihoc."NGUOI_DUNG" SET hoten=v->>'hoten',thudientu=v->>'thudientu',sodienthoai=v->>'sodienthoai',mamonhoc=v->>'mamonhoc' WHERE madinhdanh=oldrow->>'manguoidung';$new$);
 IF strpos(f,'Sửa tên đăng nhập')=0 THEN RAISE EXCEPTION 'Chưa chuyển được nơi ghi liên hệ giáo viên.'; END IF;
 EXECUTE f;

 -- Every teacher has one account. Accounts with a teacher are locked instead of deleted.
 f:=pg_get_functiondef('public.vuihoc_save_accounts(text,jsonb)'::regprocedure);
 IF strpos(f,'DELETE FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id;')=0 THEN RAISE EXCEPTION 'Không nhận diện được luồng xóa tài khoản.'; END IF;
 f:=replace(f,'DELETE FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id;',
  'IF EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN" WHERE manguoidung=id) THEN RAISE EXCEPTION ''Tài khoản đang gắn với hồ sơ giáo viên. Hãy khóa tài khoản thay vì xóa.''; END IF; DELETE FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id;');
 EXECUTE f;
 FOR fk IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."GIAO_VIEN"'::regclass
  AND contype='f' AND confrelid='vuihoc."NGUOI_DUNG"'::regclass LOOP
  EXECUTE format('ALTER TABLE vuihoc."GIAO_VIEN" DROP CONSTRAINT %I',fk.conname);
 END LOOP;
 ALTER TABLE vuihoc."GIAO_VIEN" ALTER COLUMN manguoidung SET NOT NULL;
 ALTER TABLE vuihoc."GIAO_VIEN" ADD CONSTRAINT giao_vien_tai_khoan_fk FOREIGN KEY(manguoidung)
  REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE RESTRICT;
 ALTER TABLE vuihoc."GIAO_VIEN" DROP COLUMN hoten,DROP COLUMN tendangnhap,DROP COLUMN thudientu,DROP COLUMN sodienthoai;
 REVOKE ALL ON FUNCTION vuihoc.lien_he_giao_vien(jsonb) FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_teacher_contacts$;
