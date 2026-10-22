# Rà soát nguồn dữ liệu và cột dư — 22/10/2026

Đợt 20261202: chuẩn hóa bộ lọc nhiều lựa chọn, bảo toàn đầy đủ cấu hình mẫu báo cáo. [Chi tiết ba bảng, trước/sau và giới hạn FK](REPORT_TEMPLATE_3NF_CHANGES.md). Không tạo bảng danh mục sao chép hay cột JSON; chưa áp dụng lên Supabase thật.

Đợt 20261201 rà ba bảng nhận xét/danh mục còn hoạt động: [đủ cột trước/sau và các nguồn liên kết](FEEDBACK_CATALOG_3NF_CHANGES.md). Không xóa cột hay thêm bảng; củng cố khóa nghiệp vụ và cây danh mục. Bốn bảng tiêu chí đã nghỉ không còn nằm trong danh sách bảng cần kiểm kê. Kiểm thử cục bộ; chưa thực thi lên Supabase thật.

Đợt 20261130 rà ba bảng công/kỳ/đối soát và bỏ bản sao kỳ/vai trò ở dòng công: xem [toàn bộ cột trước/sau, FK, nguồn và giới hạn](PAYROLL_3NF_CHANGES.md). Kiểm thử cục bộ; chưa thực thi lên Supabase thật trong phiên này.

Đợt 20261129 xử lý bản sao minh chứng ở giải trình: xem [đủ cột trước/sau, FK và các luồng](WORK_EVIDENCE_3NF_CHANGES.md). Đã chuẩn bị và kiểm thử cục bộ; chưa thực thi lên Supabase thật trong phiên này.

Đợt 20261128 tiếp tục chuẩn hóa tên sự cố, đồng bộ truy vấn danh mục, công và báo cáo. Xem [đủ cột trước/sau và nguồn JOIN](INCIDENT_3NF_CHANGES.md). Bản sửa được kiểm thử cục bộ, chưa chạy lên Supabase thật trong phiên này.

Các bản sửa 20261116–20261126 (giáo viên, tài khoản/quyền, hồ sơ học sinh–đăng ký–xếp lớp, chi tiết ca/dạy thay, sĩ số, thời hạn, khung giờ và nguồn học liệu) được ghi riêng tại [NORMALIZATION_CHANGES.md](NORMALIZATION_CHANGES.md). Kết quả kiểm kê bên dưới mô tả trạng thái trước migration 20261116; không phải cấu trúc sau các bản sửa này. Người dùng đã báo chạy thành công đến 20261122; 20261123–20261126 được kiểm thử cục bộ, chưa áp dụng lên Supabase thật trong phiên này.

## Kết luận và phạm vi

Có dữ liệu dư thừa cần xử lý. Không thể khẳng định toàn bộ cơ sở dữ liệu đã đạt 3NF chỉ vì có khóa ngoại hoặc đã bỏ JSONB. Một số màn hình đã đọc bằng truy vấn đúng nguồn nhưng bảng vật lý vẫn còn các cột cũ.

Đã đối chiếu mã giao diện, mapper, RPC đọc/ghi, trigger và cấu trúc PostgreSQL cục bộ dựng từ các migration trong repository. Bản dựng bao gồm cập nhật quan hệ, đăng ký theo môn, sửa hồ sơ/lớp, lịch sử đăng ký, mã buổi hiển thị, thời hạn tùy chỉnh và danh mục tạm dừng đến 20261115.

**Chưa truy cập Supabase thật.** Số liệu cấu trúc bên dưới thuộc bản dựng cục bộ, không phải kết quả đo trên tài khoản Supabase của người dùng. Không sửa/xóa cột hoặc dữ liệu nghiệp vụ trong lần kiểm tra này. Các tài liệu rà soát cũ mô tả những thời điểm trước một số migration nên không dùng riêng chúng để kết luận hiện trạng.

## Kiểm kê cấu trúc

