> Cập nhật 20261212: MAU_BAO_CAO bỏ 8 cột của kỳ chạy, còn 10 cột; tổng cấu trúc mới 50 bảng/384 cột. Các mục khác giữ nguyên như đợt rà 20261209.

# Kiểm kê toàn bộ bảng sau 20261209

Phạm vi: schema `vuihoc` dựng từ toàn bộ chuỗi nâng cấp đến 20261209. Không phải cấu trúc riêng của `schema.sql` khởi tạo cũ. Không kết nối Supabase thật.

**50 bảng vật lý, 392 cột được kiểm kê; không có bảng vật lý chưa được đưa vào danh sách.** Đợt rà cuối không thêm/bỏ cột hoặc bảng nghiệp vụ; cột trước = cột sau trong từng mục dưới đây. Không tạo bảng lưu kết quả kiểm tra.

Các FK chỉ ra nguồn; chúng không tự chứng minh 3NF. Nhận định dựa cả vào khóa, phụ thuộc và vai trò nghiệp vụ mô tả bên dưới. Tên cột lặp giữa các bảng không tự là lỗi. Những cột phát sinh ngoài danh sách trên Supabase thật phải được rà tiếp, không được mặc định đạt.

## BANG_CONG_THANG

Kỳ công; mã tháng là khóa ứng viên. Khóa/gửi/mở kỳ là trạng thái của cả kỳ, không lưu tổng công.

**Cột trước = sau (8):** `madinhdanh, dakhoa, daguithongbao, thoigiankhoa, lydomokhoa, kycong, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (kycong)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## BIEN_BAN_DU_GIO

Một biên bản dự giờ; FK buổi xác định ngữ cảnh. Ba điểm là dữ kiện chấm, tổng/xếp loại truy vấn, không chép về giáo viên.

**Cột trước = sau (16):** `madinhdanh, mabienban, mabuoi, manguoidanhgia, ngaydanhgia, guiluc, nhanxetchung, uudiem, cancaithien, khuyennghi, trangthai, ngaytao, ngaycapnhat, diemtc1, diemtc2, diemtc3`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (mabienban)`.

**Nguồn liên kết:** `FOREIGN KEY (mabuoi) REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (mabuoi) REFERENCES vuihoc."CHI_TIET_CA_LOP"(mabuoi) ON DELETE RESTRICT`; `FOREIGN KEY (manguoidanhgia) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`.

## BO_LOC_MAU_BAO_CAO

Một giá trị bộ lọc của mẫu/trường; thứ tự thuộc quan hệ lựa chọn, không chứa tên thuộc tính của thực thể nguồn.

**Cột trước = sau (4):** `mamau, truong, giatri, thutu`.

**Khóa:** `PRIMARY KEY (mamau, truong, giatri)`; `UNIQUE (mamau, truong, thutu)`.

**Nguồn liên kết:** `FOREIGN KEY (mamau) REFERENCES vuihoc."MAU_BAO_CAO"(madinhdanh) ON DELETE CASCADE`.

## BUOI_HOC

Một lần học theo ngày; FK lớp/khung giờ/kế hoạch. Giáo viên, thao tác thực tế và ghi đè học liệu có phạm vi riêng; giờ ca JOIN nguồn.

