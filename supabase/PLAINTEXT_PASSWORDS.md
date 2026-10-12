# Mat khau text 6-8 chu so

Chay toan bo migrations/20261012_plaintext_passwords.sql trong SQL Editor cho database hien co. Khong can chay lai schema.sql hoac seed.

- Bang vuihoc.NGUOI_DUNG chi con mot cot mat khau: matkhau (text).
- Mat khau phai gom 6-8 chu so, giu so 0 o dau (vi du 001234).
- Mat khau cu dang so dung dinh dang duoc giu. Mat khau chu/ky tu dac biet, mat khau bam hoac khong giai ma duoc doi thanh 123456.
- Migration dang xuat cac phien hien tai. Dang nhap lai bang ten cu va mat khau moi.
- Tai khoan thu test.admin.tong, test.gv.001...test.gv.006 dung 123456.
- Giao vien moi duoc cap mat khau 8 chu so; them/sua tai khoan chap nhan 6-8 chu so.
- Xoa cot matkhau_mahoa, matkhau_bam va khoa ma hoa khoamatkhau. Giu maphien_bam/phienhethan vi day la du lieu phien dang nhap, khong phai mat khau.
- Mat khau hien truc tiep trong Table Editor. Giao dien tai khoan tai va hien text cho nguoi co quyen xem/sua mat khau.
- Cac migration 20261011_* va 20261012_account_deletion.sql la lich su: khong chay lai chung SAU migration nay. File schema.sql moi da bao gom ban text va chuc nang xoa.

Du lieu mat khau la text ro theo yeu cau, khong ma hoa. Khong xuat mat khau vao nhat ky nghiep vu hoac danh sach tai khoan RPC; nut xem/hien text van kiem tra quyen.