- 51 bảng nền, 453 cột, 102 ràng buộc khóa ngoại trong bản dựng cục bộ.
- Hai cột sinh tự động: số thứ tự và mã buổi hiển thị. Đây không phải hai ô nhập dữ liệu độc lập.
- Không có cột JSON/JSONB hoặc mảng trong bảng nền của bản dựng này. JSON truyền qua RPC và JSON dựng bằng truy vấn không phải bản sao dữ liệu được lưu trong bảng.
- SQL rà soát trả đúng một hàng cho mỗi cột vật lý; có khóa ngoại, biểu thức sinh, nhóm xử lý và các bảng trùng tên cột để người đọc đối chiếu.
- 50 cột được đánh dấu cần xem xét nguồn hoặc chính sách lưu; **không đồng nghĩa cả 50 cột đều phải xóa**. Trong đó 15 cột thuộc nhóm ưu tiên đầu. Các cột chưa có quy tắc cụ thể vẫn được trả về là `SOURCE_OR_UNCLASSIFIED`, không tự coi là đã đạt chuẩn hóa.

## Các nhóm cần xử lý trước

| Ưu tiên | Vị trí | Phát hiện từ mã hiện tại | Nguồn chính / hướng xử lý |
| --- | --- | --- | --- |
| 1 | `GIAO_VIEN.diemtc1/2/3`, `diemdanhgia`, `nhanxetdanhgia`, `trangthaidanhgia` | Bộ điểm/tóm tắt vẫn có cột riêng; mapper đã thay bằng kết quả từ `evaluationReports`. Cột cũ có thể khác giá trị đang hiển thị. | Giữ điểm và nhận xét ở `BIEN_BAN_DU_GIO`, liên kết `magiaovien`. Chuyển toàn bộ đường ghi/đọc tóm tắt sang truy vấn; đối chiếu giá trị cũ trước khi bỏ cột. |
| 1 | `GIAO_VIEN.socaranh`, `socadaxep`, `dakinlich` | Hàm đọc đã tính lại từ lịch và phân công; cột vật lý vẫn còn. Mapper đã chặn ghi lại các trường đếm từ giao diện. | Dùng `thong_ke_ca_giao_vien`, lịch rảnh định kỳ, lịch lớp và buổi dạy thay. Dọn các phụ thuộc cũ trước khi bỏ cột. |
| 1 | `HOC_SINH.mamonhoc`, `mamohinh`, `matrinhdo`, `trangthai`, `malophientai` | Các cột của mô hình một đăng ký còn tồn tại. Hàm đọc lấy đăng ký đầu tiên trong `DANG_KY_MON_HOC` để phủ lên chúng. Một học sinh có nhiều đăng ký thì các trường này không biểu diễn đầy đủ. | Hồ sơ chỉ giữ thông tin cá nhân/khối hiện tại. Môn, trình độ, mô hình, lớp và trạng thái từng đăng ký thuộc `DANG_KY_MON_HOC`. Phải chuyển cả kiểm tra, ghi dữ liệu và các luồng tương thích. |
| 1 | `NHOM_QUYEN.soluongnguoidung` | Giao diện đếm tài khoản theo mã nhóm, còn bảng lưu thêm số lượng. | Tính `COUNT` từ `NGUOI_DUNG.manhomquyen`; sửa RPC tài khoản/nhóm và hợp đồng mapper trước khi bỏ cột. |
| 2 | Họ tên, tài khoản, email, điện thoại trong `GIAO_VIEN` và `NGUOI_DUNG` | Có bản sao và trigger đồng bộ liên hệ. Có giáo viên có thể chưa liên kết tài khoản. | Chọn nguồn chính cho hồ sơ cá nhân. Với hồ sơ đã liên kết có thể truy vấn qua `manguoidung`; phải giữ được hồ sơ chưa có tài khoản, không xóa cột ngay. |
| 2 | `BIEN_BAN_DU_GIO` có `mabuoi` đồng thời lưu ngày/mã buổi/lớp/khung giờ/mô hình/liên kết | Form tạo biên bản chép ngữ cảnh từ buổi vào biên bản. Có khóa ngoại nhưng chưa loại được phụ thuộc qua buổi. | Phân biệt nội dung biên bản độc lập với ngữ cảnh truy vấn được và thông tin chốt tại ngày dự giờ. Biên bản cũ không có `mabuoi` phải được bảo toàn/đối soát trước. |
| 2 | `CHI_TIET_CA_LOP` và `BUOI_HOC` | Có các trường cùng liên quan tiêu đề, lịch, dạy thay, giờ vào, học liệu. `CHI_TIET_CA_LOP` vẫn được truy vấn cho số/thứ tự buổi và dữ liệu tương thích. | Xác định từng trường thuộc kế hoạch học liệu hay buổi thực tế; hợp nhất nguồn ghi/đọc theo `mabuoi`. Không xóa cả bảng theo suy đoán. |
| 2 | `PHAN_CONG_DAY_THAY.magiaovien` và `BUOI_HOC.magiaoviendaythay` | Cùng biểu diễn phân công dạy thay hiện tại, có trigger đồng bộ. | Chọn nguồn duy nhất; nếu cần lịch sử phân công thì thiết kế lịch sử riêng với thời điểm hiệu lực. Đồng bộ hai bản sao không tự tạo ra lịch sử. |
| 2 | `GIAI_TRINH_CONG_DAY.lienketminhchung` và `LINK_MINH_CHUNG_CONG` | Chuỗi các link và các hàng link cùng tồn tại, có trigger tách chuỗi. | Hàng link theo `magiaitrinh` là nguồn phù hợp cho nhiều minh chứng. Chuyển các luồng nhập/đọc trước khi bỏ chuỗi cũ. |
| 2 | `KHUNG_GIO.khoanggio` và `sophut` | Thời lượng được tính từ giờ bắt đầu/kết thúc trên UI nhưng vẫn lưu độc lập; chưa thấy ràng buộc CSDL buộc hai giá trị bằng nhau. | Chọn thời điểm bắt đầu/kết thúc làm nguồn; thời lượng sinh bằng truy vấn/cột sinh hoặc ràng buộc kiểm tra nhất quán. |
| 2 | `MO_HINH_LOP.sisotoida` và `LOP_HOC.sisotoida` | Có giới hạn ở mô hình và ở lớp. | Nếu lớp có giới hạn riêng thì đây là hai quy tắc khác nhau; nếu lớp luôn dùng nguyên mặc định thì nên truy vấn từ mô hình. Chưa kết luận xóa khi chưa rõ chính sách ghi đè. |
| 2 | `SU_CO_BUOI_HOC.tensuco` và `LOAI_SU_CO.ten` | Báo cáo hiện tra tên danh mục, nhưng tên lưu trong sự cố vẫn được dùng ở đường đọc công/tương thích. | Chốt tên hiện tại hay tên tại thời điểm lập biên bản. Nếu chỉ dùng tên hiện tại, dọn phụ thuộc rồi tra theo cặp mã nhóm/loại. |

