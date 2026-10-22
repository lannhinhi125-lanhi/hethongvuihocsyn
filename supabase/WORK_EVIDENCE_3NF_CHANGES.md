# Chuẩn hóa giải trình – minh chứng: 20261129

Áp dụng sau **20261128**. Đợt này kiểm tra hai bảng `GIAI_TRINH_CONG_DAY`, `LINK_MINH_CHUNG_CONG` và các đường gửi, đọc, duyệt giải trình trong đối soát công. Chưa chạy lên Supabase thật trong phiên này.

## GIAI_TRINH_CONG_DAY: trước 13 cột, sau 12 cột

**Toàn bộ cột trước sửa:**

```text
madinhdanh, macong, noidung, loaisuco, trangthai, guiluc,
manguoigui, manguoiduyet, duyetluc, ghichuduyet,
ngaytao, ngaycapnhat, lienketminhchung
```

**Toàn bộ cột sau sửa:**

```text
madinhdanh, macong, noidung, loaisuco, trangthai, guiluc,
manguoigui, manguoiduyet, duyetluc, ghichuduyet,
ngaytao, ngaycapnhat
```

| Cột trước | Sau | Nguồn/ý nghĩa |
|---|---|---|
| madinhdanh | Giữ — PK | Mã giải trình |
| macong | Giữ — FK | Dòng công được đề nghị xem xét |
| noidung | Giữ | Diễn giải chi tiết của giáo viên |
| loaisuco | Giữ | Vấn đề cần giải trình do giáo viên trình bày; không phải tên loại trong danh mục sự cố |
| trangthai | Giữ | Trạng thái duyệt của đơn |
| guiluc | Giữ | Ngày gửi theo kiểu date đang có |
| manguoigui | Giữ — FK | Tài khoản gửi |
| manguoiduyet | Giữ — FK | Tài khoản xét duyệt |
| duyetluc | Giữ | Ngày duyệt theo kiểu date đang có |
| ghichuduyet | Giữ | Phản hồi riêng cho đơn |
| ngaytao | Giữ | Ngày tạo bản ghi |
| ngaycapnhat | Giữ | Ngày cập nhật thuộc tính của đơn |
| lienketminhchung | **Bỏ** | Đang lưu lại danh sách liên kết đã có trong `LINK_MINH_CHUNG_CONG` |

Không thêm/đổi tên cột nghiệp vụ. PK `madinhdanh`. FK giữ nguyên: `macong → CONG_DAY_BUOI_HOC.madinhdanh` (ON DELETE RESTRICT), `manguoigui`, `manguoiduyet → NGUOI_DUNG.madinhdanh` (ON DELETE SET NULL). Giữ kiểm tra trạng thái, quy tắc không có hai đơn chờ duyệt cùng dòng công và kiểm tra kỳ khóa.

## LINK_MINH_CHUNG_CONG: trước = sau, đầy đủ 3 cột

```text
magiaitrinh, thutu, lienket
```

| Cột | Sau sửa | Ý nghĩa |
|---|---|---|
| magiaitrinh | Giữ — thành phần PK, FK | Đơn sở hữu minh chứng |
| thutu | Giữ — thành phần PK | Vị trí hiển thị liên kết trong đơn |
| lienket | Giữ | URL HTTP/HTTPS thực tế; đây là nguồn lưu duy nhất |

PK `(magiaitrinh,thutu)` giữ nguyên. FK `magiaitrinh → GIAI_TRINH_CONG_DAY.madinhdanh`, ON DELETE CASCADE giữ nguyên. Thêm CHECK thứ tự dương, CHECK liên kết HTTP/HTTPS không có khoảng trắng và UNIQUE `(magiaitrinh,lienket)` để không ghi lặp cùng URL trong một đơn. Cùng một URL xuất hiện ở các đơn khác nhau là các quan hệ sử dụng khác nhau; không cần tạo thêm bảng tài liệu chỉ để giữ chuỗi URL.

Không tăng số bảng, không có cột JSON/JSONB/mảng lưu nghiệp vụ trong hai bảng. Mỗi liên kết là một hàng. Không xóa, đánh lại thứ tự hoặc chép lại các hàng minh chứng cũ khi migrate; vị trí có khoảng trống hợp lệ vẫn giữ nguyên.

## Nguồn và các bảng/luồng truy vấn sang

```text
LINK_MINH_CHUNG_CONG.magiaitrinh → GIAI_TRINH_CONG_DAY.madinhdanh
GIAI_TRINH_CONG_DAY.macong → CONG_DAY_BUOI_HOC.madinhdanh
CONG_DAY_BUOI_HOC.mabuoi → BUOI_HOC.madinhdanh → lớp/ngày/giờ thực tế
CONG_DAY_BUOI_HOC.magiaovien → GIAO_VIEN → NGUOI_DUNG → tên giáo viên
GIAI_TRINH_CONG_DAY.manguoigui/manguoiduyet → NGUOI_DUNG → người gửi/duyệt
```

`V_GIAI_TRINH_CONG_DAY` chỉ truy vấn bảng giải trình và gộp liên kết từ bảng con bằng `string_agg(... ORDER BY thutu)` để tương thích trường `attachment` hiện tại. View không lưu thêm chuỗi minh chứng. Hàm `giai_trinh_truy_van` dùng nguồn này; danh sách giải trình của kỳ, giải trình gắn với từng ca công, màn hình giáo viên và màn hình quản trị cùng đọc kết quả đó. Các truy vấn công/báo cáo hiện có tiếp tục nhận cùng hợp đồng dữ liệu. Các bảng công, buổi học, tài khoản và hồ sơ giáo viên không đổi cột trong đợt này.

