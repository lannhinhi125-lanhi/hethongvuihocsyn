-- Apply after 20261030. Rules for personal vs assigned teaching/enrollment data.
-- No new tables or columns; JSON is only the existing RPC transport/projection.
BEGIN;
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_sua_ho_so(p_table text,b jsonb,v jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE oldreg jsonb; newreg jsonb; slot record; oldstate text; newstate text; cls record;
BEGIN
 IF b IS NULL OR v IS NULL THEN RETURN; END IF;
 IF p_table='HOC_SINH' THEN
  IF b->'khoi' IS DISTINCT FROM v->'khoi' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(coalesce(b->'dangkymonhoc','[]')) r
   WHERE r->>'status'<>'CHO_XEP_LOP' OR nullif(r->>'currentClassCode','') IS NOT NULL
  ) THEN RAISE EXCEPTION 'Đưa các đăng ký môn về Chờ xếp lớp và lưu trước khi đổi khối.'; END IF;
  FOR oldreg IN SELECT value FROM jsonb_array_elements(coalesce(b->'dangkymonhoc','[]')) LOOP
   SELECT r INTO newreg FROM jsonb_array_elements(coalesce(v->'dangkymonhoc','[]')) r WHERE r->>'subject'=oldreg->>'subject';
   IF newreg IS NOT NULL AND (oldreg->>'status'<>'CHO_XEP_LOP' OR nullif(oldreg->>'currentClassCode','') IS NOT NULL)
    AND ((oldreg->'level',oldreg->'model') IS DISTINCT FROM (newreg->'level',newreg->'model')
     OR (SELECT coalesce(jsonb_agg(x ORDER BY x),'[]') FROM jsonb_array_elements_text(coalesce(oldreg->'scheduleSlots','[]')) x)
      IS DISTINCT FROM (SELECT coalesce(jsonb_agg(x ORDER BY x),'[]') FROM jsonb_array_elements_text(coalesce(newreg->'scheduleSlots','[]')) x)) THEN
    RAISE EXCEPTION 'Đưa đăng ký môn về Chờ xếp lớp và lưu trước khi đổi trình độ, mô hình hoặc lịch học.';
   END IF;
  END LOOP;
 ELSIF p_table='GIAO_VIEN' THEN
  FOR cls IN SELECT l.*,vuihoc.khoi_lop(l.madinhdanh) AS grade FROM vuihoc."LOP_HOC" l
   WHERE l.magiaovien=b->>'madinhdanh' AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC') LOOP
   IF (b->'mamonhoc' IS DISTINCT FROM v->'mamonhoc' AND cls.mamonhoc<>v->>'mamonhoc')
    OR (b->'macaphoc' IS DISTINCT FROM v->'macaphoc' AND cls.macaphoc<>v->>'macaphoc')
    OR (b->'danhsachkhoi' IS DISTINCT FROM v->'danhsachkhoi' AND NOT (v->'danhsachkhoi' ? cls.grade))
    OR (b->'danhsachmohinh' IS DISTINCT FROM v->'danhsachmohinh' AND NOT (v->'danhsachmohinh' ? cls.mamohinh)) THEN
    RAISE EXCEPTION 'Thay đổi chuyên môn ảnh hưởng lớp đang phụ trách. Điều chỉnh phân công lớp trước khi lưu.';
   END IF;
  END LOOP;
  IF b->'lichranh' IS DISTINCT FROM v->'lichranh' THEN
   FOR slot IN
    SELECT DISTINCT s.makhunggio,k.makhunggio AS code,s.thutrongtuan-1 AS day_index
     FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop
     JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
     WHERE l.magiaovien=b->>'madinhdanh' AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
    UNION
    SELECT DISTINCT h.makhunggio,k.makhunggio,extract(isodow FROM h.ngayhoc)::int-1
     FROM vuihoc."BUOI_HOC" h JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=h.makhunggio
     WHERE h.magiaoviendaythay=b->>'madinhdanh' AND h.trangthai NOT IN ('NGHI_HOC','DA_HOAN_THANH')
   LOOP
    oldstate:=coalesce(b->'lichranh'->slot.makhunggio->>slot.day_index,b->'lichranh'->slot.code->>slot.day_index,'none');
    newstate:=coalesce(v->'lichranh'->slot.makhunggio->>slot.day_index,v->'lichranh'->slot.code->>slot.day_index,'none');
    IF oldstate IS DISTINCT FROM newstate THEN RAISE EXCEPTION 'Ca đã gắn với lớp: cần điều chỉnh phân công lớp trước khi sửa lịch rảnh.'; END IF;
   END LOOP;
  END IF;
 END IF;
END $$;

DO $rpc$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'kiem_tra_sua_ho_so')=0 THEN
  IF strpos(f,'v:=coalesce(oldrow,''{}'')||v;')=0 THEN RAISE EXCEPTION 'RPC chưa có cấu trúc cập nhật dự kiến. Dừng để tránh sửa nhầm.'; END IF;
  f:=replace(f,'v:=coalesce(oldrow,''{}'')||v;',
   'PERFORM vuihoc.kiem_tra_sua_ho_so(conf->>''table'',oldrow,coalesce(oldrow,''{}'')||v); v:=coalesce(oldrow,''{}'')||v;');
  EXECUTE f;
 END IF;
END $rpc$;

-- Account edits update the linked teacher, using the existing FK only.
-- The business RPC already syncs teacher personal fields back to the account.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_lien_he_giao_vien() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 UPDATE vuihoc."GIAO_VIEN" SET hoten=NEW.hoten,thudientu=NEW.thudientu,sodienthoai=NEW.sodienthoai,tendangnhap=NEW.tendangnhap
 WHERE manguoidung=NEW.madinhdanh AND (hoten,thudientu,sodienthoai,tendangnhap)
  IS DISTINCT FROM (NEW.hoten,NEW.thudientu,NEW.sodienthoai,NEW.tendangnhap);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dong_bo_lien_he_giao_vien ON vuihoc."NGUOI_DUNG";
CREATE TRIGGER dong_bo_lien_he_giao_vien AFTER UPDATE OF hoten,thudientu,sodienthoai,tendangnhap ON vuihoc."NGUOI_DUNG"
 FOR EACH ROW WHEN ((OLD.hoten,OLD.thudientu,OLD.sodienthoai,OLD.tendangnhap) IS DISTINCT FROM (NEW.hoten,NEW.thudientu,NEW.sodienthoai,NEW.tendangnhap))
 EXECUTE FUNCTION vuihoc.dong_bo_lien_he_giao_vien();
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_sua_ho_so(text,jsonb,jsonb),vuihoc.dong_bo_lien_he_giao_vien() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
