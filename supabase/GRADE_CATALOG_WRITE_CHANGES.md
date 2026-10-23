# Cấp/khối: giữ khóa khi sửa danh mục — 20261207

Chạy [20261207_stable_grade_catalog_writes.sql](migrations/20261207_stable_grade_catalog_writes.sql) sau 20261206 trên hệ thống hiện tại. Chưa chạy Supabase thật trong phiên này.

## Vì sao đã chuẩn hóa hôm trước mà vẫn sửa tiếp?

Đợt 20261205 chuẩn hóa **cấu trúc liên kết giáo viên–khối**: `GIAO_VIEN_KHOI` bỏ cặp cấp/khối sao chép, giữ một FK `maluachon` đến danh mục. Không làm lại hay đảo ngược thay đổi đó.

Lỗi còn lại là **cách ghi danh mục**. Hàm cũ xóa toàn bộ lựa chọn của cấp học rồi chèn lại, kể cả khi người dùng chỉ đổi nhãn. FK tức thời `dang_ky_khoi_nhap_hoc_fk` của `DANG_KY_MON_HOC` chặn bước xóa vì khối vẫn đang được đăng ký tham chiếu. Do vậy cấu trúc đã cải thiện nhưng luồng sửa danh mục chưa được nghiệm thu trọn vẹn. Không phải cứ thêm FK là mọi luồng ghi tự động phù hợp.

## Toàn bộ cột trước/sau đợt này

| Bảng | Trước | Sau |
| --- | --- | --- |
| `CAP_HOC` | `danghoatdong, madinhdanh, tencaphoc, nhanhienthi, ngaytao, ngaycapnhat` | Giữ đúng sáu cột trước |
| `LUA_CHON_CAP_HOC` | `macaphoc, madinhdanh, nhan, thutu, macha, maluachon` | Giữ đúng sáu cột trước |
| `GIAO_VIEN_KHOI` | `magiaovien, thutu, maluachon` | Giữ đúng ba cột trước |

Bỏ: **không có cột/bảng**. Thêm: **không có cột/bảng**. Không chuyển nội dung sang JSON hoặc tạo nơi lưu thay thế. Khi chạy migration, không cập nhật/xóa/chèn dữ liệu nghiệp vụ hiện có; chỉ thay hàm ghi và bổ sung helper nội bộ.

## Khóa và các bảng truy vấn sang

- `CAP_HOC`: PK `madinhdanh`; giữ tên/nhãn của cấp học ở nguồn này.
- `LUA_CHON_CAP_HOC`: PK `(macaphoc,madinhdanh)`, FK cấp học đến `CAP_HOC.madinhdanh`, FK cha `(macaphoc,macha)` đến lựa chọn trong cùng cấp. `maluachon` tiếp tục là khóa ứng viên sinh từ cặp mã nguồn theo 20261205; không đổi công thức/giá trị.
- `GIAO_VIEN_KHOI`: PK `(magiaovien,maluachon)`; FK giáo viên và FK lựa chọn giữ nguyên. Nhãn/cấp/khối hiển thị truy vấn từ danh mục qua `V_GIAO_VIEN_KHOI` và dữ liệu danh mục; không ghi nhãn mới vào quan hệ giáo viên.
- `DANG_KY_MON_HOC.(macaphocdangky,khoidangky)` và `LICH_SU_DANG_KY_HOC.(macaphoc,khoi)` vẫn tham chiếu khóa ghép của danh mục. Không bỏ, trì hoãn thêm hay đổi chế độ các FK để né lỗi.
- `HOC_SINH`, `LOP_HOC` tiếp tục giữ FK cấp/khối đã có. Đợt này không thay cột, khóa, dữ liệu hồ sơ/lớp/đăng ký/lịch sử của các bảng này.

## Cách ghi trước và sau

Trước: `CAP_HOC` → `ghi_chi_tiet_danh_muc` → **DELETE tất cả** lựa chọn theo cấp → INSERT lại danh sách. Mã có thể giống cuối giao dịch nhưng thao tác xóa trung gian vẫn vi phạm FK tức thời.

Sau: `public.vuihoc_save_business` → nhánh `CAP_HOC` của `ghi_chi_tiet_danh_muc` → `luu_lua_chon_cap_hoc`:

