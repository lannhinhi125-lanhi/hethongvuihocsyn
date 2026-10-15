-- Run after 20261018_auto_checkout.sql. Reuse audit timestamps/actors and existing FKs.
BEGIN;
LOCK TABLE vuihoc."HOC_SINH" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS vuihoc."TRUY_VET_XEP_LOP" (
 masu_kien uuid PRIMARY KEY REFERENCES vuihoc."SU_KIEN_NGHIEP_VU"(madinhdanh) ON DELETE RESTRICT,
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 malopcu text REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 malopmoi text REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 CHECK(malopcu IS NOT NULL OR malopmoi IS NOT NULL),
 CHECK(malopcu IS DISTINCT FROM malopmoi)
);
CREATE INDEX IF NOT EXISTS truy_vet_hoc_sinh_idx ON vuihoc."TRUY_VET_XEP_LOP"(mahocsinh);
CREATE INDEX IF NOT EXISTS truy_vet_lop_moi_idx ON vuihoc."TRUY_VET_XEP_LOP"(malopmoi);

CREATE OR REPLACE FUNCTION vuihoc.ghi_truy_vet_xep_lop(p_event uuid,p_before jsonb,p_after jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE student text:=coalesce(p_after->>'madinhdanh',p_before->>'madinhdanh'); oldcode text:=p_before->>'malophientai';
 newcode text:=p_after->>'malophientai'; oldid text; newid text;
BEGIN
 IF oldcode IS NOT DISTINCT FROM newcode OR p_after IS NULL THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."HOC_SINH" WHERE madinhdanh=student) THEN RETURN; END IF;
 SELECT madinhdanh INTO oldid FROM vuihoc."LOP_HOC" WHERE malophoc=oldcode;
 SELECT madinhdanh INTO newid FROM vuihoc."LOP_HOC" WHERE malophoc=newcode;
 -- Deleted legacy references cannot be reconstructed reliably.
 IF (oldcode IS NOT NULL AND oldid IS NULL) OR (newcode IS NOT NULL AND newid IS NULL) THEN RETURN; END IF;
 IF oldid IS NULL AND newid IS NULL THEN RETURN; END IF;
 INSERT INTO vuihoc."TRUY_VET_XEP_LOP" VALUES(p_event,student,oldid,newid) ON CONFLICT DO NOTHING;
END $$;

-- Recover only changes actually evidenced by the existing scalar audit log.
DO $recover$
DECLARE r record;
BEGIN
 FOR r IN
 SELECT e.madinhdanh,k.giatri student,b.giatri oldcode,a.giatri newcode
 FROM vuihoc."SU_KIEN_NGHIEP_VU" e
 JOIN vuihoc."CHI_TIET_NHAT_KY" k ON k.masu_kien=e.madinhdanh AND k.loai='KHOA' AND k.duongdan='/madinhdanh'
 JOIN vuihoc."CHI_TIET_NHAT_KY" a ON a.masu_kien=e.madinhdanh AND a.loai='SAU' AND a.duongdan='/malophientai'
 LEFT JOIN vuihoc."CHI_TIET_NHAT_KY" b ON b.masu_kien=e.madinhdanh AND b.loai='TRUOC' AND b.duongdan='/malophientai'
 WHERE e.tenbang='HOC_SINH' AND e.thaotac IN ('INSERT','UPDATE') AND b.giatri IS DISTINCT FROM a.giatri
 ORDER BY e.thoigian,e.madinhdanh
 LOOP
  PERFORM vuihoc.ghi_truy_vet_xep_lop(r.madinhdanh,jsonb_build_object('madinhdanh',r.student,'malophientai',r.oldcode),
   jsonb_build_object('madinhdanh',r.student,'malophientai',r.newcode));
 END LOOP;
END $recover$;

-- Establish a clearly marked current baseline where no evidence of the current
-- assignment exists. It is NOT an invented historical enrollment or new class.
DO $baseline$
DECLARE r record; event uuid;
BEGIN
 FOR r IN SELECT h.madinhdanh,l.madinhdanh classid FROM vuihoc."HOC_SINH" h JOIN vuihoc."LOP_HOC" l ON l.malophoc=h.malophientai
 WHERE NOT EXISTS(SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" t JOIN vuihoc."SU_KIEN_NGHIEP_VU" e ON e.madinhdanh=t.masu_kien
  WHERE t.mahocsinh=h.madinhdanh AND t.masu_kien=(SELECT t2.masu_kien FROM vuihoc."TRUY_VET_XEP_LOP" t2
   JOIN vuihoc."SU_KIEN_NGHIEP_VU" e2 ON e2.madinhdanh=t2.masu_kien WHERE t2.mahocsinh=h.madinhdanh ORDER BY e2.thoigian DESC,e2.madinhdanh DESC LIMIT 1)
  AND t.malopmoi=l.madinhdanh)
 LOOP
  INSERT INTO vuihoc."SU_KIEN_NGHIEP_VU"(tenbang,thaotac,truongthaydoi)
   VALUES('HOC_SINH','UPDATE',ARRAY['TRUY_VET_HIEN_TRANG']) RETURNING madinhdanh INTO event;
  INSERT INTO vuihoc."TRUY_VET_XEP_LOP" VALUES(event,r.madinhdanh,NULL,r.classid);
 END LOOP;
