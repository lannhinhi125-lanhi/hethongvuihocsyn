-- Run the entire file as postgres in Supabase SQL Editor.
-- Early checkout is taught. Standard work waits for valid operations approval
-- OR the scheduled end; feedback and incident rules still apply.
-- No fabricated attendance, feedback, approvals or coefficients; no demo reset.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION vuihoc.trang_thai_ca_theo_du_lieu(p_ngay date,p_batdau time,p_ketthuc time,
 p_vaolop timestamptz,p_ralop timestamptz,p_trangthai text,p_now timestamptz DEFAULT statement_timestamp())
RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN p_trangthai IN ('HUY','NGHI_HOC') THEN 'NGHI_HOC'
  WHEN p_trangthai IN ('DA_HOC_CU','DAY_THAY_CU') THEN p_trangthai
  WHEN p_now<(p_ngay+p_batdau) AT TIME ZONE 'Asia/Bangkok' THEN 'CHUA_DIEN_RA'
  WHEN p_vaolop IS NULL THEN 'CHUA_HOC'
  WHEN p_ralop IS NOT NULL THEN 'DA_HOC'
  WHEN p_now<vuihoc.gio_ket_thuc_ca(p_ngay,p_batdau,p_ketthuc) THEN 'DANG_HOC'
  ELSE 'DA_HOC' END
$$;

