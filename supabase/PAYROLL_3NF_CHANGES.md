# Chuẩn hóa nguồn công – kỳ công – đối soát: 20261130

Chạy sau **20261129**. Đợt này rà toàn bộ cột của `CONG_DAY_BUOI_HOC`, `BANG_CONG_THANG`, `DOI_SOAT_CONG_GIAO_VIEN` và luồng sinh công, sự cố/dạy thay, gửi, điều chỉnh, giải trình, duyệt, gửi lại, khóa/mở kỳ, báo cáo. Đã kiểm thử cục bộ; chưa chạy lên Supabase thật trong phiên này.

## CONG_DAY_BUOI_HOC: trước 13 cột → sau 11 cột

**Đầy đủ trước sửa:**

```text
madinhdanh, mabuoi, magiaovien, kycong, vaitro, hesocong,
ghichu, dagui, guiluc, ngaytao, ngaycapnhat, loaicong, trangthaidoisoat
```

**Đầy đủ sau sửa:**

```text
madinhdanh, mabuoi, magiaovien, hesocong, ghichu, dagui,
guiluc, ngaytao, ngaycapnhat, loaicong, trangthaidoisoat
```

| Cột trước | Sau | Nguồn/ý nghĩa |
|---|---|---|
| madinhdanh | Giữ — PK | Định danh dòng công |
| mabuoi | Giữ — FK, thành phần khóa ứng viên | Buổi học tạo công |
| magiaovien | Giữ — FK, thành phần khóa ứng viên | Người nhận dòng công; một buổi có thể có công sự cố của giáo viên chính và công của người dạy thay |
| kycong | **Bỏ** | Tháng `YYYY-MM` từ `BUOI_HOC.ngayhoc`; quy tắc hiện có không cho chuyển dòng công sang một tháng khác ngày buổi |
| vaitro | **Bỏ** | Tính theo giáo viên nhận công và phân công của buổi: trùng `magiaoviendaythay` là DAY_THAY, còn lại là CHINH |
| hesocong | Giữ | Số công thực tế, có thể âm/0/dương hoặc đã được duyệt điều chỉnh |
| ghichu | Giữ | Lý do áp/điều chỉnh công của riêng dòng |
| dagui | Giữ | Cờ gửi đối soát của dòng công này |
| guiluc | Giữ | Ngày gửi đã ghi nhận, kiểu date hiện có; không đoán ngày thiếu trong dữ liệu lịch sử |
| ngaytao | Giữ | Ngày tạo dòng công |
| ngaycapnhat | Giữ | Ngày cập nhật dòng công |
| loaicong | Giữ | Phân loại công thực tế: chuẩn/dạy thay/sự cố/đã duyệt giải trình… Có thể thay đổi qua duyệt điều chỉnh nên không lấy lại từ mặc định sự cố |
| trangthaidoisoat | Giữ | Trạng thái xử lý của dòng công, khác phạm vi đối soát cả giáo viên/kỳ |

PK `madinhdanh`, khóa ứng viên UNIQUE `(mabuoi,magiaovien)` giữ nguyên. FK giữ: `mabuoi → BUOI_HOC.madinhdanh`, `magiaovien → GIAO_VIEN.madinhdanh`, ON DELETE RESTRICT. CHECK hệ số/phân loại/trạng thái giữ nguyên. Không thêm cột nghiệp vụ.

**FK trực tiếp từ cột kycong cũ sang BANG_CONG_THANG bị bỏ cùng cột.** Không để lại một FK trỏ cột không tồn tại. Kỳ được nối theo tháng của ngày buổi qua view và truy vấn. Bảo toàn quan hệ này bằng kiểm tra kỳ tồn tại khi ghi công, khóa kỳ trong cùng giao dịch, chặn xóa/đổi mã kỳ còn dòng công và giữ quy tắc không đổi ngày/phân công của buổi đã có công. `DOI_SOAT_CONG_GIAO_VIEN.kycong` vẫn có FK thật sang bảng kỳ. Không tạo bảng ánh xạ thừa hoặc thêm một bản sao kỳ ở bảng khác.

View `V_CONG_DAY_BUOI_HOC` JOIN buổi học để cung cấp cả `kycong`, `vaitro` cho hợp đồng đọc cũ; không lưu chúng lần nữa. Thay chỉ mục dùng cột kỳ đã bỏ bằng chỉ mục giáo viên–buổi để hỗ trợ truy vấn theo giáo viên.