**Cột trước = sau (28):** `madinhdanh, malop, ngayhoc, makhunggio, magiaovienchinh, magiaoviendaythay, tieude, lienketphonghoc, trangthai, vaolopluc, ketthucluc, manguoivaolop, manguoiketthuc, chuyencan, nhatky, lienketbanghi, ngaytao, ngaycapnhat, hoclieutieude, hoclieugiaovien, hoclieuhocsinh, baitaplms, tamhoandolop, lydotamdung, ghichutamdung, batdautamdung, manhomtamdung, mahoclieu`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (madinhdanh, malop)`; `UNIQUE (malop, ngayhoc, makhunggio)`.

**Nguồn liên kết:** `FOREIGN KEY (magiaovienchinh) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (magiaoviendaythay) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (makhunggio) REFERENCES vuihoc."KHUNG_GIO"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (malop) REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (malop, mahoclieu) REFERENCES vuihoc."HOC_LIEU_LOP"(malop, mahoclieu) DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (manguoiketthuc) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`; `FOREIGN KEY (manguoivaolop) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`; `FOREIGN KEY (manhomtamdung, lydotamdung) REFERENCES vuihoc."LOAI_SU_CO"(manhom, madinhdanh) DEFERRABLE INITIALLY DEFERRED`.

## CAP_HOC

Danh mục cấp học; tên đầy đủ và nhãn hiển thị là hai vai trò cấu hình, không giả định chúng phải bằng nhau.

**Cột trước = sau (6):** `danghoatdong, madinhdanh, tencaphoc, nhanhienthi, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## CAU_HINH_HE_THONG

Cấu hình dùng chung; chỉ FK văn phong đang chọn. Một hàng cấu hình, không chép nội dung văn phong.

**Cột trước = sau (4):** `madinhdanh, mavanphongdangchon, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (mavanphongdangchon) REFERENCES vuihoc."VAN_PHONG_NHAN_XET"(madinhdanh) ON DELETE SET NULL`.

**Chỉ mục duy nhất bổ sung:** `CREATE UNIQUE INDEX cau_hinh_he_thong_mot_ban ON vuihoc."CAU_HINH_HE_THONG" USING btree ((true))`.

## CAU_HINH_TRO_LY

Cấu hình trợ lý; chào hỏi, persona, chỉ dẫn và câu trả lời dự phòng là các vai trò riêng, không phải bản sao văn phong nhận xét.

