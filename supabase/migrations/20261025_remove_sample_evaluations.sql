-- Run after 20261024. One atomic statement; no temporary tables or stored JSON.
DO $cleanup$
DECLARE n integer;
BEGIN
 LOCK TABLE vuihoc."BIEN_BAN_DU_GIO",vuihoc."GIAO_VIEN" IN SHARE ROW EXCLUSIVE MODE;
 -- Exact seed identifiers AND their original content. User-edited reports survive.
 DELETE FROM vuihoc."BIEN_BAN_DU_GIO" e
 WHERE (e.madinhdanh IN ('EVAL-GV-001','EVAL-GV-002','TEST-EVAL-GV-001','TEST-EVAL-GV-002')
   AND e.nhanxetchung='Dữ liệu mẫu: tổ chức bài học rõ ràng.' AND e.ngaydanhgia=date '2026-10-11'
   AND e.diemtong=9 AND e.diemtc1=9 AND e.diemtc2=9 AND e.diemtc3=9)
 OR (e.madinhdanh='TEST-EVALUATION-001' AND e.mabienban='TEST-BBDG-2026-001'
   AND e.nhanxetchung='Bai giang ro rang, hoc sinh tham gia tot.' AND e.ngaydanhgia=date '2026-10-11'
   AND e.diemtong=9 AND e.diemtc1=9 AND e.diemtc2=9 AND e.diemtc3=9);
 GET DIAGNOSTICS n=ROW_COUNT;
 -- Clear stale seed summaries; real remaining reports remain the authoritative source.
 WITH latest AS (
  SELECT DISTINCT ON (magiaovien) magiaovien,diemtong,nhanxetchung,diemtc1,diemtc2,diemtc3
  FROM vuihoc."BIEN_BAN_DU_GIO" ORDER BY magiaovien,ngaydanhgia DESC,madinhdanh DESC
 ), summaries AS (
  SELECT g.madinhdanh,CASE WHEN e.magiaovien IS NULL THEN 'UNSCORED' ELSE 'SCORED' END AS status,
   e.diemtong::text AS score,coalesce(e.nhanxetchung,'') AS comment,e.diemtc1,e.diemtc2,e.diemtc3
  FROM vuihoc."GIAO_VIEN" g LEFT JOIN latest e ON e.magiaovien=g.madinhdanh
 )
 UPDATE vuihoc."GIAO_VIEN" g SET trangthaidanhgia=s.status,diemdanhgia=s.score,nhanxetdanhgia=s.comment,
  diemtc1=s.diemtc1,diemtc2=s.diemtc2,diemtc3=s.diemtc3 FROM summaries s
 WHERE g.madinhdanh=s.madinhdanh AND
 (g.trangthaidanhgia,g.diemdanhgia,g.nhanxetdanhgia,g.diemtc1,g.diemtc2,g.diemtc3)
 IS DISTINCT FROM (s.status,s.score,s.comment,s.diemtc1,s.diemtc2,s.diemtc3);
 RAISE NOTICE 'Removed % sample inspection reports and refreshed evaluation summaries',n;
END $cleanup$;
