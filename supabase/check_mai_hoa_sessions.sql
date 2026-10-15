-- SELECT only. Inspect the actual Supabase rows; does not change any data.
SELECT g.madinhdanh AS ma_giao_vien, g.hoten,
 b.madinhdanh AS ma_buoi, l.malophoc AS ma_lop, l.tenlophoc,
 b.ngayhoc, b.batdau, b.ketthuc, b.trangthai,
 b.vaolopluc AS check_in, b.ketthucluc AS check_out,
 CASE WHEN b.magiaoviendaythay IS NOT NULL THEN 'Cover' ELSE 'Chính' END AS vai_tro,
 b.lienketphonghoc AS link_cua_buoi,
 l.lienketphonghoc AS link_cua_lop,
 b.lienketbanghi AS link_ban_ghi
FROM vuihoc."BUOI_HOC" b
JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=b.malop
JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=coalesce(b.magiaoviendaythay,b.magiaovienchinh)
WHERE g.hoten ILIKE '%Mai Hoa%'
ORDER BY b.ngayhoc DESC,b.batdau,b.madinhdanh;
