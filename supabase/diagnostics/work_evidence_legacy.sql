-- Read-only before/after 20261129. No automatic reconciliation or deletion.
WITH source AS (
 SELECT d.madinhdanh,d.macong,
 ARRAY(SELECT btrim(v) FROM regexp_split_to_table(coalesce(to_jsonb(d)->>'lienketminhchung',''),E'[\r\n]+') WITH ORDINALITY AS x(v,n) WHERE btrim(v)<>'' ORDER BY n) AS cu,
 ARRAY(SELECT m.lienket FROM vuihoc."LINK_MINH_CHUNG_CONG" m WHERE m.magiaitrinh=d.madinhdanh ORDER BY m.thutu) AS nguon,
 to_jsonb(d) ? 'lienketminhchung' AS con_cot_cu
 FROM vuihoc."GIAI_TRINH_CONG_DAY" d
), checks AS (
 SELECT madinhdanh,macong,cu,nguon,array_remove(ARRAY[
 CASE WHEN con_cot_cu AND cu IS DISTINCT FROM nguon THEN 'Chuỗi cũ khác danh sách nguồn/thứ tự' END,
 CASE WHEN EXISTS(SELECT 1 FROM unnest(cu||nguon) AS u(link) WHERE link!~'^https?://[^[:space:]]+$') THEN 'Minh chứng không phải liên kết HTTP/HTTPS hợp lệ' END,
 CASE WHEN cardinality(nguon)<>(SELECT count(DISTINCT link) FROM unnest(nguon) AS u(link)) THEN 'Trùng liên kết trong cùng giải trình' END,
 CASE WHEN EXISTS(SELECT 1 FROM vuihoc."LINK_MINH_CHUNG_CONG" m WHERE m.magiaitrinh=source.madinhdanh AND m.thutu<=0) THEN 'Thứ tự minh chứng phải dương' END
 ],NULL) AS lydo FROM source
) SELECT * FROM checks WHERE cardinality(lydo)>0 ORDER BY madinhdanh;
