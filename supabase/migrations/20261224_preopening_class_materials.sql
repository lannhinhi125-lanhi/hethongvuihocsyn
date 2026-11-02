-- Allow preparing materials before a class opens. Preserve the installed term
-- calculation, pause/expiry checks, trigger wiring and permissions.
BEGIN;
DO $patch$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.chan_hoc_lieu_lop_ngung()'::regprocedure);
 f:=replace(f,'l.trangthai=''DANG_HOC''','l.trangthai IN (''CHO_KHAI_GIANG'',''DANG_HOC'')');
 IF strpos(f,'l.trangthai IN (''CHO_KHAI_GIANG'',''DANG_HOC'')')=0 THEN
  RAISE EXCEPTION 'Không nhận diện được điều kiện trạng thái lớp trong bộ kiểm tra học liệu.';
 END IF;
 f:=replace(f,'Chỉ gắn học liệu cho lớp đang học, không tạm nghỉ và còn hạn',
  'Chỉ gắn học liệu cho lớp chờ khai giảng hoặc đang học, không tạm nghỉ và còn hạn');
 EXECUTE f;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
