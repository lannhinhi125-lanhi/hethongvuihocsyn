-- Apply after 20261110_temporary_class_pause.sql; includes the 20261111 column/config.
BEGIN;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS lydotamdung text;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS ghichutamdung text;
INSERT INTO vuihoc."DANH_MUC_BO_SUNG"(madinhdanh,madanhmuc,tendanhmuc,mota)
VALUES('CLASS-PAUSE-REASON','CLASS_PAUSE_REASON','Lý do tạm dừng lớp','Lý do dùng khi tạm dừng lịch lớp, quản lý trong danh mục dùng chung') ON CONFLICT DO NOTHING;
INSERT INTO vuihoc."MUC_DANH_MUC"(madanhmuc,madinhdanh,ma,ten,mota,danghoatdong,thutu)
SELECT c.madinhdanh,v.id,v.code,v.name,'',true,v.position
FROM vuihoc."DANH_MUC_BO_SUNG" c CROSS JOIN (VALUES
 ('PAUSE-TEACHER','TEACHER_LEAVE','Giáo viên xin nghỉ có báo trước',1),
 ('PAUSE-HOLIDAY','HOLIDAY','Nghỉ lễ / Tết',2),
 ('PAUSE-SCHOOL','SCHOOL_NOTICE','Nghỉ theo thông báo nhà trường',3),
 ('PAUSE-OTHER','OTHER','Lý do khác',4)
) v(id,code,name,position) WHERE c.madanhmuc='CLASS_PAUSE_REASON' ON CONFLICT DO NOTHING;
-- Convert prior text values when they match; retain unrecognized reasons as notes.
UPDATE vuihoc."LOP_HOC" l SET lydotamdung=m.madinhdanh
FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
WHERE c.madanhmuc='CLASS_PAUSE_REASON' AND l.lydotamdung=m.ten;
UPDATE vuihoc."LOP_HOC" l SET ghichutamdung=coalesce(l.ghichutamdung,l.lydotamdung),lydotamdung=NULL
WHERE l.lydotamdung IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
 WHERE c.madanhmuc='CLASS_PAUSE_REASON' AND m.madinhdanh=l.lydotamdung);
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ly_do_tam_dung() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.lydotamdung IS NOT NULL AND (TG_OP='INSERT' OR NEW.lydotamdung IS DISTINCT FROM OLD.lydotamdung) THEN
  IF NOT EXISTS(SELECT 1 FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
   WHERE c.madanhmuc='CLASS_PAUSE_REASON' AND m.madinhdanh=NEW.lydotamdung AND m.danghoatdong) THEN
   RAISE EXCEPTION 'Lý do tạm dừng không thuộc danh mục đang áp dụng';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kiem_tra_ly_do_tam_dung ON vuihoc."LOP_HOC";
CREATE TRIGGER kiem_tra_ly_do_tam_dung BEFORE INSERT OR UPDATE OF lydotamdung ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ly_do_tam_dung();
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_ly_do_tam_dung() FROM PUBLIC,anon,authenticated;
DO $$
DECLARE conf jsonb; column_name text; changed boolean := false;
BEGIN
 conf:=vuihoc.business_config();
 FOREACH column_name IN ARRAY ARRAY['lydotamdung','ghichutamdung'] LOOP
  IF NOT (conf->'classes'->'columns' ? column_name) THEN
   conf:=jsonb_set(conf,'{classes,columns}',conf->'classes'->'columns'||jsonb_build_array(column_name));
   changed:=true;
  END IF;
 END LOOP;
 IF changed THEN
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
