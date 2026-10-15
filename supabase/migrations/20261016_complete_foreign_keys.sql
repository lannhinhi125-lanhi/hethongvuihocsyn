-- Run after 20261015_remove_remaining_json.sql. Lists are query results.
BEGIN;
LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG",vuihoc."HOC_SINH",vuihoc."LOP_HOC",vuihoc."BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
SET CONSTRAINTS ALL DEFERRED;
CREATE TABLE IF NOT EXISTS vuihoc."QUYEN" (maquyen text PRIMARY KEY,tenquyen text NOT NULL);
-- Permission codes and labels supported by the application, including legacy aliases.
INSERT INTO vuihoc."QUYEN"(maquyen,tenquyen) VALUES
 ('ALL','ALL'),
 ('Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)','Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)'),
 ('Chatbot AI 24/7 tra cứu quy chế & nghiệp vụ','Chatbot AI 24/7 tra cứu quy chế & nghiệp vụ'),
 ('Chấm điểm và cập nhật báo cáo dự giờ','Chấm điểm và cập nhật báo cáo dự giờ'),
 ('Chỉnh sửa thông tin tài khoản & Mật khẩu','Chỉnh sửa thông tin tài khoản & Mật khẩu'),
 ('Công cụ tạo báo cáo tùy biến (Dynamic Report)','Công cụ tạo báo cáo tùy biến (Dynamic Report)'),
 ('Cấp tài khoản & Mật khẩu người dùng','Cấp tài khoản & Mật khẩu người dùng'),
 ('Cấu hình Cấp học & Lớp dạy','Cấu hình Cấp học & Lớp dạy'),
 ('Cấu hình Danh mục Sự cố & Vi phạm ca học','Cấu hình Danh mục Sự cố & Vi phạm ca học'),
 ('Cấu hình Khung chương trình / Trình độ','Cấu hình Khung chương trình / Trình độ'),
 ('Cấu hình Khung giờ ca dạy chuẩn (Time Slot)','Cấu hình Khung giờ ca dạy chuẩn (Time Slot)'),
 ('Cấu hình Mô hình lớp & Sĩ số trần (1-1, 1-3, 1-5)','Cấu hình Mô hình lớp & Sĩ số trần (1-1, 1-3, 1-5)'),
 ('Cấu hình Môn học (Toán, Tiếng Anh) & Khối lớp','Cấu hình Môn học (Toán, Tiếng Anh) & Khối lớp'),
 ('Cấu hình Prompt văn phong & Tiêu chí nhận xét môn','Cấu hình Prompt văn phong & Tiêu chí nhận xét môn'),
 ('Cấu hình hệ số công theo sự cố','Cấu hình hệ số công theo sự cố'),
 ('Danh mục dùng chung','Danh mục dùng chung'),
 ('Ghi nhận và xử lý sự cố ca dạy','Ghi nhận và xử lý sự cố ca dạy'),
 ('Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)'),
 ('Giám sát ca & Sự cố','Giám sát ca & Sự cố'),
 ('Giáo viên Check-in / Check-out vào ca dạy','Giáo viên Check-in / Check-out vào ca dạy'),
 ('Giáo viên Giảng dạy','Giáo viên Giảng dạy'),
 ('Giáo viên đăng ký lịch rảnh theo tuần','Giáo viên đăng ký lịch rảnh theo tuần'),
 ('Gửi bảng công cho giáo viên đối soát','Gửi bảng công cho giáo viên đối soát'),
 ('Gửi giải trình / khiếu nại sai lệch ca dạy','Gửi giải trình / khiếu nại sai lệch ca dạy'),
 ('Học sinh & Ghép lớp','Học sinh & Ghép lớp'),
 ('Khóa / Mở khóa tài khoản nhân sự','Khóa / Mở khóa tài khoản nhân sự'),
 ('Khóa sổ Chốt công & Xuất file Excel bàn giao','Khóa sổ Chốt công & Xuất file Excel bàn giao'),
 ('Khóa, mở kỳ công và xuất CSV / in bảng công','Khóa, mở kỳ công và xuất CSV / in bảng công'),
 ('Khởi tạo lớp, gán gói thời hạn tự tính ngày kết thúc','Khởi tạo lớp, gán gói thời hạn tự tính ngày kết thúc'),
 ('Lưu và quản lý mẫu báo cáo tùy chỉnh','Lưu và quản lý mẫu báo cáo tùy chỉnh'),
 ('Lịch dạy & Phòng học','Lịch dạy & Phòng học'),
 ('Nạp học liệu: Thêm theo tuần & Excel mẫu','Nạp học liệu: Thêm theo tuần & Excel mẫu'),
 ('PH1_ALL','PH1_ALL'),
 ('PH1_READ','PH1_READ'),
 ('PH1_WRITE','PH1_WRITE'),
 ('PH2_ALL','PH2_ALL'),
 ('PH2_READ','PH2_READ'),
 ('PH2_WRITE','PH2_WRITE'),
 ('PH3_ALL','PH3_ALL'),
 ('PH3_READ','PH3_READ'),
 ('PH3_WRITE','PH3_WRITE'),
 ('PH4_ALL','PH4_ALL'),
 ('PH4_READ','PH4_READ'),
 ('PH4_WRITE','PH4_WRITE'),
 ('PH5_ALL','PH5_ALL'),
 ('PH5_READ','PH5_READ'),
 ('PH5_WRITE','PH5_WRITE'),
 ('PH6_ALL','PH6_ALL'),
 ('PH6_READ','PH6_READ'),
 ('PH6_WRITE','PH6_WRITE'),
 ('PH7_ALL','PH7_ALL'),
 ('PH7_READ','PH7_READ'),
 ('PH7_WRITE','PH7_WRITE'),
 ('PH8_ALL','PH8_ALL'),
 ('PH8_READ','PH8_READ'),
 ('PH8_WRITE','PH8_WRITE'),
 ('Phân công giáo viên (Khớp nối môn và lịch rảnh)','Phân công giáo viên (Khớp nối môn và lịch rảnh)'),
 ('Quét giáo viên rảnh cùng môn để dạy thay (Cover)','Quét giáo viên rảnh cùng môn để dạy thay (Cover)'),
 ('Quản lý danh mục môn học','Quản lý danh mục môn học'),
 ('Quản lý danh mục trình độ','Quản lý danh mục trình độ'),
 ('Quản lý kho tài liệu tri thức SOP','Quản lý kho tài liệu tri thức SOP'),
 ('Quản lý mô hình lớp và sĩ số tối đa','Quản lý mô hình lớp và sĩ số tối đa'),
 ('Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy','Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy'),
 ('Sử dụng AI sinh & tinh chỉnh nhận xét học sinh','Sử dụng AI sinh & tinh chỉnh nhận xét học sinh'),
 ('Sử dụng chatbot tra cứu quy chế và nghiệp vụ','Sử dụng chatbot tra cứu quy chế và nghiệp vụ'),
 ('TEACHER_PORTAL','TEACHER_PORTAL'),
 ('T_AVAILABILITY','T_AVAILABILITY'),
 ('T_EVALUATION','T_EVALUATION'),
 ('T_RECONCILE','T_RECONCILE'),
 ('T_SCHEDULE','T_SCHEDULE'),
 ('Theo dõi kết quả xử lý giải trình cá nhân','Theo dõi kết quả xử lý giải trình cá nhân'),
 ('Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Theo dõi thời khóa biểu toàn hệ thống (Calendar)'),
 ('Thêm, sửa, xóa và nạp học liệu theo tuần','Thêm, sửa, xóa và nạp học liệu theo tuần'),
 ('Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên'),
 ('Thực hiện chấm điểm dự giờ sư phạm (3 tiêu chí)','Thực hiện chấm điểm dự giờ sư phạm (3 tiêu chí)'),
 ('Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy'),
 ('Trợ lý AI Giảng dạy','Trợ lý AI Giảng dạy'),
 ('Tài khoản & Phân quyền','Tài khoản & Phân quyền'),
 ('Tìm và phân công giáo viên dạy thay','Tìm và phân công giáo viên dạy thay'),
 ('Tạo danh mục bổ sung và danh mục con','Tạo danh mục bổ sung và danh mục con'),
 ('Tạo hồ sơ giáo viên (Gán 1 môn Toán/Anh)','Tạo hồ sơ giáo viên (Gán 1 môn Toán/Anh)'),
 ('Tạo hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên'),
 ('Tạo, sửa, xóa & Gán Nhóm quyền','Tạo, sửa, xóa & Gán Nhóm quyền'),
 ('Tạo, sửa, xóa lớp và cập nhật link phòng học','Tạo, sửa, xóa lớp và cập nhật link phòng học'),
 ('Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ'),
 ('Vào phòng học và xem học liệu lớp được giao','Vào phòng học và xem học liệu lớp được giao'),
 ('Xem Báo cáo giáo viên, lớp học & hạn lớp theo gói','Xem Báo cáo giáo viên, lớp học & hạn lớp theo gói'),
 ('Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn'),
 ('Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan'),
 ('Xem báo cáo giáo viên, học sinh và lớp học','Xem báo cáo giáo viên, học sinh và lớp học'),
 ('Xem bảng kê công dạy cá nhân theo kỳ','Xem bảng kê công dạy cá nhân theo kỳ'),
 ('Xem cấu hình và tài liệu AI','Xem cấu hình và tài liệu AI'),
 ('Xem danh mục dùng chung','Xem danh mục dùng chung'),
 ('Xem danh sách tài khoản và nhóm quyền','Xem danh sách tài khoản và nhóm quyền'),
 ('Xem hồ sơ giáo viên và kết quả dự giờ','Xem hồ sơ giáo viên và kết quả dự giờ'),
 ('Xem hồ sơ học sinh và danh sách lớp','Xem hồ sơ học sinh và danh sách lớp'),
 ('Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên'),
 ('Xem kết quả và nhận xét dự giờ của bản thân','Xem kết quả và nhận xét dự giờ của bản thân'),
 ('Xem lịch dạy và lớp được phân công','Xem lịch dạy và lớp được phân công'),
 ('Xem lịch rảnh cá nhân','Xem lịch rảnh cá nhân'),
 ('Xem lịch rảnh cá nhân và trạng thái khóa tuần','Xem lịch rảnh cá nhân và trạng thái khóa tuần'),
 ('Xem tổng hợp lịch rảnh & Khóa sổ đăng ký tuần','Xem tổng hợp lịch rảnh & Khóa sổ đăng ký tuần'),
 ('Xuất bảng công cá nhân','Xuất bảng công cá nhân'),
 ('Xuất kết quả báo cáo CSV','Xuất kết quả báo cáo CSV'),
 ('Xử lý & phê duyệt đơn giải trình công dạy','Xử lý & phê duyệt đơn giải trình công dạy'),
 ('Điều chỉnh hệ số công từng buổi kèm lý do','Điều chỉnh hệ số công từng buổi kèm lý do'),
 ('Đối soát công ca dạy','Đối soát công ca dạy')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS vuihoc."NHOM_QUYEN_CHI_TIET" (
 manhom text NOT NULL REFERENCES vuihoc."NHOM_QUYEN"(madinhdanh) ON DELETE CASCADE,
 maquyen text NOT NULL REFERENCES vuihoc."QUYEN"(maquyen),
 thutu integer NOT NULL CHECK(thutu>0),PRIMARY KEY(manhom,maquyen)
);
CREATE TABLE IF NOT EXISTS vuihoc."LICH_LOP" (
 malop text NOT NULL REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE CASCADE,
 thutu integer NOT NULL CHECK(thutu>0), thutrongtuan integer NOT NULL CHECK(thutrongtuan BETWEEN 1 AND 7),
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh),PRIMARY KEY(malop,thutu),UNIQUE(malop,thutrongtuan,makhunggio)
);
CREATE TABLE IF NOT EXISTS vuihoc."LICH_DANG_KY_HOC_SINH" (
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE CASCADE,
 thutu integer NOT NULL CHECK(thutu>0), thutrongtuan integer NOT NULL CHECK(thutrongtuan BETWEEN 1 AND 7),
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh),PRIMARY KEY(mahocsinh,thutu),UNIQUE(mahocsinh,thutrongtuan,makhunggio)
);
ALTER TABLE vuihoc."HOC_SINH" ADD COLUMN IF NOT EXISTS macaphoc text,ADD COLUMN IF NOT EXISTS makhoi text;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS makhoi text;
ALTER TABLE vuihoc."PHAN_CONG_DAY_THAY" ADD COLUMN IF NOT EXISTS mabuoi text;
CREATE INDEX IF NOT EXISTS hoc_sinh_lop_hien_tai_idx ON vuihoc."HOC_SINH"(malophientai,madinhdanh);
CREATE INDEX IF NOT EXISTS hoc_sinh_khoi_cap_idx ON vuihoc."HOC_SINH"(macaphoc,makhoi);
CREATE INDEX IF NOT EXISTS lop_hoc_khoi_cap_idx ON vuihoc."LOP_HOC"(macaphoc,makhoi);
CREATE INDEX IF NOT EXISTS su_co_loai_nhom_idx ON vuihoc."SU_CO_BUOI_HOC"(manhomsuco,masuco);
CREATE INDEX IF NOT EXISTS chi_tiet_ca_buoi_lop_idx ON vuihoc."CHI_TIET_CA_LOP"(mabuoi,malop);

