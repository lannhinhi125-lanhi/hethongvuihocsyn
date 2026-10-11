# CSDL tinh gọn

Tạo mới: chạy schema.sql. Nâng cấp bản 32 bảng: chạy migrations/20261011_normalize_database.sql sau các migration cũ.

- Bỏ GIAO_VIEN.tenmonhoc/tencaphoc/tentrangthai; LOP_HOC.hotengiaovien; BIEN_BAN_DU_GIO.hotennguoidanhgia/vaitronguoidanhgia/tenlophoc.
- Giữ tên gốc tại danh mục, hồ sơ giáo viên và người dùng. Bộ đọc fromSupabaseRow nhận references (các hàng SQL) để lấy lại tên theo mã; bộ ghi bỏ các trường hiển thị này.
- HOC_SINH và LOP_HOC lưu trạng thái bằng code không dấu. Giao diện tiếp tục dùng nhãn tiếng Việt qua mapper. Giữ tên cột trangthai theo quy ước hiện có của dự án để không phá RPC tài khoản.
- Chỉ BUOI_HOC lưu ca thực tế. CA_HOC được chuyển sang BUOI_HOC, DIEM_DANH_BUOI_HOC, NHAN_XET_BUOI_HOC và SU_CO_BUOI_HOC rồi xóa trong cùng giao dịch.
- Các ca cũ dùng macahoc làm ID chuẩn mới. Tên giáo viên và khung giờ phải ánh xạ duy nhất; mã học sinh phải tồn tại. Không khớp hoặc đã có ca cùng lớp/ngày/khung giờ thì migration dừng và rollback; không tự chọn hoặc ghi đè.
- Ca cũ không có giờ kết thúc thực tế giữ DA_HOC_CU/DAY_THAY_CU/CO_SU_CO_CU/KHAI_GIANG_CU. Không tự sinh công từ trạng thái này. Ca mới dùng CHUA_DIEN_RA/DANG_HOC/HOAN_THANH/HUY/NGHI_HOC. Cần đối soát trước khi chốt công lịch sử.
- Sự cố cũ chưa biết giờ báo có baoluc=NULL, không suy đoán. Lịch sử audit trước/sau vẫn giữ nguyên.
- Dataset teaching_sessions bị chặn rõ ràng; dùng dated_lessons và các dataset con. API ca học cũ trong supabase.ts đã đổi nguồn BUOI_HOC. Ghi sự cố phải vào SU_CO_BUOI_HOC.

## Phạm vi tích hợp

Các màn nghiệp vụ React hiện vẫn dùng state/localStorage như trước, chưa có CRUD backend đầy đủ (xem README.md). Thay đổi này sửa hợp đồng lưu trữ; không có nghĩa mọi màn đã lưu lên Supabase. Chưa chạy migration trên Supabase thật.

Các JSONB nghiệp vụ cũ như LOP_HOC.chitietcahoc/phancongdaythay, GIAO_VIEN.baocaodanhgia/cahochoanthanh và BANG_CONG_THANG.danhsachgiaovien vẫn cần đối soát theo luồng UI trước khi chuyển bỏ. Không tự suy đoán ngày/mã ca từ JSON cũ. Không dùng chúng làm nguồn ca chính khi nối backend mới.

Kiểm thử: tests/normalization.test.ts kiểm tra tạo mới/chạy lại, nâng cấp/chạy lại, số ca và dữ liệu con, cột đã bỏ, mapper và rollback khi tên giáo viên trùng. tests/fixtures/preNormalization.sql là schema cũ cố định chỉ dùng kiểm thử nâng cấp.
