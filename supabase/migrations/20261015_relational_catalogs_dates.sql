-- Apply after 20261014_normalize_monthly_payroll.sql and report_creation_dates.sql.
-- JSON is only an API representation; catalog lists are SELECT results.
BEGIN;
DO $prerequisite$
BEGIN
 IF to_regclass('vuihoc."DOI_SOAT_CONG_GIAO_VIEN"') IS NULL THEN
  RAISE EXCEPTION 'Chạy 20261014_normalize_monthly_payroll.sql trước';
 END IF;
END $prerequisite$;
CREATE TABLE IF NOT EXISTS vuihoc."LUA_CHON_CAP_HOC" (
 macaphoc text NOT NULL REFERENCES vuihoc."CAP_HOC"(madinhdanh) ON DELETE CASCADE,
 madinhdanh text NOT NULL, nhan text NOT NULL, thutu integer NOT NULL, macha text,
 PRIMARY KEY(macaphoc,madinhdanh)
);
CREATE TABLE IF NOT EXISTS vuihoc."LOAI_SU_CO" (
 manhom text NOT NULL REFERENCES vuihoc."DANH_MUC_SU_CO"(madinhdanh) ON DELETE CASCADE,
 madinhdanh text NOT NULL, ma text NOT NULL, ten text NOT NULL,
 doituong text NOT NULL, mota text NOT NULL, danghoatdong boolean NOT NULL,
 hesocong numeric CHECK(hesocong BETWEEN -999.999 AND 999.999),
 loaithongbao text, thutu integer NOT NULL, PRIMARY KEY(manhom,madinhdanh)
);
CREATE TABLE IF NOT EXISTS vuihoc."TIEU_CHI" (
 manhom text NOT NULL REFERENCES vuihoc."NHOM_TIEU_CHI"(madinhdanh) ON DELETE CASCADE,
 madinhdanh text NOT NULL, ten text NOT NULL, thutu integer NOT NULL,
 PRIMARY KEY(manhom,madinhdanh)
);
CREATE TABLE IF NOT EXISTS vuihoc."LUA_CHON_TIEU_CHI" (
 manhom text NOT NULL, matieuchi text NOT NULL, madinhdanh text NOT NULL,
 nhan text NOT NULL, macdinh boolean NOT NULL DEFAULT false, thutu integer NOT NULL,
 PRIMARY KEY(manhom,matieuchi,madinhdanh),
 FOREIGN KEY(manhom,matieuchi) REFERENCES vuihoc."TIEU_CHI"(manhom,madinhdanh) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS vuihoc."MUC_DANH_MUC" (
 madanhmuc text NOT NULL REFERENCES vuihoc."DANH_MUC_BO_SUNG"(madinhdanh) ON DELETE CASCADE,
 madinhdanh text NOT NULL, ma text NOT NULL, ten text NOT NULL,
 mota text NOT NULL DEFAULT '', danghoatdong boolean NOT NULL DEFAULT true,
 thutu integer NOT NULL, PRIMARY KEY(madanhmuc,madinhdanh)
);

CREATE OR REPLACE FUNCTION vuihoc.danh_sach_truy_van(p_table text,p_row jsonb)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $fn$
 SELECT p_row || CASE p_table
 WHEN 'CAP_HOC' THEN jsonb_build_object('danhsachluachon',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.madinhdanh,'label',o.nhan) ORDER BY o.thutu),'[]')
  FROM vuihoc."LUA_CHON_CAP_HOC" o WHERE o.macaphoc=p_row->>'madinhdanh'))
 WHEN 'DANH_MUC_SU_CO' THEN jsonb_build_object('danhsachsuco',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.madinhdanh,'code',s.ma,'name',s.ten,
   'targetParty',s.doituong,'desc',s.mota,'status',s.danghoatdong)
   || CASE WHEN s.hesocong IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('creditCoeff',s.hesocong) END
   || CASE WHEN s.loaithongbao IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('noticeType',s.loaithongbao) END
   ORDER BY s.thutu),'[]') FROM vuihoc."LOAI_SU_CO" s WHERE s.manhom=p_row->>'madinhdanh'))
 WHEN 'NHOM_TIEU_CHI' THEN jsonb_build_object('danhsachtieuchi',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.madinhdanh,'name',c.ten,'options',(
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.madinhdanh,'label',o.nhan,'isDefault',o.macdinh) ORDER BY o.thutu),'[]')
   FROM vuihoc."LUA_CHON_TIEU_CHI" o WHERE o.manhom=c.manhom AND o.matieuchi=c.madinhdanh
  )) ORDER BY c.thutu),'[]') FROM vuihoc."TIEU_CHI" c WHERE c.manhom=p_row->>'madinhdanh'))
 WHEN 'DANH_MUC_BO_SUNG' THEN jsonb_build_object('danhsachmuc',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.madinhdanh,'code',m.ma,'name',m.ten,'desc',m.mota,'status',m.danghoatdong) ORDER BY m.thutu),'[]')
  FROM vuihoc."MUC_DANH_MUC" m WHERE m.madanhmuc=p_row->>'madinhdanh'))
 ELSE '{}'::jsonb END
