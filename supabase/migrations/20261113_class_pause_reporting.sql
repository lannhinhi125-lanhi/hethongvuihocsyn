-- Apply after 20261112_class_pause_reason_catalog.sql.
BEGIN;
ALTER TABLE vuihoc."LOP_HOC" ADD COLUMN IF NOT EXISTS batdautamdung timestamptz;
ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN IF NOT EXISTS lydotamdung text;
ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN IF NOT EXISTS ghichutamdung text;
ALTER TABLE vuihoc."BUOI_HOC" ADD COLUMN IF NOT EXISTS batdautamdung timestamptz;

-- Only existing marked pauses can be attributed safely. Never infer a teacher incident.
UPDATE vuihoc."LOP_HOC" SET batdautamdung=statement_timestamp()
 WHERE tamdunglich AND batdautamdung IS NULL;
UPDATE vuihoc."BUOI_HOC" b SET lydotamdung=l.lydotamdung,ghichutamdung=l.ghichutamdung,
 batdautamdung=l.batdautamdung
 FROM vuihoc."LOP_HOC" l WHERE b.malop=l.madinhdanh AND b.tamhoandolop
 AND b.batdautamdung IS NULL AND l.tamdunglich;

CREATE OR REPLACE FUNCTION vuihoc.dat_dot_tam_dung_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.tamdunglich AND (TG_OP='INSERT' OR NOT OLD.tamdunglich) THEN
  NEW.batdautamdung:=statement_timestamp();
 ELSIF NOT NEW.tamdunglich THEN NEW.batdautamdung:=NULL;
 ELSE NEW.batdautamdung:=OLD.batdautamdung;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dat_dot_tam_dung_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER dat_dot_tam_dung_lop BEFORE INSERT OR UPDATE ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.dat_dot_tam_dung_lop();

CREATE OR REPLACE FUNCTION vuihoc.tam_nghi_lich_lop() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.trangthai IN ('TAM_DUNG','DA_KET_THUC') THEN
  -- Keep past pauses; future cancelled sessions belong to the stopped class.
  UPDATE vuihoc."BUOI_HOC" SET tamhoandolop=false,lydotamdung=NULL,ghichutamdung=NULL,batdautamdung=NULL
   WHERE malop=NEW.madinhdanh AND tamhoandolop
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
 ELSIF NEW.tamdunglich AND NOT OLD.tamdunglich THEN
  UPDATE vuihoc."BUOI_HOC" SET trangthai='NGHI_HOC',tamhoandolop=true,
   lydotamdung=NEW.lydotamdung,ghichutamdung=NEW.ghichutamdung,batdautamdung=NEW.batdautamdung
   WHERE malop=NEW.madinhdanh AND vaolopluc IS NULL AND ketthucluc IS NULL
   AND trangthai IN ('CHUA_DIEN_RA','CHUA_HOC')
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
 ELSIF OLD.tamdunglich AND NOT NEW.tamdunglich THEN
  UPDATE vuihoc."BUOI_HOC" SET trangthai='CHUA_DIEN_RA',tamhoandolop=false,
   lydotamdung=NULL,ghichutamdung=NULL,batdautamdung=NULL
   WHERE malop=NEW.madinhdanh AND tamhoandolop AND trangthai='NGHI_HOC'
   AND vaolopluc IS NULL AND ketthucluc IS NULL
   AND (ngayhoc+batdau) AT TIME ZONE 'Asia/Bangkok'>=statement_timestamp();
 ELSIF NEW.tamdunglich AND (NEW.lydotamdung IS DISTINCT FROM OLD.lydotamdung OR NEW.ghichutamdung IS DISTINCT FROM OLD.ghichutamdung) THEN
  -- Correct only this pause period, preserving reasons from earlier pause periods.
  UPDATE vuihoc."BUOI_HOC" SET lydotamdung=NEW.lydotamdung,ghichutamdung=NEW.ghichutamdung
   WHERE malop=NEW.madinhdanh AND tamhoandolop AND trangthai='NGHI_HOC'
   AND batdautamdung=NEW.batdautamdung;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tam_nghi_lich_lop ON vuihoc."LOP_HOC";
CREATE TRIGGER tam_nghi_lich_lop AFTER UPDATE OF tamdunglich,trangthai,lydotamdung,ghichutamdung ON vuihoc."LOP_HOC"
 FOR EACH ROW EXECUTE FUNCTION vuihoc.tam_nghi_lich_lop();
REVOKE ALL ON FUNCTION vuihoc.dat_dot_tam_dung_lop(),vuihoc.tam_nghi_lich_lop() FROM PUBLIC,anon,authenticated;
-- The business RPC projects only configured columns, even when the table has more.
DO $$
DECLARE conf jsonb; column_name text;
BEGIN
 conf:=vuihoc.business_config();
 FOREACH column_name IN ARRAY ARRAY['tamhoandolop','lydotamdung','ghichutamdung'] LOOP
  IF NOT (conf->'dated_lessons'->'columns' ? column_name) THEN
   conf:=jsonb_set(conf,'{dated_lessons,columns}',conf->'dated_lessons'->'columns'||jsonb_build_array(column_name));
  END IF;
 END LOOP;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
END $$;
-- Teachers can read this shared label catalog; catalog editing permissions stay unchanged.
DO $patch$
DECLARE f text; old_clause text := $old$WHEN 'custom_catalogs' THEN 'false'$old$;
 new_clause text := $new$WHEN 'custom_catalogs' THEN 'madanhmuc=''CLASS_PAUSE_REASON'''$new$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_business_data(text)'::regprocedure);
 IF strpos(f,old_clause)>0 THEN
  EXECUTE replace(f,old_clause,new_clause);
 ELSIF strpos(f,new_clause)=0 THEN
  RAISE EXCEPTION 'Không tìm thấy điều kiện đọc danh mục cho giáo viên; cần kiểm tra phiên bản vuihoc_business_data';
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