`luu_bang_cong` không INSERT danh sách vào bảng cha nữa. Khi nhận đơn mới, hàm tạo giải trình rồi gọi `luu_link_minh_chung_cong` để ghi từng liên kết vào bảng con trong cùng giao dịch. URL không hợp lệ hoặc bị lặp làm toàn bộ lần gửi thất bại; không để lại đơn thiếu minh chứng do ghi dở. Không có minh chứng là danh sách rỗng, không tự sinh tên file.

Bỏ trigger cũ `dong_bo_link_minh_chung` và hàm đồng bộ từ cột cha. Bảng con là nguồn chính thức; sửa liên kết trực tiếp trong Supabase ở kỳ mở sẽ được các truy vấn trên đọc ngay, không cần sửa một bản sao. Khóa kỳ, khóa bản ghi cha và kiểm tra phiên cũ bảo vệ thay đổi minh chứng cùng luồng đối soát. Trigger bảng con chặn INSERT/UPDATE/DELETE ở kỳ đã khóa, cấm chuyển hàng minh chứng sang đơn khác, nhưng cho phép FK cascade khi xóa đơn đã vượt qua kiểm tra kỳ của bảng cha. Không thay chính sách duyệt hoặc tự điều chỉnh hệ số công khi thay liên kết.

## Giao diện và dữ liệu nhập

- Bỏ giá trị giả `Bien_ban_xac_nhan.png` khi không nhập minh chứng.
- Giáo viên nhập liên kết thật, mỗi dòng một liên kết; kiểm tra định dạng/lặp ở giao diện và SQL. Không triển khai upload file giả.
- Hai màn hình giáo viên/quản trị hiển thị từng liên kết có thể mở được; dữ liệu không phải HTTP/HTTPS không được biến thành liên kết thực thi.
- Bỏ các câu lý do chọn cố định trong mã màn hình giáo viên. `loaisuco` tiếp tục là mô tả ngắn do giáo viên nhập, `noidung` là diễn giải chi tiết. Hai trường không phải một nhãn sao chép từ danh mục sự cố, không tự gán hệ số hoặc phân loại sự cố dựa vào câu chữ. Các lý do lịch sử giữ nguyên.
- Các tệp đối soát/bàn giao hiện có vẫn giữ phạm vi và số liệu; không tự thêm phụ lục minh chứng vào biên bản.

## Phạm vi 3NF

Trong `GIAI_TRINH_CONG_DAY`, những cột còn lại là quan hệ tới dòng công hoặc sự thật riêng của đơn: vấn đề/nội dung, trạng thái, người/ngày gửi/duyệt, phản hồi và ngày bản ghi. Tên giáo viên, lớp, lịch buổi và danh sách minh chứng không được lưu lại ở bảng này. Mỗi đơn có thể đề cập vấn đề khác với phân loại sự cố thực tế của buổi; không thể suy ra `loaisuco` hoặc `noidung` từ `macong`.

Trong `LINK_MINH_CHUNG_CONG`, liên kết và thứ tự thuộc về một đơn cụ thể; khóa chính và khóa ứng viên nêu trên xác định đầy đủ hàng. Không có danh sách lặp trong cột cha, không có phụ thuộc bắc cầu cần giữ dưới dạng bản sao. Đây là nhóm giải trình–minh chứng đã rà theo 3NF, chưa chứng nhận toàn bộ bảng công, danh mục còn lại hoặc toàn CSDL đã hoàn tất.

## Áp dụng

1. Đã chạy 20261128: chạy [work_evidence_legacy.sql](diagnostics/work_evidence_legacy.sql).
2. Không có dòng cảnh báo: chạy toàn bộ [20261129_normalize_work_evidence.sql](migrations/20261129_normalize_work_evidence.sql).
3. Nếu chuỗi cũ khác danh sách nguồn/thứ tự, URL lỗi, thứ tự sai hoặc có URL lặp: migration dừng và hoàn tác trước khi bỏ cột. Đối soát các mã đơn được báo; không tự xóa/ghép/chọn một phía để vượt lỗi.

Chỉ dùng các phép tính chuỗi/mảng/JSON trong giao dịch, hàm và kết quả API; không lưu thêm cột dạng đó. Migration không cập nhật các hàng đơn/minh chứng/công và không tắt trigger dữ liệu thật. Reset demo chỉ là fixture kiểm thử cục bộ, không phải bước chạy trên Supabase thật.

## Kiểm thử

Dùng các đơn có dữ liệu: đang chờ với nhiều liên kết và vị trí cách quãng, đã duyệt, từ chối và không có minh chứng. Kiểm tra đối soát, rollback khi lệch/URL lỗi/trùng, chạy migration hai lần, 13→12 cột cha, ba cột con giữ nguyên, không tăng số bảng, giữ nguyên các hàng/cột còn lại và công/kỳ. Kiểm tra danh sách đơn và giải trình từng ca lấy cùng liên kết, sửa nguồn cập nhật truy vấn và phát hiện phiên cũ; gửi bằng tài khoản giáo viên có/không có minh chứng, lỗi URL rollback cả đơn; quản trị duyệt đúng quyền và giữ liên kết; bảo vệ kỳ khóa, FK/cascade và trùng URL; reset lặp lại tương thích trước/sau. Kiểm thử giao diện xác nhận không tự sinh tên file và chỉ nhận liên kết thật.
