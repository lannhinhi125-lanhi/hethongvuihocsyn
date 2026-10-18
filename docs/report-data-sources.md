# Nguồn dữ liệu Bàn làm việc và Báo cáo

Luồng đọc: Supabase RPC `public.vuihoc_business_data(p_token)` → `businessPersistence` → `fromSupabaseRow` → các phép lọc và tổng hợp chỉ đọc trên giao diện. Quyền tài khoản được kiểm tra trong RPC; giao diện không tự bổ sung các bản ghi thiếu quyền.

Không có số liệu ngẫu nhiên hoặc dữ liệu thay thế khi truy vấn lỗi. Lúc chưa tải thành công, không hiển thị bảng số liệu bằng 0. Khi làm mới thất bại, giữ lần tải thành công gần nhất và thông báo rõ. Thời điểm cập nhật là thời điểm nhận dữ liệu, không phải thời gian sửa từng bản ghi.

- Lớp, học sinh, giáo viên mới: ngày tạo hồ sơ (`ngaytao`). Hồ sơ thiếu ngày chỉ hiện ở toàn bộ thời gian. Sĩ số và trạng thái là hiện trạng.
- Ca dạy: từ `BUOI_HOC`, giáo viên thực dạy lấy giáo viên dạy thay nếu có.
- Tỷ lệ sự cố: cùng cơ sở ngày học trên Bàn làm việc, Báo cáo chi tiết và Báo cáo động. Đếm buổi có ít nhất một sự cố, không cộng trùng nhiều sự cố cùng buổi. Ngày báo sự cố có thể khác ngày học.
- Báo cáo động dự giờ: từng biên bản `DA_DUYET`, lọc chính xác theo ngày dự giờ. Điểm trung bình tính theo biên bản; số giáo viên đếm mã duy nhất. Mã biên bản và mã buổi được giữ để đối chiếu trong chi tiết nhóm.
- Bàn làm việc và báo cáo chi tiết xếp hạng giáo viên: trung bình điểm của từng giáo viên trong kỳ. Không nhầm với trung bình các biên bản trong Báo cáo động.
- Đăng ký môn và hồ sơ học sinh là hai nguồn riêng: một học sinh đăng ký hai môn vẫn là một hồ sơ.
- Học sinh cũ chuyển lớp: hồ sơ tạo trước kỳ, có lịch sử chuyển từ một lớp sang lớp khác trong kỳ, không dùng bản ghi hiện trạng làm bằng chứng. Chuyển nhiều lần chỉ tính một người. Hồ sơ mới có chuyển lớp được ghi riêng, vẫn nằm trong số hồ sơ mới.
- Lớp được tạo trong kỳ khác lớp mới tăng trưởng. Tăng trưởng yêu cầu ngày tạo lớp trong kỳ, có học sinh, toàn bộ hồ sơ học sinh mới trong kỳ và ghép lớp lần đầu theo môn. Học sinh cũ đăng ký thêm môn không trở thành học sinh mới. Thiếu lịch sử hoặc ngày tạo thì chưa xác định; không tự suy từ danh sách lớp hiện tại. Biểu đồ xu hướng Bàn làm việc dùng lớp mới tăng trưởng; bảng phân loại cộng lại bằng tổng lớp được tạo trong kỳ.
- Mẫu báo cáo chỉ lưu cấu hình vào `report_templates`; không chèn số tổng hợp, công hay bản ghi nghiệp vụ.

Báo cáo thống kê và Lập báo cáo nằm trong menu con “Báo cáo & thống kê” ở sidebar, không lặp tab ở đầu trang. Thống kê dùng để chọn nguồn, lọc, nhóm, so sánh và mở bản ghi nguồn; người có quyền tùy biến được chọn thêm chỉ số và lưu cấu hình phân tích. Lập báo cáo dùng để chọn mẫu tài liệu, kỳ, nội dung, nhận xét và tạo bản xem trước để in. Các cấu hình phân tích mới mặc định toàn bộ thời gian; mẫu đã lưu giữ lựa chọn thời gian của người dùng.

