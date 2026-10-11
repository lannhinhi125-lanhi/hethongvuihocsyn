-- CRUD nghiệp vụ qua phiên đăng nhập hiện có; giữ nguyên 31 bảng.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $config$ SELECT '{"subjects":{"table":"MON_HOC","module":"PH2","feature":"Quản lý danh mục môn học","columns":["madinhdanh","mamonhoc","tenviettat","tenmonhoc","mota","danghoatdong"]},"levels":{"table":"TRINH_DO","module":"PH2","feature":"Quản lý danh mục trình độ","columns":["madinhdanh","matrinhdo","tenviettat","tentrinhdo","doituonghocsinh","muctieu","danghoatdong"]},"time_slots":{"table":"KHUNG_GIO","module":"PH2","feature":"Cấu hình Khung giờ ca dạy chuẩn (Time Slot)","columns":["madinhdanh","makhunggio","tenkhunggio","khoanggio","sophut","danghoatdong"]},"class_models":{"table":"MO_HINH_LOP","module":"PH2","feature":"Quản lý mô hình lớp và sĩ số tối đa","columns":["madinhdanh","mamohinh","tenmohinh","sisotoida","danghoatdong"]},"teaching_categories":{"table":"CAP_HOC","module":"PH2","feature":"Cấu hình Cấp học & Lớp dạy","columns":["danghoatdong","madinhdanh","tencaphoc","nhanhienthi","danhsachluachon"]},"incident_categories":{"table":"DANH_MUC_SU_CO","module":"PH2","feature":"Cấu hình Danh mục Sự cố & Vi phạm ca học","columns":["madinhdanh","manhomsuco","tennhomsuco","mota","danhsachsuco"]},"teachers":{"table":"GIAO_VIEN","module":"PH3","feature":"Thêm/sửa hồ sơ và cấp tài khoản giáo viên","columns":["madinhdanh","hoten","tendangnhap","mamonhoc","macaphoc","danhsachkhoi","danhsachmohinh","sodienthoai","thudientu","bangcap","ngaybatdau","ngayketthuc","trangthai","trangthaidanhgia","diemdanhgia","nhanxetdanhgia","diemtieuchi","socaranh","socadaxep","dakinlich","baocaodanhgia","cahochoanthanh","lichranh","manguoidung"]},"students":{"table":"HOC_SINH","module":"PH4","feature":"Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy","columns":["madinhdanh","hoten","khoi","mamonhoc","mamohinh","matrinhdo","hotencha","sodienthoaicha","hotenme","sodienthoaime","lichdangky","trangthai","malophientai"]},"classes":{"table":"LOP_HOC","module":"PH4","feature":"Tạo, sửa, xóa lớp và cập nhật link phòng học","columns":["macaphoc","trangthai","madinhdanh","malophoc","tenlophoc","khoi","mamonhoc","matrinhdo","mamohinh","sisotoida","danhsachmahocsinh","lichhoc","lienketphonghoc","magiaovien","hoclieu","chitietcahoc","phancongdaythay"]},"criteria_categories":{"table":"NHOM_TIEU_CHI","module":"PH6","feature":"Cấu hình Prompt văn phong & Tiêu chí nhận xét môn","columns":["madinhdanh","mamonhoc","tennhomtieuchi","danhsachtieuchi"]},"sop_documents":{"table":"TAI_LIEU_QUY_TRINH","module":"PH6","feature":"Quản lý kho tài liệu tri thức SOP","columns":["madinhdanh","tieude","phanloai","tomtat","noidung","tentepgoc","loaitepgoc","dangsudung","ngaycapnhat"]},"rag_bot_config":{"table":"CAU_HINH_TRO_LY","module":"PH6","feature":"Cấu hình Prompt văn phong & Tiêu chí nhận xét môn","columns":["loichaomung","cauhoinhanh","vanphong","chiduatrentailieu","cautraloiduphong","chidanhethong","madinhdanh"]},"monthly_payroll":{"table":"BANG_CONG_THANG","module":"PH7","feature":"Điều chỉnh hệ số công từng buổi kèm lý do","columns":["dakhoa","daguithongbao","danhsachgiaovien","danhsachgiaitrinh","madinhdanh","kycong","thoigiankhoa","lydomokhoa"]},"report_templates":{"table":"MAU_BAO_CAO","module":"PH8","feature":"Lưu và quản lý mẫu báo cáo tùy chỉnh","columns":["madinhdanh","tenmaubaocao","cauhinh","manguoidung"]},"custom_catalogs":{"table":"DANH_MUC_BO_SUNG","module":"PH2","feature":"Tạo danh mục bổ sung và danh mục con","columns":["madinhdanh","madanhmuc","tendanhmuc","mota","madanhmuccha","danhsachmuc"]},"tone_directives":{"table":"VAN_PHONG_NHAN_XET","module":"PH6","feature":"Cấu hình Prompt văn phong & Tiêu chí nhận xét môn","columns":["madinhdanh","tenvanphong","chidan"]},"app_settings":{"table":"CAU_HINH_HE_THONG","module":"PH6","feature":"Cấu hình Prompt văn phong & Tiêu chí nhận xét môn","columns":["madinhdanh","mavanphongdangchon"]},"teacher_evaluations":{"table":"BIEN_BAN_DU_GIO","module":"PH3","feature":"Chấm điểm và cập nhật báo cáo dự giờ","columns":["madinhdanh","magiaovien","mabienban","mabuoi","malophoc","manguoinhan","manguoidanhgia","ngaydanhgia","ngaycahoc","macahoc","guiluc","sobuoi","tenbuoihoc","khunggio","mohinh","diemtong","xeploai","diemtieuchi","nhanxetchung","uudiem","cancaithien","khuyennghi","trangthai","lienketphonghoc","lienketbanghi"]},"dated_lessons":{"table":"BUOI_HOC","module":"PH5","feature":"Ghi nhận và xử lý sự cố ca dạy","columns":["madinhdanh","malop","ngayhoc","makhunggio","batdau","ketthuc","magiaovienchinh","magiaoviendaythay","tieude","lienketphonghoc","hoclieu","trangthai","vaolopluc","ketthucluc","manguoivaolop","manguoiketthuc","chuyencan","nhatky","lienketbanghi"]},"lesson_incidents":{"table":"SU_CO_BUOI_HOC","module":"PH5","feature":"Ghi nhận và xử lý sự cố ca dạy","columns":["madinhdanh","mabuoi","manhomsuco","masuco","tensuco","muckhancap","noidung","trangthai","manguoibao","manguoixuly","baoluc","xulyluc","ghichuxuly"]}}'::jsonb $config$;
CREATE OR REPLACE FUNCTION vuihoc.business_can(actor text,mod text,feature text) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $can$
 SELECT coalesce(bool_or(g.congtruycap='ADMIN' AND g.danhsachquyen && (ARRAY['ALL',mod||'_ALL',feature] || CASE WHEN mod='PH3' AND feature='Thêm/sửa hồ sơ và cấp tài khoản giáo viên' THEN ARRAY['PH3_WRITE'] ELSE ARRAY[]::text[] END)),false)
 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE u.madinhdanh=actor AND u.trangthai='active'