## BANG_CONG_THANG: trước = sau, đầy đủ 8 cột

```text
madinhdanh, dakhoa, daguithongbao, thoigiankhoa,
lydomokhoa, kycong, ngaytao, ngaycapnhat
```

| Cột | Kết quả rà soát |
|---|---|
| madinhdanh | PK giữ nguyên; mã dòng, khác mã nghiệp vụ tháng |
| dakhoa | Trạng thái khóa của cả kỳ |
| daguithongbao | Việc gửi thông báo của kỳ, khác gửi đối soát từng người/từng dòng |
| thoigiankhoa | Ngày khóa đã ghi nhận; giữ kiểu date và giá trị cũ |
| lydomokhoa | Lý do mở lại kỳ; không phải ghi chú điều chỉnh một dòng công |
| kycong | Mã nghiệp vụ tháng, UNIQUE NOT NULL; giữ kiểm tra định dạng |
| ngaytao | Ngày tạo kỳ |
| ngaycapnhat | Ngày cập nhật kỳ |

Không lưu tổng số buổi, tổng công, tên giáo viên, danh sách công hoặc giải trình ở đây. Các tổng và danh sách vẫn là SELECT từ dòng công/giải trình. Không suy trạng thái khóa chỉ từ ngày khóa: dữ liệu lịch sử có thể thiếu ngày, và ngày khóa cũ có thể còn sau lần mở lại. Các thông tin vận hành có ý nghĩa riêng, không bỏ để rồi phải đoán lại.

## DOI_SOAT_CONG_GIAO_VIEN: trước = sau, đầy đủ 4 cột

```text
kycong, magiaovien, dagui, trangthai
```

PK `(kycong,magiaovien)`; FK `kycong → BANG_CONG_THANG.kycong`, `magiaovien → GIAO_VIEN.madinhdanh`, ON DELETE RESTRICT giữ nguyên.

`dagui` và `trangthai` là việc gửi/tiến trình đối soát **cả giáo viên trong một kỳ**, không phải hai bản sao của cờ/trạng thái trên từng dòng công. Khi điều chỉnh một dòng, các dòng khác có thể vẫn đã gửi, còn nhóm giáo viên cần gửi lại. Trạng thái nhóm DA_GUI có thể đi cùng cờ chưa gửi lại sau điều chỉnh, nên không thay cờ bằng suy luận từ tên trạng thái. Giữ quy tắc hiện có: khi kỳ khóa, trạng thái hiển thị được truy vấn thành DA_CHOT; khi mở lại vẫn đi qua nghiệp vụ mở khóa. Không lưu tên, môn hay tổng công ở bảng này.

## Nguồn và các bảng/luồng JOIN

```text
CONG_DAY_BUOI_HOC.mabuoi → BUOI_HOC.madinhdanh → ngayhoc → tháng kỳ
CONG_DAY_BUOI_HOC.magiaovien → GIAO_VIEN.madinhdanh → tài khoản/tên/môn
(mabuoi, magiaovien) + phân công BUOI_HOC → vai trò chính/dạy thay
tháng ngày buổi → BANG_CONG_THANG.kycong → khóa/thông báo của kỳ
(tháng, magiaovien) → DOI_SOAT_CONG_GIAO_VIEN → tiến trình đối soát người/kỳ
GIAI_TRINH_CONG_DAY.macong → CONG_DAY_BUOI_HOC.madinhdanh → dòng công cần xem xét
LINK_MINH_CHUNG_CONG.magiaitrinh → GIAI_TRINH_CONG_DAY.madinhdanh
```

Đổi các SELECT công trong hàm dữ liệu nghiệp vụ, bộ lọc tài khoản giáo viên, tổng hợp kỳ, ca công, giải trình/minh chứng và các kiểm tra phụ thuộc sang view chuẩn. Hai view báo cáo cũ `V_CONG_DAY_THEO_CA`, `V_BANG_CONG_THEO_GIAO_VIEN` được giữ hợp đồng cột và đổi nguồn. Màn hình, báo cáo và xuất tệp tiếp tục nhận cùng dữ liệu công đã JOIN.

