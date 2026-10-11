-- Đăng nhập riêng trong cùng database; không sử dụng Supabase Auth.
BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER EXTENSION pgcrypto SET SCHEMA extensions;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS matkhau_bam text;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS maphien_bam text;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS phienhethan timestamptz;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS solansai integer NOT NULL DEFAULT 0;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS tamkhoaden timestamptz;
-- Giữ cột maxacthuc cũ để không mất dữ liệu, nhưng bỏ phụ thuộc auth.users.
DO $dropauth$ DECLARE r record; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."NGUOI_DUNG"'::regclass AND contype='f' AND confrelid=to_regclass('auth.users') LOOP
 EXECUTE format('ALTER TABLE vuihoc."NGUOI_DUNG" DROP CONSTRAINT %I',r.conname);
 END LOOP;
END; $dropauth$;
ALTER TABLE vuihoc."NGUOI_DUNG" DROP CONSTRAINT IF EXISTS users_role_check;
CREATE UNIQUE INDEX IF NOT EXISTS nguoi_dung_username_normalized ON vuihoc."NGUOI_DUNG" (lower(btrim(tendangnhap)));
UPDATE vuihoc."NGUOI_DUNG" u SET manhomquyen=g.madinhdanh FROM vuihoc."NHOM_QUYEN" g
 WHERE u.manhomquyen IS NULL AND u.vaitro=g.tennhomquyen
 AND (SELECT count(*) FROM vuihoc."NHOM_QUYEN" x WHERE x.tennhomquyen=u.vaitro)=1;
UPDATE vuihoc."NHOM_QUYEN" SET congtruycap=CASE WHEN phanloai='GIẢNG DẠY' THEN 'TEACHER' ELSE 'ADMIN' END WHERE congtruycap IS NULL;
ALTER TABLE vuihoc."NHAT_KY_NGHIEP_VU" ADD COLUMN IF NOT EXISTS manguoithuchien text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keydata jsonb:='{}'; col text;
 secret text[]:=ARRAY['matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','ngaycapnhat'];
