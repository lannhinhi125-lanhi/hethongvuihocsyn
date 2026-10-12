-- One text password column. Run this entire file in SQL Editor.
-- Keep numeric 6-8 digit passwords; other/unknown passwords become 123456.
-- Existing sessions close. Session token columns are not passwords.
BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS matkhau text;
DROP TRIGGER IF EXISTS sync_legacy_password ON vuihoc."NGUOI_DUNG";
CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keydata jsonb:='{}'; col text;
 secret text[]:=ARRAY['matkhau','matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','ngaycapnhat'];
BEGIN
 IF TG_OP<>'INSERT' THEN truoc:=to_jsonb(OLD)-secret; END IF;
 IF TG_OP<>'DELETE' THEN sau:=to_jsonb(NEW)-secret; END IF;
 IF TG_OP='UPDATE' AND truoc IS NOT DISTINCT FROM sau AND NOT (TG_TABLE_NAME='NGUOI_DUNG' AND ((to_jsonb(OLD)->'matkhau') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau'))) THEN RETURN NEW; END IF;
 SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO fields FROM
 (SELECT jsonb_object_keys(coalesce(truoc,'{}')||coalesce(sau,'{}')) k) keys WHERE (truoc->k) IS DISTINCT FROM (sau->k);
 -- Ghi nhận đổi mật khẩu mà không lưu hash/mật khẩu trong nhật ký.
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='NGUOI_DUNG' AND ((to_jsonb(OLD)->'matkhau') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau')) THEN fields:=array_append(fields,'matkhau'); END IF;
 FOREACH col IN ARRAY TG_ARGV LOOP keydata:=keydata||jsonb_build_object(col,coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."NHAT_KY_NGHIEP_VU"(manguoithuchien,tenbang,khoabanghi,thaotac,truongthaydoi,dulieutruoc,dulieusau)
 VALUES(nullif(current_setting('vuihoc.actor',true),''),TG_TABLE_NAME,keydata,TG_OP,fields,truoc,sau);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $audit$;
DO $convert$
DECLARE rowdata record;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NGUOI_DUNG' AND column_name='matkhau_mahoa') THEN
  FOR rowdata IN EXECUTE 'SELECT madinhdanh,matkhau_mahoa FROM vuihoc."NGUOI_DUNG" WHERE matkhau IS NULL AND matkhau_mahoa IS NOT NULL' LOOP
   BEGIN
    UPDATE vuihoc."NGUOI_DUNG" SET matkhau=vuihoc.giai_ma_mat_khau(rowdata.matkhau_mahoa) WHERE madinhdanh=rowdata.madinhdanh;
   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Cannot recover password for %; it will become 123456.',rowdata.madinhdanh;
   END;
  END LOOP;
 END IF;
END $convert$;
UPDATE vuihoc."NGUOI_DUNG" SET matkhau='123456' WHERE matkhau IS NULL OR matkhau !~ '^[0-9]{6,8}$';
UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL;
ALTER TABLE vuihoc."NGUOI_DUNG" ALTER COLUMN matkhau SET NOT NULL, ALTER COLUMN matkhau SET DEFAULT '123456';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."NGUOI_DUNG"'::regclass AND conname='nguoi_dung_matkhau_so') THEN
 ALTER TABLE vuihoc."NGUOI_DUNG" ADD CONSTRAINT nguoi_dung_matkhau_so CHECK (matkhau ~ '^[0-9]{6,8}$');
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $profile$
 SELECT to_jsonb(u)-ARRAY['matkhau','matkhau_mahoa','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaytao','ngaycapnhat'] $profile$;
CREATE OR REPLACE FUNCTION public.vuihoc_login(p_username text,p_password text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $login$
DECLARE u vuihoc."NGUOI_DUNG"; token text;
BEGIN
 IF p_username IS NULL OR length(p_username)>200 OR p_password IS NULL OR p_password !~ '^[0-9]{6,8}$' THEN RETURN jsonb_build_object('error','Mat khau phai gom 6 den 8 chu so.'); END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(tendangnhap))=lower(btrim(p_username)) FOR UPDATE;
 IF NOT FOUND OR u.trangthai<>'active' OR u.tamkhoaden>now() THEN RETURN jsonb_build_object('error','Ten dang nhap hoac mat khau khong dung, hoac tai khoan bi khoa.'); END IF;
 IF u.matkhau IS DISTINCT FROM p_password THEN
 UPDATE vuihoc."NGUOI_DUNG" SET solansai=CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END,
 tamkhoaden=CASE WHEN (CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END)>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE madinhdanh=u.madinhdanh;
 RETURN jsonb_build_object('error','Ten dang nhap hoac mat khau khong dung, hoac tai khoan bi khoa.'); END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RETURN jsonb_build_object('error','Tai khoan chua duoc gan nhom quyen.'); END IF;
 token:=encode(gen_random_bytes(32),'hex');
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=encode(digest(token,'sha256'),'hex'),phienhethan=now()+interval '12 hours',solansai=0,tamkhoaden=NULL WHERE madinhdanh=u.madinhdanh;
 RETURN public.vuihoc_session(token)||jsonb_build_object('token',token);
END $login$;
CREATE OR REPLACE FUNCTION public.vuihoc_save_accounts(p_token text,p_changes jsonb) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $save$
 DECLARE actor vuihoc."NGUOI_DUNG"; c jsonb; b jsonb; v jsonb; oldrow jsonb; k text; feature text; tab text; id text; pass text;
 ur vuihoc."NGUOI_DUNG"; gr vuihoc."NHOM_QUYEN";
 BEGIN
 -- Tuần tự hóa thay đổi phân quyền và tránh hai phiên đồng thời xóa quản trị cuối.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF jsonb_typeof(p_changes)<>'array' OR jsonb_array_length(p_changes)>100 THEN RAISE EXCEPTION 'Yêu cầu lưu không hợp lệ.'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
 b:=c->'before'; v:=c->'after'; tab:=c->>'dataset'; id:=coalesce(v->>'madinhdanh',b->>'madinhdanh'); pass:=c->>'password';
 IF tab NOT IN ('users','role_groups') OR id IS NULL THEN RAISE EXCEPTION 'Bảng hoặc mã bản ghi không hợp lệ.'; END IF;
 IF tab='users' THEN
 SELECT vuihoc.tai_khoan_cong_khai(u) INTO oldrow FROM vuihoc."NGUOI_DUNG" u WHERE madinhdanh=id;
 IF v IS NULL OR v='null'::jsonb THEN
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') OR NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Khong co quyen xoa tai khoan.'; END IF;
 IF id=actor.madinhdanh OR id='USR-01' THEN RAISE EXCEPTION 'Khong duoc xoa tai khoan dang dang nhap hoac quan tri goc.'; END IF;
 IF oldrow IS NULL OR b IS NULL OR b='null'::jsonb THEN RAISE EXCEPTION 'Tai khoan khong con ton tai. Hay tai lai.'; END IF;
 FOR k IN SELECT jsonb_object_keys(b) LOOP
  IF oldrow->k IS DISTINCT FROM b->k THEN RAISE EXCEPTION 'Tai khoan da thay doi. Hay tai lai truoc khi xoa.'; END IF;
 END LOOP;
 DELETE FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id;
 CONTINUE;
 END IF;
 IF oldrow IS NULL THEN
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Cấp tài khoản & Mật khẩu người dùng') THEN RAISE EXCEPTION 'Không có quyền cấp tài khoản.'; END IF;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền gán nhóm quyền.'; END IF;
 IF pass IS NULL OR pass !~ '^[0-9]{6,8}$' THEN RAISE EXCEPTION 'Mat khau phai gom 6 den 8 chu so.'; END IF;
 ELSE
 FOR k IN SELECT jsonb_object_keys(v||coalesce(b,'{}')) LOOP
 IF (v->k) IS DISTINCT FROM (b->k) THEN
 feature:=CASE WHEN k IN ('manhomquyen','vaitro') THEN 'Tạo, sửa, xóa & Gán Nhóm quyền' WHEN k='trangthai' THEN 'Khóa / Mở khóa tài khoản nhân sự' ELSE 'Chỉnh sửa thông tin tài khoản & Mật khẩu' END;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,feature) THEN RAISE EXCEPTION 'Không có quyền %',feature; END IF;
 END IF;
 END LOOP;
 IF coalesce(pass,'')<>'' AND NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') THEN RAISE EXCEPTION 'Không có quyền đổi mật khẩu.'; END IF;
 END IF;
 ELSE
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền sửa nhóm quyền.'; END IF;
 SELECT to_jsonb(g)-ARRAY['ngaytao','ngaycapnhat'] INTO oldrow FROM vuihoc."NHOM_QUYEN" g WHERE madinhdanh=id;
 END IF;
 IF oldrow IS NULL AND b IS NOT NULL AND b<>'null'::jsonb THEN RAISE EXCEPTION 'Bản ghi đã bị xóa. Hãy tải lại.'; END IF;
 IF oldrow IS NOT NULL THEN
 IF b IS NULL OR b='null'::jsonb THEN RAISE EXCEPTION 'Mã đã tồn tại. Hãy tải lại.'; END IF;
 FOR k IN SELECT jsonb_object_keys(b) LOOP
 IF (oldrow->k) IS DISTINCT FROM (b->k) THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi ở phiên khác. Hãy tải lại trước khi sửa.'; END IF;
 END LOOP;
 END IF;
 IF tab='role_groups' THEN
 IF v IS NULL OR v='null'::jsonb THEN
 IF EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE manhomquyen=id) THEN RAISE EXCEPTION 'Nhóm quyền đang được tài khoản sử dụng.'; END IF;
 DELETE FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=id;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE x NOT IN ('madinhdanh','tennhomquyen','phanloai','mota','soluongnguoidung','danhsachquyen','macdinh','congtruycap')) THEN RAISE EXCEPTION 'Trường nhóm quyền không hợp lệ.'; END IF;
 gr:=jsonb_populate_record(NULL::vuihoc."NHOM_QUYEN",v);
 IF gr.congtruycap IS NULL THEN RAISE EXCEPTION 'Hãy chọn cổng cho nhóm quyền.'; END IF;
 INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,danhsachquyen,macdinh,congtruycap)
 VALUES(gr.madinhdanh,gr.tennhomquyen,gr.phanloai,gr.mota,coalesce(gr.soluongnguoidung,0),gr.danhsachquyen,gr.macdinh,gr.congtruycap)
 ON CONFLICT(madinhdanh) DO UPDATE SET tennhomquyen=excluded.tennhomquyen,phanloai=excluded.phanloai,mota=excluded.mota,danhsachquyen=excluded.danhsachquyen,macdinh=excluded.macdinh,congtruycap=excluded.congtruycap;
 END IF;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE x NOT IN ('madinhdanh','hoten','tendangnhap','thudientu','sodienthoai','vaitro','mamonhoc','trangthai','chucaiavatar','manhomquyen')) THEN RAISE EXCEPTION 'Trường tài khoản không hợp lệ.'; END IF;
 ur:=jsonb_populate_record(NULL::vuihoc."NGUOI_DUNG",v);
 IF btrim(ur.tendangnhap)='' OR length(ur.tendangnhap)>200 THEN RAISE EXCEPTION 'Tên đăng nhập không hợp lệ.'; END IF;
 IF ur.manhomquyen IS NULL OR NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=ur.manhomquyen) THEN RAISE EXCEPTION 'Nhóm quyền không tồn tại.'; END IF;
 IF coalesce(pass,'')<>'' AND (pass !~ '^[0-9]{6,8}$') THEN RAISE EXCEPTION 'Mat khau phai gom 6 den 8 chu so.'; END IF;
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,manhomquyen,matkhau)
 VALUES(ur.madinhdanh,ur.hoten,btrim(ur.tendangnhap),ur.thudientu,ur.sodienthoai,ur.vaitro,ur.mamonhoc,ur.trangthai,ur.chucaiavatar,ur.manhomquyen,CASE WHEN coalesce(pass,'')<>'' THEN pass ELSE (SELECT matkhau FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id) END)
 ON CONFLICT(madinhdanh) DO UPDATE SET hoten=excluded.hoten,tendangnhap=excluded.tendangnhap,thudientu=excluded.thudientu,sodienthoai=excluded.sodienthoai,vaitro=excluded.vaitro,mamonhoc=excluded.mamonhoc,trangthai=excluded.trangthai,chucaiavatar=excluded.chucaiavatar,manhomquyen=excluded.manhomquyen,
 matkhau=excluded.matkhau;
 IF coalesce(pass,'')<>'' OR oldrow->>'trangthai' IS DISTINCT FROM v->>'trangthai' OR oldrow->>'manhomquyen' IS DISTINCT FROM v->>'manhomquyen' THEN
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE madinhdanh=id;
 END IF;
 END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u WHERE u.trangthai='active' AND u.matkhau IS NOT NULL AND vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền')) THEN RAISE EXCEPTION 'Phải giữ ít nhất một tài khoản hoạt động có quyền quản lý nhóm quyền.'; END IF;
 RETURN jsonb_build_object('saved',true);
 END $save$;