**Cột trước = sau (8):** `madinhdanh, loichaomung, vanphong, chiduatrentailieu, cautraloiduphong, chidanhethong, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

**Chỉ mục duy nhất bổ sung:** `CREATE UNIQUE INDEX cau_hinh_tro_ly_mot_ban ON vuihoc."CAU_HINH_TRO_LY" USING btree ((true))`.

## CAU_HOI_CHAT_AI

Một câu hỏi thuộc phiên chat; không chép tài khoản/giáo viên từ đầu phiên, không lưu câu trả lời AI.

**Cột trước = sau (4):** `macauhoi, maphien, noidung, thoigianhoi`.

**Khóa:** `PRIMARY KEY (macauhoi)`.

**Nguồn liên kết:** `FOREIGN KEY (maphien) REFERENCES vuihoc."PHIEN_CHAT_AI"(maphien) ON DELETE CASCADE`.

## CHI_SO_MAU_BAO_CAO

Chỉ số được chọn của một mẫu; vị trí thuộc lựa chọn. Không lưu kết quả chỉ số.

**Cột trước = sau (3):** `mamau, machiso, thutu`.

**Khóa:** `PRIMARY KEY (mamau, machiso)`; `UNIQUE (mamau, thutu)`.

**Nguồn liên kết:** `FOREIGN KEY (mamau) REFERENCES vuihoc."MAU_BAO_CAO"(madinhdanh) ON DELETE CASCADE`.

## CHI_TIET_CA_LOP

Một ánh xạ giao diện của buổi; khóa buổi là nguồn, khoaca là khóa hiển thị và sobuoi là thứ tự phiên, không chép lớp/giáo viên/học liệu.

**Cột trước = sau (3):** `khoaca, mabuoi, sobuoi`.

**Khóa:** `PRIMARY KEY (mabuoi)`.

**Nguồn liên kết:** `FOREIGN KEY (mabuoi) REFERENCES vuihoc."BUOI_HOC"(madinhdanh)`.

## CHI_TIET_PHIEN_BAN_LICH_RANH

Trạng thái theo phiên bản/khung giờ/thứ. Không chép giáo viên hoặc thời điểm từ đầu phiên bản.

**Cột trước = sau (4):** `makhunggio, thutrongtuan, trangthai, maphienban`.

**Khóa:** `PRIMARY KEY (maphienban, makhunggio, thutrongtuan)`.

**Nguồn liên kết:** `FOREIGN KEY (makhunggio) REFERENCES vuihoc."KHUNG_GIO"(madinhdanh)`; `FOREIGN KEY (maphienban) REFERENCES vuihoc."PHIEN_BAN_LICH_RANH"(madinhdanh) ON DELETE CASCADE`.

## CONG_DAY_BUOI_HOC

Công thực tế của buổi và người nhận; hệ số/đối soát có vòng đời riêng. Kỳ và vai trò được truy vấn từ buổi.

**Cột trước = sau (11):** `madinhdanh, mabuoi, magiaovien, hesocong, ghichu, dagui, guiluc, ngaytao, ngaycapnhat, loaicong, trangthaidoisoat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (mabuoi, magiaovien)`.

**Nguồn liên kết:** `FOREIGN KEY (mabuoi) REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT`.

## DANG_KY_MON_HOC

Yêu cầu môn hiện tại của học sinh; trình độ/mô hình đăng ký khác dữ kiện lớp được xếp. Đợt/khối nhập học là dữ kiện đăng ký.

**Cột trước = sau (11):** `mahocsinh, mamonhoc, matrinhdo, mamohinh, trangthai, ngaydangky, dotdangky, loaidangky, khoidangky, thoihocluc, macaphocdangky`.

**Khóa:** `PRIMARY KEY (mahocsinh, mamonhoc)`.

**Nguồn liên kết:** `FOREIGN KEY (macaphocdangky, khoidangky) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc, madinhdanh) MATCH FULL`; `FOREIGN KEY (mahocsinh) REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE CASCADE`; `FOREIGN KEY (mamohinh) REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE`; `FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE`; `FOREIGN KEY (matrinhdo) REFERENCES vuihoc."TRINH_DO"(matrinhdo) ON UPDATE CASCADE`.

## DANH_MUC_BO_SUNG

Một nhóm danh mục có mã duy nhất; FK cha mô tả phân cấp. Không chép mục con.

**Cột trước = sau (7):** `madinhdanh, madanhmuc, tendanhmuc, mota, madanhmuccha, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (madanhmuc)`.

**Nguồn liên kết:** `FOREIGN KEY (madanhmuccha) REFERENCES vuihoc."DANH_MUC_BO_SUNG"(madinhdanh) ON DELETE RESTRICT`.

**Chỉ mục duy nhất bổ sung:** `CREATE UNIQUE INDEX danh_muc_bo_sung_ma_khong_trung ON vuihoc."DANH_MUC_BO_SUNG" USING btree (upper(btrim(madanhmuc)))`.

## DANH_MUC_SU_CO

Một nhóm sự cố; tên nhóm khác tên loại. Mã và định danh là khóa/định danh, không phải hai trường mô tả nhập trùng.

**Cột trước = sau (6):** `madinhdanh, manhomsuco, tennhomsuco, mota, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## DIEM_DANH_BUOI_HOC

Trạng thái của đúng một học sinh trong một buổi; khác chuyên cần giáo viên. Tên học sinh/lớp/giờ đều JOIN.

**Cột trước = sau (7):** `mabuoi, mahocsinh, trangthai, ghichu, manguoicapnhat, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (mabuoi, mahocsinh)`.

**Nguồn liên kết:** `FOREIGN KEY (mabuoi) REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (mahocsinh) REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manguoicapnhat) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`.

## DOI_SOAT_CONG_GIAO_VIEN

Trạng thái đối soát của giáo viên trong kỳ, khác trạng thái từng dòng công và khóa của cả kỳ.

**Cột trước = sau (4):** `kycong, magiaovien, dagui, trangthai`.

**Khóa:** `PRIMARY KEY (kycong, magiaovien)`.

**Nguồn liên kết:** `FOREIGN KEY (kycong) REFERENCES vuihoc."BANG_CONG_THANG"(kycong) ON DELETE RESTRICT`; `FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT`.

## GIAI_TRINH_CONG_DAY