$fn$;

CREATE OR REPLACE FUNCTION vuihoc.ghi_chi_tiet_danh_muc(p_table text,p_row jsonb,p_sync boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE c record; o record; id text:=p_row->>'madinhdanh';
BEGIN
 IF p_table='CAP_HOC' AND p_row ? 'danhsachluachon' THEN
  DELETE FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=id;
  FOR c IN SELECT value,ordinality FROM jsonb_array_elements(p_row->'danhsachluachon') WITH ORDINALITY LOOP
   INSERT INTO vuihoc."LUA_CHON_CAP_HOC"(macaphoc,madinhdanh,nhan,thutu,macha) VALUES(id,c.value->>'id',c.value->>'label',c.ordinality,nullif(c.value->>'parentId',''));
  END LOOP;
  IF EXISTS(WITH RECURSIVE tree(node,path,cycle) AS (
   SELECT madinhdanh,ARRAY[madinhdanh],false FROM vuihoc."LUA_CHON_CAP_HOC" WHERE macaphoc=id
   UNION ALL SELECT node.macha,t.path||node.macha,node.macha=ANY(t.path) FROM tree t
   JOIN vuihoc."LUA_CHON_CAP_HOC" node ON node.macaphoc=id AND node.madinhdanh=t.node
   WHERE node.macha IS NOT NULL AND NOT t.cycle
  ) SELECT 1 FROM tree WHERE cycle) THEN RAISE EXCEPTION 'Danh mục có vòng lặp cấp cha'; END IF;
 ELSIF p_table='DANH_MUC_SU_CO' AND p_row ? 'danhsachsuco' THEN
  DELETE FROM vuihoc."LOAI_SU_CO" WHERE manhom=id;
  FOR c IN SELECT value,ordinality FROM jsonb_array_elements(p_row->'danhsachsuco') WITH ORDINALITY LOOP
   INSERT INTO vuihoc."LOAI_SU_CO" VALUES(id,c.value->>'id',c.value->>'code',c.value->>'name',c.value->>'targetParty',c.value->>'desc',(c.value->>'status')::boolean,(c.value->>'creditCoeff')::numeric,c.value->>'noticeType',c.ordinality);
  END LOOP;
  -- Existing incident snapshots are refreshed only in open months.
  UPDATE vuihoc."SU_CO_BUOI_HOC" i SET hesocongapdung=s.hesocong
  FROM vuihoc."LOAI_SU_CO" s,vuihoc."BUOI_HOC" b
  WHERE p_sync AND s.manhom=id AND i.manhomsuco=id AND i.masuco=s.ma AND b.madinhdanh=i.mabuoi
   AND s.danghoatdong AND s.hesocong IS NOT NULL AND i.hesocongapdung IS DISTINCT FROM s.hesocong
   AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa);
 ELSIF p_table='NHOM_TIEU_CHI' AND p_row ? 'danhsachtieuchi' THEN
  IF jsonb_typeof(p_row->'danhsachtieuchi')<>'array' THEN RAISE EXCEPTION 'Danh sách tiêu chí phải là mảng'; END IF;
  DELETE FROM vuihoc."TIEU_CHI" WHERE manhom=id;
  FOR c IN SELECT value,ordinality FROM jsonb_array_elements(p_row->'danhsachtieuchi') WITH ORDINALITY LOOP
   INSERT INTO vuihoc."TIEU_CHI" VALUES(id,c.value->>'id',c.value->>'name',c.ordinality);
   FOR o IN SELECT value,ordinality FROM jsonb_array_elements(coalesce(c.value->'options','[]')) WITH ORDINALITY LOOP
    INSERT INTO vuihoc."LUA_CHON_TIEU_CHI" VALUES(id,c.value->>'id',o.value->>'id',o.value->>'label',coalesce((o.value->>'isDefault')::boolean,false),o.ordinality);
   END LOOP;
  END LOOP;
 ELSIF p_table='DANH_MUC_BO_SUNG' AND p_row ? 'danhsachmuc' THEN
  IF jsonb_typeof(p_row->'danhsachmuc')<>'array' THEN RAISE EXCEPTION 'Danh sách mục phải là mảng'; END IF;
  DELETE FROM vuihoc."MUC_DANH_MUC" WHERE madanhmuc=id;
  FOR c IN SELECT value,ordinality FROM jsonb_array_elements(p_row->'danhsachmuc') WITH ORDINALITY LOOP
   INSERT INTO vuihoc."MUC_DANH_MUC" VALUES(id,c.value->>'id',c.value->>'code',c.value->>'name',coalesce(c.value->>'desc',''),coalesce((c.value->>'status')::boolean,true),c.ordinality);
  END LOOP;
 END IF;
