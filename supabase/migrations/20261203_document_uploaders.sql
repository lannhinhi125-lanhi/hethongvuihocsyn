-- Run after 20261202. Historical uploaders are unknown and remain NULL.
BEGIN;
ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH"
 ADD COLUMN IF NOT EXISTS manguoitailen text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS tai_lieu_nguoi_tai_len ON vuihoc."TAI_LIEU_QUY_TRINH"(manguoitailen);
COMMENT ON COLUMN vuihoc."TAI_LIEU_QUY_TRINH".manguoitailen IS 'Tài khoản tạo/tải tài liệu lên; NULL với tài liệu lịch sử chưa xác định. Không đổi khi sửa tài liệu.';

DO $patch$
DECLARE f text; conf jsonb:=vuihoc.business_config(); anchor text:=$anchor$v:=coalesce(oldrow,'{}')||v;$anchor$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'document_uploader_server')=0 THEN
  IF strpos(f,anchor)=0 OR strpos(f,'IF conf IS NULL THEN')=0 THEN
   RAISE EXCEPTION 'Không nhận diện được RPC lưu tài liệu; dừng để tránh sửa nhầm.';
  END IF;
  f:=replace(f,'IF conf IS NULL THEN',$guard$
  -- document_uploader_server: clients cannot supply attribution, even on create.
  IF ds='sop_documents' AND ((coalesce(b,'{}')||coalesce(v,'{}')) ?| ARRAY['manguoitailen','tennguoitailen']) THEN
   RAISE EXCEPTION 'Người tải tài liệu do máy chủ xác định, không được sửa từ giao diện.';
  END IF;
  IF conf IS NULL THEN$guard$);
  f:=replace(f,anchor,$writer$
   IF ds='sop_documents' THEN
    v:=v||jsonb_build_object('manguoitailen',CASE WHEN oldrow IS NULL THEN actor.madinhdanh ELSE oldrow->>'manguoitailen' END);
   END IF;
   v:=coalesce(oldrow,'{}')||v;$writer$);
  EXECUTE f;
 END IF;
 IF NOT (conf->'sop_documents'->'columns' ? 'manguoitailen') THEN
  conf:=jsonb_set(conf,'{sop_documents,columns}',(conf->'sop_documents'->'columns')||jsonb_build_array('manguoitailen'));
 END IF;
 IF NOT (conf->'sop_documents'->'columns' ? 'tennguoitailen') THEN
  conf:=jsonb_set(conf,'{sop_documents,columns}',(conf->'sop_documents'->'columns')||jsonb_build_array('tennguoitailen'));
 END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_nguoi_tai_lieu;
 END IF;
END $patch$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 IF p_table='TAI_LIEU_QUY_TRINH' THEN
  p_row:=p_row||jsonb_build_object('tennguoitailen',(SELECT hoten FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=p_row->>'manguoitailen'));
 END IF;
 RETURN vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(p_table,p_row);
END $$;
REVOKE ALL ON FUNCTION vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
