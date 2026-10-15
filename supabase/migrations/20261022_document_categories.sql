-- Run after 20261021. Document types are relational rows, never a JSON/list column.
BEGIN;
LOCK TABLE vuihoc."TAI_LIEU_QUY_TRINH" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS vuihoc."LOAI_TAI_LIEU" (
 madinhdanh text PRIMARY KEY CHECK(btrim(madinhdanh)<>''),
 tenloai text NOT NULL UNIQUE CHECK(btrim(tenloai)<>''),
 mota text NOT NULL DEFAULT '', danghoatdong boolean NOT NULL DEFAULT true
);
DO $convert$
DECLARE stamp_mode "char";
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='TAI_LIEU_QUY_TRINH' AND column_name='phanloai') THEN
  IF EXISTS(SELECT 1 FROM vuihoc."TAI_LIEU_QUY_TRINH" WHERE btrim(phanloai)='') THEN
   RAISE EXCEPTION 'Có tài liệu chưa có tên phân loại; cần bổ sung trước khi chuyển danh mục';
  END IF;
  INSERT INTO vuihoc."LOAI_TAI_LIEU"(madinhdanh,tenloai)
   SELECT 'LT-'||lpad(row_number() OVER(ORDER BY label)::text,3,'0'),label FROM
    (SELECT DISTINCT phanloai label FROM vuihoc."TAI_LIEU_QUY_TRINH") labels
   ON CONFLICT(tenloai) DO NOTHING;
  SELECT tgenabled INTO stamp_mode FROM pg_trigger WHERE tgrelid='vuihoc."TAI_LIEU_QUY_TRINH"'::regclass AND tgname='set_updated_at';
  IF stamp_mode IN ('O','A','R') THEN ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" DISABLE TRIGGER set_updated_at; END IF;
  UPDATE vuihoc."TAI_LIEU_QUY_TRINH" d SET phanloai=c.madinhdanh FROM vuihoc."LOAI_TAI_LIEU" c WHERE c.tenloai=d.phanloai;
  IF stamp_mode='O' THEN ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" ENABLE TRIGGER set_updated_at;
  ELSIF stamp_mode='A' THEN ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" ENABLE ALWAYS TRIGGER set_updated_at;
  ELSIF stamp_mode='R' THEN ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" ENABLE REPLICA TRIGGER set_updated_at; END IF;
  ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" RENAME COLUMN phanloai TO maloaitailieu;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='vuihoc."TAI_LIEU_QUY_TRINH"'::regclass AND conname='tai_lieu_loai_fk') THEN
  ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH" ADD CONSTRAINT tai_lieu_loai_fk FOREIGN KEY(maloaitailieu)
   REFERENCES vuihoc."LOAI_TAI_LIEU"(madinhdanh) ON DELETE RESTRICT ON UPDATE RESTRICT;
 END IF;
END $convert$;
CREATE INDEX IF NOT EXISTS tai_lieu_loai_idx ON vuihoc."TAI_LIEU_QUY_TRINH"(maloaitailieu);

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_loai_tai_lieu() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.maloaitailieu IS DISTINCT FROM OLD.maloaitailieu THEN
  IF NOT EXISTS(SELECT 1 FROM vuihoc."LOAI_TAI_LIEU" WHERE madinhdanh=NEW.maloaitailieu AND danghoatdong)
   AND NOT EXISTS(SELECT 1 FROM vuihoc."TAI_LIEU_QUY_TRINH" olddoc WHERE olddoc.madinhdanh=NEW.madinhdanh AND olddoc.maloaitailieu=NEW.maloaitailieu) THEN
   RAISE EXCEPTION 'Chọn loại tài liệu đang hoạt động trong danh mục';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kiem_tra_loai_tai_lieu ON vuihoc."TAI_LIEU_QUY_TRINH";
CREATE TRIGGER kiem_tra_loai_tai_lieu BEFORE INSERT OR UPDATE OF maloaitailieu ON vuihoc."TAI_LIEU_QUY_TRINH"
FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_loai_tai_lieu();

DO $projection$
BEGIN
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_loai_tai_lieu(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_loai_tai_lieu;
 END IF;
END $projection$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 IF p_table='TAI_LIEU_QUY_TRINH' THEN
  p_row:=p_row||jsonb_build_object('tenloaitailieu',(SELECT tenloai FROM vuihoc."LOAI_TAI_LIEU" WHERE madinhdanh=p_row->>'maloaitailieu'));
 END IF;
 RETURN vuihoc.du_lieu_quan_he_truoc_loai_tai_lieu(p_table,p_row);
END $$;
DO $config$
DECLARE conf jsonb:=vuihoc.business_config(); f text;
BEGIN
 conf:=jsonb_set(conf,'{document_categories}',jsonb_build_object('table','LOAI_TAI_LIEU','module','PH6','feature','Quản lý kho tài liệu tri thức SOP',
  'columns',jsonb_build_array('madinhdanh','tenloai','mota','danghoatdong')));
 conf:=jsonb_set(conf,'{sop_documents,columns}',(SELECT jsonb_agg(value) FROM jsonb_array_elements_text(conf->'sop_documents'->'columns')
  WHERE value NOT IN ('phanloai','maloaitailieu','tenloaitailieu'))||jsonb_build_array('maloaitailieu','tenloaitailieu'));
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'tenloaitailieu_readonly')=0 THEN
  f:=replace(f,'IF conf IS NULL THEN',$patch$-- tenloaitailieu_readonly
  IF ds='sop_documents' AND (coalesce(b,'{}') ? 'tenloaitailieu' OR coalesce(v,'{}') ? 'tenloaitailieu') THEN RAISE EXCEPTION 'Tên loại tài liệu chỉ được truy vấn từ danh mục'; END IF;
  IF conf IS NULL THEN$patch$);
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE k<>''tenloaitailieu'' AND'); EXECUTE f;
 END IF;
END $config$;
ALTER TABLE vuihoc."LOAI_TAI_LIEU" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."LOAI_TAI_LIEU" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."LOAI_TAI_LIEU" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_loai_tai_lieu(),vuihoc.du_lieu_quan_he(text,jsonb),
 vuihoc.du_lieu_quan_he_truoc_loai_tai_lieu(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
