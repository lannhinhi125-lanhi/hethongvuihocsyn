-- Apply after 20261128_normalize_incident_names.sql.
-- Display codes and precise update times are server-owned, never primary keys.
BEGIN;
ALTER TABLE vuihoc."SU_CO_BUOI_HOC"
 ADD COLUMN IF NOT EXISTS sophieusuco bigint GENERATED ALWAYS AS IDENTITY,
 ADD COLUMN IF NOT EXISTS maphieusuco text GENERATED ALWAYS AS
  ('SC-'||lpad(sophieusuco::text,greatest(6,length(sophieusuco::text)),'0')) STORED,
 ADD COLUMN IF NOT EXISTS capnhatluc timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS su_co_so_phieu_uidx ON vuihoc."SU_CO_BUOI_HOC"(sophieusuco);
CREATE UNIQUE INDEX IF NOT EXISTS su_co_ma_phieu_uidx ON vuihoc."SU_CO_BUOI_HOC"(maphieusuco);
ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ALTER COLUMN capnhatluc SET DEFAULT clock_timestamp();

-- Old records retain their known dates; do not update rows or rerun payroll.
CREATE OR REPLACE VIEW vuihoc."V_SU_CO_BUOI_HOC" WITH(security_invoker=true) AS
 SELECT s.madinhdanh,s.mabuoi,s.manhomsuco,s.masuco,l.ten AS tensuco,s.hesocongapdung,s.muckhancap,
 s.noidung,s.trangthai,s.manguoibao,s.manguoixuly,s.baoluc,s.xulyluc,s.ghichuxuly,s.ngaytao,s.ngaycapnhat,s.dotamdunglop,
 s.maphieusuco,coalesce(s.capnhatluc,s.ngaycapnhat::timestamp AT TIME ZONE 'Asia/Bangkok',
 s.xulyluc::timestamp AT TIME ZONE 'Asia/Bangkok',s.baoluc::timestamp AT TIME ZONE 'Asia/Bangkok') AS capnhatluc
 FROM vuihoc."SU_CO_BUOI_HOC" s JOIN vuihoc."LOAI_SU_CO" l ON (l.manhom,l.ma)=(s.manhomsuco,s.masuco);

CREATE OR REPLACE FUNCTION vuihoc.cap_nhat_thoi_diem_su_co()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.capnhatluc:=clock_timestamp();
 ELSIF (to_jsonb(NEW)-ARRAY['capnhatluc','ngaycapnhat','maphieusuco','sophieusuco']) IS DISTINCT FROM
  (to_jsonb(OLD)-ARRAY['capnhatluc','ngaycapnhat','maphieusuco','sophieusuco']) THEN NEW.capnhatluc:=clock_timestamp();
 ELSE NEW.capnhatluc:=OLD.capnhatluc; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cap_nhat_thoi_diem_su_co ON vuihoc."SU_CO_BUOI_HOC";
CREATE TRIGGER cap_nhat_thoi_diem_su_co BEFORE INSERT OR UPDATE ON vuihoc."SU_CO_BUOI_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.cap_nhat_thoi_diem_su_co();
REVOKE ALL ON FUNCTION vuihoc.cap_nhat_thoi_diem_su_co() FROM PUBLIC,anon,authenticated;

-- Extend only read fields; authorization and writable columns are unchanged.
DO $read_projection$
DECLARE original text;
BEGIN
 original:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF strpos(original,'maphieusuco')=0 THEN
  IF strpos(original,$pattern$e.key IN (SELECT jsonb_array_elements_text($1))$pattern$)=0
   OR strpos(original,$pattern$cfg.c->'columns',cfg.dataset$pattern$)=0 THEN
   RAISE EXCEPTION 'Không nhận diện được RPC đọc dữ liệu. Hãy áp dụng migration quan hệ hiện tại trước.';
  END IF;
  original:=replace(original,$pattern$e.key IN (SELECT jsonb_array_elements_text($1))$pattern$,
   $pattern$(e.key IN (SELECT jsonb_array_elements_text($1)) OR (e.key IN (''maphieusuco'',''capnhatluc'') AND $2=''lesson_incidents''))$pattern$);
  EXECUTE original;
 END IF;
END $read_projection$;
COMMIT;
