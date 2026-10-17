# Học nhiều môn, chuyển lớp và mã giáo viên của buổi

Áp dụng `migrations/20261026_student_subject_enrollments.sql` sau các migration đến `20261023_inspection_session_queries.sql`. Các bản `20261024`/`20261025` dọn dữ liệu mẫu không phải điều kiện cho tính năng này. Không chạy lại schema/seed hoặc migration cũ sau bản mới.

## Quy tắc nghiệp vụ

- Một mã học sinh dùng chung hồ sơ và thông tin phụ huynh, đăng ký được nhiều môn. Mỗi môn có trình độ, mô hình, lịch mong muốn, trạng thái và lớp hiện tại riêng.
- Một môn có tối đa một lớp hiện tại. Cùng học sinh có thể học Toán và Anh đồng thời khi lịch hai lớp không giao nhau. Hai ca nối tiếp nhau được phép.
- Trong form học sinh, chọn lần lượt các môn để nhập thông tin và lịch riêng rồi lưu. Danh sách và báo cáo đếm từng đăng ký môn trên cùng mã học sinh: một em đăng ký mới Toán và Anh được tính hai lượt đăng ký mới.
- Đăng ký và ghép lớp lần đầu của một môn được tính mới theo môn đó, dù học sinh đã học môn khác. Chuyển/rút rồi ghép lại lớp cùng môn được tính chuyển lớp. Ngày đăng ký và lịch sử lần đầu được theo dõi độc lập cho từng môn; không dùng ngày tạo hồ sơ chung để loại đăng ký môn mới.
- Nút **Rút khỏi lớp môn này** trả đăng ký môn đang chọn về **Chờ xếp lớp**. Lớp và đăng ký các môn khác giữ nguyên.
- Nút **Dừng lớp**, hoặc đổi trạng thái lớp thành **Tạm dừng / Đã kết thúc**, trả các đăng ký thuộc lớp đó về **Chờ xếp lớp**. Mở lại lớp không tự ghép lại các học sinh đã chuyển đi.
- Buổi tương lai chưa vào lớp của lớp bị dừng được đánh dấu nghỉ; không sinh thêm ô lịch chưa lưu cho lớp đã dừng. Database chặn check-in buổi mới của lớp đã dừng/kết thúc.
- Sau đó vận hành có thể ghép lớp mới của cùng môn. Lịch sử ghép/rời lớp được lưu với mã môn, mã lớp, mã học sinh và thời điểm. Điểm danh/nhận xét các buổi đã học không bị xóa khi chuyển lớp.
- Lớp đã có lịch sử có thể bị FK ngăn xóa; dùng dừng/kết thúc lớp để giữ truy vết.
- Buổi mới tự lấy mã giáo viên chính từ lớp. Mã giáo viên cover nằm riêng ở `BUOI_HOC.magiaoviendaythay`; giáo viên thực dạy là `coalesce(magiaoviendaythay,magiaovienchinh)`. Tên chỉ dùng hiển thị.
- Lịch cover trên cổng giáo viên được truy vấn từ buổi thực tế. Công ca cover ghi cho mã giáo viên cover, không cộng công chuẩn cho giáo viên chính. Không đổi mã giáo viên sau khi buổi đã ghi công.

## Lưu trữ và tương thích

`DANG_KY_MON_HOC` có khóa chính `(mahocsinh,mamonhoc)` và FK tới hồ sơ, danh mục môn, trình độ, mô hình, lớp. `LICH_DANG_KY_MON_HOC` lưu mỗi ca mong muốn thành một hàng có FK khung giờ. Không lưu JSON nghiệp vụ vào bảng.

RPC vẫn dùng dataset `students`, bổ sung `dangkymonhoc` là kết quả truy vấn/tham số truyền danh sách đăng ký. Các trường môn/trạng thái/lớp đơn ở API là projection của đăng ký đầu tiên để giữ tương thích với mã cũ; mọi liên kết lớp và sĩ số dùng bảng đăng ký mới. Các cột/bảng lịch cũ được giữ để tương thích, không dùng làm nguồn phân công mới. Không suy luận tất cả các môn từ trường scalar đầu tiên.

Migration chuyển đăng ký hiện có, giữ lịch sử và có thể chạy lại. Nếu dữ liệu cũ đã gán sai môn/khối/trình độ/mô hình hoặc vượt sĩ số, migration báo lỗi và rollback để đối soát, không tự sửa bằng cách xóa dữ liệu.

RLS chặn truy cập trực tiếp bằng anon; thao tác đi qua RPC phiên đăng nhập hiện có. Sửa liên kết lớp trong đăng ký cần quyền ghép/rút học sinh. Database kiểm tra sĩ số, lịch trùng và đăng ký khớp lớp ở cuối giao dịch.

## Kiểm thử

`tests/studentSubjectEnrollments.test.mjs` dựng PostgreSQL cục bộ từ schema và chuỗi migration, kiểm tra nhiều môn, rollback khi lịch trùng, dừng lớp, chuyển/rút lớp, tải lại, lịch sử, chạy lại migration, không cột JSON, mã chính/cover và công cho cover.

`tests/studentRegistrations.test.ts` kiểm tra cập nhật độc lập từng môn và mapper. `tests/sessionTeacherIds.test.ts` kiểm tra hai giáo viên trùng tên vẫn giữ đúng ID được chọn.

Chưa áp dụng lên Supabase thật trong phiên sửa mã này.
