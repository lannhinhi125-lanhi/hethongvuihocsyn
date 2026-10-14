# Danh mục, ngày và giờ buổi học

Chạy **duy nhất `supabase/apply_relational_update.sql`** trong Supabase SQL Editor. File này gộp đợt sửa bảng công trước đó, danh mục/ngày giờ và toàn bộ yêu cầu mới. Các file migration thành phần dành cho bảo trì mã, không cần chạy riêng. Database cần có cấu trúc nghiệp vụ hiện tại của dự án; khi cài mới, chạy schema và bước nâng cấp sự cố/công đang có trước. Không chạy lại schema hoặc migration cũ sau file gộp vì chúng khai báo cấu trúc cũ.

Migration chạy trong một giao dịch, đối chiếu toàn bộ danh sách trước khi bỏ cột JSONB và có thể chạy lại. Nếu dữ liệu cũ không khớp cấu trúc chi tiết, giao dịch bị hủy để giữ dữ liệu nguồn.

| Dữ liệu | Nơi lưu mới |
| --- | --- |
| Tiêu chí trong nhóm | `TIEU_CHI` |
| Lựa chọn của tiêu chí | `LUA_CHON_TIEU_CHI` |
| Giá trị danh mục bổ sung | `MUC_DANH_MUC` |
| Lựa chọn cấp học | `LUA_CHON_CAP_HOC` |
| Loại sự cố trong nhóm | `LOAI_SU_CO` |
| Khối, mô hình giáo viên đã chọn | `GIAO_VIEN_KHOI`, `GIAO_VIEN_MO_HINH` có khóa ngoại tới danh mục |
| Lịch rảnh định kỳ | `LICH_RANH_DINH_KY`; lịch theo ngày vẫn dùng `LICH_RANH_TUAN`, `CHI_TIET_LICH_RANH` |
| Báo cáo đánh giá | SELECT từ `BIEN_BAN_DU_GIO` |
| Ca hoàn thành | SELECT từ `BUOI_HOC`, bao gồm lịch sử ca cũ |
| Tiêu chí nhận xét đã chọn | `TIEU_CHI_NHAN_XET`, liên kết buổi/học sinh/tiêu chí/lựa chọn |
| Mẫu báo cáo | Cột nguồn dữ liệu/nhóm/khoảng ngày/sắp xếp trong `MAU_BAO_CAO`, bảng `CHI_SO_MAU_BAO_CAO`, `BO_LOC_MAU_BAO_CAO` |
| Minh chứng | Link văn bản `lienketminhchung`, nhiều link dùng `LINK_MINH_CHUNG_CONG` |
| Nhật ký | `NHAT_KY_NGHIEP_VU` là view SELECT từ `SU_KIEN_NGHIEP_VU`, `CHI_TIET_NHAT_KY`, `NGUOI_DUNG` |

Các cột danh sách nêu trên, `GIAO_VIEN.baocaodanhgia`, `cahochoanthanh`, `lichranh`, `MAU_BAO_CAO.cauhinh`, `NHAN_XET_BUOI_HOC.tieuchidachon`, `GIAI_TRINH_CONG_DAY.minhchung` được bỏ khỏi bảng gốc. RPC dựng dữ liệu bằng SELECT, chỉ dùng JSON làm định dạng truyền dữ liệu. Mẫu báo cáo lưu lựa chọn lọc bằng các trường và quan hệ; không lưu mã SQL, không lưu bản sao kết quả báo cáo. Học liệu và các dữ liệu nghiệp vụ JSON khác nằm ngoài phạm vi yêu cầu này.

`CAU_HINH_TRO_LY.cauhoinhanh` được bỏ. Câu hỏi nhanh dùng hằng số giao diện trong `src/lib/assistantPrompts.ts`, không có trình chỉnh sửa cấu hình trong AI Studio.

Danh mục lớp dạy hỗ trợ cây nhiều cấp bằng quan hệ `macha`; nhập `-`, `--`, `---` trong màn hình cấu hình. Các màn hình chọn khối hiển thị cây theo quan hệ cha/con; mô hình giáo viên lấy từ danh mục mô hình đang hoạt động. Bảng liên kết dùng khóa ngoại để ngăn chọn giá trị không tồn tại.

Tiêu chí nhận xét lưu mỗi lựa chọn thành một dòng. Thêm tiêu chí mới không cần đổi cấu trúc bảng. Dòng đã chọn giữ cả mã và nhãn tại thời điểm chọn; khóa ngoại ngăn xóa tiêu chí/lựa chọn đang được sử dụng. Dữ liệu tiêu chí cũ chỉ có nhãn được giữ thành dòng lịch sử chưa gán mã, không đoán mã thay thế. Tiêu chí được lưu cả khi giáo viên mới chọn và chưa viết đủ nhận xét; không giữ bản sao trong JSON `LOP_HOC.chitietcahoc`. Giao diện nhận danh sách được dựng bằng SELECT.

Nhật ký sửa/xóa không thể dựng lại từ bản ghi hiện tại. Migration giữ sự kiện và tách dữ liệu cũ thành các trường/đường dẫn có kiểu, không lưu JSONB hay chuỗi JSON. View hiển thị bằng JOIN, bảo toàn thông tin lồng nhau và che dữ liệu mật khẩu như trước.

`BUOI_HOC.ngayhoc` giữ ngày theo lớp; `batdau`, `ketthuc` dùng `time(0)`. `SU_CO_BUOI_HOC.baoluc`, `xulyluc` và các cột `ngaytao`, `ngaycapnhat`, `guiluc`, `duyetluc`, `thoigiankhoa` đang là timestamp chuyển thành `date`, theo múi giờ Việt Nam. Giờ vào lớp/kết thúc thực tế giữ timestamp để kiểm tra thời lượng dạy và tính đúng giờ. Thời hạn phiên đăng nhập và khóa tài khoản giữ timestamp.

`V_BANG_CONG_THEO_GIAO_VIEN` chỉ tổng hợp kỳ công, giáo viên, số buổi, tổng công. `V_CONG_DAY_THEO_CA` giữ thông tin công và lịch buổi; bỏ cột audit và các nhãn có thể JOIN khi cần. Hai view đều là SELECT, không lưu bản sao dữ liệu. RPC bảng công vẫn truy vấn chi tiết cần thiết trực tiếp từ các bảng nghiệp vụ.

Mã công mới dùng `CD-<số tăng dần>`. Mã cũ giữ nguyên để bảo toàn khóa ngoại giải trình. Không rút ngắn UUID bằng cách cắt chuỗi.

Kiểm tra: `npm run lint`, `npm run build`, `node --import tsx tests/catalogDateMapper.test.ts`. Kiểm thử PostgreSQL bằng PGlite: đặt `PGLITE_MODULE_PATH` tới thư mục package `@electric-sql/pglite`, chạy `node --liftoff-only --wasm-num-compilation-tasks=1 tests/relationalCatalogDates.test.mjs`.

Nếu sửa migration thành phần, chạy `node supabase/build_relational_update.mjs` để tạo lại file SQL gộp trước khi kiểm thử. Chạy toàn bộ file gộp trong một giao dịch; nếu dữ liệu lịch sử không khớp khóa ngoại hoặc minh chứng chưa có link, migration báo bản ghi cần đối soát và giữ nguyên dữ liệu nguồn.
