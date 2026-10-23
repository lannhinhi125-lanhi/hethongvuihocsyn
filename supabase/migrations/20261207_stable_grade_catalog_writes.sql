-- Apply after 20261206 in production. Also supports the older catalog layout for regression tests.
-- No table/column/FK changes and no data backfill. One atomic statement.
DO $stable_grade_catalog$
DECLARE f text; a integer; b integer; owner_name text;
BEGIN
 LOCK TABLE vuihoc."CAP_HOC",vuihoc."LUA_CHON_CAP_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF to_regprocedure('vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean)') IS NULL THEN RAISE EXCEPTION 'Thiếu bộ ghi danh mục quan hệ.'; END IF;
 CREATE OR REPLACE FUNCTION vuihoc.luu_lua_chon_cap_hoc(p_id text,p_items jsonb) RETURNS void
 LANGUAGE plpgsql SET search_path=pg_catalog AS $save$
 BEGIN
  PERFORM 1 FROM vuihoc."CAP_HOC" WHERE madinhdanh=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cấp học nguồn không tồn tại.'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Danh sách khối phải là mảng.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE jsonb_typeof(x)<>'object'
    OR jsonb_typeof(x->'id') IS DISTINCT FROM 'string' OR btrim(coalesce(x->>'id',''))=''
    OR jsonb_typeof(x->'label') IS DISTINCT FROM 'string' OR btrim(coalesce(x->>'label',''))=''
    OR (x ? 'parentId' AND jsonb_typeof(x->'parentId') NOT IN ('string','null')))
   THEN RAISE EXCEPTION 'Khối cần mã, nhãn và mã cha đúng định dạng.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x CROSS JOIN LATERAL jsonb_object_keys(x) k WHERE k NOT IN ('id','label','parentId')) THEN RAISE EXCEPTION 'Lựa chọn khối có trường chưa được hỗ trợ.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x GROUP BY x->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Mã khối trùng trong cùng cấp học.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE nullif(x->>'parentId','') IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) parent WHERE parent->>'id'=x->>'parentId')) THEN RAISE EXCEPTION 'Mã cha không thuộc danh sách của cấp học.'; END IF;
  IF EXISTS(WITH RECURSIVE items AS (SELECT x->>'id' id,nullif(x->>'parentId','') parent FROM jsonb_array_elements(p_items) x),
   walk(id,parent,path,cycle) AS (
    SELECT id,parent,ARRAY[id],false FROM items
    UNION ALL SELECT i.id,i.parent,w.path||i.id,i.id=ANY(w.path) FROM walk w JOIN items i ON i.id=w.parent WHERE NOT w.cycle
   ) SELECT 1 FROM walk WHERE cycle) THEN RAISE EXCEPTION 'Danh mục có vòng lặp cấp cha.'; END IF;
  -- Order INSERTs from parent to child; retain the user's original display order.
  WITH RECURSIVE items AS (
   SELECT x.value->>'id' id,x.value->>'label' label,nullif(x.value->>'parentId','') parent,x.ordinality::integer pos
   FROM jsonb_array_elements(p_items) WITH ORDINALITY x(value,ordinality)
  ), tree AS (
   SELECT i.*,0 AS depth FROM items i WHERE parent IS NULL
   UNION ALL SELECT i.*,t.depth+1 FROM tree t JOIN items i ON i.parent=t.id
  ) INSERT INTO vuihoc."LUA_CHON_CAP_HOC" AS old(macaphoc,madinhdanh,nhan,thutu,macha)
   SELECT p_id,id,label,pos,parent FROM tree ORDER BY depth,pos
   ON CONFLICT(macaphoc,madinhdanh) DO UPDATE SET nhan=excluded.nhan,thutu=excluded.thutu,macha=excluded.macha
   WHERE (old.nhan,old.thutu,old.macha) IS DISTINCT FROM (excluded.nhan,excluded.thutu,excluded.macha);
  -- Only removed choices are deleted. Existing FKs still block deletion of used choices.
  DELETE FROM vuihoc."LUA_CHON_CAP_HOC" old WHERE old.macaphoc=p_id
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE x->>'id'=old.madinhdanh);
 END $save$;
 f:=pg_get_functiondef('vuihoc.ghi_chi_tiet_danh_muc(text,jsonb,boolean)'::regprocedure);
 a:=strpos(f,' IF p_table=''CAP_HOC'' AND p_row ? ''danhsachluachon'' THEN');
 b:=CASE WHEN a>0 THEN strpos(substr(f,a),' ELSIF p_table=') ELSE 0 END;
 IF a=0 OR b=0 THEN RAISE EXCEPTION 'Không nhận diện nhánh ghi cấp/khối; chưa thay đổi bộ ghi.'; END IF;
 f:=substr(f,1,a-1)||E' IF p_table=''CAP_HOC'' AND p_row ? ''danhsachluachon'' THEN\n  PERFORM vuihoc.luu_lua_chon_cap_hoc(p_row->>''madinhdanh'',p_row->''danhsachluachon'');\n'||substr(f,a+b-1);EXECUTE f;
 SELECT pg_get_userbyid(proowner) INTO owner_name FROM pg_proc WHERE oid='public.vuihoc_login(text,text)'::regprocedure;
 IF owner_name IS NULL OR owner_name IN ('anon','authenticated','service_role','authenticator') THEN RAISE EXCEPTION 'Chủ sở hữu RPC không phù hợp.'; END IF;
 EXECUTE format('ALTER FUNCTION vuihoc.luu_lua_chon_cap_hoc(text,jsonb) OWNER TO %I',owner_name);
 REVOKE ALL ON FUNCTION vuihoc.luu_lua_chon_cap_hoc(text,jsonb) FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $stable_grade_catalog$;
