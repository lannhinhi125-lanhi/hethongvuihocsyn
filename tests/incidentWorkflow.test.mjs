import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE_PATH, 'dist/index.js')));
const db = new PGlite();
try {
  await db.exec(`CREATE SCHEMA vuihoc;
    CREATE TABLE vuihoc."LOAI_SU_CO"(manhom text,ma text,danghoatdong boolean,hesocong numeric);
    CREATE TABLE vuihoc."BUOI_HOC"(madinhdanh text PRIMARY KEY,ngayhoc date);
    CREATE TABLE vuihoc."SU_CO_BUOI_HOC"(madinhdanh text PRIMARY KEY,mabuoi text,manhomsuco text,masuco text,hesocongapdung numeric,dotamdunglop boolean DEFAULT false,noidung text);
    CREATE TABLE vuihoc."BANG_CONG_THANG"(kycong text PRIMARY KEY,dakhoa boolean DEFAULT false);
    CREATE TABLE vuihoc.calls(id text);
    CREATE FUNCTION vuihoc.ghi_cong_neu_du_nhan_xet(p_buoi text) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN INSERT INTO vuihoc.calls VALUES(p_buoi); END $$;
    INSERT INTO vuihoc."LOAI_SU_CO" VALUES('TCH','MISSING',true,NULL),('TCH','SET',true,-1),('TCH','OFF',false,1);
    INSERT INTO vuihoc."BUOI_HOC" VALUES('LESSON','2026-10-28');
    INSERT INTO vuihoc."BANG_CONG_THANG" VALUES('2026-10',false);`);
  const migration = readFileSync('supabase/migrations/20261217_incident_workflow.sql', 'utf8');
  await db.exec(migration); await db.exec(migration);
  await db.exec(`CREATE TRIGGER chot BEFORE INSERT OR UPDATE ON vuihoc."SU_CO_BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.chot_he_so_su_co();
    INSERT INTO vuihoc."SU_CO_BUOI_HOC"(madinhdanh,mabuoi,manhomsuco,masuco) VALUES('INC','LESSON','TCH','MISSING');
    SELECT vuihoc.ghi_cong_neu_du_nhan_xet('LESSON');`);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc.calls')).rows[0].n, 0, 'missing coefficient must not become standard credit');
  assert.equal((await db.query('SELECT hesocongapdung FROM vuihoc."SU_CO_BUOI_HOC"')).rows[0].hesocongapdung, null);
  await db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET noidung='Saved without coefficient' WHERE madinhdanh='INC'`);
  await assert.rejects(() => db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true`), /cấu hình/);
  await assert.rejects(() => db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET masuco='OFF' WHERE madinhdanh='INC'`), /ngừng hoạt động/);
  await db.exec(`UPDATE vuihoc."LOAI_SU_CO" SET hesocong=-0.5 WHERE ma='MISSING';
    UPDATE vuihoc."SU_CO_BUOI_HOC" SET hesocongapdung=-0.5 WHERE madinhdanh='INC';`);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc.calls')).rows[0].n, 1, 'configuration resumes credit generation');
  await db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET noidung='Note only' WHERE madinhdanh='INC'`);
  assert.equal(Number((await db.query('SELECT hesocongapdung FROM vuihoc."SU_CO_BUOI_HOC"')).rows[0].hesocongapdung), -0.5);
  await db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true`);
  console.log('PASS: missing coefficient incidents save, no standard fallback, lock guarded, catalog resolution resumes, notes preserve credit, migration reruns.');
  await db.exec(`ALTER TABLE vuihoc."SU_CO_BUOI_HOC" ADD COLUMN trangthai text DEFAULT 'DANG_XU_LY';
    UPDATE vuihoc."SU_CO_BUOI_HOC" SET trangthai='DA_GIAI_QUYET';
    UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=false;
    CREATE TABLE vuihoc.applied(id text,credit numeric);
    CREATE FUNCTION vuihoc.ap_dung_cong_su_co() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.hesocongapdung IS NULL THEN RETURN NEW; END IF;
    INSERT INTO vuihoc.applied VALUES(NEW.madinhdanh,NEW.hesocongapdung); RETURN NEW; END $$;`);
  const resolution = readFileSync('supabase/migrations/20261218_resolve_incident_before_credit.sql', 'utf8');
  // Simulate applying 20261218 directly, without helpers/guards from 20261217.
  await db.exec(`DROP FUNCTION vuihoc.tiep_tuc_ghi_cong_sau_cau_hinh_su_co() CASCADE;
    DROP TRIGGER kiem_tra_cau_hinh_su_co_khi_khoa ON vuihoc."BANG_CONG_THANG";
    DROP FUNCTION vuihoc.kiem_tra_cau_hinh_su_co_khi_khoa();
    CREATE OR REPLACE FUNCTION vuihoc.ghi_cong_neu_du_nhan_xet(p_buoi text) RETURNS void LANGUAGE plpgsql AS $$
    BEGIN INSERT INTO vuihoc.calls VALUES(p_buoi); END $$;`);
  await db.exec(resolution); await db.exec(resolution);
  await db.exec(`CREATE TRIGGER apply_credit AFTER INSERT OR UPDATE ON vuihoc."SU_CO_BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.ap_dung_cong_su_co();
    INSERT INTO vuihoc."SU_CO_BUOI_HOC"(madinhdanh,mabuoi,manhomsuco,masuco) VALUES('PENDING','LESSON','TCH','SET');
    SELECT vuihoc.ghi_cong_neu_du_nhan_xet('LESSON');`);
  assert.equal((await db.query(`SELECT hesocongapdung FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh='PENDING'`)).rows[0].hesocongapdung, null);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc.applied')).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc.calls')).rows[0].n, 1, 'standalone migration installs the unresolved credit guard');
  await assert.rejects(() => db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true`), /chưa giải quyết/);
  await db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET hesocongapdung=-1 WHERE madinhdanh='PENDING'`);
  assert.equal((await db.query(`SELECT hesocongapdung FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh='PENDING'`)).rows[0].hesocongapdung, null, 'catalog updates cannot apply pending credit');
  await db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET trangthai='DA_GIAI_QUYET' WHERE madinhdanh='PENDING'`);
  assert.equal(Number((await db.query(`SELECT hesocongapdung FROM vuihoc."SU_CO_BUOI_HOC" WHERE madinhdanh='PENDING'`)).rows[0].hesocongapdung), -1);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc.applied')).rows[0].n, 1);
  assert.equal((await db.query('SELECT count(*)::int n FROM vuihoc.calls')).rows[0].n, 2, 'status-only resolution resumes ordinary/cover work');
  await assert.rejects(() => db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET trangthai='DANG_XU_LY' WHERE madinhdanh='PENDING'`), /đối soát/);
  await db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true`);
  console.log('PASS: configured pending incidents store NULL, catalog edits cannot apply credit, resolution applies coefficient, unresolved period lock/reopening guarded, migration reruns.');
} finally { await db.close(); }