END $baseline$;

-- Record within the SAME audit event and transaction as the actual assignment.
DO $audit$
DECLARE f text;
BEGIN
 f:=pg_get_functiondef('vuihoc.ghi_nhat_ky_nghiep_vu()'::regprocedure);
 IF position('ghi_truy_vet_xep_lop' IN f)=0 THEN
  f:=replace(f,'PERFORM vuihoc.ghi_chi_tiet_nhat_ky(id,''SAU'',sau);',
   'PERFORM vuihoc.ghi_chi_tiet_nhat_ky(id,''SAU'',sau); IF TG_TABLE_NAME=''HOC_SINH'' THEN PERFORM vuihoc.ghi_truy_vet_xep_lop(id,truoc,sau); END IF;');
  IF position('ghi_truy_vet_xep_lop' IN f)=0 THEN RAISE EXCEPTION 'Không tìm thấy điểm ghi nhật ký học sinh'; END IF;
  EXECUTE f;
 END IF;
END $audit$;

CREATE OR REPLACE FUNCTION vuihoc.lich_su_lop_hoc(p_student text) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('eventId',t.masu_kien,'fromClassId',t.malopcu,'toClassId',t.malopmoi,
  'fromClassCode',oldclass.malophoc,'toClassCode',newclass.malophoc,
  'occurredAt',e.thoigian,'actorId',e.manguoithuchien,'actorName',u.hoten,
  'isBaseline',e.truongthaydoi @> ARRAY['TRUY_VET_HIEN_TRANG'],
  'isInitial',t.malopcu IS NULL AND NOT(e.truongthaydoi @> ARRAY['TRUY_VET_HIEN_TRANG']) AND NOT EXISTS(
   SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" prev JOIN vuihoc."SU_KIEN_NGHIEP_VU" pe ON pe.madinhdanh=prev.masu_kien
   WHERE prev.mahocsinh=t.mahocsinh AND (pe.thoigian,pe.madinhdanh)<(e.thoigian,e.madinhdanh))) ORDER BY e.thoigian,e.madinhdanh),'[]')
 FROM vuihoc."TRUY_VET_XEP_LOP" t JOIN vuihoc."SU_KIEN_NGHIEP_VU" e ON e.madinhdanh=t.masu_kien
 LEFT JOIN vuihoc."LOP_HOC" oldclass ON oldclass.madinhdanh=t.malopcu LEFT JOIN vuihoc."LOP_HOC" newclass ON newclass.madinhdanh=t.malopmoi
 LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=e.manguoithuchien WHERE t.mahocsinh=p_student
$$;
DO $projection$
BEGIN
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_truy_vet(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_truy_vet;
 END IF;
END $projection$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 IF p_table='HOC_SINH' THEN p_row:=p_row||jsonb_build_object('lichsulophoc',vuihoc.lich_su_lop_hoc(p_row->>'madinhdanh')); END IF;
 RETURN vuihoc.du_lieu_quan_he_truoc_truy_vet(p_table,p_row);
END $$;
DO $readonly$
DECLARE f text; conf jsonb:=vuihoc.business_config();
BEGIN
 IF NOT (conf->'students'->'columns' ? 'lichsulophoc') THEN
  conf:=jsonb_set(conf,'{students,columns}',conf->'students'->'columns'||'"lichsulophoc"'::jsonb);
  EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 END IF;
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF position('lichsulophoc_readonly' IN f)=0 THEN
  f:=replace(f,'IF conf IS NULL THEN',$patch$-- lichsulophoc_readonly
  IF coalesce(b,'{}') ? 'lichsulophoc' OR coalesce(v,'{}') ? 'lichsulophoc' THEN RAISE EXCEPTION 'Lịch sử lớp chỉ được truy vấn'; END IF;
  IF conf IS NULL THEN$patch$);
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE k<>''lichsulophoc'' AND');
  EXECUTE f;
 END IF;
END $readonly$;
ALTER TABLE vuihoc."TRUY_VET_XEP_LOP" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."TRUY_VET_XEP_LOP" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."TRUY_VET_XEP_LOP" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.ghi_truy_vet_xep_lop(uuid,jsonb,jsonb),vuihoc.lich_su_lop_hoc(text),
 vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.du_lieu_quan_he_truoc_truy_vet(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