CREATE OR REPLACE FUNCTION vuihoc.duyet_ket_thuc_som_hop_le(p_buoi text)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE b vuihoc."BUOI_HOC"; approval jsonb; scheduled_end timestamptz;
BEGIN
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=p_buoi;
 approval:=to_jsonb(b)->'duyetgiamsat';
 SELECT vuihoc.gio_ket_thuc_ca(b.ngayhoc,k.giobatdau,k.gioketthuc) INTO scheduled_end
 FROM vuihoc."KHUNG_GIO" k WHERE k.madinhdanh=b.makhunggio;
 RETURN coalesce(nullif(approval->>'by','') IS NOT NULL
  AND nullif(approval->>'at','')::timestamptz<=statement_timestamp()
  AND scheduled_end-b.ketthucluc>interval '5 minutes'
  AND approval->>'warning'='Chưa hoàn tất · Kết thúc sớm '
   ||ceil(extract(epoch FROM (scheduled_end-b.ketthucluc))/60)::text||' phút'
  AND (approval->>'checkinAt')::timestamptz=b.vaolopluc
  AND (approval->>'checkoutAt')::timestamptz=b.ketthucluc,false);
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION vuihoc.ca_du_dieu_kien_ghi_cong(p_buoi text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(b.trangthai='DA_HOC' AND b.vaolopluc IS NOT NULL AND b.ketthucluc IS NOT NULL
  AND b.ketthucluc>=b.vaolopluc AND b.ketthucluc<=statement_timestamp()
  AND (p.value->>'total')::integer>0 AND p.value->>'state'='DA_DU'
  AND (statement_timestamp()>=vuihoc.gio_ket_thuc_ca(b.ngayhoc,k.giobatdau,k.gioketthuc)
   OR vuihoc.duyet_ket_thuc_som_hop_le(b.madinhdanh)),false)
 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
 CROSS JOIN LATERAL (SELECT vuihoc.tien_do_nhan_xet_ca(b.madinhdanh) value) p
 WHERE b.madinhdanh=p_buoi
$$;

-- Approval must actually retry work generation, without changing source clocks.
CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_sau_duyet_som()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.duyetgiamsat IS DISTINCT FROM OLD.duyetgiamsat THEN
  PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(NEW.madinhdanh);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ghi_cong_sau_duyet_som ON vuihoc."BUOI_HOC";
CREATE TRIGGER ghi_cong_sau_duyet_som AFTER UPDATE OF duyetgiamsat ON vuihoc."BUOI_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_cong_sau_duyet_som();

-- Passing wall-clock time does not fire a row trigger. Extend the existing
-- minute lifecycle job to retry newly eligible work even if status stays DA_HOC.
DO $$ BEGIN
 IF to_regprocedure('vuihoc.dong_bo_ca_truoc_cong_cho_duyet()') IS NULL THEN
  ALTER FUNCTION vuihoc.dong_bo_trang_thai_ca() RENAME TO dong_bo_ca_truoc_cong_cho_duyet;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_trang_thai_ca()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer; lesson record;
BEGIN
 n:=vuihoc.dong_bo_ca_truoc_cong_cho_duyet();
 FOR lesson IN SELECT b.madinhdanh FROM vuihoc."BUOI_HOC" b
 WHERE b.ngayhoc BETWEEN (statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date-1
  AND (statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date
  AND b.trangthai='DA_HOC' AND b.ketthucluc IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
  AND NOT EXISTS(SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh
   AND c.magiaovien=coalesce(b.magiaoviendaythay,b.magiaovienchinh))
  AND vuihoc.ca_du_dieu_kien_ghi_cong(b.madinhdanh)
 ORDER BY b.ngayhoc,b.madinhdanh LOOP
  PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(lesson.madinhdanh);
 END LOOP;
 RETURN n;
END $$;

-- Retry only the reported lesson on installation; do not rewrite existing work.
DO $repair_lesson$
DECLARE lesson_id text; lesson_date date; period text; b record;
BEGIN
 SELECT madinhdanh,ngayhoc INTO lesson_id,lesson_date FROM vuihoc."BUOI_HOC"
 WHERE mabuoihienthi='BH-184684';
 IF NOT FOUND THEN RAISE NOTICE 'Không tìm thấy BH-184684. Đã sửa quy tắc cho các ca tiếp theo.'; RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 period:=to_char(lesson_date,'YYYY-MM');
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||period,0));
 PERFORM 1 FROM vuihoc."BANG_CONG_THANG" WHERE kycong=period AND dakhoa FOR UPDATE;
 IF FOUND THEN RAISE NOTICE 'Kỳ % đã khóa: giữ nguyên ca và công.',period; RETURN; END IF;
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=lesson_id FOR UPDATE;
 IF b.vaolopluc IS NULL OR b.ketthucluc IS NULL OR b.ketthucluc<b.vaolopluc
  OR b.ketthucluc>statement_timestamp() OR b.trangthai IN ('HUY','NGHI_HOC','DA_HOC_CU','DAY_THAY_CU') THEN
  RAISE NOTICE 'Ca chưa đủ dữ liệu giờ vào/ra hợp lệ hoặc không thuộc trạng thái cần sửa. Giữ nguyên.'; RETURN;
 END IF;
 UPDATE vuihoc."BUOI_HOC" SET trangthai='DA_HOC' WHERE madinhdanh=lesson_id AND trangthai IS DISTINCT FROM 'DA_HOC';
 -- Explicit retry is needed: older completion triggers skip status-only updates.
 PERFORM vuihoc.ghi_cong_neu_du_nhan_xet(lesson_id);
END $repair_lesson$;

DO $$
DECLARE trusted_owner name; signature text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc
 WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
  RAISE EXCEPTION 'Không xác định được owner quản trị của RPC đăng nhập.';
 END IF;
 FOREACH signature IN ARRAY ARRAY['vuihoc.duyet_ket_thuc_som_hop_le(text)',
  'vuihoc.ca_du_dieu_kien_ghi_cong(text)','vuihoc.ghi_cong_sau_duyet_som()',
  'vuihoc.dong_bo_trang_thai_ca()','vuihoc.dong_bo_ca_truoc_cong_cho_duyet()'] LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',signature,trusted_owner);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',signature);
 END LOOP;
END $$;

-- Result: work may remain empty if feedback/incidents still block eligibility.
SELECT b.mabuoihienthi,b.trangthai,b.vaolopluc,b.ketthucluc,
 vuihoc.tien_do_nhan_xet_ca(b.madinhdanh) AS tien_do_nhan_xet,
 coalesce((SELECT jsonb_agg(jsonb_build_object('giao_vien',c.magiaovien,'he_so',c.hesocong,'loai',c.loaicong))
  FROM vuihoc."CONG_DAY_BUOI_HOC" c WHERE c.mabuoi=b.madinhdanh),'[]'::jsonb) AS cong_da_ghi
FROM vuihoc."BUOI_HOC" b WHERE b.mabuoihienthi='BH-184684';
COMMIT;
