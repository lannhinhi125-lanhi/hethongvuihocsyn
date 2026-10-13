# Chuyển dữ liệu nghiệp vụ khỏi cột JSONB

## Nguyên tắc

- JSON/JSONB trong tham số và kết quả API chỉ là định dạng truyền dữ liệu; yêu cầu này áp dụng cho **cột lưu trữ**.
- Một thuộc tính đơn dùng cột `text`, `numeric`, `boolean`, `date` hoặc `timestamptz` đúng kiểu. Danh sách và quan hệ nhiều-nhiều dùng bảng con có khóa ngoại, không dùng một ô `text` chứa JSON và không dùng bảng key/value chung.
- Dữ liệu hiển thị có thể truy vấn và tổng hợp từ bảng gốc. Không lưu bản sao của tên giáo viên, tên lớp, số công tổng hợp nếu có thể tính từ khóa ngoại.
- Mỗi lần chuyển phải gồm: bảng/cột mới, chuyển dữ liệu cũ, đối chiếu số bản ghi và giá trị, đổi toàn bộ hàm đọc/ghi/trigger, kiểm thử, cuối cùng mới `DROP COLUMN` cũ. Không xóa cột trước khi đường ghi cũ ngừng sử dụng.

## Kiểm kê cột lưu trữ trong `supabase/schema.sql`

| Bảng.cột JSONB | Đích quan hệ / cột | Ghi chú |
| --- | --- | --- |
| `CAP_HOC.danhsachluachon` | `LUA_CHON_CAP_HOC(macaphoc, thutu, ma, nhan)` | Mỗi lựa chọn một dòng. |
| `DANH_MUC_SU_CO.danhsachsuco` | `LOAI_SU_CO(manhomsuco, masuco, ten, doituong, mota, danghoatdong, hesocong, loai_thong_bao, thutu)` | Hệ số là `numeric`, không phải chuỗi. |
| `GIAO_VIEN.diemtieuchi` | Ba cột điểm tiêu chí hoặc bảng `DIEM_TIEU_CHI_GIAO_VIEN` nếu danh mục tiêu chí thay đổi | Không lưu một đối tượng JSON. |
| `GIAO_VIEN.baocaodanhgia` | Dùng `BIEN_BAN_DU_GIO` và các quan hệ hiện có | Cần đối chiếu bản ghi cũ chưa có trong bảng. |
| `GIAO_VIEN.cahochoanthanh` | Dùng `BUOI_HOC`, `NHAN_XET_BUOI_HOC` | Không lưu lại danh sách ca như bản sao hồ sơ. |
| `GIAO_VIEN.lichranh` | `LICH_RANH_TUAN`, `CHI_TIET_LICH_RANH` hiện có | Cần chuyển lịch cũ và đổi các nơi ghi. |
| `LOP_HOC.hoclieu` | `HOC_LIEU_LOP` và bảng tài liệu theo buổi/tuần | Một tài liệu một dòng, URL là `text`. |
| `LOP_HOC.chitietcahoc` | `BUOI_HOC`, `DIEM_DANH_BUOI_HOC`, `NHAN_XET_BUOI_HOC` hiện có; thêm cột thiếu | Đây là dữ liệu buổi học, không phải thuộc tính của lớp. |
| `LOP_HOC.phancongdaythay` | `PHAN_CONG_DAY_THAY(mabuoi, magiaovien, ...)` hoặc quan hệ trên `BUOI_HOC` | Cần giữ cả phân công cho buổi tương lai. |
| `NHOM_TIEU_CHI.danhsachtieuchi` | `TIEU_CHI_NHAN_XET(manhom, matieuchi, ten, thutu, ...)` | Một tiêu chí một dòng. |
| `BANG_CONG_THANG.danhsachgiaovien` | `CONG_DAY_BUOI_HOC` và bảng trạng thái đối soát theo giáo viên/kỳ | Không lưu bản sao tên, lớp và ca. |
| `BANG_CONG_THANG.danhsachgiaitrinh` | `GIAI_TRINH_CONG_DAY` hiện có | Liên kết qua mã công; đối chiếu giải trình cũ. |
| `MAU_BAO_CAO.cauhinh` | Cột dataset, nhóm, kỳ, ngày, sắp xếp; bảng con chỉ số và bộ lọc | Các bộ lọc động có cột tên trường/giá trị, ràng buộc theo danh mục báo cáo. |
| `DANH_MUC_BO_SUNG.danhsachmuc` | `MUC_DANH_MUC_BO_SUNG(madanhmuc, mamuc, ten, mota, thutu, danghoatdong)` | Một mục một dòng. |
| `NHAT_KY_NGHIEP_VU.khoabanghi` | Cột định danh bản ghi, hoặc bảng khóa theo loại | Nhật ký cần giữ được đối tượng đã bị xóa. |
| `NHAT_KY_NGHIEP_VU.dulieutruoc` / `dulieusau` | `CHI_TIET_THAY_DOI_NHAT_KY(manhatky, tentruong, giatricu, giatrimoi)` | Giá trị dạng `text`; quy ước biểu diễn null/ngày/số và bảo vệ dữ liệu nhạy cảm. |
| `BUOI_HOC.hoclieu` | Bảng tài liệu của buổi học, cột URL và loại tài liệu | Một tài liệu một dòng. |
| `NHAN_XET_BUOI_HOC.tieuchidachon` | `TIEU_CHI_DA_CHON(mabuoi, mahocsinh, matieuchi, giatri)` | Khóa ngoại tới tiêu chí khi có mã ổn định. |
| `GIAI_TRINH_CONG_DAY.minhchung` | `MINH_CHUNG_GIAI_TRINH(magiaitrinh, duongdan, thutu)` | Một tệp/đường dẫn một dòng. |
| `BIEN_BAN_DU_GIO.diemtieuchi` | Cột `diem_tc1`, `diem_tc2`, `diem_tc3` kiểu `numeric` | Đang là ba điểm cố định; ràng buộc 0–10. |

`danhsachhocsinh` gần cuối `schema.sql` nằm trong bảng tạm `_legacy_ca_hoc`, phục vụ chuyển dữ liệu mẫu, không phải cột lưu lâu dài. Cần thay phần chuyển mẫu trước khi bỏ JSONB khỏi tệp schema.

## Thứ tự phụ thuộc

1. Danh mục, tiêu chí và hồ sơ: tạo bảng con và chuyển dữ liệu trước để ca học tham chiếu được.
2. Lớp và ca: chuyển học liệu, lịch, phân công, điểm danh và nhận xét; bỏ trigger đọc `LOP_HOC.chitietcahoc` sau khi kiểm tra ca hoàn tất.
3. Bảng công: dùng `CONG_DAY_BUOI_HOC` làm nguồn hệ số, bảng trạng thái kỳ/giáo viên để gửi đối soát, `GIAI_TRINH_CONG_DAY` cho giải trình; chuyển hàm `vuihoc_business_data`, `vuihoc_save_business`, `ghi_ca_vao_bang_cong` và trigger đồng bộ cũ.
4. Mẫu báo cáo, danh mục bổ sung, nhật ký: chuyển các hàm lưu/đọc và các trường lọc động.
5. Đối chiếu trên dữ liệu thật và kiểm tra quyền giáo viên/quản trị, khóa kỳ, hệ số âm, báo cáo sự cố. Chỉ khi toàn bộ đường ghi đã dùng bảng mới mới xóa các cột JSONB.

Không thay JSONB bằng `text` chứa nguyên chuỗi JSON: cách đó chỉ đổi kiểu cột mà vẫn giữ cùng lỗi thiết kế.