CREATE OR REPLACE FUNCTION vuihoc.quyen_nhom(p_id text) RETURNS text[]
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(array_agg(maquyen ORDER BY thutu),ARRAY[]::text[]) FROM vuihoc."NHOM_QUYEN_CHI_TIET" WHERE manhom=p_id
$$;
CREATE OR REPLACE FUNCTION vuihoc.nhom_quyen_truy_van(p_row jsonb) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT p_row||jsonb_build_object('danhsachquyen',vuihoc.quyen_nhom(p_row->>'madinhdanh'))
$$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_quyen_nhom(p_id text,p_values jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 DELETE FROM vuihoc."NHOM_QUYEN_CHI_TIET" WHERE manhom=p_id;
 INSERT INTO vuihoc."NHOM_QUYEN_CHI_TIET" SELECT p_id,value,ordinality FROM jsonb_array_elements_text(p_values) WITH ORDINALITY;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.hoc_sinh_lop(p_id text) RETURNS text[]
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(array_agg(h.madinhdanh ORDER BY h.madinhdanh),ARRAY[]::text[])
 FROM vuihoc."HOC_SINH" h JOIN vuihoc."LOP_HOC" l ON l.malophoc=h.malophientai WHERE l.madinhdanh=p_id
$$;
CREATE OR REPLACE FUNCTION vuihoc.nhan_lich(p_day integer,p_slot text) RETURNS text
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN p_day=7 THEN 'CN' ELSE 'T'||(p_day+1) END||' ('||khoanggio||')' FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=p_slot
$$;
CREATE OR REPLACE FUNCTION vuihoc.tach_lich(p_text text) RETURNS TABLE(thutrongtuan integer,makhunggio text)
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE parts text[]; daynum integer; slot text;
BEGIN
 parts:=regexp_match(btrim(p_text),'^(T[2-7]|CN)\s*\(\s*([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})\s*\)$');
 IF parts IS NULL THEN RAISE EXCEPTION 'Lịch chưa khớp định dạng ngày/khung giờ: %',p_text; END IF;
 daynum:=CASE WHEN parts[1]='CN' THEN 7 ELSE substring(parts[1] FROM 2)::integer-1 END;
 SELECT k.madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" k WHERE regexp_replace(k.khoanggio,'\s','','g')=parts[2]||'-'||parts[3];
 IF slot IS NULL THEN RAISE EXCEPTION 'Khung giờ không thuộc danh mục: %',p_text; END IF;
 RETURN QUERY SELECT daynum,slot;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.khoi_lop(p_id text) RETURNS text
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT o.nhan FROM vuihoc."LOP_HOC" l JOIN vuihoc."LUA_CHON_CAP_HOC" o ON (o.macaphoc,o.madinhdanh)=(l.macaphoc,l.makhoi) WHERE l.madinhdanh=p_id
$$;
CREATE OR REPLACE FUNCTION vuihoc.anh_xa_khoi(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE grade record; count_matches integer;
BEGIN
 SELECT count(*) INTO count_matches FROM vuihoc."LUA_CHON_CAP_HOC" o
 WHERE (o.nhan=p_row->>'khoi' OR o.madinhdanh=p_row->>'khoi')
  AND (nullif(p_row->>'macaphoc','') IS NULL OR o.macaphoc=p_row->>'macaphoc');
 IF count_matches<>1 THEN RAISE EXCEPTION 'Khối % không xác định duy nhất trong cấp học %',p_row->>'khoi',p_row->>'macaphoc'; END IF;
 SELECT o.macaphoc,o.madinhdanh INTO grade FROM vuihoc."LUA_CHON_CAP_HOC" o
 WHERE (o.nhan=p_row->>'khoi' OR o.madinhdanh=p_row->>'khoi')
  AND (nullif(p_row->>'macaphoc','') IS NULL OR o.macaphoc=p_row->>'macaphoc');
 RETURN (p_row-'khoi')||jsonb_build_object('macaphoc',grade.macaphoc,'makhoi',grade.madinhdanh);
END $$;
CREATE OR REPLACE FUNCTION vuihoc.truong_lien_ket_truy_van(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE id text:=p_row->>'madinhdanh'; r jsonb:=p_row; v jsonb;
BEGIN
 IF p_table='LOP_HOC' THEN
  r:=r||jsonb_build_object('danhsachmahocsinh',vuihoc.hoc_sinh_lop(id),'khoi',vuihoc.khoi_lop(id),
   'lichhoc',(SELECT coalesce(string_agg(vuihoc.nhan_lich(thutrongtuan,makhunggio),', ' ORDER BY thutu),'') FROM vuihoc."LICH_LOP" WHERE malop=id));
 ELSIF p_table='HOC_SINH' THEN
  r:=r||jsonb_build_object('khoi',(SELECT nhan FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=p_row->>'macaphoc' AND madinhdanh=p_row->>'makhoi'),
   'lichdangky',(SELECT coalesce(jsonb_agg(vuihoc.nhan_lich(thutrongtuan,makhunggio) ORDER BY thutu),'[]') FROM vuihoc."LICH_DANG_KY_HOC_SINH" WHERE mahocsinh=id));
 END IF;
 RETURN r;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.buoi_phan_cong(p_lop text,p_date text) RETURNS text
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE cls vuihoc."LOP_HOC"; d date:=left(p_date,10)::date; hours text[]; slot text; lesson text; n integer;
BEGIN
 SELECT * INTO STRICT cls FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_lop;
 hours:=regexp_match(p_date,'([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})');
 IF hours IS NOT NULL THEN
  SELECT madinhdanh INTO slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=hours[1]||'-'||hours[2];
 ELSE
  SELECT count(*),min(makhunggio) INTO n,slot FROM vuihoc."LICH_LOP" WHERE malop=p_lop AND thutrongtuan=extract(isodow FROM d);
  IF n<>1 THEN RAISE EXCEPTION 'Phân công thiếu khung giờ duy nhất: %',p_date; END IF;
 END IF;
 IF slot IS NULL OR cls.magiaovien IS NULL THEN RAISE EXCEPTION 'Phân công thiếu giáo viên/khung giờ: %',p_date; END IF;
 SELECT madinhdanh INTO lesson FROM vuihoc."BUOI_HOC" WHERE malop=p_lop AND ngayhoc=d AND makhunggio=slot;
 IF lesson IS NULL THEN
  SELECT regexp_split_to_array(khoanggio,'\s*-\s*') INTO hours FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=slot;
  INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,lienketphonghoc)
   VALUES(p_lop,d,slot,hours[1]::time,hours[2]::time,cls.magiaovien,cls.lienketphonghoc) RETURNING madinhdanh INTO lesson;
 END IF;
 RETURN lesson;
END $$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_truong_lien_ket(p_table text,p_row jsonb,p_backfill boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE id text:=p_row->>'madinhdanh'; x record; dayrow record; ids text[]; code text;
BEGIN
 IF p_table='LOP_HOC' THEN
  IF p_row ? 'lichhoc' THEN
   DELETE FROM vuihoc."LICH_LOP" WHERE malop=id;
   FOR x IN SELECT value,ordinality FROM regexp_split_to_table(p_row->>'lichhoc','\s*,\s*') WITH ORDINALITY AS s(value,ordinality) WHERE btrim(value)<>'' LOOP
    SELECT * INTO STRICT dayrow FROM vuihoc.tach_lich(x.value);
    INSERT INTO vuihoc."LICH_LOP" VALUES(id,x.ordinality,dayrow.thutrongtuan,dayrow.makhunggio);
   END LOOP;
  END IF;
  IF NOT p_backfill AND p_row ? 'danhsachmahocsinh' THEN
   SELECT malophoc INTO code FROM vuihoc."LOP_HOC" WHERE madinhdanh=id;
   SELECT coalesce(array_agg(value),ARRAY[]::text[]) INTO ids FROM jsonb_array_elements_text(p_row->'danhsachmahocsinh');
   UPDATE vuihoc."HOC_SINH" SET malophientai=NULL WHERE malophientai=code AND NOT madinhdanh=ANY(ids);
   UPDATE vuihoc."HOC_SINH" SET malophientai=code WHERE madinhdanh=ANY(ids) AND malophientai IS DISTINCT FROM code;
  END IF;
 ELSIF p_table='HOC_SINH' AND p_row ? 'lichdangky' THEN
  DELETE FROM vuihoc."LICH_DANG_KY_HOC_SINH" WHERE mahocsinh=id;
  FOR x IN SELECT value,ordinality FROM jsonb_array_elements_text(p_row->'lichdangky') WITH ORDINALITY LOOP
   SELECT * INTO STRICT dayrow FROM vuihoc.tach_lich(x.value);
   INSERT INTO vuihoc."LICH_DANG_KY_HOC_SINH" VALUES(id,x.ordinality,dayrow.thutrongtuan,dayrow.makhunggio);
  END LOOP;
 END IF;
END $$;

DO $backfill$
DECLARE r jsonb; g jsonb; t text; x record;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NHOM_QUYEN' AND column_name='danhsachquyen') THEN
  FOR r IN EXECUTE 'SELECT to_jsonb(g) FROM vuihoc."NHOM_QUYEN" g' LOOP
   INSERT INTO vuihoc."QUYEN" SELECT value,value FROM jsonb_array_elements_text(r->'danhsachquyen') ON CONFLICT DO NOTHING;
   PERFORM vuihoc.ghi_quyen_nhom(r->>'madinhdanh',r->'danhsachquyen');
  END LOOP;
 END IF;
 FOREACH t IN ARRAY ARRAY['LOP_HOC','HOC_SINH'] LOOP
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=t AND column_name='khoi') THEN
   FOR r IN EXECUTE format('SELECT to_jsonb(t) FROM vuihoc.%I t',t) LOOP
    g:=vuihoc.anh_xa_khoi(t,r);
    EXECUTE format('UPDATE vuihoc.%I SET macaphoc=$1,makhoi=$2 WHERE madinhdanh=$3',t) USING g->>'macaphoc',g->>'makhoi',r->>'madinhdanh';
    PERFORM vuihoc.ghi_truong_lien_ket(t,r,true);
   END LOOP;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='LOP_HOC' AND column_name='danhsachmahocsinh') THEN
  FOR r IN EXECUTE 'SELECT to_jsonb(l) FROM vuihoc."LOP_HOC" l' LOOP
   FOR x IN SELECT value FROM jsonb_array_elements_text(r->'danhsachmahocsinh') LOOP
    IF NOT EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" WHERE madinhdanh=x.value) THEN RAISE EXCEPTION 'Mã học sinh không tồn tại: %',x.value; END IF;
    IF EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" WHERE madinhdanh=x.value AND malophientai IS NOT NULL AND malophientai<>r->>'malophoc') THEN
     RAISE EXCEPTION 'Học sinh % đang có hai quan hệ lớp khác nhau; cần đối soát',x.value;
    END IF;
    UPDATE vuihoc."HOC_SINH" SET malophientai=r->>'malophoc' WHERE madinhdanh=x.value AND malophientai IS NULL;
   END LOOP;
  END LOOP;
 END IF;
 ALTER TABLE vuihoc."BUOI_HOC" DISABLE TRIGGER kiem_tra_ky_cong;
 FOR x IN SELECT malop,thutu,ngaygio FROM vuihoc."PHAN_CONG_DAY_THAY" WHERE mabuoi IS NULL LOOP
  UPDATE vuihoc."PHAN_CONG_DAY_THAY" SET mabuoi=vuihoc.buoi_phan_cong(x.malop,x.ngaygio) WHERE malop=x.malop AND thutu=x.thutu;
 END LOOP;
 ALTER TABLE vuihoc."BUOI_HOC" ENABLE TRIGGER kiem_tra_ky_cong;
END $backfill$;

-- Constraints may be deferred while replacing catalog child rows; every
-- reference must be valid at transaction commit, including the class/lesson pair.
DO $constraints$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."BUOI_HOC"'::regclass AND conname='buoi_hoc_id_lop_unique') THEN
  ALTER TABLE vuihoc."BUOI_HOC" ADD CONSTRAINT buoi_hoc_id_lop_unique UNIQUE(madinhdanh,malop);
  ALTER TABLE vuihoc."CHI_TIET_CA_LOP" ADD CONSTRAINT chi_tiet_ca_dung_lop_fk FOREIGN KEY(mabuoi,malop) REFERENCES vuihoc."BUOI_HOC"(madinhdanh,malop) DEFERRABLE INITIALLY DEFERRED;
  ALTER TABLE vuihoc."PHAN_CONG_DAY_THAY" ADD CONSTRAINT phan_cong_dung_buoi_lop_fk FOREIGN KEY(mabuoi,malop) REFERENCES vuihoc."BUOI_HOC"(madinhdanh,malop) DEFERRABLE INITIALLY DEFERRED;
  ALTER TABLE vuihoc."PHAN_CONG_DAY_THAY" ADD CONSTRAINT phan_cong_mot_giao_vien_moi_buoi UNIQUE(mabuoi);
  ALTER TABLE vuihoc."LOAI_SU_CO" ADD CONSTRAINT loai_su_co_nhom_ma_unique UNIQUE(manhom,ma);
  ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ADD CONSTRAINT su_co_dung_loai_nhom_fk FOREIGN KEY(manhomsuco,masuco) REFERENCES vuihoc."LOAI_SU_CO"(manhom,ma) DEFERRABLE INITIALLY DEFERRED;
  ALTER TABLE vuihoc."HOC_SINH" ADD CONSTRAINT hoc_sinh_khoi_cap_fk FOREIGN KEY(macaphoc,makhoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh) DEFERRABLE INITIALLY DEFERRED;
  ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_khoi_cap_fk FOREIGN KEY(macaphoc,makhoi) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh) DEFERRABLE INITIALLY DEFERRED;
 END IF;
