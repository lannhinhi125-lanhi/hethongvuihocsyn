# Chuẩn hóa sự cố – danh mục: migration 20261128

Phạm vi: tên loại sự cố được dùng ở giám sát, giáo viên báo sự cố, tạm dừng/mở lớp, công dạy, báo cáo và xuất báo cáo. Áp dụng sau **20261127**. Kiểm thử trên PostgreSQL cục bộ; chưa chạy lên Supabase thật trong phiên này.

## Bảng được sửa: SU_CO_BUOI_HOC

**Trước: đầy đủ 17 cột**

```text
madinhdanh, mabuoi, manhomsuco, masuco, tensuco, hesocongapdung,
muckhancap, noidung, trangthai, manguoibao, manguoixuly, baoluc,
xulyluc, ghichuxuly, ngaytao, ngaycapnhat, dotamdunglop
```

**Sau: đầy đủ 16 cột**

```text
madinhdanh, mabuoi, manhomsuco, masuco, hesocongapdung,
muckhancap, noidung, trangthai, manguoibao, manguoixuly, baoluc,
xulyluc, ghichuxuly, ngaytao, ngaycapnhat, dotamdunglop
```

| Cột trước | Sau | Ý nghĩa/nguồn |
|---|---|---|
| madinhdanh | Giữ — PK | Định danh bản ghi sự cố |
| mabuoi | Giữ — FK | Buổi học xảy ra sự cố |
| manhomsuco | Giữ — FK và thành phần FK ghép | Nhóm chứa loại sự cố; mã loại được phân biệt theo nhóm |
| masuco | Giữ — thành phần FK ghép | Mã loại sự cố trong nhóm |
| tensuco | **Bỏ** | JOIN `(manhomsuco,masuco) → LOAI_SU_CO(manhom,ma)` lấy `ten` |
| hesocongapdung | Giữ | Hệ số thực tế đã áp dụng cho sự cố, có vòng đời chốt công riêng |
| muckhancap | Giữ | Mức khẩn cấp được ghi nhận của lần xảy ra; không phải bản sao bắt buộc của mặc định danh mục |
| noidung | Giữ | Mô tả sự việc cụ thể |
| trangthai | Giữ | Trạng thái xử lý sự việc |
| manguoibao | Giữ — FK | Tài khoản báo sự cố |
| manguoixuly | Giữ — FK | Tài khoản xử lý |
| baoluc | Giữ | Ngày báo theo kiểu date đang có |
| xulyluc | Giữ | Ngày xử lý theo kiểu date đang có |
| ghichuxuly | Giữ | Kết quả/ghi chú xử lý riêng |
| ngaytao | Giữ | Ngày tạo bản ghi |
| ngaycapnhat | Giữ | Ngày cập nhật bản ghi |
| dotamdunglop | Giữ | Nguồn phát sinh tự động từ tạm dừng lớp, không phải cờ tạm dừng hiện tại của lớp |

Không thêm/đổi tên cột nghiệp vụ. Không tạo bảng dữ liệu mới, không lưu JSON/JSONB, không ghi lại ngày/ghi chú/hệ số công của dữ liệu cũ. View `V_SU_CO_BUOI_HOC` chỉ JOIN để trả tên, không lưu tên lần hai. Migration không tắt trigger và không dùng DROP CASCADE.

### PK/FK giữ nguyên

- PK: `SU_CO_BUOI_HOC.madinhdanh`.
- `mabuoi → BUOI_HOC.madinhdanh`, `ON DELETE RESTRICT`.
- `manhomsuco → DANH_MUC_SU_CO.madinhdanh`, `ON DELETE RESTRICT`.
- **FK ghép:** `(manhomsuco,masuco) → LOAI_SU_CO(manhom,ma)`, deferred như cấu trúc cũ; không JOIN theo riêng mã hoặc theo tên.
- `manguoibao`, `manguoixuly → NGUOI_DUNG.madinhdanh`, `ON DELETE SET NULL` theo chính sách hiện tại.
- Giữ kiểm tra trạng thái, mức khẩn cấp, khoảng hệ số công, thứ tự ngày và chỉ mục duy nhất cho sự cố tự sinh do tạm dừng của một buổi.

