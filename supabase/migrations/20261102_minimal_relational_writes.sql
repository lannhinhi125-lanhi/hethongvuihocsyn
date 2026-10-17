-- Run after 20261101. Only functions are changed: no stored snapshots or new columns.
BEGIN;
DO $check$ BEGIN
 IF to_regprocedure('vuihoc.ca_giao_vien_con_lop(text,text,integer)') IS NULL THEN
  RAISE EXCEPTION 'Chạy bản 20261101 trước, hoặc chạy toàn bộ supabase/fix_profile_class_updates.sql.';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb')) THEN
  RAISE EXCEPTION 'Database còn cột JSON/JSONB. Cần hoàn tất các bản nâng cấp quan hệ trước; bản này không tự xóa dữ liệu cũ.';
 END IF;
END $check$;

-- The existing API accepts a temporary document. Persist only changed relations,
-- keeping scalar context needed by the normalized writers and their validation.
CREATE OR REPLACE FUNCTION vuihoc.ghi_thay_doi_quan_he(p_table text,p_before jsonb,p_after jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE fields jsonb:=p_after; k text;
BEGIN
 IF p_before IS NOT NULL THEN
  FOREACH k IN ARRAY ARRAY['danhsachluachon','danhsachsuco','danhsachtieuchi','danhsachmuc',
   'danhsachkhoi','danhsachmohinh','lichranh','baocaodanhgia','cahochoanthanh','diemtieuchi',
   'dangkymonhoc','lichdangky','danhsachmahocsinh','lichhoc','hoclieu','phancongdaythay',
   'chitietcahoc','cauhinh','cauhoinhanh'] LOOP
   IF p_before->k IS NOT DISTINCT FROM p_after->k THEN fields:=fields-k; END IF;
  END LOOP;
  -- Grade rows contain the teaching-category FK as well as the grade ID.
  IF p_table='GIAO_VIEN' AND p_before->'macaphoc' IS DISTINCT FROM p_after->'macaphoc' THEN
   fields:=fields||jsonb_build_object('danhsachkhoi',p_after->'danhsachkhoi');
  END IF;
 END IF;
 PERFORM vuihoc.ghi_chi_tiet_danh_muc(p_table,fields);
 -- The enrollment writer requires a complete subject registration when called.
 -- A personal-name/phone/grade edit has no registration work to perform.
 IF p_table='HOC_SINH' AND p_before IS NOT NULL AND NOT fields ? 'dangkymonhoc' THEN RETURN; END IF;
 PERFORM vuihoc.ghi_du_lieu_quan_he(p_table,fields);
END $$;

DO $rpc$
DECLARE f text; original_calls text:=$calls$PERFORM vuihoc.ghi_chi_tiet_danh_muc(conf->>'table',v); PERFORM vuihoc.ghi_du_lieu_quan_he(conf->>'table',v);$calls$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'vuihoc.ghi_thay_doi_quan_he')=0 THEN
  IF strpos(f,'update_existing_business_rows')=0 OR strpos(f,original_calls)=0 THEN
   RAISE EXCEPTION 'RPC chưa đúng bản cập nhật quan hệ dự kiến; dừng để tránh sửa nhầm.';
  END IF;
  f:=replace(f,original_calls,'PERFORM vuihoc.ghi_thay_doi_quan_he(conf->>''table'',oldrow,v);');
  EXECUTE f;
 END IF;
END $rpc$;

-- Query the assignments once, then count distinct occupied weekly slots.
-- No stored counts, cache table, materialized view, or cross-product of days.
CREATE OR REPLACE FUNCTION vuihoc.thong_ke_ca_giao_vien(p_teacher text)
RETURNS TABLE(socaranh bigint,socadaxep bigint)
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 WITH assignments AS MATERIALIZED (
  SELECT s.thutrongtuan-1 AS day,split_part(k.khoanggio,'-',1)::time AS starts,split_part(k.khoanggio,'-',2)::time AS ends
  FROM vuihoc."LICH_LOP" s JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=s.malop
  JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=s.makhunggio
  WHERE l.magiaovien=p_teacher AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
  UNION ALL
  SELECT extract(isodow FROM h.ngayhoc)::int-1,h.batdau,h.ketthuc
  FROM vuihoc."BUOI_HOC" h JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=h.malop
  WHERE h.magiaoviendaythay=p_teacher AND l.trangthai NOT IN ('TAM_DUNG','DA_KET_THUC')
   AND h.trangthai NOT IN ('NGHI_HOC','HOAN_THANH','HUY','DA_HOC_CU')
 ), occupied AS MATERIALIZED (
  SELECT DISTINCT k.madinhdanh AS slot,a.day FROM assignments a JOIN vuihoc."KHUNG_GIO" k
   ON a.starts<split_part(k.khoanggio,'-',2)::time AND split_part(k.khoanggio,'-',1)::time<a.ends
 )
 SELECT (SELECT count(*) FROM vuihoc."LICH_RANH_DINH_KY" a
   WHERE a.magiaovien=p_teacher AND a.trangthai='free'
    AND NOT EXISTS(SELECT 1 FROM occupied o WHERE o.slot=a.makhunggio AND o.day=a.thutrongtuan)),
  (SELECT count(*) FROM occupied)
$$;

CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
DECLARE r jsonb; totals record;
BEGIN
 r:=vuihoc.du_lieu_quan_he_truoc_dung_lop(p_table,p_row);
 IF p_table='GIAO_VIEN' AND r IS NOT NULL THEN
  SELECT * INTO totals FROM vuihoc.thong_ke_ca_giao_vien(p_row->>'madinhdanh');
  r:=r||jsonb_build_object('socaranh',totals.socaranh,'socadaxep',totals.socadaxep,
   'dakinlich',totals.socaranh=0 AND totals.socadaxep>0);
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION vuihoc.ghi_thay_doi_quan_he(text,jsonb,jsonb),vuihoc.thong_ke_ca_giao_vien(text)
 FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
