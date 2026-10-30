-- Track actual material edits; unknown historical update times remain NULL.
BEGIN;
ALTER TABLE vuihoc."HOC_LIEU_LOP" ADD COLUMN IF NOT EXISTS ngaycapnhat timestamptz;
CREATE OR REPLACE FUNCTION vuihoc.danh_dau_cap_nhat_hoc_lieu() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.ngaycapnhat:=statement_timestamp();
 ELSIF (NEW.tungay,NEW.denngay,NEW.sobuoi,NEW.tieude,NEW.lienketslide,NEW.lienketlms)
 IS DISTINCT FROM (OLD.tungay,OLD.denngay,OLD.sobuoi,OLD.tieude,OLD.lienketslide,OLD.lienketlms) THEN NEW.ngaycapnhat:=statement_timestamp();
 ELSE NEW.ngaycapnhat:=OLD.ngaycapnhat; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vuihoc.danh_dau_cap_nhat_hoc_lieu() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS danh_dau_cap_nhat_hoc_lieu ON vuihoc."HOC_LIEU_LOP";
CREATE TRIGGER danh_dau_cap_nhat_hoc_lieu BEFORE INSERT OR UPDATE ON vuihoc."HOC_LIEU_LOP"
FOR EACH ROW EXECUTE FUNCTION vuihoc.danh_dau_cap_nhat_hoc_lieu();
DO $patch$
DECLARE f text;
BEGIN
 -- Append to the existing view so dependent columns and access rules stay intact.
 f:=pg_get_viewdef('vuihoc."V_HOC_LIEU_LOP"'::regclass,true);
 IF strpos(f,'ngaycapnhat')=0 THEN
  IF strpos(f,'lienketlms')=0 THEN RAISE EXCEPTION 'Unsupported material view'; END IF;
  IF strpos(f,'h.lienketlms')>0 THEN f:=replace(f,'h.lienketlms','h.lienketlms, h.ngaycapnhat');
  ELSE f:=replace(f,'lienketlms','lienketlms, ngaycapnhat'); END IF;
  EXECUTE 'CREATE OR REPLACE VIEW vuihoc."V_HOC_LIEU_LOP" WITH(security_invoker=true) AS '||f;
 END IF;
 f:=pg_get_functiondef('vuihoc.lop_truong_truy_van(jsonb)'::regprocedure);
 IF strpos(f,'''updatedAt''')=0 THEN
  IF strpos(f,'''id'', h.mahoclieu')>0 THEN
   f:=replace(f,'''id'', h.mahoclieu','''updatedAt'', h.ngaycapnhat, ''id'', h.mahoclieu');
  ELSIF strpos(f,'''id'',h.mahoclieu')>0 THEN
   f:=replace(f,'''id'',h.mahoclieu','''updatedAt'',h.ngaycapnhat,''id'',h.mahoclieu');
  ELSE RAISE EXCEPTION 'Unsupported material projection'; END IF;
  EXECUTE f;
 END IF;
 -- Class saves may round-trip the full read projection. The timestamp is
 -- server-owned metadata, never an editable material field.
 f:=pg_get_functiondef('vuihoc.luu_hoc_lieu_lop(text,jsonb)'::regprocedure);
 IF strpos(f,'x-''updatedAt''')=0 THEN
  IF strpos(f,'kiem_tra_truong_json(x,ARRAY[')=0 THEN RAISE EXCEPTION 'Unsupported material writer'; END IF;
  f:=replace(f,'kiem_tra_truong_json(x,ARRAY[','kiem_tra_truong_json(x-''updatedAt'',ARRAY[');
  EXECUTE f;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