BEGIN
 IF TG_OP<>'INSERT' THEN truoc:=to_jsonb(OLD)-secret; END IF;
 IF TG_OP<>'DELETE' THEN sau:=to_jsonb(NEW)-secret; END IF;
 IF TG_OP='UPDATE' AND truoc IS NOT DISTINCT FROM sau AND NOT (TG_TABLE_NAME='NGUOI_DUNG' AND (to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam')) THEN RETURN NEW; END IF;
 SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO fields FROM
 (SELECT jsonb_object_keys(coalesce(truoc,'{}')||coalesce(sau,'{}')) k) keys WHERE (truoc->k) IS DISTINCT FROM (sau->k);
 -- Ghi nhận đổi mật khẩu mà không lưu hash/mật khẩu trong nhật ký.
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='NGUOI_DUNG' AND (to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam') THEN fields:=array_append(fields,'matkhau'); END IF;
 FOREACH col IN ARRAY TG_ARGV LOOP keydata:=keydata||jsonb_build_object(col,coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."NHAT_KY_NGHIEP_VU"(manguoithuchien,tenbang,khoabanghi,thaotac,truongthaydoi,dulieutruoc,dulieusau)
 VALUES(nullif(current_setting('vuihoc.actor',true),''),TG_TABLE_NAME,keydata,TG_OP,fields,truoc,sau);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $audit$;

CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT to_jsonb(u)-ARRAY['matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaytao','ngaycapnhat'] $$;
CREATE OR REPLACE FUNCTION vuihoc.nguoi_dung_phien(p_token text) RETURNS vuihoc."NGUOI_DUNG"
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 DECLARE u vuihoc."NGUOI_DUNG";
 BEGIN
 IF p_token IS NULL OR length(p_token)<>64 THEN RAISE EXCEPTION 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'; END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE maphien_bam=encode(digest(p_token,'sha256'),'hex') AND phienhethan>now() AND trangthai='active';
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RAISE EXCEPTION 'Phiên đã hết hạn hoặc tài khoản chưa được gán nhóm quyền.'; END IF;
 PERFORM set_config('vuihoc.actor',u.madinhdanh,true);
 RETURN u;
 END $$;
CREATE OR REPLACE FUNCTION vuihoc.co_quyen(p_user text,p_feature text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(bool_or(g.congtruycap='ADMIN' AND (g.danhsachquyen && ARRAY['ALL','PH1_ALL',p_feature])),false)
 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE u.madinhdanh=p_user AND u.trangthai='active' $$;
CREATE OR REPLACE FUNCTION public.vuihoc_session(p_token text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE u vuihoc."NGUOI_DUNG"; allusers boolean; allgroups boolean;
 BEGIN
 u:=vuihoc.nguoi_dung_phien(p_token);
 allusers:=vuihoc.co_quyen(u.madinhdanh,'Xem danh sách tài khoản và nhóm quyền');
 allgroups:=allusers OR vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền');
 RETURN jsonb_build_object('actor',vuihoc.tai_khoan_cong_khai(u),
 'users',(SELECT coalesce(jsonb_agg(vuihoc.tai_khoan_cong_khai(x)),'[]') FROM vuihoc."NGUOI_DUNG" x WHERE allusers OR x.madinhdanh=u.madinhdanh),
 'role_groups',(SELECT coalesce(jsonb_agg(to_jsonb(g)),'[]') FROM vuihoc."NHOM_QUYEN" g WHERE allgroups OR g.madinhdanh=u.manhomquyen));
 END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_login(p_username text,p_password text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 DECLARE u vuihoc."NGUOI_DUNG"; token text;
 BEGIN
 IF length(p_username)>200 OR octet_length(p_password)>72 OR p_password IS NULL THEN RETURN jsonb_build_object('error','Thông tin đăng nhập không hợp lệ.'); END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(tendangnhap))=lower(btrim(p_username)) FOR UPDATE;
 IF NOT FOUND THEN PERFORM crypt(coalesce(p_password,''),gen_salt('bf',10)); RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.'); END IF;
 IF u.trangthai<>'active' OR u.tamkhoaden>now() THEN RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa tạm thời.'); END IF;
 IF u.matkhau_bam IS NULL OR crypt(p_password,u.matkhau_bam)<>u.matkhau_bam THEN
 UPDATE vuihoc."NGUOI_DUNG" SET solansai=CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END,
 tamkhoaden=CASE WHEN (CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END)>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE madinhdanh=u.madinhdanh;
 RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RETURN jsonb_build_object('error','Tài khoản chưa được gán nhóm quyền.'); END IF;
 token:=encode(gen_random_bytes(32),'hex');
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=encode(digest(token,'sha256'),'hex'),phienhethan=now()+interval '12 hours',solansai=0,tamkhoaden=NULL WHERE madinhdanh=u.madinhdanh;
 RETURN public.vuihoc_session(token)||jsonb_build_object('token',token);
 END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_logout(p_token text) RETURNS void
 LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL WHERE maphien_bam=encode(digest(p_token,'sha256'),'hex') $$;

-- Cấp/sửa tài khoản và nhóm quyền; kiểm tra quyền tại database, không chỉ ở UI.
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
 IF v IS NULL OR v='null'::jsonb THEN RAISE EXCEPTION 'Hãy khóa tài khoản thay vì xóa.'; END IF;
 IF oldrow IS NULL THEN
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Cấp tài khoản & Mật khẩu người dùng') THEN RAISE EXCEPTION 'Không có quyền cấp tài khoản.'; END IF;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền gán nhóm quyền.'; END IF;
 IF pass IS NULL OR octet_length(pass)<8 OR octet_length(pass)>72 THEN RAISE EXCEPTION 'Mật khẩu cần từ 8 đến 72 byte.'; END IF;
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
 IF coalesce(pass,'')<>'' AND (octet_length(pass)<8 OR octet_length(pass)>72) THEN RAISE EXCEPTION 'Mật khẩu cần từ 8 đến 72 byte.'; END IF;
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,manhomquyen,matkhau_bam)
 VALUES(ur.madinhdanh,ur.hoten,btrim(ur.tendangnhap),ur.thudientu,ur.sodienthoai,ur.vaitro,ur.mamonhoc,ur.trangthai,ur.chucaiavatar,ur.manhomquyen,CASE WHEN coalesce(pass,'')<>'' THEN crypt(pass,gen_salt('bf',10)) END)
 ON CONFLICT(madinhdanh) DO UPDATE SET hoten=excluded.hoten,tendangnhap=excluded.tendangnhap,thudientu=excluded.thudientu,sodienthoai=excluded.sodienthoai,vaitro=excluded.vaitro,mamonhoc=excluded.mamonhoc,trangthai=excluded.trangthai,chucaiavatar=excluded.chucaiavatar,manhomquyen=excluded.manhomquyen,
 matkhau_bam=coalesce(excluded.matkhau_bam,vuihoc."NGUOI_DUNG".matkhau_bam);
 IF coalesce(pass,'')<>'' OR oldrow->>'trangthai' IS DISTINCT FROM v->>'trangthai' OR oldrow->>'manhomquyen' IS DISTINCT FROM v->>'manhomquyen' THEN
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE madinhdanh=id;
 END IF;
 END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u WHERE u.trangthai='active' AND u.matkhau_bam IS NOT NULL AND vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền')) THEN RAISE EXCEPTION 'Phải giữ ít nhất một tài khoản hoạt động có quyền quản lý nhóm quyền.'; END IF;
 RETURN jsonb_build_object('saved',true);
 END $save$;
REVOKE ALL ON FUNCTION vuihoc.tai_khoan_cong_khai(vuihoc."NGUOI_DUNG"),vuihoc.nguoi_dung_phien(text),vuihoc.co_quyen(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_login(text,text),public.vuihoc_session(text),public.vuihoc_logout(text),public.vuihoc_save_accounts(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_login(text,text),public.vuihoc_session(text),public.vuihoc_logout(text),public.vuihoc_save_accounts(text,jsonb) TO anon,authenticated;
-- Các bảng vẫn đóng với anon; client chỉ gọi những RPC kiểm tra phiên và quyền ở trên.
CREATE OR REPLACE FUNCTION public.vuihoc_status() RETURNS jsonb LANGUAGE sql SET search_path=pg_catalog AS 'SELECT jsonb_build_object(''ready'',true,''accounts'',''internal'')';
REVOKE ALL ON FUNCTION public.vuihoc_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_status() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
