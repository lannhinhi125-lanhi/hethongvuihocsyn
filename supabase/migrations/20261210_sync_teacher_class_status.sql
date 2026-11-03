BEGIN;

-- Joining date is the profile creation date, independent of class start dates.
CREATE OR REPLACE FUNCTION vuihoc.teacher_join_date_default()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, vuihoc AS $$
BEGIN
 IF nullif(btrim(NEW.ngaybatdau), '') IS NULL THEN
  NEW.ngaybatdau := to_char(coalesce(NEW.ngaytao, now()) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD');
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS teacher_join_date_default ON vuihoc."GIAO_VIEN";
CREATE TRIGGER teacher_join_date_default BEFORE INSERT OR UPDATE ON vuihoc."GIAO_VIEN"
FOR EACH ROW EXECUTE FUNCTION vuihoc.teacher_join_date_default();

-- Class operations update teacher profiles in the same transaction, including
-- operations by staff who can assign classes but cannot edit teacher profiles.
CREATE OR REPLACE FUNCTION vuihoc.sync_teacher_class_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, vuihoc AS $$
DECLARE affected text[]; teacher_id text;
BEGIN
 IF TG_OP = 'INSERT' THEN affected := ARRAY[NEW.magiaovien];
 ELSIF TG_OP = 'DELETE' THEN affected := ARRAY[OLD.magiaovien];
 ELSE
  IF NEW.magiaovien IS NOT DISTINCT FROM OLD.magiaovien
     AND NEW.trangthai IS NOT DISTINCT FROM OLD.trangthai THEN RETURN NEW; END IF;
  affected := ARRAY[OLD.magiaovien, NEW.magiaovien];
 END IF;
 -- Stable locking order when a teacher is replaced.
 FOR teacher_id IN SELECT DISTINCT id FROM unnest(affected) AS t(id) WHERE id IS NOT NULL ORDER BY id LOOP
  PERFORM 1 FROM vuihoc."GIAO_VIEN" WHERE madinhdanh = teacher_id FOR UPDATE;
  UPDATE vuihoc."GIAO_VIEN" g SET trangthai = CASE
   WHEN EXISTS (SELECT 1 FROM vuihoc."LOP_HOC" c WHERE c.magiaovien = teacher_id
    AND coalesce(c.trangthai, 'CHO_KHAI_GIANG') IN ('CHO_KHAI_GIANG', 'DANG_HOC')) THEN 'DANG_DAY'
   WHEN g.trangthai = 'DANG_DAY' THEN 'CHO_LOP'
   ELSE g.trangthai END
  WHERE g.madinhdanh = teacher_id;
 END LOOP;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION vuihoc.sync_teacher_class_status() FROM PUBLIC;
DROP TRIGGER IF EXISTS sync_teacher_class_status ON vuihoc."LOP_HOC";
CREATE TRIGGER sync_teacher_class_status AFTER INSERT OR UPDATE OR DELETE ON vuihoc."LOP_HOC"
FOR EACH ROW EXECUTE FUNCTION vuihoc.sync_teacher_class_status();

UPDATE vuihoc."GIAO_VIEN" SET ngaybatdau = to_char(ngaytao AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')
WHERE nullif(btrim(ngaybatdau), '') IS NULL;
UPDATE vuihoc."GIAO_VIEN" g SET trangthai = 'DANG_DAY'
WHERE g.trangthai <> 'DANG_DAY' AND EXISTS (
 SELECT 1 FROM vuihoc."LOP_HOC" c WHERE c.magiaovien = g.madinhdanh
 AND coalesce(c.trangthai, 'CHO_KHAI_GIANG') IN ('CHO_KHAI_GIANG', 'DANG_HOC'));

COMMIT;