Chính sách chọn điểm hiển thị cũng cần thống nhất: hiện mapper dùng phần tử đầu danh sách biên bản được sắp theo ngày giảm dần; không có bộ lọc trạng thái tại chính đoạn chọn đó. Nếu nghiệp vụ yêu cầu chỉ lấy biên bản đã duyệt, cần áp dụng thống nhất ở truy vấn hồ sơ và báo cáo, không mặc định mọi biên bản đều hợp lệ.

## Những chỗ giống nhau nhưng không nên gộp máy móc

| Dữ liệu | Lý do giữ hoặc kiểm soát riêng |
| --- | --- |
| `madinhdanh`, mã giáo viên/lớp/môn ở bảng liên kết | Khóa chính/khóa ngoại liên kết các thực thể. Với khóa ghép phải giữ đủ các phần, không chỉ giữ một mã loại có thể trùng giữa các nhóm. |
| `ngaytao`, `ngaycapnhat`, `trangthai` | Mô tả từng bản ghi. Ngày sửa hồ sơ khác ngày sửa biên bản; trạng thái tài khoản khác trạng thái giảng dạy. |
| Hệ số danh mục, hệ số áp dụng sự cố, hệ số dòng công | Mặc định cấu hình, hệ số đã áp dụng và công đã điều chỉnh/đối soát có vòng đời khác nhau. Không JOIN hệ số hiện tại để tính lại công kỳ đã khóa. |
| Trạng thái/lý do tạm dừng ở lớp và buổi | Lớp là trạng thái hiện tại; buổi giữ lần nghỉ thực tế để lịch sử không mất khi tiếp tục lớp. Cả hai tham chiếu cùng danh mục loại. |
| Lịch lớp và ngày/giờ của buổi | Mẫu lịch lặp khác một buổi cụ thể đã diễn ra hoặc đã điều chỉnh. Tương tự, giáo viên thực dạy của buổi có thể khác giáo viên hiện tại của lớp. |
| Học liệu lớp và học liệu đã dùng của buổi | Mẫu/kế hoạch có thể thay đổi, còn nội dung đã dùng cần giữ theo buổi nếu nghiệp vụ yêu cầu. Cần chỉ rõ bản nào là mẫu, bản nào là thực tế. |
| Đăng ký hiện tại và `LICH_SU_DANG_KY_HOC` / `LICH_SU_CA_DANG_KY_HOC` | Khóa đợt `dotdangky` phân biệt từng giai đoạn; học lại không được ghi đè nhu cầu/lịch của đợt cũ. |
| `BIEN_BAN_DU_GIO.diemtong`, `xeploai` | Là giá trị dẫn xuất có trigger chuẩn hóa từ ba điểm. Có thể thay bằng view/cột sinh nếu muốn mô hình chặt hơn; hiện không phải hai giá trị nhập độc lập. |
| Thời hạn tháng và ngày kết thúc lớp | Có cả chế độ theo tháng và ngày tùy chỉnh; ngày kết thúc không phải lúc nào cũng tính được từ số tháng. |

