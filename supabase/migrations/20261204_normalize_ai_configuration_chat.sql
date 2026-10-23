-- After 20261203. One atomic statement; no historical content is rewritten.
DO $normalize_ai_chat$
BEGIN
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'Chạy migration 20261203 trước.';
 END IF;
 LOCK TABLE vuihoc."PHIEN_CHAT_AI",vuihoc."CAU_HOI_CHAT_AI",vuihoc."CAU_HINH_TRO_LY",vuihoc."CAU_HINH_HE_THONG" IN SHARE ROW EXCLUSIVE MODE;
 IF (SELECT count(*) FROM vuihoc."CAU_HINH_TRO_LY")>1 OR (SELECT count(*) FROM vuihoc."CAU_HINH_HE_THONG")>1 THEN
  RAISE EXCEPTION 'Có nhiều cấu hình dùng chung; cần đối soát, không tự chọn hoặc xóa cấu hình.';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='CAU_HINH_TRO_LY' AND column_name='cauhoinhanh') THEN
  RAISE EXCEPTION 'Còn câu hỏi gợi ý dạng mảng cũ; cần hoàn tất nâng cấp quan hệ trước.';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='PHIEN_CHAT_AI' AND column_name='magiaovien') THEN
  IF EXISTS(SELECT 1 FROM vuihoc."PHIEN_CHAT_AI" p LEFT JOIN vuihoc."GIAO_VIEN" g ON g.madinhdanh=p.magiaovien
    WHERE p.magiaovien IS NOT NULL AND (g.madinhdanh IS NULL OR g.manguoidung IS DISTINCT FROM p.manguoidung)) THEN
   RAISE EXCEPTION 'Có phiên chat lệch liên kết giáo viên–tài khoản; chưa xóa cột nào.';
  END IF;
  -- RESTRICT is the default: unexpected dependent views stop the whole statement.
  ALTER TABLE vuihoc."PHIEN_CHAT_AI" DROP COLUMN magiaovien;
 END IF;
 -- Restore the complete account-scoped API, including installations whose
 -- legacy function bodies differ in formatting or still contain teacher logic.
 -- No text matching against the deployed RPC body. Reapply permissions/owner.
 EXECUTE $install_account_chat$
CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_chat(p_token text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor vuihoc."NGUOI_DUNG";
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen
  AND ((g.congtruycap='TEACHER' AND vuihoc.quyen_nhom(g.madinhdanh) && ARRAY['ALL','TEACHER_PORTAL','T_SCHEDULE_ALL','Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy'])
   OR (g.congtruycap='ADMIN' AND vuihoc.quyen_nhom(g.madinhdanh) && ARRAY['ALL','PH6_ALL','Sử dụng chatbot tra cứu quy chế và nghiệp vụ','Sử dụng AI sinh & tinh chỉnh nhận xét học sinh']))) THEN
  RAISE EXCEPTION 'Tài khoản chưa có quyền sử dụng AI.';
 END IF;
 RETURN actor.madinhdanh;
END $$;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_open(p_token text,p_chat uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_id text;
BEGIN
 owner_id:=vuihoc.tai_khoan_chat(p_token);
 INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung) VALUES(p_chat,owner_id) ON CONFLICT(maphien) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=p_chat AND manguoidung=owner_id) THEN
  RAISE EXCEPTION 'Cuộc trò chuyện không thuộc tài khoản hiện tại.';
 END IF;
 RETURN p_chat;