$can$;
CREATE OR REPLACE FUNCTION vuihoc.business_teacher_can(actor text,feature text) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $can$
 SELECT coalesce(bool_or(g.congtruycap='TEACHER' AND g.danhsachquyen && (ARRAY['ALL','TEACHER_PORTAL',feature] || CASE WHEN feature='Giáo viên đăng ký lịch rảnh theo tuần' THEN ARRAY['T_AVAILABILITY_ALL'] WHEN feature IN ('Giáo viên Check-in / Check-out vào ca dạy','Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy','Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)') THEN ARRAY['T_SCHEDULE_ALL'] ELSE ARRAY['T_RECONCILE_ALL'] END)),false)
 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE u.madinhdanh=actor AND u.trangthai='active'
$can$;
CREATE OR REPLACE FUNCTION public.vuihoc_business_data(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $read$
DECLARE actor vuihoc."NGUOI_DUNG"; cfg record; rows jsonb; result jsonb:='{}'; predicate text; isadmin boolean; own text;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 SELECT congtruycap='ADMIN' INTO isadmin FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=actor.manhomquyen;
 SELECT madinhdanh INTO own FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 FOR cfg IN SELECT key dataset,value c FROM jsonb_each(vuihoc.business_config()) LOOP
  predicate:='true';
  IF cfg.dataset='report_templates' THEN predicate:=format('t.manguoidung=%L',actor.madinhdanh);
  ELSIF NOT isadmin THEN
   predicate:=CASE cfg.dataset WHEN 'dated_lessons' THEN format('(t.magiaovienchinh=%L OR t.magiaoviendaythay=%L)',own,own)
    WHEN 'lesson_incidents' THEN format('EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.madinhdanh=t.mabuoi AND (b.magiaovienchinh=%L OR b.magiaoviendaythay=%L))',own,own)
    WHEN 'teachers' THEN format('t.manguoidung=%L',actor.madinhdanh)
    WHEN 'classes' THEN format('(t.magiaovien=%L OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=t.madinhdanh AND (b.magiaovienchinh=%L OR b.magiaoviendaythay=%L)))',own,own,own)
    WHEN 'students' THEN format('EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE t.madinhdanh=ANY(l.danhsachmahocsinh) AND (l.magiaovien=%L OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=l.madinhdanh AND (b.magiaovienchinh=%L OR b.magiaoviendaythay=%L))))',own,own,own)
    WHEN 'teacher_evaluations' THEN format('t.magiaovien=%L',own)
    WHEN 'monthly_payroll' THEN 'false'
    WHEN 'custom_catalogs' THEN 'false'
    ELSE 'true' END;
  ELSIF cfg.dataset IN ('teachers','students','classes','monthly_payroll','teacher_evaluations','dated_lessons','lesson_incidents') AND NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen AND g.danhsachquyen && (CASE cfg.dataset WHEN 'teachers' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'students' THEN ARRAY['ALL','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'classes' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'monthly_payroll' THEN ARRAY['ALL','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'teacher_evaluations' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'dated_lessons' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH4_ALL','PH4_READ','Xem hồ sơ học sinh và danh sách lớp','Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy','Tạo, sửa, xóa lớp và cập nhật link phòng học','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)','Phân công giáo viên (Khớp nối môn và lịch rảnh)','Thêm, sửa, xóa và nạp học liệu theo tuần','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] WHEN 'lesson_incidents' THEN ARRAY['ALL','PH3_ALL','PH3_READ','Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên','Thêm/sửa hồ sơ và cấp tài khoản giáo viên','Tạo hồ sơ và cấp tài khoản giáo viên','Chấm điểm và cập nhật báo cáo dự giờ','PH5_ALL','PH5_READ','Theo dõi thời khóa biểu toàn hệ thống (Calendar)','Ghi nhận và xử lý sự cố ca dạy','Tìm và phân công giáo viên dạy thay','PH7_ALL','PH7_READ','Tổng hợp công dạy toàn bộ giáo viên theo kỳ','Điều chỉnh hệ số công từng buổi kèm lý do','Gửi bảng công cho giáo viên đối soát','Xử lý & phê duyệt đơn giải trình công dạy','Khóa, mở kỳ công và xuất CSV / in bảng công','PH8_ALL','PH8_READ','Xem Dashboard chỉ số KPI & Biểu đồ tổng quan','Xem báo cáo giáo viên, học sinh và lớp học','Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn','Công cụ tạo báo cáo tùy biến (Dynamic Report)'] ELSE ARRAY[]::text[] END)) THEN predicate:='false'; END IF;
  -- Chỉ lấy cột nằm trong hợp đồng UI; không trả khóa mã hóa trong CAU_HINH_HE_THONG.
  EXECUTE format('SELECT coalesce(jsonb_agg((SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(t)) e WHERE e.key IN (SELECT jsonb_array_elements_text($1)))),''[]''::jsonb) FROM vuihoc.%I t WHERE %s',cfg.c->>'table',predicate) INTO rows USING cfg.c->'columns';
  result:=result||jsonb_build_object(cfg.dataset,rows);
 END LOOP;
 IF NOT isadmin THEN
  SELECT coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('danhsachgiaovien',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(m.danhsachgiaovien) x WHERE x->>'teacherId'=own AND (x->>'payrollSent')::boolean),'danhsachgiaitrinh',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(m.danhsachgiaitrinh) x WHERE x->>'teacherId'=own))),'[]') INTO rows FROM vuihoc."BANG_CONG_THANG" m WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(m.danhsachgiaovien) x WHERE x->>'teacherId'=own AND (x->>'payrollSent')::boolean);
  result:=result||jsonb_build_object('monthly_payroll',rows);
 END IF;
 RETURN result;
