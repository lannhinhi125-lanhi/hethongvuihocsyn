# Truy vết ghép/chuyển lớp độc lập

Chạy migrations/20261020_remove_general_audit.sql sau 20261018_auto_checkout.sql. Nếu đã chạy 20261019, bản 20261020 sẽ chuyển nguyên lịch sử hiện có. Nếu chưa chạy 20261019 thì không cần chạy nó nữa. Không chạy lại các migration cũ sau bản 20261020.

## Cấu trúc

TRUY_VET_XEP_LOP chỉ phục vụ lịch sử ghép/rời/chuyển lớp:

| Cột | Lưu / truy vấn |
|---|---|
| madinhdanh | Số tự tăng, không dùng UUID hoặc mã sự kiện |
| mahocsinh | FK HOC_SINH; SELECT tên và ngày tiếp nhận |
| malopcu, malopmoi | FK LOP_HOC; SELECT mã hiển thị và tên lớp |
| thoigian | Một trường ngày–giờ thao tác, tự ghi khi lưu |
| manguoithuchien | FK NGUOI_DUNG; SELECT tên người thực hiện |
| nguon | Phân biệt thao tác thật, lịch sử được chuyển và mốc hiện trạng thiếu lịch sử |

Không thêm cột JSON/JSONB hoặc mảng. API có thể vận chuyển danh sách truy vết bằng JSON; dữ liệu lưu là từng dòng với các cột trên. Ngày–giờ hiển thị theo Asia/Bangkok; không có thêm trường thời gian thực hiện trùng lặp.

## Bỏ nhật ký chung

Migration chuyển các dòng truy vết (hoặc bằng chứng ghép/chuyển lớp còn trong nhật ký) sang bảng độc lập. Thời gian và người thực hiện được giữ nguyên trước khi xóa SU_KIEN_NGHIEP_VU, CHI_TIET_NHAT_KY và view NHAT_KY_NGHIEP_VU. Dữ liệu nhật ký chung còn lại được xóa theo yêu cầu; không tạo bảng nhật ký chung thay thế.

Chỉ các trigger gọi ghi_nhat_ky_nghiep_vu được gỡ. Trigger kiểm tra sĩ số, khóa công, check-in/out, nhận xét và sinh công được giữ. Trigger ghi_chuyen_lop_hoc_sinh chỉ chạy khi lớp hiện tại đổi (hoặc tạo học sinh đã có lớp); không ghi nhật ký mọi lần sửa tên, điện thoại hoặc trạng thái.

Không dùng DROP CASCADE: phụ thuộc bất ngờ sẽ khiến giao dịch thất bại và hoàn tác thay vì xóa lan sang nghiệp vụ khác. Migration chạy lại không nhân bản lịch sử.

## Giao diện và báo cáo

Chi tiết học sinh có Lịch sử lớp học: mã số ngắn, ngày–giờ, lớp cũ → lớp mới và người thực hiện. Không cần nhập lại tên học sinh, tên lớp hoặc người thao tác.

Báo cáo truy vấn lượt ghép đến cuối kỳ, không xóa lượt cũ khi học sinh chuyển đi sau kỳ. Lớp mới chỉ được tính tăng trưởng khi tất cả học sinh mới trong kỳ và ghép lần đầu. Chuyển trong cùng tháng hoặc rời rồi ghép lại vẫn không phải ghép lần đầu. Lịch sử là SELECT-only trong API.

Mốc HIEN_TRANG chỉ xác nhận lớp hiện tại khi không có bằng chứng ghép lịch sử, không được tính là lớp mới. Dữ liệu quá khứ thiếu bằng chứng không thể tự khôi phục chính xác. Sĩ số/chỗ trống vẫn phản ánh dữ liệu vận hành hiện tại, còn số mới/cũ và phân loại tăng trưởng lấy từ truy vết.

Các học sinh/lớp có lịch sử không xóa cứng được vì khóa ngoại bảo vệ truy vết; dùng trạng thái nghỉ/bảo lưu hoặc tạm dừng/kết thúc theo nghiệp vụ.

Kiểm thử: tests/removeGeneralAudit.test.mjs, tests/noJsonStorage.test.mjs với TEST_REMOVE_AUDIT=1; tests/studentClassTraceMapper.test.ts và tests/classGrowth.test.ts. removeGeneralAudit hỗ trợ SKIP_OLD_TRACE=1 để kiểm tra chuyển trực tiếp từ bản 20261018.