Kiểm tra bằng dữ liệu kiểm thử: ranh giới ngày, ngày báo khác ngày học, sự cố trùng, biên bản nháp, nhiều biên bản của cùng giáo viên và nguồn rỗng. Kiểm thử RPC PostgreSQL cục bộ độc lập với Supabase đang triển khai; không xác nhận dữ liệu live hoặc hình ảnh trình duyệt.

## So sánh hai kỳ

- Báo cáo chi tiết và báo cáo động cho phép so sánh kỳ liền trước, cùng kỳ năm trước hoặc hai khoảng ngày tự chọn không trùng nhau. Cần chọn đủ ngày của kỳ hiện tại; dữ liệu hiện trạng không có lịch sử thì không bật so sánh theo thời gian.
- Kỳ liền trước của một tháng đầy đủ là tháng lịch trước đó; các khoảng khác lấy cùng số ngày ngay trước ngày bắt đầu. Ngày 29/02 của cùng kỳ năm trước được chặn về ngày cuối tháng 02. Hai kỳ có số ngày khác nhau được ghi rõ trên màn hình.
- Cả hai kỳ dùng cùng bộ lọc, chỉ số và cách nhóm. Số lượng, tỷ lệ và điểm được tính lại từ bản ghi của từng kỳ, không lấy trung bình các tỷ lệ nhóm. Báo cáo dự giờ chi tiết vẫn tính theo giáo viên; báo cáo động tính điểm theo biên bản.
- Nhóm phân loại ghép theo tên/mã. Nhóm thời gian ghép theo vị trí ngày, tuần hoặc tháng trong kỳ, giữ các khoảng trống để trục thời gian không bị co lại. Bảng đối chiếu ghi ngày thực tế của hai phía. Khoảng không tồn tại trong kỳ ngắn hơn hiển thị “—”, không giả là 0.
- Nhóm chỉ xuất hiện ở một kỳ vẫn được giữ lại. Nhóm thiếu có số lượng bằng 0, nhưng tỷ lệ hoặc điểm trung bình chưa có dữ liệu thì để trống. Chênh lệch tỷ lệ dùng điểm phần trăm; điểm dùng số điểm. Kỳ đối chiếu bằng 0 không tính phần trăm tăng trưởng. Sự cố tăng là diễn biến bất lợi.
- Báo cáo động lưu thiết lập so sánh cùng mẫu và cho mở bản ghi nguồn của cả hai kỳ. CSV so sánh chứa ngày hai kỳ, tất cả nhóm sau tìm kiếm và tất cả chỉ số đã chọn, không giới hạn theo trang bảng hoặc trang biểu đồ.
- Bảng lớp học mới gộp mã và tên lớp, gộp môn và khối, giữ sĩ số, phân loại, ngày tạo. Mô hình, trạng thái sĩ số và số học sinh mới/cũ/chưa xác định có trong hộp chi tiết; bản CSV lớp học vẫn giữ các trường đối chiếu hiện có.

## Bộ lọc và cách nhóm cho toàn bộ báo cáo