1. Khóa hàng cấp học để các lần sửa cùng nguồn được tuần tự hóa.
2. Kiểm tra dữ liệu đầu vào, mã trùng, nhãn/mã rỗng, mã cha thiếu/sai phạm vi, vòng lặp và trường chưa hỗ trợ.
3. Giữ mã `(macaphoc,madinhdanh)`; UPDATE nhãn/thứ tự/cha khi thật sự khác. Mục không đổi không bị viết lại.
4. INSERT mục mới theo thứ tự cha trước con, đồng thời giữ thứ tự hiển thị mà người dùng chọn.
5. DELETE chỉ mục thực sự bị bỏ. Nếu đang được tham chiếu, FK tiếp tục chặn và rollback cả thao tác, kể cả sửa tên đầu cấp học trong cùng yêu cầu.

Ví dụ: khối mã K1 đang được giáo viên và đăng ký môn tham chiếu. Đổi nhãn “Lớp 1” thành “Khối 1” chỉ sửa `LUA_CHON_CAP_HOC.nhan`. Mã, `maluachon` và các dòng tham chiếu giữ nguyên; các bộ đọc lấy nhãn từ nguồn. Đổi mã của mục đang dùng không được coi là đổi nhãn và không tự chuyển tham chiếu sang mã mới.

Nhánh ghi các danh mục khác được giữ nguyên. Không hạ quyền bảo vệ FK hoặc xóa đăng ký/hồ sơ để làm thao tác thành công. Helper được thu hồi quyền gọi trực tiếp của `anon/authenticated`; các RPC hiện tại và phân quyền vẫn được sử dụng.

## Kiểm thử và phạm vi kết luận

Đã chạy đạt toàn bộ `tests/reenrollmentClassDuration.test.mjs` sau khi sửa, gồm CRUD khối giáo viên, giờ buổi học và các trường hợp danh mục đang được đăng ký môn thật tham chiếu. Bài đổi nhãn của 20261205 được bổ sung bước trả lại nhãn mẫu để không ảnh hưởng preflight reset của bài kế tiếp; không sửa nhãn nghiệp vụ trong migration.

Kiểm thử tập trung dùng RPC thật: sửa nhãn/thứ tự khi có FK tức thời; thêm cha/con với thứ tự hiển thị con trước cha; chuyển cha rồi xóa cha cũ chưa dùng; xóa mục chưa dùng; danh mục trống chưa dùng; cùng mã lựa chọn trong hai cấp học; chặn dữ liệu lỗi/trùng/vòng lặp; xóa mục đang dùng bị chặn và toàn bộ thay đổi rollback. Chạy migration hai lần không đổi cấu trúc, FK hoặc dữ liệu nguồn; giữ nguyên liên kết giáo viên và các bảng hồ sơ/đăng ký/lớp hiện hữu. Mục không thay đổi giữ `xmin`.

Fixture tập trung cũ chưa có đăng ký theo môn nên dùng một bảng tham chiếu kiểm thử ngoài schema nghiệp vụ để tái hiện cùng FK tức thời, rồi xóa fixture. Kiểm thử chuỗi đầy đủ dùng **FK thật của `DANG_KY_MON_HOC`**, không lấy fixture thay cho nghiệm thu luồng hiện tại.

Đợt này hoàn thiện đường ghi cho cấu trúc đã chuẩn hóa, không phải một đợt tách cột mới và không phải kết luận toàn CSDL đã đạt 3NF.

## Chạy và tự kiểm tra

1. Sau khi bản 20261206 đã thành công, chạy [grade_catalog_write_review.sql](diagnostics/grade_catalog_write_review.sql) chỉ đọc. `WRITER_REVIEW` trước nâng cấp là dự kiến; các dòng FK là thông tin. `INVALID_CHOICE`/`PARENT_CYCLE` cần đối soát, không tự xóa.
2. Chạy toàn bộ migration 20261207. Không cần chạy lại 20261205.
3. Chạy lại diagnostic, cần có `WRITER_READY`; sửa nhãn/thứ tự của khối đang dùng rồi tải lại danh mục/hồ sơ liên quan. Xóa mục đang được dùng vẫn phải bị chặn.

Kiểm thử chuỗi: `node --wasm-lazy-compilation --liftoff-only tests/reenrollmentClassDuration.test.mjs` với `PGLITE_MODULE_PATH` đã đặt. Trong test, bản sửa cách ghi được áp dụng sớm để có thể nghiệm thu bài CRUD 20261205 trên cả cấu trúc cũ/mới, rồi kiểm tra lại sau 20261206. Trên production vẫn chạy tuần tự 20261206 → 20261207.
