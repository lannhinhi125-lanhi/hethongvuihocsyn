import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = process.env.PGLITE_MODULE_PATH;
assert.ok(root, 'Set PGLITE_MODULE_PATH to @electric-sql/pglite');
const { PGlite } = await import(pathToFileURL(resolve(root, 'dist/index.js')));
const { pgcrypto } = await import(pathToFileURL(resolve(root, 'dist/contrib/pgcrypto.js')));
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS \'SELECT null::uuid\';');
  // Work around an existing quote typo in the unrelated business-data reader.
  const schema = readFileSync('supabase/schema.sql', 'utf8').replace("to_jsonb(t)->>'ngaytao','') DESC", "to_jsonb(t)->>''ngaytao'','''') DESC");
  await db.exec(schema);
  for (const file of ['20261012_incident_credit.sql', '20261013_negative_work_credit.sql', '20261013_sync_incident_catalog_credit.sql']) await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
  const standard = Array.from({ length: 5 }, (_, i) => ({ id: 'STANDARD-' + i, type: 'STANDARD', creditCoeff: 1 }));
  const incident = { id: 'CREDIT-TEST', classCode: 'TOAN_K03_NT2_13_01', date: '2026-10-20', time: '18:00 - 19:30', type: 'STANDARD', creditCoeff: 1 };
  await db.query(`UPDATE vuihoc."BANG_CONG_THANG" SET danhsachgiaovien=$1::jsonb WHERE kycong='2026-10'`, [JSON.stringify([{ teacherId: 'GV-001', payrollSent: true, sessions: [...standard, incident] }])]);
  await db.exec(`INSERT INTO vuihoc."BUOI_HOC"(madinhdanh,malop,ngayhoc,makhunggio,batdau,ketthuc,magiaovienchinh)
    VALUES('CREDIT-TEST','CLS-001','2026-10-20','SLOT-1','2026-10-20 18:00+07','2026-10-20 19:30+07','GV-001');
    INSERT INTO vuihoc."SU_CO_BUOI_HOC"(madinhdanh,mabuoi,manhomsuco,masuco,tensuco)
    VALUES('CREDIT-INC','CREDIT-TEST','GRP-TCH','INC-TCH-03','Late');
    UPDATE vuihoc."BUOI_HOC" SET vaolopluc='2026-10-20 18:05+07',ketthucluc='2026-10-20 19:30+07',trangthai='HOAN_THANH' WHERE madinhdanh='CREDIT-TEST';`);
  const change = value => db.query(`UPDATE vuihoc."DANH_MUC_SU_CO" SET danhsachsuco=(SELECT jsonb_agg(CASE WHEN x->>'code'='INC-TCH-03' THEN x||jsonb_build_object('creditCoeff',$1::numeric) ELSE x END) FROM jsonb_array_elements(danhsachsuco) x) WHERE madinhdanh='GRP-TCH'`, [value]);
  await change(-1);
  const credits = async () => (await db.query(`SELECT danhsachgiaovien FROM vuihoc."BANG_CONG_THANG" WHERE kycong='2026-10'`)).rows[0].danhsachgiaovien[0];
  let teacher = await credits();
  assert.equal(teacher.sessions.at(-1).creditCoeff, -1);
  assert.equal(teacher.sessions.at(-1).type, 'EMERGENCY');
  assert.equal(teacher.sessions.filter(s => s.type === 'STANDARD').reduce((n,s) => n+s.creditCoeff, 0), 5);
  assert.equal(teacher.sessions.reduce((n,s) => n+s.creditCoeff, 0), 4);
  assert.equal(teacher.payrollSent, false);
  assert.equal(Number((await db.query(`SELECT hesocong FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi='CREDIT-TEST'`)).rows[0].hesocong), -1);
  await db.exec(`UPDATE vuihoc."SU_CO_BUOI_HOC" SET noidung='Note only' WHERE madinhdanh='CREDIT-INC'`);
  assert.equal((await credits()).sessions.at(-1).creditCoeff, -1);
  await db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong='2026-10'`);
  await change(-2);
  assert.equal((await credits()).sessions.at(-1).creditCoeff, -1);
  await db.exec(readFileSync('supabase/migrations/20261013_sync_incident_catalog_credit.sql', 'utf8'));
  assert.equal((await credits()).sessions.at(-1).creditCoeff, -1);
  console.log('PASS: catalog -1 syncs incident, normalized credit and monthly totals (5 - 1 = 4); notes and locked months preserved; migration reruns.');
} catch (error) { console.error(error.message, error.detail || "", error.where || "", error.query?.slice(Number(error.position)-80, Number(error.position)+80)); process.exitCode = 1; } finally { await db.close(); }
