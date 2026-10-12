-- Run after 20261012_plaintext_passwords.sql or the latest schema.sql.
DO $setup$
<<setup>>
DECLARE ten text:='admin.tong'; matkhau text:='123456';
BEGIN
 IF matkhau IS NULL OR matkhau !~ '^[0-9]{6,8}$' THEN RAISE EXCEPTION 'Mat khau phai gom 6 den 8 chu so.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE lower(tendangnhap)=lower(ten)) THEN RAISE EXCEPTION 'Khong tim thay tai khoan.'; END IF;
 UPDATE vuihoc."NGUOI_DUNG" SET matkhau=setup.matkhau,trangthai='active',maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE lower(tendangnhap)=lower(ten);
END $setup$;