- Lớp học: môn, mô hình, khối, tình trạng sĩ số, phân loại tăng trưởng và ngày tạo. Phân loại được tính lại theo kỳ của từng phía khi so sánh. Bảng lớp giữ sáu cột, xuất CSV giữ đủ thông tin phụ.
- Hồ sơ học sinh: ngày tạo hồ sơ, môn, mô hình, khối, trạng thái đăng ký. Các điều kiện môn/mô hình/trạng thái phải thuộc cùng một đăng ký. Một người có thể xuất hiện ở nhiều nhóm môn nhưng tổng hồ sơ vẫn tính một lần. Đăng ký môn học là báo cáo riêng theo ngày đăng ký từng môn.
- Giáo viên mới: ngày tạo hồ sơ, môn, khối phụ trách, trạng thái. Lọc từng khối trong danh sách phụ trách, không lọc theo chuỗi ghép nhiều khối; tổng giáo viên không cộng trùng.
- Sự cố: ngày học, môn, mô hình, khối, khung giờ, ngày trong tuần, giáo viên thực dạy, lớp, trạng thái buổi, loại sự cố, mức độ và trạng thái xử lý. Bộ lọc loại/mức độ/trạng thái sự cố giữ nguyên tập buổi học của kỳ và chỉ đổi các sự cố dùng tính tử số. Nhóm theo loại lỗi dùng cùng tổng buổi làm mẫu số; tổng toàn báo cáo vẫn đếm một buổi một lần, không cộng các nhóm lỗi có thể giao nhau. Nguồn chi tiết cho chuyển giữa chỉ buổi có sự cố và toàn bộ buổi làm mẫu số.
- Ca dạy: ngày học, môn, mô hình, khối, khung giờ, ngày trong tuần, giáo viên thực dạy, lớp, trạng thái. Tách tổng buổi được ghi nhận, buổi đã hoàn thành và buổi có dạy thay. Buổi chưa gắn giáo viên không tạo một giáo viên giả trong chỉ số đếm duy nhất.
- Biên bản dự giờ: ngày dự giờ, môn, mô hình, khối, khung giờ, giáo viên, lớp và xếp loại biên bản. Mô hình/khung giờ/khối lấy qua mã buổi trên biên bản; không có liên kết thì ghi chưa xác định. Báo cáo giáo viên & xếp hạng là mẫu riêng: tính lại điểm theo giáo viên trong kỳ và chỉ dùng biên bản đã duyệt.
- Thông tin lớp, môn/mô hình của lớp và chuyên môn giáo viên là hiện trạng nguồn, không phải bản chụp lịch sử. Khung giờ ưu tiên mã danh mục của buổi; khi dùng thời điểm bắt đầu/kết thúc thì chuyển sang giờ Bangkok.
- Nhóm chồng lấp (học sinh nhiều môn, giáo viên nhiều khối, một buổi nhiều loại sự cố) không cho biểu đồ tròn vì không tạo thành các phần độc lập của một tổng. Có thanh/cột để so sánh, và đường/vùng khi nhóm theo thời gian. Biểu đồ có phân trang để xem quá 12 nhóm.
- Cả hai phần có lọc nhanh, lọc nâng cao, tìm kiếm nhóm, mở nguồn và xuất CSV; báo cáo so sánh dùng cùng bộ lọc ở hai kỳ. Khi chuyển giữa hai mục sidebar, thiết lập đang xem được giữ trong phiên.

## Tài liệu báo cáo và in

