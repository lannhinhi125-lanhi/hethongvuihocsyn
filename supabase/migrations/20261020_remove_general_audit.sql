-- Run after 20261018. Also supports an already-applied 20261019.
-- Removes general audit history as requested; preserves class-assignment history.
BEGIN;
LOCK TABLE vuihoc."HOC_SINH",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE;

-- Remove ONLY general audit triggers, preserving all business validation/payroll triggers.
DO $detach$
DECLARE r record;
BEGIN
 FOR r IN SELECT n.nspname,c.relname,t.tgname FROM pg_trigger t
 JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
 WHERE NOT t.tgisinternal AND pn.nspname='vuihoc' AND p.proname='ghi_nhat_ky_nghiep_vu'
 LOOP EXECUTE format('DROP TRIGGER %I ON %I.%I',r.tgname,r.nspname,r.relname); END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='TRUY_VET_XEP_LOP' AND column_name='masu_kien') THEN
  ALTER TABLE vuihoc."TRUY_VET_XEP_LOP" RENAME TO "TRUY_VET_XEP_LOP_SU_KIEN_CU";
 END IF;
END $detach$;

CREATE TABLE IF NOT EXISTS vuihoc."TRUY_VET_XEP_LOP" (
 madinhdanh bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 malopcu text REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 malopmoi text REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 thoigian timestamptz NOT NULL DEFAULT clock_timestamp(),
 manguoithuchien text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 nguon text NOT NULL DEFAULT 'THAO_TAC' CHECK(nguon IN ('THAO_TAC','LICH_SU','HIEN_TRANG')),
 CHECK(malopcu IS NOT NULL OR malopmoi IS NOT NULL), CHECK(malopcu IS DISTINCT FROM malopmoi)
);
CREATE INDEX IF NOT EXISTS truy_vet_doc_lap_hoc_sinh_idx ON vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,thoigian,madinhdanh);
CREATE INDEX IF NOT EXISTS truy_vet_doc_lap_lop_idx ON vuihoc."TRUY_VET_XEP_LOP"(malopmoi,thoigian);

-- Copy trace rows before dropping the old FK/audit tables. No UUID retained.
DO $preserve$
BEGIN
 IF to_regclass('vuihoc."TRUY_VET_XEP_LOP_SU_KIEN_CU"') IS NOT NULL THEN
  INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi,thoigian,manguoithuchien,nguon)
   SELECT t.mahocsinh,t.malopcu,t.malopmoi,e.thoigian,e.manguoithuchien,
    CASE WHEN e.truongthaydoi @> ARRAY['TRUY_VET_HIEN_TRANG'] THEN 'HIEN_TRANG' ELSE 'LICH_SU' END
   FROM vuihoc."TRUY_VET_XEP_LOP_SU_KIEN_CU" t JOIN vuihoc."SU_KIEN_NGHIEP_VU" e ON e.madinhdanh=t.masu_kien
   ORDER BY e.thoigian,e.madinhdanh;
 ELSIF to_regclass('vuihoc."SU_KIEN_NGHIEP_VU"') IS NOT NULL THEN
  -- For installations which did not apply 20261019: recover existing evidence directly.
  INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi,thoigian,manguoithuchien,nguon)
   SELECT h.madinhdanh,oldclass.madinhdanh,newclass.madinhdanh,e.thoigian,e.manguoithuchien,'LICH_SU'
   FROM vuihoc."SU_KIEN_NGHIEP_VU" e
   JOIN vuihoc."CHI_TIET_NHAT_KY" k ON k.masu_kien=e.madinhdanh AND k.loai='KHOA' AND k.duongdan='/madinhdanh'
   JOIN vuihoc."HOC_SINH" h ON h.madinhdanh=k.giatri
   JOIN vuihoc."CHI_TIET_NHAT_KY" a ON a.masu_kien=e.madinhdanh AND a.loai='SAU' AND a.duongdan='/malophientai'
   LEFT JOIN vuihoc."CHI_TIET_NHAT_KY" b ON b.masu_kien=e.madinhdanh AND b.loai='TRUOC' AND b.duongdan='/malophientai'
   LEFT JOIN vuihoc."LOP_HOC" oldclass ON oldclass.malophoc=b.giatri
   LEFT JOIN vuihoc."LOP_HOC" newclass ON newclass.malophoc=a.giatri
   WHERE e.tenbang='HOC_SINH' AND e.thaotac IN ('INSERT','UPDATE') AND b.giatri IS DISTINCT FROM a.giatri
    AND (b.giatri IS NULL OR oldclass.madinhdanh IS NOT NULL) AND (a.giatri IS NULL OR newclass.madinhdanh IS NOT NULL)
    AND (oldclass.madinhdanh IS NOT NULL OR newclass.madinhdanh IS NOT NULL)
   ORDER BY e.thoigian,e.madinhdanh;
 END IF;
