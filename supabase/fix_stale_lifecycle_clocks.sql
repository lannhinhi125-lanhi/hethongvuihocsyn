-- Repair old lifecycle functions restored after lesson clock normalization.
-- Run the entire file in Supabase SQL Editor as the database administrator.
-- Changes function definitions only; does not execute checkout or change rows.
DO $repair$
DECLARE signature text; definition text; previous text; slot_columns integer;
BEGIN
 SELECT count(*) INTO slot_columns FROM information_schema.columns
 WHERE table_schema='vuihoc' AND table_name='KHUNG_GIO'
 AND column_name IN ('madinhdanh','giobatdau','gioketthuc');
 IF slot_columns <> 3 THEN
  RAISE EXCEPTION 'KHUNG_GIO chưa có đủ madinhdanh, giobatdau, gioketthuc. Chưa sửa hàm nào.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_schema='vuihoc' AND table_name='BUOI_HOC' AND column_name='makhunggio') THEN
  RAISE EXCEPTION 'BUOI_HOC thiếu makhunggio. Chưa sửa hàm nào.';
 END IF;
 FOREACH signature IN ARRAY ARRAY[
  'vuihoc.tu_dong_checkout(timestamp with time zone)',
  'vuihoc.dong_bo_trang_thai_ca()'
 ] LOOP
  definition := pg_get_functiondef(signature::regprocedure);
  previous := definition;
  -- These two functions use h/b for BUOI_HOC. Keep the physical table and
  -- FOR UPDATE OF h locks; only resolve scheduled clocks through its slot FK.
  definition := regexp_replace(definition, '\m(h|b)\.batdau\M',
   '(SELECT clock_slot.giobatdau FROM vuihoc."KHUNG_GIO" clock_slot WHERE clock_slot.madinhdanh=\1.makhunggio)', 'g');
  definition := regexp_replace(definition, '\m(h|b)\.ketthuc\M',
   '(SELECT clock_slot.gioketthuc FROM vuihoc."KHUNG_GIO" clock_slot WHERE clock_slot.madinhdanh=\1.makhunggio)', 'g');
  IF definition IS DISTINCT FROM previous THEN
   EXECUTE definition;
   RAISE NOTICE 'Đã sửa %', signature;
  ELSE
   RAISE NOTICE 'Không có tham chiếu h/b.batdau hoặc h/b.ketthuc cần sửa trong %', signature;
  END IF;
 END LOOP;
END $repair$;

-- Both values in con_dung_cot_cu should be false after the repair.
SELECT p.oid::regprocedure AS ham,
 p.prosrc ~ '\m(h|b)\.(batdau|ketthuc)\M' AS con_dung_cot_cu
FROM pg_proc p
WHERE p.oid IN (
 'vuihoc.tu_dong_checkout(timestamp with time zone)'::regprocedure,
 'vuihoc.dong_bo_trang_thai_ca()'::regprocedure
);