Hàm `ghi_ca_vao_bang_cong` chỉ ghi hai FK buổi–người và các sự thật của dòng công. Kỳ được tạo/khóa theo ngày nguồn trước khi ghi. Gửi/điều chỉnh công dùng tháng truy vấn để tìm đúng dòng; trigger cập nhật đối soát giáo viên cũng lấy kỳ từ buổi, không đọc cột đã bỏ. Không đổi cách sinh công chuẩn/dạy thay/sự cố hoặc tự thay công đã được duyệt bằng mặc định danh mục.

## Phạm vi 3NF của nhóm này

`CONG_DAY_BUOI_HOC` có khóa ứng viên `(mabuoi,magiaovien)`. Kỳ cũ chỉ phụ thuộc `mabuoi`, là phần của khóa ghép, nên đã bỏ bản sao đó. Vai trò cũng không cần lưu riêng khi đã có người nhận và nguồn phân công. Các trường còn lại là giá trị và tiến trình riêng của dòng công; hệ số/phân loại/ghi chú có thể khác sau điều chỉnh, còn người nhận công không thể lấy một giáo viên duy nhất theo buổi vì buổi có thể có hai dòng cho hai người.

`BANG_CONG_THANG` giữ thuộc tính của kỳ với PK và mã tháng là khóa ứng viên. `DOI_SOAT_CONG_GIAO_VIEN` giữ thuộc tính của đúng tổ hợp kỳ–giáo viên; không giữ thông tin hồ sơ hoặc tổng suy ra. Các trường cùng tên `dagui`, `trangthai`, `ngaytao` ở những thực thể/phạm vi khác nhau không tự động là dư thừa. Không xóa dữ liệu thực để thay bằng suy luận không có căn cứ.

Kết luận áp dụng ba bảng và quan hệ công–kỳ–đối soát trong mô hình hiện tại; chưa chứng nhận toàn bộ CSDL hoàn tất. Không có bảng nghiệp vụ mới, cột JSON/JSONB/mảng lưu công hoặc dữ liệu lưu tạm trên màn hình.

## Áp dụng và an toàn dữ liệu cũ

1. Sau khi 20261129 đã thành công, chạy [payroll_source_legacy.sql](diagnostics/payroll_source_legacy.sql).
2. Không có dòng cảnh báo: chạy toàn bộ [20261130_normalize_payroll_sources.sql](migrations/20261130_normalize_payroll_sources.sql).
3. Nếu kỳ/vai trò/giáo viên không khớp buổi hoặc thiếu kỳ: dừng đối soát. Migration hoàn tác trước khi bỏ cột, không tự đổi giáo viên, chuyển công sang tháng khác hoặc đoán giá trị.

Migration không UPDATE dòng công, kỳ, đối soát hay buổi; không mở kỳ khóa và không tắt trigger dữ liệu thật. Giá trị công, ghi chú, cờ/ngày gửi, trạng thái và các mã định danh giữ nguyên. Giữ cả trường hợp lịch sử đã gửi nhưng ngày gửi thiếu. Không DROP CASCADE. Reset demo là fixture cục bộ, không phải SQL cần chạy vào dữ liệu thật.

## Kiểm thử

Đối soát có dữ liệu chính/dạy thay; lỗi kỳ/vai trò đều rollback; migration chạy hai lần; bảng công 13→11 cột, kỳ 8 cột và đối soát 4 cột giữ nguyên; không tăng số bảng. So sánh chính xác các cột công còn lại, buổi, kỳ, đối soát, dữ liệu API và hai view báo cáo, gồm kỳ khóa và cờ đã gửi thiếu ngày. Thử công dương/0/âm, nguồn kỳ không tồn tại, tạo công bằng FK không sao chép, chống trùng, bảo vệ ngày/người và xóa/đổi kỳ. Thử RPC gửi, điều chỉnh một dòng trong nhóm, gửi lại, giáo viên chỉ đọc công của mình, gửi giải trình kèm minh chứng, duyệt/điều chỉnh công, phiên cũ, khóa khi còn đơn chờ, khóa/mở hợp lệ và chặn sửa công khóa. Kiểm tra FK và reset demo lặp lại. Các kiểm thử báo cáo/Excel, đối soát giáo viên và minh chứng liên quan tiếp tục đạt.

Nhóm tiếp theo theo kế hoạch: tiêu chí đánh giá/nhận xét (`NHOM_TIEU_CHI`, `TIEU_CHI`, `LUA_CHON_TIEU_CHI`, `TIEU_CHI_NHAN_XET`). Chỉ rà để xác định phụ thuộc; không mặc định bảng nào cũng cần xóa cột.
