-- Mật khẩu có thể xem lại: mã hóa AES-256 trong database, không dùng Supabase Auth.
-- Chạy sau 20261011_simple_accounts.sql. Không xóa dữ liệu hoặc tạo thêm bảng.
BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS matkhau_mahoa bytea;
ALTER TABLE vuihoc."CAU_HINH_HE_THONG" ADD COLUMN IF NOT EXISTS khoamatkhau text;

CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keydata jsonb:='{}'; col text;
 secret text[]:=ARRAY['matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','ngaycapnhat'];
BEGIN
 IF TG_OP<>'INSERT' THEN truoc:=to_jsonb(OLD)-secret; END IF;
 IF TG_OP<>'DELETE' THEN sau:=to_jsonb(NEW)-secret; END IF;
 IF TG_OP='UPDATE' AND truoc IS NOT DISTINCT FROM sau AND NOT (TG_TABLE_NAME='NGUOI_DUNG' AND ((to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam') OR (to_jsonb(OLD)->'matkhau_mahoa') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_mahoa'))) THEN RETURN NEW; END IF;
 SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO fields FROM
 (SELECT jsonb_object_keys(coalesce(truoc,'{}')||coalesce(sau,'{}')) k) keys WHERE (truoc->k) IS DISTINCT FROM (sau->k);
 -- Ghi nhận đổi mật khẩu mà không lưu hash/mật khẩu trong nhật ký.
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='NGUOI_DUNG' AND ((to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam') OR (to_jsonb(OLD)->'matkhau_mahoa') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_mahoa')) THEN fields:=array_append(fields,'matkhau'); END IF;
 FOREACH col IN ARRAY TG_ARGV LOOP keydata:=keydata||jsonb_build_object(col,coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."NHAT_KY_NGHIEP_VU"(manguoithuchien,tenbang,khoabanghi,thaotac,truongthaydoi,dulieutruoc,dulieusau)
 VALUES(nullif(current_setting('vuihoc.actor',true),''),TG_TABLE_NAME,keydata,TG_OP,fields,truoc,sau);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $audit$;

-- Chỉ sinh khóa một lần; chạy lại không thay khóa, không làm mất khả năng giải mã.
INSERT INTO vuihoc."CAU_HINH_HE_THONG"(madinhdanh) VALUES('global') ON CONFLICT DO NOTHING;
UPDATE vuihoc."CAU_HINH_HE_THONG" SET khoamatkhau=encode(extensions.gen_random_bytes(32),'hex') WHERE madinhdanh='global' AND khoamatkhau IS NULL;

CREATE OR REPLACE FUNCTION vuihoc.ma_hoa_mat_khau(p_password text) RETURNS bytea
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $encrypt$
 DECLARE secret text;
 BEGIN
 SELECT khoamatkhau INTO secret FROM vuihoc."CAU_HINH_HE_THONG" WHERE madinhdanh='global';
 IF secret IS NULL THEN RAISE EXCEPTION 'Chưa có khóa mã hóa mật khẩu. Hãy chạy migration encrypted_passwords.'; END IF;
 RETURN extensions.pgp_sym_encrypt(p_password,secret,'cipher-algo=aes256,compress-algo=0');
 END $encrypt$;
CREATE OR REPLACE FUNCTION vuihoc.giai_ma_mat_khau(p_cipher bytea) RETURNS text
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $decrypt$
 DECLARE secret text;
 BEGIN
 SELECT khoamatkhau INTO secret FROM vuihoc."CAU_HINH_HE_THONG" WHERE madinhdanh='global';
 IF secret IS NULL THEN RAISE EXCEPTION 'Không tìm thấy khóa mã hóa mật khẩu.'; END IF;
 RETURN extensions.pgp_sym_decrypt(p_cipher,secret);
 END $decrypt$;

CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $profile$
 SELECT to_jsonb(u)-ARRAY['matkhau_mahoa','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaytao','ngaycapnhat'] $profile$;

CREATE OR REPLACE FUNCTION public.vuihoc_login(p_username text,p_password text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 DECLARE u vuihoc."NGUOI_DUNG"; token text;
 BEGIN
 IF length(p_username)>200 OR octet_length(p_password)>72 OR p_password IS NULL THEN RETURN jsonb_build_object('error','Thông tin đăng nhập không hợp lệ.'); END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(tendangnhap))=lower(btrim(p_username)) FOR UPDATE;
 IF NOT FOUND THEN PERFORM crypt(coalesce(p_password,''),gen_salt('bf',10)); RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.'); END IF;
 IF u.trangthai<>'active' OR u.tamkhoaden>now() THEN RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa tạm thời.'); END IF;
 IF (u.matkhau_mahoa IS NOT NULL AND vuihoc.giai_ma_mat_khau(u.matkhau_mahoa) IS DISTINCT FROM p_password)
 OR (u.matkhau_mahoa IS NULL AND (u.matkhau_bam IS NULL OR crypt(p_password,u.matkhau_bam)<>u.matkhau_bam)) THEN
 UPDATE vuihoc."NGUOI_DUNG" SET solansai=CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END,
 tamkhoaden=CASE WHEN (CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END)>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE madinhdanh=u.madinhdanh;
 RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RETURN jsonb_build_object('error','Tài khoản chưa được gán nhóm quyền.'); END IF;
 -- Mật khẩu băm cũ được chuyển sau khi người dùng nhập đúng; không đảo ngược hash.
 IF u.matkhau_mahoa IS NULL THEN
 UPDATE vuihoc."NGUOI_DUNG" SET matkhau_mahoa=vuihoc.ma_hoa_mat_khau(p_password),matkhau_bam=NULL WHERE madinhdanh=u.madinhdanh;
 END IF;
 token:=encode(gen_random_bytes(32),'hex');
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=encode(digest(token,'sha256'),'hex'),phienhethan=now()+interval '12 hours',solansai=0,tamkhoaden=NULL WHERE madinhdanh=u.madinhdanh;
 RETURN public.vuihoc_session(token)||jsonb_build_object('token',token);
 END $$;
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
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,manhomquyen,matkhau_mahoa)
 VALUES(ur.madinhdanh,ur.hoten,btrim(ur.tendangnhap),ur.thudientu,ur.sodienthoai,ur.vaitro,ur.mamonhoc,ur.trangthai,ur.chucaiavatar,ur.manhomquyen,CASE WHEN coalesce(pass,'')<>'' THEN vuihoc.ma_hoa_mat_khau(pass) END)
 ON CONFLICT(madinhdanh) DO UPDATE SET hoten=excluded.hoten,tendangnhap=excluded.tendangnhap,thudientu=excluded.thudientu,sodienthoai=excluded.sodienthoai,vaitro=excluded.vaitro,mamonhoc=excluded.mamonhoc,trangthai=excluded.trangthai,chucaiavatar=excluded.chucaiavatar,manhomquyen=excluded.manhomquyen,
 matkhau_mahoa=coalesce(excluded.matkhau_mahoa,vuihoc."NGUOI_DUNG".matkhau_mahoa),
 matkhau_bam=CASE WHEN excluded.matkhau_mahoa IS NOT NULL THEN NULL ELSE vuihoc."NGUOI_DUNG".matkhau_bam END;
 IF coalesce(pass,'')<>'' OR oldrow->>'trangthai' IS DISTINCT FROM v->>'trangthai' OR oldrow->>'manhomquyen' IS DISTINCT FROM v->>'manhomquyen' THEN
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE madinhdanh=id;
 END IF;
 END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u WHERE u.trangthai='active' AND (u.matkhau_mahoa IS NOT NULL OR u.matkhau_bam IS NOT NULL) AND vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền')) THEN RAISE EXCEPTION 'Phải giữ ít nhất một tài khoản hoạt động có quyền quản lý nhóm quyền.'; END IF;
 RETURN jsonb_build_object('saved',true);
 END $save$;
