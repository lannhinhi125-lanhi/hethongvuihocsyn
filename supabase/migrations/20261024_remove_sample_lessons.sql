-- Run after 20261023. Remove sample lesson data, not teachers/students/classes or evaluation reports.
-- Transactions abort rather than overriding locked payroll or unknown foreign keys.
DO $cleanup$
DECLARE
 v_sample_class_ids text[];
 v_sample_lesson_ids text[];
 v_trigger_mode "char";
BEGIN
LOCK TABLE vuihoc."BUOI_HOC",vuihoc."LOP_HOC" IN SHARE ROW EXCLUSIVE MODE;
SELECT coalesce(array_agg(l.madinhdanh),ARRAY[]::text[]) INTO v_sample_class_ids FROM vuihoc."LOP_HOC" l
JOIN (VALUES
 ('CLS-1250','TOAN_K04_VIP_1250'),('CLS-001','TOAN_K03_NT2_13_01'),('CLS-002','ENG_K04_NC_11_01'),
 ('CLS-DEMO-MATH-T7','TOAN_K03_DEMO_T7'),('CLS-DEMO-ENG-T7','ENG_K04_DEMO_T7'),
 ('TEST-CLS-1250','TEST-TOAN_K04_VIP_1250'),('TEST-CLS-001','TEST-TOAN_K03_NT2_13_01'),('TEST-CLS-002','TEST-ENG_K04_NC_11_01'),
 ('TEST-CLS-DEMO-MATH-T7','TEST-TOAN_K03_DEMO_T7'),('TEST-CLS-DEMO-ENG-T7','TEST-ENG_K04_DEMO_T7')
) seed(id,code) ON l.madinhdanh=seed.id AND l.malophoc=seed.code;
SELECT coalesce(array_agg(b.madinhdanh),ARRAY[]::text[]) INTO v_sample_lesson_ids FROM vuihoc."BUOI_HOC" b
JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
WHERE b.malop=ANY(v_sample_class_ids) AND (b.lienketphonghoc ~ '^https?://example[.]com(/|$)'
 OR (coalesce(b.lienketphonghoc,'')='' AND l.lienketphonghoc ~ '^https?://example[.]com(/|$)'));
 IF EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b
 JOIN vuihoc."BANG_CONG_THANG" p ON p.kycong=to_char(b.ngayhoc,'YYYY-MM') WHERE b.madinhdanh=ANY(v_sample_lesson_ids) AND p.dakhoa) THEN
  RAISE EXCEPTION 'Buổi mẫu nằm trong kỳ công đã khóa. Mở kỳ công liên quan trên màn hình trước khi chạy lại.';
 END IF;
-- Preserve every evaluation report; only detach references to lessons being removed.
UPDATE vuihoc."BIEN_BAN_DU_GIO" e SET mabuoi=NULL,macahoc=NULL
WHERE e.mabuoi =ANY(v_sample_lesson_ids)
 OR e.macahoc =ANY(v_sample_lesson_ids);
DELETE FROM vuihoc."PHAN_CONG_DAY_THAY" WHERE mabuoi =ANY(v_sample_lesson_ids);
DELETE FROM vuihoc."CHI_TIET_CA_LOP" WHERE mabuoi =ANY(v_sample_lesson_ids);
DELETE FROM vuihoc."DIEM_DANH_BUOI_HOC" WHERE mabuoi =ANY(v_sample_lesson_ids);
-- This guard normally preserves the comment roster after check-in. Here the whole
-- explicitly identified sample lesson is removed, including its sample work credit.
SELECT tgenabled INTO STRICT v_trigger_mode FROM pg_trigger WHERE tgrelid='vuihoc."NHAN_XET_BUOI_HOC"'::regclass AND tgname='ghi_cong_khi_luu_nhan_xet';
ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" DISABLE TRIGGER ghi_cong_khi_luu_nhan_xet;
DELETE FROM vuihoc."NHAN_XET_BUOI_HOC" WHERE mabuoi =ANY(v_sample_lesson_ids);
EXECUTE format('ALTER TABLE vuihoc."NHAN_XET_BUOI_HOC" %s TRIGGER ghi_cong_khi_luu_nhan_xet',
 CASE v_trigger_mode WHEN 'D' THEN 'DISABLE' WHEN 'R' THEN 'ENABLE REPLICA' WHEN 'A' THEN 'ENABLE ALWAYS' ELSE 'ENABLE' END);

DELETE FROM vuihoc."LINK_MINH_CHUNG_CONG" WHERE magiaitrinh IN (
 SELECT d.madinhdanh FROM vuihoc."GIAI_TRINH_CONG_DAY" d JOIN vuihoc."CONG_DAY_BUOI_HOC" c ON c.madinhdanh=d.macong
 WHERE c.mabuoi =ANY(v_sample_lesson_ids));
DELETE FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE macong IN (
 SELECT madinhdanh FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi =ANY(v_sample_lesson_ids));
DELETE FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi =ANY(v_sample_lesson_ids);
DELETE FROM vuihoc."SU_CO_BUOI_HOC" WHERE mabuoi =ANY(v_sample_lesson_ids);
DELETE FROM vuihoc."BUOI_HOC" WHERE madinhdanh =ANY(v_sample_lesson_ids);
-- Remove placeholder materials/room URLs so future scheduled lessons do not inherit sample links.
DELETE FROM vuihoc."HOC_LIEU_LOP" WHERE malop =ANY(v_sample_class_ids)
 AND (lienketslide ~ '^https?://example[.]com(/|$)' OR lienketlms ~ '^https?://example[.]com(/|$)');
UPDATE vuihoc."LOP_HOC" SET lienketphonghoc=''
WHERE madinhdanh =ANY(v_sample_class_ids) AND lienketphonghoc ~ '^https?://example[.]com(/|$)';
RAISE NOTICE 'Removed % sample lessons',cardinality(v_sample_lesson_ids);
END $cleanup$;