- “Lập báo cáo từ kết quả này” chuyển cấu hình phân tích (nguồn, chỉ số, cách nhóm, bộ lọc, kỳ và so sánh) sang trình lập tài liệu; không chuyển giới hạn trang bảng hoặc tìm kiếm nhóm trên màn hình. Tài liệu có đầy đủ các nhóm sau lọc.
- Mẫu tổng hợp vận hành, tuyển sinh/lớp học, chất lượng/sự cố và tự chọn chỉ lấy nguồn người dùng được phép xem. Nhận xét và kiến nghị do người lập nhập, không tự kết luận nguyên nhân từ tương quan số liệu.
- Bản xem trước là HTML độc lập trong iframe: tên, đơn vị, ngày/người lập, phạm vi từng nguồn, chỉ số, biểu đồ, bảng tổng hợp, cách tính và phần ký. Phụ lục tùy chọn chứa bản ghi của cả hai kỳ. Bảng rộng tách thành các bảng nhỏ lặp cột nhận diện, không bỏ trường.
- CSS in khai báo khổ A4, lề, tiêu đề bảng lặp khi ngắt trang và số trang qua bộ đếm trang của trình duyệt. Hộp thoại in của trình duyệt thực hiện in hoặc lưu PDF; hệ thống không tuyên bố đã tạo tệp PDF khi chỉ mở hộp thoại. Chưa kiểm tra bản in trực quan trên trình duyệt trong môi trường công cụ hiện tại.
- Bản xem trước ghi thời điểm dữ liệu đã tải và cố định tại lần tạo đó. Sửa thông tin báo cáo làm mất bản xem trước cũ; cần xem trước lại rồi mới in. Nút in dùng quyền xuất báo cáo hiện có. Cấu hình chuyển sang tài liệu được tách theo tài khoản, không mang bản nháp sang người đăng nhập khác.
- Đầu tài liệu có tên/địa chỉ đơn vị, số báo cáo, loại báo cáo, phạm vi phát hành (nội bộ/gửi bên ngoài), nơi và ngày/tháng/năm lập, kỳ báo cáo, phạm vi số liệu, nơi nhận, người lập/chức vụ và thời điểm dữ liệu cập nhật. Số báo cáo do người lập nhập, không có cơ chế tự cấp số hoặc kiểm tra số duy nhất; để trống thì bản xem trước ghi “Chưa cấp số”.
- Phạm vi số liệu có thể giữ bộ lọc của kết quả chuyển sang hoặc lấy tất cả bản ghi được phép xem trong kỳ. Thông tin phạm vi trên tài liệu suy ra từ bộ lọc thực tế của các nội dung, không lấy mô tả người dùng nhập làm bằng chứng về nguồn số liệu.
- Phần ký có người lập và tùy chọn giám đốc/người duyệt, với chức danh và họ tên nhập riêng. Đây là vị trí ký trên tài liệu, không phải thao tác phê duyệt hay ký điện tử trong hệ thống. Không suy đoán địa chỉ, tên giám đốc hoặc trạng thái phê duyệt.
- Tên tài liệu gợi ý theo “Tên nguồn dữ liệu theo Tên cách nhóm”; khi không chia nhóm thì chỉ dùng tên nguồn. Người lập được sửa tên riêng và có thể quay lại tên gợi ý. Khi chọn nhiều nguồn, dùng tên mẫu tổng hợp thay vì ghép chuỗi tên quá dài.
- Biểu đồ nằm trước số liệu tổng hợp và bảng ở cả màn hình và tài liệu. Màn hình và bản in dùng chung bộ vẽ SVG, màu xanh/xám trầm; bản in dùng chữ serif, tiêu đề hoa và bảng dữ liệu rõ ràng. Hỗ trợ cột, thanh ngang, chấm, đường, vùng, tròn, tròn đặc và ô tỷ trọng. Đường/vùng dành cho thời gian; các kiểu tỷ trọng chỉ dùng khi các nhóm độc lập, cộng được và không có số âm. So sánh hai kỳ dùng các kiểu phù hợp hai chuỗi số liệu.
- Bấm vào hình hoặc dùng Enter/Space trên một nhóm sẽ lọc dữ liệu phía dưới; bấm lại hoặc “Bỏ lọc” để khôi phục. Biểu đồ vẫn giữ các nhóm tổng quan để chọn lại. Nhóm đã chọn được lưu cùng cấu hình, dùng lại khi xuất CSV hoặc lập tài liệu theo bộ lọc. Khi đổi kỳ/cách nhóm/bộ lọc chính, lựa chọn biểu đồ được xóa để tránh điều kiện cũ gây kết quả rỗng.
- Lọc một loại sự cố từ biểu đồ giữ nguyên tập buổi làm mẫu số của loại lỗi đó. Khi bấm ngày/tuần/tháng trong so sánh, nhóm của kỳ đối chiếu được ghép theo vị trí trong kỳ, không dùng nhầm ngày hiện tại cho kỳ trước; vị trí không tồn tại trong kỳ ngắn hơn có giá trị chưa xác định.