## Phạm vi từng phân hệ

| Phân hệ | Nguồn đã kiểm tra | Kết luận |
| --- | --- | --- |
| 1. Tài khoản / quyền | `NGUOI_DUNG`, `NHOM_QUYEN`, `NHOM_QUYEN_CHI_TIET`, `QUYEN`, liên kết giáo viên | Bảng gán quyền là quan hệ đúng hướng; cần dọn số lượng tài khoản lưu sẵn và chốt nguồn hồ sơ liên hệ/vai trò. |
| 2. Danh mục | Môn, trình độ, mô hình, khung giờ, cấp/khối, nhóm/loại sự cố, danh mục bổ sung | Tên chính nằm ở danh mục; các bảng nghiệp vụ có mã liên kết. Rà thêm thời lượng, giới hạn sĩ số và chính sách tên sự cố. |
| 3. Giáo viên / dự giờ | Hồ sơ, khối/mô hình được dạy, lịch rảnh, biên bản và mapper tóm tắt | Nhóm có dư thừa rõ nhất: điểm và số ca trong hồ sơ. Ngữ cảnh biên bản cũng cần rà theo `mabuoi`. Lịch rảnh định kỳ là nguồn giao diện hiện tại; bảng lịch theo tuần còn trong hợp đồng lưu trữ cũ, chưa có caller giao diện được tìm thấy trong lượt rà này. |
| 4. Học sinh / lớp / buổi | Hồ sơ, đăng ký theo môn, lịch đăng ký, lịch lớp, học liệu, buổi, lịch sử đợt | Đăng ký theo môn là nguồn chính. Các trường đăng ký trên hồ sơ và dữ liệu tương thích ca cần dọn phụ thuộc. |
| 5. Giám sát / sự cố / dạy thay | Buổi, điểm danh, nhận xét, sự cố, phân công | Điểm danh/nhận xét đã tách theo khóa buổi–học sinh. Cần chọn nguồn duy nhất cho phân công và chính sách tên sự cố. |
| 6. Tài liệu / cấu hình / chat | Loại tài liệu, tài liệu, cấu hình trợ lý, văn phong, phiên/câu hỏi chat | Tài liệu tham chiếu loại bằng mã. Văn phong trợ lý và văn phong nhận xét có ngữ cảnh riêng nên không kết luận trùng chỉ vì cùng chứa văn bản cấu hình. |
| 7. Công / đối soát / giải trình | Kỳ công, dòng công, trạng thái đối soát, giải trình, link minh chứng | Giữ công thực tế và dữ liệu khóa/gửi/duyệt. Cần dọn hai hình thức lưu danh sách link. Tổng công là truy vấn, không cần bảng sao chép kết quả tổng. |
| 8. Báo cáo / xuất file | Dataset từ bảng nghiệp vụ, mẫu báo cáo và các hàng chỉ số/bộ lọc | Kết quả hiển thị và Excel được tính từ dữ liệu đã đọc; không có bảng riêng lưu mọi cột của màn báo cáo. Mẫu được người dùng chủ động lưu là dữ liệu cấu hình hợp lệ. |

