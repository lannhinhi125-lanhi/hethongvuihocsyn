-- Read-only. Run on the current live database to reconcile the next normalization step.
-- Counts contain no student/teacher contact details; no UPDATE/DELETE/DDL is executed.
WITH lesson_clock AS (
 SELECT to_jsonb(b) AS b,to_jsonb(k) AS k
 FROM vuihoc."BUOI_HOC" b LEFT JOIN vuihoc."KHUNG_GIO" k ON k.madinhdanh=b.makhunggio
), counts AS (
 SELECT count(*) FILTER(WHERE b ?& ARRAY['batdau','ketthuc']) AS checked,
 count(*) FILTER(WHERE b ?& ARRAY['batdau','ketthuc'] AND k IS NULL) AS missing_slot,
 count(*) FILTER(WHERE b ?& ARRAY['batdau','ketthuc'] AND k IS NOT NULL AND
  ((b->>'batdau')::time,(b->>'ketthuc')::time) IS DISTINCT FROM ((k->>'giobatdau')::time,(k->>'gioketthuc')::time)) AS differs
 FROM lesson_clock
)
SELECT 'CLOCK_RECONCILIATION' AS loai,'BUOI_HOC → KHUNG_GIO' AS doi_tuong,
 format('checked=%s; missing_slot=%s; different_clocks=%s. Differences require reconciliation; never drop or overwrite them automatically.',checked,missing_slot,differs) AS chitiet
FROM counts
UNION ALL SELECT 'PHYSICAL_COLUMN',c.table_name||'.'||c.column_name,c.data_type||'; generated='||c.is_generated
FROM information_schema.columns c JOIN information_schema.tables t USING(table_catalog,table_schema,table_name)
WHERE c.table_schema='vuihoc' AND t.table_type='BASE TABLE'
 AND ((c.table_name='BUOI_HOC' AND c.column_name IN ('makhunggio','batdau','ketthuc','vaolopluc','ketthucluc'))
 OR (c.table_name='KHUNG_GIO' AND c.column_name IN ('giobatdau','gioketthuc'))
 OR (c.table_name='LICH_RANH_TUAN' AND c.column_name='ngaycuoituan'))
UNION ALL SELECT 'FUNCTION_DEPENDENCY_CANDIDATE',p.oid::regprocedure::text,
 'References BUOI_HOC and clock identifiers; inspect whether it is an active reader/writer before migration.'
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','vuihoc') AND p.prokind='f' AND p.prosrc LIKE '%"BUOI_HOC"%'
 AND p.prosrc ~ '\m(batdau|ketthuc)\M'
ORDER BY 1,2;
