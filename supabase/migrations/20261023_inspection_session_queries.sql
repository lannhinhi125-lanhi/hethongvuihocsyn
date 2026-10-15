-- Run after 20261021. SELECT enrichment only; no new tables or stored JSON columns.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_du_gio(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_du_gio;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb; lesson text:=p_row->>'madinhdanh';
BEGIN
 r:=vuihoc.du_lieu_quan_he_truoc_du_gio(p_table,p_row);
 IF p_table='BUOI_HOC' THEN
  r:=r||jsonb_build_object('thongtindugio',jsonb_build_object(
   'sessionNum',(SELECT c.sobuoi FROM vuihoc."CHI_TIET_CA_LOP" c WHERE c.mabuoi=lesson ORDER BY c.khoaca LIMIT 1),
   'title',(SELECT c.tieude FROM vuihoc."CHI_TIET_CA_LOP" c WHERE c.mabuoi=lesson ORDER BY c.khoaca LIMIT 1),
   'attendance',(SELECT coalesce(jsonb_object_agg(a.mahocsinh,a.trangthai),'{}') FROM vuihoc."DIEM_DANH_BUOI_HOC" a WHERE a.mabuoi=lesson),
   'feedback',(SELECT coalesce(jsonb_object_agg(n.mahocsinh,n.noidung),'{}') FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=lesson),
   'studentIds',(SELECT coalesce(jsonb_agg(s.mahocsinh ORDER BY s.mahocsinh),'[]') FROM (
    SELECT mahocsinh FROM vuihoc."DIEM_DANH_BUOI_HOC" WHERE mabuoi=lesson
    UNION SELECT mahocsinh FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi=lesson) s)));
 END IF;
 RETURN r;
END $$;
DO $$ DECLARE conf jsonb:=vuihoc.business_config(); f text;
BEGIN
 -- Preserve the actual lesson FK when reading existing reports through teacher profiles.
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he_truoc_bo_json(text,jsonb)'::regprocedure);
 f:=replace(f,'''id'',e.madinhdanh,''teacherId''','''id'',e.madinhdanh,''lessonId'',e.mabuoi,''teacherId''');
 EXECUTE f;
 IF NOT (conf->'dated_lessons'->'columns' ? 'thongtindugio') THEN
  conf:=jsonb_set(conf,'{dated_lessons,columns}',conf->'dated_lessons'->'columns'||'"thongtindugio"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'inspection_query_readonly')=0 THEN
  f:=replace(f,'IF conf IS NULL THEN',$guard$-- inspection_query_readonly
  IF coalesce(b,'{}') ? 'thongtindugio' OR coalesce(v,'{}') ? 'thongtindugio' THEN RAISE EXCEPTION 'Thông tin ca dự giờ chỉ được truy vấn'; END IF;
  IF conf IS NULL THEN$guard$);
  EXECUTE f;
 END IF;
END $$;
REVOKE ALL ON FUNCTION vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.du_lieu_quan_he_truoc_du_gio(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