Một giải trình đối với dòng công; nội dung, loại đề nghị và duyệt là dữ kiện của giải trình. Minh chứng là các hàng FK riêng.

**Cột trước = sau (12):** `madinhdanh, macong, noidung, loaisuco, trangthai, guiluc, manguoigui, manguoiduyet, duyetluc, ghichuduyet, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (macong) REFERENCES vuihoc."CONG_DAY_BUOI_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manguoiduyet) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`; `FOREIGN KEY (manguoigui) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`.

## GIAO_VIEN

Hồ sơ nghề nghiệp; liên hệ/tài khoản JOIN NGUOI_DUNG. Không lưu điểm dự giờ hoặc số ca tổng hợp.

**Cột trước = sau (10):** `madinhdanh, mamonhoc, macaphoc, bangcap, ngaybatdau, ngayketthuc, trangthai, manguoidung, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (manguoidung)`.

**Nguồn liên kết:** `FOREIGN KEY (macaphoc) REFERENCES vuihoc."CAP_HOC"(madinhdanh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (manguoidung) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE RESTRICT`.

## GIAO_VIEN_KHOI

Quan hệ giáo viên–lựa chọn khối; một FK lựa chọn có phạm vi, không chép cấp/khối/nhãn.

**Cột trước = sau (3):** `magiaovien, thutu, maluachon`.

**Khóa:** `PRIMARY KEY (magiaovien, maluachon)`.

**Nguồn liên kết:** `FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE`; `FOREIGN KEY (maluachon) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(maluachon) ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED`.

## GIAO_VIEN_MO_HINH

Quan hệ giáo viên–mô hình; thứ tự của quan hệ. Không chép tên/sĩ số của mô hình.

**Cột trước = sau (3):** `magiaovien, mamohinh, thutu`.

**Khóa:** `PRIMARY KEY (magiaovien, mamohinh)`.

**Nguồn liên kết:** `FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE`; `FOREIGN KEY (mamohinh) REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE`.

## HOC_LIEU_LOP

Kế hoạch theo lớp và mã học liệu/khoảng ngày/số buổi; nội dung kế hoạch là nguồn, override buổi học có vai trò riêng.

**Cột trước = sau (8):** `malop, mahoclieu, sobuoi, tieude, lienketslide, lienketlms, tungay, denngay`.

**Khóa:** `PRIMARY KEY (malop, mahoclieu)`; `UNIQUE (malop, tungay, sobuoi)`.

**Nguồn liên kết:** `FOREIGN KEY (malop) REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE CASCADE`.

## HOC_SINH

Hồ sơ học sinh và liên hệ cha/mẹ của hồ sơ; không chứa bản sao đăng ký. Không giả định số điện thoại là định danh duy nhất của một phụ huynh.

