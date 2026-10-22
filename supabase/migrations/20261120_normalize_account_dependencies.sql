-- Apply after 20261119. One atomic, repeatable statement; no new storage tables.
DO $normalize_account_dependencies$
DECLARE f text; pending text; r record;
BEGIN
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG",vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN' AND column_name='hoten') THEN
  RAISE EXCEPTION 'Chạy migration 20261119 trước.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NGUOI_DUNG' AND column_name='mamonhoc') THEN RETURN; END IF;
 SELECT string_agg(u.madinhdanh,', ' ORDER BY u.madinhdanh) INTO pending
 FROM vuihoc."NGUOI_DUNG" u LEFT JOIN vuihoc."GIAO_VIEN" g ON g.manguoidung=u.madinhdanh
 LEFT JOIN vuihoc."NHOM_QUYEN" n ON n.madinhdanh=u.manhomquyen
 WHERE n.madinhdanh IS NULL OR (nullif(btrim(u.mamonhoc),'') IS NOT NULL AND u.mamonhoc IS DISTINCT FROM g.mamonhoc);
 IF pending IS NOT NULL THEN RAISE EXCEPTION 'Còn tài khoản thiếu nhóm quyền hoặc môn học chưa khớp hồ sơ; chưa xóa cột nào.'
  USING DETAIL=pending,HINT='Chạy supabase/diagnostics/account_dependencies.sql để đối soát; không tự tạo hồ sơ hoặc đoán môn.'; END IF;

 -- Existing public-account projection remains the single reader used by login/session/save.
 CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $profile$
 SELECT (to_jsonb(u)-ARRAY['matkhau','matkhau_mahoa','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaytao','ngaycapnhat'])
 ||jsonb_build_object('vaitro',n.tennhomquyen,'mamonhoc',g.mamonhoc,
 'chucaiavatar',coalesce(nullif((SELECT upper(string_agg(left(part,1),'' ORDER BY ord)) FROM
  (SELECT part,ord FROM unnest(regexp_split_to_array(btrim(u.hoten),'\s+')) WITH ORDINALITY x(part,ord)
   WHERE part<>'' ORDER BY ord DESC LIMIT 2) initials),''),'VH'))
 FROM vuihoc."NHOM_QUYEN" n LEFT JOIN vuihoc."GIAO_VIEN" g ON g.manguoidung=u.madinhdanh
 WHERE n.madinhdanh=u.manhomquyen
 $profile$;

 f:=pg_get_functiondef('public.vuihoc_save_accounts(text,jsonb)'::regprocedure);
 IF strpos(f,$old$IF tab NOT IN ('users','role_groups')$old$)=0 THEN RAISE EXCEPTION 'Không nhận diện được RPC tài khoản.'; END IF;
 f:=replace(f,$old$IF tab NOT IN ('users','role_groups')$old$,$new$-- normalized_account_derived_fields
 IF tab='users' THEN
  -- Old clients may send unchanged projection values in before; these are not stored facts.
  IF jsonb_typeof(b)='object' THEN b:=b-ARRAY['vaitro','mamonhoc','chucaiavatar']; END IF;
  IF v ?| ARRAY['vaitro','mamonhoc','chucaiavatar'] THEN
   RAISE EXCEPTION 'Vai trò, môn và avatar là dữ liệu truy vấn. Sửa nhóm quyền hoặc hồ sơ giáo viên tại nguồn.';
  END IF;
 END IF;
 IF tab NOT IN ('users','role_groups')$new$);
 f:=replace(f,$old$'sodienthoai','vaitro','mamonhoc','trangthai','chucaiavatar','manhomquyen'$old$,
  $new$'sodienthoai','trangthai','manhomquyen'$new$);
 f:=replace(f,'sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,manhomquyen','sodienthoai,trangthai,manhomquyen');
 f:=replace(f,'ur.sodienthoai,ur.vaitro,ur.mamonhoc,ur.trangthai,ur.chucaiavatar,ur.manhomquyen','ur.sodienthoai,ur.trangthai,ur.manhomquyen');
 f:=replace(f,'vaitro=excluded.vaitro,mamonhoc=excluded.mamonhoc,','');
 f:=replace(f,'chucaiavatar=excluded.chucaiavatar,','');
 IF f LIKE '%ur.vaitro%' OR f LIKE '%ur.mamonhoc%' OR f LIKE '%ur.chucaiavatar%' THEN RAISE EXCEPTION 'Chưa chuyển hết nơi ghi tài khoản.'; END IF;
 EXECUTE f;

 f:=pg_get_functiondef('public.vuihoc_create_teacher(text,jsonb)'::regprocedure);
 f:=replace(f,'sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,matkhau','sodienthoai,trangthai,matkhau');
 f:=replace(f,$old$'Giáo viên Giảng dạy',p_profile->>'mamonhoc','active',upper(left(name,1)),pass$old$,$new$'active',pass$new$);
 IF f LIKE '%sodienthoai,vaitro%' THEN RAISE EXCEPTION 'Chưa chuyển được nơi cấp tài khoản giáo viên.'; END IF;
 EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,$old$,mamonhoc=v->>'mamonhoc' WHERE madinhdanh=oldrow->>'manguoidung'$old$)=0 THEN RAISE EXCEPTION 'Không nhận diện được nơi cập nhật môn tài khoản.'; END IF;
 f:=replace(f,$old$,mamonhoc=v->>'mamonhoc' WHERE madinhdanh=oldrow->>'manguoidung'$old$,$new$ WHERE madinhdanh=oldrow->>'manguoidung'$new$);
 EXECUTE f;

 -- Inspection evaluator labels are current group names, never a copied user role label.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%u.vaitro%' LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,'u.vaitro',$new$(SELECT nq.tennhomquyen FROM vuihoc."NHOM_QUYEN" nq WHERE nq.madinhdanh=u.manhomquyen)$new$);
  EXECUTE f;
 END LOOP;
 ALTER TABLE vuihoc."NGUOI_DUNG" ALTER COLUMN manhomquyen SET NOT NULL;
 ALTER TABLE vuihoc."NGUOI_DUNG" DROP COLUMN mamonhoc,DROP COLUMN vaitro,DROP COLUMN chucaiavatar;
 REVOKE ALL ON FUNCTION vuihoc.tai_khoan_cong_khai(vuihoc."NGUOI_DUNG") FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_account_dependencies$;
