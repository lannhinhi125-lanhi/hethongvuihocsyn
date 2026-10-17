-- Lists and reads are queries only. Apply after 20261106 or run setup_teacher_question_history.sql.
BEGIN;
CREATE INDEX IF NOT EXISTS phien_chat_ai_giao_vien_ngay ON vuihoc."PHIEN_CHAT_AI"(magiaovien,thoigianbatdau DESC,maphien DESC);
CREATE INDEX IF NOT EXISTS cau_hoi_chat_ai_phien_ngay ON vuihoc."CAU_HOI_CHAT_AI"(maphien,thoigianhoi DESC,macauhoi DESC);
DROP INDEX IF EXISTS vuihoc.phien_chat_ai_giao_vien;
DROP INDEX IF EXISTS vuihoc.cau_hoi_chat_ai_phien;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_list(p_token text,p_offset integer DEFAULT 0)
RETURNS TABLE(maphien uuid,tieude text,thoigianbatdau timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE teacher text;
BEGIN
 teacher:=vuihoc.giao_vien_chat(p_token);
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Trang lịch sử không hợp lệ.'; END IF;
 RETURN QUERY WITH page AS (
  SELECT p.* FROM vuihoc."PHIEN_CHAT_AI" p WHERE p.magiaovien=teacher
  ORDER BY p.thoigianbatdau DESC,p.maphien DESC LIMIT 21 OFFSET p_offset
 ) SELECT p.maphien,coalesce((SELECT left(q.noidung,90) FROM vuihoc."CAU_HOI_CHAT_AI" q
  WHERE q.maphien=p.maphien ORDER BY q.thoigianhoi,q.macauhoi LIMIT 1),'Cuộc trò chuyện mới'),p.thoigianbatdau
 FROM page p ORDER BY p.thoigianbatdau DESC,p.maphien DESC;
END $$;

CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_questions(p_token text,p_chat uuid,p_offset integer DEFAULT 0)
RETURNS TABLE(macauhoi uuid,noidung text,thoigianhoi timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE teacher text;
BEGIN
 teacher:=vuihoc.giao_vien_chat(p_token);
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Trang câu hỏi không hợp lệ.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."PHIEN_CHAT_AI" p WHERE p.maphien=p_chat AND p.magiaovien=teacher) THEN
  RAISE EXCEPTION 'Cuộc trò chuyện đã xóa hoặc không thuộc giáo viên hiện tại.';
 END IF;
 RETURN QUERY SELECT q.macauhoi,q.noidung,q.thoigianhoi FROM vuihoc."CAU_HOI_CHAT_AI" q WHERE q.maphien=p_chat
  ORDER BY q.thoigianhoi DESC,q.macauhoi DESC LIMIT 21 OFFSET p_offset;
END $$;

DO $owner$
DECLARE trusted_owner name; signature text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN RAISE EXCEPTION 'Owner quản trị chưa hợp lệ.'; END IF;
 FOREACH signature IN ARRAY ARRAY['public.vuihoc_ai_chat_list(text,integer)','public.vuihoc_ai_chat_questions(text,uuid,integer)'] LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',signature,trusted_owner);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated',signature);
 END LOOP;
END $owner$;
NOTIFY pgrst,'reload schema';
COMMIT;
