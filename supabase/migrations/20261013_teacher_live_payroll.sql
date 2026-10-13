BEGIN;

-- Keep each teacher credit visible before reconciliation.
UPDATE vuihoc."BANG_CONG_THANG" m
SET danhsachgiaovien=(
  SELECT jsonb_agg(
    CASE WHEN coalesce((t->>'payrollSent')::boolean,false)
      THEN t||jsonb_build_object('sessions',(
        SELECT coalesce(jsonb_agg(
          CASE WHEN s ? 'reconciliationSent' THEN s
          ELSE s||jsonb_build_object('reconciliationSent',true) END ORDER BY ord
        ),'[]'::jsonb)
        FROM jsonb_array_elements(coalesce(t->'sessions','[]'::jsonb)) WITH ORDINALITY a(s,ord)
      ))
      ELSE t END ORDER BY teacher_ord
  )
  FROM jsonb_array_elements(m.danhsachgiaovien) WITH ORDINALITY staff(t,teacher_ord)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(m.danhsachgiaovien) t
  WHERE coalesce((t->>'payrollSent')::boolean,false)
);

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
  EXECUTE format('SELECT coalesce(jsonb_agg((SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(t)) e WHERE e.key IN (SELECT jsonb_array_elements_text($1))) ORDER BY coalesce(to_jsonb(t)->>''ngaytao'','''') DESC, t.madinhdanh DESC),''[]''::jsonb) FROM vuihoc.%I t WHERE %s',cfg.c->>'table',predicate) INTO rows USING cfg.c->'columns';
  result:=result||jsonb_build_object(cfg.dataset,rows);
 END LOOP;
 IF NOT isadmin THEN
  SELECT coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('danhsachgiaovien',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(m.danhsachgiaovien) x WHERE x->>'teacherId'=own),'danhsachgiaitrinh',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(m.danhsachgiaitrinh) x WHERE x->>'teacherId'=own))),'[]') INTO rows FROM vuihoc."BANG_CONG_THANG" m WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(m.danhsachgiaovien) x WHERE x->>'teacherId'=own);
  result:=result||jsonb_build_object('monthly_payroll',rows);
 END IF;
 RETURN result;
END $read$;

CREATE OR REPLACE FUNCTION vuihoc.business_teacher_dispute(actor text,own text,original jsonb,b jsonb,v jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog AS $dispute$
DECLARE projected jsonb; newdispute jsonb; oldteacher jsonb; newteacher jsonb; sess jsonb; oldsession jsonb;
BEGIN
 IF original IS NULL OR v IS NULL OR coalesce((original->>'dakhoa')::boolean,true) OR NOT vuihoc.business_teacher_can(actor,'Gửi giải trình / khiếu nại sai lệch ca dạy') THEN RAISE EXCEPTION 'Không có quyền gửi giải trình kỳ này'; END IF;
 SELECT x INTO oldteacher FROM jsonb_array_elements(original->'danhsachgiaovien') x WHERE x->>'teacherId'=own;
 IF oldteacher IS NULL THEN RAISE EXCEPTION 'Bảng công chưa được gửi cho bạn'; END IF;
 projected:=original||jsonb_build_object('danhsachgiaovien',jsonb_build_array(oldteacher),'danhsachgiaitrinh',(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(original->'danhsachgiaitrinh') x WHERE x->>'teacherId'=own));
 IF EXISTS(SELECT 1 FROM jsonb_each(b) e WHERE projected->e.key IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Bảng công đã thay đổi ở phiên khác. Hãy tải lại.'; END IF;
 IF (v-'danhsachgiaovien'-'danhsachgiaitrinh') IS DISTINCT FROM (b-'danhsachgiaovien'-'danhsachgiaitrinh') OR jsonb_array_length(v->'danhsachgiaovien')<>1 THEN RAISE EXCEPTION 'Chỉ được thêm giải trình của mình'; END IF;
 IF jsonb_array_length(v->'danhsachgiaitrinh')<>jsonb_array_length(b->'danhsachgiaitrinh')+1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(b->'danhsachgiaitrinh') x WHERE NOT(v->'danhsachgiaitrinh' @> jsonb_build_array(x))) THEN RAISE EXCEPTION 'Không được sửa/xóa giải trình đã gửi'; END IF;
 SELECT x INTO newdispute FROM jsonb_array_elements(v->'danhsachgiaitrinh') x WHERE NOT(b->'danhsachgiaitrinh' @> jsonb_build_array(x));
 IF newdispute->>'teacherId' IS DISTINCT FROM own OR newdispute->>'status' IS DISTINCT FROM 'CHO_DUYET' OR coalesce(btrim(newdispute->>'content'),'')='' OR coalesce(newdispute->>'id','')='' OR EXISTS(SELECT 1 FROM jsonb_array_elements(original->'danhsachgiaitrinh') x WHERE x->>'id'=newdispute->>'id' OR (x->>'teacherId'=own AND x->>'sessionId'=newdispute->>'sessionId' AND x->>'status'='CHO_DUYET')) THEN RAISE EXCEPTION 'Giải trình không hợp lệ hoặc đang chờ duyệt'; END IF;
 newteacher:=v->'danhsachgiaovien'->0;
 IF (newteacher-'reconcileStatus'-'sessions') IS DISTINCT FROM (oldteacher-'reconcileStatus'-'sessions') OR newteacher->>'reconcileStatus' IS DISTINCT FROM 'CO_GIAI_TRINH' OR jsonb_array_length(newteacher->'sessions')<>jsonb_array_length(oldteacher->'sessions') THEN RAISE EXCEPTION 'Không được sửa số liệu công dạy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(oldteacher->'sessions') s WHERE s->>'id'=newdispute->>'sessionId' AND coalesce((s->>'reconciliationSent')::boolean,(oldteacher->>'payrollSent')::boolean,false)) THEN RAISE EXCEPTION 'Ca dạy không thuộc bảng công của bạn'; END IF;
 FOR sess IN SELECT value FROM jsonb_array_elements(newteacher->'sessions') LOOP
  SELECT x INTO oldsession FROM jsonb_array_elements(oldteacher->'sessions') x WHERE x->>'id'=sess->>'id';
  IF oldsession IS NULL OR (sess-'dispute') IS DISTINCT FROM (oldsession-'dispute') OR (sess->>'id'=newdispute->>'sessionId' AND sess->'dispute' IS DISTINCT FROM newdispute) OR (sess->>'id'<>newdispute->>'sessionId' AND sess IS DISTINCT FROM oldsession) THEN RAISE EXCEPTION 'Không được sửa ca dạy khi gửi giải trình'; END IF;
 END LOOP;
 RETURN original||jsonb_build_object('danhsachgiaovien',(SELECT jsonb_agg(CASE WHEN x->>'teacherId'=own THEN newteacher ELSE x END) FROM jsonb_array_elements(original->'danhsachgiaovien') x),'danhsachgiaitrinh',jsonb_build_array(newdispute)||(original->'danhsachgiaitrinh'));
END $dispute$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_ca_vao_bang_cong(
  p_buoi text, p_giaovien text, p_heso numeric, p_loai text,
  p_suco text DEFAULT NULL, p_ghichu text DEFAULT '', p_thayheso boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE b vuihoc."BUOI_HOC"; c vuihoc."LOP_HOC"; g vuihoc."GIAO_VIEN";
  period text; slot text; staff jsonb; old_session jsonb; session jsonb; staff_list jsonb;
  incident vuihoc."SU_CO_BUOI_HOC"; names jsonb;
BEGIN
  SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi;
  SELECT * INTO c FROM vuihoc."LOP_HOC" WHERE madinhdanh=b.malop;
  SELECT * INTO g FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=p_giaovien;
  IF b.madinhdanh IS NULL OR g.madinhdanh IS NULL THEN RETURN; END IF;
  period:=to_char(b.ngayhoc,'YYYY-MM');
  PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||period,0));
  INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES(period,false,false) ON CONFLICT(kycong) DO NOTHING;
  SELECT danhsachgiaovien INTO staff_list FROM vuihoc."BANG_CONG_THANG" WHERE kycong=period AND NOT dakhoa FOR UPDATE;
  IF staff_list IS NULL THEN RAISE EXCEPTION 'Kỳ công % đã khóa',period; END IF;
  SELECT khoanggio INTO slot FROM vuihoc."KHUNG_GIO" WHERE madinhdanh=b.makhunggio;
  SELECT * INTO incident FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh=p_suco;
  SELECT value INTO staff FROM jsonb_array_elements(staff_list) WHERE value->>'teacherId'=p_giaovien LIMIT 1;
  SELECT value INTO old_session FROM jsonb_array_elements(coalesce(staff->'sessions','[]'))
    WHERE value->>'lessonId'=p_buoi OR value->>'id'=p_buoi OR (
      value->>'classCode'=c.malophoc
      AND (value->>'date'=b.ngayhoc::text OR left(value->>'dateStr',10)=b.ngayhoc::text OR left(value->>'dateStr',10)=to_char(b.ngayhoc,'DD/MM/YYYY'))
      AND regexp_replace(coalesce(value->>'time',''),'\s','','g')=regexp_replace(slot,'\s','','g')) LIMIT 1;
  SELECT coalesce(jsonb_agg(h.hoten),'[]') INTO names FROM vuihoc."HOC_SINH" h WHERE h.madinhdanh=ANY(c.danhsachmahocsinh);
  session:=coalesce(old_session,'{}')||jsonb_build_object(
    'id',coalesce(old_session->>'id',p_buoi),'lessonId',p_buoi,
    'date',b.ngayhoc::text,'dateStr',to_char(b.ngayhoc,'DD/MM/YYYY'),'week','Tuần '||to_char(b.ngayhoc,'W'),
    'dayOfWeek',extract(isodow FROM b.ngayhoc)::text,'time',slot,
    'classCode',c.malophoc,'className',c.tenlophoc,'model',c.mamohinh,
    'teacherId',p_giaovien,'teacherName',g.hoten,'staffRole',coalesce(staff->>'staffRole','GIAO_VIEN'),'staffRoleName',coalesce(staff->>'staffRoleName','Giáo viên'),
    'studentNames',names,'studentName',coalesce(names->>0,''),'studentCount',jsonb_array_length(names),
    'durationMinutes',extract(epoch FROM b.ketthuc-b.batdau)/60,
    'checkin',coalesce(to_char(b.vaolopluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),'--'),
    'checkout',coalesce(to_char(b.ketthucluc AT TIME ZONE 'Asia/Bangkok','HH24:MI:SS'),'--'),
    'hasAiReview',EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=p_buoi),
    'type',p_loai,'statusText',coalesce(incident.tensuco,CASE WHEN p_loai='COVER' THEN 'Dạy thay' ELSE 'Dạy chuẩn' END),
    'creditCoeff',CASE WHEN p_thayheso OR old_session IS NULL THEN p_heso ELSE (old_session->>'creditCoeff')::numeric END,
    'hrPayNote',CASE WHEN p_thayheso OR old_session IS NULL THEN p_ghichu ELSE coalesce(old_session->>'hrPayNote','') END,
    'reconcileStatus',coalesce(old_session->>'reconcileStatus','CHO_DOI_SOAT'),'dispute',old_session->'dispute');
  IF p_suco IS NOT NULL THEN
    session:=session||jsonb_build_object('incidentId',p_suco,'handledBy',incident.manguoixuly,
      'handledByName',(SELECT hoten FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=incident.manguoixuly),
      'handledAt',incident.xulyluc);
  END IF;
  IF session IS NOT DISTINCT FROM old_session THEN RETURN; END IF;
  session:=session||jsonb_build_object('reconciliationSent',false);
  staff:=coalesce(staff,jsonb_build_object('teacherId',p_giaovien,'teacherName',g.hoten,'staffRole','GIAO_VIEN',
    'staffRoleName','Giáo viên','subject',CASE WHEN g.mamonhoc='SUB-ENG' THEN 'ANH' ELSE 'TOAN' END,
    'subjectName',CASE WHEN g.mamonhoc='SUB-ENG' THEN 'Tiếng Anh' ELSE 'Toán' END,
    'standardSessions',0,'coverSessions',0,'studentCanceledSessions',0,'lateSessions',0,'emergencySessions',0,'approvedExplanations',0))
    ||jsonb_build_object('payrollSent',false,'reconcileStatus','CHO_GUI','sessions',
      CASE WHEN old_session IS NULL THEN coalesce(staff->'sessions','[]')||jsonb_build_array(session)
      ELSE (SELECT jsonb_agg(CASE WHEN x->>'id'=old_session->>'id' THEN session ELSE x END ORDER BY ord)
        FROM jsonb_array_elements(staff->'sessions') WITH ORDINALITY a(x,ord)) END);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(staff_list) t WHERE t->>'teacherId'=p_giaovien) THEN
    SELECT jsonb_agg(CASE WHEN t->>'teacherId'=p_giaovien THEN staff ELSE t END ORDER BY ord) INTO staff_list
    FROM jsonb_array_elements(staff_list) WITH ORDINALITY a(t,ord);
  ELSE staff_list:=staff_list||jsonb_build_array(staff); END IF;
  UPDATE vuihoc."BANG_CONG_THANG" SET danhsachgiaovien=staff_list WHERE kycong=period;
END $fn$;

-- A completed class session becomes payable only after every enrolled student
-- has a saved comment. Keep the normalized lesson and credit in sync.
CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_khi_du_nhan_xet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $complete$
DECLARE session jsonb; lesson vuihoc."BUOI_HOC";
  lesson_date date; slot_text text; slot_id text; start_at timestamptz; end_at timestamptz;
  student_id text; actual_teacher text;
BEGIN
  FOR session IN SELECT value FROM jsonb_each(coalesce(NEW.chitietcahoc,'{}'::jsonb)) LOOP
    IF session->>'status'<>'Đã hoàn thành' THEN CONTINUE; END IF;
    IF coalesce(array_length(NEW.danhsachmahocsinh,1),0)=0 OR EXISTS (
      SELECT 1 FROM unnest(NEW.danhsachmahocsinh) student
      WHERE btrim(coalesce(session->'feedback'->>student,''))=''
    ) THEN CONTINUE; END IF;
    lesson_date:=left(session->>'dateStr',10)::date;
    slot_text:=substring(session->>'dateStr' FROM '[0-9]{2}:[0-9]{2} *- *[0-9]{2}:[0-9]{2}');
    SELECT madinhdanh INTO slot_id FROM vuihoc."KHUNG_GIO"
      WHERE slot_text IS NOT NULL AND regexp_replace(khoanggio,'\s','','g')=regexp_replace(slot_text,'\s','','g')
      LIMIT 1;
    SELECT * INTO lesson FROM vuihoc."BUOI_HOC"
      WHERE malop=NEW.madinhdanh AND ngayhoc=lesson_date
        AND (slot_id IS NULL OR makhunggio=slot_id) ORDER BY batdau LIMIT 1;
    IF lesson.madinhdanh IS NULL THEN
      IF slot_id IS NULL THEN RAISE EXCEPTION 'Không xác định được khung giờ cho ca %',session->>'dateStr'; END IF;
      start_at:=(lesson_date::text||' '||btrim(split_part(slot_text,'-',1)))::timestamp AT TIME ZONE 'Asia/Bangkok';
      end_at:=(lesson_date::text||' '||btrim(split_part(slot_text,'-',2)))::timestamp AT TIME ZONE 'Asia/Bangkok';
      INSERT INTO vuihoc."BUOI_HOC"(malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh,tieude,lienketphonghoc,vaolopluc)
      VALUES(NEW.madinhdanh,lesson_date,slot_id,start_at,end_at,NEW.magiaovien,coalesce(session->>'title',''),
        coalesce(NEW.lienketphonghoc,''),coalesce(nullif(session->>'checkinAt','')::timestamptz,start_at))
      RETURNING * INTO lesson;
    END IF;
    actual_teacher:=coalesce(nullif(session->>'coverTeacherId',''),NEW.magiaovien);
    FOREACH student_id IN ARRAY NEW.danhsachmahocsinh LOOP
      INSERT INTO vuihoc."NHAN_XET_BUOI_HOC"(mabuoi,mahocsinh,noidung)
      VALUES(lesson.madinhdanh,student_id,session->'feedback'->>student_id)
      ON CONFLICT(mabuoi,mahocsinh) DO UPDATE SET noidung=EXCLUDED.noidung;
    END LOOP;
    UPDATE vuihoc."BUOI_HOC" SET trangthai='HOAN_THANH',
      magiaoviendaythay=CASE WHEN actual_teacher<>magiaovienchinh THEN actual_teacher ELSE NULL END,
      vaolopluc=coalesce(vaolopluc,nullif(session->>'checkinAt','')::timestamptz,batdau),
      ketthucluc=coalesce(nullif(session->>'checkoutAt','')::timestamptz,ketthuc),
      tieude=coalesce(session->>'title',tieude)
    WHERE madinhdanh=lesson.madinhdanh;
  END LOOP;
  RETURN NEW;
END $complete$;
DROP TRIGGER IF EXISTS ghi_cong_khi_du_nhan_xet ON vuihoc."LOP_HOC";
CREATE TRIGGER ghi_cong_khi_du_nhan_xet AFTER UPDATE OF chitietcahoc ON vuihoc."LOP_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_cong_khi_du_nhan_xet();
REVOKE ALL ON FUNCTION vuihoc.ghi_cong_khi_du_nhan_xet() FROM PUBLIC,anon,authenticated;

-- Materialize already completed sessions as well as future completions.
UPDATE vuihoc."LOP_HOC" SET chitietcahoc=chitietcahoc
WHERE EXISTS (SELECT 1 FROM jsonb_each(coalesce(chitietcahoc,'{}'::jsonb)) s
  WHERE s.value->>'status'='Đã hoàn thành');

COMMIT;