## Bảng nguồn LOAI_SU_CO: cấu trúc không đổi

**Đầy đủ 12 cột, trước = sau:**

```text
manhom, madinhdanh, ma, ten, doituong, mota, danghoatdong,
hesocong, loaithongbao, thutu, chopheptamdung, nghitheolich
```

PK `(manhom,madinhdanh)`; khóa ứng viên `(manhom,ma)`; FK `manhom → DANH_MUC_SU_CO.madinhdanh`. `ten` là nguồn duy nhất cho tên loại. `hesocong` là hệ số mặc định hiện tại của danh mục. Đối tượng, nội dung mô tả, trạng thái hoạt động, loại thông báo, vị trí và các cờ chính sách là thuộc tính của loại sự cố; không sao chép sang tên/thuộc tính nhóm. Không có quy tắc cho phép suy ra tất cả thuộc tính loại từ riêng nhóm; không loại cột chỉ vì các giá trị hiện tại trùng nhau.

Buổi/lớp tạm dừng tiếp tục dùng `(manhomtamdung,lydotamdung) → (manhom,madinhdanh)`; bản ghi sự cố sử dụng `(manhomsuco,masuco) → (manhom,ma)` theo hai hợp đồng mã hiện có. Không đổi nghĩa hai loại mã và không tạo ánh xạ lưu thêm.

## Bảng nhóm DANH_MUC_SU_CO: cấu trúc không đổi

**Đầy đủ 6 cột, trước = sau:**

```text
madinhdanh, manhomsuco, tennhomsuco, mota, ngaytao, ngaycapnhat
```

PK `madinhdanh`, mã nhóm `manhomsuco` duy nhất. `tennhomsuco` mô tả nhóm, còn `LOAI_SU_CO.ten` mô tả loại cụ thể: hai ý nghĩa khác nhau. Ngày tạo/cập nhật thuộc bản ghi nhóm, khác ngày của từng sự cố. Không xóa các trường chỉ vì tên cột giống ở bảng khác.

## Các luồng truy vấn và ghi đã đổi

```text
SU_CO_BUOI_HOC.(manhomsuco,masuco)
    → LOAI_SU_CO.(manhom,ma) → ten
LOAI_SU_CO.manhom → DANH_MUC_SU_CO.madinhdanh → tennhomsuco
SU_CO_BUOI_HOC.mabuoi → BUOI_HOC.madinhdanh → lớp/ngày/giáo viên thực tế
SU_CO_BUOI_HOC.manguoibao/manguoixuly → NGUOI_DUNG → tên tài khoản
```

- `V_SU_CO_BUOI_HOC` trả các trường cũ, trong đó tên lấy bằng JOIN nhóm–mã, kể cả loại hiện đã ngừng hoạt động nhưng còn lịch sử.
- RPC dữ liệu nghiệp vụ truy vấn view cho danh sách sự cố. Giao diện vận hành, tài khoản giáo viên, báo cáo chi tiết/tổng hợp và xuất Excel cùng nhận tên từ nguồn này.
- `ca_cong_truy_van` dùng view cho nhãn sự cố trong công dạy. Các loại công chuẩn/dạy thay/giải trình vẫn giữ nhãn nghiệp vụ riêng hiện có.
- Mapper chỉ đọc `incidentName`, không gửi tên về để lưu. RPC ghi chung từ chối `tensuco` trong dữ liệu mới; trường tên cũ trong phần đối chiếu `before` được bỏ để tương thích.
- RPC giáo viên báo sự cố không INSERT tên. API cũ chỉ nhận mã loại: nếu mã xuất hiện ở nhiều nhóm đang hoạt động, báo rõ không xác định duy nhất thay vì lấy dòng đầu. Luồng ghi đầy đủ nhóm–mã vẫn phân biệt đúng các loại trùng mã.
- Hàm tạo/cập nhật sự cố tạm dừng chỉ ghi FK, nội dung và các sự thật độc lập. Đổi ghi chú không cần cập nhật tên. Mở lại lớp vẫn xử lý các sự cố tự sinh tương lai theo cơ chế cũ; sự cố nhập riêng không bị ghi đè.
- Nghỉ theo lịch vẫn thuộc danh mục, được dùng qua tạm dừng lớp và truy vấn báo cáo; không biến thành sự cố áp công. Bảo vệ các kỳ khóa/công đã gửi/điều chỉnh/giải trình giữ nguyên.

