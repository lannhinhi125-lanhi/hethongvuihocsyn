-- Read only before/after 20261124. Returns only identifiers and reconciliation facts.
WITH source AS (
 SELECT l.madinhdanh,l.ngaybatdau,to_jsonb(l) AS j FROM vuihoc."LOP_HOC" l
), facts AS (
 SELECT s.*,q.n,q.months,
  CASE WHEN j ? 'thoihanthang' THEN j->>'thoihanthang' IS NOT NULL ELSE j->>'mathoihan' IS NOT NULL END AS monthly,
  CASE WHEN j ? 'thoihanthang' THEN nullif(j->>'ngayketthuc','')::date ELSE nullif(j->>'ngayketthuctuychinh','')::date END AS stored_end
 FROM source s LEFT JOIN LATERAL (
  SELECT count(*) AS n,max(CASE WHEN m.ma ~ '^[1-9][0-9]{0,2}$' THEN CASE WHEN m.ma::int<=120 THEN m.ma::int END END) AS months
  FROM vuihoc."MUC_DANH_MUC" m JOIN vuihoc."DANH_MUC_BO_SUNG" c ON c.madinhdanh=m.madanhmuc
  WHERE c.madanhmuc='CLASS_DURATION' AND CASE WHEN j ? 'thoihanthang' THEN m.ma=j->>'thoihanthang'
   ELSE (m.madanhmuc,m.madinhdanh)=(j->>'madanhmucthoihan',j->>'mathoihan') END
 ) q ON true
), dates AS (
 SELECT *,CASE WHEN monthly THEN (ngaybatdau+make_interval(months=>months))::date-1 ELSE stored_end END AS effective_end FROM facts
), problems AS (
 SELECT madinhdanh,ngaybatdau,months,stored_end,effective_end,
 array_remove(ARRAY[
  CASE WHEN monthly AND (n<>1 OR months IS NULL) THEN 'CATALOG_NOT_UNIQUE_OR_INVALID' END,
  CASE WHEN monthly AND j ? 'thoihanthang' AND stored_end IS DISTINCT FROM effective_end THEN 'COPIED_END_DATE_DIFFERS' END,
  CASE WHEN monthly AND j->>'ngayketthuctuychinh' IS NOT NULL THEN 'TWO_TERM_SOURCES' END,
  CASE WHEN (monthly OR stored_end IS NOT NULL) AND (ngaybatdau IS NULL OR effective_end<ngaybatdau) THEN 'INVALID_CLASS_DATES' END,
  CASE WHEN EXISTS(SELECT 1 FROM vuihoc."BUOI_HOC" b WHERE b.malop=dates.madinhdanh AND (b.ngayhoc<dates.ngaybatdau OR b.ngayhoc>dates.effective_end)) THEN 'LESSON_OUTSIDE_TERM' END
 ],NULL) AS lydo FROM dates
)
SELECT * FROM problems WHERE cardinality(lydo)>0 ORDER BY madinhdanh;