END $constraints$;
ALTER TABLE vuihoc."HOC_SINH" ALTER COLUMN macaphoc SET NOT NULL,ALTER COLUMN makhoi SET NOT NULL;
ALTER TABLE vuihoc."LOP_HOC" ALTER COLUMN macaphoc SET NOT NULL,ALTER COLUMN makhoi SET NOT NULL;
ALTER TABLE vuihoc."PHAN_CONG_DAY_THAY" ALTER COLUMN mabuoi SET NOT NULL;

-- A dated lesson has one current substitute. Keep its operational teacher
-- consistent when an authorized assignment is added, changed or removed.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_phan_cong_buoi() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') THEN
  UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=NULL
   WHERE madinhdanh=OLD.mabuoi AND magiaoviendaythay=OLD.magiaovien;
 END IF;
 IF TG_OP IN ('INSERT','UPDATE') THEN
  UPDATE vuihoc."BUOI_HOC" SET magiaoviendaythay=CASE WHEN NEW.magiaovien=magiaovienchinh THEN NULL ELSE NEW.magiaovien END
   WHERE madinhdanh=NEW.mabuoi AND magiaoviendaythay IS DISTINCT FROM CASE WHEN NEW.magiaovien=magiaovienchinh THEN NULL ELSE NEW.magiaovien END;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS dong_bo_phan_cong_buoi ON vuihoc."PHAN_CONG_DAY_THAY";