**Cột trước = sau (10):** `madinhdanh, hoten, hotencha, sodienthoaicha, hotenme, sodienthoaime, ngaytao, ngaycapnhat, macaphoc, makhoi`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (macaphoc, makhoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc, madinhdanh) DEFERRABLE INITIALLY DEFERRED`.

## KHUNG_GIO

Nguồn giờ bắt đầu/kết thúc; cặp giờ là khóa ứng viên. Khoảng giờ/số phút được truy vấn, không lưu lại.

**Cột trước = sau (8):** `madinhdanh, makhunggio, tenkhunggio, danghoatdong, ngaytao, ngaycapnhat, giobatdau, gioketthuc`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (giobatdau, gioketthuc)`; `UNIQUE (makhunggio)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## LICH_DANG_KY_MON_HOC

Ca yêu cầu trong đăng ký môn hiện tại; FK đủ cặp học sinh/môn và khung giờ. Khóa ứng viên chống ca trùng.

**Cột trước = sau (5):** `mahocsinh, mamonhoc, thutu, thutrongtuan, makhunggio`.

**Khóa:** `PRIMARY KEY (mahocsinh, mamonhoc, thutu)`; `UNIQUE (mahocsinh, mamonhoc, thutrongtuan, makhunggio)`.

**Nguồn liên kết:** `FOREIGN KEY (mahocsinh, mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC"(mahocsinh, mamonhoc) ON DELETE CASCADE`; `FOREIGN KEY (makhunggio) REFERENCES vuihoc."KHUNG_GIO"(madinhdanh)`.

## LICH_LOP

Mẫu thứ/khung giờ của lớp; khác một buổi học có ngày cụ thể. Không chép giờ chuẩn hoặc tên lớp.

**Cột trước = sau (4):** `malop, thutu, thutrongtuan, makhunggio`.

**Khóa:** `PRIMARY KEY (malop, thutu)`; `UNIQUE (malop, thutrongtuan, makhunggio)`.

**Nguồn liên kết:** `FOREIGN KEY (makhunggio) REFERENCES vuihoc."KHUNG_GIO"(madinhdanh)`; `FOREIGN KEY (malop) REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE CASCADE`.

## LICH_SU_CA_DANG_KY_HOC

Ca yêu cầu của đúng một đợt đăng ký đã lưu; đợt khác là dữ kiện khác. FK đủ học sinh/môn/đợt.

**Cột trước = sau (6):** `mahocsinh, mamonhoc, dotdangky, thutu, thutrongtuan, makhunggio`.

**Khóa:** `PRIMARY KEY (mahocsinh, mamonhoc, dotdangky, thutu)`; `UNIQUE (mahocsinh, mamonhoc, dotdangky, thutrongtuan, makhunggio)`.

**Nguồn liên kết:** `FOREIGN KEY (mahocsinh, mamonhoc, dotdangky) REFERENCES vuihoc."LICH_SU_DANG_KY_HOC"(mahocsinh, mamonhoc, dotdangky) ON DELETE CASCADE`; `FOREIGN KEY (makhunggio) REFERENCES vuihoc."KHUNG_GIO"(madinhdanh)`.

## LICH_SU_DANG_KY_HOC

Yêu cầu của đợt cũ; giữ khối/trình độ/mô hình tại đợt đó. Không JOIN ghi đè bằng hồ sơ/đăng ký hiện tại.

**Cột trước = sau (10):** `mahocsinh, mamonhoc, dotdangky, ngaydangky, ketthucluc, loaidangky, khoi, matrinhdo, mamohinh, macaphoc`.

**Khóa:** `PRIMARY KEY (mahocsinh, mamonhoc, dotdangky)`.

**Nguồn liên kết:** `FOREIGN KEY (macaphoc, khoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc, madinhdanh) MATCH FULL`; `FOREIGN KEY (mahocsinh) REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (mamohinh) REFERENCES vuihoc."MO_HINH_LOP"(mamohinh)`; `FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc)`; `FOREIGN KEY (matrinhdo) REFERENCES vuihoc."TRINH_DO"(matrinhdo)`.

## LINK_MINH_CHUNG_CONG

Một liên kết của giải trình; FK và thứ tự. Không còn danh sách liên kết lưu thêm ở giải trình.

**Cột trước = sau (3):** `magiaitrinh, thutu, lienket`.

**Khóa:** `PRIMARY KEY (magiaitrinh, thutu)`; `UNIQUE (magiaitrinh, lienket)`.

**Nguồn liên kết:** `FOREIGN KEY (magiaitrinh) REFERENCES vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh) ON DELETE CASCADE`.

## LOAI_SU_CO

Nguồn loại trong nhóm; hai khóa ứng viên theo ID và mã cùng phạm vi. Hệ số ở đây là mặc định, không thay công đã áp dụng/chốt.

**Cột trước = sau (12):** `manhom, madinhdanh, ma, ten, doituong, mota, danghoatdong, hesocong, loaithongbao, thutu, chopheptamdung, nghitheolich`.

**Khóa:** `PRIMARY KEY (manhom, madinhdanh)`; `UNIQUE (manhom, ma)`.

**Nguồn liên kết:** `FOREIGN KEY (manhom) REFERENCES vuihoc."DANH_MUC_SU_CO"(madinhdanh) ON DELETE CASCADE`.

## LOAI_TAI_LIEU

Nguồn loại tài liệu; tài liệu chỉ FK về mã loại, không chép tên loại.

**Cột trước = sau (4):** `madinhdanh, tenloai, mota, danghoatdong`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (tenloai)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## LOP_HOC

Nguồn lớp hiện tại; FK môn/trình độ/mô hình/cấp–khối/thời hạn. Không lưu sĩ số tối đa, giờ ca hoặc ngày kết thúc theo tháng dẫn xuất.

**Cột trước = sau (22):** `macaphoc, trangthai, madinhdanh, malophoc, tenlophoc, mamonhoc, matrinhdo, mamohinh, ngaybatdau, lienketphonghoc, magiaovien, ngaytao, ngaycapnhat, makhoi, tamdunglich, lydotamdung, ghichutamdung, batdautamdung, manhomtamdung, madanhmucthoihan, mathoihan, ngayketthuctuychinh`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (madinhdanh, mamonhoc)`; `UNIQUE (malophoc)`.

**Nguồn liên kết:** `FOREIGN KEY (macaphoc) REFERENCES vuihoc."CAP_HOC"(madinhdanh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (macaphoc, makhoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc, madinhdanh) DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (madanhmucthoihan, mathoihan) REFERENCES vuihoc."MUC_DANH_MUC"(madanhmuc, madinhdanh) MATCH FULL DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE SET NULL`; `FOREIGN KEY (mamohinh) REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (manhomtamdung, lydotamdung) REFERENCES vuihoc."LOAI_SU_CO"(manhom, madinhdanh) DEFERRABLE INITIALLY DEFERRED`; `FOREIGN KEY (matrinhdo) REFERENCES vuihoc."TRINH_DO"(matrinhdo) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED`.

## LUA_CHON_CAP_HOC

Lựa chọn có mã trong phạm vi cấp học; maluachon là khóa ứng viên sinh để tham chiếu, không phải bản sao tên/nhãn.

**Cột trước = sau (6):** `macaphoc, madinhdanh, nhan, thutu, macha, maluachon`.

**Khóa:** `PRIMARY KEY (macaphoc, madinhdanh)`; `UNIQUE (maluachon)`.

**Nguồn liên kết:** `FOREIGN KEY (macaphoc) REFERENCES vuihoc."CAP_HOC"(madinhdanh) ON DELETE CASCADE`; `FOREIGN KEY (macaphoc, macha) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc, madinhdanh) DEFERRABLE INITIALLY DEFERRED`.

## MAU_BAO_CAO

Cấu hình mẫu chủ động lưu; không lưu kết quả báo cáo. Bộ lọc/chỉ số nhiều giá trị ở bảng con.

**Trước (18):** `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, khoangngay, tungay, denngay, sapxep, sosanhbat, kieusosanh, sosanhtungay, sosanhdenngay, giatrichon, kieubieudo, chisobieudo`.

**Sau 20261212 (10):** `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, sapxep, kieubieudo, chisobieudo`. Không lưu thời gian của lần chạy.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (manguoidung) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE`.

## MON_HOC

Nguồn môn; mã là khóa ứng viên, tên/viết tắt/mô tả là thuộc tính của môn, không tự suy từ mã.

**Cột trước = sau (8):** `madinhdanh, mamonhoc, tenviettat, tenmonhoc, mota, danghoatdong, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (mamonhoc)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## MO_HINH_LOP

Nguồn mô hình và sĩ số tối đa; lớp JOIN giới hạn. Tên/mã là vai trò mô tả và định danh riêng.

**Cột trước = sau (7):** `madinhdanh, mamohinh, tenmohinh, sisotoida, danghoatdong, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (mamohinh)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## MUC_DANH_MUC

Mục thuộc nhóm; mã chỉ duy nhất trong nhóm. Không chép tên nhóm, không giả định mã mục là duy nhất toàn hệ thống.

**Cột trước = sau (7):** `madanhmuc, madinhdanh, ma, ten, mota, danghoatdong, thutu`.

**Khóa:** `PRIMARY KEY (madanhmuc, madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (madanhmuc) REFERENCES vuihoc."DANH_MUC_BO_SUNG"(madinhdanh) ON DELETE CASCADE`.

**Chỉ mục duy nhất bổ sung:** `CREATE UNIQUE INDEX muc_danh_muc_ma_trong_nhom ON vuihoc."MUC_DANH_MUC" USING btree (madanhmuc, upper(btrim(ma)))`.

## NGUOI_DUNG

Nguồn liên hệ/tài khoản; FK nhóm quyền, vai trò/môn/avatar được truy vấn. Phiên đăng nhập và giới hạn thử sai là dữ kiện vận hành của tài khoản.

**Cột trước = sau (14):** `manhomquyen, madinhdanh, hoten, tendangnhap, thudientu, sodienthoai, trangthai, ngaytao, ngaycapnhat, maphien_bam, phienhethan, solansai, tamkhoaden, matkhau`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (tendangnhap)`.

**Nguồn liên kết:** `FOREIGN KEY (manhomquyen) REFERENCES vuihoc."NHOM_QUYEN"(madinhdanh) ON DELETE SET NULL`.

**Chỉ mục duy nhất bổ sung:** `CREATE UNIQUE INDEX nguoi_dung_username_normalized ON vuihoc."NGUOI_DUNG" USING btree (lower(btrim(tendangnhap)))`.

## NHAN_XET_BUOI_HOC

Nội dung nhận xét của học sinh trong buổi và tác giả; không chứa tiêu chí/bộ đếm AI đã nghỉ.

**Cột trước = sau (6):** `mabuoi, mahocsinh, noidung, manguoicapnhat, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (mabuoi, mahocsinh)`.

**Nguồn liên kết:** `FOREIGN KEY (mabuoi) REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (mahocsinh) REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manguoicapnhat) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`.

## NHOM_QUYEN

Nguồn nhóm/quy tắc truy cập; số tài khoản và danh sách quyền truy vấn từ quan hệ, không lưu mảng quyền.

**Cột trước = sau (8):** `congtruycap, madinhdanh, tennhomquyen, phanloai, mota, macdinh, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## NHOM_QUYEN_CHI_TIET

