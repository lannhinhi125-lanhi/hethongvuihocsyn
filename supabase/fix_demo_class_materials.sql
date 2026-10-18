-- Repair demo class materials only. No reset and no payroll writes.
DO $materials$
BEGIN
LOCK TABLE vuihoc."HOC_LIEU_LOP" IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM vuihoc."HOC_LIEU_LOP"
 WHERE malop ~ '^DEMO-LOP-0(0[1-9]|1[0-2])$'
 AND thang LIKE 'Tháng %' AND tuan ~ '^Tuần [0-9]+$'
 AND tieude LIKE 'Bộ bài luyện tập tuần %'
 AND lienketslide LIKE 'https://example.com/vuihoc/materials/DEMO-LOP-%';
WITH slots AS (
 SELECT DISTINCT b.malop,date_trunc('week',b.ngayhoc)::date AS monday,l.thutu AS session
 FROM vuihoc."BUOI_HOC" b JOIN vuihoc."LICH_LOP" l
 ON l.malop=b.malop AND l.makhunggio=b.makhunggio AND l.thutrongtuan=extract(isodow FROM b.ngayhoc)
 WHERE b.malop ~ '^DEMO-LOP-0(0[1-9]|1[0-2])$'
), labeled AS (
 SELECT *,to_char(monday,'MM/YYYY') AS month,
 'Tuần '||(floor((extract(day FROM monday)-1)/7)+1)::integer||': Từ ngày '||to_char(monday,'DD/MM/YYYY')||' đến ngày '||to_char(monday+6,'DD/MM/YYYY') AS week
 FROM slots
), missing AS (
 SELECT x.* FROM labeled x WHERE NOT EXISTS(SELECT 1 FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=x.malop AND h.tuan=x.week AND h.sobuoi=x.session)
)
INSERT INTO vuihoc."HOC_LIEU_LOP"(malop,thutu,thang,tuan,sobuoi,tieude,lienketslide,lienketlms)
 SELECT x.malop,coalesce((SELECT max(h.thutu) FROM vuihoc."HOC_LIEU_LOP" h WHERE h.malop=x.malop),0)
 +row_number() OVER(PARTITION BY x.malop ORDER BY x.monday,x.session),x.month,x.week,x.session,
 'Bài học và luyện tập – Buổi '||x.session||' – '||to_char(x.monday,'DD/MM/YYYY'),
 'https://example.com/vuihoc/materials/'||x.malop||'/'||x.monday||'/buoi-'||x.session,
 'https://example.com/vuihoc/lms/'||x.malop||'/'||x.monday||'/buoi-'||x.session
 FROM missing x;
END $materials$;
SELECT l.malophoc,l.tenlophoc,count(h.*) AS so_hoc_lieu
FROM vuihoc."LOP_HOC" l LEFT JOIN vuihoc."HOC_LIEU_LOP" h ON h.malop=l.madinhdanh
WHERE l.madinhdanh ~ '^DEMO-LOP-0(0[1-9]|1[0-2])$'
GROUP BY l.malophoc,l.tenlophoc ORDER BY l.malophoc;
