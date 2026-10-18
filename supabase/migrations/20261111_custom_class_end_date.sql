-- Apply after class duration migration 20261109.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.tinh_ngay_ket_thuc_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.thoihanthang IS NOT NULL THEN
  IF NEW.ngaybatdau IS NULL THEN RAISE EXCEPTION 'Chọn ngày bắt đầu lớp'; END IF;
  IF TG_OP='INSERT' OR NEW.thoihanthang IS DISTINCT FROM OLD.thoihanthang THEN
   IF NOT EXISTS(SELECT 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
    WHERE c.madanhmuc='CLASS_DURATION' AND m.danghoatdong AND m.ma=NEW.thoihanthang::text) THEN RAISE EXCEPTION 'Thời hạn lớp không thuộc danh mục đang hoạt động'; END IF;
  END IF;
  NEW.ngayketthuc:=(NEW.ngaybatdau+make_interval(months=>NEW.thoihanthang))::date-1;
 ELSE
  IF TG_OP='UPDATE' AND OLD.ngayketthuc IS NOT NULL AND NEW.ngayketthuc IS NULL THEN
   RAISE EXCEPTION 'Chọn ngày kết thúc tùy chỉnh hoặc thời hạn theo tháng';
  END IF;
 END IF;
 IF NEW.ngayketthuc IS NOT NULL THEN
  IF NEW.ngaybatdau IS NULL OR NEW.ngayketthuc<NEW.ngaybatdau THEN RAISE EXCEPTION 'Ngày kết thúc phải từ ngày bắt đầu lớp trở đi'; END IF;
  IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=NEW.madinhdanh AND b.ngayhoc>NEW.ngayketthuc) THEN
   RAISE EXCEPTION 'Lớp đã có buổi học sau ngày kết thúc. Hãy xử lý lịch các buổi đó trước khi rút ngắn thời hạn.';
  END IF;
 END IF;
 RETURN NEW;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
