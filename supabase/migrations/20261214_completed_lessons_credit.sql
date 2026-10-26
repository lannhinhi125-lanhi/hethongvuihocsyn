-- Đã vào dạy + đã checkout/hết giờ => Đã học.
-- Checkout sớm/thiếu checkout là cảnh báo riêng, không phải lý do tự trừ công.
-- Ghi công vẫn cần checkout đã lưu và đủ nhận xét; hệ số lấy từ sự cố nếu có,
-- mặc định 1 nếu không có sự cố. Giữ nguyên công đã ghi/điều chỉnh và kỳ đã khóa.
-- Chạy TOÀN BỘ file này. Không chạy lại reset demo để áp dụng thay đổi.
DO $completed_lessons_credit$
DECLARE lesson record; source_table text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 LOCK TABLE vuihoc."BUOI_HOC",vuihoc."BANG_CONG_THANG",vuihoc."CONG_DAY_BUOI_HOC",
  vuihoc."NHAN_XET_BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regprocedure('vuihoc.ghi_cong_neu_du_nhan_xet(text)') IS NULL
  OR to_regprocedure('vuihoc.gio_ket_thuc_ca(date,time without time zone,time without time zone)') IS NULL THEN
  RAISE EXCEPTION 'Cần cài luồng ca học, nhận xét và tự checkout trước khi áp dụng.';
 END IF;

 CREATE OR REPLACE FUNCTION vuihoc.trang_thai_ca_theo_du_lieu(p_ngay date,p_batdau time,p_ketthuc time,
  p_vaolop timestamptz,p_ralop timestamptz,p_trangthai text,p_now timestamptz DEFAULT statement_timestamp())
 RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog AS $status$
  SELECT CASE WHEN p_trangthai IN ('HUY','NGHI_HOC') THEN 'NGHI_HOC'
   WHEN p_trangthai IN ('DA_HOC_CU','DAY_THAY_CU') THEN p_trangthai
   WHEN p_now<(p_ngay+p_batdau) AT TIME ZONE 'Asia/Bangkok' THEN 'CHUA_DIEN_RA'
   WHEN p_vaolop IS NULL THEN 'CHUA_HOC'
   WHEN p_ralop IS NOT NULL THEN 'DA_HOC'
   WHEN p_now<vuihoc.gio_ket_thuc_ca(p_ngay,p_batdau,p_ketthuc) THEN 'DANG_HOC'
   ELSE 'DA_HOC' END
 $status$;
 -- Strengthen timestamp validity while retaining the existing feedback gate.
 source_table:=CASE WHEN to_regclass('vuihoc."V_BUOI_HOC"') IS NOT NULL THEN 'V_BUOI_HOC' ELSE 'BUOI_HOC' END;
 EXECUTE format($function$
 CREATE OR REPLACE FUNCTION vuihoc.ca_du_dieu_kien_ghi_cong(p_buoi text) RETURNS boolean
 LANGUAGE sql STABLE SET search_path=pg_catalog AS $eligible$
  SELECT coalesce(b.trangthai='DA_HOC' AND b.vaolopluc IS NOT NULL AND b.ketthucluc IS NOT NULL
   AND b.ketthucluc>=b.vaolopluc AND (p.value->>'total')::integer>0 AND p.value->>'state'='DA_DU',false)
  FROM vuihoc.%I b CROSS JOIN LATERAL (SELECT vuihoc.tien_do_nhan_xet_ca(b.madinhdanh) value) p
  WHERE b.madinhdanh=p_buoi
 $eligible$;
 $function$,source_table);

 -- Backfill only open periods. Never invent checkout, feedback or attendance.
 FOR lesson IN EXECUTE format($rows$
  SELECT b.madinhdanh FROM vuihoc.%I b
  WHERE b.vaolopluc IS NOT NULL AND b.trangthai NOT IN ('HUY','NGHI_HOC','DA_HOC_CU','DAY_THAY_CU')
   AND (b.ketthucluc IS NOT NULL OR statement_timestamp()>=vuihoc.gio_ket_thuc_ca(b.ngayhoc,b.batdau,b.ketthuc))
   AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
  ORDER BY b.ngayhoc,b.madinhdanh
 $rows$,source_table) LOOP
  -- The existing BEFORE trigger derives the new state from source clocks.
  UPDATE vuihoc."BUOI_HOC" SET trangthai='DA_HOC' WHERE madinhdanh=lesson.madinhdanh;
  PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(lesson.madinhdanh);
 END LOOP;
 REVOKE ALL ON FUNCTION vuihoc.trang_thai_ca_theo_du_lieu(date,time,time,timestamptz,timestamptz,text,timestamptz),
  vuihoc.ca_du_dieu_kien_ghi_cong(text) FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $completed_lessons_credit$;
