-- Build fragment. Run the generated fix_demo_payroll_explanations.sql instead.
-- Replaces only old placeholder claims; genuine/edited claims are retained.
-- Historical demo periods are opened with a reason and reclosed atomically.
BEGIN;
LOCK TABLE vuihoc."BANG_CONG_THANG",vuihoc."CONG_DAY_BUOI_HOC",
 vuihoc."GIAI_TRINH_CONG_DAY" IN SHARE ROW EXCLUSIVE MODE;
DO $repair_prefix$
DECLARE actor text; p record; original jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" WHERE kycong='2026-10' AND dakhoa) THEN
  RAISE EXCEPTION 'Tháng 10 đã khóa; mở khóa theo nghiệp vụ trước khi sửa mẫu.';
 END IF;
 -- Refuse to change shared historical periods containing non-demo work.
 IF EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi
  WHERE b.ngayhoc>=date '2026-08-01' AND b.ngayhoc<date '2026-11-01'
  AND c.magiaovien !~ '^DEMO-GV-[0-9]{3}$') THEN
  RAISE EXCEPTION 'Kỳ có công ngoài bộ demo; dừng sửa tự động để giữ dữ liệu thực tế.';
 END IF;
 SELECT u.madinhdanh INTO STRICT actor FROM vuihoc."NGUOI_DUNG" u
 JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
 WHERE g.congtruycap='ADMIN' AND u.trangthai='active'
 AND 'ALL'=ANY(vuihoc.quyen_nhom(g.madinhdanh)) ORDER BY u.madinhdanh LIMIT 1;
 FOR p IN SELECT kycong FROM vuihoc."BANG_CONG_THANG" WHERE kycong IN ('2026-08','2026-09') AND dakhoa LOOP
  original:=vuihoc.bang_cong_truy_van(p.kycong);
  PERFORM vuihoc.luu_bang_cong(actor,NULL,original,original||jsonb_build_object('dakhoa',false,
   'lydomokhoa','Bổ sung lịch sử giải trình mẫu đúng buổi, sau đó khóa lại trong cùng giao dịch.'));
 END LOOP;
 DELETE FROM vuihoc."GIAI_TRINH_CONG_DAY" d
 USING vuihoc."CONG_DAY_BUOI_HOC" c,vuihoc."BUOI_HOC" b
 WHERE d.macong=c.madinhdanh AND b.madinhdanh=c.mabuoi
 AND b.ngayhoc>=date '2026-10-01' AND b.ngayhoc<date '2026-11-01'
 AND c.magiaovien ~ '^DEMO-GV-[0-9]{3}$' AND d.madinhdanh ~ '^DEMO-GT-[1-9]$'
 AND d.noidung='Đề nghị kiểm tra nhật ký kết nối và đối soát công buổi học. Đây là tình huống demo số '||substring(d.madinhdanh from '[1-9]$');
END $repair_prefix$;