END $fn$;

DO $backfill$
DECLARE t text; r jsonb;
BEGIN
 FOREACH t IN ARRAY ARRAY['NHOM_TIEU_CHI','DANH_MUC_BO_SUNG','CAP_HOC','DANH_MUC_SU_CO'] LOOP
  EXECUTE format('LOCK TABLE vuihoc.%I IN SHARE ROW EXCLUSIVE MODE',t);
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name=t AND column_name IN ('danhsachtieuchi','danhsachmuc','danhsachluachon','danhsachsuco')) THEN
   FOR r IN EXECUTE format('SELECT to_jsonb(t) FROM vuihoc.%I t',t) LOOP
    PERFORM vuihoc.ghi_chi_tiet_danh_muc(t,r,false);
    IF vuihoc.danh_sach_truy_van(t,r) IS DISTINCT FROM r THEN
     RAISE EXCEPTION 'Chưa chuyển đủ danh sách của %; hủy giao dịch',r->>'madinhdanh';
    END IF;
   END LOOP;
  END IF;
 END LOOP;
END $backfill$;
ALTER TABLE vuihoc."NHOM_TIEU_CHI" DROP COLUMN IF EXISTS danhsachtieuchi;
ALTER TABLE vuihoc."DANH_MUC_BO_SUNG" DROP COLUMN IF EXISTS danhsachmuc;
DROP TRIGGER IF EXISTS dong_bo_he_so_danh_muc ON vuihoc."DANH_MUC_SU_CO";
ALTER TABLE vuihoc."DANH_MUC_SU_CO" DROP COLUMN IF EXISTS danhsachsuco;
ALTER TABLE vuihoc."CAP_HOC" DROP COLUMN IF EXISTS danhsachluachon;

