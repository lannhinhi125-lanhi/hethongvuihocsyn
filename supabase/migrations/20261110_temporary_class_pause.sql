-- Apply after 20261109_reenrollment_class_duration.sql.
BEGIN;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS tamdunglich boolean NOT NULL DEFAULT false;
ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN IF NOT EXISTS tamhoandolop boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION vuihoc.tam_nghi_lich_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.trangthai IN ('TAM_DUNG','DA_KET_THUC') THEN
  UPDATE vuihoc."BUOI_HOC" SET tamhoandolop=false WHERE malop=NEW.madinhdanh AND tamhoandolop;
 ELSIF NEW.tamdunglich AND NOT OLD.tamdunglich THEN
  UPDATE vuihoc."BUOI_HOC" SET trangthai='NGHI_HOC',tamhoandolop=true
   WHERE malop=NEW.madinhdanh AND vaolopluc IS NULL AND ketthucluc IS NULL
   AND trangthai IN ('CHUA_DIEN_RA','CHUA_HOC')
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
 ELSIF OLD.tamdunglich AND NOT NEW.tamdunglich THEN
  UPDATE vuihoc."BUOI_HOC" SET trangthai='CHUA_DIEN_RA',tamhoandolop=false
   WHERE malop=NEW.madinhdanh AND tamhoandolop AND trangthai='NGHI_HOC'
   AND vaolopluc IS NULL AND ketthucluc IS NULL
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tam_nghi_lich_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER tam_nghi_lich_lop AFTER UPDATE OF tamdunglich,trangthai ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.tam_nghi_lich_lop();
REVOKE ALL ON FUNCTION vuihoc.tam_nghi_lich_lop() FROM PUBLIC,anon,authenticated;

DO $$
DECLARE conf jsonb; f text;
BEGIN
 conf:=vuihoc.business_config();
 IF NOT (conf->'classes'->'columns' ? 'tamdunglich') THEN
  conf:=jsonb_set(conf,'{classes,columns}',conf->'classes'->'columns'||'"tamdunglich"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
 f:=pg_get_functiondef('vuihoc.dong_bo_ca_theo_lich(date,date)'::regprocedure);
 IF strpos(f,'NOT l.tamdunglich')=0 THEN
  IF strpos(f,'WHERE l.magiaovien IS NOT NULL')=0 THEN RAISE EXCEPTION 'Không tìm thấy điều kiện sinh lịch lớp'; END IF;
  f:=replace(f,'WHERE l.magiaovien IS NOT NULL','WHERE NOT l.tamdunglich AND l.magiaovien IS NOT NULL');
  EXECUTE f;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
