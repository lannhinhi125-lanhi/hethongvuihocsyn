-- Run this entire file in Supabase SQL Editor. Safe to rerun.
-- QUESTION history for accounts with AI permission; AI answers are never stored.
BEGIN;

-- Temporary teacher questions, relational storage only. Run this entire file.

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

-- Lists and reads are queries only. Apply after 20261106 or run setup_teacher_question_history.sql.

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

-- Account-scoped question history for teachers and administrators with AI permission.
-- Run after setup_teacher_question_history.sql. Existing teacher questions are preserved.

ALTER TABLE vuihoc."PHIEN_CHAT_AI" ADD COLUMN IF NOT EXISTS manguoidung text
 REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE;
UPDATE vuihoc."PHIEN_CHAT_AI" p SET manguoidung=g.manguoidung
 FROM vuihoc."GIAO_VIEN" g WHERE g.madinhdanh=p.magiaovien AND p.manguoidung IS NULL;
DO $check$ BEGIN
 IF EXISTS(SELECT 1 FROM vuihoc."PHIEN_CHAT_AI" WHERE manguoidung IS NULL) THEN
  RAISE EXCEPTION 'Có lịch sử chat chưa liên kết tài khoản. Chưa thay đổi dữ liệu; cần kiểm tra liên kết giáo viên–tài khoản.';
 END IF;
END $check$;
ALTER TABLE vuihoc."PHIEN_CHAT_AI" ALTER COLUMN manguoidung SET NOT NULL;
ALTER TABLE vuihoc."PHIEN_CHAT_AI" ALTER COLUMN magiaovien DROP NOT NULL;
CREATE INDEX IF NOT EXISTS phien_chat_ai_tai_khoan_ngay ON vuihoc."PHIEN_CHAT_AI"(manguoidung,thoigianbatdau DESC,maphien DESC);

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
 INSERT INTO vuihoc."PHIEN_CHAT_AI"(maphien,manguoidung,magiaovien) VALUES(p_chat,owner_id,(SELECT madinhdanh FROM vuihoc."GIAO_VIEN" WHERE manguoidung=owner_id LIMIT 1)) ON CONFLICT(maphien) DO NOTHING;
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
NOTIFY pgrst,'reload schema';

COMMIT;
