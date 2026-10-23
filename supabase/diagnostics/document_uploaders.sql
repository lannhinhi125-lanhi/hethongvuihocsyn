-- Read-only after 20261203. Unknown historical uploaders are not errors.
SELECT count(*) AS tong_tailieu,
 count(*) FILTER (WHERE d.manguoitailen IS NULL) AS chua_xac_dinh_nguoi_tai,
 count(*) FILTER (WHERE d.manguoitailen IS NOT NULL AND u.madinhdanh IS NULL) AS lien_ket_loi
FROM vuihoc."TAI_LIEU_QUY_TRINH" d
LEFT JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=d.manguoitailen;
