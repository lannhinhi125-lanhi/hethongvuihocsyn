import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.PGLITE_MODULE_PATH;
assert.ok(root, 'Set PGLITE_MODULE_PATH to @electric-sql/pglite');
const { PGlite } = await import(pathToFileURL(resolve(root, 'dist/index.js')));
const { pgcrypto } = await import(pathToFileURL(resolve(root, 'dist/contrib/pgcrypto.js')));
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT null::uuid';");
  const schema = readFileSync('supabase/schema.sql', 'utf8').replace("to_jsonb(t)->>'ngaytao','') DESC", "to_jsonb(t)->>''ngaytao'','''') DESC");
  await db.exec(schema);
  await db.exec(readFileSync('supabase/upgrade_incident_payroll.sql', 'utf8'));
  await db.exec(readFileSync('supabase/setup_admin.sql', 'utf8').replace(/matkhau text:='[^']*'/, "matkhau text:='234567'"));
  await db.exec(`INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,danhsachquyen,congtruycap)
    VALUES('PH5-TEST','Incident operator','VẬN HÀNH','Test',1,ARRAY['PH5_ALL'],'ADMIN');
    INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,trangthai,chucaiavatar,manhomquyen,matkhau)
    VALUES('PH5-USER','Incident operator','incident.test','incident@example.com','','Nhân viên Vận hành Lớp','active','OP','PH5-TEST','234567');
    UPDATE vuihoc."DANH_MUC_SU_CO" SET danhsachsuco=(SELECT jsonb_agg(CASE WHEN x->>'code'='INC-TCH-02' THEN x||'{"creditCoeff":-1}'::jsonb ELSE x END) FROM jsonb_array_elements(danhsachsuco) x) WHERE madinhdanh='GRP-TCH';`);
  const rpc = async (name, args) => (await db.query('SELECT public.' + name + '(' + args.map((_, i) => '$' + (i + 1)).join(',') + ') result', args)).rows[0].result;
  const admin = await rpc('vuihoc_login', ['admin.tong', '234567']);
  const operator = await rpc('vuihoc_login', ['incident.test', '234567']);
  assert.equal((await db.query("SELECT vuihoc.business_can('PH5-USER','PH7','Điều chỉnh hệ số công từng buổi kèm lý do') permitted")).rows[0].permitted, false);
  const save = (token, changes) => rpc('vuihoc_save_business', [token, JSON.stringify(changes)]);
  const read = token => rpc('vuihoc_business_data', [token]);
  const month = async () => (await db.query(`SELECT danhsachgiaovien FROM vuihoc."BANG_CONG_THANG" WHERE kycong='2026-11'`)).rows[0].danhsachgiaovien;
  const session = (staff, teacher, lesson) => staff.find(t => t.teacherId === teacher)?.sessions.find(s => s.lessonId === lesson);
  for (const [login, id, date, cover] of [[admin, 'ADMIN-INC', '2026-11-03', null], [operator, 'OPS-INC', '2026-11-05', 'GV-002']]) {
    const lesson = { madinhdanh: id, malop: 'CLS-001', ngayhoc: date, makhunggio: 'SLOT-1', batdau: date + 'T18:00:00+07:00', ketthuc: date + 'T19:30:00+07:00', magiaovienchinh: 'GV-001', magiaoviendaythay: cover, trangthai: cover ? 'CHUA_DIEN_RA' : 'HUY' };
    const incident = { madinhdanh: 'INC-' + id, mabuoi: id, manhomsuco: 'GRP-TCH', masuco: 'INC-TCH-02', tensuco: 'Teacher absent', muckhancap: 'EMERGENCY', noidung: 'Test incident', trangthai: 'DANG_XU_LY', manguoibao: 'PH5-USER', manguoixuly: 'PH5-USER', baoluc: '2026-10-13T10:00:00+07:00', xulyluc: '2026-10-13T10:01:00+07:00' };
    const receipt = await save(login.token, [{ dataset: 'dated_lessons', before: null, after: lesson }, { dataset: 'lesson_incidents', before: null, after: incident }]);
    assert.equal(receipt.saved, true);
    let staff = await month();
    const row = session(staff, 'GV-001', id);
    assert.equal(row.creditCoeff, -1, 'Saving an incident must create a missing teacher/session');
    assert.equal(row.type, 'EMERGENCY');
    const actor = login.actor.madinhdanh;
    assert.equal(row.handledBy, actor, 'The server uses the authenticated actor, including admin');
    assert.equal(row.handledByName, login.actor.hoten, 'Display the name of the account that pressed Save');
    assert.equal(session(staff, 'GV-002', id), undefined, 'Do not pay the replacement before teaching');
    const data = await read(login.token);
    const stored = data.lesson_incidents.find(i => i.madinhdanh === incident.madinhdanh);
    assert.equal(stored.manguoixuly, actor);
    await save(login.token, [{ dataset: 'lesson_incidents', before: stored, after: { ...stored, noidung: 'Updated note' } }]);
    assert.equal((await month()).find(t => t.teacherId === 'GV-001').sessions.filter(s => s.lessonId === id).length, 1, 'Repeated saves do not duplicate work credit');
    if (cover) {
      await db.query(`UPDATE vuihoc."BUOI_HOC" SET vaolopluc=$1::timestamptz,ketthucluc=$2::timestamptz,trangthai='HOAN_THANH' WHERE madinhdanh=$3`, [date + 'T18:00:00+07:00', date + 'T19:30:00+07:00', id]);
      staff = await month();
      assert.equal(session(staff, 'GV-001', id).creditCoeff, -1);
      assert.equal(session(staff, cover, id).creditCoeff, 1);
      assert.equal(session(staff, cover, id).type, 'COVER');
      const completedIncident = (await read(login.token)).lesson_incidents.find(item => item.madinhdanh === incident.madinhdanh);
      await save(login.token, [{ dataset: 'lesson_incidents', before: completedIncident, after: { ...completedIncident, noidung: 'Updated after the lesson ended' } }]);
      staff = await month();
      assert.equal(session(staff, 'GV-001', id).creditCoeff, -1);
      assert.equal(session(staff, cover, id).creditCoeff, 1);
      assert.equal((await db.query('SELECT trangthai,magiaoviendaythay FROM vuihoc."BUOI_HOC" WHERE madinhdanh=$1', [id])).rows[0].trangthai, 'HOAN_THANH');
    }
  }
  await save(operator.token, [
    { dataset: 'dated_lessons', before: null, after: { madinhdanh: 'ZERO-CANCELED', malop: 'CLS-001', ngayhoc: '2026-11-10', makhunggio: 'SLOT-1', batdau: '2026-11-10T18:00:00+07:00', ketthuc: '2026-11-10T19:30:00+07:00', magiaovienchinh: 'GV-001', trangthai: 'HUY' } },
    { dataset: 'lesson_incidents', before: null, after: { madinhdanh: 'INC-ZERO-CANCELED', mabuoi: 'ZERO-CANCELED', manhomsuco: 'GRP-TCH', masuco: 'INC-TCH-01', tensuco: 'Canceled with permission', noidung: 'Canceled lesson still appears as incident credit', trangthai: 'DA_GIAI_QUYET' } }
  ]);
  const zeroCanceled = session(await month(), 'GV-001', 'ZERO-CANCELED');
  assert.equal(zeroCanceled.creditCoeff, 0, 'A canceled lesson with zero credit still appears');
  assert.equal(zeroCanceled.type, 'EMERGENCY', 'A canceled lesson counts as incident work, not standard work');
  assert.equal(zeroCanceled.handledByName, operator.actor.hoten);
  let staff = await month();
  assert.equal(staff.find(t => t.teacherId === 'GV-001').sessions.reduce((sum, s) => sum + s.creditCoeff, 0), -2);
  const data = await read(admin.token);
  const period = data.monthly_payroll.find(p => p.kycong === '2026-11');
  const manual = structuredClone(period);
  manual.danhsachgiaovien.find(t => t.teacherId === 'GV-001').sessions.find(s => s.lessonId === 'ADMIN-INC').creditCoeff = -0.5;
  await save(admin.token, [{ dataset: 'monthly_payroll', before: period, after: manual }]);
  const oldIncident = (await read(admin.token)).lesson_incidents.find(i => i.madinhdanh === 'INC-ADMIN-INC');
  await save(operator.token, [{ dataset: 'lesson_incidents', before: oldIncident, after: { ...oldIncident, noidung: 'Operator handles admin incident' } }]);
  const adjusted = session(await month(), 'GV-001', 'ADMIN-INC');
  assert.equal(adjusted.creditCoeff, -0.5, 'A note update preserves a reviewed coefficient');
  assert.equal(adjusted.handledBy, 'PH5-USER');
  await db.exec(`UPDATE vuihoc."BANG_CONG_THANG" SET dakhoa=true WHERE kycong='2026-11'`);
  const lockedIncident = (await read(admin.token)).lesson_incidents.find(i => i.madinhdanh === 'INC-ADMIN-INC');
  await assert.rejects(save(operator.token, [{ dataset: 'lesson_incidents', before: lockedIncident, after: { ...lockedIncident, noidung: 'Locked change' } }]));
  await db.exec(readFileSync('supabase/migrations/20261013_incident_payroll_upsert.sql', 'utf8'));
  assert.equal(session(await month(), 'GV-001', 'ADMIN-INC').creditCoeff, -0.5);
  console.log('PASS: canceled lessons with -1 and 0 are incident work; logged-in saver identity, admin/PH5 saves, retries, cover credit, totals, overrides and locked periods.');
} catch (error) {
  console.error(error.message, error.detail || '', error.where || '', error.query?.slice(Number(error.position) - 80, Number(error.position) + 80));
  process.exitCode = 1;
} finally { await db.close(); }