Quan hệ nhóm–quyền; chỉ hai FK và thứ tự. Tên quyền JOIN QUYEN, không chép nhãn.

**Cột trước = sau (3):** `manhom, maquyen, thutu`.

**Khóa:** `PRIMARY KEY (manhom, maquyen)`.

**Nguồn liên kết:** `FOREIGN KEY (manhom) REFERENCES vuihoc."NHOM_QUYEN"(madinhdanh) ON DELETE CASCADE`; `FOREIGN KEY (maquyen) REFERENCES vuihoc."QUYEN"(maquyen)`.

## PHIEN_BAN_LICH_RANH

Phiên bản lịch có hiệu lực của giáo viên; ngày hết hiệu lực lấy từ lần kế tiếp. Không lưu lại theo tuần.

**Cột trước = sau (4):** `madinhdanh, magiaovien, manguoicapnhat, hieuluctu`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (magiaovien, hieuluctu)`.

**Nguồn liên kết:** `FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manguoicapnhat) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`.

## PHIEN_CHAT_AI

Đầu phiên thuộc tài khoản; không lưu thêm mã giáo viên được xác định từ tài khoản.

**Cột trước = sau (3):** `maphien, thoigianbatdau, manguoidung`.

**Khóa:** `PRIMARY KEY (maphien)`.

**Nguồn liên kết:** `FOREIGN KEY (manguoidung) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE`.

## QUYEN

Nguồn quyền; mã định danh và nhãn hiển thị có thể bằng nhau lúc khởi tạo nhưng có ý nghĩa riêng.

**Cột trước = sau (2):** `maquyen, tenquyen`.

**Khóa:** `PRIMARY KEY (maquyen)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## SU_CO_BUOI_HOC