END $read$;
CREATE OR REPLACE FUNCTION vuihoc.business_teacher_dispute(actor text,own text,original jsonb,b jsonb,v jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog AS $dispute$
DECLARE projected jsonb; newdispute jsonb; oldteacher jsonb; newteacher jsonb; sess jsonb; oldsession jsonb;
BEGIN
 IF original IS NULL OR v IS NULL OR coalesce((original->>'dakhoa')::boolean,true) OR NOT vuihoc.business_teacher_can(actor,'Gửi giải trình / khiếu nại sai lệch ca dạy') THEN RAISE EXCEPTION 'Không có quyền gửi giải trình kỳ này'; END IF;
 SELECT x INTO oldteacher FROM jsonb_array_elements(original->'danhsachgiaovien') x WHERE x->>'teacherId'=own AND x->>'payrollSent'='true';
 IF oldteacher IS NULL THEN RAISE EXCEPTION 'Bảng công chưa được gửi cho bạn'; END IF;
 projected:=original||jsonb_build_object('danhsachgiaovien',jsonb_build_array(oldteacher),'danhsachgiaitrinh',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(original->'danhsachgiaitrinh') x WHERE x->>'teacherId'=own));
 IF EXISTS(SELECT 1 FROM jsonb_each(b) e WHERE projected->e.key IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Bảng công đã thay đổi ở phiên khác. Hãy tải lại.'; END IF;
 IF (v-'danhsachgiaovien'-'danhsachgiaitrinh') IS DISTINCT FROM (b-'danhsachgiaovien'-'danhsachgiaitrinh') OR jsonb_array_length(v->'danhsachgiaovien')<>1 THEN RAISE EXCEPTION 'Chỉ được thêm giải trình của mình'; END IF;
 IF jsonb_array_length(v->'danhsachgiaitrinh')<>jsonb_array_length(b->'danhsachgiaitrinh')+1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(b->'danhsachgiaitrinh') x WHERE NOT(v->'danhsachgiaitrinh' @> jsonb_build_array(x))) THEN RAISE EXCEPTION 'Không được sửa/xóa giải trình đã gửi'; END IF;
 SELECT x INTO newdispute FROM jsonb_array_elements(v->'danhsachgiaitrinh') x WHERE NOT(b->'danhsachgiaitrinh' @> jsonb_build_array(x));
 IF newdispute->>'teacherId' IS DISTINCT FROM own OR newdispute->>'status' IS DISTINCT FROM 'CHO_DUYET' OR coalesce(btrim(newdispute->>'content'),'')='' OR coalesce(newdispute->>'id','')='' OR EXISTS(SELECT 1 FROM jsonb_array_elements(original->'danhsachgiaitrinh') x WHERE x->>'id'=newdispute->>'id' OR (x->>'teacherId'=own AND x->>'sessionId'=newdispute->>'sessionId' AND x->>'status'='CHO_DUYET')) THEN RAISE EXCEPTION 'Giải trình không hợp lệ hoặc đang chờ duyệt'; END IF;
 newteacher:=v->'danhsachgiaovien'->0;
 IF (newteacher-'reconcileStatus'-'sessions') IS DISTINCT FROM (oldteacher-'reconcileStatus'-'sessions') OR newteacher->>'reconcileStatus' IS DISTINCT FROM 'CO_GIAI_TRINH' OR jsonb_array_length(newteacher->'sessions')<>jsonb_array_length(oldteacher->'sessions') THEN RAISE EXCEPTION 'Không được sửa số liệu công dạy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(oldteacher->'sessions') s WHERE s->>'id'=newdispute->>'sessionId') THEN RAISE EXCEPTION 'Ca dạy không thuộc bảng công của bạn'; END IF;
 FOR sess IN SELECT value FROM jsonb_array_elements(newteacher->'sessions') LOOP
  SELECT x INTO oldsession FROM jsonb_array_elements(oldteacher->'sessions') x WHERE x->>'id'=sess->>'id';
  IF oldsession IS NULL OR (sess-'dispute') IS DISTINCT FROM (oldsession-'dispute') OR (sess->>'id'=newdispute->>'sessionId' AND sess->'dispute' IS DISTINCT FROM newdispute) OR (sess->>'id'<>newdispute->>'sessionId' AND sess IS DISTINCT FROM oldsession) THEN RAISE EXCEPTION 'Không được sửa ca dạy khi gửi giải trình'; END IF;
 END LOOP;
 RETURN original||jsonb_build_object('danhsachgiaovien',(SELECT jsonb_agg(CASE WHEN x->>'teacherId'=own THEN newteacher ELSE x END) FROM jsonb_array_elements(original->'danhsachgiaovien') x),'danhsachgiaitrinh',jsonb_build_array(newdispute)||(original->'danhsachgiaitrinh'));