Đổi **tên** danh mục cập nhật ngay nhãn khi đọc, không cần cập nhật các dòng sự cố hoặc tính lại công. Vì dùng tên hiện tại, các báo cáo lịch sử hiển thị tên đã sửa trong danh mục; không còn lưu một tên cũ riêng trong bảng sự cố.

## Vì sao giữ hesocongapdung vẫn phù hợp 3NF

`LOAI_SU_CO.hesocong` là mặc định hiện tại; `SU_CO_BUOI_HOC.hesocongapdung` là mức đã áp dụng cho một sự việc. Cùng một loại có thể có mức đã áp dụng khác nhau khi kỳ cũ đã khóa còn danh mục được cập nhật. Do đó không có phụ thuộc hàm toàn cục `(manhomsuco,masuco) → hesocongapdung`. Thay bằng JOIN mặc định hiện tại sẽ làm thay đổi lịch sử công. Cơ chế đồng bộ hệ số ở kỳ chưa khóa là quy tắc nghiệp vụ hiện có, không có nghĩa hai cột cùng một sự thật ở mọi thời điểm.

Trong bảng sự cố sau sửa, các cột không khóa là quan hệ đến sự việc và các sự thật riêng của sự việc: hệ số thực áp, mức khẩn cấp, mô tả, trạng thái, người/ngày báo và xử lý, ngày bản ghi và nguồn phát sinh. Phụ thuộc bắc cầu từ nhóm–mã loại đến **tên loại** đã bị loại khỏi lưu trữ. Tên người, tên lớp, tên nhóm không được sao chép vào bảng. Các bảng danh mục giữ thuộc tính của đúng khóa loại/nhóm. Đây là phạm vi sự cố–danh mục đã rà theo 3NF, chưa chứng nhận các bảng công/giải trình hoặc toàn CSDL đã hoàn tất.

## Chạy SQL và đối soát

1. Sau khi đã có 20261127, chạy [incident_name_legacy.sql](diagnostics/incident_name_legacy.sql).
2. Kết quả rỗng thì chạy toàn bộ [20261128_normalize_incident_names.sql](migrations/20261128_normalize_incident_names.sql).
3. Nếu có tên cũ khác tên nguồn hoặc thiếu loại đúng nhóm/mã, migration dừng và hoàn tác, chưa bỏ cột. Xác nhận dữ liệu trước; không tự ghi đè hai bên để vượt lỗi. Không tạo loại mới, không đoán nhóm theo tên.

## Kiểm thử cục bộ

Đã kiểm tra dữ liệu có sẵn, mâu thuẫn tên và rollback, migration lặp lại, 17→16 cột, không tăng số bảng, giữ nguyên tất cả cột còn lại và nguồn buổi/công/kỳ công/danh mục khi migrate. Thử RPC sửa/tạo/xóa sự cố không cần tên, từ chối ghi tên, đổi tên danh mục cập nhật danh sách/công, giữ hệ số sự cố và công kỳ khóa khi mặc định thay đổi, giáo viên báo sự cố và đọc đúng tên, FK nhóm–mã và mã trùng giữa nhóm, tạm dừng/đổi ghi chú/mở lớp/nghỉ lễ, chẩn đoán FK và reset demo lặp lại trước/sau migration. Reset là fixture cục bộ; không phải thao tác chạy trên Supabase thật.

Nhóm kế tiếp chưa sửa: `GIAI_TRINH_CONG_DAY.lienketminhchung` so với bảng `LINK_MINH_CHUNG_CONG`.