Một biên bản sự cố và việc xử lý/công đã áp dụng; mã loại JOIN tên. Đối chiếu riêng bản tự sinh từ tạm dừng, không coi đồng bộ là bằng chứng chuẩn hóa.

**Cột trước = sau (16):** `madinhdanh, mabuoi, manhomsuco, masuco, hesocongapdung, muckhancap, noidung, trangthai, manguoibao, manguoixuly, baoluc, xulyluc, ghichuxuly, ngaytao, ngaycapnhat, dotamdunglop`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (mabuoi) REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manguoibao) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`; `FOREIGN KEY (manguoixuly) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`; `FOREIGN KEY (manhomsuco) REFERENCES vuihoc."DANH_MUC_SU_CO"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manhomsuco, masuco) REFERENCES vuihoc."LOAI_SU_CO"(manhom, ma) DEFERRABLE INITIALLY DEFERRED`.

**Chỉ mục duy nhất bổ sung:** `CREATE UNIQUE INDEX mot_su_co_tam_dung_moi_buoi ON vuihoc."SU_CO_BUOI_HOC" USING btree (mabuoi) WHERE dotamdunglop`.

## TAI_LIEU_QUY_TRINH

Nội dung tệp/tài liệu; FK loại và tài khoản tải lên. Không chép tên người tải/loại.

**Cột trước = sau (12):** `madinhdanh, tieude, maloaitailieu, tomtat, ngaycapnhat, noidung, tentepgoc, loaitepgoc, dangsudung, ngaytao, linkdrive, manguoitailen`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (maloaitailieu) REFERENCES vuihoc."LOAI_TAI_LIEU"(madinhdanh) ON UPDATE RESTRICT ON DELETE RESTRICT`; `FOREIGN KEY (manguoitailen) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE RESTRICT`.

