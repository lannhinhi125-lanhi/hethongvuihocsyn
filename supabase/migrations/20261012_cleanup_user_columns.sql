-- Cleanup the unused Supabase Auth identifier in NGUOI_DUNG.
-- Run after 20261012_plaintext_passwords.sql. Keep current login/session columns.
BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='vuihoc' AND table_name='NGUOI_DUNG' AND column_name='matkhau') THEN
  RAISE EXCEPTION 'Chay 20261012_plaintext_passwords.sql truoc.';
 END IF;
END $$;
ALTER TABLE vuihoc."NGUOI_DUNG" DROP COLUMN IF EXISTS maxacthuc;
NOTIFY pgrst,'reload schema';
COMMIT;
