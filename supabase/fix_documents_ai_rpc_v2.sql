-- VUIHOC_DOCUMENTS_AI_RPC_V2
-- Run this entire file in Supabase SQL Editor after migrations through 20261202.
-- Combines 20261203 (document uploader) and 20261204 (AI configuration/chat).
-- Atomic and safe to rerun. Existing unknown uploaders remain NULL.
BEGIN;
DO $prerequisite$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='BO_LOC_MAU_BAO_CAO' AND column_name='thutu') THEN
  RAISE EXCEPTION 'Cần hoàn tất migration 20261202_normalize_report_templates.sql trước khi chạy file gộp tài liệu và AI.';
 END IF;
END $prerequisite$;
-- Run after 20261202. Historical uploaders are unknown and remain NULL.
ALTER TABLE vuihoc."TAI_LIEU_QUY_TRINH"
 ADD COLUMN IF NOT EXISTS manguoitailen text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS tai_lieu_nguoi_tai_len ON vuihoc."TAI_LIEU_QUY_TRINH"(manguoitailen);
COMMENT ON COLUMN vuihoc."TAI_LIEU_QUY_TRINH".manguoitailen IS 'Tài khoản tạo/tải tài liệu lên; NULL với tài liệu lịch sử chưa xác định. Không đổi khi sửa tài liệu.';

DO $patch$
DECLARE f text; conf jsonb:=vuihoc.business_config(); anchor text:=$anchor$v:=coalesce(oldrow,'{}')||v;$anchor$;
BEGIN
 f:=pg_get_functiondef('public.vuihoc_save_business(text,jsonb)'::regprocedure);
 IF strpos(f,'document_uploader_server')=0 THEN
  IF strpos(f,anchor)=0 OR strpos(f,'IF conf IS NULL THEN')=0 THEN
   RAISE EXCEPTION 'Không nhận diện được RPC lưu tài liệu; dừng để tránh sửa nhầm.';
  END IF;
  f:=replace(f,'IF conf IS NULL THEN',$guard$
  -- document_uploader_server: clients cannot supply attribution, even on create.
  IF ds='sop_documents' AND ((coalesce(b,'{}')||coalesce(v,'{}')) ?| ARRAY['manguoitailen','tennguoitailen']) THEN
   RAISE EXCEPTION 'Người tải tài liệu do máy chủ xác định, không được sửa từ giao diện.';
  END IF;
  IF conf IS NULL THEN$guard$);
  f:=replace(f,anchor,$writer$
   IF ds='sop_documents' THEN
    v:=v||jsonb_build_object('manguoitailen',CASE WHEN oldrow IS NULL THEN actor.madinhdanh ELSE oldrow->>'manguoitailen' END);
   END IF;
   v:=coalesce(oldrow,'{}')||v;$writer$);
  EXECUTE f;
 END IF;
 IF NOT (conf->'sop_documents'->'columns' ? 'manguoitailen') THEN
  conf:=jsonb_set(conf,'{sop_documents,columns}',(conf->'sop_documents'->'columns')||jsonb_build_array('manguoitailen'));
 END IF;
 IF NOT (conf->'sop_documents'->'columns' ? 'tennguoitailen') THEN
  conf:=jsonb_set(conf,'{sop_documents,columns}',(conf->'sop_documents'->'columns')||jsonb_build_array('tennguoitailen'));
 END IF;
 EXECUTE format('CREATE OR REPLACE FUNCTION vuihoc.business_config() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS %L','SELECT '||quote_literal(conf::text)||'::jsonb');
 IF to_regprocedure('vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(text,jsonb)') IS NULL THEN
  ALTER FUNCTION vuihoc.du_lieu_quan_he(text,jsonb) RENAME TO du_lieu_quan_he_truoc_nguoi_tai_lieu;
 END IF;
END $patch$;
CREATE OR REPLACE FUNCTION vuihoc.du_lieu_quan_he(p_table text,p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $$
BEGIN
 IF p_row IS NULL THEN RETURN NULL; END IF;
 IF p_table='TAI_LIEU_QUY_TRINH' THEN
  p_row:=p_row||jsonb_build_object('tennguoitailen',(SELECT hoten FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=p_row->>'manguoitailen'));
 END IF;
 RETURN vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(p_table,p_row);
END $$;
REVOKE ALL ON FUNCTION vuihoc.du_lieu_quan_he(text,jsonb),vuihoc.du_lieu_quan_he_truoc_nguoi_tai_lieu(text,jsonb) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

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

COMMIT;
SELECT 'VUIHOC_DOCUMENTS_AI_RPC_V2_OK' AS ket_qua;