END $dispute$;
REVOKE ALL ON FUNCTION vuihoc.business_teacher_dispute(text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.vuihoc_save_business(p_token text,p_changes jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $save$
DECLARE actor vuihoc."NGUOI_DUNG"; c jsonb; b jsonb; v jsonb; oldrow jsonb; conf jsonb; ds text; id text; key text; cols text; exprs text; assigns text; own text; sessionkey text; s jsonb; previous jsonb; sessionfield text; target text; rowlocked boolean;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes)>1000 THEN RAISE EXCEPTION 'Danh sách thay đổi không hợp lệ.'; END IF;
 -- Một giao dịch cho toàn bộ thao tác liên quan. Khóa theo cùng thứ tự ở mọi phiên.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 SET CONSTRAINTS ALL DEFERRED;
 SELECT madinhdanh INTO own FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 FOR c IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
  ds:=c->>'dataset'; b:=nullif(c->'before','null'::jsonb); v:=nullif(c->'after','null'::jsonb); conf:=vuihoc.business_config()->ds;
  IF conf IS NULL THEN RAISE EXCEPTION 'Dataset không được phép: %',ds; END IF;
  IF (b IS NOT NULL AND jsonb_typeof(b)<>'object') OR (v IS NOT NULL AND jsonb_typeof(v)<>'object') THEN RAISE EXCEPTION 'Bản ghi không hợp lệ'; END IF;
  id:=coalesce(v->>'madinhdanh',b->>'madinhdanh');
  IF coalesce(id,'')='' OR (b IS NOT NULL AND v IS NOT NULL AND b->>'madinhdanh' IS DISTINCT FROM v->>'madinhdanh') THEN RAISE EXCEPTION 'Mã bản ghi không hợp lệ'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(coalesce(b,'{}')||coalesce(v,'{}')) k WHERE NOT (conf->'columns' ? k)) THEN RAISE EXCEPTION 'Trường không được phép ở %',ds; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM vuihoc.%I t WHERE madinhdanh=$1 FOR UPDATE',conf->>'table') INTO oldrow USING id;
  IF oldrow IS NULL AND b IS NOT NULL OR oldrow IS NOT NULL AND b IS NULL THEN RAISE EXCEPTION 'Bản ghi đã thay đổi hoặc mã đã tồn tại. Hãy tải lại.'; END IF;
  IF ds='monthly_payroll' AND own IS NOT NULL AND EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=actor.manhomquyen AND congtruycap='TEACHER') THEN
   v:=vuihoc.business_teacher_dispute(actor.madinhdanh,own,oldrow,b,v);
   UPDATE vuihoc."BANG_CONG_THANG" SET danhsachgiaovien=v->'danhsachgiaovien',danhsachgiaitrinh=v->'danhsachgiaitrinh' WHERE madinhdanh=id;
   CONTINUE;
  END IF;
  IF oldrow IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_each(b) e WHERE oldrow->e.key IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Dữ liệu % đã thay đổi ở phiên khác. Hãy tải lại.',ds; END IF;
  IF ds='teachers' AND oldrow IS NULL THEN RAISE EXCEPTION 'Tạo hồ sơ qua chức năng cấp tài khoản giáo viên.'; END IF;
  IF v IS NULL AND NOT vuihoc.business_can(actor.madinhdanh,conf->>'module',conf->>'feature') THEN RAISE EXCEPTION 'Không có quyền xóa dữ liệu'; END IF;
  FOR key IN SELECT jsonb_object_keys(coalesce(b,'{}')||coalesce(v,'{}')) LOOP
   IF oldrow IS NOT NULL AND v IS NOT NULL AND b->key IS NOT DISTINCT FROM v->key THEN CONTINUE; END IF;
   IF v IS NULL THEN CONTINUE; END IF;
   target:=conf->>'feature';
   IF ds='teachers' THEN
    IF key IN ('lichranh','socaranh','socadaxep','dakinlich') THEN
     IF own IS DISTINCT FROM id OR NOT vuihoc.business_teacher_can(actor.madinhdanh,'Giáo viên đăng ký lịch rảnh theo tuần') THEN RAISE EXCEPTION 'Chỉ giáo viên được sửa lịch rảnh của mình.'; END IF; CONTINUE;
    ELSIF key IN ('trangthaidanhgia','diemdanhgia','nhanxetdanhgia','diemtieuchi','baocaodanhgia') THEN target:='Chấm điểm và cập nhật báo cáo dự giờ';
    ELSIF key='manguoidung' AND oldrow IS NOT NULL AND b->key IS DISTINCT FROM v->key THEN RAISE EXCEPTION 'Không được thay liên kết tài khoản giáo viên.'; END IF;
   ELSIF ds='classes' THEN
    IF key='danhsachmahocsinh' THEN target:='Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)';
    ELSIF key='magiaovien' THEN target:='Phân công giáo viên (Khớp nối môn và lịch rảnh)';
    ELSIF key='hoclieu' THEN target:='Thêm, sửa, xóa và nạp học liệu theo tuần';
    ELSIF key='phancongdaythay' THEN target:='Tìm và phân công giáo viên dạy thay';
    ELSIF key='chitietcahoc' THEN
     IF vuihoc.business_can(actor.madinhdanh,'PH5','Ghi nhận và xử lý sự cố ca dạy') THEN CONTINUE; END IF;
     IF own IS NULL OR v IS NULL THEN RAISE EXCEPTION 'Không có quyền sửa ca học'; END IF;
     IF EXISTS(SELECT 1 FROM jsonb_object_keys(coalesce(b->key,'{}')) k WHERE NOT(coalesce(v->key,'{}') ? k)) THEN RAISE EXCEPTION 'Không được xóa lịch sử ca học'; END IF;
     FOR sessionkey,s IN SELECT * FROM jsonb_each(coalesce(v->key,'{}')) LOOP
      previous:=coalesce(b->key->sessionkey,'{}'); IF previous IS NOT DISTINCT FROM s THEN CONTINUE; END IF;
      SELECT coalesce(x->>'teacherId',oldrow->>'magiaovien') INTO target FROM (SELECT 1) q LEFT JOIN LATERAL (SELECT value x FROM jsonb_array_elements(coalesce(oldrow->'phancongdaythay','[]')) WHERE value->>'sessionNum'=s->>'sessionNum' AND left(value->>'dateStr',10)=left(s->>'dateStr',10) LIMIT 1) cover ON true;
      IF target IS DISTINCT FROM own THEN RAISE EXCEPTION 'Ca học không được phân công cho bạn'; END IF;
      FOR sessionfield IN SELECT jsonb_object_keys(previous||s) LOOP
       IF previous->sessionfield IS NOT DISTINCT FROM s->sessionfield THEN CONTINUE; END IF;
       IF sessionfield IN ('feedback','feedbackCriteria') THEN
        IF NOT vuihoc.business_teacher_can(actor.madinhdanh,'Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy') THEN RAISE EXCEPTION 'Không có quyền nhận xét'; END IF;
       ELSIF sessionfield NOT IN ('sessionNum','dateStr','title','status','materialGv','materialHs','exerciseLms','checkinTime','checkinAt','checkinUserId','checkoutAt','checkoutUserId','teacherAttendance','checkinBy','attendance') OR NOT vuihoc.business_teacher_can(actor.madinhdanh,'Giáo viên Check-in / Check-out vào ca dạy') THEN RAISE EXCEPTION 'Trường ca học không được phép'; END IF;
      END LOOP;
     END LOOP; CONTINUE;
    END IF;
   ELSIF ds='students' AND key='malophientai' THEN
    IF vuihoc.business_can(actor.madinhdanh,'PH4','Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)') THEN CONTINUE; END IF;
   ELSIF ds='incident_categories' AND key='danhsachsuco' THEN
    IF NOT vuihoc.business_can(actor.madinhdanh,'PH2','Cấu hình Danh mục Sự cố & Vi phạm ca học') AND ((SELECT coalesce(jsonb_agg(x-'creditCoeff' ORDER BY x->>'id'),'[]') FROM jsonb_array_elements(coalesce(v->key,'[]')) x) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(x-'creditCoeff' ORDER BY x->>'id'),'[]') FROM jsonb_array_elements(coalesce(b->key,'[]')) x)) THEN RAISE EXCEPTION 'Không có quyền sửa danh mục sự cố'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(v->key,'[]')) n LEFT JOIN LATERAL (SELECT value o FROM jsonb_array_elements(coalesce(b->key,'[]')) WHERE value->>'id'=n->>'id') q ON true WHERE n->'creditCoeff' IS DISTINCT FROM o->'creditCoeff') AND NOT vuihoc.business_can(actor.madinhdanh,'PH2','Cấu hình hệ số công theo sự cố') THEN RAISE EXCEPTION 'Không có quyền sửa hệ số công'; END IF; CONTINUE;
   ELSIF ds='monthly_payroll' THEN
    IF key IN ('dakhoa','thoigiankhoa','lydomokhoa') THEN target:='Khóa, mở kỳ công và xuất CSV / in bảng công';
    ELSIF key='danhsachgiaitrinh' THEN target:='Xử lý & phê duyệt đơn giải trình công dạy';
    ELSIF key IN ('danhsachgiaovien','daguithongbao') THEN
     IF vuihoc.business_can(actor.madinhdanh,'PH7','Điều chỉnh hệ số công từng buổi kèm lý do') OR vuihoc.business_can(actor.madinhdanh,'PH7','Xử lý & phê duyệt đơn giải trình công dạy') OR vuihoc.business_can(actor.madinhdanh,'PH7','Gửi bảng công cho giáo viên đối soát') OR vuihoc.business_can(actor.madinhdanh,'PH7','Khóa, mở kỳ công và xuất CSV / in bảng công') THEN CONTINUE; END IF;
    END IF;
   END IF;
   IF NOT vuihoc.business_can(actor.madinhdanh,CASE WHEN ds='classes' AND key='phancongdaythay' THEN 'PH5' ELSE conf->>'module' END,target) THEN RAISE EXCEPTION 'Không có quyền %',target; END IF;
  END LOOP;
  IF ds='monthly_payroll' AND v IS NOT NULL AND b IS NOT NULL AND NOT vuihoc.business_can(actor.madinhdanh,'PH7','Điều chỉnh hệ số công từng buổi kèm lý do') AND NOT vuihoc.business_can(actor.madinhdanh,'PH7','Xử lý & phê duyệt đơn giải trình công dạy') THEN
   IF (SELECT coalesce(jsonb_agg(x-'payrollSent'-'reconcileStatus' ORDER BY x->>'teacherId'),'[]') FROM jsonb_array_elements(coalesce(v->'danhsachgiaovien','[]')) x) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(x-'payrollSent'-'reconcileStatus' ORDER BY x->>'teacherId'),'[]') FROM jsonb_array_elements(coalesce(b->'danhsachgiaovien','[]')) x) THEN RAISE EXCEPTION 'Không có quyền sửa số liệu công'; END IF;
  END IF;
  IF ds='report_templates' THEN
   IF oldrow IS NOT NULL AND oldrow->>'manguoidung' IS DISTINCT FROM actor.madinhdanh THEN RAISE EXCEPTION 'Mẫu báo cáo thuộc người dùng khác'; END IF;
   IF v IS NOT NULL THEN v:=v||jsonb_build_object('manguoidung',actor.madinhdanh); END IF;
  END IF;
  IF ds='classes' AND v IS NOT NULL THEN
   IF jsonb_array_length(v->'danhsachmahocsinh')>(v->>'sisotoida')::integer THEN RAISE EXCEPTION 'Sĩ số vượt mức tối đa'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(v->'danhsachmahocsinh') h WHERE NOT EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" WHERE madinhdanh=h)) THEN RAISE EXCEPTION 'Học sinh không tồn tại'; END IF;
  END IF;
  IF ds='monthly_payroll' AND coalesce((oldrow->>'dakhoa')::boolean,false) AND NOT(coalesce((v->>'dakhoa')::boolean,true)=false AND vuihoc.business_can(actor.madinhdanh,'PH7','Khóa, mở kỳ công và xuất CSV / in bảng công')) THEN RAISE EXCEPTION 'Kỳ công đã khóa'; END IF;
  IF ds='monthly_payroll' AND oldrow->>'dakhoa'='true' AND v->>'dakhoa'='false' AND coalesce(btrim(v->>'lydomokhoa'),'')='' THEN RAISE EXCEPTION 'Mở kỳ công cần lý do'; END IF;
  IF v IS NULL THEN
   EXECUTE format('DELETE FROM vuihoc.%I WHERE madinhdanh=$1',conf->>'table') USING id;
   IF ds='teachers' THEN UPDATE vuihoc."NGUOI_DUNG" SET trangthai='locked' WHERE madinhdanh=oldrow->>'manguoidung'; END IF;
  ELSE
   IF ds='lesson_incidents' THEN v:=v||jsonb_build_object('manguoibao',coalesce(oldrow->>'manguoibao',actor.madinhdanh),'manguoixuly',actor.madinhdanh); END IF;
   IF ds='sop_documents' AND oldrow IS NULL THEN v:=v||jsonb_build_object('ngaycapnhat',to_char(now(),'DD/MM/YYYY')); END IF;
   v:=coalesce(oldrow,'{}')||v;
   -- Upsert chỉ ghi các cột UI, không ghi cột hệ thống/khóa mã hóa.
   SELECT coalesce(jsonb_object_agg(k,val),'{}') INTO v FROM jsonb_each(v) e(k,val) WHERE conf->'columns' ? k;
   SELECT string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(NULL::vuihoc.%I,$1)).%I',conf->>'table',k),','),string_agg(format('%I=excluded.%I',k,k),',') INTO cols,exprs,assigns FROM jsonb_object_keys(v) k;
   EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;
   IF ds='teachers' THEN
    UPDATE vuihoc."NGUOI_DUNG" SET hoten=v->>'hoten',thudientu=v->>'thudientu',sodienthoai=v->>'sodienthoai',mamonhoc=v->>'mamonhoc' WHERE madinhdanh=oldrow->>'manguoidung';
   END IF;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('saved',true,'data',public.vuihoc_business_data(p_token));
