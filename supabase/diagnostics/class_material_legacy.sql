-- Read only before/after 20261126. IDs/reasons only; no automatic resolution.
WITH raw AS (
 SELECT h.malop,coalesce(to_jsonb(h)->>'mahoclieu',to_jsonb(h)->>'thutu') AS id,to_jsonb(h) AS j,
 regexp_match(to_jsonb(h)->>'tuan','^(?:Tuần [0-9]+: *)?Từ ngày ([0-9]{2})/([0-9]{2})/([0-9]{4}) đến ngày ([0-9]{2})/([0-9]{2})/([0-9]{4})$') AS p FROM vuihoc."HOC_LIEU_LOP" h
), numbers AS (
 SELECT *,p[1]::int AS d1,p[2]::int AS m1,p[3]::int AS y1,p[4]::int AS d2,p[5]::int AS m2,p[6]::int AS y2 FROM raw
), dates AS (
 SELECT *,CASE WHEN j ? 'tungay' THEN (j->>'tungay')::date WHEN y1 BETWEEN 1 AND 9999 AND m1 BETWEEN 1 AND 12 THEN
  CASE WHEN d1 BETWEEN 1 AND extract(day FROM make_date(y1,m1,1)+interval '1 month - 1 day') THEN make_date(y1,m1,d1) END END AS starts,
 CASE WHEN j ? 'denngay' THEN (j->>'denngay')::date WHEN y2 BETWEEN 1 AND 9999 AND m2 BETWEEN 1 AND 12 THEN
  CASE WHEN d2 BETWEEN 1 AND extract(day FROM make_date(y2,m2,1)+interval '1 month - 1 day') THEN make_date(y2,m2,d2) END END AS ends FROM numbers
), plans AS (
 SELECT 'HOC_LIEU_LOP'::text AS bang,malop||'/'||id AS madinhdanh,array_remove(ARRAY[
  CASE WHEN starts IS NULL OR ends IS NULL OR ends<starts OR ends-starts>6 THEN 'INVALID_WEEK_DATES' END,
  CASE WHEN j ? 'thang' AND regexp_replace(j->>'thang','^Tháng +','')<>to_char(starts,'MM/YYYY') THEN 'MONTH_DIFFERS_FROM_START' END,
  CASE WHEN EXISTS(SELECT 1 FROM dates b WHERE b.malop=a.malop AND b.id<>a.id AND b.j->>'sobuoi'=a.j->>'sobuoi' AND b.starts<=a.ends AND a.starts<=b.ends) THEN 'OVERLAPPING_PLANS' END
 ],NULL) AS lydo FROM dates a
), lessons AS (
 SELECT 'BUOI_HOC'::text AS bang,b.madinhdanh,array_remove(ARRAY[
  CASE WHEN nullif(j->>'hoclieuslide','') IS NOT NULL AND nullif(j->>'hoclieugiaovien','') IS NOT NULL AND j->>'hoclieuslide'<>j->>'hoclieugiaovien' THEN 'SLIDE_ACTUAL_CONFLICT' END,
  CASE WHEN nullif(j->>'hoclieulms','') IS NOT NULL AND nullif(j->>'baitaplms','') IS NOT NULL AND j->>'hoclieulms'<>j->>'baitaplms' THEN 'LMS_ACTUAL_CONFLICT' END,
  CASE WHEN j->>'mahoclieu' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dates p WHERE p.malop=b.malop AND p.id=j->>'mahoclieu' AND b.ngayhoc BETWEEN p.starts AND p.ends) THEN 'INVALID_PLAN_LINK' END
 ],NULL) AS lydo FROM vuihoc."BUOI_HOC" b CROSS JOIN LATERAL (SELECT to_jsonb(b) AS j) q
)
SELECT * FROM (SELECT * FROM plans UNION ALL SELECT * FROM lessons) q WHERE cardinality(lydo)>0 ORDER BY bang,madinhdanh;
