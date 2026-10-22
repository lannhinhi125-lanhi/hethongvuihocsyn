-- Read-only counts for the schema upgraded through 20261115.
-- Also supports 20261116: teacher-score-copy checked_rows becomes zero after removing the old columns.
-- Outputs no names, contacts, passwords or individual record contents.
-- A difference is a review candidate, NOT proof that the stored value is wrong.
WITH teacher_scores AS (
 SELECT g.madinhdanh,((to_jsonb(g)->>'diemtc1')::numeric,(to_jsonb(g)->>'diemtc2')::numeric,(to_jsonb(g)->>'diemtc3')::numeric) IS DISTINCT FROM (e.diemtc1,e.diemtc2,e.diemtc3) AS differs
 FROM vuihoc."GIAO_VIEN" g LEFT JOIN LATERAL (
  SELECT diemtc1,diemtc2,diemtc3 FROM vuihoc."BIEN_BAN_DU_GIO" e
  WHERE e.magiaovien=g.madinhdanh ORDER BY e.ngaydanhgia DESC,e.madinhdanh DESC LIMIT 1
 ) e ON true WHERE to_jsonb(g) ?| ARRAY['diemtc1','diemtc2','diemtc3']
), student_legacy AS (
 SELECT h.madinhdanh,(to_jsonb(h)->>'mamonhoc',to_jsonb(h)->>'mamohinh',to_jsonb(h)->>'matrinhdo',to_jsonb(h)->>'trangthai',to_jsonb(h)->>'malophientai')
  IS DISTINCT FROM (d->>'subject',d->>'model',d->>'level',d->>'status',d->>'currentClassCode') AS differs
 FROM vuihoc."HOC_SINH" h JOIN LATERAL (
  SELECT vuihoc.dang_ky_mon_truy_van(h.madinhdanh)->0 AS d
 ) q ON true WHERE to_jsonb(h) ? 'mamonhoc'
), intervals AS (
 SELECT k.*,CASE WHEN khoanggio ~ '^([01][0-9]|2[0-3]):[0-5][0-9] *- *([01][0-9]|2[0-3]):[0-5][0-9]$'
  THEN extract(epoch FROM (btrim(split_part(khoanggio,'-',2))::time-btrim(split_part(khoanggio,'-',1))::time))/60 END AS calculated
 FROM vuihoc."KHUNG_GIO" k
), checks AS (
 SELECT '01_GROUP_ACCOUNT_COUNT' AS check_id,'NHOM_QUYEN.soluongnguoidung vs linked account count' AS subject,
  count(*) AS checked_rows,count(*) FILTER(WHERE (to_jsonb(n)->>'soluongnguoidung')::numeric IS DISTINCT FROM (SELECT count(*) FROM vuihoc."NGUOI_DUNG" u WHERE u.manhomquyen=n.madinhdanh)) AS review_rows
 FROM vuihoc."NHOM_QUYEN" n WHERE to_jsonb(n) ? 'soluongnguoidung'
 UNION ALL
 SELECT '02_SLOT_DURATION','KHUNG_GIO.sophut vs khoanggio',count(*),count(*) FILTER(WHERE calculated IS NULL OR calculated<=0 OR sophut IS DISTINCT FROM calculated) FROM intervals
 UNION ALL
 SELECT '03_TEACHER_SCORE_COPY','Teacher stored criterion scores vs latest queried report',count(*),count(*) FILTER(WHERE differs) FROM teacher_scores
 UNION ALL
 SELECT '03_LINKED_CONTACT_COPY','Linked teacher/account names and contact fields',count(*),count(*) FILTER(
  WHERE (to_jsonb(g)->>'hoten',to_jsonb(g)->>'tendangnhap',to_jsonb(g)->>'thudientu',to_jsonb(g)->>'sodienthoai') IS DISTINCT FROM (u.hoten,u.tendangnhap,u.thudientu,u.sodienthoai))
 FROM vuihoc."GIAO_VIEN" g JOIN vuihoc."NGUOI_DUNG" u ON u.madinhdanh=g.manguoidung WHERE to_jsonb(g) ? 'hoten'
 UNION ALL
 SELECT '04_STUDENT_LEGACY_COPY','Single-registration profile mirrors vs first queried registration',count(*),count(*) FILTER(WHERE differs) FROM student_legacy
 UNION ALL
 SELECT '03_INSPECTION_WITHOUT_LESSON','Legacy inspections requiring context reconciliation before removing copies',count(*),count(*) FILTER(WHERE mabuoi IS NULL) FROM vuihoc."BIEN_BAN_DU_GIO"
 UNION ALL
 SELECT '04_CLASS_CAPACITY','Class-specific capacity different from model default: review override policy',count(*),count(*) FILTER(WHERE l.sisotoida IS DISTINCT FROM m.sisotoida)
 FROM vuihoc."LOP_HOC" l JOIN vuihoc."MO_HINH_LOP" m ON m.mamohinh=l.mamohinh
)
SELECT * FROM checks ORDER BY check_id;