END $preserve$;

-- Current baseline only for missing evidence; never invent a historical enrollment date.
INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopmoi,nguon)
 SELECT h.madinhdanh,l.madinhdanh,'HIEN_TRANG' FROM vuihoc."HOC_SINH" h
 JOIN vuihoc."LOP_HOC" l ON l.malophoc=h.malophientai
 WHERE NOT EXISTS(SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" t WHERE t.mahocsinh=h.madinhdanh
  AND t.madinhdanh=(SELECT t2.madinhdanh FROM vuihoc."TRUY_VET_XEP_LOP" t2 WHERE t2.mahocsinh=h.madinhdanh ORDER BY t2.thoigian DESC,t2.madinhdanh DESC LIMIT 1)
  AND t.malopmoi=l.madinhdanh);

CREATE OR REPLACE FUNCTION vuihoc.ghi_chuyen_lop_hoc_sinh() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE oldcode text; oldid text; newid text; actor text:=nullif(current_setting('vuihoc.actor',true),'');
BEGIN
 IF TG_OP='UPDATE' THEN oldcode:=OLD.malophientai; END IF;
 IF oldcode IS NOT DISTINCT FROM NEW.malophientai THEN RETURN NEW; END IF;
 SELECT madinhdanh INTO oldid FROM vuihoc."LOP_HOC" WHERE malophoc=oldcode;
 SELECT madinhdanh INTO newid FROM vuihoc."LOP_HOC" WHERE malophoc=NEW.malophientai;
 INSERT INTO vuihoc."TRUY_VET_XEP_LOP"(mahocsinh,malopcu,malopmoi,manguoithuchien)
 VALUES(NEW.madinhdanh,oldid,newid,actor);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ghi_chuyen_lop_hoc_sinh ON vuihoc."HOC_SINH";
CREATE TRIGGER ghi_chuyen_lop_hoc_sinh AFTER INSERT OR UPDATE OF malophientai ON vuihoc."HOC_SINH"
FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_chuyen_lop_hoc_sinh();

CREATE OR REPLACE FUNCTION vuihoc.lich_su_lop_hoc(p_student text) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('traceId',t.madinhdanh::text,
  'fromClassId',t.malopcu,'toClassId',t.malopmoi,'fromClassCode',oldclass.malophoc,'toClassCode',newclass.malophoc,
  'occurredAt',t.thoigian,'actorId',t.manguoithuchien,'actorName',u.hoten,'isBaseline',t.nguon='HIEN_TRANG',
  'isInitial',t.malopcu IS NULL AND t.nguon<>'HIEN_TRANG' AND NOT EXISTS(
   SELECT 1 FROM vuihoc."TRUY_VET_XEP_LOP" prev WHERE prev.mahocsinh=t.mahocsinh
    AND (prev.thoigian,prev.madinhdanh)<(t.thoigian,t.madinhdanh))) ORDER BY t.thoigian,t.madinhdanh),'[]')
 FROM vuihoc."TRUY_VET_XEP_LOP" t LEFT JOIN vuihoc."LOP_HOC" oldclass ON oldclass.madinhdanh=t.malopcu
 LEFT JOIN vuihoc."LOP_HOC" newclass ON newclass.madinhdanh=t.malopmoi
 LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=t.manguoithuchien WHERE t.mahocsinh=p_student
$$;

-- Read projection/readonly contract, also installed when 20261019 was skipped.
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
  f:=replace(f,'FROM jsonb_object_keys(v) k WHERE','FROM jsonb_object_keys(v) k WHERE k<>''lichsulophoc'' AND'); EXECUTE f;
 END IF;
END $readonly$;

-- No CASCADE: an unexpected dependency aborts the transaction instead of
-- silently removing an unrelated business object.
DROP VIEW IF EXISTS vuihoc."NHAT_KY_NGHIEP_VU";
DROP FUNCTION IF EXISTS vuihoc.ghi_nhat_ky_nghiep_vu();
DROP FUNCTION IF EXISTS vuihoc.ghi_chi_tiet_nhat_ky(uuid,text,jsonb);
DROP FUNCTION IF EXISTS vuihoc.ghi_truy_vet_xep_lop(uuid,jsonb,jsonb);
DROP TABLE IF EXISTS vuihoc."TRUY_VET_XEP_LOP_SU_KIEN_CU";
DROP TABLE IF EXISTS vuihoc."CHI_TIET_NHAT_KY";
DROP TABLE IF EXISTS vuihoc."SU_KIEN_NGHIEP_VU";

ALTER TABLE vuihoc."TRUY_VET_XEP_LOP" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."TRUY_VET_XEP_LOP" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."TRUY_VET_XEP_LOP" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.ghi_chuyen_lop_hoc_sinh(),vuihoc.lich_su_lop_hoc(text),
 vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.du_lieu_quan_he_truoc_truy_vet(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
