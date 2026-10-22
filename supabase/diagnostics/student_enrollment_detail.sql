-- Read-only: inspect the unresolved enrollment for DEMO-HS-036.
-- No names, contact information, passwords or changes to live data.
SELECT h.madinhdanh AS mahocsinh,
 jsonb_build_object(
  'mamonhoc',to_jsonb(h)->'mamonhoc',
  'mamohinh',to_jsonb(h)->'mamohinh',
  'matrinhdo',to_jsonb(h)->'matrinhdo',
  'trangthai',to_jsonb(h)->'trangthai',
  'malophientai',to_jsonb(h)->'malophientai'
 ) AS ban_sao_cu_trong_ho_so,
 vuihoc.dang_ky_mon_truy_van(h.madinhdanh) AS nguon_dang_ky,
 (SELECT coalesce(jsonb_agg(jsonb_build_object(
  'mamonhoc',t.mamonhoc,
  'malopcu',t.malopcu,'malopmoi',t.malopmoi,
  'malophoccu',l.malophoc,'trangthailopcu',l.trangthai
 )),'[]'::jsonb)
 FROM vuihoc."TRUY_VET_XEP_LOP" t
 LEFT JOIN vuihoc."LOP_HOC" l ON l.madinhdanh=t.malopcu
 WHERE t.mahocsinh=h.madinhdanh) AS truy_vet_xep_lop
FROM vuihoc."HOC_SINH" h
WHERE h.madinhdanh='DEMO-HS-036';