CREATE TRIGGER dong_bo_phan_cong_buoi AFTER INSERT OR UPDATE OR DELETE ON vuihoc."PHAN_CONG_DAY_THAY"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_phan_cong_buoi();

DO $functions$
DECLARE r record; f text;
BEGIN
 -- Rewrite authorization reads to query the assignment table instead of arrays.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND p.prosrc LIKE '%danhsachquyen%' LOOP
  f:=pg_get_functiondef(r.oid);
  IF r.oid='public.vuihoc_save_accounts(text,jsonb)'::regprocedure THEN
   f:=replace(f,'soluongnguoidung,danhsachquyen,macdinh','soluongnguoidung,macdinh');
   f:=replace(f,'gr.danhsachquyen,','');
   f:=replace(f,'danhsachquyen=excluded.danhsachquyen,','');
   IF position('PERFORM vuihoc.ghi_quyen_nhom' IN f)=0 THEN
    f:=replace(f,'congtruycap=excluded.congtruycap;','congtruycap=excluded.congtruycap; PERFORM vuihoc.ghi_quyen_nhom(id,v->''danhsachquyen'');');
   END IF;
   f:=replace(f,'to_jsonb(g)-ARRAY','vuihoc.nhom_quyen_truy_van(to_jsonb(g))-ARRAY');
  END IF;
  IF r.oid='public.vuihoc_session(text)'::regprocedure THEN f:=replace(f,'jsonb_agg(to_jsonb(g))','jsonb_agg(vuihoc.nhom_quyen_truy_van(to_jsonb(g)))'); END IF;
  f:=regexp_replace(f,'\m([a-zA-Z_][a-zA-Z_0-9]*)\.danhsachquyen\M','vuihoc.quyen_nhom(\1.madinhdanh)','g');
  EXECUTE f;
 END LOOP;
 f:=pg_get_functiondef('public.vuihoc_session(text)'::regprocedure);
 f:=replace(f,'jsonb_agg(to_jsonb(g))','jsonb_agg(vuihoc.nhom_quyen_truy_van(to_jsonb(g)))'); EXECUTE f;
 f:=pg_get_functiondef('vuihoc.ghi_cong_tu_cac_truong(jsonb)'::regprocedure);
 f:=replace(f,'p_lop->''danhsachmahocsinh''','to_jsonb(vuihoc.hoc_sinh_lop(p_lop->>''madinhdanh''))'); EXECUTE f;
 -- Reads of old stored list/grade fields elsewhere also use the authoritative tables.
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f'
   AND (p.prosrc LIKE '%.danhsachmahocsinh%' OR p.prosrc LIKE '%l.khoi%') LOOP
  f:=pg_get_functiondef(r.oid);
  f:=regexp_replace(f,'\m([a-zA-Z_][a-zA-Z_0-9]*)\.danhsachmahocsinh\M','vuihoc.hoc_sinh_lop(\1.madinhdanh)','g');
  f:=replace(f,'l.khoi','vuihoc.khoi_lop(l.madinhdanh)'); EXECUTE f;
 END LOOP;
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_khoa_ngoai(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_khoa_ngoai;
  ALTER FUNCTION vuihoc.ghi_du_lieu_quan_he(text,jsonb,boolean) RENAME TO ghi_du_lieu_quan_he_truoc_khoa_ngoai;
 END IF;
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 f:=replace(f,'old_sessions:=vuihoc.lop_truong_truy_van(to_jsonb(cls))',
  'old_sessions:=vuihoc.du_lieu_quan_he(''LOP_HOC'',to_jsonb(cls))');
 f:=replace(f,'IF p_row ? ''phancongdaythay'' THEN',
  'IF p_row ? ''phancongdaythay'' AND p_row->''phancongdaythay'' IS DISTINCT FROM (vuihoc.lop_truong_truy_van(to_jsonb(cls))->''phancongdaythay'') THEN');
 IF position('vuihoc.buoi_phan_cong' IN f)=0 THEN
  f:=replace(f,'INSERT INTO vuihoc."PHAN_CONG_DAY_THAY" VALUES(id,x.ordinality,(x.value->>''sessionNum'')::integer,x.value->>''dateStr'',x.value->>''teacherId'');',
   'INSERT INTO vuihoc."PHAN_CONG_DAY_THAY"(malop,thutu,sobuoi,ngaygio,magiaovien,mabuoi) VALUES(id,x.ordinality,(x.value->>''sessionNum'')::integer,x.value->>''dateStr'',x.value->>''teacherId'',vuihoc.buoi_phan_cong(id,x.value->>''dateStr''));');
 END IF;
 EXECUTE f;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF position('membership_before' IN f)=0 THEN
  f:=replace(f,'DECLARE actor','DECLARE membership_before jsonb; actor');
  f:=replace(f,'actor:=vuihoc.nguoi_dung_phien(p_token);','actor:=vuihoc.nguoi_dung_phien(p_token); LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG",vuihoc."HOC_SINH",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE; SELECT jsonb_object_agg(madinhdanh,to_jsonb(vuihoc.hoc_sinh_lop(madinhdanh))) INTO membership_before FROM vuihoc."LOP_HOC";');
  f:=replace(f,'oldrow:=vuihoc.du_lieu_quan_he(conf->>''table'',oldrow);','oldrow:=vuihoc.du_lieu_quan_he(conf->>''table'',oldrow); IF ds=''classes'' AND oldrow IS NOT NULL THEN oldrow:=oldrow||jsonb_build_object(''danhsachmahocsinh'',membership_before->id); END IF;');
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE NOT (conf->>''table''=''LOP_HOC'' AND k IN (''lichhoc'',''danhsachmahocsinh'',''khoi'')) AND NOT (conf->>''table''=''HOC_SINH'' AND k IN (''lichdangky'',''khoi'')) AND');
  f:=replace(f,'SELECT string_agg(format(''%I'',k)','IF ds IN (''classes'',''students'') THEN v:=vuihoc.anh_xa_khoi(conf->>''table'',v); END IF; SELECT string_agg(format(''%I'',k)');
  EXECUTE f;
 END IF;
END $functions$;

CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT vuihoc.du_lieu_quan_he_truoc_khoa_ngoai(p_table,vuihoc.truong_lien_ket_truy_van(p_table,p_row))
$$;
CREATE OR REPLACE FUNCTION vuihoc.ghi_du_lieu_quan_he(p_table text,p_row jsonb,p_backfill boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 PERFORM vuihoc.ghi_truong_lien_ket(p_table,p_row,p_backfill);
 PERFORM vuihoc.ghi_du_lieu_quan_he_truoc_khoa_ngoai(p_table,p_row,p_backfill);
END $$;

-- Rosters are derived from the student FK. Validate capacity at commit so a
-- single transaction can move students between full classes in either order.
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_si_so_tu_hoc_sinh() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE code text; max_students numeric; current_size integer;
BEGIN
 SELECT malophientai INTO code FROM vuihoc."HOC_SINH" WHERE madinhdanh=NEW.madinhdanh;
 IF code IS NULL THEN RETURN NEW; END IF;
 SELECT sisotoida INTO max_students FROM vuihoc."LOP_HOC" WHERE malophoc=code FOR UPDATE;
 SELECT count(*) INTO current_size FROM vuihoc."HOC_SINH" WHERE malophientai=code;
 IF current_size>max_students THEN RAISE EXCEPTION 'Sĩ số lớp % vượt mức tối đa %',code,max_students; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kiem_tra_si_so_tu_hoc_sinh ON vuihoc."HOC_SINH";
CREATE CONSTRAINT TRIGGER kiem_tra_si_so_tu_hoc_sinh AFTER INSERT OR UPDATE ON vuihoc."HOC_SINH"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_si_so_tu_hoc_sinh();

ALTER TABLE vuihoc."NHOM_QUYEN" DROP COLUMN IF EXISTS danhsachquyen;
ALTER TABLE vuihoc."LOP_HOC" DROP COLUMN IF EXISTS danhsachmahocsinh,DROP COLUMN IF EXISTS lichhoc,DROP COLUMN IF EXISTS khoi;
ALTER TABLE vuihoc."HOC_SINH" DROP COLUMN IF EXISTS lichdangky,DROP COLUMN IF EXISTS khoi;

DO $security$
DECLARE t text; r record; args text;
BEGIN
 FOREACH t IN ARRAY ARRAY['QUYEN','NHOM_QUYEN_CHI_TIET','LICH_LOP','LICH_DANG_KY_HOC_SINH'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON vuihoc.%I TO service_role',t);
  EXECUTE format('DROP TRIGGER IF EXISTS audit_business_change ON vuihoc.%I',t);
  args:=CASE t WHEN 'QUYEN' THEN '''maquyen''' WHEN 'NHOM_QUYEN_CHI_TIET' THEN '''manhom'',''maquyen'''
   WHEN 'LICH_LOP' THEN '''malop'',''thutu''' ELSE '''mahocsinh'',''thutu''' END;
  EXECUTE format('CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu(%s)',t,args);
 END LOOP;
 FOR r IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='vuihoc' AND p.proname IN ('quyen_nhom','nhom_quyen_truy_van','ghi_quyen_nhom','hoc_sinh_lop','nhan_lich','tach_lich','khoi_lop',
   'anh_xa_khoi','truong_lien_ket_truy_van','buoi_phan_cong','ghi_truong_lien_ket','du_lieu_quan_he','ghi_du_lieu_quan_he',
   'du_lieu_quan_he_truoc_khoa_ngoai','ghi_du_lieu_quan_he_truoc_khoa_ngoai','dong_bo_phan_cong_buoi','kiem_tra_si_so_tu_hoc_sinh') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',r.signature);
 END LOOP;
END $security$;
SET CONSTRAINTS ALL IMMEDIATE;
NOTIFY pgrst,'reload schema';
COMMIT;
