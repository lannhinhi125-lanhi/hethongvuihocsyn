-- Read-only inventory of the actual Supabase database. No rows are changed.
-- Row estimates come from PostgreSQL statistics; NULL means not yet estimated.
WITH review(table_name,status,reason) AS (
 VALUES
 ('NHOM_QUYEN','GIU','Nhóm quyền dùng để phân quyền truy cập.'),
 ('NGUOI_DUNG','GIU','Tài khoản, liên hệ và phiên đăng nhập.'),
 ('QUYEN','GIU','Danh mục mã quyền.'),
 ('NHOM_QUYEN_CHI_TIET','GIU','Các quyền được gán cho từng nhóm.'),
 ('GIAO_VIEN','GIU','Hồ sơ giáo viên và liên kết tài khoản.'),
 ('GIAO_VIEN_KHOI','GIU','Khối giáo viên được nhận dạy.'),
 ('GIAO_VIEN_MO_HINH','GIU','Mô hình lớp giáo viên được nhận dạy.'),
 ('HOC_SINH','GIU','Hồ sơ học sinh và liên hệ phụ huynh.'),
 ('DANG_KY_MON_HOC','GIU','Đăng ký từng môn và lớp hiện tại của học sinh.'),
 ('LICH_DANG_KY_MON_HOC','GIU','Lịch đăng ký riêng cho từng môn của học sinh.'),
 ('LOP_HOC','GIU','Lớp học, giáo viên phụ trách và trạng thái lớp.'),
 ('LICH_LOP','GIU','Các ngày và khung giờ được gắn với lớp.'),
 ('LICH_RANH_DINH_KY','GIU','Các ca giáo viên đăng ký rảnh và ca đã xếp.'),
 ('BUOI_HOC','GIU','Buổi học theo ngày, điểm danh giáo viên và giáo viên dạy thay.'),
 ('DIEM_DANH_BUOI_HOC','GIU','Điểm danh học sinh của từng buổi.'),
 ('MON_HOC','GIU','Danh mục môn học.'),
 ('TRINH_DO','GIU','Danh mục trình độ.'),
 ('MO_HINH_LOP','GIU','Danh mục mô hình lớp và sĩ số tối đa.'),
 ('CAP_HOC','GIU','Danh mục cấp học.'),
 ('LUA_CHON_CAP_HOC','GIU','Danh mục khối thuộc cấp học.'),
 ('KHUNG_GIO','GIU','Khung giờ dùng cho lịch lớp và lịch rảnh.'),
 ('HOC_LIEU_LOP','GIU','Học liệu được phân phối cho lớp theo tuần/buổi.'),
 ('PHAN_CONG_DAY_THAY','GIU','Liên kết phân công dạy thay với lớp và buổi học.'),
 ('CHI_TIET_CA_LOP','GIU','Chi tiết ca lớp liên kết với buổi học thật.'),
 ('DANH_MUC_SU_CO','GIU','Nhóm sự cố.'),
 ('LOAI_SU_CO','GIU','Loại sự cố và hệ số công tương ứng.'),
 ('SU_CO_BUOI_HOC','GIU','Sự cố phát sinh theo buổi học.'),
 ('BANG_CONG_THANG','GIU','Kỳ công và trạng thái khóa/gửi đối soát.'),
 ('CONG_DAY_BUOI_HOC','GIU','Công dạy được ghi theo buổi học.'),
 ('GIAI_TRINH_CONG_DAY','GIU','Giải trình công dạy của giáo viên.'),
 ('DOI_SOAT_CONG_GIAO_VIEN','GIU','Đối soát bảng công theo giáo viên và kỳ.'),
 ('LINK_MINH_CHUNG_CONG','GIU','Minh chứng liên quan đến công dạy.'),
 ('MAU_BAO_CAO','GIU','Mẫu báo cáo tùy chỉnh của người dùng.'),
 ('CHI_SO_MAU_BAO_CAO','GIU','Các chỉ số được chọn trong mẫu báo cáo.'),
 ('BO_LOC_MAU_BAO_CAO','GIU','Các bộ lọc của mẫu báo cáo.'),
 ('DANH_MUC_BO_SUNG','GIU','Danh mục dùng chung do người dùng tạo.'),
 ('MUC_DANH_MUC','GIU','Các mục con của danh mục bổ sung.'),
 ('LUOT_NHAN_XET_AI','CO_THE_GO','Bộ đếm lượt nhận xét AI cũ; giao diện hiện không gọi. Gỡ bằng bản 20261103 sau khi kiểm tra phụ thuộc.'),
 ('NHOM_TIEU_CHI','CAN_KIEM_TRA','Danh mục nhận xét học sinh cũ. Bản 20261021 đã gỡ; nếu còn thì kiểm tra thứ tự nâng cấp.'),
 ('TIEU_CHI','CAN_KIEM_TRA','Tiêu chí nhận xét học sinh cũ; không phải điểm dự giờ giáo viên. Kiểm tra bản 20261021.'),
 ('LUA_CHON_TIEU_CHI','CAN_KIEM_TRA','Lựa chọn tiêu chí nhận xét học sinh cũ. Kiểm tra bản 20261021.'),
 ('TIEU_CHI_NHAN_XET','CAN_KIEM_TRA','Chi tiết tiêu chí nhận xét học sinh cũ. Kiểm tra bản 20261021 trước khi gỡ.'),
 ('CA_HOC','CAN_KIEM_TRA','Bảng ca cũ; hệ thống hiện dùng BUOI_HOC. Cần kiểm tra việc chuyển dữ liệu lịch sử.'),
 ('NHAT_KY_NGHIEP_VU','CAN_KIEM_TRA','Nhật ký chung cũ. Kiểm tra bản 20261020; không nhầm với lịch sử lớp hoặc buổi học.'),
 ('SU_KIEN_NGHIEP_VU','CAN_KIEM_TRA','Sự kiện nhật ký chung cũ. Kiểm tra bản 20261020.'),
 ('CHI_TIET_NHAT_KY','CAN_KIEM_TRA','Chi tiết nhật ký chung cũ. Kiểm tra bản 20261020.'),
 ('TAI_LIEU_QUY_TRINH','GIU','Kho tài liệu cho phân hệ Tài liệu & AI.'),
 ('LOAI_TAI_LIEU','GIU','Danh mục loại tài liệu và khóa ngoại của kho tài liệu.'),
 ('CAU_HINH_TRO_LY','GIU','Cấu hình chatbot/trợ lý trong phân hệ Tài liệu & AI.'),
 ('VAN_PHONG_NHAN_XET','GIU','Chỉ dẫn văn phong hiện vẫn được cấu hình trong phân hệ Tài liệu & AI.'),
 ('CAU_HINH_HE_THONG','GIU','Cấu hình dùng chung, trong đó có văn phong đang chọn.'),
 ('NHAN_XET_BUOI_HOC','GIU','Nội dung nhận xét thật theo học sinh/buổi học; không phải bộ đếm AI.'),
 ('BIEN_BAN_DU_GIO','GIU','Điểm và nhận xét dự giờ giáo viên.'),
 ('TRUY_VET_XEP_LOP','GIU','Lịch sử ghép/chuyển lớp của học sinh, có phân biệt môn học.')
)
SELECT c.relname AS ten_bang,
 coalesce(r.status,'CHUA_KET_LUAN') AS danh_gia,
 coalesce(r.reason,'Cần đối chiếu chức năng và liên kết; không xóa chỉ vì tên bảng lạ hoặc chưa có dữ liệu.') AS ghi_chu,
 CASE WHEN c.reltuples<0 THEN NULL ELSE c.reltuples::bigint END AS so_dong_uoc_tinh,
 pg_size_pretty(pg_total_relation_size(c.oid)) AS dung_luong_gom_chi_muc,
 (SELECT count(*) FROM pg_catalog.pg_constraint f WHERE f.contype='f' AND f.confrelid=c.oid) AS so_khoa_ngoai_tro_toi,
 (SELECT string_agg(p.oid::regprocedure::text,', ' ORDER BY p.proname)
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace ns ON ns.oid=p.pronamespace
  WHERE ns.nspname NOT IN ('pg_catalog','information_schema') AND ns.nspname NOT LIKE 'pg_toast%' AND ns.nspname NOT LIKE 'pg_temp_%'
   AND p.prokind IN ('f','p')
   AND strpos(lower(p.prosrc),lower(c.relname))>0) AS ham_co_nhac_ten_bang
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN review r ON r.table_name=c.relname
WHERE n.nspname='vuihoc' AND c.relkind IN ('r','p')
ORDER BY CASE r.status WHEN 'CO_THE_GO' THEN 0 WHEN 'CAN_KIEM_TRA' THEN 1 WHEN 'GIU' THEN 3 ELSE 2 END,c.relname;
