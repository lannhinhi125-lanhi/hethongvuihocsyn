# Nhập hồ sơ bằng Excel

Hai màn hình hồ sơ giáo viên và học sinh có nút **Tải mẫu Excel** và **Nhập Excel** theo quyền tạo hồ sơ hiện có. Không thêm bảng/cột, không lưu file hoặc JSON vào cơ sở dữ liệu.

Mẫu `.xlsx` có ba sheet: `Nhap ho so`, `Huong dan`, `Danh muc`. Danh mục lấy từ Supabase đang tải trên màn hình, không dùng dữ liệu mẫu cố định. Điền sheet đầu từ dòng 2, giữ nguyên cột; tối đa 200 hồ sơ, 5 MB. Điện thoại cần định dạng văn bản để giữ số 0 đầu. Không chấp nhận công thức.

## Học sinh

Cột: họ tên, mã khối, tên/điện thoại cha, tên/điện thoại mẹ, mã cấp học, mã môn (tùy chọn), mã trình độ và mã mô hình (khi chọn môn).

Bắt buộc tên, cấp học, khối thuộc cấp học và ít nhất một số điện thoại liên hệ. Nếu để trống cả môn/trình độ/mô hình thì chỉ tạo hồ sơ. Nếu chọn môn, phải chọn đủ trình độ và mô hình đang hoạt động. Mỗi dòng tạo một học sinh và tối đa một đăng ký ban đầu; các môn khác có thể bổ sung bằng chức năng hiện tại, không lặp hồ sơ để đăng ký nhiều môn.

RPC `vuihoc_save_business` ghi thông tin hồ sơ vào **HOC_SINH**, thông tin đăng ký tùy chọn qua luồng chuẩn vào **DANG_KY_MON_HOC**. Cặp cấp học/khối được ánh xạ vào FK ghép `macaphoc, makhoi` hiện có, không thêm cột. Môn/trình độ/mô hình chỉ lưu ở đăng ký, không ghi bản sao trong HOC_SINH. Chưa có lịch đăng ký, chưa gán lớp. Đăng ký môn, bổ sung lịch và xếp lớp tiếp tục trên màn hình hiện có.

**SQL cần chạy:** toàn bộ `migrations/20261213_profile_only_student_import.sql`. Bản này bỏ quy tắc bắt mọi hồ sơ phải có đăng ký môn trong hàm `kiem_tra_dang_ky_mon`, đồng bộ bộ ghi quan hệ để không tạo đăng ký NULL khi chỉ nhập hồ sơ, và nhận mã cấp học để ánh xạ đúng khối trong phạm vi cấp học. Giữ các kiểm tra FK, xếp lớp, lịch và lịch sử. Không đổi cột của HOC_SINH hoặc DANG_KY_MON_HOC, không bỏ trigger, không tạo đăng ký giả. Các hồ sơ chưa đăng ký vẫn xuất hiện trong danh sách với nhãn “Chưa đăng ký môn”, trạng thái hiển thị “Chưa đăng ký học” và thao tác “Đăng ký học”. Trạng thái này là hiển thị từ việc không có đăng ký, không thêm cột hoặc bản ghi trạng thái mới. Hồ sơ đó không bị tính vào số đăng ký môn trong báo cáo.

## Giáo viên

Cột: họ tên, email, điện thoại, mã môn, mã cấp học, mã khối (nhiều mã ngăn bằng `;`), mã mô hình (nhiều mã ngăn bằng `;`), bằng cấp. Email không được trùng; cấp/khối/môn/mô hình phải thuộc danh mục đang hoạt động.

Dùng cùng hàm `createTeacherWithAccount → persistTeacher → vuihoc_create_teacher` như tạo tay. RPC tạo mã và tài khoản, ghi thông tin cá nhân một nguồn tại **NGUOI_DUNG**, chuyên môn tại **GIAO_VIEN** và các liên kết khối/mô hình hiện có. Không thêm bản sao thông tin cá nhân hoặc bảng nhập Excel. Tải “Kết quả nhập” để lấy mã, tên đăng nhập và mật khẩu ban đầu trước khi đóng hộp nhập.

## Kết quả và lỗi

Toàn bộ file được kiểm tra trước khi cho xác nhận. Bảng xem trước ghi số dòng gốc và lỗi cụ thể; sửa file rồi nhập lại nếu có lỗi kiểm tra. Khi lưu, từng hồ sơ là một lần gọi RPC độc lập: hồ sơ lỗi không làm mất những hồ sơ trước đã thành công. Hiển thị kết quả từng dòng và thông báo tổng số thành công/lỗi. Không cho bấm lưu lại cả đợt sau khi hoàn tất. Nếu cần nhập lại, chỉ đưa những dòng chưa thành công vào file mới; kiểm tra danh sách nếu gặp lỗi mạng không rõ kết quả.

## Kiểm tra

- `tests/profileImport.test.ts`: hai mẫu XLSX thật đọc lại được, mã lấy theo danh mục, giữ số 0 đầu/số dòng, bắt sai cột/mã/email/điện thoại/trùng hồ sơ, đăng ký môn tùy chọn, hồ sơ chưa có môn hiển thị và đăng ký sau.
- `tests/profileImportDatabaseCases.mjs`: được gọi trong bộ SQL tích hợp; kiểm tra migration lặp lại, tạo hồ sơ không đăng ký qua RPC thật, tạo kèm môn, bổ sung môn sau và giữ FK.
- `tests/profileImport.integration.test.mjs`: dựng database từ chuỗi migration thật, chạy các ca SQL trên, đối chiếu hợp đồng cấu trúc 50 bảng, tạo giáo viên bằng RPC và đăng nhập bằng tài khoản vừa tạo. Đã chạy qua trên PostgreSQL nhúng, chưa chạy trên Supabase trực tiếp.
- `tests/profileImport.browser.test.mjs`: trình duyệt thử tải mẫu, nhập XLSX, xem trước, lỗi danh mục, thông báo thành công/lỗi, kết quả lưu một phần và tải tài khoản giáo viên; lớp lưu được giả lập ở bài kiểm tra giao diện, RPC thật được kiểm tra riêng ở bài SQL.
- Cấu trúc vật lý không đổi, vẫn 50 bảng/384 cột theo các migration trước. Không cần thay số bảng của sơ đồ 29 bảng.
