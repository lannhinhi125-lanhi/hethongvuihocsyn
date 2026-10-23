-- Read only, before or after 20261204. Do not expose chat text or account secrets.
SELECT 'MULTIPLE_ASSISTANT_CONFIGS' AS kiemtra,count(*) AS so_ban_ghi FROM vuihoc."CAU_HINH_TRO_LY" HAVING count(*)>1
UNION ALL
SELECT 'MULTIPLE_SYSTEM_CONFIGS',count(*) FROM vuihoc."CAU_HINH_HE_THONG" HAVING count(*)>1
UNION ALL
SELECT 'CHAT_OWNER_MISMATCH',count(*) FROM vuihoc."PHIEN_CHAT_AI" p
LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=to_jsonb(p)->>'magiaovien'
WHERE to_jsonb(p)->>'magiaovien' IS NOT NULL AND (g.madinhdanh IS NULL OR g.manguoidung IS DISTINCT FROM p.manguoidung)
HAVING count(*)>0;
