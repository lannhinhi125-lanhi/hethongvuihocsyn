-- Phase 1: remove redundant teacher inspection summaries. Apply after 20261115.
-- Run this entire file as one atomic statement. No data is fabricated or discarded silently.
DO $normalize_teacher_evaluations$
DECLARE pending text; f text; conf jsonb; removed text[]:=ARRAY['trangthaidanhgia','diemdanhgia','nhanxetdanhgia','diemtc1','diemtc2','diemtc3','diemtieuchi'];
BEGIN
 LOCK TABLE vuihoc."GIAO_VIEN",vuihoc."BIEN_BAN_DU_GIO" IN SHARE ROW EXCLUSIVE MODE;
 SET CONSTRAINTS ALL IMMEDIATE;
 WITH legacy AS (
 SELECT g.madinhdanh,to_jsonb(g) AS old FROM vuihoc."GIAO_VIEN" g
), unmatched AS (
 SELECT * FROM legacy g WHERE (
  g.old->>'diemtc1' IS NOT NULL OR g.old->>'diemtc2' IS NOT NULL OR g.old->>'diemtc3' IS NOT NULL
  OR nullif(btrim(g.old->>'diemdanhgia'),'') IS NOT NULL
  OR nullif(btrim(g.old->>'nhanxetdanhgia'),'') IS NOT NULL
  OR g.old->>'trangthaidanhgia'='SCORED'
 ) AND NOT EXISTS (
  SELECT 1 FROM vuihoc."BIEN_BAN_DU_GIO" e WHERE e.magiaovien=g.madinhdanh
  AND (g.old->>'diemtc1' IS NULL OR e.diemtc1=(g.old->>'diemtc1')::numeric)
  AND (g.old->>'diemtc2' IS NULL OR e.diemtc2=(g.old->>'diemtc2')::numeric)
  AND (g.old->>'diemtc3' IS NULL OR e.diemtc3=(g.old->>'diemtc3')::numeric)
  AND (nullif(btrim(g.old->>'diemdanhgia'),'') IS NULL OR CASE
    WHEN btrim(g.old->>'diemdanhgia') ~ '^[0-9]+([.][0-9]+)?$'
    THEN e.diemtong=btrim(g.old->>'diemdanhgia')::numeric ELSE false END)
  AND (nullif(btrim(g.old->>'nhanxetdanhgia'),'') IS NULL OR btrim(e.nhanxetchung)=btrim(g.old->>'nhanxetdanhgia'))
 )
)

 SELECT string_agg(madinhdanh,', ' ORDER BY madinhdanh) INTO pending FROM unmatched;
 IF pending IS NOT NULL THEN
  RAISE EXCEPTION 'Còn điểm hoặc nhận xét giáo viên chưa có biên bản tương ứng; chưa xóa cột nào.'
   USING DETAIL=pending,HINT='Chạy supabase/diagnostics/teacher_evaluation_legacy_check.sql để đối soát dữ liệu cũ trước.';
 END IF;

 -- Keep the existing relation writer for inspection records, never teacher summary columns.
 f:=pg_get_functiondef('vuihoc.ghi_cac_truong_con(text,jsonb,boolean)'::regprocedure);
 f:=replace(f,$old$p_table IN ('GIAO_VIEN','BIEN_BAN_DU_GIO')$old$,$new$p_table='BIEN_BAN_DU_GIO'$new$);
 EXECUTE f;

 f:=pg_get_functiondef('public.vuihoc_create_teacher(text,jsonb)'::regprocedure);
 f:=replace(f,'trangthai,trangthaidanhgia,nhanxetdanhgia,socaranh','trangthai,socaranh');
 f:=replace(f,$old$'CHO_LOP','UNSCORED','',0,0,false$old$,$new$'CHO_LOP',0,0,false$new$);
 IF strpos(f,'trangthaidanhgia')>0 OR strpos(f,'nhanxetdanhgia')>0 THEN
  RAISE EXCEPTION 'Chưa chuyển được hàm tạo giáo viên; giao dịch đã hoàn tác.';
 END IF;
 EXECUTE f;
 f:=pg_get_functiondef('vuihoc.du_lieu_quan_he_truoc_khoa_ngoai(text,jsonb)'::regprocedure);
 f:=replace(f,$old$p_table IN ('GIAO_VIEN','BIEN_BAN_DU_GIO')$old$,$new$p_table='BIEN_BAN_DU_GIO'$new$);
 EXECUTE f;

 -- These summary keys cease to be writable fields in the business API.
 -- The full inspection history is still queried through baocaodanhgia with magiaovien.
 conf:=vuihoc.business_config();
 conf:=jsonb_set(conf,'{teachers,columns}',coalesce((SELECT jsonb_agg(value ORDER BY ordinality)
  FROM jsonb_array_elements(conf->'teachers'->'columns') WITH ORDINALITY
  WHERE NOT(value#>>'{}'=ANY(removed))),'[]'::jsonb));
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');

 ALTER TABLE vuihoc."GIAO_VIEN"
  DROP COLUMN IF EXISTS diemtc1,
  DROP COLUMN IF EXISTS diemtc2,
  DROP COLUMN IF EXISTS diemtc3,
  DROP COLUMN IF EXISTS diemdanhgia,
  DROP COLUMN IF EXISTS nhanxetdanhgia,
  DROP COLUMN IF EXISTS trangthaidanhgia;
 -- No CASCADE: an unexpected view/constraint dependency aborts the entire migration.
 NOTIFY pgrst,'reload schema';
END $normalize_teacher_evaluations$;
