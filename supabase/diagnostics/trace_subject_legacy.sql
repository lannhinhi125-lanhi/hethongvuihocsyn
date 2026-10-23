-- Read-only before/after 20261208. Empty result means no discrepancy detected.
WITH facts AS (
 SELECT t.madinhdanh,t.malopcu,t.malopmoi,to_jsonb(t) j,o.mamonhoc old_subject,n.mamonhoc new_subject,
  coalesce(n.mamonhoc,o.mamonhoc) source_subject
 FROM vuihoc."TRUY_VET_XEP_LOP" t LEFT JOIN vuihoc."LOP_HOC" o ON o.madinhdanh=t.malopcu
 LEFT JOIN vuihoc."LOP_HOC" n ON n.madinhdanh=t.malopmoi
), checks AS (
 SELECT *,array_remove(ARRAY[
 CASE WHEN source_subject IS NULL THEN 'MISSING_CLASS_SOURCE' END,
 CASE WHEN malopcu IS NOT NULL AND old_subject IS NULL THEN 'MISSING_OLD_CLASS' END,
 CASE WHEN malopmoi IS NOT NULL AND new_subject IS NULL THEN 'MISSING_NEW_CLASS' END,
 CASE WHEN old_subject IS NOT NULL AND new_subject IS NOT NULL AND old_subject IS DISTINCT FROM new_subject THEN 'CROSS_SUBJECT_CLASS_CHANGE' END,
 CASE WHEN j ? 'mamonhoc' AND j->>'mamonhoc' IS DISTINCT FROM source_subject THEN 'LEGACY_SUBJECT_DIFFERS' END
 ],NULL) AS reasons FROM facts
) SELECT madinhdanh,malopcu,malopmoi,j->>'mamonhoc' AS legacy_subject,old_subject,new_subject,source_subject,reasons
FROM checks WHERE cardinality(reasons)>0 ORDER BY madinhdanh;
