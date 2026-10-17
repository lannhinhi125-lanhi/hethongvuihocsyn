-- Existing rows use UPDATE by their immutable primary key; new rows use INSERT.
-- Run after the relational migrations (through 20261028).
-- No business rows are rewritten, no JSON/JSONB storage columns are added.
BEGIN;
DO $patch$
DECLARE f text; original text; old_statement text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'update_existing_business_rows')=0 THEN
  original:=f;
  f:=replace(f,'DECLARE ','DECLARE updated_row_count integer; ');
  -- Query projections must remain available to child-table handlers, but must
  -- never appear as column names in the parent table's INSERT/UPDATE.
  IF strpos(f,'FROM jsonb_object_keys(v) k WHERE')=0 THEN
   RAISE EXCEPTION 'Cấu trúc RPC chưa phải bản quan hệ. Cần chạy các migration quan hệ trước.';
  END IF;
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE',
   $columns$FROM jsonb_object_keys(v) k WHERE EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid=format('vuihoc.%I',conf->>'table')::regclass
     AND a.attname=k AND a.attnum>0 AND NOT a.attisdropped
     AND a.attgenerated='' AND a.attidentity=''
   ) AND$columns$);
  f:=replace(f,$old$string_agg(format('%I=excluded.%I',k,k),',')$old$,
   $new$string_agg(format('%1$I=(jsonb_populate_record(NULL::vuihoc.%2$I,$1)).%1$I',k,conf->>'table'),',') FILTER (WHERE k<>'madinhdanh' AND (oldrow IS NULL OR oldrow->k IS DISTINCT FROM v->k))$new$);
  old_statement:=$old$EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s ON CONFLICT(madinhdanh) DO UPDATE SET %s',conf->>'table',cols,exprs,assigns) USING v;$old$;
  IF strpos(f,old_statement)=0 THEN RAISE EXCEPTION 'Không tìm thấy câu ghi dữ liệu cần sửa; dừng để tránh sửa nhầm RPC.'; END IF;
  f:=replace(f,old_statement,$new$-- update_existing_business_rows
   IF oldrow IS NULL THEN
    EXECUTE format('INSERT INTO vuihoc.%I(%s) SELECT %s',conf->>'table',cols,exprs) USING v;
   ELSIF assigns IS NOT NULL THEN
    EXECUTE format('UPDATE vuihoc.%I SET %s WHERE madinhdanh=$2',conf->>'table',assigns) USING v,id;
    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
    IF updated_row_count<>1 THEN RAISE EXCEPTION 'Bản ghi không còn tồn tại. Hãy tải lại dữ liệu.'; END IF;
   END IF;$new$);
  IF strpos(f,'excluded.')>0 OR f=original THEN RAISE EXCEPTION 'Chưa chuyển được câu ghi dữ liệu sang UPDATE rõ ràng.'; END IF;
  EXECUTE f;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
