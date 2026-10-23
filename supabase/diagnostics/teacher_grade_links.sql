-- Read-only before/after 20261205; no personal names or account secrets.
WITH links AS (
 SELECT k.magiaovien,
 coalesce(to_jsonb(k)->>'macaphoc',c.macaphoc) AS macaphoc,
 coalesce(to_jsonb(k)->>'makhoi',c.madinhdanh) AS makhoi
 FROM vuihoc."GIAO_VIEN_KHOI" k
 LEFT JOIN vuihoc."LUA_CHON_CAP_HOC" c ON
 CASE WHEN to_jsonb(k) ? 'maluachon'
 THEN to_jsonb(c)->>'maluachon'=to_jsonb(k)->>'maluachon'
 ELSE (c.macaphoc,c.madinhdanh)=(to_jsonb(k)->>'macaphoc',to_jsonb(k)->>'makhoi') END
)
SELECT count(*) AS tong_lien_ket,
 count(*) FILTER (WHERE l.macaphoc IS DISTINCT FROM g.macaphoc OR l.makhoi IS NULL) AS can_doi_soat
FROM links l LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=l.magiaovien;