CREATE OR REPLACE FUNCTION public.vuihoc_create_teacher(p_token text,p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $fn$
DECLARE actor vuihoc."NGUOI_DUNG"; grp vuihoc."NHOM_QUYEN"; category vuihoc."CAP_HOC";
 id text; num bigint; email text; pass text; name text; grades text[]; models text[]; teacher vuihoc."GIAO_VIEN";
BEGIN
 -- Cùng thứ tự khóa với RPC tài khoản; cấp mã duy nhất khi nhiều người tạo đồng thời.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG",vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen AND g.congtruycap='ADMIN' AND g.danhsachquyen && ARRAY['ALL','PH3_ALL','PH3_WRITE','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên']) THEN
  RAISE EXCEPTION 'Không có quyền tạo hồ sơ và cấp tài khoản giáo viên.';
 END IF;
 IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_profile) k WHERE k NOT IN ('hoten','thudientu','sodienthoai','mamonhoc','macaphoc','danhsachkhoi','danhsachmohinh','bangcap','ngaybatdau','ngayketthuc')) THEN RAISE EXCEPTION 'Hồ sơ không hợp lệ.'; END IF;
 name:=btrim(p_profile->>'hoten'); email:=lower(btrim(p_profile->>'thudientu'));
 IF coalesce(name,'')='' OR length(name)>200 OR coalesce(email,'')='' OR email NOT LIKE '%@%.%' THEN RAISE EXCEPTION 'Tên hoặc email không hợp lệ.'; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(thudientu))=email) OR EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN" WHERE lower(btrim(thudientu))=email) THEN RAISE EXCEPTION 'Email đã được sử dụng.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."MON_HOC" WHERE mamonhoc=p_profile->>'mamonhoc' AND danghoatdong) THEN RAISE EXCEPTION 'Môn học không hoạt động hoặc không tồn tại.'; END IF;
 SELECT * INTO category FROM vuihoc."CAP_HOC" WHERE madinhdanh=p_profile->>'macaphoc' AND coalesce(danghoatdong,true);
 IF NOT FOUND THEN RAISE EXCEPTION 'Cấp học không hoạt động hoặc không tồn tại.'; END IF;
 IF jsonb_typeof(p_profile->'danhsachkhoi') IS DISTINCT FROM 'array' OR jsonb_typeof(p_profile->'danhsachmohinh') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Khối/mô hình phải là danh sách.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_profile->'danhsachkhoi') x WHERE jsonb_typeof(x)<>'string') OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_profile->'danhsachmohinh') x WHERE jsonb_typeof(x)<>'string') THEN RAISE EXCEPTION 'Mã khối/mô hình không hợp lệ.'; END IF;
 SELECT array_agg(DISTINCT x) INTO grades FROM jsonb_array_elements_text(p_profile->'danhsachkhoi') x;
 SELECT array_agg(DISTINCT x) INTO models FROM jsonb_array_elements_text(p_profile->'danhsachmohinh') x;
 IF coalesce(cardinality(grades),0)=0 OR EXISTS(SELECT 1 FROM unnest(grades) k WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(category.danhsachluachon) o WHERE o->>'id'=k)) THEN RAISE EXCEPTION 'Khối lớp không thuộc cấp học đã chọn.'; END IF;
 IF coalesce(cardinality(models),0)=0 OR EXISTS(SELECT 1 FROM unnest(models) m WHERE NOT EXISTS(SELECT 1 FROM vuihoc."MO_HINH_LOP" WHERE mamohinh=m AND danghoatdong)) THEN RAISE EXCEPTION 'Mô hình lớp không hợp lệ.'; END IF;
 SELECT * INTO grp FROM vuihoc."NHOM_QUYEN" WHERE congtruycap='TEACHER' ORDER BY coalesce(macdinh,false) DESC,(madinhdanh='ROLE-04') DESC,madinhdanh LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Chưa có nhóm quyền giáo viên. Hãy tạo nhóm quyền thuộc cổng TEACHER.'; END IF;
 SELECT coalesce(max(substring(code FROM 4)::bigint),0)+1 INTO num FROM (SELECT madinhdanh code FROM vuihoc."GIAO_VIEN" UNION ALL SELECT madinhdanh FROM vuihoc."NGUOI_DUNG" UNION ALL SELECT upper(tendangnhap) FROM vuihoc."NGUOI_DUNG") q WHERE code ~ '^GV-[0-9]{1,9}$';
 LOOP
  id:='GV-'||CASE WHEN num<1000 THEN lpad(num::text,3,'0') ELSE num::text END;
  EXIT WHEN NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=id OR lower(tendangnhap)=lower(id)) AND NOT EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=id);
  num:=num+1;
 END LOOP;
 pass:=lpad(floor(random()*100000000)::integer::text,8,'0');
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,manhomquyen,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,matkhau)
 VALUES(id,grp.madinhdanh,name,id,email,coalesce(p_profile->>'sodienthoai',''),'Giáo viên Giảng dạy',p_profile->>'mamonhoc','active',upper(left(name,1)),pass);
 INSERT INTO vuihoc."GIAO_VIEN"(madinhdanh,manguoidung,hoten,tendangnhap,thudientu,sodienthoai,mamonhoc,macaphoc,danhsachkhoi,danhsachmohinh,bangcap,ngaybatdau,ngayketthuc,trangthai,trangthaidanhgia,nhanxetdanhgia,socaranh,socadaxep,dakinlich)
 VALUES(id,id,name,id,email,coalesce(p_profile->>'sodienthoai',''),p_profile->>'mamonhoc',category.madinhdanh,grades,models,coalesce(p_profile->>'bangcap',''),nullif(p_profile->>'ngaybatdau',''),nullif(p_profile->>'ngayketthuc',''),'CHO_LOP','UNSCORED','',0,0,false) RETURNING * INTO teacher;
 RETURN jsonb_build_object('id',id,'username',id,'password',pass,'teacher',to_jsonb(teacher));
