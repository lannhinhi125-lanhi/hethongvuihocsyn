-- Temporary teacher questions, relational storage only. Run this entire file.
BEGIN;
CREATE TABLE IF NOT EXISTS vuihoc."PHIEN_CHAT_AI" (
 maphien uuid PRIMARY KEY,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE,
 thoigianbatdau timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phien_chat_ai_giao_vien ON vuihoc."PHIEN_CHAT_AI"(magiaovien);
CREATE TABLE IF NOT EXISTS vuihoc."CAU_HOI_CHAT_AI" (
 macauhoi uuid PRIMARY KEY,
 maphien uuid NOT NULL REFERENCES vuihoc."PHIEN_CHAT_AI"(maphien) ON DELETE CASCADE,
 noidung text NOT NULL CHECK(length(btrim(noidung)) BETWEEN 1 AND 120000),
 thoigianhoi timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cau_hoi_chat_ai_phien ON vuihoc."CAU_HOI_CHAT_AI"(maphien);
ALTER TABLE vuihoc."PHIEN_CHAT_AI" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vuihoc."CAU_HOI_CHAT_AI" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."PHIEN_CHAT_AI",vuihoc."CAU_HOI_CHAT_AI" FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION vuihoc.giao_vien_chat(p_token text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor vuihoc."NGUOI_DUNG"; teacher text;
BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" g WHERE g.madinhdanh=actor.manhomquyen
  AND g.congtruycap='TEACHER' AND vuihoc.quyen_nhom(g.madinhdanh) && ARRAY['ALL','TEACHER_PORTAL','T_SCHEDULE_ALL','Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy']) THEN
  RAISE EXCEPTION 'Bạn chưa có quyền sử dụng chatbot giáo viên.';
 END IF;
 SELECT madinhdanh INTO teacher FROM vuihoc."GIAO_VIEN" WHERE manguoidung=actor.madinhdanh;
 IF teacher IS NULL THEN RAISE EXCEPTION 'Tài khoản chưa liên kết hồ sơ giáo viên.'; END IF;
 RETURN teacher;
END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_open(p_token text,p_chat uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE teacher text;
BEGIN
 teacher:=vuihoc.giao_vien_chat(p_token);
 INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,magiaovien) VALUES(p_chat,teacher) ON CONFLICT(maphien) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=p_chat AND magiaovien=teacher) THEN
  RAISE EXCEPTION 'Cuộc trò chuyện không thuộc giáo viên hiện tại.';
 END IF;
 RETURN p_chat;
END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_ai_question_save(p_token text,p_chat uuid,p_question uuid,p_content text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE teacher text;
BEGIN
 teacher:=vuihoc.giao_vien_chat(p_token);
 -- The parent lock and FK stop a late write from recreating questions after deletion.
 PERFORM 1 FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=p_chat AND magiaovien=teacher FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cuộc trò chuyện đã xóa hoặc không thuộc giáo viên hiện tại. Hãy xóa chat để bắt đầu lại.'; END IF;
 INSERT INTO vuihoc."CAU_HOI_CHAT_AI"(macauhoi,maphien,noidung) VALUES(p_question,p_chat,p_content)
  ON CONFLICT(macauhoi) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."CAU_HOI_CHAT_AI" WHERE macauhoi=p_question AND maphien=p_chat AND noidung=p_content) THEN
  RAISE EXCEPTION 'Mã câu hỏi đã được sử dụng cho nội dung khác.';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_ai_chat_delete(p_token text,p_chat uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE teacher text;
BEGIN
 teacher:=vuihoc.giao_vien_chat(p_token);
 DELETE FROM vuihoc."PHIEN_CHAT_AI" WHERE maphien=p_chat AND magiaovien=teacher;
 -- Missing own session is an idempotent success; never delete another teacher's rows.
 RETURN true;
END $$;
DO $owner$
DECLARE trusted_owner name; signature text;
BEGIN
 SELECT pg_get_userbyid(proowner) INTO trusted_owner FROM pg_proc WHERE oid=to_regprocedure('public.vuihoc_login(text,text)');
 IF trusted_owner IS NULL OR trusted_owner IN ('anon','authenticated','authenticator','service_role') THEN RAISE EXCEPTION 'Owner quản trị chưa hợp lệ.'; END IF;
 EXECUTE format('ALTER TABLE vuihoc."PHIEN_CHAT_AI" OWNER TO %I',trusted_owner);
 EXECUTE format('ALTER TABLE vuihoc."CAU_HOI_CHAT_AI" OWNER TO %I',trusted_owner);
 FOREACH signature IN ARRAY ARRAY['vuihoc.giao_vien_chat(text)','public.vuihoc_ai_chat_open(text,uuid)',
  'public.vuihoc_ai_question_save(text,uuid,uuid,text)','public.vuihoc_ai_chat_delete(text,uuid)'] LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',signature,trusted_owner);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',signature);
 END LOOP;
END $owner$;
GRANT EXECUTE ON FUNCTION public.vuihoc_ai_chat_open(text,uuid),public.vuihoc_ai_question_save(text,uuid,uuid,text),public.vuihoc_ai_chat_delete(text,uuid) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