END $$;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_question_save(p_token text,p_chat uuid,p_question uuid,p_content text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_id text;
BEGIN
 owner_id:=vuihoc.tai_khoan_chat(p_token);
 -- The parent lock and FK stop a late write from recreating questions after deletion.
 PERFORM 1 FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=p_chat AND manguoidung=owner_id FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cuộc trò chuyện đã xóa hoặc không thuộc tài khoản hiện tại. Hãy tạo cuộc trò chuyện mới.'; END IF;
 INSERT INTO vuihoc."CAU_HOI_CHAT_AI"(macauhoi,maphien,noidung) VALUES(p_question,p_chat,p_content)
  ON CONFLICT(macauhoi) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."CAU_HOI_CHAT_AI" WHERE macauhoi=p_question AND maphien=p_chat AND noidung=p_content) THEN
  RAISE EXCEPTION 'Mã câu hỏi đã được sử dụng cho nội dung khác.';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_delete(p_token text,p_chat uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_id text;
BEGIN
 owner_id:=vuihoc.tai_khoan_chat(p_token);
 DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=p_chat AND manguoidung=owner_id;
 -- Missing own session is an idempotent success; never delete another account's rows.
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_list(p_token text,p_offset integer DEFAULT 0)
RETURNS TABLE(maphien uuid,tieude text,thoigianbatdau timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_id text;
BEGIN
 owner_id:=vuihoc.tai_khoan_chat(p_token);
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Trang lịch sử không hợp lệ.'; END IF;
 RETURN QUERY WITH page AS (
  SELECT p.* FROM vuihoc."PHIEN_CHAT_AI" p WHERE p.manguoidung=owner_id
  ORDER BY p.thoigianbatdau DESC,p.maphien DESC LIMIT 21 OFFSET p_offset
 ) SELECT p.maphien,coalesce((SELECT left(q.noidung,90) FROM vuihoc."CAU_HOI_CHAT_AI" q
  WHERE q.maphien=p.maphien ORDER BY q.thoigianhoi,q.macauhoi LIMIT 1),'Cuộc trò chuyện mới'),p.thoigianbatdau
 FROM page p ORDER BY p.thoigianbatdau DESC,p.maphien DESC;
END $$;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_questions(p_token text,p_chat uuid,p_offset integer DEFAULT 0)
RETURNS TABLE(macauhoi uuid,noidung text,thoigianhoi timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_id text;
BEGIN
 owner_id:=vuihoc.tai_khoan_chat(p_token);
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Trang câu hỏi không hợp lệ.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."PHIEN_CHAT_AI" p WHERE p.maphien=p_chat AND p.manguoidung=owner_id) THEN
  RAISE EXCEPTION 'Cuộc trò chuyện đã xóa hoặc không thuộc tài khoản hiện tại.';
 END IF;
 RETURN QUERY SELECT q.macauhoi,q.noidung,q.thoigianhoi FROM vuihoc."CAU_HOI_CHAT_AI" q WHERE q.maphien=p_chat
  ORDER BY q.thoigianhoi DESC,q.macauhoi DESC LIMIT 21 OFFSET p_offset;
END $$;

DO $owner$
DECLARE trusted_owner name; signature text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN RAISE EXCEPTION 'Owner quản trị chưa hợp lệ.'; END IF;
 EXECUTE format('ALTER FUNCTION vuihoc.tai_khoan_chat(text) OWNER TO %I',trusted_owner);
 REVOKE ALL ON FUNCTION vuihoc.tai_khoan_chat(text) FROM PUBLIC,anon,authenticated;
 FOREACH signature IN ARRAY ARRAY['public.vuihoc_ai_chat_open(text,uuid)','public.vuihoc_ai_question_save(text,uuid,uuid,text)',
  'public.vuihoc_ai_chat_delete(text,uuid)','public.vuihoc_ai_chat_list(text,integer)','public.vuihoc_ai_chat_questions(text,uuid,integer)'] LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',signature,trusted_owner);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated',signature);
 END LOOP;
END $owner$;

 $install_account_chat$;
 -- UI and RPC contract expose one shared configuration, not a version history.
 CREATE UNIQUE INDEX IF NOT EXISTS cau_hinh_tro_ly_mot_ban ON vuihoc."CAU_HINH_TRO_LY" ((true));
 CREATE UNIQUE INDEX IF NOT EXISTS cau_hinh_he_thong_mot_ban ON vuihoc."CAU_HINH_HE_THONG" ((true));
 NOTIFY pgrst,'reload schema';
END $normalize_ai_chat$;