-- Reinstall the normalized payroll reader, also preserving report creation dates.
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
  IF cfg.dataset='monthly_payroll' THEN
   EXECUTE format('SELECT coalesce(jsonb_agg(vuihoc.bang_cong_truy_van(t.kycong) ORDER BY t.kycong DESC),''[]''::jsonb) FROM vuihoc."BANG_CONG_THANG" t WHERE %s',predicate) INTO rows;
  ELSE
  EXECUTE format('SELECT coalesce(jsonb_agg((SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(t)) e WHERE (e.key IN (SELECT jsonb_array_elements_text($1)) OR (e.key=''ngaytao'' AND $2 IN (''teachers'',''students'',''classes'')))) ORDER BY coalesce(to_jsonb(t)->>''ngaytao'','''') DESC, t.madinhdanh DESC),''[]''::jsonb) FROM vuihoc.%I t WHERE %s',cfg.c->>'table',predicate) INTO rows USING cfg.c->'columns',cfg.dataset;
  END IF;
  result:=result||jsonb_build_object(cfg.dataset,rows);
 END LOOP;
 IF NOT isadmin THEN
  IF own IS NOT NULL AND vuihoc.business_teacher_can(actor.madinhdanh,'Xem bảng kê công dạy cá nhân theo kỳ') THEN
   SELECT coalesce(jsonb_agg(vuihoc.bang_cong_truy_van(m.kycong,own) ORDER BY m.kycong DESC),'[]') INTO rows
   FROM vuihoc."BANG_CONG_THANG" m WHERE EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.kycong=m.kycong AND c.magiaovien=own)
    OR EXISTS(SELECT 1 FROM vuihoc."DOI_SOAT_CONG_GIAO_VIEN" d WHERE d.kycong=m.kycong AND d.magiaovien=own);
  ELSE rows:='[]'; END IF;
  result:=result||jsonb_build_object('monthly_payroll',rows);
 END IF;
 RETURN result;
END $read$;

-- Patch the existing authorized RPCs, preserving permission checks and row locks.
DO $rpc$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF position('vuihoc.danh_sach_truy_van' IN f)=0 THEN
  f:=replace(f,'jsonb_each(to_jsonb(t))','jsonb_each(vuihoc.danh_sach_truy_van('' || quote_literal(cfg.c->>''table'') || '',to_jsonb(t)))');
  EXECUTE f;
 END IF;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF position('vuihoc.ghi_chi_tiet_danh_muc' IN f)=0 THEN
  f:=replace(f,'IF oldrow IS NULL AND b IS NOT NULL', 'oldrow:=vuihoc.danh_sach_truy_van(conf->>''table'',oldrow);' || chr(10) || '  IF oldrow IS NULL AND b IS NOT NULL');
  f:=replace(f,'FROM jsonb_object_keys(v) k;', 'FROM jsonb_object_keys(v) k WHERE NOT (conf->>''table''=''NHOM_TIEU_CHI'' AND k=''danhsachtieuchi'') AND NOT (conf->>''table''=''DANH_MUC_BO_SUNG'' AND k=''danhsachmuc'') AND NOT (conf->>''table''=''CAP_HOC'' AND k=''danhsachluachon'') AND NOT (conf->>''table''=''DANH_MUC_SU_CO'' AND k=''danhsachsuco'');');
  f:=replace(f,'assigns) USING v;', 'assigns) USING v; PERFORM vuihoc.ghi_chi_tiet_danh_muc(conf->>''table'',v);');
  EXECUTE f;
 END IF;
END $rpc$;

DO $security$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['TIEU_CHI','LUA_CHON_TIEU_CHI','MUC_DANH_MUC','LUA_CHON_CAP_HOC','LOAI_SU_CO'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $security$;
REVOKE ALL ON FUNCTION vuihoc.danh_sach_truy_van(text,jsonb),vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean) FROM PUBLIC,anon,authenticated;

DROP VIEW IF EXISTS vuihoc."V_BANG_CONG_THEO_GIAO_VIEN";
DROP VIEW IF EXISTS vuihoc."V_CONG_DAY_THEO_CA";
DO $dates$
DECLARE c record; chk record;
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name='batdau' AND data_type='timestamp with time zone') THEN
  -- The date is already held in ngayhoc; discard only the duplicate date check.
  FOR chk IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."BUOI_HOC"'::regclass
    AND contype='c' AND pg_get_constraintdef(oid) LIKE '%AT TIME ZONE%' LOOP
   EXECUTE format('ALTER TABLE vuihoc."BUOI_HOC" DROP CONSTRAINT %I',chk.conname);
  END LOOP;
  ALTER TABLE vuihoc."BUOI_HOC" ALTER COLUMN batdau TYPE time(0) USING (batdau AT TIME ZONE 'Asia/Bangkok')::time,
   ALTER COLUMN ketthuc TYPE time(0) USING (ketthuc AT TIME ZONE 'Asia/Bangkok')::time;
 END IF;
 FOR c IN SELECT table_name,column_name,column_default FROM information_schema.columns
  WHERE table_schema='vuihoc' AND data_type='timestamp with time zone'
   AND (column_name IN ('ngaytao','ngaycapnhat','guiluc','duyetluc','thoigiankhoa') OR
    (table_name='SU_CO_BUOI_HOC' AND column_name IN ('baoluc','xulyluc'))) LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ALTER COLUMN %I DROP DEFAULT',c.table_name,c.column_name);
  EXECUTE format('ALTER TABLE vuihoc.%I ALTER COLUMN %I TYPE date USING (%I AT TIME ZONE ''Asia/Bangkok'')::date',c.table_name,c.column_name,c.column_name);
  IF c.column_default IS NOT NULL OR c.column_name IN ('ngaytao','ngaycapnhat','baoluc') THEN
   EXECUTE format('ALTER TABLE vuihoc.%I ALTER COLUMN %I SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Bangkok'')::date',c.table_name,c.column_name);
  END IF;
 END LOOP;
END $dates$;

-- Explicit projections avoid exposing audit columns or duplicated display data.
CREATE VIEW vuihoc."V_CONG_DAY_THEO_CA" WITH (security_invoker=true) AS
 SELECT c.madinhdanh,c.mabuoi,c.magiaovien,c.kycong,c.vaitro,c.hesocong,
 c.ghichu,c.dagui,c.loaicong,c.trangthaidoisoat,
 b.ngayhoc,b.malop,b.makhunggio,b.batdau,b.ketthuc
 FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi;
CREATE VIEW vuihoc."V_BANG_CONG_THEO_GIAO_VIEN" WITH (security_invoker=true) AS
 SELECT c.kycong,c.magiaovien,count(*) AS sobuoi,sum(c.hesocong) AS tongcong
 FROM vuihoc."CONG_DAY_BUOI_HOC" c GROUP BY c.kycong,c.magiaovien;
REVOKE ALL ON vuihoc."V_CONG_DAY_THEO_CA",vuihoc."V_BANG_CONG_THEO_GIAO_VIEN" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."V_CONG_DAY_THEO_CA",vuihoc."V_BANG_CONG_THEO_GIAO_VIEN" TO service_role;

-- Short IDs for new rows. Existing IDs and explanation foreign keys stay valid.
CREATE SEQUENCE IF NOT EXISTS vuihoc.ma_cong_ngan;
ALTER TABLE vuihoc."CONG_DAY_BUOI_HOC" ALTER COLUMN madinhdanh SET DEFAULT ('CD-'||nextval('vuihoc.ma_cong_ngan'));
DO $functions$
DECLARE r record; f text;
BEGIN
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f'
   AND (p.prosrc LIKE '%times[1]%' OR p.prosrc LIKE '%start_at,end_at%' OR p.prosrc LIKE '%timestamptz,batdau)%'
    OR p.prosrc LIKE '%c.danhsachsuco%' OR p.prosrc LIKE '%category.danhsachluachon%'
    OR p.prosrc LIKE '%NEW.ngaycapnhat = now()%') LOOP
  f:=pg_get_functiondef(r.oid);
  f:=replace(f,'(p_date+times[1]::time) AT TIME ZONE ''Asia/Bangkok''','times[1]::time');
  f:=replace(f,'(p_date+times[2]::time) AT TIME ZONE ''Asia/Bangkok''','times[2]::time');
  f:=replace(f,'slot_id,start_at,end_at,','slot_id,(start_at AT TIME ZONE ''Asia/Bangkok'')::time,(end_at AT TIME ZONE ''Asia/Bangkok'')::time,');
  f:=replace(f,'::timestamptz,batdau)','::timestamptz,(ngayhoc+batdau) AT TIME ZONE ''Asia/Bangkok'')');
  f:=replace(f,'::timestamptz,ketthuc)','::timestamptz,(ngayhoc+ketthuc) AT TIME ZONE ''Asia/Bangkok'')');
  f:=replace(f,'c.danhsachsuco','(vuihoc.danh_sach_truy_van(''DANH_MUC_SU_CO'',to_jsonb(c))->''danhsachsuco'')');
  f:=replace(f,'category.danhsachluachon','(vuihoc.danh_sach_truy_van(''CAP_HOC'',to_jsonb(category))->''danhsachluachon'')');
  f:=replace(f,'NEW.ngaycapnhat = now()','NEW.ngaycapnhat = (CURRENT_TIMESTAMP AT TIME ZONE ''Asia/Bangkok'')::date');
  EXECUTE f;
 END LOOP;
END $functions$;
NOTIFY pgrst,'reload schema';
COMMIT;