CREATE OR REPLACE FUNCTION public.vuihoc_reveal_password(p_token text,p_user_id text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $reveal$
 DECLARE actor vuihoc."NGUOI_DUNG"; cipher bytea;
 BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Xem danh sách tài khoản và nhóm quyền')
 OR NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') THEN RAISE EXCEPTION 'Bạn không có quyền xem mật khẩu tài khoản.'; END IF;
 SELECT matkhau_mahoa INTO cipher FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy tài khoản.'; END IF;
 IF cipher IS NULL THEN RETURN jsonb_build_object('error','Mật khẩu cũ còn ở dạng băm. Hãy đăng nhập tài khoản đó một lần hoặc đặt mật khẩu mới để xem lại được.'); END IF;
 RETURN jsonb_build_object('password',vuihoc.giai_ma_mat_khau(cipher));
 END $reveal$;
-- Nếu dùng lại bản setup_admin cũ, hash mới phải vô hiệu hóa bản mã cũ.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_mat_khau_cu() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $legacy$
 BEGIN
 IF NEW.matkhau_bam IS NOT NULL AND NEW.matkhau_bam IS DISTINCT FROM OLD.matkhau_bam AND NEW.matkhau_mahoa IS NOT DISTINCT FROM OLD.matkhau_mahoa THEN NEW.matkhau_mahoa:=NULL; END IF;
 RETURN NEW;
 END $legacy$;
DROP TRIGGER IF EXISTS sync_legacy_password ON vuihoc."NGUOI_DUNG";
CREATE TRIGGER sync_legacy_password BEFORE UPDATE ON vuihoc."NGUOI_DUNG" FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_mat_khau_cu();
REVOKE ALL ON FUNCTION vuihoc.ma_hoa_mat_khau(text),vuihoc.giai_ma_mat_khau(bytea),vuihoc.dong_bo_mat_khau_cu() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_reveal_password(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_reveal_password(text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
