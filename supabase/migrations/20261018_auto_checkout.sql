-- Run after 20261017_session_workflow.sql; also safe on later migrations.
-- Rerunnable. Keep historical payroll and existing manual checkouts unchanged.
BEGIN;
LOCK TABLE vuihoc."BUOI_HOC", vuihoc."NHAN_XET_BUOI_HOC" IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION vuihoc.gio_ket_thuc_ca(p_ngay date,p_batdau time,p_ketthuc time)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT ((p_ngay+CASE WHEN p_ketthuc<p_batdau THEN 1 ELSE 0 END)+p_ketthuc)
   AT TIME ZONE 'Asia/Bangkok'
$$;

CREATE OR REPLACE FUNCTION vuihoc.trang_thai_ca_theo_du_lieu(p_ngay date,p_batdau time,p_ketthuc time,
 p_vaolop timestamptz,p_ralop timestamptz,p_trangthai text,p_now timestamptz DEFAULT statement_timestamp())
RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN p_trangthai IN ('HUY','NGHI_HOC') THEN 'NGHI_HOC'
 WHEN p_trangthai IN ('DA_HOC_CU','DAY_THAY_CU') THEN p_trangthai
 WHEN p_now<(p_ngay+p_batdau) AT TIME ZONE 'Asia/Bangkok' THEN 'CHUA_DIEN_RA'
 WHEN p_vaolop IS NULL THEN 'CHUA_HOC'
 WHEN p_ralop IS NOT NULL THEN
   CASE WHEN p_ralop<vuihoc.gio_ket_thuc_ca(p_ngay,p_batdau,p_ketthuc)-interval '5 minutes'
     THEN 'CHUA_HOAN_TAT' ELSE 'DA_HOC' END
 WHEN p_now<vuihoc.gio_ket_thuc_ca(p_ngay,p_batdau,p_ketthuc) THEN 'DANG_HOC'
 ELSE 'CHUA_HOAN_TAT' END
$$;

-- Blank rows still capture the roster at check-in; text requires saved checkout.
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_nhan_xet_sau_checkout() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE b vuihoc."BUOI_HOC";
BEGIN
 IF btrim(coalesce(NEW.noidung,''))='' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (NEW.mabuoi,NEW.mahocsinh,NEW.noidung)
   IS NOT DISTINCT FROM (OLD.mabuoi,OLD.mahocsinh,OLD.noidung) THEN RETURN NEW; END IF;
 SELECT * INTO b FROM vuihoc."BUOI_HOC" WHERE madinhdanh=NEW.mabuoi FOR UPDATE;
 IF b.vaolopluc IS NULL OR b.ketthucluc IS NULL OR b.ketthucluc<b.vaolopluc
   OR b.trangthai IN ('HUY','NGHI_HOC') THEN
   RAISE EXCEPTION 'Chỉ được nhận xét sau khi check-in và checkout đã lưu.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kiem_tra_nhan_xet_sau_checkout ON vuihoc."NHAN_XET_BUOI_HOC";
CREATE TRIGGER kiem_tra_nhan_xet_sau_checkout BEFORE INSERT OR UPDATE
ON vuihoc."NHAN_XET_BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_nhan_xet_sau_checkout();

CREATE OR REPLACE FUNCTION vuihoc.tu_dong_checkout(p_now timestamptz DEFAULT statement_timestamp())
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b record; n integer:=0; ky text;
BEGIN
 IF p_now IS NULL THEN RAISE EXCEPTION 'Thời điểm checkout không hợp lệ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 FOR b IN SELECT h.madinhdanh,h.ngayhoc,
   vuihoc.gio_ket_thuc_ca(h.ngayhoc,h.batdau,h.ketthuc) AS gio_ket_thuc
 FROM vuihoc."BUOI_HOC" h
 WHERE h.ngayhoc BETWEEN (p_now AT TIME ZONE 'Asia/Bangkok')::date-1
   AND (p_now AT TIME ZONE 'Asia/Bangkok')::date
   AND h.vaolopluc IS NOT NULL AND h.ketthucluc IS NULL
   AND h.trangthai NOT IN ('HUY','NGHI_HOC','DA_HOC_CU','DAY_THAY_CU')
   AND vuihoc.gio_ket_thuc_ca(h.ngayhoc,h.batdau,h.ketthuc)<=p_now
   AND h.vaolopluc<=vuihoc.gio_ket_thuc_ca(h.ngayhoc,h.batdau,h.ketthuc)
 ORDER BY h.ngayhoc,h.madinhdanh FOR UPDATE OF h SKIP LOCKED
 LOOP
   ky:=to_char(b.ngayhoc,'YYYY-MM');
   -- Same lock as payroll mutations: a period cannot close during checkout.
   PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
   PERFORM 1 FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky AND dakhoa FOR UPDATE;
   IF FOUND THEN CONTINUE; END IF;
   UPDATE vuihoc."BUOI_HOC" SET ketthucluc=b.gio_ket_thuc,manguoiketthuc=NULL
    WHERE madinhdanh=b.madinhdanh AND ketthucluc IS NULL;
   n:=n+1;
 END LOOP;
 RETURN n;
END $$;

-- Reuse the existing minute job; reading a screen never needs to write checkout.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_trang_thai_ca() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer; closed integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-lifecycle-clock',0));
 PERFORM vuihoc.dong_bo_ca_theo_lich();
 closed:=vuihoc.tu_dong_checkout();
 UPDATE vuihoc."BUOI_HOC" b
 SET trangthai=vuihoc.trang_thai_ca_theo_du_lieu(b.ngayhoc,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,b.trangthai)
 WHERE b.ngayhoc >= (statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date-1
 AND b.trangthai NOT IN ('HUY','NGHI_HOC','DA_HOC_CU','DAY_THAY_CU')
 AND NOT EXISTS(SELECT 1 FROM vuihoc."BANG_CONG_THANG" p WHERE p.kycong=to_char(b.ngayhoc,'YYYY-MM') AND p.dakhoa)
 AND b.trangthai IS DISTINCT FROM vuihoc.trang_thai_ca_theo_du_lieu(b.ngayhoc,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,b.trangthai);
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n+closed;
END $$;

DO $security$
DECLARE signature text; trusted_owner name;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc
 WHERE oid='vuihoc.dong_bo_ca_theo_lich(date,date)'::regprocedure;
 IF trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN
   RAISE EXCEPTION 'Owner quản trị chưa hợp lệ';
 END IF;
 FOREACH signature IN ARRAY ARRAY[
   'vuihoc.gio_ket_thuc_ca(date,time,time)',
   'vuihoc.trang_thai_ca_theo_du_lieu(date,time,time,timestamptz,timestamptz,text,timestamptz)',
   'vuihoc.kiem_tra_nhan_xet_sau_checkout()',
   'vuihoc.tu_dong_checkout(timestamptz)',
   'vuihoc.dong_bo_trang_thai_ca()'
 ] LOOP
   EXECUTE format('ALTER FUNCTION %s OWNER TO %I',signature,trusted_owner);
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',signature);
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
   CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
   PERFORM cron.schedule('vuihoc-session-lifecycle','* * * * *','SELECT vuihoc.dong_bo_trang_thai_ca();');
 ELSE
   RAISE NOTICE 'Cần bật Supabase Cron để tự checkout mỗi phút.';
 END IF;
END $security$;

NOTIFY pgrst,'reload schema';
COMMIT;