## TRINH_DO

Nguồn trình độ; mã là khóa ứng viên, đối tượng và mục tiêu là thuộc tính của trình độ.

**Cột trước = sau (9):** `madinhdanh, matrinhdo, tenviettat, tentrinhdo, doituonghocsinh, muctieu, danghoatdong, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`; `UNIQUE (matrinhdo)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## TRUY_VET_XEP_LOP

Một sự kiện xếp/ra/chuyển lớp; hai FK lớp có vai trò cũ/mới. Môn JOIN lớp, không lưu bản sao.

**Cột trước = sau (7):** `madinhdanh, mahocsinh, malopcu, malopmoi, thoigian, manguoithuchien, nguon`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** `FOREIGN KEY (mahocsinh) REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (malopcu) REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (malopmoi) REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT`; `FOREIGN KEY (manguoithuchien) REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL`.

## VAN_PHONG_NHAN_XET

Nguồn văn phong nhận xét; tên và chỉ dẫn độc lập với persona trợ lý. Nơi chọn văn phong chỉ giữ FK.

**Cột trước = sau (5):** `madinhdanh, tenvanphong, chidan, ngaytao, ngaycapnhat`.

**Khóa:** `PRIMARY KEY (madinhdanh)`.

**Nguồn liên kết:** Bảng nguồn, không có FK đi ra.

## XEP_LOP_DANG_KY

Liên kết đúng đăng ký học sinh/môn với lớp đúng môn; mã môn là phần khóa đăng ký và FK chéo, không chép tên môn.

**Cột trước = sau (3):** `mahocsinh, mamonhoc, malop`.

**Khóa:** `PRIMARY KEY (mahocsinh, mamonhoc)`; `UNIQUE (mahocsinh, malop)`.

**Nguồn liên kết:** `FOREIGN KEY (mahocsinh, mamonhoc) REFERENCES vuihoc."DANG_KY_MON_HOC"(mahocsinh, mamonhoc) ON DELETE CASCADE`; `FOREIGN KEY (malop, mamonhoc) REFERENCES vuihoc."LOP_HOC"(madinhdanh, mamonhoc) ON DELETE RESTRICT`.

