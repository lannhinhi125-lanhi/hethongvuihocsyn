-- Chạy sau schema.sql; chỉ đọc.
-- Kỳ vọng: 32 bảng và 32 bảng bật RLS.
SELECT count(*) AS so_bang, count(*) FILTER (WHERE c.relrowsecurity) AS so_bang_bat_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='vuihoc' AND c.relkind='r';

SELECT conrelid::regclass AS bang, conname, pg_get_constraintdef(oid) AS dinh_nghia
FROM pg_constraint WHERE connamespace='vuihoc'::regnamespace AND contype='f'
ORDER BY conrelid::regclass::text, conname;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_schema='vuihoc'
ORDER BY table_name, ordinal_position;

SELECT madinhdanh, malophoc, chitietcahoc FROM vuihoc."LOP_HOC" LIMIT 5;
SELECT madinhdanh, hoten, lichranh, baocaodanhgia FROM vuihoc."GIAO_VIEN" LIMIT 5;
SELECT kycong, danhsachgiaovien, danhsachgiaitrinh FROM vuihoc."BANG_CONG_THANG" LIMIT 5;

-- Nhật ký nghiệp vụ: đối chiếu trước/sau, người thực hiện và thời gian.
SELECT * FROM vuihoc."NHAT_KY_NGHIEP_VU" ORDER BY thoigian DESC LIMIT 50;

-- Lịch rảnh theo tuần; ca theo ngày; công nối nhận xét/sự cố.
SELECT * FROM vuihoc."LICH_RANH_TUAN" ORDER BY ngaydautuan,magiaovien;
SELECT * FROM vuihoc."BUOI_HOC" ORDER BY ngayhoc,batdau;
SELECT * FROM vuihoc."V_CONG_DAY_THEO_CA" ORDER BY kycong,ngayhoc;
