-- Update existing class/week/session rows in place. No reset of business data.
BEGIN;
LOCK TABLE vuihoc."HOC_LIEU_LOP" IN SHARE ROW EXCLUSIVE MODE;
CREATE OR REPLACE FUNCTION vuihoc.cap_nhat_hoc_lieu_lop(p_lop text,p_materials jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE x jsonb; pos integer; next_pos integer;
BEGIN
 PERFORM 1 FROM vuihoc."LOP_HOC" WHERE madinhdanh=p_lop FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lớp học không tồn tại'; END IF;
 p_materials:=coalesce(nullif(p_materials,'null'),'[]');
 IF jsonb_typeof(p_materials)<>'array' THEN RAISE EXCEPTION 'Danh sách học liệu không hợp lệ'; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(p_materials) LOOP
  PERFORM vuihoc.kiem_tra_truong_json(x,ARRAY['month','week','session','title','slide','lms']);
  IF coalesce(btrim(x->>'month'),'')='' OR coalesce(btrim(x->>'week'),'')=''
   OR coalesce(x->>'session','') NOT IN ('1','2') THEN RAISE EXCEPTION 'Học liệu cần có tháng, tuần và buổi 1 hoặc 2'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_materials) a GROUP BY a->>'week',a->>'session' HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Một lớp chỉ có một học liệu cho mỗi tuần và buổi'; END IF;
 DELETE FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=p_lop AND NOT EXISTS(
  SELECT 1 FROM jsonb_array_elements(p_materials) a WHERE a->>'week'=h.tuan AND (a->>'session')::integer=h.sobuoi);
 SELECT coalesce(max(thutu),0) INTO next_pos FROM vuihoc."HOC_LIEU_LOP" WHERE malop=p_lop;
 FOR x IN SELECT value FROM jsonb_array_elements(p_materials) LOOP
  SELECT thutu INTO pos FROM vuihoc."HOC_LIEU_LOP" WHERE malop=p_lop AND tuan=x->>'week' AND sobuoi=(x->>'session')::integer;
  IF FOUND THEN
   UPDATE vuihoc."HOC_LIEU_LOP" SET thang=x->>'month',tieude=coalesce(x->>'title',''),
    lienketslide=coalesce(x->>'slide',''),lienketlms=coalesce(x->>'lms','')
   WHERE malop=p_lop AND thutu=pos AND (thang,tieude,lienketslide,lienketlms)
    IS DISTINCT FROM (x->>'month',coalesce(x->>'title',''),coalesce(x->>'slide',''),coalesce(x->>'lms',''));
  ELSE
   next_pos:=next_pos+1;
   INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
   VALUES(p_lop,next_pos,x->>'month',x->>'week',(x->>'session')::integer,coalesce(x->>'title',''),coalesce(x->>'slide',''),coalesce(x->>'lms',''));
  END IF;
 END LOOP;
END $$;

-- Patch only the material branch of the installed writer; preserve newer logic.
DO $patch$
DECLARE f text; old_block text:=$old$ IF p_row ? 'hoclieu' THEN
  DELETE FROM vuihoc."HOC_LIEU_LOP" WHERE malop=id;
  FOR x IN SELECT value,ordinality FROM jsonb_array_elements(coalesce(nullif(p_row->'hoclieu','null'),'[]')) WITH ORDINALITY LOOP
   PERFORM vuihoc.kiem_tra_truong_json(x.value,ARRAY['month','week','session','title','slide','lms']);
   INSERT INTO vuihoc."HOC_LIEU_LOP" VALUES(id,x.ordinality,x.value->>'month',x.value->>'week',
    (x.value->>'session')::integer,x.value->>'title',x.value->>'slide',x.value->>'lms');
  END LOOP;
 END IF;$old$;
BEGIN
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 IF strpos(f,'vuihoc.cap_nhat_hoc_lieu_lop')=0 THEN
  IF strpos(f,old_block)=0 THEN RAISE EXCEPTION 'Không tìm thấy nhánh lưu học liệu dự kiến; chưa thay đổi dữ liệu'; END IF;
  f:=replace(f,old_block,$new$ IF p_row ? 'hoclieu' THEN
  PERFORM vuihoc.cap_nhat_hoc_lieu_lop(id,p_row->'hoclieu');
 END IF;$new$);
  EXECUTE f;
 END IF;
END $patch$;
CREATE UNIQUE INDEX IF NOT EXISTS hoc_lieu_lop_tuan_buoi_unique ON vuihoc."HOC_LIEU_LOP"(malop,tuan,sobuoi);
REVOKE ALL ON FUNCTION vuihoc.cap_nhat_hoc_lieu_lop(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
