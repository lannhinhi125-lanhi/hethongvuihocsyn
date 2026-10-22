-- Read only before/after 20261125. No automatic merging of slot IDs.
WITH source AS (SELECT madinhdanh,to_jsonb(k) AS j FROM vuihoc."KHUNG_GIO" k), parsed AS (
 SELECT *,CASE WHEN j ? 'giobatdau' THEN (j->>'giobatdau')::time
  WHEN j->>'khoanggio' ~ '^\s*([01]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([01]?[0-9]|2[0-3]):[0-5][0-9]\s*$' THEN split_part(j->>'khoanggio','-',1)::time END AS starts,
 CASE WHEN j ? 'gioketthuc' THEN (j->>'gioketthuc')::time
  WHEN j->>'khoanggio' ~ '^\s*([01]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([01]?[0-9]|2[0-3]):[0-5][0-9]\s*$' THEN split_part(j->>'khoanggio','-',2)::time END AS ends FROM source
), facts AS (
 SELECT *,extract(epoch FROM (ends-starts+CASE WHEN ends<starts THEN interval '1 day' ELSE interval '0' END))/60 AS minutes,
 count(*) OVER(PARTITION BY starts,ends) AS same_range FROM parsed
), problems AS (
 SELECT madinhdanh,starts,ends,j->>'sophut' AS sophutcu,minutes AS sophuttruyvan,array_remove(ARRAY[
  CASE WHEN starts IS NULL OR ends IS NULL OR starts=ends OR starts>=time '24:00' OR ends>=time '24:00' OR extract(second FROM starts)<>0 OR extract(second FROM ends)<>0 THEN 'INVALID_RANGE' END,
  CASE WHEN j ? 'sophut' AND (j->>'sophut')::numeric IS DISTINCT FROM minutes THEN 'COPIED_DURATION_DIFFERS' END,
  CASE WHEN same_range>1 THEN 'DUPLICATE_RANGE_IDS' END
 ],NULL) AS lydo FROM facts
)
SELECT * FROM problems WHERE cardinality(lydo)>0 ORDER BY madinhdanh;