END $save$;
REVOKE ALL ON FUNCTION vuihoc.business_config(),vuihoc.business_can(text,text,text),vuihoc.business_teacher_can(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_business_data(text),public.vuihoc_save_business(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_business_data(text),public.vuihoc_save_business(text,jsonb) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.vuihoc_ai_usage(p_token text,p_teacher_id text,p_student_id text,p_increment boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $usage$
DECLARE actor vuihoc."NGUOI_DUNG"; own text; n integer;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 SELECT madinhdanh INTO own FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 IF own IS DISTINCT FROM p_teacher_id OR NOT vuihoc.business_teacher_can(actor.madinhdanh,'Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy') OR NOT EXISTS(SELECT 1 FROM vuihoc."LOP_HOC" l WHERE p_student_id=ANY(l.danhsachmahocsinh) AND (l.magiaovien=own OR EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=l.madinhdanh AND b.magiaoviendaythay=own))) THEN RAISE EXCEPTION 'Không có quyền sử dụng nhận xét AI cho học sinh này'; END IF;
 IF p_increment THEN
  INSERT INTO vuihoc."LUOT_NHAN_XET_AI"(magiaovien,mahocsinh,soluotsudung) VALUES(p_teacher_id,p_student_id,1) ON CONFLICT(magiaovien,mahocsinh) DO UPDATE SET soluotsudung=vuihoc."LUOT_NHAN_XET_AI".soluotsudung+1 WHERE vuihoc."LUOT_NHAN_XET_AI".soluotsudung<2 RETURNING soluotsudung INTO n;
  IF n IS NULL THEN RAISE EXCEPTION 'Bạn đã sử dụng hết 2 lượt tạo nhận xét AI cho học sinh này.'; END IF;
 ELSE SELECT soluotsudung INTO n FROM vuihoc."LUOT_NHAN_XET_AI" WHERE magiaovien=p_teacher_id AND mahocsinh=p_student_id; END IF;
 RETURN jsonb_build_object('count',coalesce(n,0));
END $usage$;
REVOKE ALL ON FUNCTION public.vuihoc_ai_usage(text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_ai_usage(text,text,text,boolean) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.vuihoc_report_lesson_incident(p_token text,p_class_code text,p_date date,p_time_range text,p_incident_code text,p_note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $report$
DECLARE actor vuihoc."NGUOI_DUNG"; cls vuihoc."LOP_HOC"; slot vuihoc."KHUNG_GIO"; lesson vuihoc."BUOI_HOC"; own text; cover text; category text; item jsonb; id text; times text[];
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 SELECT * INTO cls FROM vuihoc."LOP_HOC" WHERE malophoc=p_class_code FOR SHARE;
 SELECT * INTO slot FROM vuihoc."KHUNG_GIO" WHERE regexp_replace(khoanggio,'\s','','g')=regexp_replace(p_time_range,'\s','','g') AND danghoatdong LIMIT 1;
 SELECT madinhdanh INTO own FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 SELECT x->>'teacherId' INTO cover FROM jsonb_array_elements(coalesce(cls.phancongdaythay,'[]')) x WHERE left(x->>'dateStr',10)=p_date::text LIMIT 1;
 IF cls.madinhdanh IS NULL OR cls.magiaovien IS NULL OR slot.madinhdanh IS NULL OR coalesce(btrim(p_note),'')='' THEN RAISE EXCEPTION 'Ca học hoặc nội dung sự cố không hợp lệ'; END IF;
 IF NOT vuihoc.business_can(actor.madinhdanh,'PH5','Ghi nhận và xử lý sự cố ca dạy') AND (NOT vuihoc.business_teacher_can(actor.madinhdanh,'Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)') OR own IS DISTINCT FROM coalesce(cover,cls.magiaovien)) THEN RAISE EXCEPTION 'Chỉ được báo sự cố ca được phân công cho mình'; END IF;
 SELECT c.madinhdanh,x INTO category,item FROM vuihoc."DANH_MUC_SU_CO" c CROSS JOIN LATERAL jsonb_array_elements(c.danhsachsuco) x WHERE x->>'code'=p_incident_code AND coalesce((x->>'status')::boolean,false) LIMIT 1;
 IF category IS NULL THEN RAISE EXCEPTION 'Loại sự cố không còn hoạt động trong danh mục'; END IF;
 SELECT * INTO lesson FROM vuihoc."BUOI_HOC" WHERE malop=cls.madinhdanh AND ngayhoc=p_date AND makhunggio=slot.madinhdanh FOR UPDATE;
 IF lesson.madinhdanh IS NULL THEN
  times:=regexp_split_to_array(slot.khoanggio,'\s*-\s*');
  INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,magiaoviendaythay,lienketphonghoc)
  VALUES(cls.madinhdanh,p_date,slot.madinhdanh,(p_date+times[1]::time) AT TIME ZONE 'Asia/Bangkok',(p_date+times[2]::time) AT TIME ZONE 'Asia/Bangkok',cls.magiaovien,cover,cls.lienketphonghoc) RETURNING * INTO lesson;
 END IF;
 IF NOT vuihoc.business_can(actor.madinhdanh,'PH5','Ghi nhận và xử lý sự cố ca dạy') AND own IS DISTINCT FROM coalesce(lesson.magiaoviendaythay,lesson.magiaovienchinh) THEN RAISE EXCEPTION 'Ca học đã được điều phối cho người khác'; END IF;
 INSERT INTO vuihoc."SU_CO_BUOI_HOC"(mabuoi,manhomsuco,masuco,tensuco,noidung,manguoibao) VALUES(lesson.madinhdanh,category,p_incident_code,item->>'name',btrim(p_note),actor.madinhdanh) RETURNING madinhdanh INTO id;
 RETURN jsonb_build_object('id',id,'lessonId',lesson.madinhdanh);
END $report$;
REVOKE ALL ON FUNCTION public.vuihoc_report_lesson_incident(text,text,date,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_report_lesson_incident(text,text,date,text,text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