## Cách xác nhận trên Supabase thật

1. Chạy toàn bộ [normalization_review.sql](diagnostics/normalization_review.sql). Đây là `SELECT` metadata, trả danh sách các cột thực tế, kể cả cột thừa chỉ tồn tại ở database thật. `REVIEW` là yêu cầu xem xét, không phải lệnh xóa.
2. Nếu đã cập nhật schema đến 20261115, chạy [normalization_data_checks.sql](diagnostics/normalization_data_checks.sql). Kết quả chỉ gồm số hàng đã kiểm tra và số hàng cần xem xét; không trả họ tên, điện thoại, mật khẩu hoặc nội dung từng hồ sơ.
3. Không sửa giá trị tự động chỉ để làm số khác biệt bằng 0. Ví dụ sĩ số lớp khác mặc định mô hình có thể là ghi đè hợp lệ; điểm cũ không khớp biên bản cần xác minh nguồn trước khi bỏ.

Trên dữ liệu kiểm thử cục bộ đã quan sát được điểm giáo viên, trường đăng ký cũ và số tài khoản lưu sẵn có thể khác kết quả truy vấn hiện tại. Đây là minh chứng rủi ro của hai nguồn lưu, **không phải kết luận dữ liệu thật của người dùng đang sai**.

## Thứ tự sửa sau rà soát

1. Giáo viên–dự giờ: bảo toàn điểm chỉ có trong hồ sơ, thống nhất quy tắc chọn biên bản, chuyển hợp đồng đọc/ghi rồi bỏ bộ điểm tóm tắt dư và các cột đếm ca.
2. Nhóm quyền: loại số lượng tài khoản lưu sẵn khỏi RPC/mapper, dùng truy vấn đếm.
3. Hồ sơ học sinh–đăng ký theo môn: gỡ đường tương thích một đăng ký và chuyển các kiểm tra/FK liên quan trước khi bỏ cột cũ.
4. Hồ sơ cá nhân–tài khoản; ngữ cảnh dự giờ; ca và phân công dạy thay; link minh chứng. Với mỗi nhóm phải chốt quy tắc nguồn hiện tại/lịch sử trước khi chuyển.
5. Chạy lại luồng giao diện, lịch giáo viên, báo cáo, xuất Excel và đối soát trên dữ liệu đã chuyển. Chỉ bỏ cột sau khi đã kiểm tra không mất giá trị và không còn phụ thuộc đọc/ghi.

Chưa tạo migration xóa cột trong lần rà soát này. Kiểm thử SQL chẩn đoán được thực hiện trong giao dịch `READ ONLY`; kiểm tra đủ cột vật lý, không trùng hàng, giữ phân biệt cột dư và dữ liệu lịch sử, và chạy lặp cho cùng kết quả.
Đợt mới nhất 20261127 chuẩn hóa riêng bảng biên bản dự giờ: xem [đầy đủ các cột trước/sau, nguồn và ràng buộc](INSPECTION_3NF_CHANGES.md). Đợt này được kiểm thử cục bộ, chưa thực thi trên Supabase thật trong phiên hiện tại. Nội dung rà soát cũ bên dưới là lịch sử trước các migration.
