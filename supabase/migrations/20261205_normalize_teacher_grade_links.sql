-- After 20261204. Atomic; keep all existing grade choices and their order.
BEGIN;
DO $normalize_teacher_grades$
DECLARE r record; f text; old_write text:=$old$INSERT INTO vuihoc."GIAO_VIEN_KHOI" VALUES(id,p_row->>'macaphoc',c.value,c.ordinality);$old$; patched integer:=0;
BEGIN
 IF to_regprocedure('vuihoc.tai_khoan_chat(text)') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='vuihoc' AND indexname='cau_hinh_tro_ly_mot_ban') THEN RAISE EXCEPTION 'Chạy bản cập nhật AI 20261204 trước.'; END IF;
 LOCK TABLE vuihoc."GIAO_VIEN",vuihoc."GIAO_VIEN_KHOI",vuihoc."LUA_CHON_CAP_HOC" IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='GIAO_VIEN_KHOI' AND column_name='macaphoc') THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN_KHOI" k JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=k.magiaovien
  LEFT JOIN vuihoc."LUA_CHON_CAP_HOC" c ON (c.macaphoc,c.madinhdanh)=(k.macaphoc,k.makhoi)
  WHERE g.macaphoc IS DISTINCT FROM k.macaphoc OR c.madinhdanh IS NULL) THEN
  RAISE EXCEPTION 'Khối giáo viên lệch cấp học hoặc thiếu danh mục; chưa bỏ cột nào.';
 END IF;
 -- Globally unique atomic option ID; length prefix prevents collisions even
 -- when scoped IDs contain punctuation. Catalog replacement keeps this key.
 ALTER TABLE vuihoc."LUA_CHON_CAP_HOC" ADD COLUMN maluachon text GENERATED ALWAYS AS (length(macaphoc)::text||':'||macaphoc||madinhdanh) STORED;
 ALTER TABLE vuihoc."LUA_CHON_CAP_HOC" ADD CONSTRAINT lua_chon_cap_hoc_ma_toan_cuc UNIQUE(maluachon);
 ALTER TABLE vuihoc."GIAO_VIEN_KHOI" ADD COLUMN maluachon text;
 UPDATE vuihoc."GIAO_VIEN_KHOI" k SET maluachon=c.maluachon FROM vuihoc."LUA_CHON_CAP_HOC" c WHERE (c.macaphoc,c.madinhdanh)=(k.macaphoc,k.makhoi);
 ALTER TABLE vuihoc."GIAO_VIEN_KHOI" ALTER COLUMN maluachon SET NOT NULL;
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."GIAO_VIEN_KHOI"'::regclass AND contype='p' LOOP
  EXECUTE format('ALTER TABLE vuihoc."GIAO_VIEN_KHOI" DROP CONSTRAINT %I',r.conname);
 END LOOP;
 ALTER TABLE vuihoc."GIAO_VIEN_KHOI" DROP COLUMN macaphoc,DROP COLUMN makhoi;
 ALTER TABLE vuihoc."GIAO_VIEN_KHOI" ADD PRIMARY KEY(magiaovien,maluachon),
  ADD CONSTRAINT giao_vien_khoi_lua_chon_fk FOREIGN KEY(maluachon) REFERENCES vuihoc."LUA_CHON_CAP_HOC"(maluachon) ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
 CREATE VIEW vuihoc."V_GIAO_VIEN_KHOI" WITH (security_invoker=true) AS
  SELECT k.magiaovien,c.macaphoc,c.madinhdanh AS makhoi,k.thutu FROM vuihoc."GIAO_VIEN_KHOI" k JOIN vuihoc."LUA_CHON_CAP_HOC" c ON c.maluachon=k.maluachon;
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('vuihoc','public') AND p.prokind='f' AND strpos(p.prosrc,'GIAO_VIEN_KHOI')>0 LOOP
  f:=pg_get_functiondef(r.oid);
  IF strpos(f,old_write)>0 THEN
   f:=replace(f,old_write,$new$INSERT INTO vuihoc."GIAO_VIEN_KHOI"(magiaovien,maluachon,thutu)
    SELECT id,lc.maluachon,c.ordinality FROM vuihoc."LUA_CHON_CAP_HOC" lc WHERE lc.macaphoc=p_row->>'macaphoc' AND lc.madinhdanh=c.value;
    IF NOT FOUND THEN RAISE EXCEPTION 'Khối không thuộc cấp học đã chọn.'; END IF;$new$);
   patched:=patched+1;
  END IF;
  f:=replace(f,'FROM vuihoc."GIAO_VIEN_KHOI" k','FROM vuihoc."V_GIAO_VIEN_KHOI" k');
  EXECUTE f;
 END LOOP;
 IF patched=0 THEN RAISE EXCEPTION 'Chưa nhận diện bộ ghi khối giáo viên; rollback toàn bộ.'; END IF;
 REVOKE ALL ON vuihoc."V_GIAO_VIEN_KHOI" FROM PUBLIC,anon,authenticated;
 NOTIFY pgrst,'reload schema';
END $normalize_teacher_grades$;

-- Lock the teacher before changing links so a concurrent category change
-- cannot race an insertion. Deferred validation allows one RPC to replace both.
CREATE OR REPLACE FUNCTION vuihoc.khoa_giao_vien_khoi() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 PERFORM 1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=NEW.magiaovien FOR SHARE;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_cap_khoi_giao_vien() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE teacher_id text;
BEGIN
 IF TG_TABLE_NAME='GIAO_VIEN' THEN teacher_id:=NEW.madinhdanh; ELSE teacher_id:=NEW.magiaovien; END IF;
 IF EXISTS(SELECT 1 FROM vuihoc."GIAO_VIEN_KHOI" k JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=k.magiaovien
  JOIN vuihoc."LUA_CHON_CAP_HOC" c ON c.maluachon=k.maluachon WHERE k.magiaovien=teacher_id AND c.macaphoc IS DISTINCT FROM g.macaphoc) THEN
  RAISE EXCEPTION 'Khối không thuộc cấp học của giáo viên.';
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS khoa_giao_vien_khoi ON vuihoc."GIAO_VIEN_KHOI";
CREATE TRIGGER khoa_giao_vien_khoi BEFORE INSERT OR UPDATE ON vuihoc."GIAO_VIEN_KHOI" FOR EACH ROW EXECUTE FUNCTION vuihoc.khoa_giao_vien_khoi();
DROP TRIGGER IF EXISTS kiem_tra_cap_khoi ON vuihoc."GIAO_VIEN_KHOI";
CREATE CONSTRAINT TRIGGER kiem_tra_cap_khoi AFTER INSERT OR UPDATE ON vuihoc."GIAO_VIEN_KHOI" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_cap_khoi_giao_vien();
DROP TRIGGER IF EXISTS kiem_tra_cap_khoi ON vuihoc."GIAO_VIEN";
CREATE CONSTRAINT TRIGGER kiem_tra_cap_khoi AFTER UPDATE ON vuihoc."GIAO_VIEN" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_cap_khoi_giao_vien();
REVOKE ALL ON FUNCTION vuihoc.khoa_giao_vien_khoi(),vuihoc.kiem_tra_cap_khoi_giao_vien() FROM PUBLIC,anon,authenticated;
COMMIT;
