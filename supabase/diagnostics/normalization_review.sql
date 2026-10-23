-- Read-only metadata review. Run the whole statement in Supabase SQL Editor.
-- A repeated column name is not itself a normalization defect.
-- REVIEW means investigate its source/write path; it does NOT authorize dropping it.
WITH rules(table_name,fields,module,priority,source,reason) AS (
 VALUES
 ('BUOI_HOC',ARRAY['batdau','ketthuc'],'04 Buổi học ↔ 02 Khung giờ',1,
  'KHUNG_GIO.giobatdau/gioketthuc through BUOI_HOC.makhunggio',
  'Confirmed business rule: lesson start/end are the referenced slot clocks, not independent lesson facts. Reconcile mismatches, move every reader/writer to the slot source, then remove the copied clocks.'),
 ('LICH_RANH_TUAN',ARRAY['ngaycuoituan'],'03 Lịch rảnh tuần',3,
  'ngaydautuan + 6; currently a stored generated column',
  'Controlled derived value, not independently writable. Move to a query projection if the no-stored-derived-values requirement is applied; do not drop its dependent validation blindly.'),
 ('TRUY_VET_XEP_LOP',ARRAY['mamonhoc'],'04 Truy vết xếp lớp',2,
  'LOP_HOC.mamonhoc through coalesce(malopmoi,malopcu), if the subject is the class subject rather than an independent historical registration fact',
  'Current backfill derives this from the referenced class, while trace writers also store it. Reconcile old/new class subjects and confirm its historical semantics before deciding to remove the column.'),
 ('GIAO_VIEN_KHOI',ARRAY['macaphoc','makhoi'],'03 Khối được dạy',2,
  'GIAO_VIEN_KHOI.maluachon → LUA_CHON_CAP_HOC after 20261205; V_GIAO_VIEN_KHOI projects scoped codes',
  'The legacy category is determined by the teacher, a proper subset of the composite key; replace the copied scoped pair with one catalog FK after reconciliation.'),
 ('PHIEN_CHAT_AI',ARRAY['magiaovien'],'06 Lịch sử chat',2,
  'NGUOI_DUNG owner; optional teacher profile through GIAO_VIEN.manguoidung after 20261204',
  'Account-scoped history must not store another current teacher mapping; reconcile mismatches before dropping the legacy mirror.'),
 ('BIEN_BAN_DU_GIO',ARRAY['magiaovien','malophoc','manguoinhan','ngaycahoc','macahoc','sobuoi','tenbuoihoc','khunggio','mohinh','diemtong','xeploai','lienketphonghoc','lienketbanghi'],'03 Dự giờ',1,
  'V_BIEN_BAN_DU_GIO after 20261127: BUOI_HOC + LOP_HOC + CHI_TIET_CA_LOP + GIAO_VIEN; scores queried from criteria',
  'Legacy copies must match source before removal. Normalized reports keep a required lesson FK and independent evaluation facts only.'),
 ('GIAO_VIEN',ARRAY['diemtc1','diemtc2','diemtc3','diemdanhgia','nhanxetdanhgia','trangthaidanhgia'],'03 Giáo viên / dự giờ',1,
  'BIEN_BAN_DU_GIO → magiaovien',
  'Teacher display summaries already come from queried inspection reports. Reconcile legacy values and remove their read/write dependencies before dropping redundant summary columns.'),
 ('GIAO_VIEN',ARRAY['socaranh','socadaxep','dakinlich'],'03 Giáo viên / lịch',1,
  'thong_ke_ca_giao_vien; LICH_RANH_DINH_KY, LICH_LOP, BUOI_HOC',
  'Current reader computes these values; physical columns can retain stale values.'),
 ('HOC_SINH',ARRAY['mamonhoc','mamohinh','matrinhdo','malophientai','trangthai'],'04 Học sinh / đăng ký',1,
  'DANG_KY_MON_HOC + LOP_HOC',
  'Legacy single-registration fields coexist with multiple subject registrations. Current reader projects the first registration into these fields; old validation/writers still require review.'),
 ('NHOM_QUYEN',ARRAY['soluongnguoidung'],'01 Tài khoản / quyền',1,
  'COUNT NGUOI_DUNG by manhomquyen',
  'UI counts linked accounts instead of using this stored total.'),
 ('GIAO_VIEN',ARRAY['hoten','tendangnhap','sodienthoai','thudientu'],'01 Tài khoản ↔ 03 Giáo viên',2,
  'NGUOI_DUNG through GIAO_VIEN.manguoidung when linked',
  'Contact data is stored twice and synchronized. Unlinked teacher profiles are supported; do not drop without preserving them.'),
 ('NGUOI_DUNG',ARRAY['vaitro','mamonhoc','chucaiavatar'],'01 Tài khoản / quyền',2,
  'NHOM_QUYEN, GIAO_VIEN, NGUOI_DUNG.hoten (depending on field semantics)',
  'Review legacy role/subject/display mirrors separately from account-specific facts and permissions.'),
 ('KHUNG_GIO',ARRAY['khoanggio','sophut'],'02 Danh mục',2,
  'One authoritative start/end interval',
  'Duration is determined by the interval but is independently stored. Verify equality and prefer a generated/query value or a database consistency rule.'),
 ('KHUNG_GIO',ARRAY['giobatdau','gioketthuc'],'02 Danh mục',3,
  'KHUNG_GIO typed source clocks after 20261125',
  'V_KHUNG_GIO queries range/duration. The slot is the agreed source for lesson clocks; independent check-in/check-out timestamps remain lesson facts.'),
 ('HOC_LIEU_LOP',ARRAY['mahoclieu','tungay','denngay','sobuoi','tieude','lienketslide','lienketlms'],'04 Kế hoạch học liệu',3,
  'HOC_LIEU_LOP scoped key malop–mahoclieu after 20261126',
  'Month/week labels are queries. BUOI_HOC holds a scoped plan FK and only distinct actual material overrides; used source plans are protected.'),
 ('LOP_HOC',ARRAY['sisotoida'],'02 Danh mục ↔ 04 Lớp',2,
  'MO_HINH_LOP.sisotoida or an explicit per-class capacity override',
  'Decide whether this is an intentional class-specific limit or a copy of the catalog default.'),
 ('CHI_TIET_CA_LOP',ARRAY['malop','sobuoi','ngaygio','tieude','giovaohienthi','hotennguoivao','hoclieugiaovien','hoclieuhocsinh','baitaplms','magiaoviendaythay'],'04 Lớp / buổi / học liệu',2,
  'BUOI_HOC through mabuoi; HOC_LIEU_LOP; linked actor',
  'Compatibility table overlaps actual lesson data. Inspect both writers and historical/material semantics before consolidation.'),
 ('PHAN_CONG_DAY_THAY',ARRAY['malop','sobuoi','ngaygio','magiaovien'],'05 Dạy thay ↔ 04 Buổi',2,
  'BUOI_HOC.magiaoviendaythay through mabuoi',
  'Current cover assignment is represented in both tables. Existing triggers synchronize them; synchronization alone is not strict normalization.'),
 ('GIAI_TRINH_CONG_DAY',ARRAY['lienketminhchung'],'07 Giải trình',2,
  'V_GIAI_TRINH_CONG_DAY aggregates LINK_MINH_CHUNG_CONG by magiaitrinh after 20261129',
  'Legacy text must match ordered source links before removal. The normalized writer stores one row per actual evidence link and does not persist another list.'),
 ('SU_CO_BUOI_HOC',ARRAY['tensuco'],'05 Sự cố',2,
  'V_SU_CO_BUOI_HOC JOIN LOAI_SU_CO through (manhomsuco,masuco) after 20261128',
  'Legacy name conflicts must be reconciled before removal. After normalization, screens, payroll and reports query one catalog name; no copy is written to incident rows.'),
 ('SU_CO_BUOI_HOC',ARRAY['hesocongapdung'],'05 Sự cố ↔ 07 Công',3,
  'Applied incident coefficient, with configured catalog synchronization and payroll locks',
  'Applied business value has a different lifecycle from the current catalog default. Preserve closed-period rules.'),
 ('CONG_DAY_BUOI_HOC',ARRAY['kycong','vaitro'],'07 Công / đối soát',2,
  'V_CONG_DAY_BUOI_HOC JOIN BUOI_HOC after 20261130',
  'Month comes from the immutable credited lesson date; role comes from that lesson and the credited teacher. Legacy differences stop migration before removal.'),
 ('CONG_DAY_BUOI_HOC',ARRAY['hesocong','magiaovien','loaicong','trangthaidoisoat'],'07 Công / đối soát',3,
  'Actual credited work row and reconciliation workflow',
  'Actual credited work may differ after approved adjustments or explanations. Do not replace it with a live join to current defaults.'),
 ('BUOI_HOC',ARRAY['magiaovienchinh','magiaoviendaythay','lienketphonghoc','hoclieutieude','hoclieuslide','hoclieulms'],'04 Buổi học',3,
  'The scheduled/actual lesson at its own date',
  'Lesson facts can differ from the current class schedule/material template. Historical scope must be retained.'),
 ('BUOI_HOC',ARRAY['tamhoandolop','manhomtamdung','lydotamdung','ghichutamdung','batdautamdung'],'04 Tạm dừng ↔ 05 Sự cố',3,
  'The pause affecting this lesson, referencing LOAI_SU_CO',
  'Past cancelled lessons must retain their classification after the class resumes; these are not just mirrors of the current class flag.'),
 ('LOP_HOC',ARRAY['ngayketthuc','thoihanthang'],'04 Thời hạn lớp',3,
  'Configured month duration or an explicit custom end date',
  'End date may be custom; do not assume it is always derivable from month duration.'),
 ('LICH_SU_DANG_KY_HOC',ARRAY['mamonhoc','matrinhdo','mamohinh','khoi','trangthai'],'04 Lịch sử đăng ký',3,
  'The closed registration period identified by dotdangky',
  'Different periods are different facts. Retain past requirements when a student reenrolls.'),
 ('LICH_SU_CA_DANG_KY_HOC',ARRAY['mahocsinh','mamonhoc','dotdangky','thutrongtuan','makhunggio'],'04 Lịch sử lịch',3,
  'The requested slots of a specific registration period',
  'Past schedule is not the same fact as the current requested schedule.')
), physical AS (
 SELECT c.table_name,c.column_name,c.data_type,c.is_generated,c.generation_expression,c.ordinal_position
 FROM information_schema.columns c JOIN information_schema.tables t USING(table_catalog,table_schema,table_name)
 WHERE c.table_schema='vuihoc' AND t.table_type='BASE TABLE'
), foreign_keys AS (
 SELECT t.relname AS table_name,a.attname AS column_name,
  string_agg(DISTINCT pg_get_constraintdef(k.oid),'; ') AS references
 FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid
 JOIN pg_namespace n ON n.oid=t.relnamespace
 CROSS JOIN LATERAL unnest(k.conkey) AS col(attnum)
 JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=col.attnum
 WHERE n.nspname='vuihoc' AND k.contype='f' GROUP BY t.relname,a.attname
), repeated AS (
 SELECT column_name,count(*) AS table_count,string_agg(table_name,', ' ORDER BY table_name) AS tables
 FROM physical GROUP BY column_name
)
SELECT coalesce(r.module,'Các bảng khác') AS module,p.table_name,p.column_name,p.data_type,
 CASE WHEN p.is_generated='ALWAYS' THEN 'GENERATED'
  WHEN r.priority IN (1,2) THEN 'REVIEW'
  WHEN r.priority=3 THEN 'HISTORY_OR_CONTROLLED_DERIVATION'
  WHEN f.references IS NOT NULL THEN 'FOREIGN_KEY'
  WHEN p.column_name IN ('ngaytao','ngaycapnhat','trangthai','mota','thutu','madinhdanh') THEN 'OWN_RECORD_FIELD'
  ELSE 'SOURCE_OR_UNCLASSIFIED' END AS review_kind,
 coalesce(r.priority,4) AS priority,r.source,r.reason,
 f.references AS foreign_key,p.generation_expression,
 repeated.table_count AS same_name_table_count,repeated.tables AS same_name_tables
FROM physical p LEFT JOIN rules r ON r.table_name=p.table_name AND p.column_name=ANY(r.fields)
LEFT JOIN foreign_keys f ON f.table_name=p.table_name AND f.column_name=p.column_name
LEFT JOIN repeated ON repeated.column_name=p.column_name
ORDER BY priority,module,p.table_name,p.ordinal_position;
