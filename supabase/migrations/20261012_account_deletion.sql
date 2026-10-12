-- Run after encrypted_passwords/business_persistence. Keep teaching profiles and history.
BEGIN;
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
REVOKE ALL ON FUNCTION public.vuihoc_save_accounts(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_save_accounts(text,jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
