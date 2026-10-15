# Hoàn tất các liên kết đã rà soát

Chạy `migrations/20261016_complete_foreign_keys.sql` sau bản bỏ JSONB.
Không chạy lại schema, seed hoặc migration cũ. Bản mới chạy trong một giao
dịch, kiểm tra toàn bộ khóa ngoại trước commit và có thể chạy lại chính nó.

| Dữ liệu | Nguồn và khóa ngoại |
| --- | --- |
| Danh sách học sinh lớp | SELECT từ HOC_SINH.malophientai → LOP_HOC.malophoc; bỏ mảng LOP_HOC.danhsachmahocsinh |
| Lịch học sinh đăng ký | LICH_DANG_KY_HOC_SINH → HOC_SINH và KHUNG_GIO; thứ trong tuần lưu số 1–7 |
| Lịch lớp | LICH_LOP → LOP_HOC và KHUNG_GIO; thứ trong tuần lưu số 1–7 |
| Quyền nhóm | NHOM_QUYEN_CHI_TIET → NHOM_QUYEN và QUYEN |
| Khối của học sinh/lớp | (macaphoc,makhoi) → LUA_CHON_CAP_HOC(macaphoc,madinhdanh), danh mục này liên kết CAP_HOC |
| Loại sự cố | SU_CO_BUOI_HOC(manhomsuco,masuco) → LOAI_SU_CO(manhom,ma) |
| Phân công dạy thay | PHAN_CONG_DAY_THAY(mabuoi,malop) → BUOI_HOC(madinhdanh,malop); mã giáo viên vẫn có FK tới GIAO_VIEN |
| Chi tiết ca thuộc lớp | CHI_TIET_CA_LOP(mabuoi,malop) → BUOI_HOC(madinhdanh,malop) |

Không thêm bảng chứa bản sao danh sách mã học sinh. Thao tác ghép/rút học sinh
cập nhật FK lớp trên hồ sơ học sinh; danh sách, sĩ số và báo cáo truy vấn từ
đó. Mô hình hiện tại mỗi hồ sơ học sinh có một lớp hiện tại, như giao diện đang
sử dụng. Các hồ sơ đăng ký nhiều môn/lớp đồng thời sẽ cần nghiệp vụ quan hệ
nhiều lớp riêng; migration này không tự thay đổi quy tắc đó.

Những trường tên, ghi chú, ngày, điểm và liên kết tài liệu là giá trị dữ liệu,
không phải mã tham chiếu nên không cần khóa ngoại.

Migration giữ các RPC và giao diện hiện tại: kết quả trả về vẫn có lịch dạng
chuỗi, danh sách quyền và danh sách học sinh, nhưng được dựng từ các bảng gốc.
Lịch không khớp khung giờ, khối không xác định, mã sự cố không có trong nhóm
hoặc học sinh có hai lớp hiện tại mâu thuẫn sẽ làm rollback để tránh mất dữ liệu.

Các mã quyền đang sử dụng được giữ lại; các quyền hỗ trợ trong giao diện và mã
quyền cũ được nạp vào QUYEN. Khi bổ sung một quyền mới trong mã ứng dụng, cần
bổ sung mã tương ứng vào danh mục này qua migration.

Khi phân công dạy thay, buổi thực tế được liên kết và giáo viên dạy thay của
buổi được cập nhật. Chỉ có một phân công hiện tại cho mỗi buổi. Quy tắc khóa
kỳ công hiện tại tiếp tục áp dụng cho thao tác sửa phân công.

## Kiểm tra

Chạy `diagnostics/foreign_key_audit.sql` trong SQL Editor: tất cả 12 dòng phải
có trạng thái **OK**. Sau đó tải lại ứng dụng và đăng nhập lại.

Kiểm thử PostgreSQL cục bộ (đặt PGLITE_MODULE_PATH tới bản cài pglite):

```powershell
node --wasm-lazy-compilation --liftoff-only tests/foreignKeys.test.mjs
$env:TEST_FOREIGN_KEYS='1'
node --wasm-lazy-compilation --liftoff-only tests/noJsonStorage.test.mjs
```

Bài đầu kiểm tra giữ dữ liệu, chạy lại, lịch/quyền/khối, khóa ngoại, ghép/rút
học sinh và thêm/xóa lớp. Bài sau kiểm tra các luồng học liệu, dự giờ, giáo
viên, ca học, nhận xét, bảng công và sự cố sau khi đã nâng cấp khóa ngoại.
