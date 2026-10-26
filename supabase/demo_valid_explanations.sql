-- Build fragment, used inside the atomic demo reset/repair before closing periods.
DO $valid_claims$
DECLARE actor text; period record; c record; n integer; claim_id text;
 source_name text; sent_at timestamptz; before_row jsonb; after_row jsonb;
 teachers jsonb; decisions jsonb; claim_status text;
BEGIN
 SELECT u.madinhdanh INTO STRICT actor FROM vuihoc."NGUOI_DUNG" u
 JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen
 WHERE g.congtruycap='ADMIN' AND u.trangthai='active'
 AND 'ALL'=ANY(vuihoc.quyen_nhom(g.madinhdanh)) ORDER BY u.madinhdanh LIMIT 1;
 source_name:=CASE WHEN to_regclass('vuihoc."V_CONG_DAY_BUOI_HOC"') IS NULL
  THEN 'CONG_DAY_BUOI_HOC' ELSE 'V_CONG_DAY_BUOI_HOC' END;
 FOR period IN SELECT kycong FROM vuihoc."BANG_CONG_THANG"
  WHERE kycong IN ('2026-08','2026-09','2026-10') ORDER BY kycong LOOP
  n:=0;
  FOR c IN EXECUTE format($query$
   SELECT x.madinhdanh,x.mabuoi,x.magiaovien,x.hesocong,b.ngayhoc,b.tieude,g.manguoidung
   FROM vuihoc.%I x JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=x.mabuoi
   JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=x.magiaovien
   WHERE x.kycong=$1 AND x.magiaovien ~ '^DEMO-GV-[0-9]{3}$'
    AND x.loaicong IN ('LATE','EMERGENCY') AND x.hesocong>0 AND x.hesocong<1 AND b.chuyencan='LATE'
    AND b.ngayhoc<(statement_timestamp() AT TIME ZONE 'Asia/Bangkok')::date-1
    AND EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" i WHERE i.mabuoi=x.mabuoi AND i.masuco='INC-TCH-03')
   ORDER BY b.ngayhoc,x.magiaovien,x.madinhdanh LIMIT 3$query$,source_name) USING period.kycong
  LOOP
   n:=n+1;
   IF period.kycong<'2026-10' AND n=3 THEN EXIT; END IF;
   claim_id:='DEMO-GT-VALID-'||period.kycong||'-'||n;
   IF EXISTS(SELECT 1 FROM vuihoc."GIAI_TRINH_CONG_DAY" WHERE madinhdanh=claim_id OR macong=c.madinhdanh) THEN CONTINUE; END IF;
   sent_at:=CASE WHEN period.kycong<'2026-10' THEN
    ((period.kycong||'-01')::date+interval '1 month 9 hours') AT TIME ZONE 'Asia/Bangkok'
    ELSE (c.ngayhoc+1+time '09:00') AT TIME ZONE 'Asia/Bangkok' END;
   claim_status:=CASE WHEN n=1 THEN 'DA_DUYET' WHEN n=2 THEN 'TU_CHOI' ELSE 'CHO_DUYET' END;
   -- A concrete demo entry error, independent of the genuinely recorded lateness.
   -- Accepted claims restore the original incident rate, pending claims retain 0.
   before_row:=vuihoc.bang_cong_truy_van(period.kycong);
   SELECT jsonb_agg(t||jsonb_build_object('sessions',
    coalesce((SELECT jsonb_agg(CASE WHEN t->>'teacherId'=c.magiaovien AND s->>'id'=c.mabuoi THEN
     s||jsonb_build_object('creditCoeff',CASE WHEN n IN (1,3) THEN 0 ELSE c.hesocong END,
      'hrPayNote',CASE WHEN n IN (1,3) THEN 'Demo: nhập nhầm hệ số thành 0 khi đối soát.' ELSE coalesce(s->>'hrPayNote','') END,
      'reconciliationSent',true) ELSE s END) FROM jsonb_array_elements(t->'sessions') s),'[]'::jsonb)))
    INTO teachers FROM jsonb_array_elements(before_row->'danhsachgiaovien') t;
   PERFORM vuihoc.luu_bang_cong(actor,NULL,before_row,before_row||jsonb_build_object('danhsachgiaovien',teachers));
   UPDATE vuihoc."CONG_DAY_BUOI_HOC" SET guiluc=sent_at WHERE madinhdanh=c.madinhdanh;
   INSERT INTO vuihoc."GIAI_TRINH_CONG_DAY"(madinhdanh,macong,noidung,loaisuco,manguoigui,guiluc)
   VALUES(claim_id,c.madinhdanh,
    format('Buổi %s ngày %s (mã %s). %s',c.tieude,to_char(c.ngayhoc,'DD/MM/YYYY'),c.mabuoi,
     CASE WHEN n IN (1,3) THEN format('Bảng đối soát ghi 0 công dù sự cố vào muộn 8 phút áp hệ số %s. Đề nghị sửa lỗi nhập 0 về đúng hệ số sự cố, không yêu cầu tính đủ 1 công.',c.hesocong)
     ELSE format('Tôi vào lớp muộn 8 phút và đã dạy hết nội dung. Bảng công áp hệ số %s; đề nghị xem xét tính đủ 1 công.',c.hesocong) END),
    CASE WHEN n IN (1,3) THEN 'Sai hệ số công do nhập nhầm' ELSE 'Đề nghị xem xét hệ số đi muộn' END,
    c.manguoidung,sent_at+interval '1 hour');
   -- No fake evidence URL; the linked lesson and incident supply verifiable records.
   IF claim_status<>'CHO_DUYET' THEN
    before_row:=vuihoc.bang_cong_truy_van(period.kycong);
    SELECT jsonb_agg(d||CASE WHEN d->>'id'=claim_id THEN jsonb_build_object('status',claim_status,
     'adminNote',CASE WHEN n=1 THEN format('Đối chiếu đúng buổi và sự cố muộn 8 phút: sửa lỗi nhập 0 về %s công, giữ hệ số đi muộn.',c.hesocong)
      ELSE 'Nhật ký xác nhận muộn 8 phút. Dạy đủ nội dung không phải căn cứ miễn hệ số đi muộn; giữ nguyên công theo sự cố.' END) ELSE '{}'::jsonb END)
     INTO decisions FROM jsonb_array_elements(before_row->'danhsachgiaitrinh') d;
    after_row:=before_row||jsonb_build_object('danhsachgiaitrinh',decisions);
    IF n=1 THEN
     SELECT jsonb_agg(t||jsonb_build_object('sessions',
      coalesce((SELECT jsonb_agg(CASE WHEN t->>'teacherId'=c.magiaovien AND s->>'id'=c.mabuoi THEN
       s||jsonb_build_object('creditCoeff',c.hesocong,'hrPayNote',format('Đã duyệt %s: sửa lỗi nhập 0 về %s công; giữ hệ số đi muộn.',claim_id,c.hesocong)) ELSE s END)
       FROM jsonb_array_elements(t->'sessions') s),'[]'::jsonb))) INTO teachers FROM jsonb_array_elements(before_row->'danhsachgiaovien') t;
     after_row:=after_row||jsonb_build_object('danhsachgiaovien',teachers);
    END IF;
    PERFORM vuihoc.luu_bang_cong(actor,NULL,before_row,after_row);
    UPDATE vuihoc."GIAI_TRINH_CONG_DAY" SET duyetluc=sent_at+interval '5 hours' WHERE madinhdanh=claim_id;
   END IF;
  END LOOP;
 END LOOP;
END $valid_claims$;