END $fn$;
CREATE OR REPLACE FUNCTION public.vuihoc_reveal_password(p_token text,p_user_id text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $reveal$
 DECLARE actor vuihoc."NGUOI_DUNG"; password text;
 BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Xem danh sách tài khoản và nhóm quyền')
 OR NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') THEN RAISE EXCEPTION 'Bạn không có quyền xem mật khẩu tài khoản.'; END IF;
 SELECT matkhau INTO password FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy tài khoản.'; END IF;
 RETURN jsonb_build_object('password',password);
 END $reveal$;
DROP FUNCTION IF EXISTS vuihoc.dong_bo_mat_khau_cu();
DROP FUNCTION IF EXISTS vuihoc.ma_hoa_mat_khau(text);
DROP FUNCTION IF EXISTS vuihoc.giai_ma_mat_khau(bytea);
ALTER TABLE vuihoc."NGUOI_DUNG" DROP COLUMN IF EXISTS matkhau_mahoa, DROP COLUMN IF EXISTS matkhau_bam;
ALTER TABLE vuihoc."CAU_HINH_HE_THONG" DROP COLUMN IF EXISTS khoamatkhau;
REVOKE ALL ON FUNCTION public.vuihoc_login(text,text),public.vuihoc_save_accounts(text,jsonb),public.vuihoc_reveal_password(text,text),public.vuihoc_create_teacher(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_login(text,text),public.vuihoc_save_accounts(text,jsonb),public.vuihoc_reveal_password(text,text),public.vuihoc_create_teacher(text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
