-- Chạy SAU migration 20261011_simple_accounts.sql (hoặc schema.sql mới).
-- Sửa hai giá trị bên dưới rồi chạy trong SQL Editor. Không tạo Supabase Auth user.
DO $setup$
DECLARE ten text:='admin.tong'; matkhau text:='Quantritong123456';
BEGIN
 IF matkhau=('THAY_' || 'MAT_KHAU_CUA_BAN') OR octet_length(matkhau)<8 OR octet_length(matkhau)>72 THEN RAISE EXCEPTION 'Hãy đổi mật khẩu ở dòng DECLARE: từ 8 đến 72 byte. Không sửa dòng IF này.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
 WHERE lower(btrim(u.tendangnhap))=lower(btrim(ten)) AND g.congtruycap='ADMIN' AND (g.danhsachquyen && ARRAY['ALL','PH1_ALL','Tạo, sửa, xóa & Gán Nhóm quyền'])) THEN RAISE EXCEPTION 'Không tìm thấy tài khoản quản trị với tên đăng nhập này.'; END IF;
 UPDATE vuihoc."NGUOI_DUNG" SET matkhau_bam=extensions.crypt(matkhau,extensions.gen_salt('bf',10)),trangthai='active',maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE lower(btrim(tendangnhap))=lower(btrim(ten));
END; $setup$;
